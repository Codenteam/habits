/**
 * Bits Framework
 * 
 * This module provides framework utilities for creating bits modules,
 * 
 * Modules can import from '@ha-bits/cortex' to access these utilities.
 */

import { fetch } from '@ha-bits/bindings';
import { ILogger } from '@ha-bits/core';
// ============================================================================
// HTTP Client Types and Implementation
// ============================================================================

/**
 * Authentication types for HTTP requests
 */
export enum AuthenticationType {
  BEARER_TOKEN = 'BEARER_TOKEN',
  BASIC = 'BASIC',
  API_KEY = 'API_KEY',
  CUSTOM = 'CUSTOM',
  NONE = 'NONE',
}

/**
 * HTTP Methods
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

/**
 * HTTP request configuration
 */
export interface HttpRequest {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  queryParams?: Record<string, string>;
  timeout?: number;
  authentication?: {
    type: AuthenticationType;
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    headerName?: string;
  };
}

/**
 * HTTP response
 */
export interface HttpResponse<T = any> {
  status: number;
  headers: Record<string, string>;
  body: T;
}

/**
 * HTTP client for making requests
 */
export const httpClient = {
  async sendRequest<T = any>(request: HttpRequest): Promise<HttpResponse<T>> {
    const headers: Record<string, string> = { ...request.headers };

    // Handle authentication
    if (request.authentication) {
      switch (request.authentication.type) {
        case AuthenticationType.BEARER_TOKEN:
          headers['Authorization'] = `Bearer ${request.authentication.token}`;
          break;
        case AuthenticationType.BASIC:
          const credentials = Buffer.from(
            `${request.authentication.username || ''}:${request.authentication.password || ''}`
          ).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
          break;
        case AuthenticationType.API_KEY:
          const headerName = request.authentication.headerName || 'X-API-Key';
          headers[headerName] = request.authentication.apiKey || '';
          break;
      }
    }

    // Build URL with query params
    let url = request.url;
    if (request.queryParams && Object.keys(request.queryParams).length > 0) {
      const params = new URLSearchParams(request.queryParams);
      url += (url.includes('?') ? '&' : '?') + params.toString();
    }

    const response = await fetch(url, {
      method: request.method,
      headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
    });

    // Convert Headers to plain object
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      headers: responseHeaders,
      body: await response.json() as T,
    };
  },
};

// ============================================================================
// Property Types and Builders
// ============================================================================

/**
 * Store scope for persistent storage
 */
export enum StoreScope {
  PROJECT = 'PROJECT',
  FLOW = 'FLOW',
}

/**
 * Property value types
 */
export type PropertyType = 
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'NUMBER'
  | 'CHECKBOX'
  | 'DROPDOWN'
  | 'STATIC_DROPDOWN'
  | 'MULTI_SELECT_DROPDOWN'
  | 'JSON'
  | 'OBJECT'
  | 'ARRAY'
  | 'FILE'
  | 'DATE_TIME'
  | 'MARKDOWN'
  | 'CUSTOM_AUTH'
  | 'SECRET_TEXT';

/**
 * Base property definition
 */
export interface PropertyDefinition<T = any> {
  type: PropertyType;
  displayName: string;
  description?: string;
  required: boolean;
  defaultValue?: T;
}

/**
 * Dropdown option
 */
export interface DropdownOption<T = any> {
  label: string;
  value: T;
}

/**
 * Dropdown state (for dynamic dropdowns)
 */
export interface DropdownState<T = any> {
  disabled: boolean;
  placeholder?: string;
  options: DropdownOption<T>[];
}

/**
 * Dynamic dropdown property
 */
export interface DynamicDropdownProperty<T = any> extends PropertyDefinition<T> {
  type: 'DROPDOWN';
  refreshers: string[];
  options: (context: { auth?: any; propsValue?: Record<string, any> }) => Promise<DropdownState<T>>;
}

/**
 * Static dropdown property
 */
export interface StaticDropdownProperty<T = any> extends PropertyDefinition<T> {
  type: 'STATIC_DROPDOWN';
  options: {
    disabled?: boolean;
    options: DropdownOption<T>[];
  };
}

/**
 * Array property for defining arrays with sub-properties
 */
