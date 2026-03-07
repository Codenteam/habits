/**
 * Tauri Fetch Proxy Script Template
 * 
 * Generates a script.js file that overrides the fetch function
 * to prepend the backend URL as the base for relative paths.
 */

/**
 * Generate the fetch proxy script content
 * @param backendUrl The backend URL to use as base for API calls
 */
export function getTauriFetchProxyScript(backendUrl: string): string {
  return `/**
 * Habits Fetch Proxy
 * Auto-generated - overrides fetch to proxy API requests to backend
 * Backend URL: ${backendUrl}
 */
(function() {
  'use strict';

  // Backend URL from config
  var BACKEND_URL = '${backendUrl}'.replace(/\\/$/, ''); // Remove trailing slash

  // Store original fetch
  var originalFetch = window.fetch;

  /**
   * Check if URL should be proxied to backend
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
   * Rewrite URL to include backend base
   */
  function rewriteUrl(url) {
    if (!shouldProxy(url)) return url;
    
    // Ensure path starts with /
    var path = url.startsWith('/') ? url : '/' + url;
    
    return BACKEND_URL + path;
  }

  /**
   * Override global fetch
   */
  window.fetch = function(input, init) {
    var url;
    var newInput = input;
    
    if (typeof input === 'string') {
      url = input;
      var newUrl = rewriteUrl(url);
      if (newUrl !== url) {
        console.log('[Habits] Proxying:', url, '->', newUrl);
        newInput = newUrl;
      }
    } else if (input instanceof Request) {
      url = input.url;
      var newUrl = rewriteUrl(url);
      if (newUrl !== url) {
        console.log('[Habits] Proxying:', url, '->', newUrl);
        newInput = new Request(newUrl, input);
      }
    }
    
    return originalFetch.call(this, newInput, init);
  };

  // Also override XMLHttpRequest for compatibility
  var originalXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    var newUrl = rewriteUrl(url);
    if (newUrl !== url) {
      console.log('[Habits] Proxying XHR:', url, '->', newUrl);
    }
    return originalXhrOpen.call(this, method, newUrl, async !== false, user, password);
  };

  console.log('[Habits] Fetch proxy initialized. Backend:', BACKEND_URL);
})();
`;
}
