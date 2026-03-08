/**
 * @ha-bits/bit-http
 * 
 * HTTP request bit for making web API calls.
 * Supports GET, POST, PUT, PATCH, DELETE with various auth methods.
 */

interface HttpContext {
  propsValue: Record<string, any>;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  text: string;
  ok: boolean;
}

/**
 * Parse headers from various formats
 */
function parseHeaders(headers: any): Record<string, string> {
  if (!headers) return {};
  if (typeof headers === 'string') {
    try {
      return JSON.parse(headers);
    } catch {
      // Parse as header string format: "Key: Value\nKey2: Value2"
      const result: Record<string, string> = {};
      headers.split('\n').forEach((line: string) => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
          result[key.trim()] = valueParts.join(':').trim();
        }
      });
      return result;
    }
  }
  return headers;
}

const httpBit = {
  displayName: 'HTTP Request',
  description: 'Make HTTP requests to any API endpoint',
  logoUrl: 'lucide:Globe',
  
  actions: {
    /**
     * Make an HTTP request
     */
    request: {
      name: 'request',
      displayName: 'HTTP Request',
      description: 'Make an HTTP request to any URL',
      props: {
        url: {
          type: 'SHORT_TEXT',
          displayName: 'URL',
          description: 'The URL to request',
          required: true,
        },
        method: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Method',
          description: 'HTTP method',
          required: true,
          defaultValue: 'GET',
          options: {
            options: [
              { label: 'GET', value: 'GET' },
              { label: 'POST', value: 'POST' },
              { label: 'PUT', value: 'PUT' },
              { label: 'PATCH', value: 'PATCH' },
              { label: 'DELETE', value: 'DELETE' },
              { label: 'HEAD', value: 'HEAD' },
              { label: 'OPTIONS', value: 'OPTIONS' },
            ],
          },
        },
        headers: {
          type: 'JSON',
          displayName: 'Headers',
          description: 'Request headers as JSON object',
          required: false,
          defaultValue: '{}',
        },
        body: {
          type: 'LONG_TEXT',
          displayName: 'Body',
          description: 'Request body (for POST/PUT/PATCH)',
          required: false,
        },
        bodyType: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Body Type',
          description: 'Content type for request body',
          required: false,
          defaultValue: 'json',
          options: {
            options: [
              { label: 'JSON', value: 'json' },
              { label: 'Form Data', value: 'form' },
              { label: 'Text', value: 'text' },
              { label: 'Raw', value: 'raw' },
            ],
          },
        },
        timeout: {
          type: 'NUMBER',
          displayName: 'Timeout (ms)',
          description: 'Request timeout in milliseconds',
          required: false,
          defaultValue: 30000,
        },
        followRedirects: {
          type: 'CHECKBOX',
          displayName: 'Follow Redirects',
          description: 'Automatically follow HTTP redirects',
          required: false,
          defaultValue: true,
        },
        authType: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Authentication',
          description: 'Authentication method',
          required: false,
          defaultValue: 'none',
          options: {
            options: [
              { label: 'None', value: 'none' },
              { label: 'Bearer Token', value: 'bearer' },
              { label: 'Basic Auth', value: 'basic' },
              { label: 'API Key', value: 'apikey' },
            ],
          },
        },
        authValue: {
          type: 'SECRET_TEXT',
          displayName: 'Auth Value',
          description: 'Token, password, or API key',
          required: false,
        },
        authUser: {
          type: 'SHORT_TEXT',
          displayName: 'Auth Username',
          description: 'Username for Basic Auth',
          required: false,
        },
        apiKeyHeader: {
          type: 'SHORT_TEXT',
          displayName: 'API Key Header',
          description: 'Header name for API Key auth',
          required: false,
          defaultValue: 'X-API-Key',
        },
      },
      async run(context: HttpContext) {
        const { 
          url, method = 'GET', headers, body, bodyType = 'json',
          timeout = 30000, authType = 'none', authValue, authUser, apiKeyHeader
        } = context.propsValue;
        
        if (!url) {
          throw new Error('URL is required');
        }
        
        // Build headers
        const reqHeaders: Record<string, string> = parseHeaders(headers);
        
        // Add auth headers
        if (authType === 'bearer' && authValue) {
          reqHeaders['Authorization'] = `Bearer ${authValue}`;
        } else if (authType === 'basic' && authUser && authValue) {
          const encoded = Buffer.from(`${authUser}:${authValue}`).toString('base64');
          reqHeaders['Authorization'] = `Basic ${encoded}`;
        } else if (authType === 'apikey' && authValue) {
          reqHeaders[apiKeyHeader || 'X-API-Key'] = authValue;
        }
        
        // Build request options
        const options: RequestInit = {
          method: method as string,
          headers: reqHeaders,
        };
        
        // Add body for appropriate methods
        if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
          if (bodyType === 'json') {
            reqHeaders['Content-Type'] = reqHeaders['Content-Type'] || 'application/json';
            options.body = typeof body === 'string' ? body : JSON.stringify(body);
          } else if (bodyType === 'form') {
            reqHeaders['Content-Type'] = reqHeaders['Content-Type'] || 'application/x-www-form-urlencoded';
            if (typeof body === 'object') {
              options.body = new URLSearchParams(body).toString();
            } else {
              options.body = body;
            }
          } else {
            options.body = body;
          }
        }
        
        console.log(`🌐 HTTP ${method}: ${url}`);
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), Number(timeout));
        options.signal = controller.signal;
        
        try {
          const response = await fetch(url, options);
          clearTimeout(timeoutId);
          
          // Get response headers
          const respHeaders: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            respHeaders[key] = value;
          });
          
          // Get response body
          const contentType = response.headers.get('content-type') || '';
          let respBody: any;
          const respText = await response.text();
          
          if (contentType.includes('application/json')) {
            try {
              respBody = JSON.parse(respText);
            } catch {
              respBody = respText;
            }
          } else {
            respBody = respText;
          }
          
          console.log(`🌐 HTTP Response: ${response.status} ${response.statusText}`);
          
          return {
            status: response.status,
            statusText: response.statusText,
            headers: respHeaders,
            body: respBody,
            text: respText,
            ok: response.ok,
          };
        } catch (error: any) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeout}ms`);
          }
          throw error;
        }
      },
    },
    
    /**
     * GET request shorthand
     */
    get: {
      name: 'get',
      displayName: 'GET Request',
      description: 'Make a GET request',
      props: {
        url: {
          type: 'SHORT_TEXT',
          displayName: 'URL',
          description: 'The URL to request',
          required: true,
        },
        headers: {
          type: 'JSON',
          displayName: 'Headers',
          description: 'Request headers',
          required: false,
          defaultValue: '{}',
        },
        queryParams: {
          type: 'JSON',
          displayName: 'Query Parameters',
          description: 'URL query parameters as JSON',
          required: false,
          defaultValue: '{}',
        },
      },
      async run(context: HttpContext) {
        const { url, headers, queryParams } = context.propsValue;
        
        let finalUrl = url;
        if (queryParams) {
          const params = typeof queryParams === 'string' ? JSON.parse(queryParams) : queryParams;
          const searchParams = new URLSearchParams(params);
          const separator = url.includes('?') ? '&' : '?';
          finalUrl = `${url}${separator}${searchParams.toString()}`;
        }
        
        const reqHeaders = parseHeaders(headers);
        
        console.log(`🌐 HTTP GET: ${finalUrl}`);
        
        const response = await fetch(finalUrl, { headers: reqHeaders });
        const text = await response.text();
        let body: any = text;
        
        try {
          body = JSON.parse(text);
        } catch {}
        
        return {
          status: response.status,
          ok: response.ok,
          body,
          text,
        };
      },
    },
    
    /**
     * POST request shorthand
     */
    post: {
      name: 'post',
      displayName: 'POST Request',
      description: 'Make a POST request with JSON body',
      props: {
        url: {
          type: 'SHORT_TEXT',
          displayName: 'URL',
          description: 'The URL to request',
          required: true,
        },
        body: {
          type: 'JSON',
          displayName: 'Body',
          description: 'JSON request body',
          required: true,
        },
        headers: {
          type: 'JSON',
          displayName: 'Headers',
          description: 'Request headers',
          required: false,
          defaultValue: '{}',
        },
      },
      async run(context: HttpContext) {
        const { url, body, headers } = context.propsValue;
        
        const reqHeaders = {
          'Content-Type': 'application/json',
          ...parseHeaders(headers),
        };
        
        const reqBody = typeof body === 'string' ? body : JSON.stringify(body);
        
        console.log(`🌐 HTTP POST: ${url}`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: reqHeaders,
          body: reqBody,
        });
        
        const text = await response.text();
        let respBody: any = text;
        
        try {
          respBody = JSON.parse(text);
        } catch {}
        
        return {
          status: response.status,
          ok: response.ok,
          body: respBody,
          text,
        };
      },
    },
    
    /**
     * Fetch web page content
     */
    fetchPage: {
      name: 'fetchPage',
      displayName: 'Fetch Web Page',
      description: 'Fetch HTML content from a web page',
      props: {
        url: {
          type: 'SHORT_TEXT',
          displayName: 'URL',
          description: 'The web page URL',
          required: true,
        },
        userAgent: {
          type: 'SHORT_TEXT',
          displayName: 'User Agent',
          description: 'Custom User-Agent header',
          required: false,
          defaultValue: 'Mozilla/5.0 (compatible; Habits/1.0)',
        },
        extractText: {
          type: 'CHECKBOX',
          displayName: 'Extract Text Only',
          description: 'Strip HTML tags and return text only',
          required: false,
          defaultValue: false,
        },
      },
      async run(context: HttpContext) {
        const { url, userAgent, extractText } = context.propsValue;
        
        console.log(`🌐 Fetching page: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': userAgent || 'Mozilla/5.0 (compatible; Habits/1.0)',
          },
        });
        
        let html = await response.text();
        let text = html;
        
        if (extractText) {
          // Simple HTML to text conversion
          text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
        
        return {
          status: response.status,
          ok: response.ok,
          html,
          text: extractText ? text : undefined,
          url: response.url,
          contentType: response.headers.get('content-type'),
        };
      },
    },
  },
  
  triggers: {},
};

export const http = httpBit;
export default httpBit;