export interface ArrayProperty<T = any> extends PropertyDefinition<T[]> {
  type: 'ARRAY';
  properties: Record<string, PropertyDefinition>;
}

/**
 * File property value
 */
export interface FilePropertyValue {
  filename: string;
  data: Buffer;
  extension?: string;
}

/**
 * Short text property config
 */
interface ShortTextConfig {
  displayName: string;
  description?: string;
  required: boolean;
  defaultValue?: string;
}

/**
 * Long text property config
 */
interface LongTextConfig {
  displayName: string;
  description?: string;
  required: boolean;
  defaultValue?: string;
}

/**
 * Number property config
 */
interface NumberConfig {
  displayName: string;
  description?: string;
  required: boolean;
  defaultValue?: number;
}

/**
 * Checkbox property config
 */
interface CheckboxConfig {
  displayName: string;
  description?: string;
  required: boolean;
  defaultValue?: boolean;
}

/**
 * Dropdown property config
 */
interface DropdownConfig<T = any> {
  displayName: string;
  description?: string;
  required: boolean;
  defaultValue?: T;
  refreshers: string[];
  auth?: any;
  options: (context: { auth?: any; propsValue?: Record<string, any> }) => Promise<DropdownState<T>>;
}

/**
 * Static dropdown property config
 */
interface StaticDropdownConfig<T = any> {
  displayName: string;
  description?: string;
  required: boolean;
  defaultValue?: T;
  options: {
    disabled?: boolean;
    options: DropdownOption<T>[];
  };
}

/**
 * JSON property config
 */
interface JsonConfig {
  displayName: string;
  description?: string;
  required: boolean;
  defaultValue?: any;
}

/**
 * Object property config
 */
interface ObjectConfig<T = any> {
  displayName: string;
  description?: string;
  required: boolean;
  defaultValue?: T;
  properties?: Record<string, PropertyDefinition>;
}

/**
 * Array property config
 */
interface ArrayConfig {
  displayName: string;
  description?: string;
  required: boolean;
  defaultValue?: any[];
  properties: Record<string, PropertyDefinition>;
}

/**
 * File property config
 */
interface FileConfig {
  displayName: string;
  description?: string;
  required: boolean;
}

/**
 * Property builder - creates property definitions
 */
export const Property = {
  ShortText(config: ShortTextConfig): PropertyDefinition<string> {
    return {
      type: 'SHORT_TEXT',
      displayName: config.displayName,
      description: config.description,
      required: config.required,
      defaultValue: config.defaultValue,
    };
  },

  LongText(config: LongTextConfig): PropertyDefinition<string> {
    return {
      type: 'LONG_TEXT',
      displayName: config.displayName,
      description: config.description,
      required: config.required,
      defaultValue: config.defaultValue,
    };
  },

  Number(config: NumberConfig): PropertyDefinition<number> {
    return {
      type: 'NUMBER',
      displayName: config.displayName,
      description: config.description,
      required: config.required,
      defaultValue: config.defaultValue,
    };
  },

  Checkbox(config: CheckboxConfig): PropertyDefinition<boolean> {
    return {
      type: 'CHECKBOX',
      displayName: config.displayName,
      description: config.description,
      required: config.required,
      defaultValue: config.defaultValue,
    };
  },

  Dropdown<T = any>(config: DropdownConfig<T>): DynamicDropdownProperty<T> {
    return {
      type: 'DROPDOWN',
      displayName: config.displayName,
      description: config.description,
      required: config.required,
      defaultValue: config.defaultValue,
      refreshers: config.refreshers,
      options: config.options,
    };
  },

  StaticDropdown<T = any>(config: StaticDropdownConfig<T>): StaticDropdownProperty<T> {
    return {
      type: 'STATIC_DROPDOWN',
      displayName: config.displayName,
      description: config.description,
      required: config.required,
      defaultValue: config.defaultValue,
      options: config.options,
    };
  },

  Json(config: JsonConfig): PropertyDefinition<any> {
    return {
      type: 'JSON',
      displayName: config.displayName,
      description: config.description,
      required: config.required,
      defaultValue: config.defaultValue,
    };
  },

  Object<T = any>(config: ObjectConfig<T>): PropertyDefinition<T> {
    return {
      type: 'OBJECT',
      displayName: config.displayName,
      description: config.description,
      required: config.required,
      defaultValue: config.defaultValue,
    };
  },

  Array(config: ArrayConfig): ArrayProperty {
    return {
      type: 'ARRAY',
      displayName: config.displayName,
      description: config.description,
      required: config.required,
      defaultValue: config.defaultValue,
      properties: config.properties,
    };
  },

  File(config: FileConfig): PropertyDefinition<FilePropertyValue> {
    return {
      type: 'FILE',
      displayName: config.displayName,
      description: config.description,
      required: config.required,
    };
  },

  DateTime(config: { displayName: string; description?: string; required: boolean; defaultValue?: string }): PropertyDefinition<string> {
    return {
      type: 'DATE_TIME',
      displayName: config.displayName,
      description: config.description,
      required: config.required,
      defaultValue: config.defaultValue,
    };
  },

  Markdown(config: { displayName: string; description?: string; value: string }): PropertyDefinition<string> {
    return {
      type: 'MARKDOWN',
      displayName: config.displayName,
      description: config.description,
      required: false,
      defaultValue: config.value,
    };
  },
};

