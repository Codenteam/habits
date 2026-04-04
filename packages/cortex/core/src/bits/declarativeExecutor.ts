/**
 * Declarative API Executor
 * 
 * This module handles the execution of declarative bits that define API
 * integrations through a description object with routing configuration
 * (a declarative node pattern).
 * 
 * Example declarative bit:
 * ```typescript
 * export class FriendGrid implements INodeType {
 *   description: INodeTypeDescription = {
 *     displayName: 'FriendGrid',
 *     name: 'friendGrid',
 *     requestDefaults: {
 *       baseURL: 'https://api.sendgrid.com/v3/marketing'
 *     },
 *     properties: [
 *       {
 *         displayName: 'Operation',
 *         name: 'operation',
 *         type: 'options',
 *         options: [
 *           {
 *             name: 'Create',
 *             value: 'create',
 *             routing: {
 *               request: {
 *                 method: 'POST',
 *                 url: '/contacts'
 *               }
 *             }
 *           }
 *         ]
 *       }
 *     ]
 *   }
 * }
 * ```
 */

import { fetch } from '@ha-bits/bindings';

// ============================================================================
// Types for HTTP Request Configuration
// ============================================================================

/**
 * HTTP Method type for routing
 */
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Request configuration (replaces AxiosRequestConfig)
 */
interface RequestConfig {
  method?: Method;
  url?: string;
  baseURL?: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
}

// ============================================================================
// Types for Declarative Node Definition
// ============================================================================

/**
 * HTTP methods supported in routing
 */
export type DeclarativeHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Expression resolver context - available variables in expressions
 */
export interface ExpressionContext {
  $parameter: Record<string, any>;
  $credentials: Record<string, any>;
  $response?: any;
  $input?: any;
  $json?: any;
}

/**
 * Send configuration for request body/query
 */
export interface RoutingSend {
  type: 'body' | 'query';
  property?: string;
  properties?: Record<string, any>;
  value?: any;
  preSend?: PreSendAction[];
}

/**
 * Pre-send action types
 */
export interface PreSendAction {
  type: 'setKeyValue' | 'json';
  properties?: Record<string, any>;
}

/**
 * Post-receive action types
 */
export interface PostReceiveAction {
  type: 'set' | 'setKeyValue' | 'filter' | 'rootProperty' | 'limit' | 'sort' | 'binaryData';
  properties?: {
    value?: string;
    key?: string;
    property?: string;
    enabled?: string | boolean;
    maxResults?: number;
  };
}

/**
 * Routing output configuration
 */
export interface RoutingOutput {
  postReceive?: PostReceiveAction[];
}

/**
 * Request routing configuration
 */
export interface RoutingRequest {
  method?: DeclarativeHttpMethod;
  url?: string;
  baseURL?: string;
  headers?: Record<string, string>;
  qs?: Record<string, any>;
  body?: Record<string, any> | any;
  send?: RoutingSend;
  ignoreHttpStatusErrors?: boolean;
  returnFullResponse?: boolean;
  skipOnEmpty?: string;
}

/**
 * Complete routing configuration for an operation
 */
export interface RoutingConfig {
  request?: RoutingRequest;
  send?: RoutingSend;
  output?: RoutingOutput;
}

/**
 * Option definition for dropdown/options type properties
 */
export interface PropertyOption {
  name: string;
  value: string | number | boolean;
  description?: string;
  action?: string;
  routing?: RoutingConfig;
}

/**
 * Display options for conditional visibility
 */
export interface DisplayOptions {
  show?: Record<string, any[]>;
  hide?: Record<string, any[]>;
}

/**
 * Property definition in declarative node
 */
export interface DeclarativeProperty {
  displayName: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'options' | 'multiOptions' | 'collection' | 'fixedCollection' | 'json' | 'notice' | 'hidden';
  default?: any;
  required?: boolean;
  description?: string;
  placeholder?: string;
  noDataExpression?: boolean;
  displayOptions?: DisplayOptions;
  options?: PropertyOption[] | DeclarativeProperty[];
  typeOptions?: {
    multipleValues?: boolean;
    multipleValueButtonText?: string;
    minValue?: number;
    maxValue?: number;
    numberStepSize?: number;
    rows?: number;
    alwaysOpenEditWindow?: boolean;
    password?: boolean;
    loadOptionsMethod?: string;
  };
  routing?: RoutingConfig;
}

/**
 * Request defaults configuration
 */
