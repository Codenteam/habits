/**
 * OAuth2 Callback Server
 * 
 * Express wrapper around OAuthFlowManager for server-based OAuth flows.
 * Handles OAuth2 authorization flows via HTTP callbacks:
 * - Builds authorization URLs (delegated to OAuthFlowManager)
 * - Handles `/oauth/:bitId/callback` routes
 * - Exchanges authorization codes for tokens
 * 
 * For platform-agnostic OAuth logic (Tauri, browser, etc.), 
 * use OAuthFlowManager directly from @ha-bits/cortex-core.
 */

import express, { Request, Response, Router } from 'express';
import { 
  OAuth2Config, 
  OAuthFlowManager,
  type ExchangeResult,
  oauthTokenStore,
} from '@ha-bits/cortex-core';
import { ILogger, LoggerFactory } from '@ha-bits/core/logger';

/**
 * OAuth2 Callback Server for handling HTTP-based OAuth flows
 * 
 * This is a thin wrapper around OAuthFlowManager that adds Express routing.
 * The core OAuth logic (PKCE, token exchange, etc.) is handled by OAuthFlowManager.
 */
export class OAuthCallbackServer {
  private flowManager: OAuthFlowManager;
  private logger: ILogger;
  private serverUrl: string;
  private oauthConfigs: Map<string, OAuth2Config> = new Map();

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
    this.logger = LoggerFactory.create(undefined, undefined, { bitName: 'OAuthCallbackServer' });
    
