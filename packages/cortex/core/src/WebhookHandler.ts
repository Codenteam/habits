import { WebhookPayload } from '@habits/shared/types';

// ============================================================================
// Webhook Handler Interface
// ============================================================================

/**
 * Interface for webhook handling that can be injected into WorkflowExecutor.
 * This allows the executor to remain platform-agnostic while still supporting
 * webhook triggers when running in a Node.js server environment.
 * 
 * Implementations of this interface are provided by the server layer
 * (e.g., @ha-bits/cortex/server provides an Express-based implementation).
 */
export interface IWebhookHandler {
  /**
   * Register a webhook and wait for it to be triggered
   * @param nodeId - The node ID
   * @param timeout - Timeout in milliseconds
   * @param workflowId - Optional workflow ID for multi-workflow support
   */
  waitForWebhook(nodeId: string, timeout: number, workflowId?: string): Promise<WebhookPayload>;

  /**
   * Cancel a pending webhook
   * @param nodeId - The node ID
   * @param workflowId - Optional workflow ID
   */
  cancelWebhook(nodeId: string, workflowId?: string): void;
}
