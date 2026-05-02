/**
 * Bits Framework
 * 
 * This module provides framework utilities for creating bits modules,
 * 
 * Modules can import from '@ha-bits/cortex' to access these utilities.
 */

import { fetch } from '@ha-bits/bindings';
import { ILogger } from '@ha-bits/core/logger';
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
// Routine Builder
// ============================================================================

/**
 * Routine context passed to run function
 */
export interface BitRoutineContext<AuthType = any, PropsType = any> {
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

/** @deprecated Use BitRoutineContext instead */
export type BitActionContext<AuthType = any, PropsType = any> = BitRoutineContext<AuthType, PropsType>;

/**
 * Routine definition - represents an operation that can be executed
 */
export interface BitRoutine<AuthType = any, PropsType = Record<string, any>> {
  name: string;
  displayName: string;
  description: string;
  auth?: PropertyDefinition;
  props: Record<string, PropertyDefinition>;
  run: (context: BitRoutineContext<AuthType, PropsType>) => Promise<any>;
}

/** @deprecated Use BitRoutine instead */
export type BitAction<AuthType = any, PropsType = Record<string, any>> = BitRoutine<AuthType, PropsType>;

/**
 * Routine configuration for createRoutine
 */
interface RoutineConfig<AuthType = any, PropsType = Record<string, any>> {
  name: string;
  displayName: string;
  description: string;
  auth?: PropertyDefinition;
  props: Record<string, PropertyDefinition>;
  run: (context: BitRoutineContext<AuthType, PropsType>) => Promise<any>;
}

/** @deprecated Use RoutineConfig type */
type ActionConfig<AuthType = any, PropsType = Record<string, any>> = RoutineConfig<AuthType, PropsType>;

/**
 * Create a bit routine
 */
export function createRoutine<AuthType = any, PropsType = Record<string, any>>(
  config: RoutineConfig<AuthType, PropsType>
): BitRoutine<AuthType, PropsType> {
  return {
    name: config.name,
    displayName: config.displayName,
    description: config.description,
    auth: config.auth,
    props: config.props,
    run: config.run,
  };
}

/** @deprecated Use createRoutine instead */
export const createAction = createRoutine;

/** @deprecated Use createRoutine instead */
export const createBitAction = createRoutine;

/** Alias for createRoutine */
export const createBitRoutine = createRoutine;

// ============================================================================
// Cue Builder
// ============================================================================

/**
 * Cue strategy - determines how the cue detects events
 */
export enum CueStrategy {
  POLLING = 'POLLING',
  WEBHOOK = 'WEBHOOK',
  APP_WEBHOOK = 'APP_WEBHOOK',
  /** Streaming cue strategy for triggers that continuously receive real-time events (e.g., microphone, websocket, device sensors). Follows POLLING-like lifecycle: onEnable → run (per event) → onDisable. */
  STREAMING = 'STREAMING',
  /** Custom cue strategy for triggers that manage their own lifecycle entirely (e.g., continuous microphone listening, device sensors) */
  CUSTOM = 'CUSTOM',
}

/** @deprecated Use CueStrategy instead */
export const TriggerStrategy = CueStrategy;
/** @deprecated Use CueStrategy instead */
export type TriggerStrategy = CueStrategy;

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
 * Cue context - passed to cue lifecycle methods
 */
export interface BitCueContext<AuthType = any, PropsType = any> {
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
  /** Webhook payload data (for webhook cues) */
  webhookPayload?: WebhookFilterPayload;
  /** Executor for re-invoking the parent workflow (streaming triggers only) */
  executor?: {
    executeWorkflow(workflowId: string, options?: { initialContext?: Record<string, any> }): Promise<any>;
  };
  /** ID of the workflow this cue belongs to */
  workflowId?: string;
  /** ID of this cue node */
  nodeId?: string;
}

/** @deprecated Use BitCueContext instead */
export type BitTriggerContext<AuthType = any, PropsType = any> = BitCueContext<AuthType, PropsType>;

/**
 * Cue definition - represents an event or condition that starts a habit
 */
export interface BitCue<AuthType = any, PropsType = Record<string, any>> {
  name: string;
  displayName: string;
  description: string;
  type: CueStrategy;
  auth?: PropertyDefinition;
  props: Record<string, PropertyDefinition>;
  onEnable?: (context: BitCueContext<AuthType, PropsType>) => Promise<void>;
  onDisable?: (context: BitCueContext<AuthType, PropsType>) => Promise<void>;
  run?: (context: BitCueContext<AuthType, PropsType>) => Promise<any[]>;
  test?: (context: BitCueContext<AuthType, PropsType>) => Promise<any[]>;
  onHandshake?: (context: BitCueContext<AuthType, PropsType>) => Promise<any>;
  /**
   * Filter function for webhook cues.
   * Called when a webhook is received for this bit's module.
   * Return true if this cue should handle the event, false to skip.
   * If not defined, the cue accepts all webhook events.
   */
  filter?: (payload: WebhookFilterPayload) => boolean | Promise<boolean>;
  sampleData?: any;
}

/** @deprecated Use BitCue instead */
export type BitTrigger<AuthType = any, PropsType = Record<string, any>> = BitCue<AuthType, PropsType>;

/**
 * Cue configuration for createCue
 */
interface CueConfig<AuthType = any, PropsType = Record<string, any>> {
  name: string;
  displayName: string;
  description: string;
  type: CueStrategy;
  auth?: PropertyDefinition;
  props: Record<string, PropertyDefinition>;
  onEnable?: (context: BitCueContext<AuthType, PropsType>) => Promise<void>;
  onDisable?: (context: BitCueContext<AuthType, PropsType>) => Promise<void>;
  run?: (context: BitCueContext<AuthType, PropsType>) => Promise<any[]>;
  test?: (context: BitCueContext<AuthType, PropsType>) => Promise<any[]>;
  onHandshake?: (context: BitCueContext<AuthType, PropsType>) => Promise<any>;
  filter?: (payload: WebhookFilterPayload) => boolean | Promise<boolean>;
  sampleData?: any;
}

/** @deprecated Use CueConfig type */
type TriggerConfig<AuthType = any, PropsType = Record<string, any>> = CueConfig<AuthType, PropsType>;

/**
 * Create a bit cue
 */
export function createCue<AuthType = any, PropsType = Record<string, any>>(
  config: CueConfig<AuthType, PropsType>
): BitCue<AuthType, PropsType> {
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

/** @deprecated Use createCue instead */
export const createTrigger = createCue;

/** @deprecated Use createCue instead */
export const createBitTrigger = createCue;

/** Alias for createCue */
export const createBitCue = createCue;

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
  /**
   * Runtime environment where this bit can execute.
   * - 'app': Mobile/desktop Tauri app only (requires native plugins)
   * - 'server': Server-side only (Node.js environment)
   * - 'all': Works in both environments (default)
   */
  runtime?: 'app' | 'server' | 'all';
  minimumSupportedRelease?: string;
  maximumSupportedRelease?: string;
  categories?: BitCategory[];
  auth?: PropertyDefinition;
  /** Routines provided by this bit */
  routines: Record<string, BitRoutine<AuthType>>;
  /** Cues provided by this bit */
  cues: Record<string, BitCue<AuthType>>;
  /** @deprecated Use routines instead */
  actions: Record<string, BitRoutine<AuthType>>;
  /** @deprecated Use cues instead */
  triggers: Record<string, BitCue<AuthType>>;
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
  /**
   * Runtime environment where this bit can execute.
   * - 'app': Mobile/desktop Tauri app only (requires native plugins)
   * - 'server': Server-side only (Node.js environment)
   * - 'all': Works in both environments (default)
   */
  runtime?: 'app' | 'server' | 'all';
  minimumSupportedRelease?: string;
  maximumSupportedRelease?: string;
  categories?: BitCategory[];
  auth?: PropertyDefinition;
  /** Routines to include (can also use deprecated 'actions' name) */
  routines?: BitRoutine<AuthType>[];
  /** @deprecated Use routines instead */
  actions?: BitRoutine<AuthType>[];
  /** Cues to include (can also use deprecated 'triggers' name) */
  cues?: BitCue<AuthType>[];
  /** @deprecated Use cues instead */
  triggers?: BitCue<AuthType>[];
  authors?: string[];
}

/**
 * Create a bit/piece module
 */
export function createBit<AuthType = any>(config: BitConfig<AuthType>): Bit<AuthType> {
  // Support both new (routines/cues) and old (actions/triggers) property names
  const routinesArray = config.routines || config.actions || [];
  const cuesArray = config.cues || config.triggers || [];

  // Convert arrays to records keyed by name
  const routinesRecord: Record<string, BitRoutine<AuthType>> = {};
  for (const routine of routinesArray) {
    routinesRecord[routine.name] = routine;
  }

  const cuesRecord: Record<string, BitCue<AuthType>> = {};
  for (const cue of cuesArray) {
    cuesRecord[cue.name] = cue;
  }

  return {
    id: config.id,
    displayName: config.displayName,
    description: config.description,
    logoUrl: config.logoUrl,
    runtime: config.runtime,
    minimumSupportedRelease: config.minimumSupportedRelease,
    maximumSupportedRelease: config.maximumSupportedRelease,
    categories: config.categories,
    auth: config.auth,
    routines: routinesRecord,
    cues: cuesRecord,
    // Deprecated aliases pointing to same records
    actions: routinesRecord,
    triggers: cuesRecord,
    authors: config.authors,
  };
}

export const createPiece = createBit;

// ============================================================================
// Utility: Bit Counting Helpers
// ============================================================================

/**
 * Get routines from a bit, supporting both new (routines) and old (actions) property names
 */
export function getBitRoutines(bit: any): Record<string, BitRoutine> {
  return bit.routines || bit.actions || {};
}

/**
 * Get cues from a bit, supporting both new (cues) and old (triggers) property names
 */
export function getBitCues(bit: any): Record<string, BitCue> {
  return bit.cues || bit.triggers || {};
}

/**
 * Count routines in a bit, supporting both new (routines) and old (actions) property names
 */
export function countBitRoutines(bit: any): number {
  const routines = getBitRoutines(bit);
  return Object.keys(routines).length;
}

/**
 * Count cues in a bit, supporting both new (cues) and old (triggers) property names
 */
export function countBitCues(bit: any): number {
  const cues = getBitCues(bit);
  return Object.keys(cues).length;
}

// ============================================================================
// Utility: Custom API Call Routine
// ============================================================================

/**
 * Create a custom API call routine 
 */
export function createCustomApiCallRoutine(config: {
  baseUrl: (auth: any) => string;
  auth: PropertyDefinition;
  authMapping?: (auth: any) => Promise<{ headers: Record<string, string> }>;
}): BitRoutine {
  return createRoutine({
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

/** @deprecated Use createCustomApiCallRoutine instead */
export const createCustomApiCallAction = createCustomApiCallRoutine;

// ============================================================================
// Re-exports for convenience
// ============================================================================

export {
  // New primary types
  type BitsRoutine,
  type BitsRoutineContext,
  type BitsCue,
  type BitsCueType,
  type BitsCueContext,
  type BitsStore,
  type BitsPiece,
  // Deprecated aliases
  type BitsAction,
  type BitsActionContext,
  type BitsTrigger,
  type BitsTriggerType,
  type BitsTriggerContext,
} from './bitsRoutine';

// ============================================================================
// Declarative Node Types (for creating declarative bits with routing)
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
