/**
 * Tauri OAuth Handler Script Template
 * 
 * Generates JavaScript code for handling OAuth authentication flows in Tauri apps.
 * Uses:
 * - @tauri-apps/plugin-opener to open authorization URLs in the system browser
 * - @tauri-apps/plugin-deep-link to receive OAuth callbacks via deep links
 * 
 * This script is injected into Tauri apps that use OAuth bits.
 */

export interface TauriOAuthHandlerOptions {
  /** Custom URL scheme for deep links (e.g., "myapp" for myapp://oauth/callback) */
  scheme: string;
  /** Timeout in milliseconds for OAuth flow (default: 5 minutes) */
  timeout?: number;
}

/**
 * Generate the OAuth handler script content for Tauri apps
 */
export function getTauriOAuthHandlerScript(options: TauriOAuthHandlerOptions): string {
  const { scheme, timeout = 300000 } = options;

  return `/**
 * Habits Tauri OAuth Handler
 * Auto-generated - handles OAuth authentication in Tauri desktop/mobile apps
 * 
 * URL Scheme: ${scheme}
 * Callback URL: ${scheme}://oauth/{bitId}/callback
 */
(function() {
  'use strict';

  // Configuration
  var URL_SCHEME = '${scheme}';
  var OAUTH_TIMEOUT = ${timeout};

  // Pending OAuth flows (keyed by state)
  var pendingFlows = new Map();

  /**
   * Initialize OAuth handler
   * Sets up deep link listener for OAuth callbacks
   */
  async function initOAuthHandler() {
    try {
      // Import Tauri deep-link plugin
      var deepLink = await import('@tauri-apps/plugin-deep-link');
      
      // Listen for deep link events
      await deepLink.onOpenUrl(function(urls) {
        urls.forEach(function(url) {
          handleDeepLink(url);
        });
      });
      
      console.log('[OAuth] Deep link handler initialized for scheme:', URL_SCHEME);
    } catch (err) {
      console.warn('[OAuth] Failed to initialize deep link handler:', err);
    }
  }

  /**
   * Handle incoming deep link URL
   */
  function handleDeepLink(url) {
    console.log('[OAuth] Received deep link:', url);
    
    // Parse the callback URL
    var params = parseCallbackUrl(url);
    
    if (!params.state) {
      console.warn('[OAuth] Deep link missing state parameter:', url);
      return;
    }
    
    // Find the pending flow for this state
    var flow = pendingFlows.get(params.state);
    if (!flow) {
      console.warn('[OAuth] No pending flow for state:', params.state);
      return;
    }
    
    // Clear the timeout
    if (flow.timeoutId) {
      clearTimeout(flow.timeoutId);
    }
    
    // Remove from pending flows
    pendingFlows.delete(params.state);
    
    // Resolve or reject the pending promise
    if (params.error) {
      flow.reject(new Error('OAuth error: ' + params.error + (params.errorDescription ? ' - ' + params.errorDescription : '')));
    } else if (params.code) {
      // Authorization code flow - exchange code for tokens
      exchangeCodeForTokens(params.code, params.state, flow.config)
        .then(flow.resolve)
        .catch(flow.reject);
    } else if (params.accessToken) {
      // Implicit flow - tokens directly in URL
      flow.resolve({
        bitId: flow.bitId,
        tokens: {
          accessToken: params.accessToken,
          refreshToken: params.refreshToken,
          tokenType: params.tokenType || 'Bearer',
          expiresAt: params.expiresIn ? Date.now() + params.expiresIn * 1000 : undefined,
        }
      });
    } else {
      flow.reject(new Error('OAuth callback missing code or access_token'));
    }
  }

  /**
   * Parse OAuth callback URL parameters
   * Supports both query params (?code=...) and hash fragments (#access_token=...)
   */
  function parseCallbackUrl(callbackUrl) {
    var result = {};
    
    try {
      var url = new URL(callbackUrl);
      
      // Try query parameters first
      var queryParams = url.searchParams;
      if (queryParams.has('code')) result.code = queryParams.get('code');
      if (queryParams.has('state')) result.state = queryParams.get('state');
      if (queryParams.has('error')) result.error = queryParams.get('error');
      if (queryParams.has('error_description')) result.errorDescription = queryParams.get('error_description');
      
      // Try hash fragment (for implicit flow)
      if (url.hash) {
        var hashParams = new URLSearchParams(url.hash.slice(1));
        if (hashParams.has('access_token')) result.accessToken = hashParams.get('access_token');
        if (hashParams.has('refresh_token')) result.refreshToken = hashParams.get('refresh_token');
        if (hashParams.has('token_type')) result.tokenType = hashParams.get('token_type');
        if (hashParams.has('expires_in')) result.expiresIn = parseInt(hashParams.get('expires_in'), 10);
        if (hashParams.has('state') && !result.state) result.state = hashParams.get('state');
        if (hashParams.has('error') && !result.error) result.error = hashParams.get('error');
      }
    } catch (e) {
      console.error('[OAuth] Failed to parse callback URL:', e);
    }
    
    return result;
  }

  /**
   * Exchange authorization code for tokens
   */
  async function exchangeCodeForTokens(code, state, config) {
    var params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
    });
    
    if (config.codeVerifier) {
      params.set('code_verifier', config.codeVerifier);
    }
    
    if (config.clientSecret) {
      params.set('client_secret', config.clientSecret);
    }
    
    var response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      var errorText = await response.text();
      throw new Error('Token exchange failed: ' + response.status + ' - ' + errorText);
    }
    
    var data = await response.json();
    
    return {
      bitId: config.bitId,
      tokens: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type || 'Bearer',
        expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
        scope: data.scope,
      }
    };
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  async function generatePkce() {
    // Generate 32 random bytes for code verifier
    var randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    var codeVerifier = base64UrlEncode(randomBytes).slice(0, 43);
    
    // Generate code challenge (SHA-256 of verifier)
    var encoder = new TextEncoder();
    var data = encoder.encode(codeVerifier);
    var hashBuffer = await crypto.subtle.digest('SHA-256', data);
    var codeChallenge = base64UrlEncode(new Uint8Array(hashBuffer));
    
    return { codeVerifier: codeVerifier, codeChallenge: codeChallenge };
  }

  /**
   * Base64URL encode a Uint8Array
   */
  function base64UrlEncode(data) {
    var binary = '';
    for (var i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary)
      .replace(/\\+/g, '-')
      .replace(/\\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Generate random state parameter
   */
  function generateState() {
    var randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  /**
   * Start OAuth flow for a bit
   * 
   * @param {string} bitId - Bit identifier (e.g., "bit-google-drive")
   * @param {Object} config - OAuth configuration
   * @returns {Promise<Object>} Token result
   */
  async function startOAuthFlow(bitId, config) {
    // Generate state and PKCE codes
    var state = generateState();
    var pkce = config.pkce !== false ? await generatePkce() : {};
    var redirectUri = URL_SCHEME + '://oauth/' + bitId + '/callback';
    
    // Build authorization URL
    var params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: redirectUri,
      scope: config.scopes.join(' '),
      state: state,
    });
    
    if (pkce.codeChallenge) {
      params.set('code_challenge', pkce.codeChallenge);
      params.set('code_challenge_method', 'S256');
    }
    
    if (config.extraAuthParams) {
      Object.keys(config.extraAuthParams).forEach(function(key) {
        params.set(key, config.extraAuthParams[key]);
      });
    }
    
    var authUrl = config.authorizationUrl + '?' + params.toString();
    
    // Create pending flow promise
    var flowPromise = new Promise(function(resolve, reject) {
      var timeoutId = setTimeout(function() {
        pendingFlows.delete(state);
        reject(new Error('OAuth flow timed out after ' + (OAUTH_TIMEOUT / 1000) + ' seconds'));
      }, OAUTH_TIMEOUT);
      
      pendingFlows.set(state, {
        bitId: bitId,
        config: {
          bitId: bitId,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          tokenUrl: config.tokenUrl,
          redirectUri: redirectUri,
          codeVerifier: pkce.codeVerifier,
        },
        resolve: resolve,
        reject: reject,
        timeoutId: timeoutId,
        createdAt: Date.now(),
      });
    });
    
    // Open authorization URL in system browser
    try {
      var opener = await import('@tauri-apps/plugin-opener');
      await opener.openUrl(authUrl);
      console.log('[OAuth] Opened auth URL for', bitId);
    } catch (err) {
      pendingFlows.delete(state);
      throw new Error('Failed to open authorization URL: ' + err.message);
    }
    
    return flowPromise;
  }

  /**
   * Check if a flow is pending for a bit
   */
  function hasPendingFlow(bitId) {
    for (var flow of pendingFlows.values()) {
      if (flow.bitId === bitId) return true;
    }
    return false;
  }

  /**
   * Cancel all pending flows for a bit
   */
  function cancelFlowsForBit(bitId) {
    var cancelled = 0;
    for (var entry of pendingFlows.entries()) {
      var state = entry[0];
      var flow = entry[1];
      if (flow.bitId === bitId) {
        if (flow.timeoutId) clearTimeout(flow.timeoutId);
        flow.reject(new Error('OAuth flow cancelled'));
        pendingFlows.delete(state);
        cancelled++;
      }
    }
    return cancelled;
  }

  // Initialize on load
  if (typeof window !== 'undefined') {
    initOAuthHandler();
  }

  // Export to window for use by app code
  window.HabitsOAuth = {
    startOAuthFlow: startOAuthFlow,
    hasPendingFlow: hasPendingFlow,
    cancelFlowsForBit: cancelFlowsForBit,
    parseCallbackUrl: parseCallbackUrl,
    URL_SCHEME: URL_SCHEME,
  };

  console.log('[OAuth] Habits OAuth handler loaded (scheme: ' + URL_SCHEME + ')');
})();
`;
}

/**
 * Generate OAuth handler for inclusion in Tauri app www directory
 */
export function generateTauriOAuthHandler(options: TauriOAuthHandlerOptions): { filename: string; content: string } {
  return {
    filename: 'oauth-handler.js',
    content: getTauriOAuthHandlerScript(options),
  };
}