// ============================================================================
// Auth Definitions
// ============================================================================

/**
 * Custom auth validation result
 */
export interface AuthValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Custom auth configuration
 */
interface CustomAuthConfig<T = any> {
  description?: string;
  required: boolean;
  props: Record<string, PropertyDefinition>;
  validate?: (context: { auth: T }) => Promise<AuthValidationResult>;
}

/**
 * Secret text configuration
 */
interface SecretTextConfig {
  displayName: string;
  description?: string;
  required: boolean;
}

/**
 * Authentication property builders
 */
export const BitAuth = {
  CustomAuth<T = any>(config: CustomAuthConfig<T>): PropertyDefinition & { props: Record<string, PropertyDefinition>; validate?: (context: { auth: T }) => Promise<AuthValidationResult> } {
    return {
      type: 'CUSTOM_AUTH',
      displayName: 'Authentication',
      description: config.description,
      required: config.required,
      props: config.props,
      validate: config.validate,
    };
  },

  SecretText(config: SecretTextConfig): PropertyDefinition<string> {
    return {
      type: 'SECRET_TEXT',
      displayName: config.displayName,
      description: config.description,
      required: config.required,
    };
  },

  None(): PropertyDefinition<void> {
    return {
      type: 'CUSTOM_AUTH',
      displayName: 'None',
      required: false,
    };
  },

  OAuth2(config: {
    displayName: string;
    description?: string;
    required: boolean;
    authorizationUrl: string;
    tokenUrl: string;
    clientId?: string;
    clientSecret?: string;
    scopes: string[];
    pkce?: boolean;
    extraAuthParams?: Record<string, string>;
  }): PropertyDefinition<{ accessToken: string; refreshToken?: string; tokenType: string; expiresAt?: number }> {
    return {
      type: 'OAUTH2',
      displayName: config.displayName,
      description: config.description,
      required: config.required,
      authorizationUrl: config.authorizationUrl,
      tokenUrl: config.tokenUrl,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      scopes: config.scopes,
      pkce: config.pkce ?? true, // PKCE enabled by default
      extraAuthParams: config.extraAuthParams,
    } as any;
  },

  /** @deprecated Use OAuth2() instead */
  OAuth2PKCE(config: {
    displayName: string;
    description?: string;
    required: boolean;
    authorizationUrl: string;
    tokenUrl: string;
    clientId?: string;
    clientSecret?: string;
    scopes: string[];
    extraAuthParams?: Record<string, string>;
  }): PropertyDefinition<{ accessToken: string; refreshToken?: string; tokenType: string; expiresAt?: number }> {
    return BitAuth.OAuth2({ ...config, pkce: true });
  },

  BasicAuth(config: any): PropertyDefinition<{ username: string; password: string }> {
    return {
      type: 'CUSTOM_AUTH',
      displayName: 'Basic Authentication',
      description: config.description,
      required: config.required,
      ...config,
    };
  },
};

export const PieceAuth = BitAuth; // Alias for compatibility with AP if needed

// ============================================================================
// Action Builder
// ============================================================================

/**
 * Action context passed to run function
 */
