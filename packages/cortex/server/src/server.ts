#!/usr/bin/env node

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as fs from '@ha-bits/bindings/fs';
import * as path from '@ha-bits/bindings/path';
import * as yaml from 'yaml';
import {
  Workflow,
  WorkflowExecution,
  LoadedWorkflow,
  StreamEvent,
  NodeResult,
  ExecutionResponse,
  StreamNodeEvent,
  StreamExecutionEvent,
  WorkflowConfig,
  WebhookPayload,
} from '@habits/shared/types';
import {
  detectWorkflowType,
  convertWorkflow,
  convertWorkflowWithConnections,
  generateEnvContent,
  getWorkflowTypeName,
} from '@ha-bits/core';
import { WorkflowExecutor, IWebhookHandler } from '@ha-bits/cortex-core';
import { WebhookTriggerServer } from './WebhookTriggerServer';
import { setupOpenAPIRoutes } from './openapi';
import { setupManageRoutes, ManageModule } from './manage';

// Load environment variables
dotenv.config();

// ============================================================================
// Helper: Extract node IDs referenced in workflow output template
// ============================================================================

/**
 * Extract all node IDs that are referenced in the workflow's output template.
 * Looks for patterns like {{nodeId}} or {{nodeId.property}} in the output values.
 */
function extractOutputNodeIds(workflow: Workflow): Set<string> {
  const nodeIds = new Set<string>();
  
  if (!workflow.output) {
    return nodeIds;
  }
  
  const extractFromValue = (value: any): void => {
    if (typeof value === 'string') {
      // Match patterns like {{nodeId}} or {{nodeId.property}} but not {{habits.xxx}}
      const regex = /\{\{([a-zA-Z0-9_-]+)(?:\.[^}]*)?\}\}/g;
      let match;
      while ((match = regex.exec(value)) !== null) {
        const nodeId = match[1];
        // Exclude habits context references
        if (nodeId !== 'habits') {
          nodeIds.add(nodeId);
        }
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        extractFromValue(item);
      }
    } else if (value && typeof value === 'object') {
      for (const key of Object.keys(value)) {
        extractFromValue(value[key]);
      }
    }
  };
  
  extractFromValue(workflow.output);
  return nodeIds;
}

// ============================================================================
// Workflow Executor Server (HTTP API)
// ============================================================================

class WorkflowExecutorServer {
  private app: express.Application;
  private executor: WorkflowExecutor;
  private server: any;
  private configPath: string | null = null;
  private configDir: string | null = null;
  private manageModule: ManageModule | null = null;
  private openapiEnabled: boolean = false;
  private pendingWebhooks: Map<string, {
    resolve: (payload: any) => void;
    reject: (error: Error) => void;
  }> = new Map();
  private webhookServer: WebhookTriggerServer | null = null;
  private webhookServerUrl: string | null = null;

  constructor() {
    this.app = express();
    this.executor = new WorkflowExecutor();
    this.setupMiddleware();
  }

