/**
 * Tauri Driver Stub for bit-database-sql
 * 
 * Replaces driver.ts in Tauri environments.
 * Uses Tauri SQL plugin for database operations.
 * Database is stored in {appDataDir}/habits.db
 */

var dbInitialized = false;
var dbPath = 'sqlite:habits.db';

function tauriLog(level, message) {
  var fullMsg = '[SQL Driver] ' + message;
  if (level === 'error') console.error(fullMsg);
  else if (level === 'warn') console.warn(fullMsg);
  else console.log(fullMsg);
}

function getInvoke() {
  if (typeof window === 'undefined') return null;
  if (window.__TAURI__?.core?.invoke) return window.__TAURI__.core.invoke;
  if (window.__TAURI__?.invoke) return window.__TAURI__.invoke;
  if (window.__TAURI_INTERNALS__?.invoke) return window.__TAURI_INTERNALS__.invoke;
  return null;
}

async function ensureDb() {
  if (dbInitialized) return;
  
  var invoke = getInvoke();
  if (!invoke) {
    throw new Error('Tauri API not available - SQL operations require Tauri');
  }
  
  tauriLog('info', 'Checking Tauri API: __TAURI__=' + !!window.__TAURI__ + 
    ', __TAURI_INTERNALS__=' + !!window.__TAURI_INTERNALS__ + 
    ', __TAURI_IPC__=' + !!window.__TAURI_IPC__);
  
  tauriLog('info', 'Found Tauri invoke, loading database: ' + dbPath);
  
  try {
    await invoke('plugin:sql|load', { db: dbPath });
    tauriLog('info', 'Database loaded successfully');
    
    await invoke('plugin:sql|execute', { db: dbPath, query: 'CREATE TABLE IF NOT EXISTS kv_store (id TEXT PRIMARY KEY, collection TEXT, key TEXT, value TEXT, created_at TEXT, expires_at TEXT)', values: [] });
    await invoke('plugin:sql|execute', { db: dbPath, query: 'CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, collection TEXT, custom_id TEXT, data TEXT, created_at TEXT)', values: [] });
    
    dbInitialized = true;
    tauriLog('info', 'Tauri DB ready at: ' + dbPath);
  } catch (e) {
    var errMsg = e ? (e.message || e.toString() || JSON.stringify(e)) : 'Unknown error';
    throw new Error('Failed to initialize SQL database: ' + errMsg);
  }
}

function generateId() {
  return Date.now() + '-' + Math.random().toString(36).substring(7);
}

function parseValue(value) {
  if (typeof value === 'string') { try { return JSON.parse(value); } catch { return value; } }
  return value;
}

function parseFilter(filter) {
  if (!filter) return {};
  if (typeof filter === 'string') { try { return JSON.parse(filter); } catch { return {}; } }
  return filter;
}

async function store(params) {
  await ensureDb();
  var invoke = getInvoke();
  var collection = params.collection || 'default';
  var key = params.key;
  var value = params.value;
  var ttl = params.ttl;
  var now = new Date().toISOString();
  var expiresAt = ttl ? new Date(Date.now() + Number(ttl) * 1000).toISOString() : null;
  var docId = collection + ':' + key;
  var valueStr = JSON.stringify(parseValue(value));
  
  await invoke('plugin:sql|execute', { 
    db: dbPath, 
    query: 'INSERT OR REPLACE INTO kv_store (id, collection, key, value, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)', 
    values: [docId, collection, key, valueStr, now, expiresAt] 
  });
  
  return { success: true, collection: String(collection), key: String(key), createdAt: now, expiresAt: expiresAt };
}

async function get(params) {
  await ensureDb();
  var invoke = getInvoke();
  var collection = params.collection || 'default';
  var key = params.key;
  var defaultValue = params.defaultValue;
  var docId = collection + ':' + key;
  
  var rows = await invoke('plugin:sql|select', { 
    db: dbPath, 
    query: 'SELECT value, created_at, expires_at FROM kv_store WHERE id = ?', 
    values: [docId] 
  });
  
  if (rows && rows.length > 0) {
    var row = rows[0];
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      await invoke('plugin:sql|execute', { db: dbPath, query: 'DELETE FROM kv_store WHERE id = ?', values: [docId] });
      return { found: false, value: defaultValue || null, expired: true };
    }
    return { found: true, value: JSON.parse(row.value), createdAt: row.created_at, expiresAt: row.expires_at };
  }
  
  return { found: false, value: defaultValue || null };
}

async function del(params) {
  await ensureDb();
  var invoke = getInvoke();
  var collection = params.collection || 'default';
  var key = params.key;
  var docId = collection + ':' + key;
  
  await invoke('plugin:sql|execute', { db: dbPath, query: 'DELETE FROM kv_store WHERE id = ?', values: [docId] });
  
  return { success: true, deleted: true, collection: String(collection), key: String(key) };
}

async function list(params) {
  await ensureDb();
  var invoke = getInvoke();
  var collection = params.collection || 'default';
  var prefix = params.prefix;
  var limit = Number(params.limit) || 100;
  
  var query = prefix 
    ? 'SELECT key FROM kv_store WHERE collection = ? AND key LIKE ? LIMIT ?' 
    : 'SELECT key FROM kv_store WHERE collection = ? LIMIT ?';
  var values = prefix ? [collection, prefix + '%', limit] : [collection, limit];
  
  var rows = await invoke('plugin:sql|select', { db: dbPath, query: query, values: values });
  var keys = (rows || []).map(function(r) { return r.key; });
  
  return { collection: String(collection), keys: keys, count: keys.length };
}

