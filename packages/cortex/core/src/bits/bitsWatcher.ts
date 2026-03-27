/**
 * Bits Trigger Watcher
 * 
 * Handles bits module triggers (polling, webhook, app webhook).
 */

import { ensureModuleInstalled } from '../utils/moduleLoader';
import { ModuleDefinition } from '../utils/moduleCloner';
import { 
  pieceFromModule, 
  BitsPiece, 
  BitsTrigger, 
  BitsTriggerType, 
  BitsStore,
  BitsPollingStore,
  BitsTriggerContext,
  BitsListener,
  BitsScheduleOptions,
} from './bitsDoer';
import { PollingStore, createPollingStore, DedupStrategy } from '../store';
import { LoggerFactory } from '@ha-bits/core/logger';

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

export interface TriggerExecutionParams {
  moduleDefinition: ModuleDefinition;
  triggerName: string;
  input: Record<string, any>;
  hookType: TriggerHookType;
  trigger?: BitsTrigger;
  payload?: unknown;
  webhookUrl?: string;
  isTest?: boolean;
  store?: BitsStore;
  /** Workflow executor for invoking workflows */
  executor?: any;
  /** ID of the workflow this trigger belongs to */
  workflowId?: string;
  /** ID of this trigger node */
  nodeId?: string;
}

export interface TriggerExecutionResult {
  success: boolean;
  output?: unknown[];
  message?: string;
  listeners?: BitsListener[];
  scheduleOptions?: BitsScheduleOptions;
  response?: unknown;
}

// ============================================================================
// Simple In-Memory Store
// ============================================================================

