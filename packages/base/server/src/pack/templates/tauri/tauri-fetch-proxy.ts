/**
 * Tauri Fetch Proxy Script Template
 * 
 * Generates a script.js file that overrides the fetch function
 * to either:
 * 1. FULL mode: Execute workflows directly via HabitsBundle functions (no server)
 * 2. API mode: Proxy requests to a backend URL
 */

export type TauriFetchProxyMode = 'full' | 'api';

export interface TauriFetchProxyOptions {
  /** Execution mode: 'full' for direct function calls, 'api' for backend proxy */
  mode: TauriFetchProxyMode;
  /** Backend URL for API mode (ignored in full mode) */
  backendUrl?: string;
}

/**
 * Generate the fetch proxy script content
 * @param options Proxy configuration options
 */
export function getTauriFetchProxyScript(options: TauriFetchProxyOptions | string): string {
  // Support legacy string parameter (backendUrl only, API mode)
  const config: TauriFetchProxyOptions = typeof options === 'string' 
    ? { mode: 'api', backendUrl: options }
    : options;
  
  const { mode, backendUrl = '' } = config;
  
  return `/**
 * Habits Fetch Proxy
 * Auto-generated - intercepts fetch calls for habit execution
 * Mode: ${mode}
 * ${mode === 'api' ? `Backend URL: ${backendUrl}` : 'Direct function execution (no server)'}
 */
(function() {
  'use strict';

  // Configuration
  var MODE = '${mode}'; // 'full' or 'api'
  var BACKEND_URL = '${backendUrl}'.replace(/\\/$/, ''); // Remove trailing slash

  // Store original fetch
  var originalFetch = window.fetch;

  /**
   * Parse workflow ID from API path
   * Handles: /api/workflow-id, /api/workflow-id/execute, etc.
   */
  function parseApiPath(url) {
    var match = url.match(/^\\/api\\/([^\\/\\?]+)/);
    if (match) {
      return {
        isApiCall: true,
        workflowId: match[1],
        path: url,
        isStream: url.indexOf('stream=true') !== -1
      };
    }
    return { isApiCall: false, isStream: false };
  }

  /**
   * Check if URL should be proxied to backend (API mode only)
   */
  function shouldProxy(url) {
    if (!url) return false;
    
    // Already an absolute URL - don't proxy
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return false;
    }
    
    // Data URLs, blob URLs, etc - don't proxy
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return false;
    }
    
    // Relative paths should be proxied
    return true;
  }

  /**
   * Rewrite URL to include backend base (API mode)
   */
  function rewriteUrl(url) {
    if (!shouldProxy(url)) return url;
    
    // Ensure path starts with /
    var path = url.startsWith('/') ? url : '/' + url;
    
    return BACKEND_URL + path;
  }

  /**
   * Execute workflow directly via HabitsBundle (FULL mode)
   */
  async function executeWorkflowDirect(workflowId, method, body, isStream) {
    if (!window.HabitsBundle) {
      throw new Error('HabitsBundle not loaded. Include cortex-bundle.js before this script.');
    }

    // GET requests - return workflow info
    if (method === 'GET') {
      var workflows = window.HabitsBundle.getWorkflows();
      var workflow = workflows.find(function(w) { 
        return w.id === workflowId || w.name === workflowId; 
      });
      
      if (!workflow) {
        return new Response(JSON.stringify({ error: 'Workflow not found: ' + workflowId }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify(workflow), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // POST requests - execute workflow
    if (method === 'POST') {
      var input = body || {};
      console.log('[Habits] Executing workflow:', workflowId, isStream ? '(streaming)' : '');

      // Streaming mode - return NDJSON stream
      if (isStream && window.HabitsBundle.executeWorkflowStreaming) {
        var encoder = new TextEncoder();
        var executionId = 'exec-' + Date.now();
        
        var stream = new ReadableStream({
          start: function(controller) {
            window.HabitsBundle.executeWorkflowStreaming(workflowId, input, function(event) {
              var line = null;
              
              if (event.type === 'node_completed') {
                line = JSON.stringify({
                  executionId: event.executionId || executionId,
                  workflowId: event.workflowId || workflowId,
                  nodeId: event.nodeId,
                  nodeName: event.nodeName,
                  status: 'completed',
                  output: event.result,
                  duration: event.duration
                });
              } else if (event.type === 'execution_completed') {
                line = JSON.stringify({
                  executionId: event.executionId || executionId,
                  workflowId: event.workflowId || workflowId,
                  type: 'execution_completed',
                  status: 'completed',
                  output: event.output
                });
              } else if (event.type === 'execution_failed') {
                line = JSON.stringify({
                  executionId: event.executionId || executionId,
                  workflowId: event.workflowId || workflowId,
                  type: 'execution_failed',
                  status: 'failed',
                  error: event.error
                });
              }
              
              if (line) {
                controller.enqueue(encoder.encode(line + '\\n'));
              }
            }).then(function() {
              controller.close();
            }).catch(function(error) {
              controller.enqueue(encoder.encode(JSON.stringify({
                executionId: executionId,
                workflowId: workflowId,
                type: 'execution_failed',
                status: 'failed',
                error: error.message
              }) + '\\n'));
              controller.close();
            });
          }
        });

        return new Response(stream, {
          status: 200,
          headers: { 'Content-Type': 'application/x-ndjson' }
        });
      }

      // Non-streaming mode
      try {
        var results = await window.HabitsBundle.executeWorkflow(workflowId, input);
        
        return new Response(JSON.stringify({ 
          success: true,
          workflowId: workflowId,
          results: results 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('[Habits] Workflow execution error:', error);
        return new Response(JSON.stringify({ 
          error: error.message || 'Workflow execution failed',
          workflowId: workflowId
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Other methods not supported
    return new Response(JSON.stringify({ error: 'Method not supported: ' + method }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Override global fetch
   */
  window.fetch = async function(input, init) {
    var url;
    var method = (init && init.method) || 'GET';
    var body = null;
    
    // Parse URL from input
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof Request) {
      url = input.url;
      method = input.method || method;
    }

    // Parse body if present
    if (init && init.body) {
      try {
        body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
      } catch (e) {
        body = init.body;
      }
    }

    // Check if this is an API call
    var apiInfo = parseApiPath(url);
    
    if (apiInfo.isApiCall) {
      // FULL mode: Execute workflow directly as function
      if (MODE === 'full') {
        console.log('[Habits] Direct execution:', method, url, apiInfo.isStream ? '(streaming)' : '');
        return executeWorkflowDirect(apiInfo.workflowId, method.toUpperCase(), body, apiInfo.isStream);
      }
      
      // API mode: Proxy to backend
      if (MODE === 'api' && BACKEND_URL) {
        var newUrl = rewriteUrl(url);
        console.log('[Habits] Proxying API:', url, '->', newUrl);
        
        if (typeof input === 'string') {
          return originalFetch.call(this, newUrl, init);
        } else {
          return originalFetch.call(this, new Request(newUrl, input), init);
        }
      }
    }

    // Non-API calls: proxy if in API mode, otherwise pass through
    if (MODE === 'api' && shouldProxy(url)) {
      var newUrl = rewriteUrl(url);
      if (newUrl !== url) {
        console.log('[Habits] Proxying:', url, '->', newUrl);
        if (typeof input === 'string') {
          return originalFetch.call(this, newUrl, init);
        } else {
          return originalFetch.call(this, new Request(newUrl, input), init);
        }
      }
    }
    
    // Pass through unchanged
    return originalFetch.call(this, input, init);
  };

  // Also override XMLHttpRequest for compatibility (API mode only)
  if (MODE === 'api') {
    var originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
      var newUrl = rewriteUrl(url);
      if (newUrl !== url) {
        console.log('[Habits] Proxying XHR:', url, '->', newUrl);
      }
      return originalXhrOpen.call(this, method, newUrl, async !== false, user, password);
    };
  }

  // Log initialization
  if (MODE === 'full') {
    console.log('[Habits] Fetch proxy initialized (FULL mode - direct execution)');
    if (window.HabitsBundle) {
      console.log('[Habits] Available workflows:', window.HabitsBundle.getWorkflows().map(function(w) { return w.id || w.name; }));
    }
  } else {
    console.log('[Habits] Fetch proxy initialized (API mode). Backend:', BACKEND_URL);
  }
})();
`;
}

