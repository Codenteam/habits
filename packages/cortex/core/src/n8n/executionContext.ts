/**
 * Execution Context Factory for n8n nodes
 * Creates the IExecuteFunctions context that n8n nodes expect
 */

import * as path from 'path';
import {
  INodeType,
  INodeExecutionData,
  IExecuteFunctions,
  IHttpRequestOptions,
  INode,
  IDataObject,
  ICredentialType,
} from './types';
import { ModuleDefinition } from '../utils/moduleCloner';
import { httpRequest } from './httpRequest';
import { loadCredentialType, applyCredentialAuthentication, applyFallbackAuthentication } from './credentialLoader';
import { LoggerFactory } from '@ha-bits/core/logger';

const logger = LoggerFactory.getRoot();

export interface N8nNodeExecutionOptions {
  inputData?: INodeExecutionData[];
  credentials?: Record<string, any>;
}

/**
 * Create a real execution context for n8n nodes
 * This provides all the methods that nodes expect to have access to
 */
export function createExecutionContext(
  node: INodeType,
  params: Record<string, any>,
  options?: N8nNodeExecutionOptions
): IExecuteFunctions {
  const inputData: INodeExecutionData[] = options?.inputData || params.inputData || [{ json: params }];
  const credentials = options?.credentials || params.credentials || {};

  // Create the node configuration object
  const version = node.description?.version;
  const typeVersion = Array.isArray(version) ? version[0] : (version || 1);
  
  const nodeConfig: INode = {
    id: params.nodeId || 'node-1',
    name: node.description?.name || 'unknown',
    type: node.description?.name || 'unknown',
    typeVersion,
    position: [0, 0],
    parameters: params,
    credentials: {},
  };

  // Build the execution context
  const context: IExecuteFunctions = {
    // Get input data from previous nodes
    getInputData: (inputIndex: number = 0): INodeExecutionData[] => {
      return inputData;
    },

    // Get node parameter value
    getNodeParameter: (
      parameterName: string,
      itemIndex: number = 0,
      fallbackValue?: any,
      options?: any
    ): any => {
      // Handle nested parameters like 'options.timeout'
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

      if (value !== undefined) {
        return value;
      }

      if (fallbackValue !== undefined) {
        return fallbackValue;
      }

      // For some parameters, return sensible defaults
      const defaultValues: Record<string, any> = {
        'options': {},
        'authentication': 'none',
        'sendHeaders': false,
        'sendQuery': false,
        'sendBody': false,
        'specifyHeaders': 'keypair',
        'specifyQuery': 'keypair',
        'specifyBody': 'keypair',
        'headerParameters': { parameters: [] },
        'queryParameters': { parameters: [] },
        'bodyParameters': { parameters: [] },
      };

      return defaultValues[parameterName] ?? null;
    },

    // Get the current node
    getNode: (): INode => nodeConfig,

    // Get workflow data
    getWorkflow: () => ({
      id: 'workflow-1',
      name: 'Habits Workflow',
      active: true,
    }),

    // Get execution mode
    getMode: () => 'manual' as any,

    // Get execution ID
    getExecutionId: () => `exec-${Date.now()}`,

    // Continue on fail check
    continueOnFail: () => false,

    // Get credentials
    getCredentials: async <T extends object = any>(type: string): Promise<T> => {
      const creds = credentials[type];
      if (!creds) {
        throw new Error(`No credentials found for type: ${type}`);
      }
      return creds as T;
    },

    // Helpers object with HTTP request and other utilities
    helpers: {
      // HTTP request function
      httpRequest: async (opts: IHttpRequestOptions): Promise<any> => {
        return await httpRequest(opts);
      },

      // HTTP request with authentication
      httpRequestWithAuthentication: async (
        credentialsType: string,
        requestOptions: IHttpRequestOptions,
        additionalCredentialOptions?: any
      ): Promise<any> => {
        // Get credentials
        const creds = credentials[credentialsType] || {};
        
        // Try to load credential type and apply authentication generically
        const credentialType = loadCredentialType(
          (params as any).__moduleDefinition,
          credentialsType
        );
        
        if (credentialType) {
          applyCredentialAuthentication(requestOptions, credentialType, creds);
        } else {
          // Fallback to common patterns
          applyFallbackAuthentication(
            requestOptions.headers as Record<string, string> || {},
            creds
          );
        }

        return await httpRequest(requestOptions);
      },

      // Convert JSON to array format
      returnJsonArray: (jsonData: any): INodeExecutionData[] => {
        const data = Array.isArray(jsonData) ? jsonData : [jsonData];
        return data.map(item => ({ json: item }));
      },

      // Copy input items
      copyInputItems: (items: INodeExecutionData[], properties: string[]): IDataObject[] => {
        return items.map(item => {
          const newItem: IDataObject = {};
          for (const property of properties) {
            if (item.json.hasOwnProperty(property)) {
              newItem[property] = item.json[property] as any;
            }
          }
          return newItem;
        });
      },

      // Normalize items
      normalizeItems: (items: INodeExecutionData[]): INodeExecutionData[] => {
        return items.map(item => ({
          json: item.json || {},
          binary: item.binary,
          pairedItem: item.pairedItem,
        }));
      },

      // Construct execution metadata
      constructExecutionMetaData: (
        items: INodeExecutionData[],
        options: { itemData: { item: number } }
      ): INodeExecutionData[] => {
        return items.map((item, index) => ({
          ...item,
          pairedItem: { item: options.itemData.item },
        }));
      },

      // Request function (legacy)
      request: async (uriOrObject: string | any, options?: any): Promise<any> => {
        let requestOpts: IHttpRequestOptions;
        
        if (typeof uriOrObject === 'string') {
          requestOpts = {
            url: uriOrObject,
            method: options?.method || 'GET',
            body: options?.body,
            qs: options?.qs,
            headers: options?.headers,
          };
        } else {
          requestOpts = {
            url: uriOrObject.uri || uriOrObject.url,
            method: uriOrObject.method || 'GET',
            body: uriOrObject.body,
            qs: uriOrObject.qs,
            headers: uriOrObject.headers,
          };
        }

        return await httpRequest(requestOpts);
      },

      // Request with authentication (legacy)
      requestWithAuthentication: async (
        credentialsType: string,
        requestOptions: any,
        additionalCredentialOptions?: any,
        itemIndex?: number
      ): Promise<any> => {
        const creds = credentials[credentialsType] || {};
        
        // Try to load credential type and apply authentication generically
        const credentialType = loadCredentialType(
          (params as any).__moduleDefinition,
          credentialsType
        );
        
        const httpOptions: IHttpRequestOptions = {
          url: requestOptions.uri || requestOptions.url,
          method: requestOptions.method || 'GET',
          body: requestOptions.body,
          qs: requestOptions.qs,
          headers: requestOptions.headers || {},
        };
        
        if (credentialType) {
          applyCredentialAuthentication(httpOptions, credentialType, creds);
        } else {
          applyFallbackAuthentication(
            httpOptions.headers as Record<string, string>,
            creds
          );
        }

        return await httpRequest(httpOptions);
      },

      // Binary data helpers (stub implementations)
      prepareBinaryData: async (binaryData: Buffer, filePath?: string, mimeType?: string) => {
        return {
          data: binaryData.toString('base64'),
          mimeType: mimeType || 'application/octet-stream',
          fileName: filePath ? path.basename(filePath) : 'file',
        };
      },

      assertBinaryData: (itemIndex: number, propertyName: string) => {
        const item = inputData[itemIndex];
        if (!item?.binary?.[propertyName]) {
          throw new Error(`No binary data found for property: ${propertyName}`);
        }
        return item.binary[propertyName];
      },

      getBinaryDataBuffer: async (itemIndex: number, propertyName: string): Promise<Buffer> => {
        const item = inputData[itemIndex];
        if (!item?.binary?.[propertyName]) {
          throw new Error(`No binary data found for property: ${propertyName}`);
        }
        return Buffer.from(item.binary[propertyName].data, 'base64');
      },

      // Convert binary data to string
      binaryToString: async (binaryData: Buffer, encoding: BufferEncoding = 'utf-8'): Promise<string> => {
        return binaryData.toString(encoding);
      },

      // Create deferred promise
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

    // Node helpers
    nodeHelpers: {
      copyBinaryFile: async (filePath: string, fileName: string, mimeType?: string) => {
        return {
          data: '',
          mimeType: mimeType || 'application/octet-stream',
          fileName,
        };
      },
    } as any,

    // Additional methods that nodes might use
    getWorkflowStaticData: (type: string) => ({}),
    getTimezone: () => 'UTC',
    getRestApiUrl: () => 'http://localhost:5678/api/v1',
    getInstanceBaseUrl: () => 'http://localhost:5678',
    getInstanceId: () => 'instance-1',

    // Logging
    logger: {
      info: (...args: any[]) => logger.log('[n8n]', ...args),
      warn: (...args: any[]) => logger.warn('[n8n]', ...args),
      error: (...args: any[]) => logger.error('[n8n]', ...args),
      debug: (...args: any[]) => logger.log('[n8n:debug]', ...args),
    } as any,

    // Send message to UI (no-op in headless execution)
    sendMessageToUI: (message: any) => {
      logger.log('[n8n:ui]', message);
    },

    // Put execution to wait (for wait nodes)
    putExecutionToWait: async (waitTill: Date) => {
      logger.log(`[n8n] Waiting until: ${waitTill.toISOString()}`);
    },

    // Send response (for webhook response nodes)
    sendResponse: (response: any) => {
      logger.log('[n8n] Sending response:', response);
    },

    // Prepare output data - transforms INodeExecutionData[] to INodeExecutionData[][]
    prepareOutputData: async (outputData: any[], outputIndex: number = 0): Promise<any[][]> => {
      // n8n expects output as array of arrays (one array per output)
      const returnData: any[][] = [];
      
      // Initialize arrays for all outputs up to outputIndex
      for (let i = 0; i <= outputIndex; i++) {
        returnData.push(i === outputIndex ? outputData : []);
      }
      
      return returnData;
    },
  } as IExecuteFunctions;

  return context;
}
