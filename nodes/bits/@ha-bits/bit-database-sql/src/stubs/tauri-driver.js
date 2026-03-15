/**
 * Tauri Driver Stub for bit-database-sql
 * 
 * Replaces driver.ts in Tauri/browser environments.
 * Uses Tauri SQL plugin or falls back to in-memory storage.
 * Database is stored in {appDataDir}/habits.db
 * macOS: ~/Library/Application Support/{bundle-id}/habits.db
 */

var memoryKv = new Map();
var memoryDocs = new Map();
var dbInitialized = false;
var sqlAvailable = false; // Track if SQL plugin is actually available
var dbPath = 'sqlite:habits.db'; // Stored in app data directory

/**
 * Log using console - Tauri log plugin intercepts and forwards to stdout
 */
function tauriLog(level, message) {
  var fullMsg = '[SQL Driver] ' + message;
  if (level === 'error') console.error(fullMsg);
  else if (level === 'warn') console.warn(fullMsg);
  else console.log(fullMsg);
}

function getInvoke() {
  // Tauri v2 detection - check multiple ways to find the invoke function
  if (typeof window === 'undefined') return null;
  
  // Try Tauri v2 core.invoke
  if (window.__TAURI__?.core?.invoke) {
    return window.__TAURI__.core.invoke;
  }
  
  // Try Tauri v1 style
  if (window.__TAURI__?.invoke) {
    return window.__TAURI__.invoke;
  }
  
  // Try Tauri internals (v2 low-level)
  if (window.__TAURI_INTERNALS__?.invoke) {
    return window.__TAURI_INTERNALS__.invoke;
  }
  
  return null;
}

async function ensureDb() {
  if (dbInitialized) return;
  dbInitialized = true;
  
  // Debug: log what's available
  if (typeof window !== 'undefined') {
    tauriLog('info', 'Checking Tauri API: __TAURI__=' + !!window.__TAURI__ + 
      ', __TAURI_INTERNALS__=' + !!window.__TAURI_INTERNALS__ + 
      ', __TAURI_IPC__=' + !!window.__TAURI_IPC__);
  }
  
  var invoke = getInvoke();
  if (!invoke) { 
    tauriLog('warn', 'No Tauri API found - using memory storage'); 
    return; 
  }
  
  tauriLog('info', 'Found Tauri invoke, loading database: ' + dbPath);
  
  try {
    // First load the database - this creates it if it doesn't exist
    await invoke('plugin:sql|load', { db: dbPath });
    tauriLog('info', 'Database loaded successfully');
    
    // Create tables - note: execute requires 'values' parameter even if empty
    await invoke('plugin:sql|execute', { db: dbPath, query: 'CREATE TABLE IF NOT EXISTS kv_store (id TEXT PRIMARY KEY, collection TEXT, key TEXT, value TEXT, created_at TEXT, expires_at TEXT)', values: [] });
    await invoke('plugin:sql|execute', { db: dbPath, query: 'CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, collection TEXT, custom_id TEXT, data TEXT, created_at TEXT)', values: [] });
    sqlAvailable = true;
    tauriLog('info', 'Tauri DB ready at: ' + dbPath);
  } catch (e) { 
    sqlAvailable = false;
    var errMsg = e ? (e.message || e.toString() || JSON.stringify(e)) : 'Unknown error';
    tauriLog('error', 'SQL plugin error: ' + errMsg); 
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
  var collection = params.collection || 'default';
  var key = params.key;
  var value = params.value;
  var ttl = params.ttl;
  var now = new Date().toISOString();
  var expiresAt = ttl ? new Date(Date.now() + Number(ttl) * 1000).toISOString() : null;
  var docId = collection + ':' + key;
  var valueStr = JSON.stringify(parseValue(value));
  var invoke = getInvoke();
  if (invoke && sqlAvailable) {
    try { await invoke('plugin:sql|execute', { db: dbPath, query: 'INSERT OR REPLACE INTO kv_store (id, collection, key, value, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)', values: [docId, collection, key, valueStr, now, expiresAt] }); }
    catch (e) { console.warn('[SQL Driver] store error:', e.message); }
  } else { memoryKv.set(docId, { value: parseValue(value), createdAt: now, expiresAt: expiresAt }); }
  return { success: true, collection: String(collection), key: String(key), createdAt: now, expiresAt: expiresAt };
}

async function get(params) {
  await ensureDb();
  var collection = params.collection || 'default';
  var key = params.key;
  var defaultValue = params.defaultValue;
  var docId = collection + ':' + key;
  var invoke = getInvoke();
  if (invoke && sqlAvailable) {
    try {
      var rows = await invoke('plugin:sql|select', { db: dbPath, query: 'SELECT value, created_at, expires_at FROM kv_store WHERE id = ?', values: [docId] });
      if (rows && rows.length > 0) {
        var row = rows[0];
        if (row.expires_at && new Date(row.expires_at) < new Date()) {
          await invoke('plugin:sql|execute', { db: dbPath, query: 'DELETE FROM kv_store WHERE id = ?', values: [docId] });
          return { found: false, value: defaultValue || null, expired: true };
        }
        return { found: true, value: JSON.parse(row.value), createdAt: row.created_at, expiresAt: row.expires_at };
      }
    } catch (e) { console.warn('[SQL Driver] get error:', e.message); }
  } else {
    var entry = memoryKv.get(docId);
    if (entry) {
      if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) { memoryKv.delete(docId); return { found: false, value: defaultValue || null, expired: true }; }
      return { found: true, value: entry.value, createdAt: entry.createdAt, expiresAt: entry.expiresAt };
    }
  }
  return { found: false, value: defaultValue || null };
}

