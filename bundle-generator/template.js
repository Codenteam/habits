import { WorkflowExecutor, registerBundledModule } from '@ha-bits/cortex-core';

// Registry of bundled bits modules
const bitsRegistry = {};

////<bits_imports/>

////<bits_registration/>


// If no window.__TAURI__, check two levels up, if found any assign to this window
if (typeof window !== 'undefined' && !window.__TAURI__) {
  if(window.parent && window.parent.__TAURI__) {
    window.__TAURI__ = window.parent.__TAURI__;
    console.log('Assigned window.__TAURI__ from parent frame');
  }
  if(!window.__TAURI__ && window.parent && window.parent.parent && window.parent.parent.__TAURI__) {
    window.__TAURI__ = window.parent.parent.__TAURI__;
    console.log('Assigned window.__TAURI__ from grandparent frame');
  }
}


let workflowConfig = null;
let workflowsMap = null;
let envVars = null;
////<template_variables>
workflowConfig = {};
workflowsMap = {};
envVars = {};
////</template_variables>

if(typeof process == 'undefined'){
    globalThis.process = {
        env: {},
        cwd: function() { return '/'; },
    };

}

// Inject envVars into process.env for modules that read env directly
if (typeof process !== 'undefined' && process.env && envVars) {
  Object.keys(envVars).forEach(key => {
    process.env[key] = envVars[key];
  });
}

// Forward console messages to Tauri log plugin (for native stdout logging)
if (typeof window !== 'undefined' && window.__TAURI__) {
  (function() {
    // Log levels for Tauri log plugin: trace=1, debug=2, info=3, warn=4, error=5
    var LOG_LEVELS = { trace: 1, debug: 2, info: 3, warn: 4, error: 5 };
    
    function getInvoke() {
      if (window.__TAURI__?.core?.invoke) return window.__TAURI__.core.invoke;
      if (window.__TAURI__?.invoke) return window.__TAURI__.invoke;
      if (window.__TAURI_INTERNALS__?.invoke) return window.__TAURI_INTERNALS__.invoke;
      return null;
    }

    function forwardConsole(fnName, level) {
      var original = console[fnName];
      console[fnName] = function() {
        // Call original console method
        original.apply(console, arguments);
        // Forward to Tauri log plugin
        var invoke = getInvoke();
        if (invoke) {
          var message = Array.prototype.slice.call(arguments).map(function(arg) {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
          }).join(' ');
          invoke('plugin:log|log', { level: LOG_LEVELS[level], message: message }).catch(function() {});
        }
      };
    }

    forwardConsole('log', 'trace');
    forwardConsole('debug', 'debug');
    forwardConsole('info', 'info');
    forwardConsole('warn', 'warn');
    forwardConsole('error', 'error');
  })();
}

// ============================================================================
// Environment Variable Extraction and Keyring Integration
// ============================================================================

// Keyring service name for storing secrets
const KEYRING_SERVICE = 'habits';

/**
 * Extract all {{habits.env.*}} references from workflows
 */
function extractRequiredEnvVars(workflows) {
  const envVarPattern = /\{\{habits\.env\.([^}]+)\}\}/g;
  const requiredVars = new Set();
  
  function scanObject(obj) {
    if (typeof obj === 'string') {
      let match;
      while ((match = envVarPattern.exec(obj)) !== null) {
        requiredVars.add(match[1]);
      } 
      // Reset lastIndex for global regex
      envVarPattern.lastIndex = 0;
    } else if (Array.isArray(obj)) {
      obj.forEach(item => scanObject(item));
    } else if (obj && typeof obj === 'object') {
      Object.values(obj).forEach(value => scanObject(value));
    }
  }
  
  Object.values(workflows).forEach(workflow => scanObject(workflow));
  return Array.from(requiredVars);
}


/**
 * Find __TAURI__ object by checking current window and parent frames (up to 10 levels)
 * Returns the __TAURI__ object or null if not found
 */