export interface BitActionContext<AuthType = any, PropsType = any> {
  auth: AuthType;
  propsValue: PropsType;
  store: {
    get: <T>(key: string, scope?: StoreScope) => Promise<T | null>;
    put: <T>(key: string, value: T, scope?: StoreScope) => Promise<void>;
    delete: (key: string, scope?: StoreScope) => Promise<void>;
  };
  files: {
    write: (params: { fileName: string; data: Buffer }) => Promise<string>;
  };
  server: {
    publicUrl: string;
    apiUrl: string;
  };
  /** Logger instance for structured logging within the bit */
  logger?: ILogger;
}

/**
 * Action definition
 */
export interface BitAction<AuthType = any, PropsType = Record<string, any>> {
  name: string;
  displayName: string;
  description: string;
  auth?: PropertyDefinition;
  props: Record<string, PropertyDefinition>;
  run: (context: BitActionContext<AuthType, PropsType>) => Promise<any>;
}

/**
 * Action configuration for createAction
 */
interface ActionConfig<AuthType = any, PropsType = Record<string, any>> {
  name: string;
  displayName: string;
  description: string;
  auth?: PropertyDefinition;
  props: Record<string, PropertyDefinition>;
  run: (context: BitActionContext<AuthType, PropsType>) => Promise<any>;
}

/**
 * Create a bit action
 */
export function createAction<AuthType = any, PropsType = Record<string, any>>(
  config: ActionConfig<AuthType, PropsType>
): BitAction<AuthType, PropsType> {
  return {
    name: config.name,
    displayName: config.displayName,
    description: config.description,
    auth: config.auth,
    props: config.props,
    run: config.run,
  };
}

// Alias for compatibility
export const createBitAction = createAction;

// ============================================================================
// Trigger Builder
// ============================================================================

/**
 * Trigger types
 */
export enum TriggerStrategy {
  POLLING = 'POLLING',
  WEBHOOK = 'WEBHOOK',
  APP_WEBHOOK = 'APP_WEBHOOK',
}

/**
 * Webhook filter payload - passed to trigger.filter() to determine if trigger should handle the event
 */
export interface WebhookFilterPayload {
  /** Raw request body */
  body: any;
  /** HTTP headers */
  headers: Record<string, string>;
  /** Query string parameters */
  query: Record<string, string>;
  /** HTTP method */
  method: string;
}

/**
 * Trigger context
 */
export interface BitTriggerContext<AuthType = any, PropsType = any> {
  auth: AuthType;
  propsValue: PropsType;
  payload: unknown;
  webhookUrl?: string;
  store: {
    get: <T>(key: string, scope?: StoreScope) => Promise<T | null>;
    put: <T>(key: string, value: T, scope?: StoreScope) => Promise<void>;
    delete: (key: string, scope?: StoreScope) => Promise<void>;
  };
  app: {
    createListeners: (listener: { events: string[]; identifierValue: string; identifierKey: string }) => void;
  };
  setSchedule: (options: { cronExpression: string; timezone?: string }) => void;
  /** Webhook payload data (for webhook triggers) */
  webhookPayload?: WebhookFilterPayload;
}

/**
 * Trigger definition
 */
export interface BitTrigger<AuthType = any, PropsType = Record<string, any>> {
  name: string;
  displayName: string;
  description: string;
  type: TriggerStrategy;
  auth?: PropertyDefinition;
  props: Record<string, PropertyDefinition>;
  onEnable?: (context: BitTriggerContext<AuthType, PropsType>) => Promise<void>;
  onDisable?: (context: BitTriggerContext<AuthType, PropsType>) => Promise<void>;
  run?: (context: BitTriggerContext<AuthType, PropsType>) => Promise<any[]>;
  test?: (context: BitTriggerContext<AuthType, PropsType>) => Promise<any[]>;
  onHandshake?: (context: BitTriggerContext<AuthType, PropsType>) => Promise<any>;
  /**
   * Filter function for webhook triggers.
   * Called when a webhook is received for this bit's module.
   * Return true if this trigger should handle the event, false to skip.
   * If not defined, the trigger accepts all webhook events.
   */
  filter?: (payload: WebhookFilterPayload) => boolean | Promise<boolean>;
  sampleData?: any;
}

/**
 * Trigger configuration
 */
