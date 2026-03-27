/**
 * Mock OAuth2 Server with PKCE Support
 * 
 * A simple Express server that implements OAuth2 Authorization Code Flow with PKCE
 * for testing purposes. This mimics what real OAuth providers like Twitter, Instagram do.
 * 
 * Endpoints:
 * - GET /authorize - Authorization endpoint (shows consent page)
 * - POST /token - Token endpoint (exchanges code for tokens)
 * - GET /api/me - Protected API endpoint (requires bearer token)
 * 
 * Run with: npx ts-node mock-oauth-server.ts
 */

import express, { Request, Response } from 'express';
import crypto from 'crypto';

const app = express();
const PORT = 9999;

// In-memory storage for authorization codes and their PKCE challenges
const authorizationCodes = new Map<string, {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
  createdAt: number;
}>();

// In-memory storage for access tokens
const accessTokens = new Map<string, {
  userId: string;
  scope: string;
  createdAt: number;
  expiresIn: number;
}>();

// In-memory storage for refresh tokens
const refreshTokens = new Map<string, {
  userId: string;
  scope: string;
  createdAt: number;
}>();

// Mock user data
const mockUser = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  username: 'testuser',
  avatar: 'https://example.com/avatar.png',
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

/**
 * Generate a random string
 */
function generateRandomString(length: number): string {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

/**
 * Verify PKCE code challenge using S256 method
 */
function verifyPKCE(codeVerifier: string, codeChallenge: string): boolean {
  const hash = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return hash === codeChallenge;
}

// ============================================================================
// Authorization Endpoint
// ============================================================================

app.get('/authorize', (req: Request, res: Response) => {
  const {
    response_type,
    client_id,
    redirect_uri,
    scope,
    state,
    code_challenge,
    code_challenge_method,
  } = req.query;

  console.log('📥 Authorization request received:');
  console.log(`   client_id: ${client_id}`);
  console.log(`   redirect_uri: ${redirect_uri}`);
  console.log(`   scope: ${scope}`);
  console.log(`   code_challenge: ${code_challenge}`);
  console.log(`   code_challenge_method: ${code_challenge_method}`);

  // Validate required parameters
  if (response_type !== 'code') {
    return res.status(400).send('Invalid response_type. Only "code" is supported.');
  }

  if (!client_id || !redirect_uri || !code_challenge || !state) {
    return res.status(400).send('Missing required parameters.');
  }

  if (code_challenge_method !== 'S256') {
    return res.status(400).send('Invalid code_challenge_method. Only "S256" is supported.');
  }

  // Show a simple consent page
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mock OAuth - Authorize</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .card {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          max-width: 400px;
          text-align: center;
        }
        h1 { color: #333; margin-bottom: 20px; }
        p { color: #666; line-height: 1.6; }
        .scope { 
          background: #f5f5f5; 
          padding: 10px; 
          border-radius: 6px;
          margin: 20px 0;
          font-family: monospace;
        }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          margin: 10px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: bold;
          cursor: pointer;
          border: none;
        }
        .btn-allow {
          background: #667eea;
          color: white;
        }
        .btn-deny {
          background: #eee;
          color: #666;
        }
        .btn:hover { opacity: 0.9; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🔐 Authorization Request</h1>
        <p>The application <strong>${client_id}</strong> wants to access your account.</p>
        <div class="scope">
          <strong>Requested Scopes:</strong><br>
          ${scope || 'read'}
        </div>
        <form method="POST" action="/authorize/consent">
          <input type="hidden" name="client_id" value="${client_id}">
          <input type="hidden" name="redirect_uri" value="${redirect_uri}">
          <input type="hidden" name="scope" value="${scope || 'read'}">
          <input type="hidden" name="state" value="${state}">
          <input type="hidden" name="code_challenge" value="${code_challenge}">
          <input type="hidden" name="code_challenge_method" value="${code_challenge_method}">
          <button type="submit" name="action" value="allow" class="btn btn-allow">✅ Allow</button>
          <button type="submit" name="action" value="deny" class="btn btn-deny">❌ Deny</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Handle consent form submission
app.post('/authorize/consent', (req: Request, res: Response) => {
  const {
    client_id,
    redirect_uri,
    scope,
    state,
    code_challenge,
    code_challenge_method,
    action,
  } = req.body;

  console.log(`📥 Consent received: ${action}`);

  if (action === 'deny') {
    // Redirect back with error
    const errorUrl = new URL(redirect_uri);
    errorUrl.searchParams.set('error', 'access_denied');
    errorUrl.searchParams.set('error_description', 'User denied the authorization request');
    errorUrl.searchParams.set('state', state);
    return res.redirect(errorUrl.toString());
  }

  // Generate authorization code
  const code = generateRandomString(32);
  
  // Store the code with PKCE challenge
  authorizationCodes.set(code, {
    clientId: client_id,
    redirectUri: redirect_uri,
    codeChallenge: code_challenge,
    codeChallengeMethod: code_challenge_method,
    scope,
    createdAt: Date.now(),
  });

  console.log(`✅ Authorization code generated: ${code.substring(0, 8)}...`);

  // Redirect back to client with authorization code
  const successUrl = new URL(redirect_uri);
  successUrl.searchParams.set('code', code);
  successUrl.searchParams.set('state', state);
  
  res.redirect(successUrl.toString());
});

// ============================================================================
// Token Endpoint
// ============================================================================

app.post('/token', (req: Request, res: Response) => {
  const {
    grant_type,
    code,
    redirect_uri,
    client_id,
    code_verifier,
    refresh_token,
  } = req.body;

  console.log('📥 Token request received:');
  console.log(`   grant_type: ${grant_type}`);
  console.log(`   client_id: ${client_id}`);

  // Handle refresh token grant
  if (grant_type === 'refresh_token') {
    const storedRefresh = refreshTokens.get(refresh_token);
    if (!storedRefresh) {
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Invalid refresh token',
      });
    }

    // Generate new access token
    const accessToken = generateRandomString(64);
    const expiresIn = 3600; // 1 hour

    accessTokens.set(accessToken, {
      userId: storedRefresh.userId,
      scope: storedRefresh.scope,
      createdAt: Date.now(),
      expiresIn,
    });

    console.log(`✅ Access token refreshed: ${accessToken.substring(0, 8)}...`);

    return res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refresh_token, // Return same refresh token
      scope: storedRefresh.scope,
    });
  }

  // Handle authorization code grant
  if (grant_type !== 'authorization_code') {
    return res.status(400).json({
      error: 'unsupported_grant_type',
      error_description: 'Only authorization_code and refresh_token grants are supported',
    });
  }

  // Validate authorization code
  const storedCode = authorizationCodes.get(code);
  if (!storedCode) {
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Invalid or expired authorization code',
    });
  }

  // Check if code has expired (10 minutes)
  if (Date.now() - storedCode.createdAt > 10 * 60 * 1000) {
    authorizationCodes.delete(code);
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Authorization code has expired',
    });
  }

  // Verify redirect_uri matches
  if (redirect_uri !== storedCode.redirectUri) {
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'redirect_uri does not match',
    });
  }

  // Verify client_id matches
  if (client_id !== storedCode.clientId) {
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'client_id does not match',
    });
  }

  // Verify PKCE code verifier
  if (!code_verifier || !verifyPKCE(code_verifier, storedCode.codeChallenge)) {
    console.log('❌ PKCE verification failed');
    console.log(`   code_verifier: ${code_verifier}`);
    console.log(`   expected challenge: ${storedCode.codeChallenge}`);
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Invalid code_verifier',
    });
  }

  console.log('✅ PKCE verification passed');

  // Delete the used authorization code
  authorizationCodes.delete(code);

  // Generate tokens
  const accessToken = generateRandomString(64);
  const refreshToken = generateRandomString(64);
  const expiresIn = 3600; // 1 hour

  // Store access token
  accessTokens.set(accessToken, {
    userId: mockUser.id,
    scope: storedCode.scope,
    createdAt: Date.now(),
    expiresIn,
  });

  // Store refresh token
  refreshTokens.set(refreshToken, {
    userId: mockUser.id,
    scope: storedCode.scope,
    createdAt: Date.now(),
  });

  console.log(`✅ Tokens generated:`);
  console.log(`   access_token: ${accessToken.substring(0, 8)}...`);
  console.log(`   refresh_token: ${refreshToken.substring(0, 8)}...`);

  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    refresh_token: refreshToken,
    scope: storedCode.scope,
  });
});

