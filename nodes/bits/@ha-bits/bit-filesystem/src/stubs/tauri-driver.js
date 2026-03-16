/**
 * Tauri Driver Stub for @ha-bits/bit-filesystem
 * 
 * Replaces driver.ts in Tauri environments.
 * Uses Tauri plugin-fs for filesystem operations.
 * Files are scoped to the app data directory ($APPDATA).
 */

var fsAvailable = false;
var appDataPath = null;

function tauriLog(level, message) {
  var fullMsg = '[FS Driver] ' + message;
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

async function ensureFs() {
  if (fsAvailable) return;
  
  var invoke = getInvoke();
  if (!invoke) {
    throw new Error('Tauri API not available - filesystem operations require Tauri');
  }
  
  tauriLog('info', 'Initializing Tauri filesystem plugin');
  
  // In Tauri v2, we use baseDir option directly in fs operations
  // baseDir: 22 = AppData, no need to resolve the path manually
  fsAvailable = true;
  appDataPath = '$APPDATA'; // Placeholder, actual path resolved by Tauri
  tauriLog('info', 'Tauri FS ready (using AppData base directory)');
}

function base64ToUint8Array(base64) {
  if (base64.indexOf(',') !== -1) base64 = base64.split(',')[1];
  var binaryString = atob(base64);
  var bytes = new Uint8Array(binaryString.length);
  for (var i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(uint8Array) {
  var binaryString = '';
  for (var i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binaryString);
}

function resolvePath(filePath, baseDir) {
  // In Tauri, all paths are relative to $APPDATA
  var fullPath = baseDir ? baseDir + '/' + filePath : filePath;
  // Normalize path separators
  return fullPath.replace(/\/+/g, '/');
}

async function readFile(params) {
  await ensureFs();
  var invoke = getInvoke();
  var filePath = params.filePath;
  var baseDir = params.baseDir;
  var encoding = params.encoding || 'utf-8';
  var resolved = resolvePath(filePath, baseDir);
  
  tauriLog('info', 'Reading file: ' + resolved);
  
  var contents = await invoke('plugin:fs|read_file', {
    path: resolved,
    options: { baseDir: 22 } // 22 = AppData
  });
  
  if (encoding === 'binary') {
    return { content: contents, path: resolved, size: contents.length };
  } else if (encoding === 'base64') {
    return { content: uint8ArrayToBase64(contents), path: resolved, size: contents.length };
  } else {
    var decoder = new TextDecoder(encoding);
    var text = decoder.decode(contents);
    return { content: text, path: resolved, size: text.length };
  }
}

async function writeFile(params) {
  await ensureFs();
  var invoke = getInvoke();
  var filePath = params.filePath;
  var content = params.content;
  var baseDir = params.baseDir;
  var createDirs = params.createDirs !== false;
  var encoding = params.encoding || 'utf-8';
  var resolved = resolvePath(filePath, baseDir);
  
  tauriLog('info', 'Writing file: ' + resolved);
  
  try {
    // Create parent directories if needed
    if (createDirs) {
      var parentDir = resolved.substring(0, resolved.lastIndexOf('/'));
      if (parentDir) {
        try {
          await invoke('plugin:fs|mkdir', {
            path: parentDir,
            options: { baseDir: 22, recursive: true }
          });
          tauriLog('info', 'Created directory: ' + parentDir);
        } catch (e) {
          // Directory might already exist, log but continue
          tauriLog('info', 'Directory exists or mkdir skipped: ' + parentDir);
        }
      }
    }
    
    var bytes;
    if (encoding === 'base64') {
      bytes = base64ToUint8Array(content);
    } else {
      var encoder = new TextEncoder();
      bytes = encoder.encode(content);
    }
    
    tauriLog('info', 'Writing ' + bytes.length + ' bytes to: ' + resolved);
    
    await invoke('plugin:fs|write_file', {
      path: resolved,
      contents: Array.from(bytes),
      options: { baseDir: 22 }
    });
    
    tauriLog('info', 'Successfully wrote file: ' + resolved);
    return { success: true, path: resolved, size: bytes.length };
  } catch (e) {
    var errMsg = e && (e.message || e.toString()) || 'Unknown write error';
    tauriLog('error', 'Failed to write file ' + resolved + ': ' + errMsg);
    throw new Error('Failed to write file ' + resolved + ': ' + errMsg);
  }
}

async function appendFile(params) {
  await ensureFs();
  var filePath = params.filePath;
  var content = params.content;
  var baseDir = params.baseDir;
  var resolved = resolvePath(filePath, baseDir);
  
  // Read existing content first
  var existing = '';
  try {
    var readResult = await readFile({ filePath: filePath, baseDir: baseDir, encoding: 'utf-8' });
    existing = readResult.content;
  } catch (e) {
    // File might not exist
  }
  
  await writeFile({ filePath: filePath, content: existing + content, baseDir: baseDir });
  return { success: true, path: resolved };
}

async function deleteFile(params) {
  await ensureFs();
  var invoke = getInvoke();
  var resolved = resolvePath(params.filePath, params.baseDir);
  
  tauriLog('info', 'Deleting file: ' + resolved);
  
  await invoke('plugin:fs|remove', {
    path: resolved,
    options: { baseDir: 22 }
  });
  
  return { success: true, deletedPath: resolved };
}

async function listDirectory(params) {
  await ensureFs();
  var invoke = getInvoke();
  var resolved = resolvePath(params.dirPath, params.baseDir);
  
  tauriLog('info', 'Listing directory: ' + resolved);
  
  try {
    var entries = await invoke('plugin:fs|read_dir', {
      path: resolved,
      options: { baseDir: 22 }
    });
    
    var files = (entries || []).map(function(entry) {
      return {
        name: entry.name,
        path: resolved + '/' + entry.name,
        isDirectory: entry.isDirectory || false,
        size: entry.size || 0,
        created: entry.createdAt ? new Date(entry.createdAt) : new Date(),
        modified: entry.modifiedAt ? new Date(entry.modifiedAt) : new Date()
      };
    });
    
    return { files: files, count: files.length, path: resolved };
  } catch (e) {
    // Return empty if directory doesn't exist
    return { files: [], count: 0, path: resolved };
  }
}

async function createDirectory(params) {
  await ensureFs();
  var invoke = getInvoke();
  var resolved = resolvePath(params.dirPath, params.baseDir);
  var recursive = params.recursive !== false;
  
  tauriLog('info', 'Creating directory: ' + resolved);
  
  try {
    await invoke('plugin:fs|mkdir', {
      path: resolved,
      options: { baseDir: 22, recursive: recursive }
    });
    return { success: true, path: resolved };
  } catch (e) {
    if (String(e).indexOf('exists') !== -1) {
      return { success: true, path: resolved };
    }
    throw new Error('Failed to create directory: ' + (e.message || e));
  }
}

async function exists(params) {
  await ensureFs();
  var invoke = getInvoke();
  var resolved = resolvePath(params.filePath, params.baseDir);
  
  try {
    var fileExists = await invoke('plugin:fs|exists', {
      path: resolved,
      options: { baseDir: 22 }
    });
    return { exists: !!fileExists, path: resolved };
  } catch (e) {
    return { exists: false, path: resolved };
  }
}

async function copyFile(params) {
  await ensureFs();
  var invoke = getInvoke();
  var src = resolvePath(params.sourcePath, params.baseDir);
  var dest = resolvePath(params.destPath, params.baseDir);
  
  tauriLog('info', 'Copying file: ' + src + ' -> ' + dest);
  
  await invoke('plugin:fs|copy_file', {
    fromPath: src,
    toPath: dest,
    options: { baseDir: 22 }
  });
  
  return { success: true, source: src, destination: dest };
}

async function moveFile(params) {
  await ensureFs();
  var invoke = getInvoke();
  var src = resolvePath(params.sourcePath, params.baseDir);
  var dest = resolvePath(params.destPath, params.baseDir);
  
  tauriLog('info', 'Moving file: ' + src + ' -> ' + dest);
  
  await invoke('plugin:fs|rename', {
    oldPath: src,
    newPath: dest,
    options: { baseDir: 22 }
  });
  
  return { success: true, source: src, destination: dest };
}

module.exports = {
  resolvePath: resolvePath,
  readFile: readFile,
  writeFile: writeFile,
  appendFile: appendFile,
  deleteFile: deleteFile,
  listDirectory: listDirectory,
  createDirectory: createDirectory,
  exists: exists,
  copyFile: copyFile,
  moveFile: moveFile
};
