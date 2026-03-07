/**
 * API Proxy Script Template
 * 
 * This script intercepts fetch and XMLHttpRequest calls and redirects
 * API requests to the configured backend URL. Used by both Electron
 * and Cordova/Capacitor apps for frontend-only deployments.
 */

/**
 * Generate the API proxy script with the given backend URL
 */
export function getApiProxyScript(backendUrl: string): string {
  return `
// Habits API Proxy - Auto-generated
// Backend URL: ${backendUrl}
(function() {
  'use strict';

  // Configuration - can be overridden at runtime
  var BACKEND_URL = '${backendUrl}';
  var API_PATTERNS = ['/api', '/execute', '/misc', '/workflows'];

  // Try to load runtime config
  function loadRuntimeConfig() {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'config.json', false); // Synchronous for startup
      xhr.send();
      if (xhr.status === 200) {
        var config = JSON.parse(xhr.responseText);
        if (config.backendUrl) {
          BACKEND_URL = config.backendUrl;
          console.log('[Habits] Backend URL from config:', BACKEND_URL);
        }
      }
    } catch (e) {
      // Config file not found or invalid, use default
    }
  }

  // Check if URL should be proxied
  function shouldProxy(url) {
    if (!url) return false;
    var urlLower = url.toLowerCase();
    
    // Skip if already absolute URL to backend
    if (urlLower.startsWith(BACKEND_URL.toLowerCase())) return false;
    
    // Skip if it's an absolute URL to a different domain
    if (urlLower.startsWith('http://') || urlLower.startsWith('https://')) {
      return false;
    }
    
    // Check if URL matches API patterns
    for (var i = 0; i < API_PATTERNS.length; i++) {
      if (urlLower.startsWith(API_PATTERNS[i]) || urlLower.startsWith('/' + API_PATTERNS[i])) {
        return true;
      }
    }
    
    return false;
  }

  // Rewrite URL to point to backend
  function rewriteUrl(url) {
    if (!shouldProxy(url)) return url;
    
    // Remove leading slash if present
    var path = url.startsWith('/') ? url : '/' + url;
    
    // Ensure backend URL doesn't have trailing slash
    var backend = BACKEND_URL.replace(/\\/$/, '');
    
    return backend + path;
  }

  // Store original implementations
  var originalFetch = window.fetch;
  var originalXhrOpen = XMLHttpRequest.prototype.open;

  // Override fetch
  window.fetch = function(input, init) {
    var url = typeof input === 'string' ? input : input.url;
    var newUrl = rewriteUrl(url);
    
    if (newUrl !== url) {
      console.log('[Habits] Proxying fetch:', url, '->', newUrl);
      if (typeof input === 'string') {
        input = newUrl;
      } else {
        input = new Request(newUrl, input);
      }
    }
    
    return originalFetch.call(this, input, init);
  };

  // Override XMLHttpRequest.open
  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    var newUrl = rewriteUrl(url);
    
    if (newUrl !== url) {
      console.log('[Habits] Proxying XHR:', url, '->', newUrl);
    }
    
    return originalXhrOpen.call(this, method, newUrl, async !== false, user, password);
  };

  // Load config on startup
  loadRuntimeConfig();
  
  console.log('[Habits] API Proxy initialized. Backend:', BACKEND_URL);
})();
`.trim();
}
