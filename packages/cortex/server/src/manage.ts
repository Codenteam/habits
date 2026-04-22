/**
 * Management & Admin Module for Cortex Server
 * 
 * Provides two sets of endpoints:
 * 
 * 1. Admin Endpoints (/habits-admin) - for multi-habit management:
 *    - Uploading new .habit files at runtime
 *    - Getting status of all loaded habits
 *    - Listing and removing habits
 *    Authentication: HABITS_ADMIN_SECRET (Bearer token)
 * 
 * 2. Manage Endpoints (/manage) - for workflow execution monitoring:
 *    - Monitoring current and past executions
 *    - Cancelling specific executions
 *    - Viewing execution params, step status, and output
 *    Authentication: Optional Basic auth (HABITS_MANAGE_USERNAME/PASSWORD)
 *    Enabled via: HABITS_MANAGE_ENABLED=true
 */

import fs from 'fs';
import path from 'path';
import express, { Request, Response, NextFunction, Router } from 'express';
import {
  WorkflowExecution,
  WorkflowConfig,
  LoadedWorkflow,
  NodeExecutionStatus,
} from '@habits/shared/types';
import { getCortexUiDistPath } from '@ha-bits/core/pathUtils';

interface ManagedHabit {
  stackName: string;
  workflows: Map<string, unknown>;
  status: string;
  frontendPath?: string;
}

interface HabitManager {
  getStatus: () => unknown;
  addHabitFromBuffer: (content: Buffer, filename: string) => Promise<string>;
  getHabit: (stackName: string) => ManagedHabit | undefined;
  getAllHabits: () => ManagedHabit[];
  hasHabit: (stackName: string) => boolean;
  removeHabit: (stackName: string) => boolean;
}
// ============================================================================
// Shared Utilities
// ============================================================================

/**
 * Check if running in development mode
 */
function isDevMode(): boolean {
  return process.env.NODE_ENV !== 'production' && 
         (process.argv[1]?.includes('tsx') || 
          process.argv[1]?.includes('ts-node') ||
          process.env.HABITS_DEV === 'true');
}

/**
 * Get the vite dev server URL for proxying in dev mode
 */
function getViteDevUrl(): string {
  return process.env.HABITS_MANAGE_UI_DEV_URL || 'http://localhost:5174';
}

// ============================================================================
// Admin Module Types
// ============================================================================

export interface AdminConfig {
  /** The HabitManager instance to operate on */
  habitManager: HabitManager;
  /** Callback to mount a newly uploaded habit */
  onHabitUploaded?: (stackName: string) => Promise<void>;
}

export interface UploadResponse {
  success: boolean;
  stackName?: string;
  basePath?: string;
  workflows?: number;
  error?: string;
  message?: string;
}

// ============================================================================
// Admin Module - Multi-Habit Management
// ============================================================================

export class AdminModule {
  private router: Router;
  private habitManager: HabitManager;
  private onHabitUploaded?: (stackName: string) => Promise<void>;

  constructor(config: AdminConfig) {
    this.router = express.Router();
    this.habitManager = config.habitManager;
    this.onHabitUploaded = config.onHabitUploaded;
    this.setupRoutes();
  }

  /**
   * Check if admin module can be enabled (secret is configured)
   */
  static isConfigured(): boolean {
    return !!process.env.HABITS_ADMIN_SECRET;
  }

  /**
   * Get the configured secret
   */
  private getSecret(): string | undefined {
    return process.env.HABITS_ADMIN_SECRET;
  }

  /**
   * Authentication middleware - validates Bearer token against HABITS_ADMIN_SECRET
   */
  private authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const secret = this.getSecret();
    
    // If no secret configured, return 403 with helpful message
    if (!secret) {
      res.status(403).json({
        error: 'Admin endpoints not configured',
        message: 'Set HABITS_ADMIN_SECRET environment variable to enable admin endpoints',
      });
      return;
    }
    
