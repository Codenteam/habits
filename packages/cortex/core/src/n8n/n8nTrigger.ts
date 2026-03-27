import { inspect } from 'node:util';
import { getModuleName } from '../utils/moduleLoader';
import { getModuleMainFile, getModulePath, ModuleDefinition } from '../utils/moduleCloner';
import { INodeType, ITriggerFunctions, ITriggerResponse, IPollFunctions, IWebhookFunctions, IWebhookResponseData, IHttpRequestOptions, INodeExecutionData } from './types';
import * as path from 'path';
import * as fs from 'fs';
import { fetch } from '@ha-bits/bindings';
import { LoggerFactory } from '@ha-bits/core';

const logger = LoggerFactory.getRoot();

// ============================================================================
// Types
// ============================================================================

export enum TriggerHookType {
  TRIGGER = 'TRIGGER',
  POLL = 'POLL',
  WEBHOOK = 'WEBHOOK',
  TEST = 'TEST',
}

export interface TriggerExecutionParams {
  moduleDefinition: ModuleDefinition;
  triggerName?: string;
  input: Record<string, any>;
  hookType: TriggerHookType;
  payload?: unknown;
  webhookUrl?: string;
  isTest?: boolean;
}

export interface TriggerExecutionResult {
  success: boolean;
  output?: unknown[];
  message?: string;
  response?: unknown;
  manualTriggerFunction?: () => Promise<void>;
  closeFunction?: () => Promise<void>;
}

export interface SimpleTriggerContext {
  propsValue: Record<string, any>;
  payload: unknown;
  webhookUrl?: string;
  store: SimpleStore;
}

export interface SimpleStore {
  get: <T>(key: string) => Promise<T | null>;
  put: <T>(key: string, value: T) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

// ============================================================================
// Simple In-Memory Store
// ============================================================================

function createSimpleStore(prefix: string = ''): SimpleStore {
  const storage = new Map<string, unknown>();
  
  return {
    async get<T>(key: string): Promise<T | null> {
      const fullKey = `${prefix}:${key}`;
      return (storage.get(fullKey) as T) ?? null;
    },
    async put<T>(key: string, value: T): Promise<void> {
      const fullKey = `${prefix}:${key}`;
      storage.set(fullKey, value);
    },
    async delete(key: string): Promise<void> {
      const fullKey = `${prefix}:${key}`;
      storage.delete(fullKey);
    },
  };
}

// ============================================================================
// HTTP Request Implementation (Real HTTP calls for triggers)
// ============================================================================

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
 * Execute HTTP request 
 */
async function httpRequest(
  requestOptions: IHttpRequestOptions
): Promise<any> {
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
    headers['User-Agent'] = 'n8n-habits-trigger';
  }

  // Build full URL
  const url = buildUrl(requestOptions.url, requestOptions.baseURL, requestOptions.qs);

  // Prepare body (skip for GET requests)
  let body: string | undefined;
  if (!noBodyMethods.includes(method) && requestOptions.body) {
    if (typeof requestOptions.body === 'object' && Object.keys(requestOptions.body).length > 0) {
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      body = JSON.stringify(requestOptions.body);
    } else if (typeof requestOptions.body === 'string') {
      body = requestOptions.body;
    }
  }

  logger.log(`🌐 [Trigger] Making HTTP request: ${method} ${url}`);
  
  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      redirect: requestOptions.disableFollowRedirect ? 'manual' : 'follow',
    });

    // Handle response
    let responseData: any;
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
      // Try to parse as JSON
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

// ============================================================================
// N8n Module Path Resolution
// ============================================================================

/**
 * Find the main node file for an n8n module
 * N8n modules specify their nodes in package.json under "n8n.nodes"
 */
function getN8nNodeFile(moduleDefinition: ModuleDefinition): string | null {
  const modulePath = getModulePath(moduleDefinition);
  const packageJsonPath = path.join(modulePath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    logger.error(`package.json not found at: ${packageJsonPath}`);
    return null;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    // N8n modules specify nodes in the "n8n" section
    if (packageJson.n8n?.nodes && packageJson.n8n.nodes.length > 0) {
      // Get the first node file
      const nodeFile = packageJson.n8n.nodes[0];
      const fullPath = path.join(modulePath, nodeFile);
      
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    // Fallback: Try to find .node.js files in common locations
    const fallbackPaths = ['dist/nodes', 'nodes', 'dist'];

    for (const fallbackPath of fallbackPaths) {
      const dir = path.join(modulePath, fallbackPath);
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        const nodeFile = findNodeFileInDirectory(dir);
        if (nodeFile) {
          return nodeFile;
        }
      }
    }

    return null;
  } catch (error: any) {
    logger.error(`Error reading package.json: ${error.message}`);
    return null;
  }
}

