/**
 * OAuthFlowManager - Platform-Agnostic OAuth2 Flow Manager
 * 
 * Handles OAuth2 Authorization Code Flow with optional PKCE for secure authentication.
 * This module is platform-agnostic (works in Node.js, browsers, and Tauri).
 * 
 * Features:
 * - PKCE (Proof Key for Code Exchange) support
 * - Builds authorization URLs
 * - Exchanges authorization codes for tokens
 * - Parses callback URLs (both fragment and query params)
 * - Manages pending OAuth flows in memory
 * 
 * For server environments, use OAuthCallbackServer which wraps this manager
 * and provides Express routing.
 */

import { OAuth2Config, OAuth2State, OAuth2TokenSet } from './oauth2Types';
import { oauthTokenStore } from './oauthTokenStore';
import { ILogger, LoggerFactory } from '@ha-bits/core/logger';

/**
 * Result of parsing an OAuth callback URL
 */
export interface OAuthCallbackParams {
  /** Authorization code (if present) */
  code?: string;
  /** State parameter for CSRF protection */
  state?: string;
  /** Access token (implicit flow or hash fragment) */
  accessToken?: string;
  /** Refresh token (if provided) */
  refreshToken?: string;
  /** Token expiration in seconds */
  expiresIn?: number;
  /** Token type */
  tokenType?: string;
  /** Error code if authorization failed */
  error?: string;
  /** Human-readable error description */
  errorDescription?: string;
}

/**
 * Result of initiating an OAuth flow
 */
export interface InitiateFlowResult {
  /** Authorization URL to redirect user to */
  authUrl: string;
  /** State parameter used for CSRF protection */
  state: string;
  /** Redirect URI that will receive the callback */
  redirectUri: string;
}

/**
 * Result of exchanging an authorization code
 */
export interface ExchangeResult {
  /** Bit ID the tokens are for */
  bitId: string;
  /** Token set received from the provider */
  tokens: OAuth2TokenSet;
}

/**
 * Options for creating an OAuthFlowManager
 */
export interface OAuthFlowManagerOptions {
  /**
   * Base callback URL for OAuth redirects.
   * For server mode: "http://localhost:3000/oauth"
   * For Tauri mode: "myapp://oauth" (custom URL scheme)
   */
  callbackBaseUrl: string;
  /**
   * Custom logger instance (optional)
   */
  logger?: ILogger;
}

/**
 * Platform-agnostic OAuth2 Flow Manager
 * 
 * @example Server mode:
 * ```typescript
 * const manager = new OAuthFlowManager({ callbackBaseUrl: 'http://localhost:3000/oauth' });
 * const { authUrl } = manager.initiateFlow('bit-google-drive', config);
 * // User visits authUrl, server receives callback at /oauth/bit-google-drive/callback
 * const result = await manager.exchangeCode(state, code);
 * ```
 * 
 * @example Tauri mode:
 * ```typescript
 * const manager = new OAuthFlowManager({ callbackBaseUrl: 'myapp://oauth' });
 * const { authUrl } = manager.initiateFlow('bit-dropbox', config);
 * // Open authUrl with Tauri opener, listen for deep link callback
 * const params = manager.parseCallbackUrl('myapp://oauth/callback?code=...&state=...');
 * const result = await manager.exchangeCode(params.state!, params.code!);
 * ```
 */
export class OAuthFlowManager {
  private pendingFlows: Map<string, OAuth2State> = new Map();
  private logger: ILogger;
  private callbackBaseUrl: string;

  constructor(options: OAuthFlowManagerOptions) {
    this.callbackBaseUrl = options.callbackBaseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.logger = options.logger ?? LoggerFactory.create(undefined, undefined, { bitName: 'OAuthFlowManager' });
  }