function findTauri() {
  if (typeof window === 'undefined') return null;
  
  let win = window;
  for (let i = 0; i < 10; i++) {
    if (win.__TAURI__) {
      return win.__TAURI__;
    }
    if (!win.parent || win.parent === win) break;
    try {
      win = win.parent;
    } catch (e) {
      // Cross-origin access denied
      break;
    }
  }
  return null;
}

/**
 * Check if running in Tauri environment
 */
function isTauriEnvironment() {
  if(typeof window === 'undefined') return false;

  return !!findTauri();
}

/**
 * Initialize keyring - just checks if we're in Tauri environment
 * Returns true if keyring is available, false otherwise
 */
async function initKeyring() {
  const tauri = findTauri();
  if (!tauri) {
    console.log('[Keyring] Not in Tauri environment');
    return false;
  }
  
  // Keyring uses invoke - check if invoke is available
  if (!tauri.core || !tauri.core.invoke) {
    console.log('[Keyring] invoke not available in __TAURI__');
    return false;
  }
  
  console.log('[Keyring] Ready - using system keychain via invoke');
  return true;
}

/**
 * Get a secret from keyring
 */
async function getSecretFromKeyring(key) {
  try {
    const tauri = findTauri();
    if (!tauri || !tauri.core || !tauri.core.invoke) return null;
    
    const value = await tauri.core.invoke('plugin:keyring|get_password', {
      service: KEYRING_SERVICE,
      user: key
    });
    return value || null;
  } catch (err) {
    // Key doesn't exist or error
    return null;
  }
}

/**
 * Store a secret in keyring
 */
async function setSecretInKeyring(key, value) {
  try {
    const tauri = findTauri();
    if (!tauri || !tauri.core || !tauri.core.invoke) {
      console.error('[Keyring] Not available - no invoke');
      return false;
    }
    
    await tauri.core.invoke('plugin:keyring|set_password', {
      service: KEYRING_SERVICE,
      user: key,
      password: value,

    });
    return true;
  } catch (err) {
    console.error('[Keyring] Failed to store secret:', err);
    return false;
  }
}

/**
 * Prompt user to enter missing environment variables
 * Shows a dialog and stores values in keyring
 */