async function insert(params) {
  await ensureDb();
  var invoke = getInvoke();
  var collection = params.collection;
  var document = params.document;
  var customId = generateId();
  var docId = collection + ':' + customId;
  var now = new Date().toISOString();
  var docData = parseValue(document);
  
  if (typeof docData !== 'object' || docData === null) docData = { data: docData };
  docData._id = customId;
  
  tauriLog('info', 'Inserting document into collection: ' + collection);
  tauriLog('info', 'Document ID: ' + customId);
  
  try {
    await invoke('plugin:sql|execute', { 
      db: dbPath, 
      query: 'INSERT INTO documents (id, collection, custom_id, data, created_at) VALUES (?, ?, ?, ?, ?)', 
      values: [docId, collection, customId, JSON.stringify(docData), now] 
    });
    
    tauriLog('info', 'Document inserted successfully: ' + customId);
    return { success: true, id: customId, collection: String(collection), document: docData, createdAt: now };
  } catch (e) {
    var errMsg = e && (e.message || e.toString()) || 'Unknown insert error';
    tauriLog('error', 'Failed to insert document: ' + errMsg);
    throw new Error('Failed to insert document: ' + errMsg);
  }
}

async function update(params) {
  await ensureDb();
  var invoke = getInvoke();
  var collection = params.collection;
  var filter = parseFilter(params.filter);
  var updateData = parseFilter(params.update);
  var now = new Date().toISOString();
  
  var rows = await invoke('plugin:sql|select', { 
    db: dbPath, 
    query: 'SELECT id, custom_id, data FROM documents WHERE collection = ?', 
    values: [collection] 
  });
  
  for (var i = 0; i < (rows || []).length; i++) {
    var row = rows[i];
    var data = JSON.parse(row.data);
    var matches = true;
    
    for (var k in filter) { 
      if (k === '_id' && row.custom_id !== filter[k]) { matches = false; break; } 
      else if (k !== '_id' && data[k] !== filter[k]) { matches = false; break; } 
    }
    
    if (matches) {
      var updatedData = Object.assign({}, data, updateData, { _id: row.custom_id });
      await invoke('plugin:sql|execute', { 
        db: dbPath, 
        query: 'UPDATE documents SET data = ? WHERE id = ?', 
        values: [JSON.stringify(updatedData), row.id] 
      });
      return { success: true, matched: 1, modified: 1, collection: String(collection), document: updatedData, updatedAt: now };
    }
  }
  
  return { success: false, matched: 0, modified: 0, collection: String(collection) };
}

async function query(params) {
  await ensureDb();
  var invoke = getInvoke();
  var collection = params.collection;
  var filter = parseFilter(params.filter);
  var limit = Number(params.limit) || 100;
  var results = [];
  
  tauriLog('info', 'Query called: collection=' + collection + ', limit=' + limit + ', filter=' + JSON.stringify(filter));
  
  var rows = await invoke('plugin:sql|select', { 
    db: dbPath, 
    query: 'SELECT custom_id, data, created_at FROM documents WHERE collection = ? LIMIT ?', 
    values: [collection, limit * 10] 
  });
  
  tauriLog('info', 'Query returned ' + (rows ? rows.length : 0) + ' rows');
  
  for (var i = 0; i < (rows || []).length && results.length < limit; i++) {
    var row = rows[i];
    var data = JSON.parse(row.data);
    var matches = true;
    
    for (var k in filter) { 
      if (data[k] !== filter[k]) { matches = false; break; } 
    }
    
    if (matches) {
      results.push(Object.assign({}, data, { _id: row.custom_id, _createdAt: row.created_at }));
    }
  }
  
  tauriLog('info', 'Query returning ' + results.length + ' results after filtering');
  return { collection: String(collection), results: results, count: results.length };
}

async function increment(params) {
  await ensureDb();
  var invoke = getInvoke();
  var collection = params.collection || 'counters';
  var key = params.key;
  var amount = params.amount || 1;
  var docId = collection + ':' + key;
  var previousValue = 0;
  
  var rows = await invoke('plugin:sql|select', { 
    db: dbPath, 
    query: 'SELECT value FROM kv_store WHERE id = ?', 
    values: [docId] 
  });
  
  if (rows && rows.length > 0) {
    previousValue = Number(JSON.parse(rows[0].value)) || 0;
  }
  
  var newValue = previousValue + Number(amount);
  var now = new Date().toISOString();
  
  await invoke('plugin:sql|execute', { 
    db: dbPath, 
    query: 'INSERT OR REPLACE INTO kv_store (id, collection, key, value, created_at) VALUES (?, ?, ?, ?, ?)', 
    values: [docId, collection, key, JSON.stringify(newValue), now] 
  });
  
  return { collection: String(collection), key: String(key), previousValue: previousValue, newValue: newValue, amount: Number(amount) };
}

module.exports = { 
  generateId: generateId, 
  parseValue: parseValue, 
  parseFilter: parseFilter, 
  store: store, 
  get: get, 
  del: del, 
  list: list, 
  insert: insert, 
  update: update, 
  query: query, 
  increment: increment 
};
