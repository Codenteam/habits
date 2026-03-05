import { inspect } from 'node:util';
import { getModuleName } from '../utils/moduleLoader';
import { getModuleMainFile, ModuleDefinition, ensureActivepiecesReady } from '../utils/moduleCloner';
import * as path from 'path';

// Lazy-loaded activepieces modules - will be loaded after ensureActivepiecesReady() is called
let isNil: any;
let TriggerStrategy: any;
let extractPieceFromModule: any;
let trimVersionFromAlias: any;

/**
 * Ensures activepieces dependencies are installed and loads the required modules.
 * Must be called before using any activepieces functionality.
 */
async function ensureActivepiecesModulesLoaded(): Promise<void> {
  if (extractPieceFromModule) return; // Already loaded
  
  // Ensure deps are installed first
  await ensureActivepiecesReady();
  
  // Now dynamically import the modules
  const shared = await import('@activepieces/shared');
  
  isNil = shared.isNil;
  TriggerStrategy = shared.TriggerStrategy;
  extractPieceFromModule = shared.extractPieceFromModule;
  trimVersionFromAlias = shared.trimVersionFromAlias;
}

import { LoggerFactory } from '@ha-bits/core';
const logger = LoggerFactory.getRoot();

// ============================================================================
// Types
// ============================================================================

export enum TriggerHookType {
  ON_ENABLE = 'ON_ENABLE',
  ON_DISABLE = 'ON_DISABLE',
  RUN = 'RUN',
  TEST = 'TEST',
  HANDSHAKE = 'HANDSHAKE',
}

export interface Listener {
  events: string[];
  identifierValue: string;
  identifierKey: string;
}

export interface ScheduleOptions {
  cronExpression: string;
  timezone?: string;
}

export interface TriggerExecutionParams {
  moduleDefinition: ModuleDefinition;
  triggerName: string;
  input: Record<string, any>;
  hookType: TriggerHookType;
  trigger?: any; // Lazy-loaded Trigger type from @activepieces/pieces-framework
  payload?: unknown;
  webhookUrl?: string;
  isTest?: boolean;
  store?: SimpleStore;
}

export interface TriggerExecutionResult {
  success: boolean;
  output?: unknown[];
  message?: string;
  listeners?: Listener[];
  scheduleOptions?: ScheduleOptions;
  response?: unknown;
}

export interface SimpleTriggerContext {
  auth?: any;
  propsValue: Record<string, any>;
  payload: unknown;
  webhookUrl?: string;
  store: SimpleStore;
  app: {
    createListeners: (listener: Listener) => void;
  };
  setSchedule: (options: ScheduleOptions) => void;
}

