/**
 * WebhookRegistry - Manages webhook listeners for vendor-based webhook routing.
 * 
 * This registry tracks which workflows/triggers are listening to webhooks for each bit module.
 * When a webhook arrives at /webhook/:moduleId or /webhook/:moduleId/:webhookName,
 * the registry provides the list of listeners that should receive the event.
 * 
 * Each listener's trigger.filter() function is called to determine if it should
 * handle the specific event.
 */

import { WebhookFilterPayload } from '@ha-bits/cortex-core';

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a registered webhook listener
 */
export interface WebhookListener {
  /** The workflow ID this listener belongs to */
  workflowId: string;
  /** The node ID of the trigger in the workflow */
  nodeId: string;
  /** The bit module ID (e.g., 'gohighlevel', 'hubspot') */
  moduleId: string;
  /** The trigger name within the bit (e.g., 'newContact', 'contactUpdated') */
  triggerName: string;
  /** Optional webhook name for multi-account support */
  webhookName?: string;
  /** The filter function from the trigger definition */
  filter?: (payload: WebhookFilterPayload) => boolean | Promise<boolean>;
  /** The run function from the trigger definition */
  run?: (context: any) => Promise<any[]>;
  /** The npm module name (e.g., '@ha-bits/bit-gohighlevel') */
  npmModule?: string;
}

/**
 * Result of dispatching a webhook to listeners
 */
export interface WebhookDispatchResult {
  /** The listener that matched */
  listener: WebhookListener;
  /** Whether the filter matched */
  matched: boolean;
  /** Any error that occurred during filter evaluation */
  error?: Error;
}

// ============================================================================
// WebhookRegistry
// ============================================================================

export class WebhookRegistry {
  /**
   * Map of moduleId -> Map of webhookName (or 'default') -> array of listeners
   */
  private registry: Map<string, Map<string, WebhookListener[]>> = new Map();
  
  /**
   * Logger
   */
  private logger = console;

  constructor() {
    this.logger.log('🔌 WebhookRegistry initialized');
  }

  /**
   * Register a webhook listener for a trigger
   */
  register(listener: WebhookListener): void {
    const { moduleId, webhookName } = listener;
    const webhookKey = webhookName || 'default';
    
    // Get or create module map
    let moduleMap = this.registry.get(moduleId);
    if (!moduleMap) {
      moduleMap = new Map();
      this.registry.set(moduleId, moduleMap);
    }
    
    // Get or create listeners array
    let listeners = moduleMap.get(webhookKey);
    if (!listeners) {
      listeners = [];
      moduleMap.set(webhookKey, listeners);
    }
    
    // Check if already registered (same workflow + node)
    const existing = listeners.find(
      l => l.workflowId === listener.workflowId && l.nodeId === listener.nodeId
    );
    
    if (existing) {
      this.logger.log(`🔌 Webhook listener already registered: ${moduleId}/${webhookKey} -> ${listener.workflowId}:${listener.nodeId}`);
      return;
    }
    
    listeners.push(listener);
    this.logger.log(`🔌 Registered webhook listener: ${moduleId}/${webhookKey} -> ${listener.workflowId}:${listener.nodeId}:${listener.triggerName}`);
  }

  /**
   * Unregister a webhook listener
   */
  unregister(workflowId: string, nodeId: string): void {
    for (const [moduleId, moduleMap] of this.registry) {
      for (const [webhookKey, listeners] of moduleMap) {
        const index = listeners.findIndex(
          l => l.workflowId === workflowId && l.nodeId === nodeId
        );
        
        if (index !== -1) {
          listeners.splice(index, 1);
          this.logger.log(`🔌 Unregistered webhook listener: ${moduleId}/${webhookKey} -> ${workflowId}:${nodeId}`);
          
          // Clean up empty arrays/maps
          if (listeners.length === 0) {
            moduleMap.delete(webhookKey);
          }
          if (moduleMap.size === 0) {
            this.registry.delete(moduleId);
          }
          return;
        }
      }
    }
  }