    // Check Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Provide Authorization: Bearer <secret> header',
      });
      return;
    }
    
    // Validate the token
    const providedToken = authHeader.slice(7); // Remove 'Bearer ' prefix
    
    if (providedToken !== secret) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'The provided secret is incorrect',
      });
      return;
    }
    
    next();
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // Apply auth middleware to all routes
    this.router.use(this.authMiddleware.bind(this));
    
    // GET /habits-admin/status - Get status of all habits
    this.router.get('/status', (req: Request, res: Response) => {
      const status = this.habitManager.getStatus();
      res.json(status);
    });
    
    // POST /habits-admin/upload - Upload a new .habit file
    this.router.post('/upload', express.raw({ 
      type: ['application/octet-stream', 'application/zip', 'application/x-zip-compressed'],
      limit: '100mb' 
    }), async (req: Request, res: Response) => {
      try {
        // Get filename from header or query
        const filename = (req.headers['x-filename'] as string) || 
                        (req.query.filename as string) || 
                        `upload-${Date.now()}.habit`;
        
        if (!filename.endsWith('.habit')) {
          res.status(400).json({
            success: false,
            error: 'Invalid file type',
            message: 'Only .habit files are supported. Filename must end with .habit',
          });
          return;
        }
        
        // Check if body is a buffer
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          res.status(400).json({
            success: false,
            error: 'No file content',
            message: 'Send the .habit file as raw binary in the request body',
          });
          return;
        }
        
        // Load the habit
        const stackName = await this.habitManager.addHabitFromBuffer(req.body, filename);
        
        // Notify the server to mount the new habit's routes
        if (this.onHabitUploaded) {
          await this.onHabitUploaded(stackName);
        }
        
        const habit = this.habitManager.getHabit(stackName);
        
        const response: UploadResponse = {
          success: true,
          stackName,
          basePath: `/${stackName}`,
          workflows: habit?.workflows.size || 0,
          message: `Habit '${stackName}' uploaded and mounted successfully`,
        };
        
        res.status(201).json(response);
      } catch (error: any) {
        console.error('Upload error:', error);
        
        const response: UploadResponse = {
          success: false,
          error: error.message,
          message: 'Failed to upload and mount habit',
        };
        
        res.status(500).json(response);
      }
    });
    
    // GET /habits-admin/habits - List all habits (simpler than status)
    this.router.get('/habits', (req: Request, res: Response) => {
      const habits = this.habitManager.getAllHabits();
      res.json({
        count: habits.length,
        habits: habits.map(h => ({
          name: h.stackName,
          basePath: `/${h.stackName}`,
          workflows: h.workflows.size,
          status: h.status,
          hasFrontend: !!h.frontendPath,
        })),
      });
    });
    
    // DELETE /habits-admin/habit/:stackName - Remove a habit (optional, for completeness)
    this.router.delete('/habit/:stackName', (req: Request, res: Response) => {
      const { stackName } = req.params;
      
      if (!this.habitManager.hasHabit(stackName)) {
        res.status(404).json({
          success: false,
          error: 'Habit not found',
          message: `No habit with name '${stackName}' is loaded`,
        });
        return;
      }
      
      const removed = this.habitManager.removeHabit(stackName);
      
      if (removed) {
        res.json({
          success: true,
          message: `Habit '${stackName}' removed. Note: Routes are still mounted until server restart.`,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to remove habit',
        });
      }
    });
  }

  /**
   * Get the Express router
   */
  getRouter(): Router {
    return this.router;
  }
}

/**
 * Setup admin routes on an Express app
 */
export function setupAdminRoutes(
  app: express.Application,
  habitManager: HabitManager,
  onHabitUploaded?: (stackName: string) => Promise<void>
): AdminModule | null {
  // Only setup if secret is configured
  if (!AdminModule.isConfigured()) {
    console.log('ℹ️  Admin endpoints disabled (set HABITS_ADMIN_SECRET to enable)');
    return null;
  }
  
  const adminModule = new AdminModule({
    habitManager,
    onHabitUploaded,
  });
  
  app.use('/habits-admin', adminModule.getRouter());
  console.log('🔐 Admin endpoints enabled at /habits-admin/ (requires Authorization header)');
  
  return adminModule;
}

// ============================================================================
// Manage Module Types
// ============================================================================

export interface ManageConfig {
  enabled?: boolean;
}

export interface ExecutionDetails {
  id: string;
  workflowId: string;
  workflowName?: string;
  status: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  currentNode?: string;
  inputParams?: any;
  nodeCount: number;
  completedNodes: number;
  failedNodes: number;
}

export interface ExecutionFullDetails extends ExecutionDetails {
  nodeStatuses: NodeStatusDetails[];
  results: any[];
  output?: any;
}

export interface NodeStatusDetails {
  nodeId: string;
  nodeName?: string;
  status: string;
  result?: any;
  error?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
}

// Extended execution interface to track input params
export interface TrackedExecution extends WorkflowExecution {
  inputParams?: any;
}

// ============================================================================
// Manage Module - Workflow Execution Monitoring
// ============================================================================

