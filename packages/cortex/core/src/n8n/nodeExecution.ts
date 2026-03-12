/**
 * Node Execution Functions
 * Contains executeGenericN8nNode and executeRoutingBasedNode
 */

import * as path from 'path';
import { fetch } from '@ha-bits/bindings';
import { customRequire } from '../utils/customRequire';
import { getModuleName } from '../utils/moduleLoader';
import { ModuleDefinition } from '../utils/moduleCloner';
import {
  INodeType,
  INodeExecutionData,
  IExecuteFunctions,
  IHttpRequestOptions,
  INodeTypeDescription,
} from './types';
import { createExecutionContext, N8nNodeExecutionOptions } from './executionContext';
import { loadCredentialType, applyCredentialAuthentication, applyFallbackAuthentication } from './credentialLoader';
import { LoggerFactory } from '@ha-bits/core';

const logger = LoggerFactory.getRoot();

/**
 * Load a node from a module file
 */
export async function loadNodeFromModule(
  moduleDefinition: ModuleDefinition,
  mainFilePath: string
): Promise<INodeType> {
  const moduleName = getModuleName(moduleDefinition);
  const originalCwd = process.cwd();
  const moduleDir = path.dirname(mainFilePath);

  try {
    process.chdir(moduleDir);
    // Use customRequire to bypass bundler's require and enable dynamic loading
    // n8n-workflow and n8n-core are resolved from the module's node_modules
    
    const module = customRequire(mainFilePath, moduleDir);

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
}

/**
 * Check if a node description has routing definitions
 */
export function hasRoutingInDescription(description: INodeTypeDescription): boolean {
  if (!description.properties) return false;
  
  for (const prop of description.properties) {
    if (prop.options) {
      for (const option of prop.options as any[]) {
        if (option.routing) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Execute a generic n8n node
 */
export async function executeGenericN8nNode(
  params: Record<string, any>,
  moduleDefinition: ModuleDefinition,
  mainFilePath: string
): Promise<any> {
  try {
    const node = await loadNodeFromModule(moduleDefinition, mainFilePath);
    
    logger.log(`🚀 Executing n8n node: ${node.description.displayName}`);
    
    const operation = params.operation;
    const resource = params.resource;
    
    logger.log(`Resource: ${resource || 'default'}, Operation: ${operation || 'default'}`);

    // Add moduleDefinition to params so it can be accessed in credential authentication
    const paramsWithModule = {
      ...params,
      __moduleDefinition: moduleDefinition,
    };

    // Create a real execution context for the node
    const context = createExecutionContext(node, paramsWithModule);

    // Execute the node
    let result: any = null;
    
    if (node.execute) {
      result = await node.execute.call(context);
    } else if (node.description.requestDefaults || hasRoutingInDescription(node.description)) {
      // Handle routing-based declarative nodes (like ElevenLabs)
      logger.log(`📡 Using routing-based execution for declarative node`);
      result = await executeRoutingBasedNode(node, paramsWithModule, context);
    } else {
      throw new Error(`Node does not have an execute method and is not a routing-based node`);
    }

    logger.log(`✅ Successfully executed n8n node: ${node.description.displayName}`);

    // Extract the output from the result
    const output = result?.[0]?.map((item: any) => item.json) || result;

    return {
      success: true,
      module: moduleDefinition.repository,
      nodeLoaded: true,
      result: output,
      executedAt: new Date().toISOString(),
      data: {
        message: `Successfully executed n8n node: ${node.description.displayName}`,
        status: 'completed',
        output: result,
        rawOutput: output,
      },
    };
  } catch (error: any) {
    logger.error(`Failed to execute n8n node: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
}

/**
 * Execute a routing-based declarative n8n node
 * These nodes define HTTP routing in their operation descriptions instead of using execute()
 */
export async function executeRoutingBasedNode(
  node: INodeType,
  params: Record<string, any>,
  context: IExecuteFunctions
): Promise<INodeExecutionData[][]> {
  const description = node.description;
  const resource = params.resource;
  const operation = params.operation;
  const credentials = params.credentials || {};
  
  // Find the operation definition with routing
  // n8n nodes can have routing at two levels:
  // 1. Property-level routing (on the 'operation' property itself) - contains request config
  // 2. Option-level routing (on individual operation options) - contains preSend/postReceive hooks
  let propertyRoutingConfig: any = null;
  let optionRoutingConfig: any = null;
  let operationDef: any = null;
  let operationProperty: any = null;
  
  for (const prop of description.properties || []) {
    if (prop.name === 'operation' && prop.options) {
      operationProperty = prop;
      // Check for property-level routing (has request.url template)
      if (prop.routing) {
        propertyRoutingConfig = prop.routing;
      }
      // Also check for option-level routing (has preSend hooks)
      for (const option of prop.options as any[]) {
        if (option.value === operation) {
          operationDef = option;
          if (option.routing) {
            optionRoutingConfig = option.routing;
          }
          break;
        }
      }
    }
  }
  
  // Merge routing configs: property-level provides request config, option-level provides hooks
  const routingConfig = {
    ...(propertyRoutingConfig || {}),
    ...(optionRoutingConfig || {}),
    request: {
      ...(propertyRoutingConfig?.request || {}),
      ...(optionRoutingConfig?.request || {}),
    },
    output: {
      ...(propertyRoutingConfig?.output || {}),
      ...(optionRoutingConfig?.output || {}),
    },
    send: {
      ...(propertyRoutingConfig?.send || {}),
      ...(optionRoutingConfig?.send || {}),
    },
  };
  
  if (!propertyRoutingConfig && !optionRoutingConfig) {
    throw new Error(`No routing configuration found for operation: ${operation}`);
  }
  
  logger.log(`📡 Found routing config for operation: ${operation}`);
  
  // Build the request from routing config and requestDefaults
  const requestDefaults = description.requestDefaults || {};
  const requestConfig = routingConfig.request || {};
  
  // Resolve URL with parameter substitution
  let url = requestConfig.url || '';
  if (url.startsWith('=')) {
    // n8n expression format: ={{"/text-to-speech/"+$parameter["voice"]}}
    url = resolveN8nExpression(url, params);
  }
  
  // Prepend baseURL if URL is relative
  const baseURL = requestDefaults.baseURL || '';
  if (url && !url.startsWith('http')) {
    url = baseURL + url;
  }
  
  // Build request body from field routing
  const body: Record<string, any> = {};
  const queryParams: Record<string, any> = {};
  
  for (const prop of description.properties || []) {
    // Skip meta fields
    if (['resource', 'operation', 'notice'].includes(prop.name)) {
      continue;
    }
    
    const paramValue = params[prop.name];
    
    // If property has explicit routing.send, use that
    if (prop.routing?.send) {
      const sendConfig = prop.routing.send;
      
      if (paramValue !== undefined && paramValue !== null && paramValue !== '') {
        if (sendConfig.type === 'body') {
          const propName = sendConfig.property || prop.name;
          body[propName] = resolveParamValue(paramValue);
        } else if (sendConfig.type === 'query') {
          const propName = sendConfig.property || prop.name;
          queryParams[propName] = resolveParamValue(paramValue);
        }
      }
    } else if ((prop as any).required && paramValue !== undefined && paramValue !== null && paramValue !== '') {
      // For required fields without explicit routing, add them to body by default
      // This handles cases where preSend hooks normally handle the parameter
      body[prop.name] = resolveParamValue(paramValue);
    } else if (paramValue !== undefined && paramValue !== null && paramValue !== '' && 
               !prop.name.includes('_id') && prop.type === 'string') {
      // Also add string parameters that might be body content
      body[prop.name] = resolveParamValue(paramValue);
    }
    
    // Handle nested options (like additionalOptions)
    if (prop.type === 'collection' && prop.options && params[prop.name]) {
      const collectionValue = params[prop.name];
      for (const subProp of prop.options as any[]) {
        if (subProp.routing?.send && collectionValue[subProp.name] !== undefined) {
          const sendConfig = subProp.routing.send;
          const paramValue = collectionValue[subProp.name];
          
          if (paramValue !== undefined && paramValue !== null) {
            if (sendConfig.type === 'body') {
              const propName = sendConfig.property || subProp.name;
              body[propName] = resolveParamValue(paramValue);
            } else if (sendConfig.type === 'query') {
              const propName = sendConfig.property || subProp.name;
              queryParams[propName] = resolveParamValue(paramValue);
            }
          }
        }
      }
    }
  }
  
  // Determine HTTP method
  const method = (requestConfig.method || requestDefaults.method || 'POST').toUpperCase();
  
  // Build headers
  const headers: Record<string, string> = {
    ...(requestDefaults.headers || {}),
    ...(requestConfig.headers || {}),
  };
  
  // Apply credentials authentication using credential type definitions
  const credentialTypeName = description.credentials?.[0]?.name;
  if (credentialTypeName && credentials[credentialTypeName]) {
    const creds = credentials[credentialTypeName];
    const moduleDefinition = (params as any).__moduleDefinition;
    
    // Try to load credential type definition and apply authentication generically
    const credentialType = moduleDefinition 
      ? loadCredentialType(moduleDefinition, credentialTypeName)
      : null;
    
    if (credentialType) {
      // Use the authenticate property from the credential type
      const tempOptions: IHttpRequestOptions = { url: '', headers };
      applyCredentialAuthentication(tempOptions, credentialType, creds);
      Object.assign(headers, tempOptions.headers);
    } else {
      // Fallback to common patterns
      applyFallbackAuthentication(headers, creds);
    }
  }
  
  logger.log(`🌐 Making routing-based request: ${method} ${url}`);
  logger.log(`📤 Request body:`, { body: body });
  
  // Build URL with query params
  let fullUrl = url;
  if (Object.keys(queryParams).length > 0) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
    fullUrl += (fullUrl.includes('?') ? '&' : '?') + params.toString();
  }
  
  // Prepare request body
  const requestBody = Object.keys(body).length > 0 ? JSON.stringify(body) : undefined;
  if (requestBody && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  try {
    const response = await fetch(fullUrl, {
      method,
      headers,
      body: requestBody,
    });
    
    logger.log(`✅ Routing-based request successful: ${response.status}`);
    
    const contentType = response.headers.get('content-type') || '';
    
    // Handle binary response (audio data)
    if (requestConfig.encoding === 'arraybuffer' || contentType.includes('audio')) {
      const arrayBuffer = await response.arrayBuffer();
      const binaryData = Buffer.from(arrayBuffer);
      const base64Data = binaryData.toString('base64');
      const mimeType = contentType || 'audio/mpeg';
      
      return [[{
        json: {
          success: true,
          mimeType,
          dataSize: binaryData.length,
          base64: base64Data,
        },
        binary: {
          data: {
            data: base64Data,
            mimeType,
            fileName: `audio.${mimeType.split('/')[1] || 'mp3'}`,
          }
        }
      }]];
    }
    
    // Handle JSON response
    let responseData: any;
    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      const text = await response.text();
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = text;
      }
    }
    
    // Check for HTTP errors
    if (!response.ok) {
      const errorMessage = typeof responseData === 'object' 
        ? JSON.stringify(responseData) 
        : String(responseData);
      logger.error(`HTTP Error (${response.status}): ${errorMessage}`);
      throw new Error(`HTTP Error (${response.status}): ${errorMessage}`);
    }
    
    return [[{ json: responseData }]];
    
  } catch (error: any) {
    if (error.message?.startsWith('HTTP Error')) {
      throw error;
    }
    logger.error(`Request failed: ${error.message}`);
    throw error;
  }
}

/**
 * Resolve n8n expression like ={{"/text-to-speech/"+$parameter["voice"]}}
 */
function resolveN8nExpression(expression: string, params: Record<string, any>): string {
  // Remove the leading = and {{ }} wrapper
  let expr = expression;
  if (expr.startsWith('=')) {
    expr = expr.substring(1);
  }
  if (expr.startsWith('{{') && expr.endsWith('}}')) {
    expr = expr.substring(2, expr.length - 2);
  }
  
  // Replace $parameter["paramName"] with quoted placeholder values
  const paramValues: Record<string, string> = {};
  expr = expr.replace(/\$parameter\["([^"]+)"\]/g, (match, paramName) => {
    const value = params[paramName];
    let resolved: string;
    if (typeof value === 'object' && value !== null) {
      // Handle resourceLocator type values
      resolved = value.value || value.id || JSON.stringify(value);
    } else {
      resolved = value !== undefined ? String(value) : '';
    }
    paramValues[paramName] = resolved;
    return `"${resolved}"`;
  });
  
  // Now evaluate the string concatenation expression
  // expr is now like: "/text-to-speech/"+"21m00Tcm4TlvDq8ikWAM"
  try {
    // Remove all quotes and plus signs to concatenate the parts
    // Match pattern: "string1"+"string2"+"string3" etc.
    const parts: string[] = [];
    const regex = /"([^"]*)"/g;
    let match;
    while ((match = regex.exec(expr)) !== null) {
      parts.push(match[1]);
    }
    if (parts.length > 0) {
      return parts.join('');
    }
    // Fallback: just return the expression without quotes
    return expr.replace(/"/g, '').replace(/\+/g, '');
  } catch {
    return expr;
  }
}

/**
 * Resolve parameter value (handle resourceLocator and other complex types)
 */
function resolveParamValue(value: any): any {
  if (typeof value === 'object' && value !== null) {
    // Handle resourceLocator type: { mode: 'list', value: 'actual_value' }
    if ('value' in value) {
      return value.value;
    }
    if ('id' in value) {
      return value.id;
    }
  }
  return value;
}