  /**
   * Unregister all listeners for a workflow
   */
  unregisterWorkflow(workflowId: string): void {
    for (const [moduleId, moduleMap] of this.registry) {
      for (const [webhookKey, listeners] of moduleMap) {
        const filtered = listeners.filter(l => l.workflowId !== workflowId);
        if (filtered.length !== listeners.length) {
          this.logger.log(`🔌 Unregistered ${listeners.length - filtered.length} listener(s) from ${moduleId}/${webhookKey} for workflow ${workflowId}`);
          if (filtered.length === 0) {
            moduleMap.delete(webhookKey);
          } else {
            moduleMap.set(webhookKey, filtered);
          }
        }
      }
      
      // Clean up empty module map
      if (moduleMap.size === 0) {
        this.registry.delete(moduleId);
      }
    }
  }

  /**
   * Get all listeners for a module (optionally filtered by webhookName)
   */
  getListeners(moduleId: string, webhookName?: string): WebhookListener[] {
    const moduleMap = this.registry.get(moduleId);
    if (!moduleMap) {
      return [];
    }
    
    if (webhookName) {
      // Return only listeners for the specific webhook name
      return moduleMap.get(webhookName) || [];
    }
    
    // Return listeners for 'default' (no webhook name specified in workflow config)
    return moduleMap.get('default') || [];
  }

  /**
   * Get all listeners for a module (including all webhook names)
   */
  getAllListeners(moduleId: string): WebhookListener[] {
    const moduleMap = this.registry.get(moduleId);
    if (!moduleMap) {
      return [];
    }
    
    const allListeners: WebhookListener[] = [];
    for (const listeners of moduleMap.values()) {
      allListeners.push(...listeners);
    }
    return allListeners;
  }

  /**
   * Evaluate filter for a listener, with error handling
   */
  async evaluateFilter(
    listener: WebhookListener,
    payload: WebhookFilterPayload
  ): Promise<WebhookDispatchResult> {
    try {
      // If no filter defined, accept all events
      if (!listener.filter) {
        return { listener, matched: true };
      }
      
      const result = await listener.filter(payload);
      return { listener, matched: result };
    } catch (error) {
      this.logger.error(`🔌 Error evaluating filter for ${listener.workflowId}:${listener.nodeId}:`, error);
      return { listener, matched: false, error: error as Error };
    }
  }

  /**
   * Dispatch a webhook to all matching listeners
   * Returns array of results indicating which listeners matched
   */
  async dispatch(
    moduleId: string,
    webhookName: string | undefined,
    payload: WebhookFilterPayload
  ): Promise<WebhookDispatchResult[]> {
    const listeners = this.getListeners(moduleId, webhookName);
    
    if (listeners.length === 0) {
      this.logger.log(`🔌 No listeners registered for ${moduleId}${webhookName ? '/' + webhookName : ''}`);
      return [];
    }
    
    this.logger.log(`🔌 Dispatching webhook to ${listeners.length} listener(s) for ${moduleId}${webhookName ? '/' + webhookName : ''}`);
    
    // Evaluate filters for all listeners in parallel
    const results = await Promise.all(
      listeners.map(listener => this.evaluateFilter(listener, payload))
    );
    
    const matchedCount = results.filter(r => r.matched).length;
    this.logger.log(`🔌 ${matchedCount}/${listeners.length} listener(s) matched the filter`);
    
    return results;
  }

  /**
   * Get a summary of all registered webhooks
   */
  getSummary(): { moduleId: string; webhookName: string; count: number; listeners: { workflowId: string; nodeId: string; triggerName: string }[] }[] {
    const summary: { moduleId: string; webhookName: string; count: number; listeners: { workflowId: string; nodeId: string; triggerName: string }[] }[] = [];
    
    for (const [moduleId, moduleMap] of this.registry) {
      for (const [webhookName, listeners] of moduleMap) {
        summary.push({
          moduleId,
          webhookName,
          count: listeners.length,
          listeners: listeners.map(l => ({
            workflowId: l.workflowId,
            nodeId: l.nodeId,
            triggerName: l.triggerName,
          })),
        });
      }
    }
    
    return summary;
  }

  /**
   * Get all registered module IDs
   */
  getModuleIds(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Clear all registered listeners
   */
  clear(): void {
    this.registry.clear();
    this.logger.log('🔌 WebhookRegistry cleared');
  }
}

// Export singleton instance
export const webhookRegistry = new WebhookRegistry();
export default WebhookRegistry;
