/**
 * Tauri Driver Stub for @ha-bits/bit-local-ai
 * 
 * Replaces driver.ts in Tauri environments.
 * Uses tauri-plugin-llama for local model inference via Rust.
 * All model paths are resolved to the app data directory.
 */

var llamaAvailable = false;
var cachedAppDataModelsDir = null;

function llamaLog(level, message) {
  var fullMsg = '[LocalAI Driver] ' + message;
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

/**
 * Wrap any error (including strings from Tauri) into proper Error objects
 */
function wrapError(e) {
  if (e instanceof Error) return e;
  if (typeof e === 'string') return new Error(e);
  if (e && typeof e === 'object' && e.message) return new Error(e.message);
  return new Error(String(e) || 'Unknown error');
}

/**
 * Get the app data models directory from Rust plugin
 */
async function getAppDataModelsDir() {
  if (cachedAppDataModelsDir) return cachedAppDataModelsDir;
  
  var invoke = getInvoke();
  if (!invoke) return null;
  
  try {
    cachedAppDataModelsDir = await invoke('plugin:llama|ensure_models_dir', {});
    llamaLog('info', 'App data models directory: ' + cachedAppDataModelsDir);
    return cachedAppDataModelsDir;
  } catch (e) {
    llamaLog('warn', 'Could not get app data models dir: ' + (e && e.message ? e.message : String(e)));
    return null;
  }
}

/**
 * Resolve a model path - replace ~/.habits/models with app data dir
 */
async function resolveModelPath(inputPath) {
  if (!inputPath) return inputPath;
  var path = String(inputPath).trim();
  
  // Get the app data models directory
  var appDir = await getAppDataModelsDir();
  if (!appDir) return path;
  
  // Replace ~/.habits/models or ~\.habits\models with app data dir
  if (path.startsWith('~/.habits/models') || path.startsWith('~\\.habits\\models')) {
    var fileName = path.split('/').pop().split('\\').pop();
    var resolved = appDir + '/' + fileName;
    llamaLog('info', 'Resolved path: ' + path + ' -> ' + resolved);
    return resolved;
  }
  
  // If it's just a model name (no path separators), put it in app data dir
  if (!path.includes('/') && !path.includes('\\')) {
    // Add .gguf extension if not present
    var fileName = path.endsWith('.gguf') ? path : path + '.gguf';
    var resolved = appDir + '/' + fileName;
    llamaLog('info', 'Resolved model name: ' + path + ' -> ' + resolved);
    return resolved;
  }
  
  return path;
}

async function ensureLlama() {
  if (llamaAvailable) return;
  
  var invoke = getInvoke();
  if (!invoke) {
    throw new Error('Tauri API not available - local AI requires Tauri');
  }
  
  llamaLog('info', 'Initializing Tauri llama plugin');
  llamaAvailable = true;
  
  // Pre-cache the app data models directory
  await getAppDataModelsDir();
}

/**
 * Get default models directory (app data)
 */
function getModelsDirectory() {
  return cachedAppDataModelsDir || 'models';
}

/**
 * Ensure models directory exists
 */
async function ensureModelsDirectory() {
  await ensureLlama();
  return await getAppDataModelsDir();
}

/**
 * Load a model
 */
async function loadModel(modelPath) {
  await ensureLlama();
  var invoke = getInvoke();
  var resolvedPath = await resolveModelPath(modelPath);
  
  llamaLog('info', 'Loading model: ' + resolvedPath);
  
  try {
    var result = await invoke('plugin:llama|load_model', {
      modelPath: resolvedPath
    });
    
    llamaLog('info', 'Model loaded successfully');
    return result;
  } catch (e) {
    throw wrapError(e);
  }
}

/**
 * Chat with loaded model
 */
async function chat(params) {
  await ensureLlama();
  var invoke = getInvoke();
  
  // Accept both modelPath and model as the path parameter
  var modelPath = await resolveModelPath(params.modelPath || params.model);
  var messages = params.messages;
  var systemPrompt = params.systemPrompt;
  var temperature = params.temperature || 0.7;
  var maxTokens = params.maxTokens || 2048;
  var topP = params.topP || 1.0;
  
  llamaLog('info', 'Generating response (temp=' + temperature + ', maxTokens=' + maxTokens + ')');
  
  try {
    var result = await invoke('plugin:llama|chat', {
      modelPath: modelPath,
      messages: messages,
      systemPrompt: systemPrompt,
      temperature: temperature,
      maxTokens: maxTokens,
      topP: topP
    });
    
    return result;
  } catch (e) {
    throw wrapError(e);
  }
}

/**
 * List local models - always uses app data directory
 */
async function listLocalModels(directory) {
  await ensureLlama();
  var invoke = getInvoke();
  
  // Always use app data directory for listing models in Tauri
  var appDir = await getAppDataModelsDir();
  var listDir = appDir || directory || null;
  
  llamaLog('info', 'Listing models in: ' + listDir);
  
  try {
    var models = await invoke('plugin:llama|list_models', {
      directory: listDir
    });
    
    return models;
  } catch (e) {
    throw wrapError(e);
  }
}

/**
 * Install model from URL - always installs to app data directory
 */
async function installModel(params) {
  await ensureLlama();
  var invoke = getInvoke();
  
  var modelUrl = params.modelUrl;
  var modelName = params.modelName;
  
  // Always install to app data directory in Tauri (ignore ~/.habits/models)
  var appDir = await getAppDataModelsDir();
  
  llamaLog('info', 'Downloading model: ' + modelUrl + ' to ' + appDir);
  
  try {
    var result = await invoke('plugin:llama|install_model', {
      modelUrl: modelUrl,
      modelName: modelName,
      destination: appDir
    });
    
    if (result.success) {
      llamaLog('info', 'Model installed: ' + result.path);
    } else {
      llamaLog('error', 'Installation failed: ' + result.error);
    }
    
    return result;
  } catch (e) {
    throw wrapError(e);
  }
}

/**
 * Unload model from memory
 */
async function unloadModel(modelPath) {
  await ensureLlama();
  var invoke = getInvoke();
  var resolvedPath = await resolveModelPath(modelPath);
  
  try {
    await invoke('plugin:llama|unload_model', {
      modelPath: resolvedPath
    });
    
    llamaLog('info', 'Model unloaded: ' + resolvedPath);
  } catch (e) {
    throw wrapError(e);
  }
}

/**
 * Get model info
 */
async function getModelInfo(modelPath) {
  await ensureLlama();
  var invoke = getInvoke();
  var resolvedPath = await resolveModelPath(modelPath);
  
  try {
    var info = await invoke('plugin:llama|get_model_info', {
      modelPath: resolvedPath
    });
    
    return info;
  } catch (e) {
    throw wrapError(e);
  }
}

// Export all functions
module.exports = {
  getModelsDirectory: getModelsDirectory,
  ensureModelsDirectory: ensureModelsDirectory,
  loadModel: loadModel,
  chat: chat,
  listLocalModels: listLocalModels,
  installModel: installModel,
  unloadModel: unloadModel,
  getModelInfo: getModelInfo
};
