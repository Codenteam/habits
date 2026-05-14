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

  private buildHtmlPage(options: {
    type: 'success' | 'error';
    title: string;
    message: string;
    detail?: string;
    countdown?: boolean;
  }): string {
    const { type, title, message, detail, countdown = false } = options;
    const isSuccess = type === 'success';
    const accent = isSuccess ? '#10b981' : '#ef4444';
    const iconBg = isSuccess ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
    const checkIcon = `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="28" fill="${iconBg}"/><path d="M17 28l8 8 14-16" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const crossIcon = `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="28" fill="${iconBg}"/><path d="M20 20l16 16M36 20L20 36" stroke="${accent}" stroke-width="3" stroke-linecap="round"/></svg>`;
    const icon = isSuccess ? checkIcon : crossIcon;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>${countdown ? '\n  <meta http-equiv="refresh" content="5;url=/" />' : ''}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0a0f1e;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 20px;
      padding: 48px 40px;
      max-width: 460px;
      width: 100%;
      text-align: center;
    }
    .icon { margin-bottom: 28px; }
    h1 { font-size: 22px; font-weight: 700; color: #f8fafc; margin-bottom: 10px; }
    .msg { color: #94a3b8; font-size: 14px; line-height: 1.7; }
    .detail {
      background: #0a0f1e;
      border: 1px solid #1f2937;
      border-radius: 10px;
      padding: 14px 18px;
      margin: 20px 0;
      font-size: 13px;
      color: #64748b;
      text-align: left;
      word-break: break-word;
    }
    .detail strong { color: #94a3b8; }
    .btn {
      display: inline-block;
      margin-top: 28px;
      padding: 11px 30px;
      background: ${accent};
      color: #fff;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 14px;
    }
    .progress-label { font-size: 12px; color: #475569; margin-top: 28px; margin-bottom: 8px; }
    .progress-track { height: 3px; background: #1f2937; border-radius: 3px; overflow: hidden; }
    .progress-fill { height: 100%; background: ${accent}; animation: drain 5s linear forwards; }
    @keyframes drain { from { width: 100%; } to { width: 0%; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p class="msg">${message}</p>
    ${detail ? `<div class="detail">${detail}</div>` : ''}
    ${countdown ? `
    <p class="progress-label">Redirecting to home in 5 seconds</p>
    <div class="progress-track"><div class="progress-fill"></div></div>
    <a class="btn" href="/">Go Home Now</a>` : `<a class="btn" href="/">Back to Home</a>`}
  </div>
  ${countdown ? `<script>setTimeout(function(){window.location.href='/';},5000);</script>` : ''}
</body>
</html>`;
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
        return res.status(404).send(this.buildHtmlPage({
          type: 'error',
          title: 'OAuth Not Configured',
          message: 'No OAuth configuration was found for this bit.',
          detail: `<strong>Bit:</strong> ${bitId}<br>Make sure the bit is configured in your habit.yaml and the server has loaded it.`,
        }));
      }

      try {
        // Initiate the OAuth flow and get the authorization URL
        const authUrl = await this.initiateFlowAsync(bitId, config);
        
        this.logger.info('Redirecting to OAuth provider', { bitId, authUrl: authUrl.substring(0, 100) + '...' });
        
        // Redirect user to the OAuth provider
        res.redirect(authUrl);
      } catch (err) {
        this.logger.error('Failed to initiate OAuth flow', { bitId, error: String(err) });
        res.status(500).send(this.buildHtmlPage({
          type: 'error',
          title: 'Failed to Initiate OAuth',
          message: 'Could not start the authorization flow. Please check the server configuration and try again.',
          detail: `<strong>Error:</strong> ${err instanceof Error ? err.message : String(err)}`,
        }));
      }
    });

    // OAuth callback handler
    router.get('/:bitId/callback', async (req: Request, res: Response) => {
      const { bitId } = req.params;
      const { code, state, error, error_description } = req.query;

      this.logger.info('OAuth callback received', { bitId, hasCode: !!code, hasError: !!error });

      // Handle OAuth errors
      if (error) {
        return res.status(400).send(this.buildHtmlPage({
          type: 'error',
          title: 'Authorization Failed',
          message: 'The OAuth provider returned an error. Please close this window and try again.',
          detail: `<strong>Error:</strong> ${error}${error_description ? `<br><strong>Details:</strong> ${error_description}` : ''}`,
        }));
      }

      if (!code || !state) {
        return res.status(400).send(this.buildHtmlPage({
          type: 'error',
          title: 'Missing Authorization Code',
          message: 'The OAuth provider did not return an authorization code. Please close this window and try again.',
        }));
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
        
        // Always use 24 hours for cookie Max-Age.
        // Token expiry (expiresAt) tracks validity for refresh logic; the cookie
        // itself must survive long enough for the refresh flow to kick in.
        const maxAgeSeconds = 24 * 60 * 60;
        
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
        
        res.send(this.buildHtmlPage({
          type: 'success',
          title: 'Authorization Successful',
          message: 'Your account has been connected. The access token has been stored and will be used automatically.',
          detail: `<strong>Bit:</strong> ${result.bitId}`,
          countdown: true,
        }));
      } catch (err) {
        this.logger.error('OAuth callback error', { bitId, error: String(err) });
        res.status(500).send(this.buildHtmlPage({
          type: 'error',
          title: 'Token Exchange Failed',
          message: 'Could not complete the authorization. Please close this window and try again.',
          detail: `<strong>Error:</strong> ${err instanceof Error ? err.message : String(err)}`,
        }));
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
