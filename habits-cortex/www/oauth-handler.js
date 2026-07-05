/**
 * Habits Cortex - Tauri OAuth Handler
 *
 * Handles OAuth 2 authentication flows for bits (Google Sheets, Google Drive, etc.)
 * in the native Tauri app (desktop + mobile).
 *
 * Flow:
 *   1. startOAuthFlow() opens the system browser with the provider auth URL.
 *      redirect_uri = https://habits.codenteam.com/oauth.html
 *   2. After the user authorizes, the provider redirects to oauth.html.
 *   3a. Mobile (iOS/Android): App Links intercept the HTTPS URL and Tauri fires
 *       onOpenUrl with the full https://habits.codenteam.com/oauth.html?code=...&state=...
 *   3b. Desktop: oauth.html redirects to habits-cortex://oauth?code=...&state=...
 *       and Tauri fires onOpenUrl with the custom scheme URL.
 *   4. handleDeepLink() parses code+state, exchanges the code for tokens via PKCE,
 *      and resolves the pending promise started in step 1.
 *
 * Exposes: window.HabitsOAuth
 */
(function () {
  'use strict';

  // Intermediate redirect page hosted at habits.codenteam.com.
  // This is the redirect_uri registered with OAuth providers.
  // Must be a valid HTTPS URL (custom schemes are rejected by Google, LinkedIn, etc.).
  var OAUTH_REDIRECT_URI = 'https://habits.codenteam.com/oauth.html';

  // Custom URL scheme for desktop OAuth callbacks (oauth.html -> {scheme}://oauth).
  // Production: habits-cortex. Dev app (com.codenteam-oss.habits.dev): habits-cortex-dev.
  var URL_SCHEME = 'habits-cortex';

  // Timeout for the entire OAuth flow (5 minutes).
  var OAUTH_TIMEOUT = 300000;

  // Pending OAuth flows keyed by state parameter.
  var pendingFlows = new Map();

  // ============================================================================
  // Deep Link Listener
  // ============================================================================

  /**
   * Initialize the deep link listener.
   * Called once on page load.
   */
  async function initOAuthHandler() {
    try {
      // Use __TAURI__ event system directly - dynamic imports don't resolve bare specifiers
      // in the Tauri webview context.
      var tauri = window.__TAURI__;
      if (!tauri || !tauri.core || !tauri.core.invoke) {
        console.warn('[OAuth] Tauri not available, deep link handler not initialized');
        return;
      }
      try {
        var appConfig = await tauri.core.invoke('get_app_config');
        if (appConfig && appConfig.urlScheme) {
          URL_SCHEME = appConfig.urlScheme;
          console.log('[OAuth] URL scheme:', URL_SCHEME);
        }
      } catch (configErr) {
        console.warn('[OAuth] Could not read app config, using default scheme:', configErr);
      }
      // Subscribe to the deep-link plugin's "new-url" event via Tauri event system.
      // The deep-link plugin emits "deep-link://new-url" events on incoming links.
      if (tauri.event && tauri.event.listen) {
        await tauri.event.listen('deep-link://new-url', function (event) {
          var urls = event.payload;
          if (Array.isArray(urls)) {
            urls.forEach(function (url) { handleDeepLink(url); });
          } else if (typeof urls === 'string') {
            handleDeepLink(urls);
          }
        });
        console.log('[OAuth] Deep link handler initialized via event listener');
      } else {
        console.warn('[OAuth] Tauri event system not available');
      }
    } catch (err) {
      console.warn('[OAuth] Failed to initialize deep link handler:', err);
    }
  }

  /**
   * Handle an incoming deep link URL.
   * Works for both:
   *   - habits-cortex://oauth?code=...&state=...        (production desktop)
   *   - habits-cortex-dev://oauth?code=...&state=...    (dev desktop, via oauth.html shortcut)
   *   - habits-cortex-build-debug://oauth?code=...&state=...  (debug desktop build)
   *   - https://habits.codenteam.com/oauth.html?code=...&state=...  (mobile App Links)
   */
  function handleDeepLink(url) {
    console.log('[OAuth] Received deep link:', url);

    var params = parseCallbackUrl(url);

    if (!params.state) {
      // Not an OAuth callback — ignore silently.
      return;
    }

    var flow = pendingFlows.get(params.state);
    if (!flow) {
      console.warn('[OAuth] No pending flow for state:', params.state);
      return;
    }

    if (flow.timeoutId) {
      clearTimeout(flow.timeoutId);
    }
    pendingFlows.delete(params.state);

    if (params.error) {
      flow.reject(new Error(
        'OAuth error: ' + params.error +
        (params.errorDescription ? ' - ' + params.errorDescription : '')
      ));
    } else if (params.code) {
      // Authorization code flow: exchange code for tokens.
      exchangeCodeForTokens(params.code, params.state, flow.config)
        .then(flow.resolve)
        .catch(flow.reject);
    } else if (params.accessToken) {
      // Implicit flow: tokens delivered directly in the URL.
      flow.resolve({
        bitId: flow.bitId,
        tokens: {
          accessToken: params.accessToken,
          refreshToken: params.refreshToken,
          tokenType: params.tokenType || 'Bearer',
          expiresAt: params.expiresIn ? Date.now() + params.expiresIn * 1000 : undefined,
        },
      });
    } else {
      flow.reject(new Error('OAuth callback missing code or access_token'));
    }
  }

  // ============================================================================
  // URL Parsing
  // ============================================================================

  /**
   * Parse an OAuth callback URL.
   * Supports query parameters (?code=...) and hash fragments (#access_token=...).
   */
  function parseCallbackUrl(callbackUrl) {
    var result = {};
    try {
      var url = new URL(callbackUrl);

      var q = url.searchParams;
      if (q.has('code'))              result.code              = q.get('code');
      if (q.has('state'))             result.state             = q.get('state');
      if (q.has('error'))             result.error             = q.get('error');
      if (q.has('error_description')) result.errorDescription  = q.get('error_description');

      if (url.hash) {
        var h = new URLSearchParams(url.hash.slice(1));
        if (h.has('access_token'))  result.accessToken  = h.get('access_token');
        if (h.has('refresh_token')) result.refreshToken = h.get('refresh_token');
        if (h.has('token_type'))    result.tokenType    = h.get('token_type');
        if (h.has('expires_in'))    result.expiresIn    = parseInt(h.get('expires_in'), 10);
        if (h.has('state')  && !result.state)  result.state  = h.get('state');
        if (h.has('error')  && !result.error)  result.error  = h.get('error');
      }
    } catch (e) {
      console.error('[OAuth] Failed to parse callback URL:', e);
    }
    return result;
  }

  // ============================================================================
  // Token Exchange
  // ============================================================================

  /**
   * Resolve fetch for outbound HTTP (e.g. OAuth token exchange).
   * Uses Tauri HTTP plugin when available — same backend as habits-fetch-proxy
   * pass-through — so requests bypass webview CORS restrictions.
   */
  function getProxiedFetch() {
    var w = window;
    while (w) {
      try {
        var tauri = w.__TAURI__;
        if (tauri && tauri.http && typeof tauri.http.fetch === 'function') {
          return function (url, init) {
            return tauri.http.fetch(url, init);
          };
        }
        if (!w.parent || w.parent === w) break;
        w = w.parent;
      } catch (e) {
        break;
      }
    }
    return window.fetch.bind(window);
  }

  /**
   * Exchange an authorization code for tokens via PKCE.
   */
  async function exchangeCodeForTokens(code, state, config) {
    var body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
    });

    if (config.codeVerifier) {
      body.set('code_verifier', config.codeVerifier);
    }
    if (config.clientSecret) {
      body.set('client_secret', config.clientSecret);
    }

    var proxiedFetch = getProxiedFetch();
    var response = await proxiedFetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
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
      },
    };
  }

  // ============================================================================
  // PKCE Helpers
  // ============================================================================

  async function generatePkce() {
    var randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    var codeVerifier = base64UrlEncode(randomBytes).slice(0, 43);

    var encoder = new TextEncoder();
    var hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(codeVerifier));
    var codeChallenge = base64UrlEncode(new Uint8Array(hashBuffer));

    return { codeVerifier: codeVerifier, codeChallenge: codeChallenge };
  }

  function base64UrlEncode(data) {
    var binary = '';
    for (var i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function generateState() {
    var randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Start an OAuth2 flow for a bit.
   *
   * @param {string} bitId - e.g. "bit-google-drive"
   * @param {Object} config
   *   config.clientId          {string}   required
   *   config.clientSecret      {string}   optional (some providers need it for token exchange)
   *   config.authorizationUrl  {string}   required
   *   config.tokenUrl          {string}   required
   *   config.scopes            {string[]} required
   *   config.extraAuthParams   {Object}   optional (e.g. { access_type: 'offline', prompt: 'consent' })
   *   config.pkce              {boolean}  default: true
   * @returns {Promise<{ bitId: string, tokens: { accessToken, refreshToken, tokenType, expiresAt } }>}
   */
  async function startOAuthFlow(bitId, config) {
    if (!config.clientId) {
      throw new Error('[OAuth] clientId is required to start OAuth flow for: ' + bitId);
    }

    var scopes = (config.scopes || []).filter(Boolean);
    if (!scopes.length) {
      throw new Error('[OAuth] scopes are required to start OAuth flow for: ' + bitId);
    }

    var state = generateState();
    var pkce = config.pkce !== false ? await generatePkce() : {};

    var params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: OAUTH_REDIRECT_URI,
      scope: scopes.join(' '),
      state: state,
    });

    if (pkce.codeChallenge) {
      params.set('code_challenge', pkce.codeChallenge);
      params.set('code_challenge_method', 'S256');
    }

    if (config.extraAuthParams) {
      Object.keys(config.extraAuthParams).forEach(function (key) {
        params.set(key, config.extraAuthParams[key]);
      });
    }

    var authUrl = config.authorizationUrl + '?' + params.toString();

    // Register the pending flow before opening the browser.
    var flowPromise = new Promise(function (resolve, reject) {
      var timeoutId = setTimeout(function () {
        pendingFlows.delete(state);
        reject(new Error('OAuth flow timed out after ' + (OAUTH_TIMEOUT / 1000) + ' seconds'));
      }, OAUTH_TIMEOUT);

      pendingFlows.set(state, {
        bitId: bitId,
        authUrl: authUrl,
        config: {
          bitId: bitId,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          tokenUrl: config.tokenUrl,
          redirectUri: OAUTH_REDIRECT_URI,
          codeVerifier: pkce.codeVerifier,
        },
        resolve: resolve,
        reject: reject,
        timeoutId: timeoutId,
        createdAt: Date.now(),
      });
    });

    // Open the authorization URL in the system browser.
    // Use __TAURI__ invoke directly - dynamic imports of Tauri plugins don't work
    // when running inside an iframe (habits are loaded in iframes by runner.js).
    try {
      var tauri = window.__TAURI__ || (window.parent && window.parent.__TAURI__) || (window.parent && window.parent.parent && window.parent.parent.__TAURI__);
      if (!tauri || !tauri.core || !tauri.core.invoke) {
        throw new Error('Tauri invoke not available');
      }
      await tauri.core.invoke('plugin:opener|open_url', { url: authUrl });
      console.log('[OAuth] Opened auth URL for:', bitId);
    } catch (err) {
      pendingFlows.delete(state);
      throw new Error('Failed to open authorization URL: ' + (err.message || err));
    }

    return flowPromise;
  }

  function hasPendingFlow(bitId) {
    for (var flow of pendingFlows.values()) {
      if (flow.bitId === bitId) return true;
    }
    return false;
  }

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

  function getPendingOAuthFlows() {
    var flows = [];
    for (var entry of pendingFlows.entries()) {
      var state = entry[0];
      var flow = entry[1];
      flows.push({
        state: state,
        bitId: flow.bitId,
        authUrl: flow.authUrl || null,
      });
    }
    return flows;
  }

  function deliverOAuthDeepLink(url) {
    handleDeepLink(url);
  }

  function getActiveUrlScheme() {
    return URL_SCHEME;
  }

  // ============================================================================
  // Bootstrap
  // ============================================================================

  if (typeof window !== 'undefined') {
    initOAuthHandler();

    window.HabitsOAuth = {
      startOAuthFlow: startOAuthFlow,
      hasPendingFlow: hasPendingFlow,
      cancelFlowsForBit: cancelFlowsForBit,
      parseCallbackUrl: parseCallbackUrl,
      getPendingOAuthFlows: getPendingOAuthFlows,
      deliverOAuthDeepLink: deliverOAuthDeepLink,
      getActiveUrlScheme: getActiveUrlScheme,
      get OAUTH_REDIRECT_URI() { return OAUTH_REDIRECT_URI; },
      get URL_SCHEME() { return URL_SCHEME; },
    };

    console.log('[OAuth] Habits OAuth handler loaded');
  }
})();