async function del(params) {
  await ensureDb();
  var collection = params.collection || 'default';
  var key = params.key;
  var docId = collection + ':' + key;
  var deleted = false;
  var invoke = getInvoke();
  if (invoke && sqlAvailable) { try { await invoke('plugin:sql|execute', { db: dbPath, query: 'DELETE FROM kv_store WHERE id = ?', values: [docId] }); deleted = true; } catch (e) { console.warn('[SQL Driver] delete error:', e.message); } }
  else { deleted = memoryKv.delete(docId); }
  return { success: true, deleted: deleted, collection: String(collection), key: String(key) };
}

async function list(params) {
  await ensureDb();
  var collection = params.collection || 'default';
  var prefix = params.prefix;
  var limit = params.limit || 100;
  var keys = [];
  var invoke = getInvoke();
  if (invoke && sqlAvailable) {
    try {
      var query = prefix ? 'SELECT key FROM kv_store WHERE collection = ? AND key LIKE ? LIMIT ?' : 'SELECT key FROM kv_store WHERE collection = ? LIMIT ?';
      var values = prefix ? [collection, prefix + '%', limit] : [collection, limit];
      var rows = await invoke('plugin:sql|select', { db: dbPath, query: query, values: values });
      keys = (rows || []).map(function(r) { return r.key; });
    } catch (e) { console.warn('[SQL Driver] list error:', e.message); }
  } else {
    memoryKv.forEach(function(_, k) {
      if (k.startsWith(collection + ':') && keys.length < limit) {
        var keyPart = k.substring(collection.length + 1);
        if (!prefix || keyPart.startsWith(prefix)) keys.push(keyPart);
      }
    });
  }
  return { collection: String(collection), keys: keys, count: keys.length };
}

async function insert(params) {
  await ensureDb();
  var collection = params.collection;
  var document = params.document;
  var customId = generateId();
  var docId = collection + ':' + customId;
  var now = new Date().toISOString();
  var docData = parseValue(document);
  if (typeof docData !== 'object' || docData === null) docData = { data: docData };
  docData._id = customId;
  var invoke = getInvoke();
  if (invoke && sqlAvailable) { try { await invoke('plugin:sql|execute', { db: dbPath, query: 'INSERT INTO documents (id, collection, custom_id, data, created_at) VALUES (?, ?, ?, ?, ?)', values: [docId, collection, customId, JSON.stringify(docData), now] }); } catch (e) { console.warn('[SQL Driver] insert error:', e.message); } }
  else { memoryDocs.set(docId, { data: docData, createdAt: now }); }
  return { success: true, id: customId, collection: String(collection), document: docData, createdAt: now };
}

