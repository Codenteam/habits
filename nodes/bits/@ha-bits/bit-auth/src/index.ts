/**
 * @ha-bits/bit-auth
 * 
 * Authentication bit for JWT operations: sign, verify, and decode.
 * Provides secure token handling for workflow authentication.
 */

import * as jwt from 'jsonwebtoken';

interface AuthContext {
  propsValue: Record<string, any>;
}

const authBit = {
  displayName: 'Authentication',
  description: 'JWT sign, verify, and decode operations for authentication',
  logoUrl: 'lucide:Shield',
  runtime: 'all',
  
  actions: {
    /**
     * Sign a JWT token
     */
    sign: {
      name: 'sign',
      displayName: 'Sign JWT',
      description: 'Create a signed JWT token with the provided payload',
      props: {
        payload: {
          type: 'JSON',
          displayName: 'Payload',
          description: 'The data to include in the token (JSON object)',
          required: true,
        },
        secret: {
          type: 'SECRET_TEXT',
          displayName: 'Secret',
          description: 'Secret key for signing the token',
          required: true,
        },
        expiresIn: {
          type: 'SHORT_TEXT',
          displayName: 'Expires In',
          description: 'Token expiration (e.g., "1h", "7d", "30m")',
          required: false,
          defaultValue: '1h',
        },
        algorithm: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Algorithm',
          description: 'Signing algorithm',
          required: false,
          defaultValue: 'HS256',
          options: {
            options: [
              { label: 'HS256', value: 'HS256' },
              { label: 'HS384', value: 'HS384' },
              { label: 'HS512', value: 'HS512' },
            ],
          },
        },
        issuer: {
          type: 'SHORT_TEXT',
          displayName: 'Issuer',
          description: 'Token issuer (iss claim)',
          required: false,
        },
        audience: {
          type: 'SHORT_TEXT',
          displayName: 'Audience',
          description: 'Token audience (aud claim)',
          required: false,
        },
      },
      async run(context: AuthContext) {
        const { payload, secret, expiresIn, algorithm, issuer, audience } = context.propsValue;
        
        let parsedPayload = payload;
        if (typeof payload === 'string') {
          try {
            parsedPayload = JSON.parse(payload);
          } catch {
            parsedPayload = { data: payload };
          }
        }
        
        const options: jwt.SignOptions = {
          expiresIn: expiresIn || '1h',
          algorithm: (algorithm || 'HS256') as jwt.Algorithm,
        };
        
        if (issuer) options.issuer = issuer;
        if (audience) options.audience = audience;
        
        try {
          const token = jwt.sign(parsedPayload, secret, options);
          console.log(`🔐 JWT Sign: token created successfully`);
          
          return {
            success: true,
            token,
            expiresIn: expiresIn || '1h',
          };
        } catch (error: any) {
          console.error(`🔐 JWT Sign Error: ${error.message}`);
          return {
            success: false,
            error: error.message,
          };
        }
      },
    },
    
    /**
     * Verify and decode a JWT token
     */
    verify: {
      name: 'verify',
      displayName: 'Verify JWT',
      description: 'Verify a JWT token signature and decode the payload',
      props: {
        token: {
          type: 'LONG_TEXT',
          displayName: 'Token',
          description: 'The JWT token to verify',
          required: true,
        },
        secret: {
          type: 'SECRET_TEXT',
          displayName: 'Secret',
          description: 'Secret key used to sign the token',
          required: true,
        },
        ignoreExpiration: {
          type: 'CHECKBOX',
          displayName: 'Ignore Expiration',
          description: 'If true, do not validate the expiration of the token',
          required: false,
          defaultValue: false,
        },
        algorithms: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Algorithms',
          description: 'Allowed signing algorithms',
          required: false,
          defaultValue: 'HS256',
          options: {
            options: [
              { label: 'HS256', value: 'HS256' },
              { label: 'HS384', value: 'HS384' },
              { label: 'HS512', value: 'HS512' },
            ],
          },
        },
        issuer: {
          type: 'SHORT_TEXT',
          displayName: 'Issuer',
          description: 'Expected token issuer (iss claim)',
          required: false,
        },
        audience: {
          type: 'SHORT_TEXT',
          displayName: 'Audience',
          description: 'Expected token audience (aud claim)',
          required: false,
        },
      },
      async run(context: AuthContext) {
        const { token, secret, ignoreExpiration, algorithms, issuer, audience } = context.propsValue;
        
        const options: jwt.VerifyOptions = {
          algorithms: [(algorithms || 'HS256') as jwt.Algorithm],
          ignoreExpiration: ignoreExpiration || false,
        };
        
        if (issuer) options.issuer = issuer;
        if (audience) options.audience = audience;
        
        try {
          const decoded = jwt.verify(token, secret, options);
          console.log(`🔐 JWT Verify: token verified successfully`);
          
          return {
            valid: true,
            payload: decoded,
          };
        } catch (error: any) {
          console.error(`🔐 JWT Verify Error: ${error.message}`);
          return {
            valid: false,
            error: error.message,
            errorCode: error.name,
          };
        }
      },
    },
    
    /**
     * Decode a JWT token without verification
     */
    decode: {
      name: 'decode',
      displayName: 'Decode JWT',
      description: 'Decode a JWT token without verifying the signature (use for inspection only)',
      props: {
        token: {
          type: 'LONG_TEXT',
          displayName: 'Token',
          description: 'The JWT token to decode',
          required: true,
        },
        complete: {
          type: 'CHECKBOX',
          displayName: 'Complete',
          description: 'If true, return the complete token with header',
          required: false,
          defaultValue: false,
        },
      },
      async run(context: AuthContext) {
        const { token, complete } = context.propsValue;
        
        try {
          const decoded = jwt.decode(token, { complete: complete || false });
          
          if (!decoded) {
            console.log(`🔐 JWT Decode: invalid token format`);
            return {
              success: false,
              error: 'Invalid token format',
            };
          }
          
          console.log(`🔐 JWT Decode: token decoded successfully`);
          
          if (complete) {
            return {
              success: true,
              header: (decoded as jwt.Jwt).header,
              payload: (decoded as jwt.Jwt).payload,
              signature: (decoded as jwt.Jwt).signature,
            };
          }
          
          return {
            success: true,
            payload: decoded,
          };
        } catch (error: any) {
          console.error(`🔐 JWT Decode Error: ${error.message}`);
          return {
            success: false,
            error: error.message,
          };
        }
      },
    },
  },
  
  // Empty triggers
  triggers: {},
};

// Export the bit
export const auth = authBit;
export default authBit;