interface TriggerConfig<AuthType = any, PropsType = Record<string, any>> {
  name: string;
  displayName: string;
  description: string;
  type: TriggerStrategy;
  auth?: PropertyDefinition;
  props: Record<string, PropertyDefinition>;
  onEnable?: (context: BitTriggerContext<AuthType, PropsType>) => Promise<void>;
  onDisable?: (context: BitTriggerContext<AuthType, PropsType>) => Promise<void>;
  run?: (context: BitTriggerContext<AuthType, PropsType>) => Promise<any[]>;
  test?: (context: BitTriggerContext<AuthType, PropsType>) => Promise<any[]>;
  onHandshake?: (context: BitTriggerContext<AuthType, PropsType>) => Promise<any>;
  filter?: (payload: WebhookFilterPayload) => boolean | Promise<boolean>;
  sampleData?: any;
}

/**
 * Create a bit trigger
 */
export function createTrigger<AuthType = any, PropsType = Record<string, any>>(
  config: TriggerConfig<AuthType, PropsType>
): BitTrigger<AuthType, PropsType> {
  return {
    name: config.name,
    displayName: config.displayName,
    description: config.description,
    type: config.type,
    auth: config.auth,
    props: config.props,
    onEnable: config.onEnable,
    onDisable: config.onDisable,
    run: config.run,
    test: config.test,
    onHandshake: config.onHandshake,
    filter: config.filter,
    sampleData: config.sampleData,
  };
}

// Alias for compatibility
export const createBitTrigger = createTrigger;

// ============================================================================
// Piece/Bit Builder
// ============================================================================

/**
 * Piece/Bit categories
 */
export enum BitCategory {
  ARTIFICIAL_INTELLIGENCE = 'ARTIFICIAL_INTELLIGENCE',
  COMMUNICATION = 'COMMUNICATION',
  CORE = 'CORE',
  CONTENT_AND_FILES = 'CONTENT_AND_FILES',
  DEVELOPER_TOOLS = 'DEVELOPER_TOOLS',
  BUSINESS_INTELLIGENCE = 'BUSINESS_INTELLIGENCE',
  ACCOUNTING = 'ACCOUNTING',
  SALES_AND_CRM = 'SALES_AND_CRM',
  PRODUCTIVITY = 'PRODUCTIVITY',
  MARKETING = 'MARKETING',
  CUSTOMER_SUPPORT = 'CUSTOMER_SUPPORT',
  PREMIUM = 'PREMIUM',
}

export enum PieceCategory {
  ARTIFICIAL_INTELLIGENCE = 'ARTIFICIAL_INTELLIGENCE',
  COMMUNICATION = 'COMMUNICATION',
  CORE = 'CORE',
  CONTENT_AND_FILES = 'CONTENT_AND_FILES',
  DEVELOPER_TOOLS = 'DEVELOPER_TOOLS',
  BUSINESS_INTELLIGENCE = 'BUSINESS_INTELLIGENCE',
  ACCOUNTING = 'ACCOUNTING',
  SALES_AND_CRM = 'SALES_AND_CRM',
  PRODUCTIVITY = 'PRODUCTIVITY',
  MARKETING = 'MARKETING',
  CUSTOMER_SUPPORT = 'CUSTOMER_SUPPORT',
  PREMIUM = 'PREMIUM',
}

/**
 * Bit/Piece definition
 */
export interface Bit<AuthType = any> {
  /**
   * Unique identifier for this bit module.
   * Used for webhook routing: /webhook/:id
   * Example: 'gohighlevel', 'hubspot', 'salesforce'
   */
  id?: string;
  displayName: string;
  description?: string;
  logoUrl: string;
  minimumSupportedRelease?: string;
  maximumSupportedRelease?: string;
  categories?: BitCategory[];
  auth?: PropertyDefinition;
  actions: Record<string, BitAction<AuthType>>;
  triggers: Record<string, BitTrigger<AuthType>>;
  authors?: string[];
}

/**
 * Bit configuration for createBit/createPiece
 */
interface BitConfig<AuthType = any> {
  id?: string;
  displayName: string;
  description?: string;
  logoUrl: string;
  minimumSupportedRelease?: string;
  maximumSupportedRelease?: string;
  categories?: BitCategory[];
  auth?: PropertyDefinition;
  actions: BitAction<AuthType>[];
  triggers?: BitTrigger<AuthType>[];
  authors?: string[];
}