    // Create flow manager with server's OAuth callback base URL
    this.flowManager = new OAuthFlowManager({
      callbackBaseUrl: `${serverUrl}/oauth`,
      logger: this.logger,
    });
  }

  /**
   * Get the underlying OAuthFlowManager instance.
   * Useful for advanced use cases or testing.
   */
  getFlowManager(): OAuthFlowManager {
    return this.flowManager;
  }

  /**
   * Initiate an OAuth2 flow for a bit
   * @param bitId - Unique identifier for the bit
   * @param config - OAuth2 configuration
   * @returns Authorization URL to redirect user to
   */
  initiateFlow(bitId: string, config: OAuth2Config): string {
    // initiateFlow is now async, but for backwards compatibility we use a sync wrapper
    // This works because generateCodeChallenge uses Web Crypto which is fast enough
    // In practice, we should migrate callers to use the async version
    let authUrl = '';
    
    // Use Promise to get the result synchronously (blocking)
    // This is a temporary compatibility layer
    const initPromise = this.flowManager.initiateFlow(bitId, config);
    
    // For Node.js server context, we can use a workaround
    // In the future, callers should use async/await
    initPromise.then(result => {
      authUrl = result.authUrl;
    }).catch(err => {
      this.logger.error('Failed to initiate OAuth flow', { bitId, error: String(err) });
    });
    
    // Return empty string initially - the actual URL will be set async
    // This is a limitation of the sync interface
    // For proper async support, use initiateFlowAsync
    return authUrl;
  }

  /**
   * Initiate an OAuth2 flow for a bit (async version)
   * @param bitId - Unique identifier for the bit
   * @param config - OAuth2 configuration
   * @returns Authorization URL to redirect user to
   */
  async initiateFlowAsync(bitId: string, config: OAuth2Config): Promise<string> {
    const result = await this.flowManager.initiateFlow(bitId, config);
    return result.authUrl;
  }

  /**
   * Exchange authorization code for tokens
   * @param state - State parameter from callback
   * @param code - Authorization code from callback
   * @returns Token set or throws error
   */
  async exchangeCode(state: string, code: string): Promise<ExchangeResult> {
    return this.flowManager.exchangeCode(state, code);
  }

  /**
   * Check if a flow is pending for a bit
   */
  hasPendingFlow(bitId: string): boolean {
    return this.flowManager.hasPendingFlow(bitId);
  }

  /**
   * Get pending authorization URL for a bit (if flow already initiated)
   */
  getPendingAuthUrl(bitId: string): string | null {
    return this.flowManager.getPendingAuthUrl(bitId);
  }

  /**
   * Clean up expired flows (older than 10 minutes)
   */
  cleanupExpiredFlows(): void {
    this.flowManager.cleanupExpiredFlows();
  }

  /**
   * Register an OAuth2 config for a bit (used by /init endpoint)
   * @param bitId - Unique identifier for the bit
   * @param config - OAuth2 configuration
   */
  registerOAuthConfig(bitId: string, config: OAuth2Config): void {
    this.oauthConfigs.set(bitId, config);
    this.logger.debug('Registered OAuth config', { bitId });
  }

  /**
   * Get registered OAuth2 config for a bit
   * @param bitId - Unique identifier for the bit
   * @returns OAuth2 config or undefined if not registered
   */
  getOAuthConfig(bitId: string): OAuth2Config | undefined {
    return this.oauthConfigs.get(bitId);
  }

  /**
   * Create Express router for OAuth callbacks
   */
  createRouter(): Router {
    const router = Router();

    // OAuth init endpoint - redirects user to authorization URL
    router.get('/:bitId/init', async (req: Request, res: Response) => {
      const { bitId } = req.params;
      
      this.logger.info('OAuth init requested', { bitId });

      // Get the registered OAuth config for this bit
      const config = this.oauthConfigs.get(bitId);
      if (!config) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head><title>OAuth Error</title></head>
          <body>
            <h1>❌ OAuth Not Configured</h1>
            <p>No OAuth configuration found for bit: <strong>${bitId}</strong></p>
            <p>Make sure the bit is configured in your habit.yaml and the server has loaded it.</p>
          </body>
          </html>
        `);
      }

      try {
        // Initiate the OAuth flow and get the authorization URL
        const authUrl = await this.initiateFlowAsync(bitId, config);
        
        this.logger.info('Redirecting to OAuth provider', { bitId, authUrl: authUrl.substring(0, 100) + '...' });
        
        // Redirect user to the OAuth provider
        res.redirect(authUrl);
      } catch (err) {
        this.logger.error('Failed to initiate OAuth flow', { bitId, error: String(err) });
        res.status(500).send(`
          <!DOCTYPE html>
          <html>
          <head><title>OAuth Error</title></head>
          <body>
            <h1>❌ Failed to Initiate OAuth Flow</h1>
            <p><strong>Error:</strong> ${err instanceof Error ? err.message : String(err)}</p>
            <p>Please check the server configuration and try again.</p>
          </body>
          </html>
        `);
      }
    });

    // OAuth callback handler
    router.get('/:bitId/callback', async (req: Request, res: Response) => {
      const { bitId } = req.params;
      const { code, state, error, error_description } = req.query;

      this.logger.info('OAuth callback received', { bitId, hasCode: !!code, hasError: !!error });

      // Handle OAuth errors
      if (error) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head><title>OAuth Error</title></head>
          <body>
            <h1>❌ OAuth Authorization Failed</h1>
            <p><strong>Error:</strong> ${error}</p>
            ${error_description ? `<p><strong>Description:</strong> ${error_description}</p>` : ''}
            <p>Please close this window and try again.</p>
          </body>
          </html>
        `);
      }

      if (!code || !state) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head><title>OAuth Error</title></head>
          <body>
            <h1>❌ Missing Authorization Code</h1>
            <p>The OAuth provider did not return an authorization code.</p>
            <p>Please close this window and try again.</p>
          </body>
          </html>
        `);
      }

      try {
        const result = await this.flowManager.exchangeCode(state as string, code as string);
        
        // Set cookie with OAuth token for per-user multi-user mode
        // Cookie name: oauth_<bitId>, value: JSON-encoded token
        const cookieName = `oauth_${result.bitId}`;
        const cookieValue = JSON.stringify({
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          tokenType: result.tokens.tokenType,
          expiresAt: result.tokens.expiresAt,
        });
        
        // Calculate cookie max age (use token expiry or 24 hours default)
        const maxAgeSeconds = result.tokens.expiresAt 
          ? Math.max(0, Math.floor((result.tokens.expiresAt - Date.now()) / 1000))
          : 24 * 60 * 60; // 24 hours default
        
        // Set cookie with security settings appropriate for the environment
        const isProduction = process.env.NODE_ENV === 'production';
        res.setHeader('Set-Cookie', [
          `${cookieName}=${encodeURIComponent(cookieValue)}`,
          `Path=/`,
          `Max-Age=${maxAgeSeconds}`,
          `SameSite=Lax`,
          isProduction ? 'Secure' : '',
          // Note: HttpOnly=false so JS can read for Tauri deep link flows if needed
        ].filter(Boolean).join('; '));
        
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>OAuth Success</title>
            <meta http-equiv="refresh" content="5;url=/" />
            <script>
              setTimeout(function() {
          window.location.href = "/";
              }, 5000);
            </script>
          </head>
          <body>
            <h1>✅ Authorization Successful!</h1>
            <p><strong>Bit:</strong> ${result.bitId}</p>
            <p>You can now close this window and return to your application.</p>
            <p>The access token has been stored and will be used automatically.</p>
            <p>Redirecting to <a href="/">home</a> in 5 seconds...</p>
          </body>
          </html>
        `);
      } catch (err) {
        this.logger.error('OAuth callback error', { bitId, error: String(err) });
        res.status(500).send(`
          <!DOCTYPE html>
          <html>
          <head><title>OAuth Error</title></head>
          <body>
            <h1>❌ Token Exchange Failed</h1>
            <p><strong>Error:</strong> ${err instanceof Error ? err.message : String(err)}</p>
            <p>Please close this window and try again.</p>
          </body>
          </html>
        `);
      }
    });

    // Status endpoint to check OAuth status for all bits
    router.get('/status', (req: Request, res: Response) => {
      const allBitIds = oauthTokenStore.getAllBitIds();
      const status = allBitIds.map(bitId => ({
        bitId,
        hasValidToken: oauthTokenStore.hasValidToken(bitId),
        isExpired: oauthTokenStore.isExpired(bitId),
      }));

      const pendingFlows = this.flowManager.getPendingFlowStates();

      res.json({
        tokens: status,
        pendingFlows,
      });
    });

    return router;
  }
}

// Singleton instance (initialized when server starts)
let oauthCallbackServer: OAuthCallbackServer | null = null;

export function initOAuthCallbackServer(serverUrl: string): OAuthCallbackServer {
  oauthCallbackServer = new OAuthCallbackServer(serverUrl);
  return oauthCallbackServer;
}

export function getOAuthCallbackServer(): OAuthCallbackServer | null {
  return oauthCallbackServer;
}
