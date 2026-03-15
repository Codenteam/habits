import { WorkflowExecutor, registerBundledModule } from '@ha-bits/cortex-core';

// Registry of bundled bits modules
const bitsRegistry = {};

////<bits_imports/>

////<bits_registration/>



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

// Export public API
export const HabitsBundle = {
  executeWorkflow,
  executeWorkflowStreaming,
  getWorkflows,
  getWorkflow,
  getBitsRegistry,
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