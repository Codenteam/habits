/**
 * Mock utilities for bit testing
 * 
 * NOTE: This module does NOT hardcode any dependency names.
 * All modules to mock or clear must be specified in test definitions.
 */

import { FetchMock, ModuleMock, StoreMock, MockFactory, MockFactoryRegistry, BitMock } from './types';

/**
 * Registry of mock factories for common SDKs
 * Users can register their own factories here
 */
export const mockFactories: MockFactoryRegistry = {};

/**
 * Register a mock factory for an SDK
 * The factory receives the mock fetch function and returns a module mock
 */
export function registerMockFactory(moduleName: string, factory: MockFactory): void {
  mockFactories[moduleName] = factory;
}

/**
 * Create a mock fetch response
 */
export function mockFetch(response: any, options?: Partial<FetchMock>): FetchMock {
  return {
    url: '*',
    status: 200,
    response,
    responseType: 'json',
    ...options,
  };
}

/**
 * Create a fetch mock for a specific URL pattern
 */
mockFetch.forUrl = (url: string, response: any, options?: Partial<FetchMock>): FetchMock => ({
  url,
  status: 200,
  response,
  responseType: 'json',
  ...options,
});

/**
 * Create a mock store with initial data
 */
export function mockStore(initial: Record<string, any> = {}): StoreMock {
  return { initial };
}

/**
 * Mock an entire npm module
 */
export function mockModule(moduleName: string, exports: Record<string, any>, clearSubmodules = true): ModuleMock {
  return {
    __type: 'module_mock',
    moduleName,
    exports,
    clearSubmodules,
  };
}

/**
 * Normalize a module mock input - adds __type and __esModule automatically
 */
export function normalizeModuleMock(input: { moduleName: string; exports: Record<string, any>; clearSubmodules?: boolean }): ModuleMock {
  const exports = { ...input.exports };
  
  // Auto-add __esModule if there's a default export
  if ('default' in exports && !('__esModule' in exports)) {
    exports.__esModule = true;
  }
  
  return {
    __type: 'module_mock',
    moduleName: input.moduleName,
    exports,
    clearSubmodules: input.clearSubmodules ?? true,
  };
}

/**
 * Check if modules config is array format or object (declarative) format
 */
export function isDeclarativeModuleMocks(config: any): config is Record<string, Record<string, any>> {
  return config && !Array.isArray(config) && typeof config === 'object';
}

/**
 * Convert declarative module mocks (YAML object format) to module mocks
 * 
 * Input format: { openai: { 'chat.completions.create': { choices: [...] } } }
 * Creates a mock class that returns the specified value for each method path.
 */
export function declarativeToModuleMocks(declarativeMocks: Record<string, Record<string, any>>): ModuleMock[] {
  const moduleMocks: ModuleMock[] = [];
  
  for (const [moduleName, methods] of Object.entries(declarativeMocks)) {
    // Build the mock structure from method paths
    const mockStructure: Record<string, any> = {};
    
    for (const [methodPath, returnValue] of Object.entries(methods)) {
      const parts = methodPath.split('.');
      let current = mockStructure;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      
      // Final part is the method - make it async and return the value
      const finalPart = parts[parts.length - 1];
      current[finalPart] = async () => returnValue;
    }
    
    // Create a class that has this structure
    const MockClass = class {
      constructor(_config?: any) {
        // Copy the mock structure to the instance
        Object.assign(this, JSON.parse(JSON.stringify(mockStructure)));
        // Re-attach the async methods (JSON.stringify loses functions)
        this._attachMethods(mockStructure, this);
      }
      
      _attachMethods(source: any, target: any) {
        for (const key of Object.keys(source)) {
          if (typeof source[key] === 'function') {
            target[key] = source[key];
          } else if (typeof source[key] === 'object' && source[key] !== null) {
            if (!target[key]) target[key] = {};
            this._attachMethods(source[key], target[key]);
          }
        }
      }
    };
    
    moduleMocks.push(normalizeModuleMock({
      moduleName,
      exports: { default: MockClass },
    }));
  }
  
  return moduleMocks;
}

/**
 * Normalize modules config - handles both array and object (declarative) formats
 * Returns an array of ModuleMock objects
 */
export function normalizeModulesConfig(config: any): ModuleMock[] {
  if (!config) return [];
  
  if (isDeclarativeModuleMocks(config)) {
    // Object format: { openai: { 'chat.completions.create': {...} } }
    return declarativeToModuleMocks(config);
  } else if (Array.isArray(config)) {
    // Array format: [{ moduleName: 'openai', exports: {...} }]
    return config.map(normalizeModuleMock);
  }
  
  return [];
}

/**
 * Create a bit mock for workflow testing
 */