export class ManageModule {
  private router: Router;
  private executionInputs: Map<string, any> = new Map(); // Track input params by execution ID
  private getExecutor: () => {
    listExecutions: () => WorkflowExecution[];
    getExecution: (id: string) => WorkflowExecution | undefined;
    cancelExecution: (id: string) => boolean;
    getWorkflow: (id: string) => LoadedWorkflow | undefined;
    getAllWorkflows: () => LoadedWorkflow[];
    getConfig: () => WorkflowConfig | null;
  };

  constructor(getExecutor: () => {
    listExecutions: () => WorkflowExecution[];
    getExecution: (id: string) => WorkflowExecution | undefined;
    cancelExecution: (id: string) => boolean;
    getWorkflow: (id: string) => LoadedWorkflow | undefined;
    getAllWorkflows: () => LoadedWorkflow[];
    getConfig: () => WorkflowConfig | null;
  }) {
    this.router = express.Router();
    this.getExecutor = getExecutor;
    this.setupRoutes();
  }

  /**
   * Check if management module is enabled (via HABITS_MANAGE_ENABLED env var only)
   */
  static isEnabled(config?: WorkflowConfig | null): boolean {
    // Only check environment variable - config.server.manage is ignored
    return process.env.HABITS_MANAGE_ENABLED === 'true' || process.env.HABITS_MANAGE_ENABLED === '1';
  }

  /**
   * Basic auth middleware
   */
  private authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const username = process.env.HABITS_MANAGE_USERNAME;
    const password = process.env.HABITS_MANAGE_PASSWORD;

    // If no credentials configured, allow access
    if (!username && !password) {
      return next();
    }

