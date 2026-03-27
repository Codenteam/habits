/**
 * OAuth2 Types and Interfaces
 * 
 * Supports OAuth2 Authorization Code Flow with optional PKCE for secure authentication.
 * PKCE (Proof Key for Code Exchange) is recommended for public clients.
 */

/**
 * Configuration for OAuth2 authentication
 */
export interface OAuth2Config {
  /** Display name for the auth in UI */
  displayName: string;
  /** Description shown to users */
  description?: string;
  /** Whether authentication is required */
  required: boolean;
  /** OAuth2 authorization endpoint URL */
  authorizationUrl: string;
  /** OAuth2 token endpoint URL */
  tokenUrl: string;
  /** OAuth2 client ID */
  clientId: string;
  /** OAuth2 client secret (optional for PKCE, required for standard flow) */
  clientSecret?: string;
  /** Scopes to request */
  scopes: string[];
  /** Use PKCE (Proof Key for Code Exchange) - recommended for public clients (default: true) */
  pkce?: boolean;
  /** Additional authorization URL parameters */
  extraAuthParams?: Record<string, string>;
}

/** @deprecated Use OAuth2Config instead */
export type OAuth2PKCEConfig = OAuth2Config;

/**
 * OAuth2 token set returned from token endpoint
 */
export interface OAuth2TokenSet {
  /** Access token for API requests */
  accessToken: string;
  /** Refresh token for obtaining new access tokens (optional) */
  refreshToken?: string;
  /** Token type (usually "Bearer") */
  tokenType: string;
  /** Token expiration timestamp (ISO string or epoch ms) */
  expiresAt?: number;
  /** Scopes granted */
  scope?: string;
}

/**
 * State for tracking in-flight OAuth flows (with optional PKCE)
 */
export interface OAuth2State {
  /** Code verifier for PKCE (random string, 43-128 chars) - only present if pkce enabled */
  codeVerifier?: string;
  /** Code challenge for PKCE (SHA256 hash of verifier, base64url encoded) - only present if pkce enabled */
  codeChallenge?: string;
  /** State parameter for CSRF protection */
  state: string;
  /** Redirect URI used in the flow */
  redirectUri: string;
  /** Bit ID this flow is for */
  bitId: string;
  /** Timestamp when the flow was initiated */
  createdAt: number;
  /** OAuth2 configuration used */
  config: OAuth2Config;
}

/** @deprecated Use OAuth2State instead */
export type OAuth2PKCEState = OAuth2State;

/**
 * OAuth2 auth property definition (extends PropertyDefinition)
 */
export interface OAuth2PropertyDefinition {
  type: 'OAUTH2';
  displayName: string;
  description?: string;
  required: boolean;
  /** OAuth2 authorization endpoint URL */
  authorizationUrl: string;
  /** OAuth2 token endpoint URL */
  tokenUrl: string;
  /** OAuth2 client ID */
  clientId: string;
  /** OAuth2 client secret (optional for PKCE) */
  clientSecret?: string;
  /** Scopes to request */
  scopes: string[];
  /** Use PKCE (default: true) */
  pkce?: boolean;
  /** Additional authorization URL parameters */
  extraAuthParams?: Record<string, string>;
}

/** @deprecated Use OAuth2PropertyDefinition instead */
export type OAuth2PKCEPropertyDefinition = OAuth2PropertyDefinition;

/**
 * Status of OAuth2 authentication for a bit
 */
export interface OAuth2Status {
  /** Bit module identifier */
  bitId: string;
  /** Display name of the bit */
  bitDisplayName: string;
  /** Whether a valid token exists */
  hasValidToken: boolean;
  /** Whether token is expired */
  isExpired: boolean;
  /** Authorization URL to initiate OAuth flow */
  authUrl?: string;
  /** Token expiration time if available */
  expiresAt?: number;
}

/**
 * Token store entry
 */
export interface TokenStoreEntry {
  /** Token set */
  tokens: OAuth2TokenSet;
  /** OAuth config used to obtain tokens (for refresh) */
  config: OAuth2Config;
  /** Timestamp when stored */
  storedAt: number;
}