  /**
   * Load workflows from config file (YAML or JSON)
   * Parses config, loads workflow files, and initializes the executor
   */
  async loadConfig(configPath: string): Promise<void> {
    const absolutePath = path.resolve(configPath);
    this.configPath = configPath;
    this.configDir = path.dirname(absolutePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Config file not found: ${absolutePath}`);
    }

    // Parse .env file if it exists
    let envVars: Record<string, string> | undefined;
    const envPath = path.join(this.configDir, '.env');
    if (fs.existsSync(envPath)) {
      console.log(`\n🔐 Loading environment variables from: ${envPath}`);
      // Parse .env file manually to get as Record
      const envContent = fs.readFileSync(envPath, 'utf8');
      envVars = {};
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIndex = trimmed.indexOf('=');
          if (eqIndex > 0) {
            const key = trimmed.slice(0, eqIndex).trim();
            let value = trimmed.slice(eqIndex + 1).trim();
            // Remove surrounding quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            envVars[key] = value;
          }
        }
      }
    }

    // Parse config file - support both JSON and YAML formats
    const fileContent = fs.readFileSync(absolutePath, 'utf8');
    const config = yaml.parse(fileContent) as WorkflowConfig;

    // Load workflow files into a map
    const workflows = new Map<string, Workflow>();
    for (const workflowRef of config.workflows) {
      if (workflowRef.enabled === false) continue;

      const workflowPath = path.isAbsolute(workflowRef.path)
        ? workflowRef.path
        : path.resolve(this.configDir, workflowRef.path);

      if (!fs.existsSync(workflowPath)) {
        console.error(`   ❌ Workflow file not found: ${workflowPath}`);
        continue;
      }

      try {
        const workflowContent = fs.readFileSync(workflowPath, 'utf8');
        const workflow = yaml.parse(workflowContent) as Workflow;
        const workflowId = workflowRef.id || workflow.id || workflowRef.path;
        workflows.set(workflowId, workflow);
      } catch (error: any) {
        console.error(`   ❌ Failed to parse workflow file ${workflowPath}: ${error.message}`);
      }
    }

    // Initialize the executor with loaded data
    await this.executor.initFromData({ config, workflows, env: envVars });
  }

  /**
   * Initialize from in-memory data (no file system access needed)
   * @param options.config - The workflow configuration object
   * @param options.workflows - Map or Record of workflow id to workflow object
   * @param options.env - Optional environment variables to set
   */
  async initFromData(options: {
    config: WorkflowConfig;
    workflows: Map<string, Workflow> | Record<string, Workflow>;
    env?: Record<string, string>;
  }): Promise<void> {
    this.configPath = null;
    this.configDir = null;
    await this.executor.initFromData(options);
  }

  /**
   * Get a webhook handler that uses this server's pending webhooks map.
   * This implements IWebhookHandler for use with the workflow executor.
   */
  private getWebhookHandler(): IWebhookHandler {
    return {
      waitForWebhook: (nodeId: string, timeout: number = 300000, workflowId?: string): Promise<WebhookPayload> => {
        const webhookKey = workflowId ? `${workflowId}:${nodeId}` : nodeId;
        
        return new Promise((resolve, reject) => {
          console.log(`🔔 Registering webhook listener for: ${webhookKey}`);
          
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
      },
      cancelWebhook: (nodeId: string, workflowId?: string): void => {
        const webhookKey = workflowId ? `${workflowId}:${nodeId}` : nodeId;
        const pending = this.pendingWebhooks.get(webhookKey);
        if (pending) {
          pending.reject(new Error('Webhook cancelled'));
          this.pendingWebhooks.delete(webhookKey);
        }
      },
    };
  }

  /**
   * Parse cookies from Cookie header string
   */
  private parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    if (!cookieHeader) return cookies;
    
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.split('=');
      if (name && rest.length > 0) {
        const trimmedName = name.trim();
        const value = rest.join('=').trim();
        // Decode URI encoded values
        try {
          cookies[trimmedName] = decodeURIComponent(value);
        } catch {
          cookies[trimmedName] = value;
        }
      }
    });
    
    return cookies;
  }

  /**
   * Collect response headers from node results
   * Looks for __habitsResponseHeaders property in node results (e.g., from bit-cookie)
   */
  private collectResponseHeaders(nodeStatuses: Array<{ nodeId: string; result?: any }>): Record<string, string> {
    const headers: Record<string, string> = {};
    
    for (const status of nodeStatuses) {
      if (status.result && typeof status.result === 'object' && status.result.__habitsResponseHeaders) {
        const nodeHeaders = status.result.__habitsResponseHeaders;
        if (typeof nodeHeaders === 'object') {
          for (const [key, value] of Object.entries(nodeHeaders)) {
            if (typeof value === 'string') {
              headers[key] = value;
            }
          }
        }
      }
    }
    
    return headers;
  }

  private setupMiddleware() {
    this.app.use(express.json({ limit: '1000mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1000mb' }));
    
    // Add CORS headers
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

  /**
   * Setup routes after config is loaded (so we know about frontend path)
   */
  private setupRoutes() {
    const config = this.executor.getConfig();

    // ========================================================================
    // OpenAPI Documentation (enabled via HABITS_OPENAPI_ENABLED env var)
    // ========================================================================
    
    this.openapiEnabled = process.env.HABITS_OPENAPI_ENABLED === 'true' || process.env.HABITS_OPENAPI_ENABLED === '1';
    if (this.openapiEnabled) {
      setupOpenAPIRoutes(this.app, this.executor);
    }

    // ========================================================================
    // Management Routes (enabled via HABITS_MANAGE_ENABLED env var only)
    // ========================================================================
    
    this.manageModule = setupManageRoutes(this.app, () => this.executor);

    // ========================================================================
    // Webhook Routes (under /webhook)
    // ========================================================================

    // Webhook health check
    this.app.get('/webhook/health', (req: Request, res: Response) => {
      res.json({ status: 'healthy', type: 'webhook-endpoint', timestamp: new Date().toISOString() });
    });

    // List registered webhooks
    this.app.get('/webhook/list', (req: Request, res: Response) => {
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
      
      console.log(`📥 Webhook received for workflow: ${workflowId}, node: ${nodeId}`);
      console.log(`   Method: ${req.method}`);
      console.log(`   Body: ${JSON.stringify(req.body).substring(0, 200)}...`);

      const webhookPayload = {
        nodeId,
        payload: req.body,
        headers: req.headers as Record<string, string>,
        query: req.query as Record<string, string>,
      };

      // Check if there's a pending webhook for this workflow/node combo
      const pending = this.pendingWebhooks.get(webhookKey);
      if (pending) {
        console.log(`✅ Resolving pending webhook for workflow: ${workflowId}, node: ${nodeId}`);
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
        console.warn(`⚠️ No pending handler for webhook: workflow=${workflowId}, node=${nodeId}`);
        res.status(404).json({
          success: false,
          message: `No workflow waiting for webhook on workflow: ${workflowId}, node: ${nodeId}`,
          availableWebhooks: Array.from(this.pendingWebhooks.keys()),
        });
      }
    });

    // ========================================================================
    // API Routes (under /api)
    // ========================================================================

    // Health check (available at both /health and /misc/health for compatibility)
    const healthHandler = (req: Request, res: Response) => {
      const config = this.executor.getConfig();
      const workflows = this.executor.getAllWorkflows();
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        configLoaded: !!config,
        workflowsLoaded: workflows.length,
        workflows: workflows.map(w => ({
          id: w.reference.id,
          name: w.workflow.name,
          enabled: w.reference.enabled !== false
        }))
      });
    };
    this.app.get('/health', healthHandler);
    this.app.get('/misc/health', healthHandler);

    // List all loaded workflows
    this.app.get('/misc/workflows', (req: Request, res: Response) => {
      const workflows = this.executor.getAllWorkflows();
      res.json({
        count: workflows.length,
        workflows: workflows.map(w => ({
          id: w.reference.id,
          name: w.workflow.name,
          description: w.workflow.description,
          enabled: w.reference.enabled !== false,
          path: w.reference.path,
          nodeCount: w.workflow.nodes?.length || 0,
          edgeCount: w.workflow.edges?.length || 0
        }))
      });
    });

    // Get specific workflow details
    this.app.get('/misc/workflow/:workflowId', (req: Request, res: Response) => {
      const { workflowId } = req.params;
      const loadedWorkflow = this.executor.getWorkflow(workflowId);
      
      if (!loadedWorkflow) {
        return res.status(404).json({ error: `Workflow not found: ${workflowId}` });
      }

      res.json({
        id: loadedWorkflow.reference.id,
        name: loadedWorkflow.workflow.name,
        description: loadedWorkflow.workflow.description,
        enabled: loadedWorkflow.reference.enabled !== false,
        workflow: loadedWorkflow.workflow
      });
    });

    // Execute a specific workflow by ID
    // Supports GET (params from query) and POST (params from body)
    // Supports streaming mode via ?stream=true query param or Accept: application/x-ndjson header
    this.app.all('/api/:workflowId', async (req: Request, res: Response) => {
      try {
        const { workflowId } = req.params;
        const loadedWorkflow = this.executor.getWorkflow(workflowId);
        
        if (!loadedWorkflow) {
          return res.status(404).json({ error: `Workflow not found: ${workflowId}` });
        }

        if (loadedWorkflow.reference.enabled === false) {
          return res.status(403).json({ error: `Workflow is disabled: ${workflowId}` });
        }

        // Check if streaming mode is requested
        const isStreamMode = 
          req.query.stream === 'true' || 
          req.query.stream === '1' ||
          req.headers.accept === 'application/x-ndjson' ||
          req.headers.accept === 'application/jsonl';

        // Parse cookies from Cookie header
        const parsedCookies = this.parseCookies(req.headers.cookie || '');
        
        // Get input data: from body for POST/PUT/PATCH, from query params for GET
        // Exclude 'stream' from query params as it's a control parameter
        const { stream, ...queryParams } = req.query as Record<string, any>;
        const inputData = ['POST', 'PUT', 'PATCH'].includes(req.method)
          ? (req.body || {})
          : queryParams;
        
        // Build habits context with request details
        const habitsContext = {
          habits: {
            input: inputData,
            headers: req.headers || {},
            cookies: parsedCookies,
          }
        };

        const config = this.executor.getConfig();
        
        // Check if debug mode is enabled
        const isDebugMode = process.env.HABITS_DEBUG === 'true';
        
        // Extract which node IDs are referenced in the workflow output (for filtering in non-debug mode)
        const outputNodeIds = extractOutputNodeIds(loadedWorkflow.workflow);

        if (isStreamMode) {
          // Streaming mode - return JSONL/NDJSON response
          res.setHeader('Content-Type', 'application/x-ndjson');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Content-Type-Options', 'nosniff');

          // Track if response has been closed
          let isResponseClosed = false;
          res.on('close', () => {
            isResponseClosed = true;
          });

          const streamCallback = (event: StreamEvent) => {
            if (isResponseClosed) return;

            if (isDebugMode) {
              // Debug mode: return full verbose event
              res.write(JSON.stringify(event) + '\n');
            } else {
              // Non-debug mode: only emit for nodes in output list, suppress errors
              if (event.type === 'node_completed') {
                // Only emit if node is in the output list (or no output defined = emit all)
                if (outputNodeIds.size === 0 || outputNodeIds.has(event.nodeId!)) {
                  const nodeEvent: StreamNodeEvent = {
                    executionId: event.executionId,
                    workflowId: event.workflowId,
                    nodeId: event.nodeId!,
                    nodeName: event.nodeName!,
                    status: 'completed',
                    ...(event.result !== undefined && { output: event.result }),
                    ...(event.duration !== undefined && { duration: event.duration }),
                  };
                  res.write(JSON.stringify(nodeEvent) + '\n');
                }
              } else if (event.type === 'execution_completed') {
                // Final execution status - suppress errors in non-debug mode
                const execEvent: StreamExecutionEvent = {
                  executionId: event.executionId,
                  workflowId: event.workflowId,
                  type: event.type,
                  status: 'completed',
                  ...(event.output !== undefined && { output: event.output }),
                };
                res.write(JSON.stringify(execEvent) + '\n');
              } else if (event.type === 'execution_failed') {
                // In non-debug mode, report failure without detailed error
                const execEvent: StreamExecutionEvent = {
                  executionId: event.executionId,
                  workflowId: event.workflowId,
                  type: event.type,
                  status: 'failed',
                };
                res.write(JSON.stringify(execEvent) + '\n');
              }
              // Skip node_failed, execution_started, and node_started events in non-debug mode
            }
          };

          const execution = await this.executor.executeWorkflow(loadedWorkflow.workflow, {
            webhookHandler: this.getWebhookHandler(),
            webhookTimeout: loadedWorkflow.reference.webhookTimeout || config?.defaults?.webhookTimeout,
            initialContext: habitsContext,
            onStream: streamCallback,
          });

          // Track execution input for management module
          if (this.manageModule) {
            this.manageModule.trackExecutionInput(execution.id, req.body);
          }

          // End the stream
          if (!isResponseClosed) {
            res.end();
          }
        } else {
          // Non-streaming mode - return complete JSON response
          const execution = await this.executor.executeWorkflow(loadedWorkflow.workflow, {
            webhookHandler: this.getWebhookHandler(),
            webhookTimeout: loadedWorkflow.reference.webhookTimeout || config?.defaults?.webhookTimeout,
            initialContext: habitsContext,
          });
          
          // Track execution input for management module
          if (this.manageModule) {
            this.manageModule.trackExecutionInput(execution.id, req.body);
          }
          
          // Process response headers from node results (e.g., Set-Cookie from bit-cookie)
          const responseHeaders = this.collectResponseHeaders(execution.nodeStatuses);
          for (const [headerName, headerValue] of Object.entries(responseHeaders)) {
            // Handle multiple Set-Cookie headers by appending
            if (headerName.toLowerCase() === 'set-cookie') {
              const existing = res.getHeader('Set-Cookie');
              if (existing) {
                // Append to existing Set-Cookie headers
                res.setHeader('Set-Cookie', [...(Array.isArray(existing) ? existing : [String(existing)]), headerValue]);
              } else {
                res.setHeader('Set-Cookie', headerValue);
              }
            } else {
              res.setHeader(headerName, headerValue);
            }
          }
          
          if (isDebugMode) {
            // Return full execution details including results and nodeStatuses
            // Return 500 if execution failed
            if (execution.status === 'failed') {
              res.status(500).json(execution);
            } else {
              res.json(execution);
            }
          } else {
            // Build nodeResults from nodeStatuses - only include nodes in output list
            const nodeResults: NodeResult[] = execution.nodeStatuses
              .filter(ns => {
                // Only include completed nodes that are in the output list (or all if no output defined)
                if (ns.status !== 'completed') return false;
                if (outputNodeIds.size === 0) return true;
                return outputNodeIds.has(ns.nodeId);
              })
              .map(ns => {
                const node = loadedWorkflow.workflow.nodes.find(n => n.id === ns.nodeId);
                return {
                  executionId: execution.id,
                  workflowId: execution.workflowId,
                  nodeId: ns.nodeId,
                  nodeName: node?.data?.label || ns.nodeId,
                  status: 'completed' as const,
                  ...(ns.result !== undefined && { output: ns.result }),
                  ...(ns.duration !== undefined && { duration: ns.duration }),
                };
              });

            // Return consistent ExecutionResponse DTO - suppress error details in non-debug mode
            const response: ExecutionResponse = {
              executionId: execution.id,
              workflowId: execution.workflowId,
              status: execution.status as 'completed' | 'failed' | 'cancelled',
              output: execution.output,
              startTime: execution.startTime.toISOString(),
              endTime: execution.endTime?.toISOString() || new Date().toISOString(),
              nodeResults,
            };
            // Return 500 if execution failed
            if (execution.status === 'failed') {
              res.status(500).json(response);
            } else {
              res.json(response);
            }
          }
        }
      } catch (error: any) {
        console.error('Execution error:', error);
        // In non-debug mode, return generic error message
        const isDebugMode = process.env.HABITS_DEBUG === 'true';
        if (isDebugMode) {
          res.status(500).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Workflow execution failed' });
        }
      }
    });

    // Get execution status
    this.app.get('/misc/execution/:id', (req: Request, res: Response) => {
      const execution = this.executor.getExecution(req.params.id);
      if (!execution) {
        return res.status(404).json({ error: 'Execution not found' });
      }
      res.json(execution);
    });

    // List all executions
    this.app.get('/misc/executions', (req: Request, res: Response) => {
      const executions = this.executor.listExecutions();
      res.json(executions);
    });

    // Cancel execution
    this.app.delete('/misc/execution/:id', (req: Request, res: Response) => {
      const success = this.executor.cancelExecution(req.params.id);
      if (success) {
        res.json({ message: 'Execution cancelled' });
      } else {
        res.status(404).json({ error: 'Execution not found or not running' });
      }
    });

    // ========================================================================
    // Frontend Static Files (at / if configured)
    // ========================================================================
    
    if (config?.server?.frontend) {
      // Resolve frontend path relative to config directory
      const frontendPath = path.isAbsolute(config.server.frontend)
        ? config.server.frontend
        : path.resolve(this.configDir || process.cwd(), config.server.frontend);

      if (fs.existsSync(frontendPath)) {
        console.log(`🌐 Serving frontend from: ${frontendPath}`);
        
        // Serve static files
        this.app.use(express.static(frontendPath));
        
        // For SPA: serve index.html for any unmatched routes (except /api, /misc, /webhook, /habits)
        this.app.get('{*splat}', (req: Request, res: Response, next) => {
          // Skip if it's an API, misc, webhook, or habits UI route (let later middleware handle)
          if (req.path.startsWith('/api') || req.path.startsWith('/misc') || req.path.startsWith('/webhook') || req.path === '/health' || req.path.startsWith('/habits')) {
            return next();
          }
          
          const indexPath = path.join(frontendPath, 'index.html');
          if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
          } else {
            console.log(`⚠️  Frontend index.html not found at: ${indexPath}`);
            res.status(404).send('Frontend index.html not found');
          }
        });
      } else {
        console.warn(`⚠️  Frontend path not found: ${frontendPath}`);
        // Fall back to simple text response
        this.app.get('/', (req: Request, res: Response) => {
          res.send('Habits Cortex - Frontend path configured but not found');
        });
      }
    } else {
      // No frontend configured, serve simple text at /
      this.app.get('/', (req: Request, res: Response) => {
        const workflows = this.executor.getAllWorkflows();
        res.send(`Habits Cortex\n\nLoaded workflows: ${workflows.length}\n\nAPI: /api/*\nWebhooks: /webhook/*\nHealth: /health`);
      });
    }
  }

  /**
   * Register a webhook and wait for it to be triggered (for internal use by WorkflowExecutor)
   */
  waitForWebhook(nodeId: string, timeout: number = 300000, workflowId?: string): Promise<any> {
    const webhookKey = workflowId ? `${workflowId}:${nodeId}` : nodeId;
    
    return new Promise((resolve, reject) => {
      console.log(`🔔 Registering webhook listener for: ${webhookKey}`);
      
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

  async start(port: number = 3000, host: string = '0.0.0.0'): Promise<void> {
    // Setup routes after config is loaded
    this.setupRoutes();
    
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, host, () => {
          const config = this.executor.getConfig();
          console.log(`🚀 Workflow Executor Server running on http://${host}:${port}`);
          console.log(`📋 Available endpoints:`);
          console.log(`   GET  /misc/workflows - List all loaded workflows`);
          console.log(`   GET  /misc/workflow/:id - Get workflow details`);
          console.log(`   GET|POST /api/:id - Execute a workflow (GET: query params, POST: body)`);
          console.log(`        (supports streaming via ?stream=true or Accept: application/x-ndjson)`);
          console.log(`   GET  /misc/execution/:id - Get execution status`);
          console.log(`   GET  /misc/executions - List all executions`);
          console.log(`   DELETE /misc/execution/:id - Cancel execution`);
          console.log(`   GET  /health - Health check`);
          console.log(`   ALL  /webhook/:workflowId/:nodeId - Webhook endpoint`);
          
          if (this.openapiEnabled) {
            console.log(`   GET  /api/docs - OpenAPI/Swagger documentation`);
          }
          
          if (this.manageModule) {
            console.log(`   GET  /manage - Management dashboard & execution monitoring`);
          }
          
          if (config?.server?.frontend) {
            console.log(`   GET  / - Frontend (static files)`);
          } else {
            console.log(`   GET  / - Server info`);
          }
          
          const workflows = this.executor.getAllWorkflows();
          if (workflows.length > 0) {
            console.log(`\n📦 Loaded workflows:`);
            for (const w of workflows) {
              console.log(`   - ${w.reference.id}: ${w.workflow.name}`);
            }
          }
          
          resolve();
        });
        
        // Handle server errors (e.g., EADDRINUSE)
        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.error(`\n❌ Port ${port} is already in use!`);
            console.error(`   Please stop the process using port ${port} or use a different port.`);
            console.error(`   Try: lsof -ti:${port} | xargs kill -9`);
            reject(new Error(`Port ${port} is already in use`));
          } else {
            console.error(`\n❌ Server error:`, error.message);
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    // Cancel all pending webhooks
    for (const [webhookKey, pending] of this.pendingWebhooks) {
      pending.reject(new Error('Server shutting down'));
    }
    this.pendingWebhooks.clear();

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 Workflow Executor Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// ============================================================================
// Helper: Load config from file path for CLI use
// ============================================================================

/**
 * Load workflow configuration from a file path (YAML or JSON).
 * Returns the parsed config, loaded workflows, and environment variables.
 */
async function loadConfigFromFile(configPath: string): Promise<{
  config: WorkflowConfig;
  workflows: Map<string, Workflow>;
  env?: Record<string, string>;
  configDir: string;
}> {
  const absolutePath = path.resolve(configPath);
  const configDir = path.dirname(absolutePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Config file not found: ${absolutePath}`);
  }

  // Parse .env file if it exists
  let env: Record<string, string> | undefined;
  const envPath = path.join(configDir, '.env');
  if (fs.existsSync(envPath)) {
    console.log(`\n🔐 Loading environment variables from: ${envPath}`);
    const envContent = fs.readFileSync(envPath, 'utf8');
    env = {};
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex).trim();
          let value = trimmed.slice(eqIndex + 1).trim();
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          env[key] = value;
        }
      }
    }
  }

  // Parse config file
  const fileContent = fs.readFileSync(absolutePath, 'utf8');
  const config = yaml.parse(fileContent) as WorkflowConfig;

  // Load workflow files
  const workflows = new Map<string, Workflow>();
  for (const workflowRef of config.workflows) {
    if (workflowRef.enabled === false) continue;

    const workflowPath = path.isAbsolute(workflowRef.path)
      ? workflowRef.path
      : path.resolve(configDir, workflowRef.path);

    if (!fs.existsSync(workflowPath)) {
      console.error(`   ❌ Workflow file not found: ${workflowPath}`);
      continue;
    }

    try {
      const workflowContent = fs.readFileSync(workflowPath, 'utf8');
      const workflow = yaml.parse(workflowContent) as Workflow;
      const workflowId = workflowRef.id || workflow.id || workflowRef.path;
      workflows.set(workflowId, workflow);
    } catch (error: any) {
      console.error(`   ❌ Failed to parse workflow file ${workflowPath}: ${error.message}`);
    }
  }

  return { config, workflows, env, configDir };
}

// CLI Interface
async function runCLI() {
  const argv = await yargs(hideBin(process.argv))
    .command('server', 'Start the workflow execution server', {
      port: {
        alias: 'p',
        describe: 'Server port (priority: args > .env > config.json > 3000)',
        type: 'number'
      },
      host: {
        alias: 'h',
        describe: 'Server host',
        type: 'string'
      },
      config: {
        alias: 'c',
        describe: 'Path to config.json file (default: looks for config.json in current directory)',
        type: 'string'
      }
    })
    .command('execute [workflow]', 'Execute a workflow from file or config', {
      workflow: {
        describe: 'Path to workflow JSON file (optional if using --config)',
        type: 'string'
      },
      config: {
        alias: 'c',
        describe: 'Path to config.json file',
        type: 'string'
      },
      id: {
        describe: 'Workflow ID to execute (when using --config)',
        type: 'string'
      },
      all: {
        describe: 'Execute all workflows from config',
        type: 'boolean',
        default: false
      },
      input: {
        alias: 'i',
        describe: 'Input data as JSON string (e.g., \'{"prompt": "..."}\') or path to JSON file',
        type: 'string'
      }
    })
    .command('convert', 'Convert a workflow from n8n, Activepieces, or Script format to Habits format', {
      input: {
        alias: 'i',
        describe: 'Path to input workflow JSON file',
        type: 'string',
        demandOption: true
      },
      output: {
        alias: 'o',
        describe: 'Path to output Habits workflow JSON file (defaults to stdout)',
        type: 'string'
      },
      env: {
        alias: 'e',
        describe: 'Also generate a .env file for extracted connections/credentials',
        type: 'boolean',
        default: false
      },
      pretty: {
        alias: 'p',
        describe: 'Pretty print the output JSON',
        type: 'boolean',
        default: true
      }
    })
    .demandCommand(1, 'You need to specify a command')
    .help()
    .argv;

  const command = argv._[0] as string;

  if (command === 'server') {
    const server = new WorkflowExecutorServer();
    
    // Try to load config.json
    const configPath = (argv.config as string) || path.resolve(process.cwd(), 'config.json');
    let configServerPort: number | undefined;
    let configServerHost: string | undefined;
    
    if (fs.existsSync(configPath)) {
      try {
        await server.loadConfig(configPath);
        const config = server['executor'].getConfig();
        configServerPort = config?.server?.port;
        configServerHost = config?.server?.host;
      } catch (error: any) {
        console.error(`⚠️  Failed to load config: ${error.message}`);
      }
    } else if (argv.config) {
      console.error(`❌ Config file not found: ${configPath}`);
      process.exit(1);
    } else {
      console.log('ℹ️  No config.json found, server will accept workflow submissions via API');
    }
    
    // Port priority: 1. args, 2. .env, 3. config.json, 4. default 3000
    let port: number;
    let portSource: string;
    
    if (argv.port !== undefined) {
      port = argv.port as number;
      portSource = 'command line argument';
    } else if (configServerPort !== undefined) {
      port = configServerPort;
      portSource = 'config.json';
    } else if (process.env.PORT) {
      port = parseInt(process.env.PORT, 10);
      portSource = 'environment variable (PORT)';
    } else {
      port = 3000;
      portSource = 'default';
    }
    
    console.log(`📌 Port ${port} loaded from: ${portSource}`);
    
    // Host priority: 1. args, 2. .env, 3. config.json, 4. default 0.0.0.0
    const host = (argv.host as string | undefined) 
      ?? process.env.HOST 
      ?? configServerHost 
      ?? '0.0.0.0';
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      // Kill the process if it hasn't exited after 3000ms (watchdog)
      setTimeout(() => {
        console.error('⏰ Server did not exit after 3000ms, force killing process.');
        process.exit(1);
      }, 3000);
      await server.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      // Kill the process if it hasn't exited after 3000ms (watchdog)
      setTimeout(() => {
        console.error('⏰ Server did not exit after 3000ms, force killing process.');
        process.exit(1);
      }, 3000);
      await server.stop();
      process.exit(0);
    });

    await server.start(port, host);

  } else if (command === 'execute') {
    const executor = new WorkflowExecutor();
    const configPath = argv.config as string;
    const workflowPath = argv.workflow as string;
    const workflowId = argv.id as string;
    const executeAll = argv.all as boolean;
    const inputArg = argv.input as string;
    
    // Parse input data if provided
    let inputData: Record<string, any> = {};
    if (inputArg) {
      try {
        // Check if it's a file path
        if (fs.existsSync(inputArg)) {
          const fileContent = fs.readFileSync(inputArg, 'utf8');
          inputData = JSON.parse(fileContent);
          console.log(`📥 Loaded input from file: ${inputArg}`);
        } else {
          // Parse as JSON string
          inputData = JSON.parse(inputArg);
          console.log(`📥 Using inline JSON input`);
        }
      } catch (error: any) {
        console.error(`❌ Failed to parse input: ${error.message}`);
        console.error(`   Input should be valid JSON string or path to JSON file`);
        process.exit(1);
      }
    }
    
    // Build habits context similar to server mode
    const habitsContext = {
      habits: {
        input: inputData,
        headers: {},
        cookies: {},
      }
    };
    
    // If config is provided, load it
    if (configPath) {
      if (!fs.existsSync(configPath)) {
        console.error(`❌ Config file not found: ${configPath}`);
        process.exit(1);
      }
      
      try {
        // Load config from file and initialize executor
        const { config, workflows, env } = await loadConfigFromFile(configPath);
        await executor.initFromData({ config, workflows, env });
        
        if (executeAll) {
          // Execute all workflows from config
          const workflows = executor.getAllWorkflows();
          console.log(`\n🚀 Executing ${workflows.length} workflow(s)...\n`);
          
          let failedCount = 0;
          for (const loadedWorkflow of workflows) {
            if (loadedWorkflow.reference.enabled === false) {
              console.log(`⏭️  Skipping disabled workflow: ${loadedWorkflow.reference.id}`);
              continue;
            }
            
            const execution = await executor.executeWorkflow(loadedWorkflow.workflow, {
              webhookTimeout: loadedWorkflow.reference.webhookTimeout,
              initialContext: habitsContext
            });
            
            if (execution.status === 'failed') {
              failedCount++;
            }
          }
          
          if (failedCount > 0) {
            console.error(`\n❌ ${failedCount} workflow(s) failed`);
            process.exit(1);
          }
          
        } else if (workflowId) {
          // Execute specific workflow by ID
          const loadedWorkflow = executor.getWorkflow(workflowId);
          if (!loadedWorkflow) {
            console.error(`❌ Workflow not found: ${workflowId}`);
            console.log('Available workflows:', executor.getAllWorkflows().map(w => w.reference.id).join(', '));
            process.exit(1);
          }
          
          const execution = await executor.executeWorkflow(loadedWorkflow.workflow, {
            webhookTimeout: loadedWorkflow.reference.webhookTimeout,
            initialContext: habitsContext
          });
          
          console.log('\n📊 Execution Summary:');
          console.log(`Workflow: ${loadedWorkflow.workflow.name} (${workflowId})`);
          console.log(`Status: ${execution.status}`);
          console.log(`Duration: ${execution.endTime ? 
            (execution.endTime.getTime() - execution.startTime.getTime()) : 'N/A'}ms`);
          console.log(`Steps: ${execution.results.length}`);
          
          if (execution.output !== undefined) {
            console.log(`\n📤 Workflow Output:`);
            console.log(JSON.stringify(execution.output, null, 2));
          }
          
          if (execution.status === 'failed') {
            process.exit(1);
          }
        } else {
          console.error('❌ When using --config, you must specify either --id <workflowId> or --all');
          process.exit(1);
        }
        
      } catch (error: any) {
        console.error(`❌ Execution failed: ${error.message}`);
        process.exit(1);
      }
      
    } else if (workflowPath) {
      // Legacy: Execute from workflow file
      if (!fs.existsSync(workflowPath)) {
        console.error(`❌ Workflow file not found: ${workflowPath}`);
        process.exit(1);
      }

      try {
        const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
        const execution = await executor.executeWorkflow(workflowData, {
          initialContext: habitsContext
        });
        
        console.log('\n📊 Execution Summary:');
        console.log(`Status: ${execution.status}`);
        console.log(`Duration: ${execution.endTime ? 
          (execution.endTime.getTime() - execution.startTime.getTime()) : 'N/A'}ms`);
        console.log(`Steps: ${execution.results.length}`);
        
        if (execution.status === 'failed') {
          process.exit(1);
        }
        
      } catch (error: any) {
        console.error(`❌ Execution failed: ${error.message}`);
        process.exit(1);
      }
    } else {
      console.error('❌ You must specify either a workflow file or --config with --id or --all');
      process.exit(1);
    }
  } else if (command === 'convert') {
    // Convert workflow from n8n/Activepieces/Script to Habits format
    const inputPath = argv.input as string;
    const outputPath = argv.output as string | undefined;
    const generateEnv = argv.env as boolean;
    const prettyPrint = argv.pretty as boolean;
    
    // Validate input file exists
    if (!fs.existsSync(inputPath)) {
      console.error(`❌ Input file not found: ${inputPath}`);
      process.exit(1);
    }
    
    try {
      // Read the input workflow (strip BOM if present)
      let inputContent = fs.readFileSync(inputPath, 'utf8');
      // Remove BOM if present
      if (inputContent.charCodeAt(0) === 0xFEFF) {
        inputContent = inputContent.slice(1);
      }
      const inputWorkflow = JSON.parse(inputContent);
      
      // Detect workflow type
      const workflowType = detectWorkflowType(inputWorkflow);
      
      if (workflowType === 'unknown') {
        console.error('❌ Unknown workflow format. Supported formats: n8n, Activepieces, Script, Habits');
        process.exit(1);
      }
      
      if (workflowType === 'habits') {
        console.log('ℹ️  Input is already a Habits workflow, no conversion needed.');
        if (outputPath) {
          fs.writeFileSync(outputPath, inputContent);
          console.log(`📄 Copied to: ${outputPath}`);
        } else {
        }
        process.exit(0);
      }
      
      console.log(`🔍 Detected workflow type: ${getWorkflowTypeName(workflowType)}`);
      
      // Convert the workflow
      const { workflow, connections } = convertWorkflowWithConnections(inputWorkflow);
      
      // Generate output JSON
      const outputJson = prettyPrint 
        ? JSON.stringify(workflow, null, 2)
        : JSON.stringify(workflow);
      
      // Output the converted workflow
      if (outputPath) {
        fs.writeFileSync(outputPath, outputJson);
        console.log(`✅ Converted workflow saved to: ${outputPath}`);
        console.log(`   Workflow name: ${workflow.name}`);
        console.log(`   Nodes: ${workflow.nodes.length}`);
        console.log(`   Edges: ${workflow.edges.length}`);
      } else {
      }
      
      // Generate .env file if requested and there are connections
      if (generateEnv && connections.length > 0) {
        const envContent = generateEnvContent(workflow.name, connections);
        const envPath = outputPath 
          ? outputPath.replace(/\.json$/, '.env')
          : path.join(process.cwd(), `${workflow.name.replace(/[^a-zA-Z0-9]/g, '_')}.env`);
        
        fs.writeFileSync(envPath, envContent);
        console.log(`🔐 Environment file saved to: ${envPath}`);
        console.log(`   Extracted ${connections.length} connection reference(s)`);
      } else if (connections.length > 0 && !generateEnv) {
        console.log(`ℹ️  Found ${connections.length} connection reference(s). Use --env to generate a .env template file.`);
      }
      
    } catch (error: any) {
      console.error(`❌ Conversion failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Export startServer for programmatic use and CLI
export async function startServer(configPath: string, portOverride?: number): Promise<WorkflowExecutorServer> {
  const server = new WorkflowExecutorServer();
  
  await server.loadConfig(configPath);
  const config = server['executor'].getConfig();
  
  // Port priority: 1. override arg, 2. config.json, 3. .env, 4. default 3000
  let port: number;
  if (portOverride !== undefined) {
    port = portOverride;
  } else if (config?.server?.port !== undefined) {
    port = config.server.port;
  } else if (process.env.PORT) {
    port = parseInt(process.env.PORT, 10);
  } else {
    port = 3000;
  }
  
  const host = config?.server?.host ?? process.env.HOST ?? '0.0.0.0';
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  await server.start(port, host);
  return server;
}

// Export the server class and CLI
export { WorkflowExecutorServer, runCLI };