export interface RequestDefaults {
  baseURL?: string;
  url?: string;
  headers?: Record<string, string>;
  method?: DeclarativeHttpMethod;
  qs?: Record<string, any>;
  body?: Record<string, any>;
}

/**
 * Credential definition for declarative nodes
 */
export interface CredentialDefinition {
  name: string;
  required?: boolean;
  displayOptions?: DisplayOptions;
}

/**
 * Complete declarative node type description
 */
export interface DeclarativeNodeDescription {
  displayName: string;
  name: string;
  icon?: string;
  group?: string[];
  version?: number | number[];
  subtitle?: string;
  description?: string;
  defaults?: {
    name?: string;
    color?: string;
  };
  inputs?: string[];
  outputs?: string[];
  credentials?: CredentialDefinition[];
  requestDefaults?: RequestDefaults;
  requestOperations?: {
    pagination?: any;
  };
  properties: DeclarativeProperty[];
}

/**
 * Declarative node type interface (the class structure)
 */
export interface IDeclarativeNodeType {
  description: DeclarativeNodeDescription;
  // Optional methods for advanced use cases
  methods?: {
    loadOptions?: Record<string, (this: any) => Promise<PropertyOption[]>>;
    credentialTest?: Record<string, (this: any, credentials: any) => Promise<{ status: string; message: string }>>;
  };
}

/**
 * Execution context for declarative nodes
 */
export interface DeclarativeExecutionContext {
  parameters: Record<string, any>;
  credentials?: Record<string, any>;
  input?: any;
}

/**
 * Execution result
 */
export interface DeclarativeExecutionResult {
  success: boolean;
  data: any;
  status?: number;
  headers?: Record<string, string>;
}

// ============================================================================
// Expression Resolver
// ============================================================================

/**
 * Resolve expressions in strings like:
 * - "={{$parameter['email']}}"
 * - "={{$parameter.email}}"  
 * - "=/contacts/{{$parameter['id']}}"
 * - Simple property reference without braces
 */
export function resolveExpression(expression: any, context: ExpressionContext): any {
  if (expression === null || expression === undefined) {
    return expression;
  }

  if (typeof expression !== 'string') {
    // If it's an object, recursively resolve
    if (typeof expression === 'object' && !Array.isArray(expression)) {
      const resolved: Record<string, any> = {};
      for (const [key, value] of Object.entries(expression)) {
        resolved[key] = resolveExpression(value, context);
      }
      return resolved;
    }
    if (Array.isArray(expression)) {
      return expression.map(item => resolveExpression(item, context));
    }
    return expression;
  }

  // Check if it's an expression (starts with = or contains {{ }})
  const trimmed = expression.trim();
  
  // Full expression: ={{...}}
  if (trimmed.startsWith('={{') && trimmed.endsWith('}}')) {
    const expr = trimmed.slice(3, -2);
    return evaluateExpression(expr, context);
  }

  // Path expression: =/path/{{...}}
  if (trimmed.startsWith('=') && trimmed.includes('{{')) {
    let result = trimmed.slice(1); // Remove leading =
    // Replace all {{...}} occurrences
    result = result.replace(/\{\{([^}]+)\}\}/g, (_, expr) => {
      const value = evaluateExpression(expr.trim(), context);
      return value !== undefined && value !== null ? String(value) : '';
    });
    return result;
  }

  // Simple expression: =$parameter.email
  if (trimmed.startsWith('=')) {
    const expr = trimmed.slice(1);
    return evaluateExpression(expr, context);
  }

  // Template literal style: ${...}
  if (trimmed.includes('${')) {
    let result = trimmed;
    result = result.replace(/\$\{([^}]+)\}/g, (_, expr) => {
      const value = evaluateExpression(expr.trim(), context);
      return value !== undefined && value !== null ? String(value) : '';
    });
    return result;
  }

  // No expression, return as-is
  return expression;
}

/**
 * Evaluate an expression string against the context
 */
