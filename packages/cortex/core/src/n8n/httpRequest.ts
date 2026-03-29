/**
 * HTTP Request utilities for n8n node execution
 */

import { fetch } from '@ha-bits/bindings';
import FormData from 'form-data';
import {
  IHttpRequestOptions,
  IN8nHttpFullResponse,
  IN8nHttpResponse,
} from './types';
import { LoggerFactory } from '@ha-bits/core/logger';

const logger = LoggerFactory.getRoot();

/**
 * Build URL with query parameters and base URL
 */
function buildUrl(url: string, baseURL?: string, qs?: Record<string, any>): string {
  let fullUrl = url;
  
  // Resolve base URL
  if (baseURL && !url.startsWith('http://') && !url.startsWith('https://')) {
    fullUrl = baseURL.replace(/\/$/, '') + '/' + url.replace(/^\//, '');
  }
  
  // Add query parameters
  if (qs && Object.keys(qs).length > 0) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(qs)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
    fullUrl += (fullUrl.includes('?') ? '&' : '?') + params.toString();
  }
  
  return fullUrl;
}

/**
 * Prepare request body for fetch
 */
function prepareBody(body: any, headers: Record<string, string>): BodyInit | undefined {
  if (!body) return undefined;
  
  if (body instanceof FormData) {
    // FormData - set headers from form-data package
    const formHeaders = body.getHeaders();
    Object.assign(headers, formHeaders);
    return body as any;
  }
  
  if (body instanceof URLSearchParams) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    return body.toString();
  }
  
  if (typeof body === 'object' && Object.keys(body).length > 0) {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return JSON.stringify(body);
  }
  
  if (typeof body === 'string') {
    return body;
  }
  
  return undefined;
}

/**
 * Execute HTTP request
 */
export async function httpRequest(
  requestOptions: IHttpRequestOptions
): Promise<IN8nHttpFullResponse | IN8nHttpResponse> {
  // Remove empty body for GET/HEAD/OPTIONS
  const noBodyMethods = ['GET', 'HEAD', 'OPTIONS'];
  const method = (requestOptions.method || 'GET').toUpperCase();
  if (noBodyMethods.includes(method) && requestOptions.body && Object.keys(requestOptions.body).length === 0) {
    delete requestOptions.body;
  }

  const headers: Record<string, string> = {
    ...(requestOptions.headers as Record<string, string>) ?? {},
  };
  
  // Add authentication
  if (requestOptions.auth) {
    const credentials = Buffer.from(
      `${requestOptions.auth.username || ''}:${requestOptions.auth.password || ''}`
    ).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }
  
  // Add JSON accept header if requested
  if (requestOptions.json) {
    headers['Accept'] = 'application/json';
  }
  
  // Add User-Agent header
  if (!headers['User-Agent']) {
    headers['User-Agent'] = 'n8n-habits-executor';
  }
  
  // Build full URL
  const url = buildUrl(requestOptions.url, requestOptions.baseURL, requestOptions.qs);
  
  // Prepare body (skip for GET requests)
  let body: BodyInit | undefined;
  if (!noBodyMethods.includes(method)) {
    body = prepareBody(requestOptions.body, headers);
  }

  logger.log(`🌐 Making HTTP request: ${method} ${url}`);
  
  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      redirect: requestOptions.disableFollowRedirect ? 'manual' : 'follow',
    });

    // Handle response based on encoding
    let responseData: any;
    const contentType = response.headers.get('content-type') || '';
    
    if (requestOptions.encoding === 'arraybuffer' || contentType.includes('application/octet-stream')) {
      responseData = await response.arrayBuffer();
    } else if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
      // Try to parse as JSON if it looks like JSON
      try {
        responseData = JSON.parse(responseData);
      } catch {
        // Keep as text
      }
    }

    // Check for HTTP errors unless ignoreHttpStatusErrors is set
    if (!response.ok && !requestOptions.ignoreHttpStatusErrors) {
      logger.error(`HTTP Error (${response.status}): ${JSON.stringify(responseData)}`);
      throw new Error(`HTTP Error (${response.status}): ${JSON.stringify(responseData)}`);
    }

    if (requestOptions.returnFullResponse) {
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      return {
        body: responseData,
        headers: responseHeaders,
        statusCode: response.status,
        statusMessage: response.statusText,
      };
    }

    return responseData;
  } catch (error: any) {
    if (error.message?.startsWith('HTTP Error')) {
      throw error;
    }
    logger.error(`Request failed: ${error.message}`);
    throw error;
  }
}

/**
 * Legacy function - kept for compatibility but now builds fetch-compatible config
 * @deprecated Use httpRequest directly
 */
export function convertN8nRequestToAxios(requestOptions: IHttpRequestOptions): {
  method: string;
  url: string;
  headers: Record<string, string>;
  data?: any;
  params?: Record<string, any>;
  baseURL?: string;
} {
  const { headers, method, auth, url, body, qs } = requestOptions;

  const config: {
    method: string;
    url: string;
    headers: Record<string, string>;
    data?: any;
    params?: Record<string, any>;
    baseURL?: string;
  } = {
    headers: (headers as Record<string, string>) ?? {},
    method: method || 'GET',
    url,
  };

  if (qs) {
    config.params = qs;
  }

  if (auth) {
    const credentials = Buffer.from(`${auth.username || ''}:${auth.password || ''}`).toString('base64');
    config.headers['Authorization'] = `Basic ${credentials}`;
  }

  if (requestOptions.baseURL) {
    config.baseURL = requestOptions.baseURL;
  }

  if (body) {
    if (typeof body === 'object' && Object.keys(body).length > 0) {
      config.data = body;
    } else if (typeof body === 'string') {
      config.data = body;
    }
  }

  if (requestOptions.json) {
    config.headers['Accept'] = 'application/json';
  }

  if (!config.headers['User-Agent']) {
    config.headers['User-Agent'] = 'n8n-habits-executor';
  }

  return config;
}