export interface SimpleStore {
  get: <T>(key: string) => Promise<T | null>;
  put: <T>(key: string, value: T) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

// ============================================================================
// Simple In-Memory Store (can be replaced with persistent storage)
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
// Trigger Helper
// ============================================================================

export const triggerHelper = {
  /**
   * Load a piece from module definition
   */
  async loadPieceFromModule(moduleDefinition: ModuleDefinition): Promise<any> {
    // Ensure activepieces dependencies are installed and loaded
    await ensureActivepiecesModulesLoaded();
    
    const moduleName = getModuleName(moduleDefinition);
    const mainFilePath = getModuleMainFile(moduleDefinition);
    
    if (!mainFilePath) {
      throw new Error(`Could not locate main file for module: ${moduleName}`);
    }

    logger.log(`📦 Loading piece from: ${mainFilePath}`);

    const originalCwd = process.cwd();
    const moduleDir = path.dirname(mainFilePath);

    try {
      process.chdir(moduleDir);
      // Use customRequire to bypass bundler's require and enable dynamic loading
      const module = require(mainFilePath);

      // Find the piece export
      const pieceName = Object.keys(module).find(key => {
        const exported = module[key];
        return exported && typeof exported === 'object' && 'actions' in exported && 'triggers' in exported;
      });

      if (!pieceName) {
        throw new Error(`No piece found in module: ${moduleName}`);
      }

      const piece = (extractPieceFromModule as any)({
        module,
        pieceName,
        pieceVersion: trimVersionFromAlias('2.0'),
      });

      process.chdir(originalCwd);
      return piece;
    } catch (error: any) {
      process.chdir(originalCwd);
      logger.error(error.stack);
      throw error;
    }
  },

  /**
   * Get a specific trigger from a piece
   */
  async getTrigger(
    moduleDefinition: ModuleDefinition,
    triggerName: string
  ): Promise<{ piece: any; trigger: any }> {
    const piece = await this.loadPieceFromModule(moduleDefinition);
    const triggers = piece.triggers();
    const trigger = triggers[triggerName];

    if (!trigger) {
      const availableTriggers = Object.keys(triggers).join(', ');
      throw new Error(
        `Trigger '${triggerName}' not found. Available triggers: ${availableTriggers}`
      );
    }

    return { piece, trigger };
  },

  /**
   * Execute a trigger based on hook type
   */
  async executeTrigger(params: TriggerExecutionParams): Promise<TriggerExecutionResult> {
    const { moduleDefinition, triggerName, input, hookType,trigger, payload, webhookUrl, isTest, store } = params;

    if (isNil(triggerName)) {
      throw new Error('Trigger name is not set');
    }
    let pieceTrigger: any;
    if(trigger){
      pieceTrigger=trigger;
    }else{
      const { piece,trigger } = await this.getTrigger(moduleDefinition, triggerName);
      pieceTrigger=trigger;
    }
    logger.log(`🔔 Executing trigger: ${triggerName} (${hookType})`);

    const appListeners: Listener[] = [];
    let scheduleOptions: ScheduleOptions | undefined;
    const storePrefix = isTest ? 'test' : triggerName;

    // Use provided store or create a new one
    // This ensures state persists between onEnable and run calls
    const triggerStore = store || createSimpleStore(storePrefix);

    // Extract auth from credentials if present (similar to actions)
    // The auth object needs to have a `props` property for pieces that use CustomAuth
    let auth: any = undefined;
    const { credentials, ...triggerProps } = input;
    if (credentials) {
      // Find the first credential object (e.g., credentials.imapAuth, credentials.gmail, etc.)
      const credentialKeys = Object.keys(credentials);
      if (credentialKeys.length > 0) {
        const credentialData = credentials[credentialKeys[0]];
        // Wrap in props structure as expected by CustomAuth pieces
        auth = {
          props: credentialData,
          ...credentialData, // Also spread at top level for pieces that access directly
        };
        logger.log(`🔐 Using credentials for trigger: ${credentialKeys[0]}`);
        logger.log(`   Auth props: ${JSON.stringify(Object.keys(credentialData))}`);
      }
    }

    // Build context for trigger execution
    const context: SimpleTriggerContext = {
      auth,
      propsValue: triggerProps,
      payload: payload ?? {},
      webhookUrl,
      store: triggerStore,
      app: {
        createListeners(listener: Listener): void {
          appListeners.push(listener);
        },
      },
      setSchedule(options: ScheduleOptions): void {
        scheduleOptions = {
          cronExpression: options.cronExpression,
          timezone: options.timezone ?? 'UTC',
        };
      },
    };

    try {
      switch (hookType) {
        case TriggerHookType.ON_ENABLE: {
          if (pieceTrigger.onEnable) {
            await pieceTrigger.onEnable(context as any);
          }
          return {
            success: true,
            listeners: appListeners,
            scheduleOptions: pieceTrigger.type === TriggerStrategy.POLLING ? scheduleOptions : undefined,
          };
        }

        case TriggerHookType.ON_DISABLE: {
          if (pieceTrigger.onDisable) {
            await pieceTrigger.onDisable(context as any);
          }
          return { success: true };
        }

        case TriggerHookType.HANDSHAKE: {
          if (pieceTrigger.onHandshake) {
            const response = await pieceTrigger.onHandshake(context as any);
            return {
              success: true,
              response,
            };
          }
          return {
            success: false,
            message: 'Trigger does not support handshake',
          };
        }

        case TriggerHookType.TEST: {
          if (pieceTrigger.test) {
            const testResult = await pieceTrigger.test(context as any);
            return {
              success: true,
              output: Array.isArray(testResult) ? testResult : [testResult],
            };
          }
          return {
            success: false,
            message: 'Trigger does not support test mode',
            output: [],
          };
        }

        case TriggerHookType.RUN: {
          if (pieceTrigger.run) {
            const runResult = await pieceTrigger.run(context as any);
            return {
              success: true,
              output: Array.isArray(runResult) ? runResult : [runResult],
            };
          }
          return {
            success: false,
            message: 'Trigger does not have a run method',
            output: [],
          };
        }

        default:
          return {
            success: false,
            message: `Unknown hook type: ${hookType}`,
          };
      }
    } catch (error: any) {
      logger.error(`Error executing trigger ${triggerName}:`, error);
      return {
        success: false,
        message: `Error executing trigger: ${inspect(error)}`,
        output: [],
      };
    }
  },

  /**
   * List all triggers from a piece
   */
  async listTriggers(moduleDefinition: ModuleDefinition): Promise<{
    triggers: Array<{
      name: string;
      displayName: string;
      description: string;
      type: any; // TriggerStrategy - lazy-loaded from @activepieces/shared
    }>;
  }> {
    const piece = await this.loadPieceFromModule(moduleDefinition);
    const triggers = piece.triggers();

    return {
      triggers: Object.entries(triggers).map(([name, trigger]) => {
        const t = trigger as any;
        return {
          name,
          displayName: t.displayName,
          description: t.description,
          type: t.type,
        };
      }),
    };
  },

  /**
   * Execute trigger with proper flow based on trigger type
   * For polling: calls onEnable first, then run
   * For webhooks: calls run directly
   */
  async executeActivepiecesTrigger(params: {
    moduleDefinition: ModuleDefinition;
    triggerName: string;
    input: Record<string, any>;
    payload?: unknown;
    webhookUrl?: string;
    store?: SimpleStore;
  }): Promise<TriggerExecutionResult> {
    const { moduleDefinition, triggerName, input, payload, webhookUrl, store } = params;

    // Get the trigger to determine its type
    const { piece, trigger } = await this.getTrigger(moduleDefinition, triggerName);
    

    const triggerStore = store || createSimpleStore(`trigger:${triggerName}`);

    switch (trigger.type) {
      case TriggerStrategy.POLLING: {
        logger.log(`Polling trigger flow: onEnable → run`);
        
        const onEnableResult = await this.executeTrigger({
          moduleDefinition,
          triggerName,
          input,
          hookType: TriggerHookType.ON_ENABLE,
          trigger,
          payload,
          webhookUrl,
          isTest: false,
          store: triggerStore,
        });

        if (!onEnableResult.success) {
          return onEnableResult;
        }

        logger.log(`  ✅ onEnable completed`);
        if (onEnableResult.scheduleOptions) {
          logger.log(`  📅 Schedule: ${onEnableResult.scheduleOptions.cronExpression} (${onEnableResult.scheduleOptions.timezone})`);
        }
        if (onEnableResult.listeners && onEnableResult.listeners.length > 0) {
          logger.log(`  👂 Listeners: ${onEnableResult.listeners.length}`);
        }

        logger.log(`  → Calling run to fetch items...`);
        const runResult = await this.executeTrigger({
          moduleDefinition,
          triggerName,
          input,
          hookType: TriggerHookType.RUN,
          trigger,
          payload,
          webhookUrl,
          isTest: false,
          store: triggerStore, 
        });

        if (!runResult.success) {
          logger.warn(`  ⚠️ Run failed: ${runResult.message}`);
        } else {
          logger.log(`  ✅ Run completed, items found: ${runResult.output?.length || 0}`);
        }

        return runResult;
      }

      case TriggerStrategy.WEBHOOK: {
        logger.log(`webhook trigger`);
        
        return await this.executeTrigger({
          moduleDefinition,
          triggerName,
          input,
          hookType: TriggerHookType.RUN,
          payload,
          webhookUrl,
          isTest: false,
        });
      }

      default: {
        return {
          success: false,
          message: `Unsupported trigger type: ${trigger.type}`,
          output: [],
        };
      }
    }
  },

  /**
   * Hook triggers for a piece - sets up polling/webhooks based on trigger type
   * For polling triggers, automatically runs after a delay (default 3 seconds)
   */
  async hookTriggers(
    moduleDefinition: ModuleDefinition,
    options?: {
      webhookBaseUrl?: string;
      onPollingTrigger?: (triggerName: string, trigger: any) => void;
      onWebhookTrigger?: (triggerName: string, trigger: any) => void;
      onAppWebhookTrigger?: (triggerName: string, trigger: any) => void;
      onTriggerResult?: (triggerName: string, result: TriggerExecutionResult) => void;
      input?: Record<string, any>; // Input params for the trigger
    }
  ): Promise<void> {
    const piece = await this.loadPieceFromModule(moduleDefinition);
    const triggers = piece.triggers();

    for (const [triggerName, trigger] of Object.entries(triggers)) {
      const t = trigger as any;
      logger.log(`🔔 Hooking trigger: ${triggerName} (type: ${t.type})`);

      switch (t.type) {
        case TriggerStrategy.POLLING:
          logger.log(`  → Setting up polling trigger`);
          if (options?.onPollingTrigger) {
            options.onPollingTrigger(triggerName, t);
          }
          
          // Auto-run polling trigger immediately
          logger.log(`  🚀 Running polling trigger immediately...`);
          try {
            const result = await this.executeActivepiecesTrigger({
              moduleDefinition,
              triggerName,
              input: options?.input || {},
            });
            
            if (result.success) {
              logger.log(`  ✅ Trigger ${triggerName} executed successfully`);
              logger.log(`  📦 Output items: ${result.output?.length || 0}`);
            } else {
              logger.warn(`  ⚠️ Trigger ${triggerName} failed: ${result.message}`);
            }
            
            // Notify callback if provided
            if (options?.onTriggerResult) {
              options.onTriggerResult(triggerName, result);
            }
          } catch (error: any) {
            logger.error(`  ❌ Error running trigger ${triggerName}:`, error.message);
          }
          break;

        case TriggerStrategy.WEBHOOK:
          logger.log(`  → Setting up webhook trigger`);
          if (options?.onWebhookTrigger) {
            options.onWebhookTrigger(triggerName, t);
          }
          break;

        case TriggerStrategy.APP_WEBHOOK:
          logger.log(`  → Setting up app webhook trigger`);
          if (options?.onAppWebhookTrigger) {
            options.onAppWebhookTrigger(triggerName, t);
          }
          break;

        default:
          logger.warn(`  ⚠️ Unknown trigger type: ${t.type}`);
      }
    }
  },

  /**
   * Validate cron expression (simple validation)
   */
  isValidCron(expression: string): boolean {
    // Simple validation - checks for 5 or 6 space-separated parts
    const parts = expression.trim().split(/\s+/);
    return parts.length >= 5 && parts.length <= 6;
  },

  /**
   * Check if a node is an Activepieces trigger (polling or webhook)
   */
  isActivepiecesTrigger(node: any): boolean {
    return (
      node.data?.framework === 'activepieces' &&
      (node.data?.triggerType === 'polling' || node.data?.triggerType === 'webhook')
    );
  },

  /**
   * Check if a node is a webhook trigger
   */
  isWebhookTrigger(node: any): boolean {
    return (
      node.type === 'trigger' &&
      node.data?.framework === 'activepieces' &&
      (node.data?.triggerType === 'webhook' || 
       node.data?.module === '@activepieces/piece-webhook' ||
       node.data?.operation === 'catch_webhook')
    );
  },

  /**
   * Extract webhook trigger configuration from a node
   */
  getWebhookConfig(node: any): {
    nodeId: string;
    path: string;
    authType: 'none' | 'header' | 'query_param';
    authFields: Record<string, any>;
  } {
    return {
      nodeId: node.id,
      path: `/webhook/${node.id}`,
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
    // The actual processing is done by the downstream nodes
    return {
      success: true,
      output: [{
        body: payload,
        headers: headers || {},
        query: query || {},
        method: 'POST',
        timestamp: new Date().toISOString(),
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
