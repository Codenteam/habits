import express, { Request, Response } from 'express';
import { WebhookPayload } from '@habits/shared/types';
import { IWebhookHandler } from '@ha-bits/cortex-core';

// ============================================================================
// Webhook Server Options
// ============================================================================

export interface WebhookServerOptions {
  port: number;
  host: string;
}

// ============================================================================
// Webhook Trigger Server (Express-based, Node.js only)
// ============================================================================

/**
 * Express-based webhook server for receiving webhook callbacks during workflow execution.
 * This is only used in Node.js server environments and implements IWebhookHandler.
 */
export class WebhookTriggerServer implements IWebhookHandler {
  private app: express.Application;
  private server: any;
  private webhookHandlers: Map<string, (payload: WebhookPayload) => void> = new Map();
  private pendingWebhooks: Map<string, {
    resolve: (payload: any) => void;
    reject: (error: Error) => void;
  }> = new Map();
  private logger = console;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(express.json({ limit: '1000mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1000mb' }));

    // CORS headers
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'healthy', type: 'webhook-trigger-server', timestamp: new Date().toISOString() });
    });

    // List registered webhooks
    this.app.get('/webhooks', (req: Request, res: Response) => {
      const webhooks = Array.from(this.pendingWebhooks.keys()).map(id => {
        const [workflowId, nodeId] = id.includes(':') ? id.split(':') : [undefined, id];
        return {
          workflowId,
          nodeId,
          path: workflowId ? `/webhook/${workflowId}/${nodeId}` : `/webhook/${nodeId}`,
          status: 'waiting'
        };
      });
      res.json({ webhooks });
    });

    // Dynamic webhook endpoint handler with workflow ID
    this.app.all('/webhook/:workflowId/:nodeId', async (req: Request, res: Response) => {
      const { workflowId, nodeId } = req.params;
      const webhookKey = `${workflowId}:${nodeId}`;

      this.logger.log(`📥 Webhook received for workflow: ${workflowId}, node: ${nodeId}`);
      this.logger.log(`   Method: ${req.method}`);
      this.logger.log(`   Body: ${JSON.stringify(req.body).substring(0, 200)}...`);

      const webhookPayload: WebhookPayload = {
        nodeId,
        payload: req.body,
        headers: req.headers as Record<string, string>,
        query: req.query as Record<string, string>,
      };

      // Check if there's a pending webhook for this workflow/node combo
      const pending = this.pendingWebhooks.get(webhookKey);
      if (pending) {
        this.logger.log(`✅ Resolving pending webhook for workflow: ${workflowId}, node: ${nodeId}`);
        pending.resolve(webhookPayload);
        this.pendingWebhooks.delete(webhookKey);

        res.json({
          success: true,
          message: 'Webhook received and processed',
          workflowId,
          nodeId,
          timestamp: new Date().toISOString(),
        });
      } else {
        this.logger.warn(`⚠️ No pending handler for webhook: workflow=${workflowId}, node=${nodeId}`);
        res.status(404).json({
          success: false,
          message: `No workflow waiting for webhook on workflow: ${workflowId}, node: ${nodeId}`,
          availableWebhooks: Array.from(this.pendingWebhooks.keys()),
        });
      }
    });
  }

  /**
   * Register a webhook and wait for it to be triggered
   * @param nodeId - The node ID
   * @param timeout - Timeout in milliseconds
   * @param workflowId - Optional workflow ID for multi-workflow support
   */
  waitForWebhook(nodeId: string, timeout: number = 300000, workflowId?: string): Promise<WebhookPayload> {
    const webhookKey = workflowId ? `${workflowId}:${nodeId}` : nodeId;

    return new Promise((resolve, reject) => {
      this.logger.log(`🔔 Registering webhook listener for: ${webhookKey}`);

      // Set timeout for webhook
      const timeoutId = setTimeout(() => {
        this.pendingWebhooks.delete(webhookKey);
        reject(new Error(`Webhook timeout: No webhook received for ${webhookKey} within ${timeout}ms`));
      }, timeout);

      this.pendingWebhooks.set(webhookKey, {
        resolve: (payload) => {
          clearTimeout(timeoutId);
          resolve(payload);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
      });
    });
  }

  /**
   * Cancel a pending webhook
   */
  cancelWebhook(nodeId: string, workflowId?: string): void {
    const webhookKey = workflowId ? `${workflowId}:${nodeId}` : nodeId;
    const pending = this.pendingWebhooks.get(webhookKey);
    if (pending) {
      pending.reject(new Error('Webhook cancelled'));
      this.pendingWebhooks.delete(webhookKey);
    }
  }

  async start(options: WebhookServerOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(options.port, options.host, () => {
          const url = `http://${options.host === '0.0.0.0' ? 'localhost' : options.host}:${options.port}`;
          this.logger.log(`\n🌐 Webhook Trigger Server started on ${url}`);
          resolve(url);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    // Cancel all pending webhooks
    for (const [nodeId, pending] of this.pendingWebhooks) {
      pending.reject(new Error('Server shutting down'));
    }
    this.pendingWebhooks.clear();

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.log('🛑 Webhook Trigger Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
