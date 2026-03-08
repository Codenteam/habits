/**
 * @ha-bits/bit-cookie
 * 
 * Cookie management bit for HTTP workflows.
 * Sets cookies via special __habitsResponseHeaders output that the server interprets.
 */

interface CookieContext {
  propsValue: Record<string, any>;
}

const cookieBit = {
  displayName: 'Cookie',
  description: 'Set and manage HTTP cookies in workflows',
  logoUrl: 'lucide:Cookie',
  
  actions: {
    /**
     * Set a cookie in the HTTP response
     */
    set: {
      name: 'set',
      displayName: 'Set Cookie',
      description: 'Set a cookie to be returned in the HTTP response',
      props: {
        name: {
          type: 'SHORT_TEXT',
          displayName: 'Cookie Name',
          description: 'Name of the cookie',
          required: true,
        },
        value: {
          type: 'LONG_TEXT',
          displayName: 'Cookie Value',
          description: 'Value to store in the cookie',
          required: true,
        },
        maxAge: {
          type: 'NUMBER',
          displayName: 'Max Age (seconds)',
          description: 'Cookie expiration in seconds (default: session cookie)',
          required: false,
        },
        path: {
          type: 'SHORT_TEXT',
          displayName: 'Path',
          description: 'Cookie path (default: /)',
          required: false,
          defaultValue: '/',
        },
        domain: {
          type: 'SHORT_TEXT',
          displayName: 'Domain',
          description: 'Cookie domain (optional)',
          required: false,
        },
        secure: {
          type: 'CHECKBOX',
          displayName: 'Secure',
          description: 'Only send cookie over HTTPS',
          required: false,
          defaultValue: false,
        },
        httpOnly: {
          type: 'CHECKBOX',
          displayName: 'HTTP Only',
          description: 'Prevent JavaScript access to the cookie',
          required: false,
          defaultValue: true,
        },
        sameSite: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Same Site',
          description: 'SameSite attribute for CSRF protection',
          required: false,
          defaultValue: 'Lax',
          options: {
            options: [
              { label: 'Strict', value: 'Strict' },
              { label: 'Lax', value: 'Lax' },
              { label: 'None', value: 'None' },
            ],
          },
        },
      },
      async run(context: CookieContext) {
        const { name, value, maxAge, path, domain, secure, httpOnly, sameSite } = context.propsValue;
        
        // Build the Set-Cookie header value
        let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
        
        if (maxAge !== undefined && maxAge !== null) {
          cookieString += `; Max-Age=${maxAge}`;
        }
        
        if (path) {
          cookieString += `; Path=${path}`;
        }
        
        if (domain) {
          cookieString += `; Domain=${domain}`;
        }
        
        if (secure) {
          cookieString += '; Secure';
        }
        
        if (httpOnly !== false) {
          cookieString += '; HttpOnly';
        }
        
        if (sameSite) {
          cookieString += `; SameSite=${sameSite}`;
        }
        
        console.log('Cookie Set', { name });
        
        // Return special format that server will interpret for response headers
        return {
          success: true,
          cookie: {
            name,
            path: path || '/',
            maxAge,
            secure: secure || false,
            httpOnly: httpOnly !== false,
            sameSite: sameSite || 'Lax',
          },
          __habitsResponseHeaders: {
            'Set-Cookie': cookieString,
          },
        };
      },
    },
    
    /**
     * Clear/delete a cookie
     */
    clear: {
      name: 'clear',
      displayName: 'Clear Cookie',
      description: 'Delete a cookie by setting it to expire immediately',
      props: {
        name: {
          type: 'SHORT_TEXT',
          displayName: 'Cookie Name',
          description: 'Name of the cookie to clear',
          required: true,
        },
        path: {
          type: 'SHORT_TEXT',
          displayName: 'Path',
          description: 'Cookie path (must match the original cookie path)',
          required: false,
          defaultValue: '/',
        },
        domain: {
          type: 'SHORT_TEXT',
          displayName: 'Domain',
          description: 'Cookie domain (must match the original cookie domain)',
          required: false,
        },
      },
      async run(context: CookieContext) {
        const { name, path, domain } = context.propsValue;
        
        // Build the Set-Cookie header to clear the cookie
        let cookieString = `${encodeURIComponent(name)}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        
        if (path) {
          cookieString += `; Path=${path}`;
        }
        
        if (domain) {
          cookieString += `; Domain=${domain}`;
        }
        
        console.log('Cookie Clear', { name });
        
        return {
          success: true,
          cleared: name,
          __habitsResponseHeaders: {
            'Set-Cookie': cookieString,
          },
        };
      },
    },
  },
  
  // Empty triggers
  triggers: {},
};

// Export the bit
export const cookie = cookieBit;
export default cookieBit;