function createSimpleStore(prefix: string = ''): BitsStore {
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
// Polling Store Factory
// ============================================================================

/**
 * Create a polling store bound to a specific trigger context.
 * Returns a BitsPollingStore that wraps PollingStore with pre-bound context.
 */
function createBoundPollingStore(
  workflowId: string,
  triggerId: string,
  dedupStrategy: DedupStrategy = 'id'
): BitsPollingStore {
  const store = createPollingStore({
    collection: 'polling_seen_items',
    dedupStrategy,
  });

  const ctx = { workflowId, triggerId };
  const baseStore = createSimpleStore(`polling:${workflowId}:${triggerId}`);

  return {
    // Base store methods
    get: baseStore.get,
    put: baseStore.put,
    delete: baseStore.delete,

    // Polling-specific methods
    async hasSeenItem(itemId: string, itemDate?: string): Promise<boolean> {
      return store.hasSeenItem(ctx, itemId, itemDate);
    },
    async markItemSeen(itemId: string, sourceDate: string, data?: any): Promise<void> {
      return store.markItemSeen(ctx, itemId, sourceDate, data);
    },
    async getLastPolledDate(): Promise<string | null> {
      return store.getLastPolledDate(ctx);
    },
    async setLastPolledDate(date: string): Promise<void> {
      return store.setLastPolledDate(ctx, date);
    },
    async getSeenCount(): Promise<number> {
      return store.getSeenCount(ctx);
    },
    async clearTrigger(): Promise<number> {
      return store.clearTrigger(ctx);
    },
  };
}

// ============================================================================
// Helper to check if value is nil (null or undefined)
// ============================================================================

function isNil(value: any): value is null | undefined {
  return value === null || value === undefined;
}

// ============================================================================
// Map trigger type from loaded module to our enum
// ============================================================================

function mapTriggerType(type: string | undefined): BitsTriggerType {
  if (!type) return BitsTriggerType.POLLING;
  
  const typeUpper = type.toUpperCase();
  switch (typeUpper) {
    case 'POLLING':
      return BitsTriggerType.POLLING;
    case 'WEBHOOK':
      return BitsTriggerType.WEBHOOK;
    case 'APP_WEBHOOK':
      return BitsTriggerType.APP_WEBHOOK;
    default:
      return BitsTriggerType.POLLING;
  }
}

// ============================================================================
// Bits Trigger Helper
// ============================================================================

export const bitsTriggerHelper = {
  /**
   * Load a piece from module definition
   */
  async loadPieceFromModule(moduleDefinition: ModuleDefinition): Promise<BitsPiece> {
    await ensureModuleInstalled(moduleDefinition);
    return pieceFromModule(moduleDefinition);
  },

  /**
   * Get a specific trigger from a piece
   */
  async getTrigger(
    moduleDefinition: ModuleDefinition,
    triggerName: string
  ): Promise<{ piece: BitsPiece; trigger: BitsTrigger }> {
    const piece = await this.loadPieceFromModule(moduleDefinition);
    const triggers = piece.triggers();
    const trigger = triggers[triggerName];

    if (!trigger) {
      const availableTriggers = Object.keys(triggers).join(', ');
      throw new Error(
        `Trigger '${triggerName}' not found. Available triggers: ${availableTriggers || 'none'}`
      );
    }

    return { piece, trigger };
  },

  /**
   * Execute a trigger based on hook type
   */
  async executeTrigger(params: TriggerExecutionParams): Promise<TriggerExecutionResult> {
    const { moduleDefinition, triggerName, input, hookType, trigger, payload, webhookUrl, isTest, store, executor, workflowId, nodeId } = params;

    if (isNil(triggerName)) {
      throw new Error('Trigger name is not set');
    }

    let bitsTrigger: BitsTrigger;
    if (trigger) {
      bitsTrigger = trigger;
    } else {
      const { trigger: loadedTrigger } = await this.getTrigger(moduleDefinition, triggerName);
      bitsTrigger = loadedTrigger;
    }

    logger.log(`🔔 Executing bits trigger: ${triggerName} (${hookType})`);

    const appListeners: BitsListener[] = [];
    let scheduleOptions: BitsScheduleOptions | undefined;
    const storePrefix = isTest ? 'test' : triggerName;

    // Use provided store or create a new one
    const triggerStore = store || createSimpleStore(storePrefix);

    // Determine trigger type to decide if we need a polling store
    const triggerType = mapTriggerType((bitsTrigger as any).type);
    
    // Create polling store for POLLING triggers
    let pollingStore: BitsPollingStore | undefined;
    if (triggerType === BitsTriggerType.POLLING && workflowId) {
      // Get dedup strategy from trigger props if specified
      const dedupStrategy = (input.dedupBy as DedupStrategy) || 'id';
      const triggerId = `${moduleDefinition.repository}:${triggerName}`;
      pollingStore = createBoundPollingStore(workflowId, triggerId, dedupStrategy);
      logger.log(`📊 Created polling store for ${triggerId} (dedup: ${dedupStrategy})`);
    }

    // Extract auth from credentials if present
    let auth: any = undefined;
    const { credentials, ...triggerProps } = input;
    if (credentials) {
      const credentialKeys = Object.keys(credentials);
      if (credentialKeys.length > 0) {
        const credentialData = credentials[credentialKeys[0]];
        // Wrap in props structure and also spread at top level
        auth = {
          props: credentialData,
          ...credentialData,
        };
        logger.log(`🔐 Using credentials for trigger: ${credentialKeys[0]}`);
      }
    }

    // Build context for trigger execution
    const context: BitsTriggerContext = {
      auth,
      propsValue: triggerProps,
      payload: payload ?? {},
      webhookUrl,
      store: triggerStore,
      app: {
        createListeners(listener: BitsListener): void {
          appListeners.push(listener);
        },
      },
      setSchedule(options: BitsScheduleOptions): void {
        scheduleOptions = {
          cronExpression: options.cronExpression,
          timezone: options.timezone ?? 'UTC',
        };
      },
      executor,
      workflowId,
      nodeId,
      pollingStore,
    };

    try {
      switch (hookType) {
        case TriggerHookType.ON_ENABLE: {
          if (bitsTrigger.onEnable) {
            await bitsTrigger.onEnable(context);
          }
          const triggerTypeForResult = mapTriggerType((bitsTrigger as any).type);
          return {
            success: true,
            listeners: appListeners,
            scheduleOptions: triggerTypeForResult === BitsTriggerType.POLLING ? scheduleOptions : undefined,
          };
        }

        case TriggerHookType.ON_DISABLE: {
          if (bitsTrigger.onDisable) {
            await bitsTrigger.onDisable(context);
          }
          return { success: true };
        }

        case TriggerHookType.HANDSHAKE: {
          if (bitsTrigger.onHandshake) {
            const response = await bitsTrigger.onHandshake(context);
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
          if (bitsTrigger.test) {
            const testResult = await bitsTrigger.test(context);
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
          if (bitsTrigger.run) {
            const runResult = await bitsTrigger.run(context);
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
        message: `Error executing trigger: ${(error)}`,
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
      type: BitsTriggerType;
    }>;
  }> {
    const piece = await this.loadPieceFromModule(moduleDefinition);
    const triggers = piece.triggers();

    return {
      triggers: Object.entries(triggers).map(([name, trigger]) => ({
        name,
        displayName: trigger.displayName,
        description: trigger.description,
        type: mapTriggerType((trigger as any).type),
      })),
    };
  },

  /**
   * Execute trigger with proper flow based on trigger type
   * For polling: calls onEnable first, then run
   * For webhooks: calls run directly
   */
  async executeBitsTrigger(params: {
    moduleDefinition: ModuleDefinition;
    triggerName: string;
    input: Record<string, any>;
    payload?: unknown;
    webhookUrl?: string;
    store?: BitsStore;
    executor?: any;
    workflowId?: string;
    nodeId?: string;
  }): Promise<TriggerExecutionResult> {
    const { moduleDefinition, triggerName, input, payload, webhookUrl, store, executor, workflowId, nodeId } = params;

    // Get the trigger to determine its type
    const { piece, trigger } = await this.getTrigger(moduleDefinition, triggerName);
    const triggerType = mapTriggerType((trigger as any).type);

    const triggerStore = store || createSimpleStore(`trigger:${triggerName}`);

    switch (triggerType) {
      case BitsTriggerType.POLLING: {
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
          executor,
          workflowId,
          nodeId,
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
          executor,
          workflowId,
          nodeId,
        });

        if (!runResult.success) {
          logger.warn(`  ⚠️ Run failed: ${runResult.message}`);
        } else {
          logger.log(`  ✅ Run completed, items found: ${runResult.output?.length || 0}`);
        }

        return runResult;
      }

      case BitsTriggerType.WEBHOOK: {
        logger.log(`Webhook trigger`);

        return await this.executeTrigger({
          moduleDefinition,
          triggerName,
          input,
          hookType: TriggerHookType.RUN,
          payload,
          webhookUrl,
          isTest: false,
          executor,
          workflowId,
          nodeId,
        });
      }

      default: {
        return {
          success: false,
          message: `Unsupported trigger type: ${triggerType}`,
          output: [],
        };
      }
    }
  },

  /**
   * Hook triggers for a piece - sets up polling/webhooks based on trigger type
   */
  async hookTriggers(
    moduleDefinition: ModuleDefinition,
    options?: {
      webhookBaseUrl?: string;
      onPollingTrigger?: (triggerName: string, trigger: BitsTrigger) => void;
      onWebhookTrigger?: (triggerName: string, trigger: BitsTrigger) => void;
      onAppWebhookTrigger?: (triggerName: string, trigger: BitsTrigger) => void;
      onTriggerResult?: (triggerName: string, result: TriggerExecutionResult) => void;
      input?: Record<string, any>;
    }
  ): Promise<void> {
    const piece = await this.loadPieceFromModule(moduleDefinition);
    const triggers = piece.triggers();

    for (const [triggerName, trigger] of Object.entries(triggers)) {
      const triggerType = mapTriggerType((trigger as any).type);
      logger.log(`🔔 Hooking trigger: ${triggerName} (type: ${triggerType})`);

      switch (triggerType) {
        case BitsTriggerType.POLLING:
          logger.log(`  → Setting up polling trigger`);
          if (options?.onPollingTrigger) {
            options.onPollingTrigger(triggerName, trigger);
          }

          // Auto-run polling trigger immediately
          logger.log(`  🚀 Running polling trigger immediately...`);
          try {
            const result = await this.executeBitsTrigger({
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

            if (options?.onTriggerResult) {
              options.onTriggerResult(triggerName, result);
            }
          } catch (error: any) {
            logger.error(`  ❌ Error running trigger ${triggerName}:`, error.message);
          }
          break;

        case BitsTriggerType.WEBHOOK:
          logger.log(`  → Setting up webhook trigger`);
          if (options?.onWebhookTrigger) {
            options.onWebhookTrigger(triggerName, trigger);
          }
          break;

        case BitsTriggerType.APP_WEBHOOK:
          logger.log(`  → Setting up app webhook trigger`);
          if (options?.onAppWebhookTrigger) {
            options.onAppWebhookTrigger(triggerName, trigger);
          }
          break;

        default:
          logger.warn(`  ⚠️ Unknown trigger type: ${triggerType}`);
      }
    }
  },

  /**
   * Validate cron expression (simple validation)
   */
  isValidCron(expression: string): boolean {
    const parts = expression.trim().split(/\s+/);
    return parts.length >= 5 && parts.length <= 6;
  },

  /**
   * Check if a node is a Bits trigger (polling or webhook)
   */
  isBitsTrigger(node: any): boolean {
    return (
      node.data?.framework === 'bits' &&
      (node.data?.triggerType === 'polling' || node.data?.triggerType === 'webhook')
    );
  },

  /**
   * Check if a node is a webhook trigger
   */
  isWebhookTrigger(node: any): boolean {
    return (
      node.type === 'trigger' &&
      node.data?.framework === 'bits' &&
      (node.data?.triggerType === 'webhook' || node.data?.operation === 'catch_webhook')
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

    return {
      success: true,
      output: [
        {
          body: payload,
          headers: headers || {},
          query: query || {},
          method: 'POST',
          timestamp: new Date().toISOString(),
        },
      ],
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

// Re-export types for convenience
export { 
  BitsTrigger, 
  BitsTriggerType, 
  BitsStore, 
  BitsTriggerContext,
  BitsListener,
  BitsScheduleOptions,
} from './bitsDoer';

export default bitsTriggerHelper;
