/**
 * SQL Driver for bit-database-sql
 * 
 * This file contains the actual database operations.
 * In Tauri/browser environments, this is replaced by stubs/tauri-driver.js
 */

import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import BetterSqlite3 from 'better-sqlite3';

// Database instances per database file
const databases: Map<string, BetterSQLite3Database> = new Map();
const sqliteInstances: Map<string, BetterSqlite3.Database> = new Map();

function getDatabase(dbPath: string = 'habits.db'): BetterSQLite3Database {
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
    `);
    
    console.log(`💾 SQLite Database initialized: ${dbFile}`);
  }
  return databases.get(dbPath)!;
}

function getSqlite(dbPath: string = 'habits.db'): BetterSqlite3.Database {
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
  const { collection = 'default', key, value, ttl, database = 'habits.db' } = params;
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
  const { collection = 'default', key, defaultValue, database = 'habits.db' } = params;
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
  const { collection = 'default', key, database = 'habits.db' } = params;
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
  const { collection = 'default', prefix, limit = 100, database = 'habits.db' } = params;
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
  const { collection, document, database = 'habits.db' } = params;
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
  const { collection, filter, update: updateData, database = 'habits.db' } = params;
  const sqlite = getSqlite(String(database));
  const filterObj = parseFilter(filter);
  const updateObj = parseFilter(updateData);

  const rows = sqlite.prepare(
    'SELECT id, custom_id, data, created_at FROM documents WHERE collection = ? AND (expires_at IS NULL OR expires_at > datetime(\'now\'))'
  ).all(String(collection)) as any[];

  for (const row of rows) {
    const data = parseValue(row.data);
    let matches = true;
    for (const [k, v] of Object.entries(filterObj)) {
      if (k === '_id') { if (row.custom_id !== v) { matches = false; break; } }
      else if (data[k] !== v) { matches = false; break; }
    }
    if (matches) {
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
  const { collection, filter, limit = 100, database = 'habits.db' } = params;
  const sqlite = getSqlite(String(database));
  const filterObj = parseFilter(filter);

  const rows = sqlite.prepare(
    'SELECT custom_id, data, created_at FROM documents WHERE collection = ? AND (expires_at IS NULL OR expires_at > datetime(\'now\')) LIMIT ?'
  ).all(String(collection), safeNumber(limit, 0) * 10) as any[];

  const results: any[] = [];
  for (const row of rows) {
    const data = parseValue(row.data);
    let matches = true;
    for (const [k, v] of Object.entries(filterObj)) {
      if (data[k] !== v) { matches = false; break; }
    }
    if (matches) {
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
  const { collection = 'counters', key, amount = 1, database = 'habits.db' } = params;
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
