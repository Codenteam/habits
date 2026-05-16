/**
 * SQL Driver for bit-database-sql
 * 
 * This file contains the actual database operations.
 * In Tauri/browser environments, this is replaced by stubs/tauri-driver.js
 */

import type {
  StoreResult,
  GetResult,
  DeleteResult,
  ListResult,
  InsertResult,
  UpdateResult,
  QueryResult,
  IncrementResult,
} from '@ha-bits/bit-database';

export interface VectorSearchResult {
  collection: string;
  results: Array<Record<string, any> & { _id: string; _distance: number }>;
  count: number;
}

import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import BetterSqlite3 from 'better-sqlite3';

// Database instances per database file
const databases: Map<string, BetterSQLite3Database> = new Map();
const sqliteInstances: Map<string, BetterSqlite3.Database> = new Map();

function getDatabase(dbPath: string = 'habits-cortex.db'): BetterSQLite3Database {
  if (!databases.has(dbPath)) {
    const dbFile = `/tmp/habits-sql/${dbPath}`;
    
    const fs = require('fs');
    const path = require('path');
    const dir = path.dirname(dbFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const sqlite = new BetterSqlite3(dbFile);
    sqliteInstances.set(dbPath, sqlite);
    
    // Load sqlite-vec extension (registers vec0 module and vec_* functions)
    const sqliteVec = require('sqlite-vec');
    sqliteVec.load(sqlite);
    
    const db = drizzle(sqlite);
    databases.set(dbPath, db);
    
    // Initialize tables
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS kv_store (
        id TEXT PRIMARY KEY,
        collection TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        expires_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_kv_collection_key ON kv_store(collection, key);
      
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        collection TEXT NOT NULL,
        custom_id TEXT NOT NULL,
        data TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        expires_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_docs_collection ON documents(collection);
      CREATE INDEX IF NOT EXISTS idx_docs_custom_id ON documents(collection, custom_id);

      CREATE TABLE IF NOT EXISTS vec_registry (
        collection TEXT PRIMARY KEY,
        dim        INTEGER NOT NULL,
        next_rowid INTEGER NOT NULL DEFAULT 1
      );
    `);
    
    console.log(`💾 SQLite Database initialized: ${dbFile}`);
  }
  return databases.get(dbPath)!;
}

function getSqlite(dbPath: string = 'habits-cortex.db'): BetterSqlite3.Database {
  getDatabase(dbPath);
  return sqliteInstances.get(dbPath)!;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

export function parseValue(value: any): any {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export function parseFilter(filter: any): Record<string, any> {
  if (!filter) return {};
  if (typeof filter === 'string') {
    try { return JSON.parse(filter); } catch { return {}; }
  }
  return filter;
}

/**
 * Check if a document's field value satisfies a filter condition.
 * Supports MongoDB-style operators: $lte, $gte, $lt, $gt, $ne, $in.
 * Falls back to strict equality for plain values.
 */
function fieldMatches(fieldValue: any, condition: any): boolean {
  if (condition !== null && typeof condition === 'object' && !Array.isArray(condition)) {
    const ops = Object.keys(condition);
    for (const op of ops) {
      const operand = condition[op];
      switch (op) {
        case '$lte': if (!(fieldValue <= operand)) return false; break;
        case '$gte': if (!(fieldValue >= operand)) return false; break;
        case '$lt':  if (!(fieldValue <  operand)) return false; break;
        case '$gt':  if (!(fieldValue >  operand)) return false; break;
        case '$ne':  if (fieldValue === operand) return false; break;
        case '$in':  if (!Array.isArray(operand) || !operand.includes(fieldValue)) return false; break;
        default: if (fieldValue !== condition) return false;
      }
    }
    return true;
  }
  return fieldValue === condition;
}

export function matchesFilter(data: Record<string, any>, filterObj: Record<string, any>, customId?: string): boolean {
  for (const [k, v] of Object.entries(filterObj)) {
    if (k === '_id') {
      if (customId !== undefined ? customId !== v : data._id !== v) return false;
    } else if (!fieldMatches(data[k], v)) {
      return false;
    }
  }
  return true;
}

/**
 * Safely convert a value to a number with a default fallback.
 * Handles strings that might be unresolved expressions.
 */
export function safeNumber(value: any, defaultValue: number): number {
  if (value === undefined || value === null) return defaultValue;
  const num = Number(value);
  // If the result is NaN or the original was a non-numeric string, use default
  if (isNaN(num) || (typeof value === 'string' && !/^-?\d+(\.\d+)?$/.test(value.trim()))) {
    return defaultValue;
  }
  return num;
}

// ============ Operations ============

export async function store(params: {
  collection: string;
  key: string;
  value: any;
  ttl?: number;
  database?: string;
}) {
  const { collection = 'default', key, value, ttl, database = 'habits-cortex.db' } = params;
  const sqlite = getSqlite(String(database));
  const docId = `${collection}:${key}`;
  const valueStr = JSON.stringify(parseValue(value));
  const now = new Date().toISOString();
  const expiresAt = ttl ? new Date(Date.now() + Number(ttl) * 1000).toISOString() : null;

  const existing = sqlite.prepare('SELECT id, created_at FROM kv_store WHERE id = ?').get(docId) as any;

  if (existing) {
    sqlite.prepare('UPDATE kv_store SET value = ?, updated_at = ?, expires_at = ? WHERE id = ?')
      .run(valueStr, now, expiresAt, docId);
    return { success: true, collection: String(collection), key: String(key), createdAt: existing.created_at, expiresAt };
  } else {
    sqlite.prepare('INSERT INTO kv_store (id, collection, key, value, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(docId, String(collection), String(key), valueStr, now, expiresAt);
    return { success: true, collection: String(collection), key: String(key), createdAt: now, expiresAt };
  }
}

export async function get(params: {
  collection: string;
  key: string;
  defaultValue?: any;
  database?: string;
}) {
  const { collection = 'default', key, defaultValue, database = 'habits-cortex.db' } = params;
  const sqlite = getSqlite(String(database));
  const docId = `${collection}:${key}`;

  const row = sqlite.prepare('SELECT value, created_at, expires_at FROM kv_store WHERE id = ?').get(docId) as any;

  if (!row) {
    return { found: false, value: defaultValue || null };
  }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    sqlite.prepare('DELETE FROM kv_store WHERE id = ?').run(docId);
    return { found: false, value: defaultValue || null, expired: true };
  }

  return { found: true, value: parseValue(row.value), createdAt: row.created_at, expiresAt: row.expires_at };
}

export async function del(params: {
  collection: string;
  key: string;
  database?: string;
}) {
  const { collection = 'default', key, database = 'habits-cortex.db' } = params;
  const sqlite = getSqlite(String(database));
  const docId = `${collection}:${key}`;

  const result = sqlite.prepare('DELETE FROM kv_store WHERE id = ?').run(docId);
  return { success: true, deleted: result.changes > 0, collection: String(collection), key: String(key) };
}

export async function list(params: {
  collection: string;
  prefix?: string;
  limit?: number;
  database?: string;
}) {
  const { collection = 'default', prefix, limit = 100, database = 'habits-cortex.db' } = params;
  const sqlite = getSqlite(String(database));

  const query = prefix
    ? 'SELECT key FROM kv_store WHERE collection = ? AND key LIKE ? AND (expires_at IS NULL OR expires_at > datetime(\'now\')) LIMIT ?'
    : 'SELECT key FROM kv_store WHERE collection = ? AND (expires_at IS NULL OR expires_at > datetime(\'now\')) LIMIT ?';
  const args = prefix ? [String(collection), `${prefix}%`, safeNumber(limit, 0)] : [String(collection), safeNumber(limit, 0)];

  const rows = sqlite.prepare(query).all(...args) as { key: string }[];
  const keys = rows.map(r => r.key);
  return { collection: String(collection), keys, count: keys.length };
}

export async function insert(params: {
  collection: string;
  document: any;
  database?: string;
}) {
  const { collection, document, database = 'habits-cortex.db' } = params;
  const sqlite = getSqlite(String(database));
  const customId = generateId();
  const docId = `${collection}:${customId}`;
  const now = new Date().toISOString();

  let docData = parseValue(document);
  if (typeof docData !== 'object' || docData === null) docData = { data: docData };
  docData._id = customId;

  sqlite.prepare('INSERT INTO documents (id, collection, custom_id, data, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(docId, String(collection), customId, JSON.stringify(docData), now);

  return { success: true, id: customId, collection: String(collection), document: docData, createdAt: now };
}

export async function update(params: {
  collection: string;
  filter: any;
  update: any;
  database?: string;
}) {
  const { collection, filter, update: updateData, database = 'habits-cortex.db' } = params;
  const sqlite = getSqlite(String(database));
  const filterObj = parseFilter(filter);
  const updateObj = parseFilter(updateData);

  const rows = sqlite.prepare(
    'SELECT id, custom_id, data, created_at FROM documents WHERE collection = ? AND (expires_at IS NULL OR expires_at > datetime(\'now\'))'
  ).all(String(collection)) as any[];

  for (const row of rows) {
    const data = parseValue(row.data);
    if (matchesFilter(data, filterObj, row.custom_id)) {
      const now = new Date().toISOString();
      const updatedData = { ...data, ...updateObj, _id: row.custom_id };
      sqlite.prepare('UPDATE documents SET data = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(updatedData), now, row.id);
      return { success: true, matched: 1, modified: 1, collection: String(collection), document: updatedData, updatedAt: now };
    }
  }

  return { success: false, matched: 0, modified: 0, collection: String(collection) };
}

export async function query(params: {
  collection: string;
  filter?: any;
  limit?: number;
  database?: string;
}) {
  const { collection, filter, limit = 100, database = 'habits-cortex.db' } = params;
  const sqlite = getSqlite(String(database));
  const filterObj = parseFilter(filter);

  const rows = sqlite.prepare(
    'SELECT custom_id, data, created_at FROM documents WHERE collection = ? AND (expires_at IS NULL OR expires_at > datetime(\'now\')) LIMIT ?'
  ).all(String(collection), safeNumber(limit, 0) * 10) as any[];

  const results: any[] = [];
  for (const row of rows) {
    const data = parseValue(row.data);
    if (matchesFilter(data, filterObj, row.custom_id)) {
      results.push({ ...data, _id: row.custom_id, _createdAt: row.created_at });
      if (results.length >= safeNumber(limit, 0)) break;
    }
  }

  return { collection: String(collection), results, count: results.length };
}

export async function increment(params: {
  collection: string;
  key: string;
  amount?: number;
  database?: string;
}) {
  const { collection = 'counters', key, amount = 1, database = 'habits-cortex.db' } = params;
  const sqlite = getSqlite(String(database));
  const docId = `${collection}:${key}`;

  const row = sqlite.prepare('SELECT value, created_at FROM kv_store WHERE id = ?').get(docId) as any;
  const currentValue = row ? Number(parseValue(row.value)) || 0 : 0;
  const newValue = currentValue + Number(amount);
  const now = new Date().toISOString();

  if (row) {
    sqlite.prepare('UPDATE kv_store SET value = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(newValue), now, docId);
  } else {
    sqlite.prepare('INSERT INTO kv_store (id, collection, key, value, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(docId, String(collection), String(key), JSON.stringify(newValue), now);
  }

  return { collection: String(collection), key: String(key), previousValue: currentValue, newValue, amount: Number(amount) };
}

export async function deleteDoc(params: {
  collection: string;
  id: string;
  database?: string;
}): Promise<DeleteResult> {
  const { collection, id, database = 'habits-cortex.db' } = params;
  const sqlite = getSqlite(String(database));
  const docId = `${collection}:${id}`;

  const result = sqlite.prepare('DELETE FROM documents WHERE id = ? OR custom_id = ?').run(docId, String(id));
  return { success: true, deleted: result.changes > 0, collection: String(collection), key: String(id) };
}

// ============ Vector helpers ============

function validateCollection(name: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid collection name '${name}': must match /^[A-Za-z_][A-Za-z0-9_]*$/`);
  }
}

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

// ============ Vector actions ============

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
  if (!vector) throw new Error('vectorInsert requires document.vector (number[])');

  const dim = vector.length;
  ensureVecTables(sqlite, collection, dim);

  const customId = generateId();
  const now = new Date().toISOString();
  const meta: any = { ...doc, _id: customId };
  delete meta.vector;

  const insertTx = sqlite.transaction(() => {
    const rowid = reserveRowid(sqlite, collection);
    // better-sqlite3 binds JS numbers as SQLITE_FLOAT; sqlite-vec requires SQLITE_INTEGER
    // for explicit rowid inserts, so we must use BigInt.
    sqlite.prepare(`INSERT INTO vec_${collection}(rowid, embedding) VALUES (?, ?)`)
      .run(BigInt(rowid), JSON.stringify(vector));
    sqlite.prepare(`INSERT INTO vec_meta_${collection} (rowid, custom_id, data, created_at) VALUES (?, ?, ?, ?)`)
      .run(rowid, customId, JSON.stringify(meta), now);
    return { rowid };
  });
  insertTx();

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
  const over = Object.keys(filterObj).length ? k * 5 : k;

  const rows = (() => {
    if (distance === 'cosine' || distance === 'l1') {
      const fn = distance === 'cosine' ? 'vec_distance_cosine' : 'vec_distance_L1';
      return sqlite.prepare(
        `SELECT v.rowid AS rowid, ${fn}(v.embedding, ?) AS distance, m.custom_id, m.data, m.created_at
         FROM vec_${collection} v JOIN vec_meta_${collection} m ON m.rowid = v.rowid
         ORDER BY distance ASC LIMIT ?`
      ).all(JSON.stringify(vec), over) as any[];
    }
    // MATCH requires LIMIT visible to the vec0 planner, use a subquery so the JOIN
    // doesn't hide the LIMIT constraint from the virtual table optimizer.
    return sqlite.prepare(
      `SELECT v.rowid AS rowid, v.distance AS distance, m.custom_id, m.data, m.created_at
       FROM (SELECT rowid, distance FROM vec_${collection} WHERE embedding MATCH ? ORDER BY distance LIMIT ?) v
       JOIN vec_meta_${collection} m ON m.rowid = v.rowid`
    ).all(JSON.stringify(vec), over) as any[];
  })();

  const results: any[] = [];
  for (const r of rows) {
    const data = parseValue(r.data);
    if (matchesFilter(data, filterObj)) {
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

  const deleteTx = sqlite.transaction(() => {
    sqlite.prepare(`DELETE FROM vec_${collection} WHERE rowid = ?`).run(row.rowid);
    sqlite.prepare(`DELETE FROM vec_meta_${collection} WHERE rowid = ?`).run(row.rowid);
  });
  deleteTx();
  return { success: true, deleted: true, collection: String(collection), key: String(id) };
}