  /**
   * Generate a cryptographically secure random string for PKCE code verifier.
   * RFC 7636 requires 43-128 characters, URL-safe.
   * 
   * Uses Web Crypto API for platform compatibility.
   */
  private generateCodeVerifier(): string {
    // Generate 32 random bytes -> 43 base64url characters
    const randomBytes = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomBytes);
    } else {
      // Fallback for older environments (should not happen in modern Node.js/browsers)
      for (let i = 0; i < 32; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return this.base64UrlEncode(randomBytes).slice(0, 43);
  }

  /**
   * Generate code challenge from verifier using SHA256.
   * RFC 7636 S256 method.
   */
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    
    // Use Web Crypto API for SHA-256
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return this.base64UrlEncode(new Uint8Array(hashBuffer));
    }
    
    // Fallback: Try Node.js crypto (for older Node.js without Web Crypto)
    try {
      const nodeCrypto = await import('crypto');
      const hash = nodeCrypto.createHash('sha256').update(codeVerifier).digest();
      return this.base64UrlEncode(new Uint8Array(hash));
    } catch {
      throw new Error('No crypto implementation available for PKCE code challenge');
    }
  }

  /**
   * Generate a random state parameter for CSRF protection.
   */
  private generateState(): string {
    const randomBytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomBytes);
    } else {
      for (let i = 0; i < 16; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Base64URL encode a Uint8Array (RFC 4648).
   */
  private base64UrlEncode(data: Uint8Array): string {
    // Convert to regular base64 first
    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    const base64 = btoa(binary);
    
    // Convert to base64url
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Initiate an OAuth2 flow for a bit.
   * 
   * @param bitId - Unique identifier for the bit (e.g., "bit-google-drive")
   * @param config - OAuth2 configuration
   * @returns Authorization URL and flow info
   */
  async initiateFlow(bitId: string, config: OAuth2Config): Promise<InitiateFlowResult> {
    const state = this.generateState();
    const redirectUri = `${this.callbackBaseUrl}/${bitId}/callback`;
    const usePkce = config.pkce !== false; // PKCE enabled by default
    
    // Generate PKCE codes only if enabled
    const codeVerifier = usePkce ? this.generateCodeVerifier() : undefined;
    const codeChallenge = usePkce && codeVerifier ? await this.generateCodeChallenge(codeVerifier) : undefined;

    // Store OAuth state for later verification
    const oauthState: OAuth2State = {
      codeVerifier,
      codeChallenge,
      state,
      redirectUri,
      bitId,
      createdAt: Date.now(),
      config,
    };

    this.pendingFlows.set(state, oauthState);
    this.logger.info('OAuth flow initiated', { bitId, redirectUri, pkce: usePkce });

    // Build authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: redirectUri,
      scope: config.scopes.join(' '),
      state,
    });
    
    // Add PKCE parameters if enabled
    if (usePkce && codeChallenge) {
      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'S256');
    }

    // Add any extra parameters
    if (config.extraAuthParams) {
      for (const [key, value] of Object.entries(config.extraAuthParams)) {
        params.set(key, value);
      }
    }

    const authUrl = `${config.authorizationUrl}?${params.toString()}`;

    return { authUrl, state, redirectUri };
  }

  /**
   * Parse an OAuth callback URL to extract parameters.
   * Supports both query parameters (?code=...) and hash fragments (#access_token=...).
   * 
   * @param callbackUrl - Full callback URL received from OAuth provider
   * @returns Parsed callback parameters
   */
  parseCallbackUrl(callbackUrl: string): OAuthCallbackParams {
    const result: OAuthCallbackParams = {};
    
    try {
      const url = new URL(callbackUrl);
      
      // First, try query parameters (standard authorization code flow)
      const queryParams = url.searchParams;
      if (queryParams.has('code')) {
        result.code = queryParams.get('code') || undefined;
      }
      if (queryParams.has('state')) {
        result.state = queryParams.get('state') || undefined;
      }
      if (queryParams.has('error')) {
        result.error = queryParams.get('error') || undefined;
        result.errorDescription = queryParams.get('error_description') || undefined;
      }
      
      // Then, try hash fragment (implicit flow or some providers)
      if (url.hash) {
        const hashParams = new URLSearchParams(url.hash.slice(1)); // Remove leading #
        
        // Access token in hash (implicit flow)
        if (hashParams.has('access_token')) {
          result.accessToken = hashParams.get('access_token') || undefined;
          result.tokenType = hashParams.get('token_type') || 'Bearer';
          const expiresIn = hashParams.get('expires_in');
          if (expiresIn) {
            result.expiresIn = parseInt(expiresIn, 10);
          }
          result.refreshToken = hashParams.get('refresh_token') || undefined;
        }
        
        // State can also be in hash
        if (hashParams.has('state') && !result.state) {
          result.state = hashParams.get('state') || undefined;
        }
        
        // Error can also be in hash
        if (hashParams.has('error') && !result.error) {
          result.error = hashParams.get('error') || undefined;
          result.errorDescription = hashParams.get('error_description') || undefined;
        }
      }
    } catch (e) {
      // If URL parsing fails, try to parse as fragment only (e.g., custom schemes)
      const parts = callbackUrl.split('#');
      if (parts.length > 1) {
        const hashParams = new URLSearchParams(parts[1]);
        result.accessToken = hashParams.get('access_token') || undefined;
        result.tokenType = hashParams.get('token_type') || undefined;
        result.state = hashParams.get('state') || undefined;
        result.error = hashParams.get('error') || undefined;
        result.errorDescription = hashParams.get('error_description') || undefined;
        const expiresIn = hashParams.get('expires_in');
        if (expiresIn) {
          result.expiresIn = parseInt(expiresIn, 10);
        }
      }
      
      // Also try query string parsing
      const queryParts = callbackUrl.split('?');
      if (queryParts.length > 1) {
        const queryStr = queryParts[1].split('#')[0]; // Remove any hash portion
        const queryParams = new URLSearchParams(queryStr);
        if (!result.code) result.code = queryParams.get('code') || undefined;
        if (!result.state) result.state = queryParams.get('state') || undefined;
        if (!result.error) result.error = queryParams.get('error') || undefined;
        if (!result.errorDescription) result.errorDescription = queryParams.get('error_description') || undefined;
      }
    }
    
    return result;
  }

  /**
   * Handle a callback URL directly (convenience method combining parse + exchange/handleImplicit).
   * 
   * @param callbackUrl - Full callback URL received from OAuth provider
   * @returns Exchange result with bit ID and tokens
   */
  async handleCallback(callbackUrl: string): Promise<ExchangeResult> {
    const params = this.parseCallbackUrl(callbackUrl);
    
    if (params.error) {
      throw new Error(`OAuth error: ${params.error}${params.errorDescription ? ` - ${params.errorDescription}` : ''}`);
    }
    
    // Check for implicit flow (access token directly in callback)
    if (params.accessToken && params.state) {
      return this.handleImplicitCallback(params);
    }
    
    // Standard authorization code flow
    if (!params.code || !params.state) {
      throw new Error('Missing code or state parameter in OAuth callback');
    }
    
    return this.exchangeCode(params.state, params.code);
  }

  /**
   * Handle implicit flow callback (access token directly in callback URL).
   */
  private handleImplicitCallback(params: OAuthCallbackParams): ExchangeResult {
    if (!params.state || !params.accessToken) {
      throw new Error('Missing state or access_token for implicit flow');
    }
    
    const oauthState = this.pendingFlows.get(params.state);
    if (!oauthState) {
      throw new Error('Invalid or expired OAuth state. Please restart the authorization flow.');
    }
    
    // Remove the pending flow
    this.pendingFlows.delete(params.state);
    
    const tokens: OAuth2TokenSet = {
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      tokenType: params.tokenType || 'Bearer',
      expiresAt: params.expiresIn ? Date.now() + params.expiresIn * 1000 : undefined,
    };
    
    // Store tokens
    oauthTokenStore.setToken(oauthState.bitId, tokens, oauthState.config);
    this.logger.info('OAuth implicit flow completed successfully', { bitId: oauthState.bitId });
    
    return { bitId: oauthState.bitId, tokens };
  }

  /**
   * Exchange authorization code for tokens.
   * 
   * @param state - State parameter from callback
   * @param code - Authorization code from callback
   * @returns Token set or throws error
   */
  async exchangeCode(state: string, code: string): Promise<ExchangeResult> {
    const oauthState = this.pendingFlows.get(state);
    if (!oauthState) {
      throw new Error('Invalid or expired OAuth state. Please restart the authorization flow.');
    }

    // Remove the pending flow
    this.pendingFlows.delete(state);

    const { config, codeVerifier, redirectUri, bitId } = oauthState;

    // Exchange code for tokens
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
    });
    
    // Add code_verifier if PKCE was used
    if (codeVerifier) {
      params.set('code_verifier', codeVerifier);
    }

    if (config.clientSecret) {
      params.set('client_secret', config.clientSecret);
    }

    this.logger.info('Exchanging authorization code', { bitId });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error('Token exchange failed', { bitId, status: response.status, error: errorText });
      throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as any;

    const tokens: OAuth2TokenSet = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type || 'Bearer',
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
      scope: data.scope,
    };

    // Store tokens
    oauthTokenStore.setToken(bitId, tokens, config);
    this.logger.info('OAuth flow completed successfully', { bitId });

    return { bitId, tokens };
  }

  /**
   * Get the pending OAuth state for a given state parameter.
   * Useful for validation without consuming the state.
   */
  getPendingFlow(state: string): OAuth2State | undefined {
    return this.pendingFlows.get(state);
  }

  /**
   * Check if a flow is pending for a bit.
   */
  hasPendingFlow(bitId: string): boolean {
    for (const state of this.pendingFlows.values()) {
      if (state.bitId === bitId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get pending authorization URL for a bit (if flow already initiated).
   */
  getPendingAuthUrl(bitId: string): string | null {
    for (const [state, oauthState] of this.pendingFlows.entries()) {
      if (oauthState.bitId === bitId) {
        // Rebuild the auth URL
        const { config, codeChallenge, redirectUri } = oauthState;
        const params = new URLSearchParams({
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectUri,
          scope: config.scopes.join(' '),
          state,
        });
        
        if (codeChallenge) {
          params.set('code_challenge', codeChallenge);
          params.set('code_challenge_method', 'S256');
        }
        
        if (config.extraAuthParams) {
          for (const [key, value] of Object.entries(config.extraAuthParams)) {
            params.set(key, value);
          }
        }
        return `${config.authorizationUrl}?${params.toString()}`;
      }
    }
    return null;
  }

  /**
   * Cancel a pending OAuth flow.
   */
  cancelFlow(state: string): boolean {
    return this.pendingFlows.delete(state);
  }

  /**
   * Cancel all pending flows for a bit.
   */
  cancelFlowsForBit(bitId: string): number {
    let cancelled = 0;
    for (const [state, oauthState] of this.pendingFlows.entries()) {
      if (oauthState.bitId === bitId) {
        this.pendingFlows.delete(state);
        cancelled++;
      }
    }
    return cancelled;
  }

  /**
   * Clean up expired flows (older than 10 minutes).
   */
  cleanupExpiredFlows(): number {
    const now = Date.now();
    const expirationTime = 10 * 60 * 1000; // 10 minutes
    let cleaned = 0;

    for (const [state, oauthState] of this.pendingFlows.entries()) {
      if (now - oauthState.createdAt > expirationTime) {
        this.pendingFlows.delete(state);
        this.logger.debug('Expired OAuth flow cleaned up', { bitId: oauthState.bitId });
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get all pending flow states (for debugging/status).
   */
  getPendingFlowStates(): Array<{ bitId: string; state: string; createdAt: number; redirectUri: string }> {
    return Array.from(this.pendingFlows.entries()).map(([state, oauthState]) => ({
      bitId: oauthState.bitId,
      state,
      createdAt: oauthState.createdAt,
      redirectUri: oauthState.redirectUri,
    }));
  }
}

/**
 * IOAuthHandler interface - Platform-specific OAuth handling
 * 
 * Implement this interface to handle OAuth flows on different platforms.
 * The WorkflowExecutor uses this to trigger OAuth when tokens are missing.
 */
export interface IOAuthHandler {
  /**
   * Open an authorization URL in the appropriate context.
   * - Server: Print URL to console for user to visit
   * - Tauri: Open in system browser via opener plugin
   * - Browser: Redirect or open popup
   * 
   * @param authUrl - The authorization URL to open
   * @param bitId - The bit ID this is for (for context)
   */
  openAuthUrl(authUrl: string, bitId: string): Promise<void>;
  
  /**
   * Wait for OAuth callback and return the result.
   * - Server: Wait for Express callback route to be hit
   * - Tauri: Listen for deep link callback
   * - Browser: Listen for postMessage or redirect
   * 
   * @param state - The state parameter to wait for
   * @param timeoutMs - Timeout in milliseconds (default: 5 minutes)
   * @returns Exchange result with tokens
   */
  waitForCallback(state: string, timeoutMs?: number): Promise<ExchangeResult>;
  
  /**
   * Check if this handler supports the current platform.
   */
  isSupported(): boolean;
}

/**
 * OAuth requirement for workflow execution
 */
export interface WorkflowOAuthRequirement {
  /** Bit ID (derived from module name) */
  bitId: string;
  /** Module name (e.g., "@ha-bits/bit-google-drive") */
  moduleName: string;
  /** Display name of the bit */
  displayName: string;
  /** OAuth2 configuration */
  config: OAuth2Config;
  /** Status: 'needed', 'valid', or 'expired' */
  status: 'needed' | 'valid' | 'expired';
}