async function promptForMissingEnvVars(missingVars, keyringAvailable) {
  console.log('[EnvVars] Prompting for missing vars:', missingVars, 'keyring available:', keyringAvailable);
  
  // Always show the dialog in Tauri environment, even if keyring not available
  if (!isTauriEnvironment()) {
    console.error('Missing environment variables (not in Tauri):', missingVars.join(', '));
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  const filledVars = {};
  
  for (const varName of missingVars) {
    console.log('[EnvVars] Showing dialog for:', varName);
    // Use custom HTML input dialog
    const value = await showInputDialog(varName);
    console.log('[EnvVars] Got value for', varName, ':', value ? '(set)' : '(empty)');
    
    if (value && value.trim()) {
      filledVars[varName] = value.trim();
      
      // Store in keyring if available
      if (keyringAvailable) {
        const saved = await setSecretInKeyring(varName, value.trim());
        console.log('[EnvVars] Saved to keyring:', varName, saved);
      }
    }
  }
  
  return filledVars;
}

/**
 * Show a custom input dialog for entering env var value
 */
async function showInputDialog(varName) {
  return new Promise((resolve) => {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7); display: flex;
      align-items: center; justify-content: center; z-index: 10000;
    `;
    
    // Create dialog box
    const dialogBox = document.createElement('div');
    dialogBox.style.cssText = `
      background: #1a1a2e; border-radius: 12px; padding: 24px;
      max-width: 400px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;
    
    dialogBox.innerHTML = `
      <h3 style="color: #fff; margin: 0 0 8px 0; font-size: 18px;">Enter Configuration</h3>
      <p style="color: #888; margin: 0 0 16px 0; font-size: 14px;">
        Please enter a value for <strong style="color: #4ade80;">${varName}</strong>
      </p>
      <input type="text" id="env-input" placeholder="Enter value..." style="
        width: 100%; padding: 12px; border: 1px solid #333;
        border-radius: 8px; background: #0f0f1a; color: #fff;
        font-size: 14px; box-sizing: border-box; outline: none;
      " />
      <div style="display: flex; gap: 12px; margin-top: 16px;">
        <button id="env-cancel" style="
          flex: 1; padding: 12px; border: 1px solid #333;
          border-radius: 8px; background: transparent; color: #888;
          cursor: pointer; font-size: 14px;
        ">Cancel</button>
        <button id="env-submit" style="
          flex: 1; padding: 12px; border: none;
          border-radius: 8px; background: #4ade80; color: #000;
          cursor: pointer; font-size: 14px; font-weight: 600;
        ">Save</button>
      </div>
      <p style="color: #666; margin: 12px 0 0 0; font-size: 12px; text-align: center;">
        This value will be stored securely on your device.
      </p>
    `;
    
    overlay.appendChild(dialogBox);
    document.body.appendChild(overlay);
    
    const input = dialogBox.querySelector('#env-input');
    const submitBtn = dialogBox.querySelector('#env-submit');
    const cancelBtn = dialogBox.querySelector('#env-cancel');
    
    input.focus();
    
    const cleanup = () => {
      document.body.removeChild(overlay);
    };
    
    submitBtn.addEventListener('click', () => {
      cleanup();
      resolve(input.value);
    });
    
    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        cleanup();
        resolve(input.value);
      }
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(null);
      }
    });
  });
}

/**
 * Ensure all required environment variables are available
 * Checks: 1) envVars/process.env, 2) Keyring, 3) Prompts user
 */
async function ensureEnvVarsAvailable() {
  const requiredVars = extractRequiredEnvVars(workflowsMap);
  if (requiredVars.length === 0) return;
  
  console.log('Required environment variables:', requiredVars);
  
  // Initialize keyring if in Tauri
  const keyringAvailable = await initKeyring();
  
  const missingVars = [];
  
  for (const varName of requiredVars) {
    // Check if already in envVars or process.env
    if (envVars[varName] || (typeof process !== 'undefined' && process.env[varName])) {
      continue;
    }
    
    // Try to get from keyring
    if (keyringAvailable) {
      const storedValue = await getSecretFromKeyring(varName);
      if (storedValue) {
        // Inject into envVars and process.env
        envVars[varName] = storedValue;
        if (typeof process !== 'undefined' && process.env) {
          process.env[varName] = storedValue;
        }
        console.log(`Loaded ${varName} from secure storage`);
        continue;
      }
    }
    
    // Still missing
    missingVars.push(varName);
  }
  
  // Prompt for any still-missing vars
  if (missingVars.length > 0) {
    console.log('Missing environment variables:', missingVars);
    
    const filledVars = await promptForMissingEnvVars(missingVars, keyringAvailable);
    
    // Inject filled vars into envVars and process.env
    for (const [key, value] of Object.entries(filledVars)) {
      envVars[key] = value;
      if (typeof process !== 'undefined' && process.env) {
        process.env[key] = value;
      }
    }
    
    // Check if any are still missing after prompting
    const stillMissing = missingVars.filter(v => !filledVars[v]);
    if (stillMissing.length > 0) {
      console.warn('Some environment variables were not provided:', stillMissing);
    }
  }
}


// Global executor instance
let executor = null;
let initPromise = null;

/**
 * Initialize the executor (called lazily on first use)
 */
async function ensureInitialized() {
  if (executor && initPromise) {
    await initPromise;
    return executor;
  }
  
  // Ensure all required env vars are available before initializing
  await ensureEnvVarsAvailable();
  
  executor = new WorkflowExecutor();
  initPromise = executor.initFromData({
    config: workflowConfig,
    workflows: workflowsMap,
    env: envVars,
  });
  
  await initPromise;
  return executor;
}