/**
 * Create a bit/piece module
 */
export function createBit<AuthType = any>(config: BitConfig<AuthType>): Bit<AuthType> {
  // Convert arrays to records keyed by name
  const actionsRecord: Record<string, BitAction<AuthType>> = {};
  for (const action of config.actions) {
    actionsRecord[action.name] = action;
  }

  const triggersRecord: Record<string, BitTrigger<AuthType>> = {};
  if (config.triggers) {
    for (const trigger of config.triggers) {
      triggersRecord[trigger.name] = trigger;
    }
  }

  return {
    id: config.id,
    displayName: config.displayName,
    description: config.description,
    logoUrl: config.logoUrl,
    minimumSupportedRelease: config.minimumSupportedRelease,
    maximumSupportedRelease: config.maximumSupportedRelease,
    categories: config.categories,
    auth: config.auth,
    actions: actionsRecord,
    triggers: triggersRecord,
    authors: config.authors,
  };
}

export const createPiece = createBit;

// ============================================================================
// Utility: Custom API Call Action
// ============================================================================

/**
 * Create a custom API call action 
 */
export function createCustomApiCallAction(config: {
  baseUrl: (auth: any) => string;
  auth: PropertyDefinition;
  authMapping?: (auth: any) => Promise<{ headers: Record<string, string> }>;
}): BitAction {
  return createAction({
    name: 'custom_api_call',
    displayName: 'Custom API Call',
    description: 'Make a custom API call to any endpoint',
    auth: config.auth,
    props: {
      method: Property.StaticDropdown({
        displayName: 'Method',
        required: true,
        defaultValue: 'GET',
        options: {
          options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'PATCH', value: 'PATCH' },
            { label: 'DELETE', value: 'DELETE' },
          ],
        },
      }),
      path: Property.ShortText({
        displayName: 'Path',
        description: 'API path (e.g., /users)',
        required: true,
      }),
      headers: Property.Json({
        displayName: 'Headers',
        description: 'Request headers as JSON object',
        required: false,
        defaultValue: {},
      }),
      queryParams: Property.Json({
        displayName: 'Query Parameters',
        description: 'Query parameters as JSON object',
        required: false,
        defaultValue: {},
      }),
      body: Property.Json({
        displayName: 'Body',
        description: 'Request body as JSON (for POST, PUT, PATCH)',
        required: false,
        defaultValue: {},
      }),
    },
    async run({ auth, propsValue }) {
      const baseUrl = config.baseUrl(auth);
      const authHeaders = config.authMapping 
        ? await config.authMapping(auth)
        : { headers: {} };

      const response = await httpClient.sendRequest({
        url: `${baseUrl}${propsValue.path}`,
        method: propsValue.method as HttpMethod,
        headers: {
          ...authHeaders.headers,
          ...(propsValue.headers || {}),
        },
        queryParams: propsValue.queryParams,
        body: propsValue.body,
      });

      return response.body;
    },
  });
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export {
  // BitsDoer types (for runtime)
  type BitsAction,
  type BitsActionContext,
  type BitsTrigger,
  type BitsTriggerType,
  type BitsTriggerContext,
  type BitsStore,
  type BitsPiece,
} from './bitsDoer';

// ============================================================================
// Declarative Node Types (for creating n8n-style declarative bits)
// ============================================================================

export {
  // Core types for declarative nodes
  type IDeclarativeNodeType,
  type DeclarativeNodeDescription,
  type DeclarativeProperty,
  type PropertyOption,
  type DisplayOptions,
  type CredentialDefinition,
  
  // Routing configuration
  type RoutingConfig,
  type RoutingRequest,
  type RoutingSend,
  type RoutingOutput,
  type PostReceiveAction,
  type PreSendAction,
  type RequestDefaults,
  type DeclarativeHttpMethod,
  
  // Execution
  type DeclarativeExecutionContext,
  type DeclarativeExecutionResult,
  type ExpressionContext,
  
  // Functions
  executeDeclarativeNode,
  buildRequest,
  resolveExpression,
  processResponse,
  isDeclarativeNode,
  extractDeclarativeNode,
  declarativeNodeToBitsAction,
} from './declarativeExecutor';