    // Check Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Habits Management"');
      res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please provide credentials to access management endpoints'
      });
      return;
    }

    // Decode and verify credentials
    const base64Credentials = authHeader.slice(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
    const [providedUsername, providedPassword] = credentials.split(':');

    if (providedUsername === username && providedPassword === password) {
      return next();
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="Habits Management"');
    res.status(401).json({ 
      error: 'Invalid credentials',
      message: 'The provided username or password is incorrect'
    });
  }

  /**
   * Track execution input params (call this when execution starts)
   */
  trackExecutionInput(executionId: string, inputParams: any): void {
    this.executionInputs.set(executionId, inputParams);
    
    // Cleanup old entries (keep last 1000)
    if (this.executionInputs.size > 1000) {
      const keys = Array.from(this.executionInputs.keys());
      for (let i = 0; i < keys.length - 1000; i++) {
        this.executionInputs.delete(keys[i]);
      }
    }
  }

  /**
   * Get execution input params
   */
  getExecutionInput(executionId: string): any {
    return this.executionInputs.get(executionId);
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // Apply auth middleware to all routes
    this.router.use(this.authMiddleware.bind(this));

    // Serve static UI files or proxy to vite dev server
    const uiPath = getCortexUiDistPath();
    const uiExists = fs.existsSync(uiPath) && fs.existsSync(path.join(uiPath, 'index.html'));
    
    if (uiExists) {
      // Serve built static files
      this.router.use('/', express.static(uiPath));
    }

    // Dashboard UI - serve index.html, proxy to vite dev server, or show fallback
    this.router.get('/ui', async (req: Request, res: Response) => {
      const uiPath = getCortexUiDistPath();
      const indexPath = path.join(uiPath, 'index.html');
      
      if (fs.existsSync(indexPath)) {
        // Serve built UI
        res.sendFile(indexPath);
      } else if (isDevMode()) {
        // In dev mode, redirect to vite dev server
        const viteUrl = getViteDevUrl();
        res.redirect(`${viteUrl}/manage/`);
      } else {
        res.status(503).json({
          error: 'UI not available',
          message: 'The management UI is not bundled.',
        });
      }
    });
    
    // SPA fallback - serve index.html for any non-API routes (for client-side routing)
    this.router.get('{*splat}', (req: Request, res: Response, next: NextFunction) => {
      // Skip API routes
      if (req.path.startsWith('/executions') || 
          req.path.startsWith('/execution') || 
          req.path.startsWith('/workflows')) {
        return next();
      }
      
      const uiPath = getCortexUiDistPath();
      const indexPath = path.join(uiPath, 'index.html');
      
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });

    // Management dashboard info (JSON API)
    this.router.get('/', (req: Request, res: Response) => {
      // Check if browser is requesting HTML
      const acceptsHtml = req.headers.accept?.includes('text/html');
      
      if (acceptsHtml && !req.query.json) {
        // Redirect to UI
        return res.redirect('/manage/ui');
      }
      
      const executor = this.getExecutor();
      const executions = executor.listExecutions();
      const workflows = executor.getAllWorkflows();
      
      const runningCount = executions.filter(e => e.status === 'running').length;
      const completedCount = executions.filter(e => e.status === 'completed').length;
      const failedCount = executions.filter(e => e.status === 'failed').length;
      const cancelledCount = executions.filter(e => e.status === 'cancelled').length;
      
      res.json({
        status: 'Management API active',
        timestamp: new Date().toISOString(),
        devMode: isDevMode(),
        uiAvailable: fs.existsSync(path.join(getCortexUiDistPath(), 'index.html')),
        summary: {
          totalExecutions: executions.length,
          running: runningCount,
          completed: completedCount,
          failed: failedCount,
          cancelled: cancelledCount,
          workflowsLoaded: workflows.length,
        },
        endpoints: {
          'GET /manage': 'This summary (JSON) or redirect to UI (HTML)',
          'GET /manage/ui': 'Dashboard UI',
          'GET /manage/executions': 'List all executions',
          'GET /manage/executions/running': 'List running executions',
          'GET /manage/executions/completed': 'List completed executions',
          'GET /manage/executions/failed': 'List failed executions',
          'GET /manage/execution/:id': 'Get execution details',
          'GET /manage/execution/:id/full': 'Get full execution details with all node data',
          'DELETE /manage/execution/:id': 'Cancel a running execution',
          'GET /manage/workflows': 'List all loaded workflows',
        }
      });
    });

    // List all executions
    this.router.get('/executions', (req: Request, res: Response) => {
      const executor = this.getExecutor();
      const executions = executor.listExecutions();
      const summaries = executions.map(e => this.toExecutionDetails(e));
      
      // Sort by start time descending (most recent first)
      summaries.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      
      res.json({
        count: summaries.length,
        executions: summaries
      });
    });

    // List running executions
    this.router.get('/executions/running', (req: Request, res: Response) => {
      const executor = this.getExecutor();
      const executions = executor.listExecutions().filter(e => e.status === 'running');
      const summaries = executions.map(e => this.toExecutionDetails(e));
      
      res.json({
        count: summaries.length,
        executions: summaries
      });
    });

    // List completed executions
    this.router.get('/executions/completed', (req: Request, res: Response) => {
      const executor = this.getExecutor();
      const executions = executor.listExecutions().filter(e => e.status === 'completed');
      const summaries = executions.map(e => this.toExecutionDetails(e));
      
      summaries.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      
      res.json({
        count: summaries.length,
        executions: summaries
      });
    });

    // List failed executions
    this.router.get('/executions/failed', (req: Request, res: Response) => {
      const executor = this.getExecutor();
      const executions = executor.listExecutions().filter(e => e.status === 'failed');
      const summaries = executions.map(e => this.toExecutionDetails(e));
      
      summaries.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      
      res.json({
        count: summaries.length,
        executions: summaries
      });
    });

    // Get specific execution details
    this.router.get('/execution/:id', (req: Request, res: Response) => {
      const executor = this.getExecutor();
      const execution = executor.getExecution(req.params.id);
      
      if (!execution) {
        return res.status(404).json({ 
          error: 'Execution not found',
          executionId: req.params.id
        });
      }
      
      res.json(this.toExecutionDetails(execution));
    });

    // Get full execution details with all node data
    this.router.get('/execution/:id/full', (req: Request, res: Response) => {
      const executor = this.getExecutor();
      const execution = executor.getExecution(req.params.id);
      
      if (!execution) {
        return res.status(404).json({ 
          error: 'Execution not found',
          executionId: req.params.id
        });
      }
      
      res.json(this.toExecutionFullDetails(execution));
    });

    // Cancel a running execution
    this.router.delete('/execution/:id', (req: Request, res: Response) => {
      const executor = this.getExecutor();
      const execution = executor.getExecution(req.params.id);
      
      if (!execution) {
        return res.status(404).json({ 
          error: 'Execution not found',
          executionId: req.params.id
        });
      }
      
      if (execution.status !== 'running') {
        return res.status(400).json({ 
          error: 'Cannot cancel execution',
          message: `Execution is not running (status: ${execution.status})`,
          executionId: req.params.id
        });
      }
      
      const success = executor.cancelExecution(req.params.id);
      
      if (success) {
        res.json({ 
          success: true,
          message: 'Execution cancelled successfully',
          executionId: req.params.id,
          previousStatus: 'running',
          newStatus: 'cancelled'
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to cancel execution',
          executionId: req.params.id
        });
      }
    });

    // List all loaded workflows
    this.router.get('/workflows', (req: Request, res: Response) => {
      const executor = this.getExecutor();
      const workflows = executor.getAllWorkflows();
      
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
  }

  /**
   * Convert execution to summary details
   */
  private toExecutionDetails(execution: WorkflowExecution): ExecutionDetails {
    const executor = this.getExecutor();
    const workflow = executor.getWorkflow(execution.workflowId);
    
    const completedNodes = execution.nodeStatuses.filter(n => n.status === 'completed').length;
    const failedNodes = execution.nodeStatuses.filter(n => n.status === 'failed').length;
    
    const startTime = execution.startTime instanceof Date 
      ? execution.startTime.toISOString() 
      : execution.startTime;
    
    const endTime = execution.endTime instanceof Date 
      ? execution.endTime.toISOString() 
      : execution.endTime;
    
    let duration: number | undefined;
    if (execution.endTime) {
      const start = execution.startTime instanceof Date ? execution.startTime : new Date(execution.startTime);
      const end = execution.endTime instanceof Date ? execution.endTime : new Date(execution.endTime);
      duration = end.getTime() - start.getTime();
    } else if (execution.status === 'running') {
      const start = execution.startTime instanceof Date ? execution.startTime : new Date(execution.startTime);
      duration = Date.now() - start.getTime();
    }
    
    return {
      id: execution.id,
      workflowId: execution.workflowId,
      workflowName: workflow?.workflow.name,
      status: execution.status,
      startTime,
      endTime,
      duration,
      currentNode: execution.currentNode,
      inputParams: this.executionInputs.get(execution.id),
      nodeCount: execution.nodeStatuses.length,
      completedNodes,
      failedNodes,
    };
  }

  /**
   * Convert execution to full details with all node data
   */
  private toExecutionFullDetails(execution: WorkflowExecution): ExecutionFullDetails {
    const executor = this.getExecutor();
    const workflow = executor.getWorkflow(execution.workflowId);
    const baseDetails = this.toExecutionDetails(execution);
    
    // Build node status details with node names
    const nodeStatuses: NodeStatusDetails[] = execution.nodeStatuses.map(ns => {
      const node = workflow?.workflow.nodes?.find(n => n.id === ns.nodeId);
      
      return {
        nodeId: ns.nodeId,
        nodeName: node?.data?.label || ns.nodeId,
        status: ns.status,
        result: ns.result,
        error: ns.error,
        startTime: ns.startTime ? (ns.startTime instanceof Date ? ns.startTime.toISOString() : String(ns.startTime)) : undefined,
        endTime: ns.endTime ? (ns.endTime instanceof Date ? ns.endTime.toISOString() : String(ns.endTime)) : undefined,
        duration: ns.duration,
      };
    });
    
    return {
      ...baseDetails,
      nodeStatuses,
      results: execution.results,
      output: execution.output,
    };
  }

  /**
   * Get the router for mounting
   */
  getRouter(): Router {
    return this.router;
  }
}

/**
 * Setup management routes on the app
 */
export function setupManageRoutes(
  app: express.Application,
  getExecutor: () => {
    listExecutions: () => WorkflowExecution[];
    getExecution: (id: string) => WorkflowExecution | undefined;
    cancelExecution: (id: string) => boolean;
    getWorkflow: (id: string) => LoadedWorkflow | undefined;
    getAllWorkflows: () => LoadedWorkflow[];
    getConfig: () => WorkflowConfig | null;
  }
): ManageModule | null {
  const config = getExecutor().getConfig();
  
  if (!ManageModule.isEnabled(config)) {
    console.log('ℹ️  Management module disabled (set HABITS_MANAGE_ENABLED=true or config.server.manage.enabled=true to enable)');
    return null;
  }
  
  const manageModule = new ManageModule(getExecutor);
  app.use('/manage', manageModule.getRouter());
  
  const hasAuth = process.env.HABITS_MANAGE_USERNAME && process.env.HABITS_MANAGE_PASSWORD;
  const uiPath = getCortexUiDistPath();
  const uiAvailable = fs.existsSync(path.join(uiPath, 'index.html'));
  const devMode = isDevMode();
  
  console.log(`🔧 Management module enabled at /manage${hasAuth ? ' (authentication required)' : ' (no authentication)'}`);
  if (uiAvailable) {
    console.log(`   📊 UI available at /manage/ui (serving from ${uiPath})`);
  } else if (devMode) {
    console.log(`   📊 UI not built - in dev mode, run UI dev server and access via ${getViteDevUrl()}/manage/`);
  } else {
    console.log(`   ⚠️  UI not available - run 'pnpm --filter @ha-bits/cortex-ui build' to build it`);  
  }
  
  return manageModule;
}