/**
 * Recursively search for .node.js files in a directory
 */
function findNodeFileInDirectory(dir: string): string | null {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isFile() && entry.name.endsWith('.node.js')) {
      return fullPath;
    }
    
    if (entry.isDirectory()) {
      const found = findNodeFileInDirectory(fullPath);
      if (found) {
        return found;
      }
    }
  }
  
  return null;
}

// ============================================================================
// Trigger Helper
// ============================================================================

export const triggerHelper = {
  /**
   * Load a node from module definition
   */
  async loadNodeFromModule(moduleDefinition: ModuleDefinition): Promise<INodeType> {
    const moduleName = getModuleName(moduleDefinition);
    
    // Use n8n-specific path resolution first
    let mainFilePath = getN8nNodeFile(moduleDefinition);
    
    // Fallback to generic resolution
    if (!mainFilePath) {
      mainFilePath = getModuleMainFile(moduleDefinition);
    }
    
    if (!mainFilePath) {
      throw new Error(`Could not locate node file for n8n module: ${moduleName}`);
    }

    logger.log(`📦 Loading n8n node from: ${mainFilePath}`);

    const originalCwd = process.cwd();
    const moduleDir = path.dirname(mainFilePath);

    try {
      process.chdir(moduleDir);
      delete require.cache[mainFilePath];
      const module = await import(mainFilePath);

      // Find the node export - look for class that when instantiated has a description property
      let nodeInstance: INodeType | null = null;
      
      for (const key of Object.keys(module)) {
        const exported = module[key];
        if (exported && typeof exported === 'function') {
          try {
            // Try to instantiate and check for description property
            const instance = new exported();
            if (instance && typeof instance === 'object' && 'description' in instance) {
              nodeInstance = instance as INodeType;
              logger.debug(`Found n8n node class: ${key}`);
              break;
            }
          } catch (e) {
            // Not a valid node class, continue
          }
        }
      }

      if (!nodeInstance) {
        throw new Error(`No n8n node class found in module: ${moduleName}`);
      }

      process.chdir(originalCwd);
      return nodeInstance;
    } catch (error: any) {
      process.chdir(originalCwd);
      logger.error(error.stack);
      throw error;
    }
  },

  /**
   * Execute a trigger based on hook type
   */
  async executeTrigger(params: TriggerExecutionParams): Promise<TriggerExecutionResult> {
    const { moduleDefinition, input, hookType, payload, webhookUrl, isTest } = params;

    const node = await this.loadNodeFromModule(moduleDefinition);
    logger.log(`🔔 Executing n8n trigger: ${node.description.displayName} (${hookType})`);

    const storePrefix = isTest ? 'test' : '';

    try {
      switch (hookType) {
        case TriggerHookType.WEBHOOK: {
          if (!node.webhook) {
            return {
              success: false,
              message: 'Node does not support webhook triggers',
            };
          }

          const context = this.createWebhookContext(node, input, payload, webhookUrl);
          const response = await node.webhook.call(context);

          return {
            success: true,
            output: response.workflowData ? response.workflowData : [],
            response: response.webhookResponse,
          };
        }

        case TriggerHookType.POLL: {
          if (!node.poll) {
            return {
              success: false,
              message: 'Node does not support polling triggers',
            };
          }

          const context = this.createPollContext(node, input, createSimpleStore(storePrefix));
          const result = await node.poll.call(context);

          return {
            success: true,
            output: result || [],
          };
        }

        case TriggerHookType.TRIGGER: {
          if (!node.trigger) {
            return {
              success: false,
              message: 'Node does not support manual triggers',
            };
          }

          const context = this.createTriggerContext(node, input, createSimpleStore(storePrefix));
          const triggerResponse = await node.trigger.call(context);

          return {
            success: true,
            manualTriggerFunction: triggerResponse?.manualTriggerFunction,
            closeFunction: triggerResponse?.closeFunction,
          };
        }

        case TriggerHookType.TEST: {
          // Test mode - try to get sample data
          if (node.poll) {
            const context = this.createPollContext(node, input, createSimpleStore('test'));
            const result = await node.poll.call(context);
            return {
              success: true,
              output: result || [],
            };
          } else if (node.webhook) {
            // For webhook, return test payload
            return {
              success: true,
              output: [{ json: { test: true, message: 'Webhook test payload' } }],
            };
          } else {
            return {
              success: false,
              message: 'Node does not support test mode',
              output: [],
            };
          }
        }

        default:
          return {
            success: false,
            message: `Unknown hook type: ${hookType}`,
          };
      }
    } catch (error: any) {
      logger.error(`Error executing trigger ${node.description.name}:`, error);
      return {
        success: false,
        message: `Error executing trigger: ${inspect(error)}`,
        output: [],
      };
    }
  },

  /**
   * Create webhook execution context
   */
  createWebhookContext(
    node: INodeType,
    params: Record<string, any>,
    payload: unknown,
    webhookUrl?: string
  ): IWebhookFunctions {
    const context: Partial<IWebhookFunctions> = {
      getNodeParameter: (parameterName: string, fallbackValue?: any) => {
        const parts = parameterName.split('.');
        let value: any = params;
        
        for (const part of parts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else {
            value = undefined;
            break;
          }
        }
        
        return value !== undefined ? value : fallbackValue;
      },
      getNode: () => ({
        name: node.description.name,
        type: node.description.name,
        typeVersion: node.description.version,
        position: [0, 0],
        parameters: params,
      } as any),
      getMode: () => 'manual' as any,
      getBodyData: () => payload as any,
      getHeaderData: () => (params.headers || {}),
      getQueryData: () => (params.query || {}),
      getRequestObject: () => ({
        body: payload,
        headers: params.headers || {},
        query: params.query || {},
        method: params.method || 'POST',
      } as any),
      getWebhookName: () => 'default',
      getCredentials: async <T extends object = any>(type: string): Promise<T> => {
        const creds = params.credentials?.[type];
        if (!creds) {
          throw new Error(`No credentials found for type: ${type}`);
        }
        return creds as T;
      },
      helpers: {
        returnJsonArray: (jsonData: any): INodeExecutionData[] => {
          const data = Array.isArray(jsonData) ? jsonData : [jsonData];
          return data.map(item => ({ json: item }));
        },
        httpRequest: async (options: IHttpRequestOptions): Promise<any> => {
          return await httpRequest(options);
        },
        httpRequestWithAuthentication: async (
          credentialsType: string,
          requestOptions: IHttpRequestOptions,
          additionalCredentialOptions?: any
        ): Promise<any> => {
          const creds = params.credentials?.[credentialsType] || {};
          
          if (creds.apiKey) {
            requestOptions.headers = {
              ...requestOptions.headers,
              Authorization: `Bearer ${creds.apiKey}`,
            };
          } else if (creds.username && creds.password) {
            requestOptions.auth = {
              username: creds.username,
              password: creds.password,
            };
          }

          return await httpRequest(requestOptions);
        },
      } as any,
    };

    return context as IWebhookFunctions;
  },

  /**
   * Create poll execution context
   */
  createPollContext(
    node: INodeType,
    params: Record<string, any>,
    store: SimpleStore
  ): IPollFunctions {
    const context: Partial<IPollFunctions> = {
      getNodeParameter: (parameterName: string, fallbackValue?: any) => {
        const parts = parameterName.split('.');
        let value: any = params;
        
        for (const part of parts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else {
            value = undefined;
            break;
          }
        }
        
        return value !== undefined ? value : fallbackValue;
      },
      getNode: () => ({
        name: node.description.name,
        type: node.description.name,
        typeVersion: node.description.version,
        position: [0, 0],
        parameters: params,
      } as any),
      getMode: () => 'manual' as any,
      getActivationMode: () => 'activate',
      getCredentials: async <T extends object = any>(type: string): Promise<T> => {
        const creds = params.credentials?.[type];
        if (!creds) {
          throw new Error(`No credentials found for type: ${type}`);
        }
        return creds as T;
      },
      helpers: {
        returnJsonArray: (jsonData: any): INodeExecutionData[] => {
          const data = Array.isArray(jsonData) ? jsonData : [jsonData];
          return data.map(item => ({ json: item }));
        },
        httpRequest: async (options: IHttpRequestOptions): Promise<any> => {
          return await httpRequest(options);
        },
        httpRequestWithAuthentication: async (
          credentialsType: string,
          requestOptions: IHttpRequestOptions,
          additionalCredentialOptions?: any
        ): Promise<any> => {
          const creds = params.credentials?.[credentialsType] || {};
          
          if (creds.apiKey) {
            requestOptions.headers = {
              ...requestOptions.headers,
              Authorization: `Bearer ${creds.apiKey}`,
            };
          } else if (creds.username && creds.password) {
            requestOptions.auth = {
              username: creds.username,
              password: creds.password,
            };
          }

          return await httpRequest(requestOptions);
        },
      } as any,
    };

    return context as IPollFunctions;
  },

  /**
   * Create trigger execution context
   */
  createTriggerContext(
    node: INodeType,
    params: Record<string, any>,
    store: SimpleStore
  ): ITriggerFunctions {
    const context: Partial<ITriggerFunctions> = {
      getNodeParameter: (parameterName: string, fallbackValue?: any) => {
        const parts = parameterName.split('.');
        let value: any = params;
        
        for (const part of parts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else {
            value = undefined;
            break;
          }
        }
        
        return value !== undefined ? value : fallbackValue;
      },
      getNode: () => ({
        name: node.description.name,
        type: node.description.name,
        typeVersion: node.description.version,
        position: [0, 0],
        parameters: params,
      } as any),
      getMode: () => 'manual' as any,
      getActivationMode: () => 'activate',
      getCredentials: async <T extends object = any>(type: string): Promise<T> => {
        const creds = params.credentials?.[type];
        if (!creds) {
          throw new Error(`No credentials found for type: ${type}`);
        }
        return creds as T;
      },
      helpers: {
        returnJsonArray: (jsonData: any): INodeExecutionData[] => {
          const data = Array.isArray(jsonData) ? jsonData : [jsonData];
          return data.map(item => ({ json: item }));
        },
        httpRequest: async (options: IHttpRequestOptions): Promise<any> => {
          return await httpRequest(options);
        },
        httpRequestWithAuthentication: async (
          credentialsType: string,
          requestOptions: IHttpRequestOptions,
          additionalCredentialOptions?: any
        ): Promise<any> => {
          const creds = params.credentials?.[credentialsType] || {};
          
          if (creds.apiKey) {
            requestOptions.headers = {
              ...requestOptions.headers,
              Authorization: `Bearer ${creds.apiKey}`,
            };
          } else if (creds.username && creds.password) {
            requestOptions.auth = {
              username: creds.username,
              password: creds.password,
            };
          }

          return await httpRequest(requestOptions);
        },
        createDeferredPromise: <T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (error: Error) => void } => {
          let resolve!: (value: T) => void;
          let reject!: (error: Error) => void;
          const promise = new Promise<T>((res, rej) => {
            resolve = res;
            reject = rej;
          });
          return { promise, resolve, reject };
        },
      } as any,
      emit: function(data: any[][]) {
        logger.log('Trigger emitted data:', { data });
      },
      emitError: (error: Error) => {
        logger.error('Trigger emitted error:', { error: error.message, stack: error.stack });
      },
    };

    return context as ITriggerFunctions;
  },

  /**
   * List trigger capabilities of a node
   */
  async listTriggers(moduleDefinition: ModuleDefinition): Promise<{
    triggers: Array<{
      name: string;
      displayName: string;
      description: string;
      type: string;
    }>;
  }> {
    const node = await this.loadNodeFromModule(moduleDefinition);

    const triggers: Array<{ name: string; displayName: string; description: string; type: string }> = [];

    if (node.trigger) {
      triggers.push({
        name: 'trigger',
        displayName: node.description.displayName,
        description: node.description.description,
        type: 'manual',
      });
    }

    if (node.poll) {
      triggers.push({
        name: 'poll',
        displayName: node.description.displayName,
        description: node.description.description,
        type: 'polling',
      });
    }

    if (node.webhook) {
      triggers.push({
        name: 'webhook',
        displayName: node.description.displayName,
        description: node.description.description,
        type: 'webhook',
      });
    }

    return { triggers };
  },

  /**
   * Check if a node is a webhook trigger
   */
  isWebhookTrigger(node: any): boolean {
    return (
      node.type === 'trigger' &&
      node.data?.framework === 'n8n' &&
      (node.data?.triggerType === 'webhook' || 
       node.data?.operation === 'webhook')
    );
  },

  /**
   * Extract webhook trigger configuration from a node
   */
  getWebhookConfig(node: any): {
    nodeId: string;
    path: string;
    httpMethod: string;
    authType: 'none' | 'header' | 'basic';
    authFields: Record<string, any>;
  } {
    return {
      nodeId: node.id,
      path: `/webhook/${node.id}`,
      httpMethod: node.data?.triggerSettings?.httpMethod || 'POST',
      authType: node.data?.triggerSettings?.authType || 'none',
      authFields: node.data?.triggerSettings?.authFields || {},
    };
  },

  /**
   * Execute a webhook trigger with received payload
   */
  async executeWebhookTrigger(
    nodeId: string,
    payload: any,
    headers?: Record<string, string>,
    query?: Record<string, string>
  ): Promise<TriggerExecutionResult> {
    logger.log(`🔔 Executing webhook trigger for node: ${nodeId}`);
    
    // For webhook triggers, we just pass through the payload
    return {
      success: true,
      output: [{
        json: {
          body: payload,
          headers: headers || {},
          query: query || {},
          method: 'POST',
          timestamp: new Date().toISOString(),
        },
      }],
      message: 'Webhook received successfully',
    };
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Try-catch wrapper that returns a result object
 */
export async function tryCatch<T>(
  fn: () => Promise<T>
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

export default triggerHelper;