export function mockBit(bit: string, response: any, options?: Partial<BitMock>): BitMock {
  return {
    bit,
    response,
    ...options,
  };
}

/**
 * Create a mock store instance from StoreMock config
 */
export function createMockStoreInstance(config: StoreMock) {
  const data = { ...config.initial };
  
  return {
    data,
    get: async <T>(key: string): Promise<T | null> => {
      return (data[key] as T) ?? null;
    },
    put: async <T>(key: string, value: T): Promise<void> => {
      data[key] = value;
    },
    delete: async (key: string): Promise<void> => {
      delete data[key];
    },
  };
}

/**
 * URL pattern matching (supports * wildcards)
 */
export function matchUrl(pattern: string, url: string): boolean {
  if (pattern === '*') return true;
  
  // Convert pattern to regex
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special chars except *
    .replace(/\*/g, '.*'); // Convert * to .*
  
  return new RegExp(`^${regexPattern}$`).test(url);
}

/**
 * Clear specified modules from require cache
 * This forces fresh loading with mocked dependencies
 */
export function clearModulesFromCache(moduleNames: string[], basePaths?: string[]) {
  for (const moduleName of moduleNames) {
    try {
      // Try to resolve the module
      let resolvedPath: string | null = null;
      if (basePaths) {
        for (const basePath of basePaths) {
          try {
            resolvedPath = require.resolve(moduleName, { paths: [basePath] });
            break;
          } catch { continue; }
        }
      }
      if (!resolvedPath) {
        try {
          resolvedPath = require.resolve(moduleName);
        } catch { continue; }
      }
      
      // Clear the main module
      delete require.cache[resolvedPath];
      
      // Clear any submodules
      for (const key of Object.keys(require.cache)) {
        if (key.includes(`/${moduleName}/`)) {
          delete require.cache[key];
        }
      }
    } catch {
      // Module not installed, skip
    }
  }
}

/**
 * Create a fetch interceptor that uses mock definitions
 * Generic - works with any HTTP library that uses fetch
 */
export function createFetchInterceptor(mocks: FetchMock[], options?: { 
  /** Modules to replace with mock fetch (e.g., node-fetch) */
  httpModules?: string[];
  /** Modules to clear from cache so they reload with new global fetch (e.g., openai) */
  clearModules?: string[];
}) {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; options: any }> = [];
  
  const mockFetchFn = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';
    
    calls.push({ url, options: init });
    
    // Find matching mock
    const mock = mocks.find(m => {
      const urlMatch = matchUrl(m.url, url);
      const methodMatch = !m.method || m.method.toUpperCase() === method.toUpperCase();
      return urlMatch && methodMatch;
    });
    
    if (!mock) {
      throw new Error(`No mock found for ${method} ${url}`);
    }
    
    // If there's an assertRequest, verify the request body
    if (mock.assertRequest && init?.body) {
      const body = JSON.parse(init.body as string);
      for (const [key, expected] of Object.entries(mock.assertRequest)) {
        const actual = body[key];
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(
            `Request assertion failed for "${key}":\n` +
            `Expected: ${JSON.stringify(expected)}\n` +
            `Actual: ${JSON.stringify(actual)}`
          );
        }
      }
    }
    
    // Build response
    const status = mock.status || 200;
    const ok = status >= 200 && status < 300;
    
    if (!ok) {
      return new Response(
        typeof mock.response === 'string' ? mock.response : JSON.stringify(mock.response),
        { status, statusText: `Error ${status}` }
      );
    }
    
    if (mock.responseType === 'arraybuffer') {
      const buffer = Buffer.from(mock.response, 'base64');
      return new Response(buffer, { status });
    }
    
    return new Response(JSON.stringify(mock.response), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  
  // Track mocked modules for restoration
  const mockedModules: Array<{ path: string; original: any }> = [];
  
  return {
    install: (basePath?: string) => {
      // Mock globalThis.fetch
      (globalThis as any).fetch = mockFetchFn;
      
      const paths = basePath ? [basePath] : undefined;
      
      // Mock HTTP modules (replace with fetch-forwarding mock)
      const httpModulesToMock = options?.httpModules || [];
      for (const moduleName of httpModulesToMock) {
        try {
          const resolvedPath = require.resolve(moduleName, { paths });
          
          // Save original
          if (require.cache[resolvedPath]) {
            mockedModules.push({ path: resolvedPath, original: require.cache[resolvedPath] });
          }
          
          // Clear main module and submodules
          delete require.cache[resolvedPath];
          for (const key of Object.keys(require.cache)) {
            if (key.includes(`/${moduleName}/`)) {
              if (!mockedModules.find(m => m.path === key)) {
                mockedModules.push({ path: key, original: require.cache[key] });
              }
              delete require.cache[key];
            }
          }
          
          // Install mock for node-fetch style modules
          // @ts-ignore
          require.cache[resolvedPath] = {
            id: resolvedPath,
            filename: resolvedPath,
            loaded: true,
            exports: Object.assign(mockFetchFn, {
              default: mockFetchFn,
              Headers: globalThis.Headers || class Headers {},
              Request: globalThis.Request || class Request {},
              Response: globalThis.Response || class Response {},
            }),
          };
        } catch {
          // Module not installed, skip
        }
      }
      
      // Clear modules from cache (let them reload with new global fetch)
      const modulesToClear = options?.clearModules || [];
      for (const moduleName of modulesToClear) {
        try {
          const resolvedPath = require.resolve(moduleName, { paths });
          
          // Save original and clear
          if (require.cache[resolvedPath]) {
            mockedModules.push({ path: resolvedPath, original: require.cache[resolvedPath] });
            delete require.cache[resolvedPath];
          }
          
          // Clear submodules too
          for (const key of Object.keys(require.cache)) {
            if (key.includes(`/${moduleName}/`)) {
              if (!mockedModules.find(m => m.path === key)) {
                mockedModules.push({ path: key, original: require.cache[key] });
              }
              delete require.cache[key];
            }
          }
        } catch {
          // Module not installed, skip
        }
      }
    },
    restore: () => {
      (globalThis as any).fetch = originalFetch;
      
      // Restore all mocked modules
      for (const { path, original } of mockedModules) {
        if (original) {
          require.cache[path] = original;
        } else {
          delete require.cache[path];
        }
      }
      mockedModules.length = 0;
    },
    getCalls: () => calls,
    mockFetch: mockFetchFn,
  };
}

