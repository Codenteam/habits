/**
 * @ha-bits/bit-oauth-mock
 * 
 * Mock OAuth2 integration bit for testing OAuth2 authentication flow.
 * Works with the mock OAuth server in playgrounds/oauth2/mock-oauth-server.ts.
 * 
 * This bit demonstrates:
 * - Using BitAuth.OAuth2 for authentication (with PKCE support)
 * - Making authenticated API requests with bearer tokens
 * - The complete OAuth2 Authorization Code Flow
 */

interface OAuthMockAuth {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt?: number;
}

interface OAuthMockContext {
  auth?: OAuthMockAuth;
  propsValue: Record<string, any>;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  username: string;
  avatar: string;
  scope: string;
  authenticated_at: string;
}

// Mock OAuth server configuration (localhost:9999)
const MOCK_OAUTH_SERVER = 'http://localhost:9999';

/**
 * Make an authenticated request to the mock OAuth API
 */
async function authenticatedRequest(
  endpoint: string,
  accessToken: string
): Promise<any> {
  const url = `${MOCK_OAUTH_SERVER}${endpoint}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OAuth Mock API Error (${response.status}): ${errorText}`);
  }
  
  return response.json();
}

const oauthMockBit = {
  displayName: 'OAuth Mock',
  description: 'Mock OAuth2 integration for testing OAuth2 PKCE authentication',
  logoUrl: 'lucide:Key',
  
  // OAuth2 PKCE authentication configuration
  // This tells the system to use OAuth2 PKCE flow with the mock server
  auth: {
    type: 'OAUTH2',
    displayName: 'Mock OAuth',
    description: 'OAuth2 authentication with the mock server',
    required: true,
    authorizationUrl: `${MOCK_OAUTH_SERVER}/authorize`,
    tokenUrl: `${MOCK_OAUTH_SERVER}/token`,
    clientId: 'mock-client-id',
    // clientSecret is optional for PKCE flow
    scopes: ['read', 'profile'],
  },
  
  actions: {
    /**
     * Get the authenticated user's profile
     */
    getProfile: {
      name: 'getProfile',
      displayName: 'Get Profile',
      description: 'Get the authenticated user\'s profile from the mock OAuth server',
      props: {},
      async run(context: OAuthMockContext): Promise<UserProfile> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the OAuth flow first.');
        }
        
        const profile = await authenticatedRequest('/api/me', context.auth.accessToken);
        return profile;
      },
    },
    
    /**
     * Check if the OAuth token is valid
     */
    checkToken: {
      name: 'checkToken',
      displayName: 'Check Token',
      description: 'Check if the OAuth token is valid and return token info',
      props: {},
      async run(context: OAuthMockContext): Promise<{
        isValid: boolean;
        hasToken: boolean;
        tokenType?: string;
        expiresAt?: number;
        isExpired?: boolean;
      }> {
        if (!context.auth) {
          return {
            isValid: false,
            hasToken: false,
          };
        }
        
        const isExpired = context.auth.expiresAt 
          ? Date.now() > context.auth.expiresAt 
          : false;
        
        return {
          isValid: !isExpired && !!context.auth.accessToken,
          hasToken: !!context.auth.accessToken,
          tokenType: context.auth.tokenType,
          expiresAt: context.auth.expiresAt,
          isExpired,
        };
      },
    },
  },

  // Empty triggers for now
  triggers: {},
};

export const oauthMock = oauthMockBit;
export default oauthMockBit;
