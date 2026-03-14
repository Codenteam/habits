/**
 * Fetch binding
 * 
 * Provides cross-platform HTTP fetch that works in Node.js, browser, and Tauri.
 * In Node.js/Browser, uses the native fetch API.
 * In Tauri, uses @tauri-apps/plugin-http through globalThis.__TAURI__ (requires withGlobalTauri: true).
 */

import { isTauri, getTauriPlugin, type TauriHttpPlugin } from './runtime';

// ============================================================================
// Types
// ============================================================================

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | Record<string, unknown> | null;
  /** Timeout in milliseconds (Tauri only) */
  timeout?: number;
  /** Maximum redirects to follow (Tauri only) */
  maxRedirections?: number;
}

export interface FetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  url: string;
  redirected: boolean;
  text: () => Promise<string>;
  json: <T = unknown>() => Promise<T>;
  arrayBuffer: () => Promise<ArrayBuffer>;
  blob: () => Promise<Blob>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get Tauri HTTP plugin from globalThis.__TAURI__
 */
function getTauriHttp(): TauriHttpPlugin {
  return getTauriPlugin('http');
}

/**
 * Convert native Headers to a plain object for Tauri
 */
function headersToObject(headers?: HeadersInit): Record<string, string> | undefined {
  if (!headers) return undefined;
  
  if (headers instanceof Headers) {
    const obj: Record<string, string> = {};
    headers.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
  
  if (Array.isArray(headers)) {
    const obj: Record<string, string> = {};
    for (const [key, value] of headers) {
      obj[key] = value;
    }
    return obj;
  }
  
  return headers as Record<string, string>;
}

/**
 * Convert Tauri response to FetchResponse interface
 */
function wrapTauriResponse(response: Awaited<ReturnType<TauriHttpPlugin['fetch']>>): FetchResponse {
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText || '',
    headers: response.headers,
    url: response.url,
    redirected: response.redirected || false,
    text: () => response.text(),
    json: <T = unknown>() => response.json() as Promise<T>,
    arrayBuffer: () => response.arrayBuffer(),
    blob: () => response.blob(),
  };
}

/**
 * Convert native Response to FetchResponse interface
 */
function wrapNativeResponse(response: Response): FetchResponse {
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    url: response.url,
    redirected: response.redirected,
    text: () => response.text(),
    json: <T = unknown>() => response.json() as Promise<T>,
    arrayBuffer: () => response.arrayBuffer(),
    blob: () => response.blob(),
  };
}

// ============================================================================
// Primary Functions
// ============================================================================

/**
 * Fetch a resource from a URL
 * 
 * Works in Node.js, browser, and Tauri environments.
 * In Node.js/browser, uses native fetch.
 * In Tauri, uses @tauri-apps/plugin-http which bypasses CORS restrictions.
 * 
 * @param url - URL to fetch
 * @param options - Fetch options
 * @returns Response object
 * 
 * @example
 * ```typescript
 * const response = await fetch('https://api.example.com/data');
 * const data = await response.json();
 * ```
 * 
 * @example With options
 * ```typescript
 * const response = await fetch('https://api.example.com/data', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ key: 'value' }),
 *   timeout: 5000, // Tauri only
 * });
 * ```
 */
export async function fetch(url: string | URL, options: FetchOptions = {}): Promise<FetchResponse> {
  if (isTauri()) {
    return fetchTauri(url, options);
  }
  return fetchNative(url, options);
}

/**
 * Fetch using native browser/Node.js fetch
 */
async function fetchNative(url: string | URL, options: FetchOptions = {}): Promise<FetchResponse> {
  const { timeout, maxRedirections, body, ...nativeOptions } = options;
  
  // Handle body - if it's an object, stringify it
  let processedBody: BodyInit | null | undefined = undefined;
  if (body !== null && body !== undefined) {
    if (typeof body === 'object' && !(body instanceof ArrayBuffer) && !(body instanceof Blob) && 
        !(body instanceof FormData) && !(body instanceof URLSearchParams) &&
        !(body instanceof ReadableStream) && !ArrayBuffer.isView(body)) {
      processedBody = JSON.stringify(body);
    } else {
      processedBody = body as BodyInit;
    }
  }
  
  // Create abort controller for timeout
  let controller: AbortController | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  
  if (timeout) {
    controller = new AbortController();
    timeoutId = setTimeout(() => controller!.abort(), timeout);
  }
  
  try {
    const response = await globalThis.fetch(url, {
      ...nativeOptions,
      body: processedBody,
      signal: controller?.signal ?? options.signal,
    });
    
    return wrapNativeResponse(response);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Fetch using Tauri HTTP plugin
 * 
 * The Tauri HTTP plugin bypasses CORS restrictions and provides
 * additional options like timeout and max redirections.
 */
async function fetchTauri(url: string | URL, options: FetchOptions = {}): Promise<FetchResponse> {
  const http = getTauriHttp();
  const { timeout, maxRedirections, body, headers, ...restOptions } = options;
  
  // Handle body - if it's an object, stringify it
  let processedBody: BodyInit | undefined = undefined;
  if (body !== null && body !== undefined) {
    if (typeof body === 'object' && !(body instanceof ArrayBuffer) && !(body instanceof Blob) && 
        !(body instanceof FormData) && !(body instanceof URLSearchParams) &&
        !(body instanceof ReadableStream) && !ArrayBuffer.isView(body)) {
      processedBody = JSON.stringify(body);
    } else {
      processedBody = body as BodyInit;
    }
  }
  
  // Build Tauri fetch options
  const tauriOptions: RequestInit & { 
    timeout?: number; 
    maxRedirections?: number;
  } = {
    ...restOptions,
    body: processedBody,
    headers: headersToObject(headers),
  };
  
  // Add Tauri-specific options if provided
  if (timeout !== undefined) {
    tauriOptions.timeout = timeout;
  }
  if (maxRedirections !== undefined) {
    tauriOptions.maxRedirections = maxRedirections;
  }

  const response = await http.fetch(url.toString(), tauriOptions);
  return wrapTauriResponse(response);
}


