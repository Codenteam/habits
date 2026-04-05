/**
 * Bits Module Executor
 * 
 * Executes bits modules.
 */

import { ensureModuleInstalled, getModuleName, getBundledModule, isBundledModule } from '../utils/moduleLoader';
import { getModuleMainFile, ModuleDefinition } from '../utils/moduleCloner';
import * as path from '@ha-bits/bindings/path';
import { simpleRequire } from '../utils/customRequire';
import { 
  isDeclarativeNode, 
  extractDeclarativeNode, 
  executeDeclarativeNode,
  declarativeNodeToBitsAction,
  type IDeclarativeNodeType 
} from './declarativeExecutor';
import { PollingStore, DedupStrategy, PollingItemContext, SeenItemRecord, PollingStoreOptions } from '../store';

// Re-export polling store types for consumers
export { PollingStore, DedupStrategy, PollingItemContext, SeenItemRecord, PollingStoreOptions };
import { oauthTokenStore } from './oauthTokenStore';
import { OAuth2TokenSet } from './oauth2Types';
import { ILogger, LoggerFactory } from '@ha-bits/core/logger';

const logger = LoggerFactory.getRoot();

// ============================================================================
// Workflow Executor Interface (minimal for bits to invoke sub-workflows)
// ============================================================================

/**
 * Minimal interface for workflow executor that bits can use to invoke sub-workflows.
 * Avoids circular dependency with WorkflowExecutor.
 */
export interface IWorkflowExecutor {
  /** Execute a workflow by ID with optional initial context */
  executeWorkflow(workflowId: string, options?: {
    initialContext?: Record<string, any>;
  }): Promise<{
    id: string;
    workflowId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    results: Array<{ success: boolean; result?: any; error?: string }>;
    output?: any;
  }>;
}

// ============================================================================
// Types 
// ============================================================================

/**
 * Represents a Bits routine that can be executed.
 * A routine performs a specific operation as part of a habit's workflow.
 */
export interface BitsRoutine {
  name: string;
  displayName: string;
  description: string;
  props: Record<string, any>;
  run: (context: BitsRoutineContext) => Promise<any>;
}

/** @deprecated Use BitsRoutine instead */
export type BitsAction = BitsRoutine;

/**
 * Context passed to routine.run()
 */
export interface BitsRoutineContext {
  auth?: any;
  propsValue: Record<string, any>;
  store?: BitsStore;
  files?: any;
  /** Logger instance for structured logging */
  logger?: ILogger;
  /** Workflow executor for invoking sub-workflows directly */
  executor?: IWorkflowExecutor;
}

/** @deprecated Use BitsRoutineContext instead */
export type BitsActionContext = BitsRoutineContext;

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
 * Represents a Bits cue - an event or condition that starts a habit.
 * Cues observe external systems or schedules and emit events that initiate workflows.
 */
export interface BitsCue {
  name: string;
  displayName: string;
  description: string;
  type: BitsCueType;
  props: Record<string, any>;
  onEnable?: (context: BitsCueContext) => Promise<void>;
  onDisable?: (context: BitsCueContext) => Promise<void>;
  run?: (context: BitsCueContext) => Promise<any[]>;
  test?: (context: BitsCueContext) => Promise<any[]>;
  onHandshake?: (context: BitsCueContext) => Promise<any>;
  /**
   * Filter function for webhook cues.
   * Called when a webhook is received for this bit's module.
   * Return true if this cue should handle the event, false to skip.
   * If not defined, the cue accepts all webhook events.
   */
  filter?: (payload: WebhookFilterPayload) => boolean | Promise<boolean>;
}

/** @deprecated Use BitsCue instead */
export type BitsTrigger = BitsCue;

/**
 * Cue types - determines how the cue detects events
 */
export enum BitsCueType {
  POLLING = 'POLLING',
  WEBHOOK = 'WEBHOOK',
  APP_WEBHOOK = 'APP_WEBHOOK',
}

/** @deprecated Use BitsCueType instead */
export const BitsTriggerType = BitsCueType;
/** @deprecated Use BitsCueType instead */
export type BitsTriggerType = BitsCueType;

/**
 * Context passed to cue methods
 */
