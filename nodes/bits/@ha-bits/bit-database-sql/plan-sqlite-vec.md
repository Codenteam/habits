# Plan, add `sqlite-vec` vector search to `@ha-bits/bit-database-sql`

Additive change. Keep every existing action, prop, and return shape unchanged, just wire the [`sqlite-vec`](https://github.com/asg017/sqlite-vec) extension into the driver and expose three new vector-native actions.

Target environments (unchanged from the bit today):

| Environment | Backend |
|---|---|
| Node.js | `better-sqlite3` + `sqlite-vec` npm package (prebuilt `.dylib`/`.so`/`.dll`) loaded at connect time |
| Browser/Tauri | new **`tauri-plugin-sqlite-vec`** (in scope), a companion plugin that opens the same DB file and exposes vector-only commands |

The existing `tauri-plugin-sql` stays wired and untouched for every non-vector action. The Tauri stub adds a second invoke surface (`plugin:sqlite-vec|*`) only for the three new actions.

---

## 1. What `sqlite-vec` is, and why it fits

- Pure-C SQLite extension. ~100KB compiled. No external service.
- Provides **virtual tables** via the `vec0` module: `CREATE VIRTUAL TABLE vec_items USING vec0(embedding float[384])`.
- Vector dimensionality is **locked at virtual-table creation time** (same constraint as LanceDB).
- Query syntax is plain SQL: `SELECT rowid, distance FROM vec_items WHERE embedding MATCH ? ORDER BY distance LIMIT ?`.
- Distance metrics via function form: `vec_distance_cosine(a, b)`, `vec_distance_L2(a, b)`, `vec_distance_L1(a, b)`. The `MATCH` operator uses L2 by default.
- Supports `float32`, `int8`, and `bit` vectors. Default to `float32`, the others are optimizations for later.
- Metadata filtering is done with a standard SQL join against a neighbour table keyed on `rowid`.

**Why this vs. swapping to LanceDB**: no new driver, no new serialization layer, reuses the existing `kv_store` / `documents` tables, keeps the bit's "one file on disk" story.

---

## 2. Schema additions, one new pair of tables per collection

Do **not** modify the existing `kv_store` or `documents` tables. Add two new tables, created lazily on first vector insert into a given collection:

### 2.1 `vec_<collection>`, the virtual table
```sql
CREATE VIRTUAL TABLE vec_<collection> USING vec0(
  embedding float[<dim>]
);
```
- `<dim>` is captured from the first vector inserted into that collection and baked into the table name suffix isn't needed, dim lives only in the `USING vec0(...)` DDL. The driver caches `(collection → dim)` in-memory after first insert and validates later inserts against it.
- `rowid` is the join key. The driver assigns `rowid = <monotonic counter per collection>` stored in a third helper table (§2.3).

### 2.2 `vec_meta_<collection>`, metadata sidecar
Parallel to the existing `documents` table, but keyed by the virtual table's `rowid`:
```sql
CREATE TABLE IF NOT EXISTS vec_meta_<collection> (
  rowid      INTEGER PRIMARY KEY,     -- matches the vec0 rowid
  custom_id  TEXT NOT NULL,           -- the user-facing _id, matches documents.custom_id
  data       TEXT,                    -- JSON, same as documents.data
  created_at TEXT NOT NULL,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_vec_meta_<collection>_custom ON vec_meta_<collection>(custom_id);
```

### 2.3 `vec_registry`, one-row-per-collection state
```sql
CREATE TABLE IF NOT EXISTS vec_registry (
  collection TEXT PRIMARY KEY,
  dim        INTEGER NOT NULL,
  next_rowid INTEGER NOT NULL DEFAULT 1
);
```
- `dim`, the locked dimensionality.
- `next_rowid`, advanced on each insert inside a transaction; avoids colliding with any rowids the user might have loaded via raw SQL.

> **Rationale for the sidecar pattern**: `vec0` virtual tables cannot hold arbitrary columns efficiently (they can, via "auxiliary columns", but metadata filtering through them is awkward). A plain table joined on `rowid` is the idiomatic sqlite-vec pattern and keeps the query path a single SQL statement.

---

## 3. New actions (exactly three)

Added to [`src/index.ts`](src/index.ts), same shape as existing actions:

| Action | Props | Result |
|---|---|---|
| `vectorInsert` | `collection, document (with .vector: number[]), database?` | `InsertResult` (reused from `@ha-bits/bit-database`) |
| `vectorSearch` | `collection, vector: number[], limit?, distance? ('cosine'\|'l2'\|'l1'), filter?, database?` | `VectorSearchResult` (new, declared in `src/index.ts`) |
| `vectorDelete` | `collection, id, database?` | `DeleteResult` (reused) |

```ts
// New types at the top of src/index.ts
export interface VectorSearchResult {
  collection: string;
  results: Array<Record<string, any> & { _id: string; _distance: number }>;
  count: number;
}
```

Existing `insert` / `query` / `deleteDoc` stay. Callers who want vector semantics opt into the new actions; mixing is fine (the metadata sidecar mirrors `documents`' column names so inline joins stay readable).

---

## 4. Node.js driver changes, [`src/driver.ts`](src/driver.ts)

### 4.1 Dependency

Add to [`package.json`](package.json) `dependencies`:
```json
"sqlite-vec": "^0.1.6"
```

The `sqlite-vec` npm package ships prebuilt loadable binaries for macOS (x64, arm64), Linux (x64, arm64), and Windows (x64). `sqliteVec.load(db)` handles platform detection.

### 4.2 Load the extension on connect

In `getDatabase(dbPath)`, the existing init function at [`src/driver.ts:26-72`](src/driver.ts#L26-L72), add one call right after `new BetterSqlite3(dbFile)` and **before** the `sqlite.exec(...)` DDL block:

```ts
const sqliteVec = require('sqlite-vec');
sqliteVec.load(sqlite);   // registers the vec0 module and vec_* functions
```

Then append the registry DDL to the existing schema string:
```sql
CREATE TABLE IF NOT EXISTS vec_registry (
  collection TEXT PRIMARY KEY,
  dim        INTEGER NOT NULL,
  next_rowid INTEGER NOT NULL DEFAULT 1
);
```

The per-collection `vec_<collection>` and `vec_meta_<collection>` tables are created lazily, see §4.4.

### 4.3 Helpers

Three new helpers at the bottom of `driver.ts` (above the action impls):

```ts
function ensureVecTables(sqlite: BetterSqlite3.Database, collection: string, dim: number): void {
  const existing = sqlite.prepare('SELECT dim FROM vec_registry WHERE collection = ?').get(collection) as { dim: number } | undefined;

  if (existing) {
    if (existing.dim !== dim) {
      throw new Error(`Vector dim mismatch for '${collection}': expected ${existing.dim}, got ${dim}. Drop the collection to re-dimension.`);
    }
    return;
  }

  sqlite.exec(`CREATE VIRTUAL TABLE vec_${collection} USING vec0(embedding float[${dim}])`);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS vec_meta_${collection} (
      rowid      INTEGER PRIMARY KEY,
      custom_id  TEXT NOT NULL,
      data       TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_vec_meta_${collection}_custom ON vec_meta_${collection}(custom_id);
  `);
  sqlite.prepare('INSERT INTO vec_registry (collection, dim, next_rowid) VALUES (?, ?, 1)').run(collection, dim);
}

function reserveRowid(sqlite: BetterSqlite3.Database, collection: string): number {
  const row = sqlite.prepare('SELECT next_rowid FROM vec_registry WHERE collection = ?').get(collection) as { next_rowid: number };
  const rowid = row.next_rowid;
  sqlite.prepare('UPDATE vec_registry SET next_rowid = next_rowid + 1 WHERE collection = ?').run(collection);
  return rowid;
}

function validateCollection(name: string): void {
  // vec_<collection> is table DDL, must be a safe identifier
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid collection name '${name}': must match /^[A-Za-z_][A-Za-z0-9_]*$/`);
  }
}
```

> **Why `validateCollection` matters**: table names are interpolated into DDL, they can't use bind parameters. Any collection name that doesn't match a SQL-identifier pattern is a SQL-injection vector. Reject at the driver boundary, not at the bit's prop layer (the bit doesn't know about the DDL path). All three new actions must call this.

### 4.4 Action implementations

```ts
export async function vectorInsert(params: {
  collection: string;
  document: any;
  database?: string;
}): Promise<InsertResult> {
  const { collection, document, database = 'habits-cortex.db' } = params;
  validateCollection(collection);
  const sqlite = getSqlite(String(database));

  let doc = parseValue(document);
  if (typeof doc !== 'object' || doc === null) doc = { data: doc };
  const vector: number[] | undefined = Array.isArray(doc.vector) ? doc.vector : undefined;
  if (!vector) throw new Error("vectorInsert requires document.vector (number[])");

  const dim = vector.length;
  ensureVecTables(sqlite, collection, dim);

  const customId = generateId();
  const now = new Date().toISOString();
  const meta = { ...doc, _id: customId }; delete (meta as any).vector;

  const insert = sqlite.transaction(() => {
    const rowid = reserveRowid(sqlite, collection);
    // sqlite-vec accepts JSON text OR a Float32Array BLOB; JSON is simplest and portable across drivers.
    sqlite.prepare(`INSERT INTO vec_${collection}(rowid, embedding) VALUES (?, ?)`)
      .run(rowid, JSON.stringify(vector));
    sqlite.prepare(`INSERT INTO vec_meta_${collection} (rowid, custom_id, data, created_at) VALUES (?, ?, ?, ?)`)
      .run(rowid, customId, JSON.stringify(meta), now);
    return { rowid };
  });
  insert();

  return { success: true, id: customId, collection: String(collection), document: { ...meta, vector }, createdAt: now };
}

export async function vectorSearch(params: {
  collection: string;
  vector: any;
  limit?: number;
  distance?: string;
  filter?: any;
  database?: string;
}): Promise<VectorSearchResult> {
  const { collection, vector, limit = 10, distance = 'l2', filter, database = 'habits-cortex.db' } = params;
  validateCollection(collection);
  const sqlite = getSqlite(String(database));

  const vec: number[] = typeof vector === 'string' ? JSON.parse(vector) : vector;
  const filterObj = parseFilter(filter);
  const k = safeNumber(limit, 10);

  // Over-fetch so post-filter still returns `limit`
  const over = Object.keys(filterObj).length ? k * 5 : k;

  // MATCH uses L2; for cosine/L1 use the function form.
  const rows = (() => {
    if (distance === 'cosine' || distance === 'l1') {
      const fn = distance === 'cosine' ? 'vec_distance_cosine' : 'vec_distance_L1';
      return sqlite.prepare(
        `SELECT v.rowid AS rowid, ${fn}(v.embedding, ?) AS distance, m.custom_id, m.data, m.created_at
         FROM vec_${collection} v JOIN vec_meta_${collection} m ON m.rowid = v.rowid
         ORDER BY distance ASC LIMIT ?`
      ).all(JSON.stringify(vec), over) as any[];
    }
    return sqlite.prepare(
      `SELECT v.rowid AS rowid, v.distance AS distance, m.custom_id, m.data, m.created_at
       FROM vec_${collection} v JOIN vec_meta_${collection} m ON m.rowid = v.rowid
       WHERE v.embedding MATCH ? ORDER BY v.distance LIMIT ?`
    ).all(JSON.stringify(vec), over) as any[];
  })();

  const results: any[] = [];
  for (const r of rows) {
    const data = parseValue(r.data);
    let ok = true;
    for (const [k2, v2] of Object.entries(filterObj)) {
      if (k2 === '_id') { if (data._id !== v2) { ok = false; break; } }
      else if (data[k2] !== v2) { ok = false; break; }
    }
    if (ok) {
      results.push({ ...data, _id: data._id, _createdAt: r.created_at, _distance: r.distance });
      if (results.length >= k) break;
    }
  }
  return { collection: String(collection), results, count: results.length };
}

export async function vectorDelete(params: {
  collection: string;
  id: string;
  database?: string;
}): Promise<DeleteResult> {
  const { collection, id, database = 'habits-cortex.db' } = params;
  validateCollection(collection);
  const sqlite = getSqlite(String(database));

  const row = sqlite.prepare(`SELECT rowid FROM vec_meta_${collection} WHERE custom_id = ?`).get(String(id)) as { rowid: number } | undefined;
  if (!row) return { success: true, deleted: false, collection: String(collection), key: String(id) };

  const tx = sqlite.transaction(() => {
    sqlite.prepare(`DELETE FROM vec_${collection} WHERE rowid = ?`).run(row.rowid);
    sqlite.prepare(`DELETE FROM vec_meta_${collection} WHERE rowid = ?`).run(row.rowid);
  });
  tx();
  return { success: true, deleted: true, collection: String(collection), key: String(id) };
}
```

---

## 5. `src/index.ts`, three action entries

Add below the existing `deleteDoc` action in [`src/index.ts:159-171`](src/index.ts#L159-L171):

```ts
vectorInsert: {
  name: 'vectorInsert',
  displayName: 'Vector Insert',
  description: 'Insert a document with an embedding vector into a sqlite-vec virtual table',
  props: {
    collection: { type: 'SHORT_TEXT', displayName: 'Collection', required: true },
    document:   { type: 'JSON',       displayName: 'Document (must include .vector: number[])', required: true },
    database:   { type: 'SHORT_TEXT', displayName: 'Database File', required: false, defaultValue: 'habits-cortex.db' },
  },
  async run(context: DatabaseContext): Promise<InsertResult> {
    return driver.vectorInsert(context.propsValue as any);
  },
},

vectorSearch: {
  name: 'vectorSearch',
  displayName: 'Vector Search',
  description: 'Find top-K most similar documents via sqlite-vec (L2, cosine, or L1)',
  props: {
    collection: { type: 'SHORT_TEXT', displayName: 'Collection', required: true },
    vector:     { type: 'JSON',       displayName: 'Query Vector (number[])', required: true },
    limit:      { type: 'NUMBER',     displayName: 'Top K', required: false, defaultValue: 10 },
    distance:   { type: 'SHORT_TEXT', displayName: 'Distance (l2|cosine|l1)', required: false, defaultValue: 'l2' },
    filter:     { type: 'JSON',       displayName: 'Metadata filter', required: false, defaultValue: '{}' },
    database:   { type: 'SHORT_TEXT', displayName: 'Database File', required: false, defaultValue: 'habits-cortex.db' },
  },
  async run(context: DatabaseContext): Promise<VectorSearchResult> {
    return driver.vectorSearch(context.propsValue as any);
  },
},

vectorDelete: {
  name: 'vectorDelete',
  displayName: 'Vector Delete',
  description: 'Delete a document from both the vector and metadata tables',
  props: {
    collection: { type: 'SHORT_TEXT', displayName: 'Collection', required: true },
    id:         { type: 'SHORT_TEXT', displayName: 'Document ID', required: true },
    database:   { type: 'SHORT_TEXT', displayName: 'Database File', required: false, defaultValue: 'habits-cortex.db' },
  },
  async run(context: DatabaseContext): Promise<DeleteResult> {
    return driver.vectorDelete(context.propsValue as any);
  },
},
```

Update the top-of-file type imports:
```ts
import type { StoreResult, GetResult, DeleteResult, ListResult, InsertResult, UpdateResult, QueryResult, IncrementResult } from '@ha-bits/bit-database';
// new local type:
export interface VectorSearchResult {
  collection: string;
  results: Array<Record<string, any> & { _id: string; _distance: number }>;
  count: number;
}
```

---

## 6. Tauri side, companion plugin `tauri-plugin-sqlite-vec`

`tauri-plugin-sql` (currently wired in [`package.json`](package.json) under `habits.tauriPlugins.sql`) does **not** expose a way to load SQLite extensions, and its bundled `libsqlite3-sys` doesn't ship with sqlite-vec linked in. Rather than fork it, add a small sibling plugin that:

1. Opens its **own** connection to the same SQLite file used by `tauri-plugin-sql` (WAL mode keeps the two readers/writers honest).
2. Links `sqlite-vec` **statically** via the [`sqlite-vec` Rust crate](https://crates.io/crates/sqlite-vec) (uses `rusqlite` under the hood).
3. Exposes four commands matching the JS stub's invoke calls.

Sibling to [`tauri-plugin-webdriver/`](../../../../tauri-plugin-webdriver/) and `tauri-plugin-lancedb/` (already scaffolded in this repo). Path: `tauri-plugin-sqlite-vec/` at the repo root.

### 6.1 Layout

```
tauri-plugin-sqlite-vec/
├── Cargo.toml
├── build.rs
├── permissions/
│   └── default.toml
└── src/
    ├── lib.rs
    ├── error.rs
    ├── state.rs        ← connection pool per DB file
    └── commands.rs     ← vector_insert, vector_search, vector_delete, ensure_tables
```

### 6.2 `Cargo.toml`

```toml
[package]
name = "tauri-plugin-sqlite-vec"
version = "0.1.0"
edition = "2021"
license = "MIT"
links = "tauri-plugin-sqlite-vec"

[dependencies]
tauri      = { version = "2.10.0" }
serde      = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror  = "2"
tokio      = { version = "1", features = ["rt-multi-thread", "sync"] }
tracing    = "0.1"

[build-dependencies]
tauri-plugin = { version = "2.5.3", features = ["build"] }

# Desktop only. sqlite-vec builds fine on Android (pure C, no SIMD lock-in like lance-core)
# but tauri-plugin-sql's mobile handling is desktop-primary, so keep parity.
[target.'cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))'.dependencies]
rusqlite   = { version = "0.31", features = ["bundled", "load_extension"] }
sqlite-vec = "0.1"
```

> `rusqlite`'s `bundled` feature compiles its own SQLite statically, which avoids version skew with `tauri-plugin-sql`'s bundled sqlite (different `sqlite3_api_routines` versions can trip `load_extension`).

### 6.3 `build.rs`

```rust
const COMMANDS: &[&str] = &[
    "ensure_tables",
    "vector_insert",
    "vector_search",
    "vector_delete",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
```

### 6.4 `permissions/default.toml`

```toml
"$schema" = "schemas/schema.json"

[default]
description = "Default permissions for tauri-plugin-sqlite-vec"
permissions = [
  "allow-ensure-tables",
  "allow-vector-insert",
  "allow-vector-search",
  "allow-vector-delete",
]
```

### 6.5 `src/state.rs`, connection pool

One `rusqlite::Connection` per absolute DB path, behind `tokio::sync::Mutex` (rusqlite isn't `Sync`):

```rust
use rusqlite::Connection;
use std::{collections::HashMap, path::Path, sync::Arc};
use tokio::sync::Mutex;

#[derive(Default)]
pub struct VecConnectionRegistry {
    inner: Mutex<HashMap<String, Arc<Mutex<Connection>>>>,
}

impl VecConnectionRegistry {
    pub async fn get(&self, path: &Path) -> crate::Result<Arc<Mutex<Connection>>> {
        let key = path.to_string_lossy().to_string();
        {
            let g = self.inner.lock().await;
            if let Some(c) = g.get(&key) { return Ok(c.clone()); }
        }
        let conn = tokio::task::spawn_blocking({
            let key = key.clone();
            move || -> crate::Result<Connection> {
                let c = Connection::open(&key)?;
                c.pragma_update(None, "journal_mode", "WAL")?;
                unsafe {
                    c.load_extension_enable()?;
                    sqlite_vec::sqlite3_vec_init_rusqlite(&c)?;  // statically linked, no disk load
                    c.load_extension_disable()?;
                }
                Ok(c)
            }
        }).await.map_err(|e| crate::Error::Internal(format!("join: {e}")))??;
        let arc = Arc::new(Mutex::new(conn));
        self.inner.lock().await.insert(key, arc.clone());
        Ok(arc)
    }
}
```

> Check the `sqlite-vec` crate's current API, at time of writing it provides a helper like `sqlite3_vec_init` that takes a raw SQLite handle. If the helper name differs, adapt the block above. The key goal: statically register the extension without a loadable `.dylib`/`.so`/`.dll` sitting on disk.

### 6.6 `src/commands.rs`, four commands

Same JSON shape as what the Node driver exports, so the JS stub doesn't need per-platform branching beyond the invoke name. Each command resolves the DB path by joining `app.path().app_data_dir()` with the user-supplied `database` string (exactly how the existing `tauri-plugin-sql` stub does it), then delegates to a `spawn_blocking` that runs the same SQL the Node driver does in §4.4.

Commands (abridged signatures):

```rust
#[tauri::command] pub async fn ensure_tables<R: Runtime>(app: AppHandle<R>, state: State<'_, VecConnectionRegistry>, database: String, collection: String, dim: u32) -> Result<()>;
#[tauri::command] pub async fn vector_insert<R: Runtime>(app: AppHandle<R>, state: State<'_, VecConnectionRegistry>, database: String, collection: String, custom_id: String, vector: Vec<f32>, data: String, now: String) -> Result<u64 /* rowid */>;
#[tauri::command] pub async fn vector_search<R: Runtime>(app: AppHandle<R>, state: State<'_, VecConnectionRegistry>, database: String, collection: String, vector: Vec<f32>, distance: String, limit: u32) -> Result<Vec<serde_json::Value>>;
#[tauri::command] pub async fn vector_delete<R: Runtime>(app: AppHandle<R>, state: State<'_, VecConnectionRegistry>, database: String, collection: String, id: String) -> Result<bool>;
```

> **Notice the interface choice**: the plugin returns *raw rows* for search (one JSON object per match, containing `rowid`, `distance`, `custom_id`, `data`, `created_at`). The JS stub does the metadata filter and `limit`-clamping in JavaScript, mirroring the Node driver exactly. Keeps the Rust side dumb and keeps the two driver impls converging on identical output shapes.

### 6.7 `src/lib.rs`

```rust
use tauri::{plugin::{Builder, TauriPlugin}, Manager, Runtime};
mod commands; mod error; mod state;
pub use error::{Error, Result};

#[must_use]
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("sqlite-vec")
        .setup(|app, _api| {
            app.manage(state::VecConnectionRegistry::default());
            tracing::info!("tauri-plugin-sqlite-vec initialized");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::ensure_tables,
            commands::vector_insert,
            commands::vector_search,
            commands::vector_delete,
        ])
        .build()
}
```

### 6.8 Hook into the bit's manifest

Update [`package.json`](package.json) `habits.tauriPlugins`, **add** the new entry, don't touch the existing `sql` entry:

```jsonc
"tauriPlugins": {
  "sql": { /* ...unchanged... */ },
  "sqlite-vec": {
    "cargo": "tauri-plugin-sqlite-vec = { path = \"../../../../tauri-plugin-sqlite-vec\" }",
    "init": "tauri_plugin_sqlite_vec::init()",
    "permissions": [
      "sqlite-vec:default",
      "sqlite-vec:allow-ensure-tables",
      "sqlite-vec:allow-vector-insert",
      "sqlite-vec:allow-vector-search",
      "sqlite-vec:allow-vector-delete"
    ]
  }
}
```

Path dep while developing; flip to a `version = "0.1"` string once published.

---

## 7. Tauri stub changes, [`src/stubs/tauri-driver.js`](src/stubs/tauri-driver.js)

Append three new functions to the stub and extend `module.exports`. **Do not touch** the existing `store` / `get` / `del` / `list` / `insert` / `update` / `query` / `increment` implementations, they keep using `plugin:sql|*`.

```js
async function vectorInsert(params) {
  var invoke = getInvoke();
  if (!invoke) throw new Error('Tauri API not available');
  var collection = params.collection;
  var doc = parseValue(params.document);
  if (typeof doc !== 'object' || doc === null) doc = { data: doc };
  if (!Array.isArray(doc.vector)) throw new Error('vectorInsert requires document.vector');
  var vector = doc.vector;
  var customId = generateId();
  var now = new Date().toISOString();
  var meta = Object.assign({}, doc, { _id: customId }); delete meta.vector;

  await invoke('plugin:sqlite-vec|ensure_tables', {
    database: params.database || 'habits-cortex.db',
    collection: collection,
    dim: vector.length,
  });
  await invoke('plugin:sqlite-vec|vector_insert', {
    database: params.database || 'habits-cortex.db',
    collection: collection,
    customId: customId,
    vector: vector,
    data: JSON.stringify(meta),
    now: now,
  });

  return { success: true, id: customId, collection: String(collection), document: Object.assign({}, meta, { vector: vector }), createdAt: now };
}

async function vectorSearch(params) {
  var invoke = getInvoke();
  if (!invoke) throw new Error('Tauri API not available');
  var collection = params.collection;
  var vec = typeof params.vector === 'string' ? JSON.parse(params.vector) : params.vector;
  var limit = Number(params.limit) || 10;
  var distance = params.distance || 'l2';
  var filter = parseFilter(params.filter);

  var rows = await invoke('plugin:sqlite-vec|vector_search', {
    database: params.database || 'habits-cortex.db',
    collection: collection,
    vector: vec,
    distance: distance,
    limit: Object.keys(filter).length ? limit * 5 : limit,
  });

  var results = [];
  for (var i = 0; i < (rows || []).length && results.length < limit; i++) {
    var row = rows[i];
    var data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    var ok = true;
    for (var k in filter) { if (data[k] !== filter[k]) { ok = false; break; } }
    if (ok) results.push(Object.assign({}, data, { _id: data._id, _createdAt: row.created_at, _distance: row.distance }));
  }
  return { collection: String(collection), results: results, count: results.length };
}

async function vectorDelete(params) {
  var invoke = getInvoke();
  if (!invoke) throw new Error('Tauri API not available');
  var ok = await invoke('plugin:sqlite-vec|vector_delete', {
    database: params.database || 'habits-cortex.db',
    collection: params.collection,
    id: params.id,
  });
  return { success: true, deleted: !!ok, collection: String(params.collection), key: String(params.id) };
}

module.exports = {
  /* ...existing keys... */,
  vectorInsert: vectorInsert,
  vectorSearch: vectorSearch,
  vectorDelete: vectorDelete,
};
```

The stub's return shapes match the Node driver's word-for-word, that's the contract the pipeline tests enforce.

---

## 8. Testing

### 8.1 Node.js, unit-style smoke test

From [`bit-database-sql/`](.):

```bash
npm install           # picks up sqlite-vec
npm run build
node -e "(async () => {
  const d = require('./dist/driver');
  // Dim 4 vectors, contrived but deterministic.
  await d.vectorInsert({ collection: 'docs', document: { text: 'apple',  tag: 'fruit',  vector: [1, 0, 0, 0] } });
  await d.vectorInsert({ collection: 'docs', document: { text: 'banana', tag: 'fruit',  vector: [0.95, 0.1, 0, 0] } });
  await d.vectorInsert({ collection: 'docs', document: { text: 'car',    tag: 'object', vector: [0, 0, 1, 0] } });

  const l2    = await d.vectorSearch({ collection: 'docs', vector: [1, 0, 0, 0], limit: 2, distance: 'l2' });
  const cos   = await d.vectorSearch({ collection: 'docs', vector: [1, 0, 0, 0], limit: 2, distance: 'cosine' });
  const filtd = await d.vectorSearch({ collection: 'docs', vector: [1, 0, 0, 0], limit: 10, filter: { tag: 'object' } });

  console.log('L2     top2:', l2.results.map(r => r.text));        // expect ['apple','banana']
  console.log('cos    top2:', cos.results.map(r => r.text));       // same ranking here
  console.log('filtered   :', filtd.results.map(r => r.text));     // expect ['car']

  // Delete round-trip
  const del = await d.vectorDelete({ collection: 'docs', id: l2.results[0]._id });
  console.log('deleted:', del.deleted);                            // expect true
})().catch(e => { console.error(e); process.exit(1); });"
```

Assertions the smoke test is checking:
- Extension loads without throwing (`sqliteVec.load(sqlite)` in §4.2).
- Virtual table is created with the right dim on first insert.
- Second insert with the same dim **reuses** the table; an attempt with a different dim **throws** (add a fourth `vectorInsert` with `vector: [1,1,1]` and expect the mismatch error).
- `vec_distance_cosine` and `MATCH` (L2) both return results, validates that `sqlite-vec` registered both the `vec0` module and the distance functions.
- Metadata filter is applied client-side after over-fetching (query with `filter: { tag: 'object' }` returns only `car`).
- `vectorDelete` removes from both `vec_<collection>` and `vec_meta_<collection>` (verify by re-searching and expecting `count = 2`).

### 8.2 Node.js, regression: existing actions still work

Same session, same DB file, as the final step of the smoke test:
```js
await d.store({ collection: 'kv', key: 'a', value: { hello: 'world' } });
console.log(await d.get({ collection: 'kv', key: 'a' }));
await d.insert({ collection: 'users', document: { name: 'Alice' } });
console.log(await d.query({ collection: 'users', limit: 10 }));
```
Expected: identical output to a pre-change build. Adding sqlite-vec must not disturb the existing `kv_store` / `documents` flows.

### 8.3 Tauri, end-to-end via pack pipeline

1. In a sandbox app that depends on `@ha-bits/bit-database-sql`, add both manifest plugins by upgrading to the new bit version (once published). Confirm the desktop pack discovers both `sql` and `sqlite-vec` entries via [`discoverTauriPlugins`](../../../../packages/base/server/src/pack/bundle-generator-wrapper.ts#L140) at build time. Output log should show: `Found 2 Tauri plugin(s): sql, sqlite-vec`.

2. Verify `src-tauri/Cargo.toml` after the pack contains **both** dependency lines:
   - `tauri-plugin-sql = { version = "2", features = ["sqlite"] }`
   - `tauri-plugin-sqlite-vec = { path = "..." }` (or version spec)

3. Verify `src-tauri/src/lib.rs` calls both inits in the builder chain:
   ```rust
   .plugin(tauri_plugin_sql::Builder::default().build())
   .plugin(tauri_plugin_sqlite_vec::init())
   ```

4. Verify `src-tauri/capabilities/default.json` contains every permission listed in both `tauriPlugins.*.permissions` arrays.

5. Desktop runtime test via a workflow YAML (drop this into the sandbox app and execute from the bits runner):

   ```yaml
   - id: seed-apple
     type: bits
     data: { module: "@ha-bits/bit-database-sql", operation: vectorInsert,
             params: { collection: "docs", document: { text: "apple", vector: [1, 0, 0, 0] } } }
   - id: seed-banana
     type: bits
     data: { module: "@ha-bits/bit-database-sql", operation: vectorInsert,
             params: { collection: "docs", document: { text: "banana", vector: [0.95, 0.1, 0, 0] } } }
   - id: search
     type: bits
     data: { module: "@ha-bits/bit-database-sql", operation: vectorSearch,
             params: { collection: "docs", vector: [1, 0, 0, 0], limit: 2 } }
   - id: regression-store
     type: bits
     data: { module: "@ha-bits/bit-database-sql", operation: store,
             params: { collection: "kv", key: "x", value: 42 } }
   - id: regression-get
     type: bits
     data: { module: "@ha-bits/bit-database-sql", operation: get,
             params: { collection: "kv", key: "x" } }
   ```

   Expected outputs, each compared against what the Node smoke test produced for the same inputs:
   - `search.results[0].text === 'apple'` and `search.count === 2`.
   - `regression-get.value === 42`.

6. Inspect the DB file inside `{appDataDir}/` (use `sqlite3` CLI or DB Browser):
   - `SELECT name FROM sqlite_master WHERE type IN ('table','view');` should list `kv_store`, `documents`, `vec_registry`, `vec_docs`, `vec_meta_docs`, plus a handful of `vec_docs_*` shadow tables that `vec0` manages internally.
   - `PRAGMA journal_mode;` returns `wal`, confirms §6.5's WAL switch took effect and the two plugins are cohabiting safely.

7. **Cohabitation sanity check**: from the workflow, `store` something under a key, then from the same workflow `vectorInsert` and `vectorSearch`. Both must succeed inside the same session, this catches the case where `tauri-plugin-sql` holds a write lock that starves `tauri-plugin-sqlite-vec` (shouldn't happen under WAL, but verify).

### 8.4 Mobile, runtime probe

The sqlite-vec path is gated desktop-only in §6.2. On Android/iOS, calling any of the three new actions must surface a clean `Error::Unsupported` (or equivalent JSON-serialized error the stub propagates), **not** a panic. Mobile-runtime probe: ship the sandbox app to an emulator, call `vectorSearch`, confirm the workflow step fails with a human-readable error rather than crashing the webview.

---

## 9. Gotchas

1. **Dim lock-in**. Changing a collection's vector dim requires dropping `vec_<collection>`, `vec_meta_<collection>`, and the `vec_registry` row. Driver will surface an explicit mismatch error (§4.3); document this in the README.
2. **Collection-name injection surface**. `vec_<collection>` and `vec_meta_<collection>` are DDL-interpolated. `validateCollection` is the only defense, a missing call is a SQL-injection hole. Test it with `'"; DROP TABLE kv_store; --'` and expect a thrown error.
3. **WAL required for Tauri cohabitation**. Both plugins open the same file. Without WAL, the second connection's writer will contend with the first. The Rust plugin sets WAL at open time (§6.5); the Node driver inherits whatever SQLite default applies (SQLite switches to WAL once any connection opts in, then persists). Belt-and-braces: set `PRAGMA journal_mode=WAL;` in the Node init too.
4. **`MATCH` defaults to L2**, not cosine. Users asking for cosine must pass `distance: 'cosine'`, then the driver switches to the function form (ORDER BY `vec_distance_cosine(...)`). This is why the three metrics branch in §4.4.
5. **Over-fetch factor for filtered search**. `k * 5` is arbitrary and wrong for highly selective filters. Revisit if real workloads show filters eliminating >80% of neighbors, a better strategy is iterative fetch-until-limit or pushing filters into the join WHERE.
6. **`sqlite-vec` version coupling**. The npm package and the Rust crate release independently. Pin both to the same minor version in `package.json` and `Cargo.toml` respectively, and bump them together.
7. **Shadow tables from `vec0`**. The virtual table backs itself with several real tables (`vec_<collection>_chunks`, `_rowids`, etc.). Listing tables from user SQL will show these, document it so users don't panic and `DROP` them.

---

## 10. One-paragraph TL;DR

Load `sqlite-vec` into the existing `better-sqlite3` connection at init, add a `vec_registry` + per-collection pair of tables (`vec_<collection>` virtual table using `vec0` + `vec_meta_<collection>` metadata sidecar joined on `rowid`), expose three new actions (`vectorInsert` / `vectorSearch` / `vectorDelete`) that wrap the standard sqlite-vec MATCH/distance-function patterns, and author a companion `tauri-plugin-sqlite-vec/` Rust crate (sibling to `tauri-plugin-lancedb/`) that opens its own connection to the same SQLite file with WAL, statically links the `sqlite-vec` Rust crate to register `vec0` without a loadable file on disk, and exposes the same four commands the JS Tauri stub invokes. Test on Node by round-tripping three inserts + two searches + a delete against a real DB file, then verify existing `store`/`get`/`insert`/`query` still pass; test on Tauri by packing a sandbox desktop app, confirming both plugins show up in the generated `Cargo.toml` / `lib.rs` / capabilities, executing a YAML workflow that mixes vector and non-vector actions, and inspecting the built DB file to confirm WAL is on and all expected tables exist.
