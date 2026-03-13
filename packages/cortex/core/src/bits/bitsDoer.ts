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
import { ILogger, LoggerFactory } from '@ha-bits/core';

const logger = LoggerFactory.getRoot();

// ============================================================================
// Types 
// ============================================================================

/**
 * Represents a Bits action that can be executed
 */
export interface BitsAction {
  name: string;
  displayName: string;
  description: string;
  props: Record<string, any>;
  run: (context: BitsActionContext) => Promise<any>;
}

/**
 * Context passed to action.run()
 */
export interface BitsActionContext {
  auth?: any;
  propsValue: Record<string, any>;
  store?: BitsStore;
  files?: any;
  /** Logger instance for structured logging */
  logger?: ILogger;
}

/**
 * Represents a Bits trigger
 */
export interface BitsTrigger {
  name: string;
  displayName: string;
  description: string;
  type: BitsTriggerType;
  props: Record<string, any>;
  onEnable?: (context: BitsTriggerContext) => Promise<void>;
  onDisable?: (context: BitsTriggerContext) => Promise<void>;
  run?: (context: BitsTriggerContext) => Promise<any[]>;
  test?: (context: BitsTriggerContext) => Promise<any[]>;
  onHandshake?: (context: BitsTriggerContext) => Promise<any>;
}

/**
 * Trigger types
 */
export enum BitsTriggerType {
  POLLING = 'POLLING',
  WEBHOOK = 'WEBHOOK',
  APP_WEBHOOK = 'APP_WEBHOOK',
}

/**
 * Context passed to trigger methods
 */
export interface BitsTriggerContext {
  auth?: any;
  propsValue: Record<string, any>;
  payload: unknown;
  webhookUrl?: string;
  store: BitsStore;
  app: {
    createListeners: (listener: BitsListener) => void;
  };
  setSchedule: (options: BitsScheduleOptions) => void;
}

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
 * Represents a loaded Bits piece/module
 */
export interface BitsPiece {
  displayName: string;
  description?: string;
  logoUrl?: string;
  auth?: any;
  actions: () => Record<string, BitsAction>;
  triggers: () => Record<string, BitsTrigger>;
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
 * Bits modules export a piece object with 'actions' and 'triggers' properties.
 * Also supports declarative nodes (n8n-style) that have a description with routing.
 */
function extractBitsPieceFromModule(loadedModule: any): BitsPiece {
  // First, check if this is a declarative node (n8n-style with routing)
  const declarativeNode = extractDeclarativeNode(loadedModule);
  if (declarativeNode) {
    logger.log(`📋 Detected declarative node: ${declarativeNode.description.displayName}`);
    return convertDeclarativeNodeToBitsPiece(declarativeNode);
  }

  // Find the piece export in the module
  // It's the object that has both 'actions' and 'triggers' methods/properties
  let piece: any = null;

  // Check if it's a direct export
  if (loadedModule && typeof loadedModule === 'object') {
    // Check direct properties
    for (const key of Object.keys(loadedModule)) {
      const exported = loadedModule[key];
      if (exported && typeof exported === 'object') {
        // Check if it has actions and triggers (either as functions or objects)
        const hasActions = 'actions' in exported;
        const hasTriggers = 'triggers' in exported;
        if (hasActions && hasTriggers) {
          piece = exported;
          break;
        }
      }
    }
  }

  if (!piece) {
    throw new Error('No valid bits piece found in module. Expected export with actions and triggers.');
  }

  // Normalize the piece to our interface
  return {
    displayName: piece.displayName || 'Unknown Piece',
    description: piece.description,
    logoUrl: piece.logoUrl,
    auth: piece.auth,
    actions: typeof piece.actions === 'function' 
      ? piece.actions.bind(piece)
      : () => piece.actions || {},
    triggers: typeof piece.triggers === 'function'
      ? piece.triggers.bind(piece)
      : () => piece.triggers || {},
  };
}

/**
 * Convert a declarative node to BitsPiece format
 */
function convertDeclarativeNodeToBitsPiece(node: IDeclarativeNodeType): BitsPiece {
  const desc = node.description;
  
  // Extract operations from properties to create actions
  const actions: Record<string, BitsAction> = {};
  
  // Find operation/resource properties to determine available actions
  const operationProp = desc.properties.find(p => p.name === 'operation');
  const resourceProp = desc.properties.find(p => p.name === 'resource');
  
  if (operationProp?.options) {
    // Create an action for each operation
    for (const opt of operationProp.options as any[]) {
      if (opt.value && opt.routing) {
        const actionName = String(opt.value);
        actions[actionName] = {
          name: actionName,
          displayName: opt.name || actionName,
          description: opt.description || '',
          props: buildPropsForOperation(desc.properties, actionName, resourceProp?.default),
          run: createDeclarativeActionRunner(node, actionName),
        };
      }
    }
  }
  
  // If no operation-based actions found, create a single "execute" action
  if (Object.keys(actions).length === 0) {
    actions['execute'] = {
      name: 'execute',
      displayName: desc.displayName,
      description: desc.description || '',
      props: buildPropsFromDeclarative(desc.properties),
      run: createDeclarativeActionRunner(node),
    };
  }

  return {
    displayName: desc.displayName,
    description: desc.description,
    logoUrl: desc.icon,
    auth: undefined, // Declarative nodes handle auth differently
    actions: () => actions,
    triggers: () => ({}), // Declarative nodes typically don't have triggers
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
 * Create a runner function for declarative actions
 */
function createDeclarativeActionRunner(
  node: IDeclarativeNodeType,
  operation?: string
): (context: BitsActionContext) => Promise<any> {
  return async (context: BitsActionContext) => {
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

/**
 * Load a bits piece from module definition
 */
async function pieceFromModule(moduleDefinition: ModuleDefinition): Promise<BitsPiece> {
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
    if (credentials) {
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
 * Get available actions from a bits module
 */
export async function getBitsModuleActions(params: {
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
  return Object.keys(piece.actions());
}

/**
 * Get available triggers from a bits module
 */
export async function getBitsModuleTriggers(params: {
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
  return Object.keys(piece.triggers());
}

// Export the piece loader for use in bitsWatcher
export { pieceFromModule, extractBitsPieceFromModule };