export interface BitsCueContext {
  auth?: any;
  propsValue: Record<string, any>;
  payload: unknown;
  webhookUrl?: string;
  store: BitsStore;
  app: {
    createListeners: (listener: BitsListener) => void;
  };
  setSchedule: (options: BitsScheduleOptions) => void;
  /** Workflow executor for invoking workflows (including self) */
  executor?: IWorkflowExecutor;
  /** ID of the workflow this cue belongs to */
  workflowId?: string;
  /** ID of this cue node */
  nodeId?: string;
  /** Webhook payload data (for webhook cues) */
  webhookPayload?: WebhookFilterPayload;
  /** Polling store for deduplication (for polling cues) */
  pollingStore?: BitsPollingStore;
}

/** @deprecated Use BitsCueContext instead */
export type BitsTriggerContext = BitsCueContext;

/**
 * Listener configuration for app webhooks
 */
export interface BitsListener {
  events: string[];
  identifierValue: string;
  identifierKey: string;
}

/**
 * Schedule options for polling triggers
 */
export interface BitsScheduleOptions {
  cronExpression: string;
  timezone?: string;
}

/**
 * Simple key-value store interface
 */
export interface BitsStore {
  get: <T>(key: string) => Promise<T | null>;
  put: <T>(key: string, value: T) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

/**
 * Extended store interface with polling deduplication support
 */
export interface BitsPollingStore extends BitsStore {
  /** Check if an item has been seen before (for deduplication) */
  hasSeenItem: (itemId: string, itemDate?: string) => Promise<boolean>;
  /** Mark an item as seen */
  markItemSeen: (itemId: string, sourceDate: string, data?: any) => Promise<void>;
  /** Get the last polled timestamp */
  getLastPolledDate: () => Promise<string | null>;
  /** Set the last polled timestamp */
  setLastPolledDate: (date: string) => Promise<void>;
  /** Get count of seen items */
  getSeenCount: () => Promise<number>;
  /** Clear all seen items for this trigger */
  clearTrigger: () => Promise<number>;
}

/**
 * Represents a loaded Bits piece/module
 */
export interface BitsPiece {
  /**
   * Unique identifier for this bit module.
   * Used for webhook routing: /webhook/:id
   * Example: 'gohighlevel', 'hubspot', 'salesforce'
   */
  id?: string;
  displayName: string;
  description?: string;
  logoUrl?: string;
  /**
   * Runtime environment where this bit can execute.
   * - 'app': Mobile/desktop Tauri app only (requires native plugins)
   * - 'server': Server-side only (Node.js environment)
   * - 'all': Works in both environments (default)
   */
  runtime?: 'app' | 'server' | 'all';
  auth?: any;
  /** Get all routines provided by this bit */
  routines: () => Record<string, BitsRoutine>;
  /** Get all cues provided by this bit */
  cues: () => Record<string, BitsCue>;
  /** @deprecated Use routines() instead */
  actions: () => Record<string, BitsRoutine>;
  /** @deprecated Use cues() instead */
  triggers: () => Record<string, BitsCue>;
}

/**
 * Execution parameters for bits module
 */
export interface BitsExecutionParams {
  source: string;
  framework: string;
  moduleName: string;
  params: Record<string, any>;
  /** Logger instance to pass to bit context */
  logger?: ILogger;
  /** Workflow ID for context */
  workflowId?: string;
  /** Node ID for context */
  nodeId?: string;
  /** Execution ID for tracing */
  executionId?: string;
  /** Workflow executor for invoking sub-workflows directly */
  executor?: IWorkflowExecutor;
  /** 
   * OAuth tokens from request cookies (per-user tokens).
   * These take precedence over the global token store.
   * Key is bitId (e.g., "bit-google-drive"), value is the token set.
   */
  oauthTokens?: Record<string, OAuth2TokenSet>;
}

/**
 * Result of bits module execution
 */
export interface BitsExecutionResult {
  success: boolean;
  module: string;
  pieceLoaded: boolean;
  params: Record<string, any>;
  result: any;
  executedAt: string;
  data: {
    message: string;
    status: string;
    pieceExports: string[];
  };
}

// ============================================================================
// Module Loading
// ============================================================================

/**
 * Extract piece from a loaded module.
 * Bits modules export a piece object with 'routines'/'actions' and 'cues'/'triggers' properties.
 * Also supports declarative nodes that have a description with routing.
 */
export function extractBitsPieceFromModule(loadedModule: any): BitsPiece {
  // First, check if this is a declarative node (with routing)
  const declarativeNode = extractDeclarativeNode(loadedModule);
  if (declarativeNode) {
    logger.log(`📋 Detected declarative node: ${declarativeNode.description.displayName}`);
    return convertDeclarativeNodeToBitsPiece(declarativeNode);
  }

  // Find the piece export in the module
  // It's the object that has routines/actions and cues/triggers methods/properties
  let piece: any = null;

  // Check if it's a direct export
  if (loadedModule && typeof loadedModule === 'object') {
    // Check direct properties
    for (const key of Object.keys(loadedModule)) {
      const exported = loadedModule[key];
      if (exported && typeof exported === 'object') {
        // Check if it has routines/actions and cues/triggers (either as functions or objects)
        const hasRoutines = 'routines' in exported || 'actions' in exported;
        const hasCues = 'cues' in exported || 'triggers' in exported;
        if (hasRoutines && hasCues) {
          piece = exported;
          break;
        }
      }
    }
  }

  if (!piece) {
    throw new Error('No valid bits piece found in module. Expected export with routines/actions and cues/triggers.');
  }

  // Create accessor functions that support both old and new property names
  const getRoutines = () => {
    if (typeof piece.routines === 'function') return piece.routines();
    if (piece.routines) return piece.routines;
    if (typeof piece.actions === 'function') return piece.actions();
    if (piece.actions) return piece.actions;
    return {};
  };

  const getCues = () => {
    if (typeof piece.cues === 'function') return piece.cues();
    if (piece.cues) return piece.cues;
    if (typeof piece.triggers === 'function') return piece.triggers();
    if (piece.triggers) return piece.triggers;
    return {};
  };

  // Normalize the piece to our interface with both new and deprecated accessors
  return {
    id: piece.id, // Webhook routing ID (e.g., 'gohighlevel', 'hubspot')
    displayName: piece.displayName || 'Unknown Piece',
    description: piece.description,
    logoUrl: piece.logoUrl,
    auth: piece.auth,
    routines: getRoutines,
    cues: getCues,
    // Deprecated aliases for backward compatibility
    actions: getRoutines,
    triggers: getCues,
  };
}

/**
 * Convert a declarative node to BitsPiece format
 */
function convertDeclarativeNodeToBitsPiece(node: IDeclarativeNodeType): BitsPiece {
  const desc = node.description;
  
  // Extract operations from properties to create routines
  const routines: Record<string, BitsRoutine> = {};
  
  // Find operation/resource properties to determine available routines
  const operationProp = desc.properties.find(p => p.name === 'operation');
  const resourceProp = desc.properties.find(p => p.name === 'resource');
  
  if (operationProp?.options) {
    // Create a routine for each operation
    for (const opt of operationProp.options as any[]) {
      if (opt.value && opt.routing) {
        const routineName = String(opt.value);
        routines[routineName] = {
          name: routineName,
          displayName: opt.name || routineName,
          description: opt.description || '',
          props: buildPropsForOperation(desc.properties, routineName, resourceProp?.default),
          run: createDeclarativeRoutineRunner(node, routineName),
        };
      }
    }
  }
  
  // If no operation-based routines found, create a single "execute" routine
  if (Object.keys(routines).length === 0) {
    routines['execute'] = {
      name: 'execute',
      displayName: desc.displayName,
      description: desc.description || '',
      props: buildPropsFromDeclarative(desc.properties),
      run: createDeclarativeRoutineRunner(node),
    };
  }

  const getRoutines = () => routines;
  const getCues = () => ({});

  return {
    displayName: desc.displayName,
    description: desc.description,
    logoUrl: desc.icon,
    auth: undefined, // Declarative nodes handle auth differently
    routines: getRoutines,
    cues: getCues,
    // Deprecated aliases
    actions: getRoutines,
    triggers: getCues,
  };
}

/**
 * Build props for a specific operation
 */
function buildPropsForOperation(
  properties: any[],
  operation: string,
  resource?: string
): Record<string, any> {
  const props: Record<string, any> = {};
  
  for (const prop of properties) {
    // Skip operation and resource props - they're handled differently
    if (prop.name === 'operation' || prop.name === 'resource') continue;
    
    // Check if prop should be shown for this operation
    if (prop.displayOptions?.show) {
      const showOp = prop.displayOptions.show.operation;
      const showRes = prop.displayOptions.show.resource;
      
      if (showOp && !showOp.includes(operation)) continue;
      if (showRes && resource && !showRes.includes(resource)) continue;
    }
    
    props[prop.name] = convertDeclarativePropertyToProp(prop);
  }
  
  return props;
}

/**
 * Build props from declarative properties
 */
function buildPropsFromDeclarative(properties: any[]): Record<string, any> {
  const props: Record<string, any> = {};
  
  for (const prop of properties) {
    props[prop.name] = convertDeclarativePropertyToProp(prop);
  }
  
  return props;
}

/**
 * Convert declarative property to bits prop format
 */
function convertDeclarativePropertyToProp(prop: any): any {
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
          options: (prop.options || []).map((opt: any) => ({
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

/**
 * Create a runner function for declarative routines
 */
function createDeclarativeRoutineRunner(
  node: IDeclarativeNodeType,
  operation?: string
): (context: BitsRoutineContext) => Promise<any> {
  return async (context: BitsRoutineContext) => {
    const parameters = { ...context.propsValue };
    
    // Add operation to parameters if specified
    if (operation) {
      parameters.operation = operation;
    }
    
    const result = await executeDeclarativeNode(node, {
      parameters,
      credentials: context.auth,
    });
    
    return result.data;
  };
}

/** @deprecated Use createDeclarativeRoutineRunner instead */
const createDeclarativeActionRunner = createDeclarativeRoutineRunner;

/**
 * Load a bits piece from module definition
 */
export async function pieceFromModule(moduleDefinition: ModuleDefinition): Promise<BitsPiece> {
  const moduleName = getModuleName(moduleDefinition);

  // Check if module is pre-bundled (for browser/IIFE bundles)
  if (isBundledModule(moduleDefinition.repository)) {
    logger.log(`📦 Using pre-bundled module: ${moduleName}`);
    const loadedModule = getBundledModule(moduleDefinition.repository);
    if (loadedModule) {
      const piece = extractBitsPieceFromModule(loadedModule);
      return piece;
    }
    throw new Error(`Bundled module ${moduleName} not found in registry`);
  }

  // For non-bundled modules, use filesystem-based loading
  // Get the main file path
  const mainFilePath = getModuleMainFile(moduleDefinition);
  if (!mainFilePath) {
    throw new Error(`Could not locate main file for module: ${moduleName}`);
  }

  logger.log(`📦 Bits module ready at: ${mainFilePath}`);

  // Save current working directory and change to module directory for proper resolution
  const originalCwd = process.cwd();
  const moduleDir = path.dirname(mainFilePath);

  // Find the node_modules directory containing the module
  let nodeModulesDir = moduleDir;
  while (nodeModulesDir && !nodeModulesDir.endsWith('/node_modules') && nodeModulesDir !== path.dirname(nodeModulesDir)) {
    nodeModulesDir = path.dirname(nodeModulesDir);
  }

  try {
    process.chdir(moduleDir);
    // Use simpleRequire which creates require from the node_modules context
    const loadedModule = simpleRequire(mainFilePath, nodeModulesDir);

    // Extract piece
    const piece = extractBitsPieceFromModule(loadedModule);
    
    process.chdir(originalCwd);
    return piece;
  } catch (error: any) {
    process.chdir(originalCwd);
    logger.error(error.stack);
    throw error;
  }
}

// ============================================================================
// Action Execution
// ============================================================================

/**
 * Execute a bits module action
 */
async function executeGenericBitsPiece(
  params: BitsExecutionParams,
  moduleDefinition: ModuleDefinition
): Promise<BitsExecutionResult> {
  try {
    const piece = await pieceFromModule(moduleDefinition);

    logger.log(`🚀 Executing Bits piece: ${piece.displayName}`);
    const actionName = params.params.operation;
    const pieceActions = piece.actions();
    logger.log(`Available actions: ${Object.keys(pieceActions).join(', ')}`);
    logger.log(`Requested action: ${actionName}`);
    
    const action = pieceActions[actionName];

    // If action is not found, throw error with available actions
    if (!action) {
      throw new Error(
        `Action '${actionName}' not found in piece '${piece.displayName}'. Available actions: ${Object.keys(pieceActions).join(', ')}`
      );
    }

    // Extract auth from credentials if present
    let auth: any = undefined;
    const { credentials, ...actionProps } = params.params;
    
    // Check if this piece uses OAuth2 authentication
    if (piece.auth && ((piece.auth as any).type === 'OAUTH2' || (piece.auth as any).type === 'OAUTH2_PKCE')) {
      // Extract bit ID from module name (e.g., "@ha-bits/bit-oauth-mock" -> "bit-oauth-mock")
      const parts = moduleDefinition.repository.split('/');
      const bitId = parts[parts.length - 1];
      
      // Priority 1: Check if credentials contain OAuth tokens directly (bypasses OAuth callback flow)
      // This allows users to provide tokens obtained externally (e.g., from dev console)
      const oauthCredKey = Object.keys(credentials || {}).find(key => {
        const cred = credentials[key];
        return cred && (cred.accessToken || cred.access_token);
      });
      
      if (oauthCredKey && credentials[oauthCredKey]) {
        const directTokens = credentials[oauthCredKey];
        auth = {
          accessToken: directTokens.accessToken || directTokens.access_token,
          refreshToken: directTokens.refreshToken || directTokens.refresh_token,
          tokenType: directTokens.tokenType || directTokens.token_type || 'Bearer',
          expiresAt: directTokens.expiresAt || directTokens.expires_at,
        };
        logger.log(`🔐 Using OAuth2 tokens from credentials for: ${bitId}`);
        
        // Optionally store in token store for future refresh capability
        if (auth.refreshToken) {
          const pieceAuth = piece.auth as any;
          oauthTokenStore.setToken(bitId, auth, {
            displayName: pieceAuth.displayName || bitId,
            required: pieceAuth.required || false,
            authorizationUrl: pieceAuth.authorizationUrl || '',
            tokenUrl: pieceAuth.tokenUrl || '',
            clientId: pieceAuth.clientId || '',
            clientSecret: pieceAuth.clientSecret,
            scopes: pieceAuth.scopes || [],
          });
        }
      } else if (params.oauthTokens && params.oauthTokens[bitId]) {
        // Priority 2: Check for per-user OAuth tokens from request cookies (server mode with multi-user)
        const userToken = params.oauthTokens[bitId];
        auth = {
          accessToken: userToken.accessToken,
          refreshToken: userToken.refreshToken,
          tokenType: userToken.tokenType,
          expiresAt: userToken.expiresAt,
        };
        logger.log(`🔐 Using per-user OAuth2 token from cookies for: ${bitId}`);
        
        // Token refresh for per-user tokens would need to be handled differently
        // (e.g., trigger re-auth flow if expired)
        if (userToken.expiresAt && userToken.expiresAt < Date.now()) {
          logger.warn(`⚠️ Per-user OAuth token expired for ${bitId}. User needs to re-authenticate.`);
        }
      } else {
        // Priority 3: Try to get OAuth token from global store (single-user mode or Tauri)
        const oauthToken = oauthTokenStore.getToken(bitId);
        if (oauthToken) {
          auth = {
            accessToken: oauthToken.accessToken,
            refreshToken: oauthToken.refreshToken,
            tokenType: oauthToken.tokenType,
            expiresAt: oauthToken.expiresAt,
          };
          logger.log(`🔐 Using OAuth2 PKCE token for: ${bitId}`);
          
          // Check if token is expired and try to refresh
          if (oauthTokenStore.isExpired(bitId)) {
            logger.log(`⚠️ OAuth token expired for ${bitId}, attempting refresh...`);
            const refreshedToken = await oauthTokenStore.refreshToken(bitId);
            if (refreshedToken) {
              auth = {
                accessToken: refreshedToken.accessToken,
                refreshToken: refreshedToken.refreshToken,
                tokenType: refreshedToken.tokenType,
                expiresAt: refreshedToken.expiresAt,
              };
              logger.log(`✅ OAuth token refreshed for ${bitId}`);
            } else {
              logger.warn(`❌ Failed to refresh OAuth token for ${bitId}`);
            }
          }
        } else {
          logger.warn(`⚠️ No OAuth token found for ${bitId}. Provide tokens via credentials or complete the OAuth flow.`);
        }
      }
    } else if (credentials) {
      const credentialKeys = Object.keys(credentials);
      if (credentialKeys.length > 0) {
        // Pass auth data directly - pieces access auth properties directly (e.g., auth.host, auth.apiKey)
        auth = credentials[credentialKeys[0]];
        logger.log(`🔐 Using credentials for: ${credentialKeys[0]}`);
      }
    }

    // Create bit-scoped logger if a parent logger was provided
    let bitLogger: ILogger | undefined = undefined;
    if (params.logger) {
      bitLogger = params.logger.child({
        bitName: moduleDefinition.repository,
        actionName: actionName,
        workflowId: params.workflowId,
        nodeId: params.nodeId,
        executionId: params.executionId,
      });
    }

    // Execute the action
    const result = await action.run({
      auth,
      propsValue: {
        ...actionProps,
      },
      logger: bitLogger,
      executor: params.executor,
    } as BitsActionContext);

    logger.log(`✅ Successfully executed Bits piece action: ${actionName}`, result);

    return {
      success: true,
      module: moduleDefinition.repository,
      pieceLoaded: true,
      params,
      result,
      executedAt: new Date().toISOString(),
      data: {
        message: `Successfully executed Bits piece: ${piece.displayName}`,
        status: 'completed',
        pieceExports: Object.keys(pieceActions),
      },
    };
  } catch (error: any) {
    logger.error(error.stack);
    throw error;
  }
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Execute a bits module.
 * This is the main entry point for running bits modules.
 */
export async function executeBitsModule(params: BitsExecutionParams): Promise<BitsExecutionResult> {
  // Get module definition from config
  const moduleDefinition: ModuleDefinition = {
    framework: params.framework,
    source: params.source as 'github' | 'npm',
    repository: params.moduleName,
  };

  if (!moduleDefinition) {
    throw new Error(`Bits module '${params.moduleName}' not found in modules.json`);
  }

  // Ensure module is installed
  const inferredModuleName = getModuleName(moduleDefinition);
  logger.log(`\n🔍 Ensuring bits module is ready: ${inferredModuleName}`);
  await ensureModuleInstalled(moduleDefinition);

  try {
    return await executeGenericBitsPiece(params, moduleDefinition);
  } catch (error: any) {
    throw new Error(`Failed to load Bits module from '${moduleDefinition.repository}': ${error.message}`);
  }
}

/**
 * Get available routines from a bits module
 */
export async function getBitsModuleRoutines(params: {
  source: string;
  framework: string;
  moduleName: string;
}): Promise<string[]> {
  const moduleDefinition: ModuleDefinition = {
    framework: params.framework,
    source: params.source as 'github' | 'npm',
    repository: params.moduleName,
  };

  await ensureModuleInstalled(moduleDefinition);
  const piece = await pieceFromModule(moduleDefinition);
  return Object.keys(piece.routines());
}

/** @deprecated Use getBitsModuleRoutines instead */
export const getBitsModuleActions = getBitsModuleRoutines;

/**
 * Get available cues from a bits module
 */
export async function getBitsModuleCues(params: {
  source: string;
  framework: string;
  moduleName: string;
}): Promise<string[]> {
  const moduleDefinition: ModuleDefinition = {
    framework: params.framework,
    source: params.source as 'github' | 'npm',
    repository: params.moduleName,
  };

  await ensureModuleInstalled(moduleDefinition);
  const piece = await pieceFromModule(moduleDefinition);
  return Object.keys(piece.cues());
}

/** @deprecated Use getBitsModuleCues instead */
export const getBitsModuleTriggers = getBitsModuleCues;