async function update(params) {
  await ensureDb();
  var collection = params.collection;
  var filter = parseFilter(params.filter);
  var updateData = parseFilter(params.update);
  var now = new Date().toISOString();
  var invoke = getInvoke();
  if (invoke && sqlAvailable) {
    try {
      var rows = await invoke('plugin:sql|select', { db: dbPath, query: 'SELECT id, custom_id, data FROM documents WHERE collection = ?', values: [collection] });
      for (var i = 0; i < (rows || []).length; i++) {
        var row = rows[i];
        var data = JSON.parse(row.data);
        var matches = true;
        for (var k in filter) { if (k === '_id' && row.custom_id !== filter[k]) { matches = false; break; } else if (k !== '_id' && data[k] !== filter[k]) { matches = false; break; } }
        if (matches) {
          var updatedData = Object.assign({}, data, updateData, { _id: row.custom_id });
          await invoke('plugin:sql|execute', { db: dbPath, query: 'UPDATE documents SET data = ? WHERE id = ?', values: [JSON.stringify(updatedData), row.id] });
          return { success: true, matched: 1, modified: 1, collection: String(collection), document: updatedData, updatedAt: now };
        }
      }
    } catch (e) { console.warn('[SQL Driver] update error:', e.message); }
  } else {
    var keys = Array.from(memoryDocs.keys());
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k.startsWith(collection + ':')) {
        var v = memoryDocs.get(k);
        var matches = true;
        for (var fk in filter) { if (v.data[fk] !== filter[fk]) { matches = false; break; } }
        if (matches) {
          var updatedData = Object.assign({}, v.data, updateData);
          memoryDocs.set(k, { data: updatedData, createdAt: v.createdAt });
          return { success: true, matched: 1, modified: 1, collection: String(collection), document: updatedData, updatedAt: now };
        }
      }
    }
  }
  return { success: false, matched: 0, modified: 0, collection: String(collection) };
}

async function query(params) {
  await ensureDb();
  var collection = params.collection;
  var filter = parseFilter(params.filter);
  var limit = params.limit || 100;
  var results = [];
  var invoke = getInvoke();
  if (invoke && sqlAvailable) {
    try {
      var rows = await invoke('plugin:sql|select', { db: dbPath, query: 'SELECT custom_id, data, created_at FROM documents WHERE collection = ? LIMIT ?', values: [collection, limit * 10] });
      for (var i = 0; i < (rows || []).length && results.length < limit; i++) {
        var row = rows[i];
        var data = JSON.parse(row.data);
        var matches = true;
        for (var k in filter) { if (data[k] !== filter[k]) { matches = false; break; } }
        if (matches) results.push(Object.assign({}, data, { _id: row.custom_id, _createdAt: row.created_at }));
      }
    } catch (e) { console.warn('[SQL Driver] query error:', e.message); }
  } else {
    var keys = Array.from(memoryDocs.keys());
    for (var i = 0; i < keys.length && results.length < limit; i++) {
      var k = keys[i];
      if (k.startsWith(collection + ':')) {
        var v = memoryDocs.get(k);
        var matches = true;
        for (var fk in filter) { if (v.data[fk] !== filter[fk]) { matches = false; break; } }
        if (matches) results.push(Object.assign({}, v.data, { _createdAt: v.createdAt }));
      }
    }
  }
  return { collection: String(collection), results: results, count: results.length };
}

async function increment(params) {
  await ensureDb();
  var collection = params.collection || 'counters';
  var key = params.key;
  var amount = params.amount || 1;
  var docId = collection + ':' + key;
  var previousValue = 0;
  var newValue = Number(amount);
  var invoke = getInvoke();
  if (invoke && sqlAvailable) {
    try {
      var rows = await invoke('plugin:sql|select', { db: dbPath, query: 'SELECT value FROM kv_store WHERE id = ?', values: [docId] });
      if (rows && rows.length > 0) previousValue = Number(JSON.parse(rows[0].value)) || 0;
      newValue = previousValue + Number(amount);
      var now = new Date().toISOString();
      await invoke('plugin:sql|execute', { db: dbPath, query: 'INSERT OR REPLACE INTO kv_store (id, collection, key, value, created_at) VALUES (?, ?, ?, ?, ?)', values: [docId, collection, key, JSON.stringify(newValue), now] });
    } catch (e) { console.warn('[SQL Driver] increment error:', e.message); }
  } else {
    var entry = memoryKv.get(docId);
    if (entry) previousValue = Number(entry.value) || 0;
    newValue = previousValue + Number(amount);
    memoryKv.set(docId, { value: newValue, createdAt: new Date().toISOString() });
  }
  return { collection: String(collection), key: String(key), previousValue: previousValue, newValue: newValue, amount: Number(amount) };
}

module.exports = { generateId, parseValue, parseFilter, store, get, del, list, insert, update, query, increment };