/**
 * Apply module mocks by manipulating require cache
 */
export function applyModuleMocks(mocks: ModuleMock[], basePaths?: string[]) {
  const originalModules: Record<string, any> = {};
  const resolvedPaths: Record<string, string> = {};
  
  for (const mock of mocks) {
    try {
      // Try to resolve from provided paths first, then default
      let resolvedPath: string | null = null;
      
      if (basePaths) {
        for (const basePath of basePaths) {
          try {
            resolvedPath = require.resolve(mock.moduleName, { paths: [basePath] });
            break;
          } catch {
            continue;
          }
        }
      }
      
      if (!resolvedPath) {
        resolvedPath = require.resolve(mock.moduleName);
      }
      
      resolvedPaths[mock.moduleName] = resolvedPath;
      
      // Clear ALL related modules from cache (for SDKs with submodules)
      if (mock.clearSubmodules !== false) {
        for (const key of Object.keys(require.cache)) {
          if (key.includes(`/${mock.moduleName}/`) || key.endsWith(`/${mock.moduleName}`)) {
            if (!originalModules[key]) {
              originalModules[key] = require.cache[key];
            }
            delete require.cache[key];
          }
        }
      }
      
      if (require.cache[resolvedPath]) {
        originalModules[mock.moduleName] = require.cache[resolvedPath];
      }
      
      // @ts-ignore - Simplified mock module
      require.cache[resolvedPath] = {
        id: resolvedPath,
        filename: resolvedPath,
        loaded: true,
        exports: mock.exports,
      };
    } catch {
      // Module not found, skip
    }
  }
  
  return () => {
    for (const mock of mocks) {
      try {
        const resolvedPath = resolvedPaths[mock.moduleName];
        if (!resolvedPath) continue;
        
        if (originalModules[mock.moduleName]) {
          require.cache[resolvedPath] = originalModules[mock.moduleName];
        } else {
          delete require.cache[resolvedPath];
        }
        
        // Restore any related submodules
        for (const [key, value] of Object.entries(originalModules)) {
          if (key.includes(`/${mock.moduleName}/`)) {
            if (value) {
              require.cache[key] = value;
            }
          }
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  };
}

/**
 * Create bit mocks interceptor for workflow testing
 * Returns a function that wraps bit execution and returns mocked responses
 */
export function createBitMockInterceptor(mocks: BitMock[]) {
  return (bitName: string, actionName: string, input: any): { mocked: boolean; response?: any } => {
    const mock = mocks.find(m => {
      const bitMatch = m.bit === bitName || m.bit === actionName;
      const actionMatch = !m.action || m.action === actionName;
      return bitMatch && actionMatch;
    });
    
    if (!mock) {
      return { mocked: false };
    }
    
    // Assert input if specified
    if (mock.assertInput) {
      for (const [key, expected] of Object.entries(mock.assertInput)) {
        const actual = input[key];
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(
            `Bit mock input assertion failed for "${key}":\n` +
            `Expected: ${JSON.stringify(expected)}\n` +
            `Actual: ${JSON.stringify(actual)}`
          );
        }
      }
    }
    
    return { mocked: true, response: mock.response };
  };
}