// ============================================================================
// Protected API Endpoint
// ============================================================================

app.get('/api/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'unauthorized',
      error_description: 'Missing or invalid Authorization header',
    });
  }

  const token = authHeader.split(' ')[1];
  const storedToken = accessTokens.get(token);

  if (!storedToken) {
    return res.status(401).json({
      error: 'invalid_token',
      error_description: 'Invalid or expired access token',
    });
  }

  // Check if token has expired
  if (Date.now() - storedToken.createdAt > storedToken.expiresIn * 1000) {
    accessTokens.delete(token);
    return res.status(401).json({
      error: 'invalid_token',
      error_description: 'Access token has expired',
    });
  }

  console.log(`✅ API request authenticated for user: ${storedToken.userId}`);

  res.json({
    ...mockUser,
    scope: storedToken.scope,
    authenticated_at: new Date(storedToken.createdAt).toISOString(),
  });
});

// ============================================================================
// Health Check
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    type: 'mock-oauth-server',
    timestamp: new Date().toISOString(),
    endpoints: {
      authorize: '/authorize',
      token: '/token',
      api: '/api/me',
    },
  });
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`
🔐 Mock OAuth2 Server with PKCE Support
========================================
Server running on http://localhost:${PORT}

Endpoints:
  GET  /authorize    - Authorization endpoint
  POST /token        - Token endpoint
  GET  /api/me       - Protected API endpoint (requires Bearer token)
  GET  /health       - Health check

Test OAuth Flow:
  1. Start this server: npx ts-node mock-oauth-server.ts
  2. Start Cortex with a workflow using bit-oauth-mock
  3. Visit the OAuth URL printed in the terminal
  4. Click "Allow" on the consent page
  5. The callback will be handled automatically
`);
});