function evaluateExpression(expr: string, context: ExpressionContext): any {
  try {
    // Handle $parameter['key'] or $parameter.key syntax
    if (expr.startsWith('$parameter')) {
      return resolvePropertyAccess(expr.slice(1), { parameter: context.$parameter });
    }
    
    // Handle $credentials['key'] or $credentials.key syntax
    if (expr.startsWith('$credentials')) {
      return resolvePropertyAccess(expr.slice(1), { credentials: context.$credentials });
    }
    
    // Handle $response
    if (expr.startsWith('$response')) {
      return resolvePropertyAccess(expr.slice(1), { response: context.$response });
    }

    // Handle $input or $json
    if (expr.startsWith('$input') || expr.startsWith('$json')) {
      const key = expr.startsWith('$input') ? 'input' : 'json';
      return resolvePropertyAccess(expr.slice(expr.indexOf('$') + key.length + 1), { [key]: context.$input || context.$json });
    }

    // Try to evaluate as a simple JS expression (for things like ternary, etc.)
    // Create a safe evaluation context
    const safeContext = {
      $parameter: context.$parameter || {},
      $credentials: context.$credentials || {},
      $response: context.$response,
      $input: context.$input,
      $json: context.$json,
    };

    // Use Function constructor for safe evaluation
    const fn = new Function(...Object.keys(safeContext), `return ${expr}`);
    return fn(...Object.values(safeContext));
  } catch (error) {
    console.warn(`Failed to evaluate expression: ${expr}`, error);
    return undefined;
  }
}

/**
 * Resolve property access like "parameter['email']" or "parameter.email"
 */
function resolvePropertyAccess(path: string, obj: Record<string, any>): any {
  // Normalize different access patterns
  // parameter['key'] -> parameter.key
  // parameter["key"] -> parameter.key
  const normalizedPath = path
    .replace(/\[['"]([^'"]+)['"]\]/g, '.$1')
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/^\./, '');

  const parts = normalizedPath.split('.');
  let current: any = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

// ============================================================================
// Request Builder
// ============================================================================

/**
 * Build the final request configuration by merging defaults, operation routing, and property routing
 */
export function buildRequest(
  description: DeclarativeNodeDescription,
  context: DeclarativeExecutionContext
): RequestConfig {
  const expressionContext: ExpressionContext = {
    $parameter: context.parameters,
    $credentials: context.credentials || {},
    $input: context.input,
  };

  // Start with request defaults
  const defaults = description.requestDefaults || {};
  
  let config: RequestConfig = {
    baseURL: resolveExpression(defaults.baseURL, expressionContext),
    url: resolveExpression(defaults.url, expressionContext) || '',
    method: (defaults.method || 'GET') as Method,
    headers: { ...resolveExpression(defaults.headers, expressionContext) },
    params: { ...resolveExpression(defaults.qs, expressionContext) },
    data: defaults.body ? { ...resolveExpression(defaults.body, expressionContext) } : undefined,
  };

  // Find and apply routing from selected options
  const routingConfigs = collectRoutingConfigs(description.properties, context.parameters, expressionContext);

  // Merge all routing configs
  for (const routing of routingConfigs) {
    config = mergeRoutingIntoConfig(config, routing, expressionContext);
  }

  // Process all properties for their routing configurations
  for (const prop of description.properties) {
    if (shouldShowProperty(prop, context.parameters)) {
      const propRouting = getPropertyRouting(prop, context.parameters, expressionContext);
      if (propRouting) {
        config = mergeRoutingIntoConfig(config, propRouting, expressionContext);
      }
    }
  }

  // Clean up undefined values
  if (config.data && typeof config.data === 'object') {
    config.data = removeUndefinedValues(config.data);
    if (Object.keys(config.data).length === 0) {
      config.data = undefined;
    }
  }

  if (config.params && typeof config.params === 'object') {
    config.params = removeUndefinedValues(config.params);
    if (Object.keys(config.params).length === 0) {
      config.params = undefined;
    }
  }

  return config;
}

/**
 * Remove undefined values from an object
 */
