#!/usr/bin/env node

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import * as yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as fs from '@ha-bits/bindings/fs';
import * as nativeFs from 'fs';  // Native fs for binary file operations
import * as path from '@ha-bits/bindings/path';
import * as os from 'os';
import * as yaml from 'yaml';
import JSZip from 'jszip';
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
  getWorkflowTypeName,
} from '@ha-bits/core';
import { WorkflowExecutor, IWebhookHandler } from '@ha-bits/cortex-core';
import { discoverOAuthRequirements, printOAuthRequirements, OAuthRequirement } from '@ha-bits/cortex-core';
import { WebhookTriggerServer } from './WebhookTriggerServer';
import { WebhookRegistry, webhookRegistry } from './WebhookRegistry';
import { OAuthCallbackServer, initOAuthCallbackServer } from './OAuthCallbackServer';
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
  private oauthCallbackServer: OAuthCallbackServer | null = null;
  
  /** Webhook registry for vendor-based webhook routing */
  public readonly webhookRegistry: WebhookRegistry = webhookRegistry;

  constructor() {
    this.app = express();
    this.executor = new WorkflowExecutor();
    this.setupMiddleware();
  }

  /**
   * Load workflows from config file (YAML, JSON, or .habit)
   * Parses config, loads workflow files, and initializes the executor
   */
  async loadConfig(configPath: string): Promise<void> {
    const absolutePath = path.resolve(configPath);
    this.configPath = configPath;
    this.configDir = path.dirname(absolutePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Config file not found: ${absolutePath}`);
    }

    // Check if it's a .habit file
    if (configPath.endsWith('.habit')) {
      console.log('\n📦 Loading from .habit file...');
      const habitData = await loadFromHabitFile(configPath);
      // Set configDir to the extracted temp directory so frontend path resolves correctly
      this.configDir = habitData.configDir;
      await this.executor.initFromData({ 
        config: habitData.config, 
        workflows: habitData.workflows, 
        env: habitData.env 
      });
      await this.registerWebhookTriggers();
      return;
    }

    // Parse .env file if it exists
    let envVars: Record<string, string> | undefined;
    const envPath = path.join(this.configDir, '.env');
    if (fs.existsSync(envPath)) {
      console.log(`\n🔐 Loading environment variables from: ${envPath}`);
      // Parse .env file manually to get as Record
      const envContent = fs.readFileSync(envPath, 'utf8');
      envVars = parseEnvContent(envContent);
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
    
    // Register webhook triggers from loaded workflows
    await this.registerWebhookTriggers();
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
    
    // Register webhook triggers from loaded workflows
    await this.registerWebhookTriggers();
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
   * Handle vendor-based webhook.
   * Routes webhooks to all registered listeners for the module, filtering by each trigger's filter function.
   * Starts new workflow executions for matching triggers.
   */
  private async handleVendorWebhook(
    req: Request, 
    res: Response, 
    moduleId: string, 
    webhookName: string | undefined
  ): Promise<void> {
    const webhookPath = webhookName ? `/webhook/v/${moduleId}/${webhookName}` : `/webhook/v/${moduleId}`;
    console.log(`📥 Vendor webhook received: ${webhookPath}`);
    console.log(`   Method: ${req.method}`);
    console.log(`   Body: ${JSON.stringify(req.body).substring(0, 200)}...`);

    // Build filter payload
    const filterPayload = {
      body: req.body,
      headers: req.headers as Record<string, string>,
      query: req.query as Record<string, string>,
      method: req.method,
    };

    // Dispatch to all matching listeners
    const results = await this.webhookRegistry.dispatch(moduleId, webhookName, filterPayload);

    if (results.length === 0) {
      console.warn(`⚠️ No listeners registered for: ${webhookPath}`);
      res.status(404).json({
        success: false,
        message: `No listeners registered for module: ${moduleId}${webhookName ? ' / ' + webhookName : ''}`,
        registeredModules: this.webhookRegistry.getModuleIds(),
      });
      return;
    }

    // Count matches
    const matchedResults = results.filter(r => r.matched);
    console.log(`🔌 ${matchedResults.length}/${results.length} listener(s) matched for ${webhookPath}`);

    // Start workflow executions for matched listeners
    const executions: { workflowId: string; nodeId: string; status: string; error?: string }[] = [];
    
    for (const result of matchedResults) {
      const { listener } = result;
      console.log(`🚀 Starting workflow ${listener.workflowId} for trigger ${listener.triggerName}`);
      
      try {
        // Get the workflow
        const loadedWorkflow = this.executor.getWorkflow(listener.workflowId);
        if (!loadedWorkflow) {
          console.error(`   ❌ Workflow not found: ${listener.workflowId}`);
          executions.push({
            workflowId: listener.workflowId,
            nodeId: listener.nodeId,
            status: 'error',
            error: 'Workflow not found'
          });
          continue;
        }

        // Execute the workflow with the webhook payload as initial context
        const execution = await this.executor.executeWorkflow(loadedWorkflow.workflow, {
          webhookHandler: this.getWebhookHandler(),
          initialContext: {
            webhookPayload: filterPayload,
            triggerPayload: req.body,
            triggerHeaders: req.headers,
            triggerQuery: req.query,
            triggerMethod: req.method,
          },
          // Skip the trigger node itself since we're providing the payload directly
          skipTriggerWait: true,
          triggerNodeId: listener.nodeId,
        });

        console.log(`   ✅ Workflow ${listener.workflowId} started: ${execution.id}`);
        executions.push({
          workflowId: listener.workflowId,
          nodeId: listener.nodeId,
          status: execution.status,
        });
      } catch (error) {
        console.error(`   ❌ Error starting workflow ${listener.workflowId}:`, error);
        executions.push({
          workflowId: listener.workflowId,
          nodeId: listener.nodeId,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    res.json({
      success: true,
      message: `Webhook processed for ${moduleId}`,
      moduleId,
      webhookName: webhookName || 'default',
      listenersEvaluated: results.length,
      listenersMatched: matchedResults.length,
      executionsStarted: executions.filter(e => e.status !== 'error').length,
      executions,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Register webhook triggers from all loaded workflows.
   * Scans workflows for webhook trigger nodes and registers them in the webhook registry.
   */
  private async registerWebhookTriggers(): Promise<void> {
    const workflows = this.executor.getAllWorkflows();
    console.log(`\n🔌 Scanning ${workflows.length} workflow(s) for webhook triggers...`);
    
    let registeredCount = 0;
    
    for (const { reference, workflow } of workflows) {
      if (reference.enabled === false) continue;
      
      const workflowId = reference.id || workflow.id;
      
      for (const node of workflow.nodes || []) {
        // Check if this is a webhook trigger node (bits framework)
        const nodeData = node.data as any; // Use any to access optional trigger properties
        const isWebhookTrigger = 
          (nodeData?.isTrigger === true || node.type === 'trigger') &&
          nodeData?.framework === 'bits' &&
          nodeData?.module;
        
        if (!isWebhookTrigger) continue;
        
        const moduleName = nodeData.module;
        const triggerName = nodeData.operation || 'default';
        const webhookName = nodeData?.params?.webhookName;
        
        try {
          // Load the bit module to get the id and filter function
          const { pieceFromModule } = await import('@ha-bits/cortex-core');
          
          // Try to load the module
          let bitPiece: any = null;
          try {
            const moduleDefinition = { 
              source: (nodeData.source || 'npm') as 'npm' | 'github', 
              module: moduleName,
              framework: 'bits',
              repository: moduleName, // npm package name
            };
            bitPiece = await pieceFromModule(moduleDefinition);
          } catch (loadError) {
            console.warn(`   ⚠️ Could not load module ${moduleName}: ${loadError}`);
            continue;
          }
          
          if (!bitPiece || !bitPiece.id) {
            console.warn(`   ⚠️ Module ${moduleName} has no 'id' field - skipping webhook registration`);
            continue;
          }
          
          // Get the trigger definition
          const triggers = typeof bitPiece.triggers === 'function' ? bitPiece.triggers() : bitPiece.triggers;
          const trigger = triggers?.[triggerName];
          
          if (!trigger) {
            console.warn(`   ⚠️ Trigger ${triggerName} not found in module ${moduleName}`);
            continue;
          }
          
          // Check if it's a webhook trigger type
          const triggerType = trigger.type?.toUpperCase?.() || trigger.type;
          if (triggerType !== 'WEBHOOK' && triggerType !== 'APP_WEBHOOK') {
            continue; // Not a webhook trigger
          }
          
          // Register the webhook listener
          this.webhookRegistry.register({
            workflowId,
            nodeId: node.id,
            moduleId: bitPiece.id,
            triggerName,
            webhookName,
            filter: trigger.filter,
            run: trigger.run,
            npmModule: moduleName,
          });
          
          registeredCount++;
          const webhookPath = webhookName 
            ? `/webhook/v/${bitPiece.id}/${webhookName}` 
            : `/webhook/v/${bitPiece.id}`;
          console.log(`   ✅ Registered: ${workflowId}/${node.id} -> ${webhookPath} (${triggerName})`);
        } catch (error) {
          console.error(`   ❌ Error registering webhook for ${workflowId}/${node.id}:`, error);
        }
      }
    }
    
    console.log(`🔌 Registered ${registeredCount} webhook trigger(s)\n`);
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
   * Extract OAuth tokens from cookies (for multi-user server mode).
   * Cookies are named like `oauth_bit-google-drive` and contain JSON-encoded token objects.
   * @param cookies - Parsed cookies from request
   * @returns Map of bitId to OAuth2TokenSet
   */
  private extractOAuthTokensFromCookies(cookies: Record<string, string>): Record<string, { accessToken: string; refreshToken?: string; tokenType: string; expiresAt?: number }> {
    const tokens: Record<string, { accessToken: string; refreshToken?: string; tokenType: string; expiresAt?: number }> = {};
    
    for (const [name, value] of Object.entries(cookies)) {
      // Look for cookies named oauth_<bitId>
      if (name.startsWith('oauth_')) {
        const bitId = name.slice(6); // Remove 'oauth_' prefix
        try {
          const tokenData = JSON.parse(value);
          if (tokenData && tokenData.accessToken) {
            tokens[bitId] = {
              accessToken: tokenData.accessToken,
              refreshToken: tokenData.refreshToken,
              tokenType: tokenData.tokenType || 'Bearer',
              expiresAt: tokenData.expiresAt,
            };
          }
        } catch {
          // Invalid JSON in cookie, skip
        }
      }
    }
    
    return tokens;
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
      // Legacy pending webhooks (workflow-specific)
      const legacyWebhooks = Array.from(this.pendingWebhooks.keys()).map(id => {
        const [workflowId, nodeId] = id.includes(':') ? id.split(':') : [undefined, id];
        return {
          type: 'legacy',
          workflowId,
          nodeId,
          path: workflowId ? `/webhook/${workflowId}/${nodeId}` : `/webhook/${nodeId}`,
          status: 'waiting'
        };
      });
      
      // Vendor-based webhooks from registry
      const vendorWebhooks = this.webhookRegistry.getSummary().map(entry => ({
        type: 'vendor',
        moduleId: entry.moduleId,
        webhookName: entry.webhookName,
        path: entry.webhookName === 'default' 
          ? `/webhook/v/${entry.moduleId}` 
          : `/webhook/v/${entry.moduleId}/${entry.webhookName}`,
        listenerCount: entry.count,
        listeners: entry.listeners
      }));
      
      res.json({ 
        webhooks: legacyWebhooks,
        vendorWebhooks,
        moduleIds: this.webhookRegistry.getModuleIds()
      });
    });

    // ========================================================================
    // Vendor-Based Webhook Routes (under /webhook/v/:moduleId)
    // These route webhooks based on the bit module ID (e.g., 'gohighlevel')
    // ========================================================================

    // Vendor webhook - default (no webhook name)
    this.app.all('/webhook/v/:moduleId', async (req: Request, res: Response) => {
      await this.handleVendorWebhook(req, res, req.params.moduleId, undefined);
    });

    // Vendor webhook - with webhook name (for multi-account support)
    this.app.all('/webhook/v/:moduleId/:webhookName', async (req: Request, res: Response) => {
      await this.handleVendorWebhook(req, res, req.params.moduleId, req.params.webhookName);
    });

    // Dynamic webhook endpoint handler with workflow ID (legacy - backwards compatible)
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
        
        // Extract OAuth tokens from cookies for multi-user mode
        const oauthTokensFromCookies = this.extractOAuthTokensFromCookies(parsedCookies);
        
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
            oauthTokens: Object.keys(oauthTokensFromCookies).length > 0 ? oauthTokensFromCookies : undefined,
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
            oauthTokens: Object.keys(oauthTokensFromCookies).length > 0 ? oauthTokensFromCookies : undefined,
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

  /**
   * Discover OAuth2 requirements from loaded workflows and print authorization URLs
   */
  private async discoverAndPrintOAuth(loadedWorkflows: LoadedWorkflow[]): Promise<void> {
    if (!this.oauthCallbackServer) {
      return;
    }

    try {
      // Convert loaded workflows to Map
      const workflows = new Map<string, Workflow>();
      for (const lw of loadedWorkflows) {
        const workflowId = lw.reference.id || lw.workflow.id || 'unknown';
        workflows.set(workflowId, lw.workflow);
      }

      // Discover OAuth requirements
      const requirements = await discoverOAuthRequirements(workflows);
      
      if (requirements.length === 0) {
        return;
      }

      // Register OAuth configs for each requirement (enables /init endpoint)
      for (const req of requirements) {
        this.oauthCallbackServer!.registerOAuthConfig(req.bitId, req.config);
      }

      // Print requirements with authorization URLs (async)
      await printOAuthRequirements(requirements, async (req: OAuthRequirement) => {
        return this.oauthCallbackServer!.initiateFlowAsync(req.bitId, req.config);
      });
    } catch (error) {
      console.error('Failed to discover OAuth requirements:', error);
    }
  }

  async start(port: number = 3000, host: string = '0.0.0.0'): Promise<void> {
    // Initialize OAuth callback server
    // Allow HABITS_SERVER_URL env to override (useful when behind proxy)
    const serverUrl = process.env.HABITS_SERVER_URL || `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;
    this.oauthCallbackServer = initOAuthCallbackServer(serverUrl);
    
    // Mount OAuth routes
    this.app.use('/oauth', this.oauthCallbackServer.createRouter());
    
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
          
          // Resolve immediately - server is ready to accept requests
          resolve();
          
          // Discover and print OAuth requirements asynchronously AFTER server is ready
          // Use setImmediate to ensure this runs after the event loop tick
          setImmediate(() => {
            this.discoverAndPrintOAuth(workflows).catch((error) => {
              console.error('OAuth discovery error:', error);
            });
          });
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
// Helper: Load from .habit file (zip archive)
// ============================================================================

/**
 * Parse environment variables from .env content string
 */
function parseEnvContent(envContent: string): Record<string, string> {
  const env: Record<string, string> = {};
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
  return env;
}

/**
 * Load workflow configuration from a .habit file (zip archive).
 * A .habit file contains:
 * - frontend/ directory (frontend files)
 * - habits/ directory (workflow YAML files)
 * - cortex-bundle.js (bundled executor)
 * - stack.yaml (configuration)
 * - Optionally: .env file (environment variables)
 * 
 * The .habit file is extracted to a temp directory for serving.
 * 
 * @param habitPath - Path to the .habit file
 * @param externalEnvPath - Optional path to an external .env file that overrides internal one
 * @returns Parsed config, workflows, and environment variables
 */
async function loadFromHabitFile(habitPath: string, externalEnvPath?: string): Promise<{
  config: WorkflowConfig;
  workflows: Map<string, Workflow>;
  env?: Record<string, string>;
  configDir: string;
  frontendHtml?: string;
}> {
  const absolutePath = path.resolve(habitPath);
  const originalConfigDir = path.dirname(absolutePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`.habit file not found: ${absolutePath}`);
  }
  
  console.log(`\n📦 Loading .habit file: ${absolutePath}`);
  
  // Read and parse the zip file - use native fs to read as binary buffer
  const zipBuffer = nativeFs.readFileSync(absolutePath);
  const zip = await JSZip.loadAsync(zipBuffer);
  
  // Create a temp directory for extraction
  const habitName = path.basename(habitPath, '.habit');
  const tempDir = path.join(os.tmpdir(), `habits-${habitName}-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  console.log(`   📁 Extracting to: ${tempDir}`);
  
  // Extract all files to the temp directory - use nativeFs for binary file operations
  const extractPromises: Promise<void>[] = [];
  zip.forEach((relativePath, file) => {
    if (!file.dir) {
      const promise = (async () => {
        const content = await file.async('nodebuffer');
        const targetPath = path.join(tempDir, relativePath);
        nativeFs.mkdirSync(path.dirname(targetPath), { recursive: true });
        nativeFs.writeFileSync(targetPath, Buffer.from(content));
      })();
      extractPromises.push(promise);
    }
  });
  await Promise.all(extractPromises);
  console.log(`   ✅ Extracted ${extractPromises.length} file(s)`);
  
  // Use the temp directory as configDir for serving
  const configDir = tempDir;
  
  // Find all YAML workflow files (excluding common non-workflow files)
  const workflowFiles: string[] = [];
  const excludePatterns = ['stack.yaml', 'config.yaml', '.env'];
  
  zip.forEach((relativePath, file) => {
    if (!file.dir && (relativePath.endsWith('.yaml') || relativePath.endsWith('.yml'))) {
      // Skip stack/config files - we'll synthesize the config
      if (!excludePatterns.some(p => relativePath.toLowerCase().includes(p.toLowerCase()))) {
        workflowFiles.push(relativePath);
      }
    }
  });
  
  // Also try to load stack.yaml if it exists for additional config
  let stackConfig: any = null;
  const stackFile = zip.file('stack.yaml') || zip.file('config.yaml');
  if (stackFile) {
    try {
      const stackContent = await stackFile.async('text');
      stackConfig = yaml.parse(stackContent);
      console.log(`   📋 Found stack config in .habit file`);
    } catch (e) {
      // Stack file optional
    }
  }
  
  // Load workflow YAML files
  const workflows = new Map<string, Workflow>();
  for (const workflowPath of workflowFiles) {
    const file = zip.file(workflowPath);
    if (!file) continue;
    
    try {
      const content = await file.async('text');
      const workflow = yaml.parse(content) as Workflow;
      const workflowId = workflow.id || path.basename(workflowPath, path.extname(workflowPath));
      workflows.set(workflowId, workflow);
      console.log(`   ✅ Loaded workflow: ${workflowId}`);
    } catch (error: any) {
      console.error(`   ⚠️  Failed to parse workflow ${workflowPath}: ${error.message}`);
    }
  }
  
  // Load environment variables - first from .habit internal .env
  let env: Record<string, string> = {};
  const internalEnvFile = zip.file('.env');
  if (internalEnvFile) {
    try {
      const envContent = await internalEnvFile.async('text');
      env = parseEnvContent(envContent);
      console.log(`   🔐 Loaded internal .env from .habit file`);
    } catch (e) {
      // .env is optional
    }
  }
  
  // Override with external .env if provided or if one exists beside the .habit file
  const sideEnvPath = externalEnvPath || path.join(originalConfigDir, '.env');
  if (fs.existsSync(sideEnvPath)) {
    console.log(`   🔐 Loading external .env: ${sideEnvPath}`);
    const externalEnvContent = fs.readFileSync(sideEnvPath, 'utf8');
    const externalEnv = parseEnvContent(externalEnvContent);
    // Merge with external taking precedence
    env = { ...env, ...externalEnv };
    console.log(`   🔄 External .env overrides applied (${Object.keys(externalEnv).length} vars)`);
  }
  
  // Load frontend HTML if exists
  // First try to load from the frontend path specified in stack config, then fall back to root
  let frontendHtml: string | undefined;
  const frontendDir = stackConfig?.server?.frontend?.replace(/^\.[\/\\]/, '') || '';
  const indexFilePath = frontendDir ? `${frontendDir}/index.html` : 'index.html';
  const indexFile = zip.file(indexFilePath) || zip.file('index.html');
  if (indexFile) {
    frontendHtml = await indexFile.async('text');
  }
  
  // Load bundle JS if exists
  
  // Synthesize config from workflows found
  const config: WorkflowConfig = stackConfig || {
    name: path.basename(habitPath, '.habit'),
    workflows: Array.from(workflows.keys()).map(id => ({
      id,
      path: `${id}.yaml`,
      enabled: true,
    })),
  };
  
  // If we have a stack config, ensure workflows are properly configured
  if (stackConfig?.workflows) {
    config.workflows = stackConfig.workflows;
  }
  
  console.log(`   📊 Loaded ${workflows.size} workflow(s) from .habit file`);
  
  return { 
    config, 
    workflows, 
    env: Object.keys(env).length > 0 ? env : undefined, 
    configDir,
    frontendHtml,
  };
}

// ============================================================================
// Helper: Load config from file path for CLI use
// ============================================================================

/**
 * Load workflow configuration from a file path (YAML, JSON, or .habit).
 * Returns the parsed config, loaded workflows, and environment variables.
 */
async function loadConfigFromFile(configPath: string): Promise<{
  config: WorkflowConfig;
  workflows: Map<string, Workflow>;
  env?: Record<string, string>;
  configDir: string;
}> {
  // Check if it's a .habit file
  if (configPath.endsWith('.habit')) {
    return loadFromHabitFile(configPath);
  }
  
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
    env = parseEnvContent(envContent);
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
  const argv = yargs.default(hideBin(process.argv))
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
        describe: 'Path to config file (.yaml, .json, or .habit)',
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
        describe: 'Path to config file (.yaml, .json, or .habit)',
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
    .command('convert', 'Convert a workflow from Script format to Habits format', {
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
      pretty: {
        alias: 'p',
        describe: 'Pretty print the output JSON',
        type: 'boolean',
        default: true
      }
    })
    .demandCommand(1, 'You need to specify a command')
    .help()
    .parseSync();

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
    // Convert workflow from Script format to Habits format
    const inputPath = argv.input as string;
    const outputPath = argv.output as string | undefined;
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
        console.error('❌ Unknown workflow format. Supported formats: Script, Habits');
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
      const { workflow } = convertWorkflowWithConnections(inputWorkflow);
      
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