/**
 * Execute a workflow by ID
 */
async function executeWorkflow(workflowId, input, options = {}) {
  const exec = await ensureInitialized();
  
  const result = await exec.executeWorkflow(workflowId, {
    initialContext: {
      habits: {
        input: input || {},
      },
    },
    onStream: options.onStream,
  });
  
  return result;
}

/**
 * Execute a workflow with streaming support
 */
async function executeWorkflowStreaming(workflowId, input, streamCallback) {
  return executeWorkflow(workflowId, input, { onStream: streamCallback });
}

/**
 * Get list of available workflows
 */
function getWorkflows() {
  return Object.keys(workflowsMap).map(id => ({
    id,
    name: workflowsMap[id].name || id,
    description: workflowsMap[id].description || '',
  }));
}

/**
 * Get a specific workflow by ID
 */
function getWorkflow(workflowId) {
  return workflowsMap[workflowId] || null;
}

/**
 * Get the bits registry (for debugging)
 */
function getBitsRegistry() {
  return Object.keys(bitsRegistry);
}

/**
 * Get list of required environment variables for all workflows
 */
function getRequiredEnvVars() {
  return extractRequiredEnvVars(workflowsMap);
}

/**
 * Clear a stored secret from keyring
 */
async function clearStoredSecret(key) {
  const keyringAvailable = await initKeyring();
  if (!keyringAvailable) return false;
  
  try {
    const tauri = findTauri();
    if (!tauri || !tauri.core || !tauri.core.invoke) return false;
    
    await tauri.core.invoke('plugin:keyring|delete_password', {
      service: KEYRING_SERVICE,
      name: key
    });
    return true;
  } catch (err) {
    console.warn('Failed to clear secret:', err);
    return false;
  }
}

/**
 * Clear all stored secrets from keyring
 */
async function clearAllStoredSecrets() {
  const keyringAvailable = await initKeyring();
  if (!keyringAvailable) return false;
  
  const requiredVars = extractRequiredEnvVars(workflowsMap);
  const tauri = findTauri();
  if (!tauri || !tauri.core || !tauri.core.invoke) return false;
  
  for (const varName of requiredVars) {
    try {
      await tauri.core.invoke('plugin:keyring|delete_password', {
        service: KEYRING_SERVICE,
        name: varName
      });
    } catch {
      // Ignore if key doesn't exist
    }
  }
  return true;
}

/**
 * Check which required env vars are missing (not in env or keyring)
 */
async function getMissingEnvVars() {
  const requiredVars = extractRequiredEnvVars(workflowsMap);
  const keyringAvailable = await initKeyring();
  const missing = [];
  
  for (const varName of requiredVars) {
    if (envVars[varName] || (typeof process !== 'undefined' && process.env[varName])) {
      continue;
    }
    
    if (keyringAvailable) {
      const storedValue = await getSecretFromKeyring(varName);
      if (storedValue) continue;
    }
    
    missing.push(varName);
  }
  
  return missing;
}

// Export public API
export const HabitsBundle = {
  executeWorkflow,
  executeWorkflowStreaming,
  getWorkflows,
  getWorkflow,
  getBitsRegistry,
  getRequiredEnvVars,
  getMissingEnvVars,
  clearStoredSecret,
  clearAllStoredSecrets,
  appName: '${appName}',
  version: '1.0.0',
};

// Also expose as global for IIFE bundles
if (typeof window !== 'undefined') {
  window.HabitsBundle = HabitsBundle;
}

// Self-test when run directly in Node.js
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  console.log('HabitsBundle loaded successfully');
  console.log('Available workflows:', getWorkflows());
  console.log('Bundled bits:', getBitsRegistry());
}