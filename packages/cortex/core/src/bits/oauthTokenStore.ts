/**
 * OAuth2 Token Store
 * 
 * In-memory storage for OAuth2 tokens with optional file persistence.
 * Tokens are keyed by bit module identifier.
 */

import { OAuth2TokenSet, OAuth2Config, TokenStoreEntry } from './oauth2Types';
import { ILogger, LoggerFactory } from '@ha-bits/core/logger';

/**
 * In-memory OAuth2 token store
 */
class OAuth2TokenStore {
  private tokens: Map<string, TokenStoreEntry> = new Map();
  private logger: ILogger;

  constructor() {
    this.logger = LoggerFactory.create(undefined, undefined, { bitName: 'OAuth2TokenStore' });
  }

  /**
   * Store tokens for a bit
   * @param bitId - Unique identifier for the bit (e.g., "bit-oauth-mock")
   * @param tokens - Token set from OAuth provider
   * @param config - OAuth config used (for refresh)
   */
  setToken(bitId: string, tokens: OAuth2TokenSet, config: OAuth2Config): void {
    this.tokens.set(bitId, {
      tokens,
      config,
      storedAt: Date.now(),
    });
    this.logger.info('Token stored', { bitId, expiresAt: tokens.expiresAt });
  }

  /**
   * Get tokens for a bit
   * @param bitId - Unique identifier for the bit
   * @returns Token set or null if not found
   */
  getToken(bitId: string): OAuth2TokenSet | null {
    const entry = this.tokens.get(bitId);
    if (!entry) {
      return null;
    }
    return entry.tokens;
  }

  /**
   * Get full token entry including config
   * @param bitId - Unique identifier for the bit
   */
  getEntry(bitId: string): TokenStoreEntry | null {
    return this.tokens.get(bitId) || null;
  }

  /**
   * Check if a valid (non-expired) token exists for a bit
   * @param bitId - Unique identifier for the bit
   * @returns true if valid token exists
   */
  hasValidToken(bitId: string): boolean {
    const entry = this.tokens.get(bitId);
    if (!entry) {
      return false;
    }
    return !this.isExpired(bitId);
  }

  /**
   * Check if token is expired
   * @param bitId - Unique identifier for the bit
   * @returns true if token is expired or doesn't exist
   */
  isExpired(bitId: string): boolean {
    const entry = this.tokens.get(bitId);
    if (!entry) {
      return true;
    }
    if (!entry.tokens.expiresAt) {
      // No expiration set, assume valid
      return false;
    }
    // Add 60 second buffer to account for clock skew
    return Date.now() > entry.tokens.expiresAt - 60000;
  }

  /**
   * Remove token for a bit
   * @param bitId - Unique identifier for the bit
   */
  removeToken(bitId: string): void {
    this.tokens.delete(bitId);
    this.logger.info('Token removed', { bitId });
  }

  /**
   * Get all stored bit IDs
   */
  getAllBitIds(): string[] {
    return Array.from(this.tokens.keys());
  }

  /**
   * Clear all tokens
   */
  clear(): void {
    this.tokens.clear();
    this.logger.info('All tokens cleared');
  }

  /**
   * Refresh an expired token using the refresh token
   * @param bitId - Unique identifier for the bit
   * @returns New token set or null if refresh failed
   */
  async refreshToken(bitId: string): Promise<OAuth2TokenSet | null> {
    const entry = this.tokens.get(bitId);
    if (!entry || !entry.tokens.refreshToken) {
      this.logger.warn('Cannot refresh token: no refresh token available', { bitId });
      return null;
    }

    const { config, tokens } = entry;

    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken!,
        client_id: config.clientId,
      });

      if (config.clientSecret) {
        params.set('client_secret', config.clientSecret);
      }

      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('Token refresh failed', { bitId, status: response.status, error: errorText });
        return null;
      }

      const data = await response.json() as any;

      const newTokens: OAuth2TokenSet = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || tokens.refreshToken, // Keep old refresh token if not returned
        tokenType: data.token_type || 'Bearer',
        expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
        scope: data.scope,
      };

      this.setToken(bitId, newTokens, config);
      this.logger.info('Token refreshed successfully', { bitId });

      return newTokens;
    } catch (error) {
      this.logger.error('Token refresh error', { bitId, error: String(error) });
      return null;
    }
  }
}

// Singleton instance
export const oauthTokenStore = new OAuth2TokenStore();