function removeUndefinedValues(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Check if a property should be shown based on displayOptions
 */
function shouldShowProperty(prop: DeclarativeProperty, parameters: Record<string, any>): boolean {
  if (!prop.displayOptions) {
    return true;
  }

  // Check show conditions
  if (prop.displayOptions.show) {
    for (const [key, values] of Object.entries(prop.displayOptions.show)) {
      const paramValue = parameters[key];
      if (!values.includes(paramValue)) {
        return false;
      }
    }
  }

  // Check hide conditions
  if (prop.displayOptions.hide) {
    for (const [key, values] of Object.entries(prop.displayOptions.hide)) {
      const paramValue = parameters[key];
      if (values.includes(paramValue)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Collect routing configurations from selected options in properties
 */
function collectRoutingConfigs(
  properties: DeclarativeProperty[],
  parameters: Record<string, any>,
  expressionContext: ExpressionContext
): RoutingConfig[] {
  const configs: RoutingConfig[] = [];

  for (const prop of properties) {
    if (!shouldShowProperty(prop, parameters)) {
      continue;
    }

    const paramValue = parameters[prop.name];

    // Handle options type - find selected option's routing
    if (prop.type === 'options' && prop.options && paramValue !== undefined) {
      const selectedOption = (prop.options as PropertyOption[]).find(
        opt => opt.value === paramValue
      );
      if (selectedOption?.routing) {
        configs.push(selectedOption.routing);
      }
    }

    // Handle multiOptions type
    if (prop.type === 'multiOptions' && prop.options && Array.isArray(paramValue)) {
      for (const val of paramValue) {
        const selectedOption = (prop.options as PropertyOption[]).find(
          opt => opt.value === val
        );
        if (selectedOption?.routing) {
          configs.push(selectedOption.routing);
        }
      }
    }

    // Handle collection/fixedCollection - recurse into sub-properties
    if ((prop.type === 'collection' || prop.type === 'fixedCollection') && prop.options) {
      const subProperties = prop.options as DeclarativeProperty[];
      const subParams = paramValue || {};
      
      // For fixedCollection, the value is nested under property names
      if (typeof subParams === 'object') {
        for (const subProp of subProperties) {
          const subValue = subParams[subProp.name];
          if (subValue !== undefined && subProp.routing) {
            configs.push(subProp.routing);
          }
        }
      }
    }
  }

  return configs;
}

/**
 * Get routing configuration from a property based on its value
 */
function getPropertyRouting(
  prop: DeclarativeProperty,
  parameters: Record<string, any>,
  expressionContext: ExpressionContext
): RoutingConfig | null {
  const value = parameters[prop.name];
  
  // If property has direct routing
  if (prop.routing && value !== undefined) {
    return prop.routing;
  }

  return null;
}

/**
 * Merge a routing config into the request config
 */
function mergeRoutingIntoConfig(
  config: RequestConfig,
  routing: RoutingConfig,
  expressionContext: ExpressionContext
): RequestConfig {
  const request = routing.request;
  
  if (!request) {
    return config;
  }

  // Update method if specified
  if (request.method) {
    config.method = request.method as Method;
  }

  // Update URL if specified
  if (request.url) {
    const resolvedUrl = resolveExpression(request.url, expressionContext);
    config.url = resolvedUrl;
  }

  // Update base URL if specified
  if (request.baseURL) {
    config.baseURL = resolveExpression(request.baseURL, expressionContext);
  }

  // Merge headers
  if (request.headers) {
    config.headers = {
      ...config.headers,
      ...resolveExpression(request.headers, expressionContext),
    };
  }

  // Merge query parameters
  if (request.qs) {
    config.params = {
      ...config.params,
      ...resolveExpression(request.qs, expressionContext),
    };
  }

  // Handle body
  if (request.body) {
    const resolvedBody = resolveExpression(request.body, expressionContext);
    if (typeof config.data === 'object' && typeof resolvedBody === 'object') {
      config.data = { ...config.data, ...resolvedBody };
    } else {
      config.data = resolvedBody;
    }
  }

  // Handle send configuration
  if (request.send || routing.send) {
    const send = request.send || routing.send!;
    const sendData = processSend(send, expressionContext);
    
    if (send.type === 'body') {
      if (send.property) {
        // Nest under a property
        config.data = {
          ...config.data,
          [send.property]: sendData,
        };
      } else {
        config.data = {
          ...config.data,
          ...sendData,
        };
      }
    } else if (send.type === 'query') {
      config.params = {
        ...config.params,
        ...sendData,
      };
    }
  }

  return config;
}

/**
 * Process send configuration to build data
 */
function processSend(send: RoutingSend, expressionContext: ExpressionContext): Record<string, any> {
  const data: Record<string, any> = {};

  if (send.properties) {
    for (const [key, value] of Object.entries(send.properties)) {
      data[key] = resolveExpression(value, expressionContext);
    }
  }

  if (send.value !== undefined) {
    return resolveExpression(send.value, expressionContext);
  }

  return data;
}

// ============================================================================
// Response Processor
// ============================================================================

/**
 * Process the response according to output configuration
 */
export function processResponse(
  response: any,
  routing: RoutingConfig | undefined,
  expressionContext: ExpressionContext
): any {
  if (!routing?.output?.postReceive) {
    return response;
  }

  let result = response;
  const ctx = { ...expressionContext, $response: response };

  for (const action of routing.output.postReceive) {
    result = applyPostReceiveAction(result, action, ctx);
  }

  return result;
}

/**
 * Apply a single post-receive action
 */
function applyPostReceiveAction(
  data: any,
  action: PostReceiveAction,
  context: ExpressionContext
): any {
  switch (action.type) {
    case 'set':
      if (action.properties?.value) {
        return resolveExpression(action.properties.value, context);
      }
      return data;

    case 'setKeyValue':
      if (action.properties?.key) {
        const key = resolveExpression(action.properties.key, context);
        return { [key]: data };
      }
      return data;

    case 'rootProperty':
      if (action.properties?.property) {
        const prop = action.properties.property;
        return data?.[prop];
      }
      return data;

    case 'filter':
      if (action.properties?.enabled !== undefined) {
        const enabled = resolveExpression(action.properties.enabled, context);
        if (!enabled) {
          return [];
        }
      }
      return data;

    case 'limit':
      if (Array.isArray(data) && action.properties?.maxResults) {
        return data.slice(0, action.properties.maxResults);
      }
      return data;

    case 'sort':
      // Basic sort implementation
      if (Array.isArray(data)) {
        return [...data].sort();
      }
      return data;

    default:
      return data;
  }
}

// ============================================================================
// Declarative Executor
// ============================================================================

/**
 * Execute a declarative node
 */
export async function executeDeclarativeNode(
  node: IDeclarativeNodeType,
  context: DeclarativeExecutionContext
): Promise<DeclarativeExecutionResult> {
  const description = node.description;
  
  // Build the request configuration
  const requestConfig = buildRequest(description, context);
  
  // Add credentials to headers if needed
  if (context.credentials) {
    applyCredentials(requestConfig, context.credentials, description);
  }

  // Ensure we have a URL
  if (!requestConfig.url && !requestConfig.baseURL) {
    throw new Error('No URL specified in request configuration or defaults');
  }

  try {
    // Build full URL
    let fullUrl = requestConfig.url || '';
    if (requestConfig.baseURL && !fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = requestConfig.baseURL.replace(/\/$/, '') + '/' + fullUrl.replace(/^\//, '');
    }
    
    // Add query params to URL
    if (requestConfig.params && Object.keys(requestConfig.params).length > 0) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(requestConfig.params)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + params.toString();
    }
    
    // Prepare headers
    const headers: Record<string, string> = { ...requestConfig.headers };
    
    // Prepare body
    let body: string | undefined;
    if (requestConfig.data) {
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      body = typeof requestConfig.data === 'string' ? requestConfig.data : JSON.stringify(requestConfig.data);
    }
    
    // Make the request
    const response = await fetch(fullUrl, {
      method: requestConfig.method || 'GET',
      headers,
      body,
    });
    
    // Parse response
    let responseData: any;
    const contentType = response.headers.get('content-type') || '';
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
    
    // Convert headers to object
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Find the operation routing for response processing
    const operationRouting = findOperationRouting(description.properties, context.parameters);
    
    // Check for HTTP errors
    if (!response.ok) {
      if (operationRouting?.request?.ignoreHttpStatusErrors) {
        return {
          success: true,
          data: responseData,
          status: response.status,
          headers: responseHeaders,
        };
      }
      throw new Error(`HTTP Error (${response.status}): ${JSON.stringify(responseData)}`);
    }
    
    // Process the response
    const expressionContext: ExpressionContext = {
      $parameter: context.parameters,
      $credentials: context.credentials || {},
      $response: responseData,
    };
    
    const processedData = processResponse(responseData, operationRouting, expressionContext);

    return {
      success: true,
      data: processedData,
      status: response.status,
      headers: responseHeaders,
    };
  } catch (error: any) {
    throw new Error(`Request failed: ${error.message}`);
  }
}

/**
 * Find the routing configuration for the current operation
 */
function findOperationRouting(
  properties: DeclarativeProperty[],
  parameters: Record<string, any>
): RoutingConfig | undefined {
  for (const prop of properties) {
    if (prop.type === 'options' && prop.options) {
      const value = parameters[prop.name];
      const selectedOption = (prop.options as PropertyOption[]).find(
        opt => opt.value === value
      );
      if (selectedOption?.routing) {
        return selectedOption.routing;
      }
    }
  }
  return undefined;
}

/**
 * Apply credentials to the request configuration
 */
function applyCredentials(
  config: RequestConfig,
  credentials: Record<string, any>,
  description: DeclarativeNodeDescription
): void {
  // Common patterns for credential application
  
  // API Key in header
  if (credentials.apiKey) {
    const headerName = credentials.headerName || credentials.apiKeyHeader || 'Authorization';
    const headerPrefix = credentials.headerPrefix || credentials.apiKeyPrefix || '';
    
    config.headers = {
      ...config.headers,
      [headerName]: headerPrefix ? `${headerPrefix} ${credentials.apiKey}` : credentials.apiKey,
    };
  }

  // Bearer token
  if (credentials.accessToken || credentials.token || credentials.bearerToken) {
    const token = credentials.accessToken || credentials.token || credentials.bearerToken;
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  // Basic auth
  if (credentials.username && credentials.password) {
    const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
    config.headers = {
      ...config.headers,
      Authorization: `Basic ${auth}`,
    };
  }

  // OAuth2 token
  if (credentials.oauthTokenData?.access_token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${credentials.oauthTokenData.access_token}`,
    };
  }
}

// ============================================================================
// Detection and Integration
// ============================================================================

/**
 * Check if a loaded module is a declarative node type
 */
export function isDeclarativeNode(module: any): boolean {
  // Check if it has the description property with the required fields
  if (!module) return false;
  
  // Could be a class instance or the class itself
  const target = module.description ? module : (module.prototype?.description ? new module() : null);
  
  if (!target?.description) return false;
  
  const desc = target.description;
  
  // Must have properties with routing or requestDefaults
  const hasRoutingProperties = desc.properties?.some((prop: DeclarativeProperty) => {
    if (prop.routing) return true;
    if (prop.type === 'options' && prop.options) {
      return (prop.options as PropertyOption[]).some(opt => opt.routing);
    }
    return false;
  });

  const hasRequestDefaults = !!desc.requestDefaults;
  
  return hasRoutingProperties || hasRequestDefaults;
}

/**
 * Extract declarative node from a loaded module
 */
export function extractDeclarativeNode(loadedModule: any): IDeclarativeNodeType | null {
  // Check direct export
  if (isDeclarativeNode(loadedModule)) {
    return loadedModule.description ? loadedModule : new loadedModule();
  }

  // Check named exports
  for (const key of Object.keys(loadedModule)) {
    const exported = loadedModule[key];
    if (isDeclarativeNode(exported)) {
      return exported.description ? exported : new exported();
    }
  }

  // Check default export
  if (loadedModule.default && isDeclarativeNode(loadedModule.default)) {
    return loadedModule.default.description 
      ? loadedModule.default 
      : new loadedModule.default();
  }

  return null;
}

/**
 * Convert declarative node to Bits action format for compatibility
 */
export function declarativeNodeToBitsAction(node: IDeclarativeNodeType): {
  name: string;
  displayName: string;
  description: string;
  props: Record<string, any>;
  run: (context: { auth?: any; propsValue: Record<string, any> }) => Promise<any>;
} {
  const desc = node.description;

  // Convert declarative properties to bits properties
  const props: Record<string, any> = {};
  for (const prop of desc.properties) {
    props[prop.name] = convertDeclarativePropertyToBitsProp(prop);
  }

  return {
    name: desc.name,
    displayName: desc.displayName,
    description: desc.description || '',
    props,
    run: async (context) => {
      const result = await executeDeclarativeNode(node, {
        parameters: context.propsValue,
        credentials: context.auth,
      });
      return result.data;
    },
  };
}

/**
 * Convert a declarative property to bits property format
 */
function convertDeclarativePropertyToBitsProp(prop: DeclarativeProperty): any {
  const base = {
    displayName: prop.displayName,
    description: prop.description,
    required: prop.required || false,
    defaultValue: prop.default,
  };

  switch (prop.type) {
    case 'string':
      return { ...base, type: 'SHORT_TEXT' };
    case 'number':
      return { ...base, type: 'NUMBER' };
    case 'boolean':
      return { ...base, type: 'CHECKBOX' };
    case 'options':
      return {
        ...base,
        type: 'STATIC_DROPDOWN',
        options: {
          options: (prop.options as PropertyOption[]).map(opt => ({
            label: opt.name,
            value: opt.value,
          })),
        },
      };
    case 'json':
      return { ...base, type: 'JSON' };
    case 'collection':
    case 'fixedCollection':
      return { ...base, type: 'OBJECT' };
    default:
      return { ...base, type: 'SHORT_TEXT' };
  }
}

// Alias for execute
export const execute = executeDeclarativeNode;
