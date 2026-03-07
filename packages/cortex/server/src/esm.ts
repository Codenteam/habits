/**
 * @ha-bits/cortex ESM Entry Point
 * 
 * This module provides a framework-agnostic API for executing habits (workflows)
 * that works in both browser and Node.js environments.
 * 
 * Usage:
 * ```typescript
 * import { HabitsExecutor } from '@ha-bits/cortex/esm';
 * 
 * const executor = new HabitsExecutor(config, workflows, env);
 * const result = await executor.startWorkflow('my-workflow', { input: 'data' });
 * ```
 * 
 * Note: Webhook triggers are NOT supported in this ESM module.
 * For webhook support, use the full server-based exports from '@ha-bits/cortex'.
 */

import {
  Workflow,
  WorkflowExecution,
  WorkflowConfig,
  LoadedWorkflow,
  StreamCallback,
} from '@habits/shared/types';
import { WorkflowExecutor, InitFromDataOptions } from './WorkflowExecutor';

/**
 * Options for starting a workflow execution.
 */
export interface StartWorkflowOptions {
  /** Initial context data (e.g., { habits: { input: {...} } }) */
  initialContext?: Record<string, any>;
  /** Callback for streaming execution events */
  onStream?: StreamCallback;
  /** Pre-populated trigger node outputs */
  triggerData?: Record<string, any>;
  /** Start execution from a specific node */
  startFromNode?: string;
}

/**
 * HabitsExecutor - Browser/ESM-compatible workflow executor.
 * 
 * This class wraps the core WorkflowExecutor and provides a clean OOP API
 * for executing workflows without any Node.js or Express dependencies.
 * 
 * Features:
 * - Works in browsers, Deno, Bun, and Node.js
 * - No file system access (all data passed in-memory)
 * - No webhook trigger support (throws error if webhook triggers detected)
 * - Streaming support via callbacks
 * 
 * @example
 * ```typescript
 * // Initialize
 * const config: WorkflowConfig = { version: '1.0', workflows: [...] };
 * const workflows = new Map([['my-workflow', workflowDef]]);
 * const env = { OPENAI_API_KEY: 'sk-...' };
 * 
 * const executor = new HabitsExecutor(config, workflows, env);
 * 
 * // Execute a workflow
 * const result = await executor.startWorkflow('my-workflow', {
 *   initialContext: {
 *     habits: {
 *       input: { prompt: 'Hello world' }
 *     }
 *   }
 * });
 * 
 * console.log(result.output);
 * ```
 */
export class HabitsExecutor {
  private executor: WorkflowExecutor;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Create a new HabitsExecutor instance.
   * 
   * @param config - The workflow configuration (describes which workflows are available)
   * @param workflows - Map or Record of workflow ID to workflow definition
   * @param env - Environment variables to pass to workflows (e.g., API keys)
   */
  constructor(
    private config: WorkflowConfig,
    private workflows: Map<string, Workflow> | Record<string, Workflow>,
    private env?: Record<string, string>
  ) {
    this.executor = new WorkflowExecutor();
    // Start initialization immediately
    this.initPromise = this.initialize();
  }

  /**
   * Initialize the executor. This is called automatically in the constructor,
   * but can be awaited explicitly if needed.
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;
    
    await this.executor.initFromData({
      config: this.config,
      workflows: this.workflows,
      env: this.env,
    });
    
    this.initialized = true;
  }

  /**
   * Ensure the executor is initialized before operations.
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  /**
   * Execute a workflow by ID.
   * 
   * @param workflowId - The ID of the workflow to execute
   * @param options - Execution options
   * @returns The workflow execution result
   * 
   * @throws If the workflow is not found
   * @throws If the workflow contains webhook triggers (not supported in ESM mode)
   * 
   * @example
   * ```typescript
   * const result = await executor.startWorkflow('analyze-text', {
   *   initialContext: {
   *     habits: {
   *       input: { text: 'Hello world' }
   *     }
   *   },
   *   onStream: (event) => {
   *     console.log('Event:', event.type, event.nodeId);
   *   }
   * });
   * ```
   */
  async startWorkflow(
    workflowId: string,
    options?: StartWorkflowOptions
  ): Promise<WorkflowExecution> {
    await this.ensureInitialized();
    
    const loadedWorkflow = this.executor.getWorkflow(workflowId);
    if (!loadedWorkflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Execute with no webhook handler - will throw if webhooks are needed
    return this.executor.executeWorkflow(loadedWorkflow.workflow, {
      // No webhookHandler - will throw a clear error if webhook triggers exist
      initialContext: options?.initialContext,
      onStream: options?.onStream,
      triggerData: options?.triggerData,
      startFromNode: options?.startFromNode,
    });
  }

  /**
   * Execute a workflow object directly (without loading from config).
   * 
   * @param workflow - The workflow definition to execute
   * @param options - Execution options
   * @returns The workflow execution result
   * 
   * @example
   * ```typescript
   * const workflow: Workflow = { id: 'inline', name: 'Inline', nodes: [...], edges: [...] };
   * const result = await executor.executeWorkflow(workflow, {
   *   initialContext: { habits: { input: { data: 'test' } } }
   * });
   * ```
   */
  async executeWorkflow(
    workflow: Workflow,
    options?: StartWorkflowOptions
  ): Promise<WorkflowExecution> {
    await this.ensureInitialized();
    
    return this.executor.executeWorkflow(workflow, {
      initialContext: options?.initialContext,
      onStream: options?.onStream,
      triggerData: options?.triggerData,
      startFromNode: options?.startFromNode,
    });
  }

  /**
   * Get a workflow definition by ID.
   * 
   * @param workflowId - The ID of the workflow
   * @returns The loaded workflow or undefined if not found
   */
  async getWorkflow(workflowId: string): Promise<LoadedWorkflow | undefined> {
    await this.ensureInitialized();
    return this.executor.getWorkflow(workflowId);
  }

  /**
   * Get all loaded workflows.
   * 
   * @returns Array of all loaded workflows
   */
  async getAllWorkflows(): Promise<LoadedWorkflow[]> {
    await this.ensureInitialized();
    return this.executor.getAllWorkflows();
  }

  /**
   * Get an execution by ID.
   * 
   * @param executionId - The execution ID
   * @returns The execution or undefined if not found
   */
  async getExecution(executionId: string): Promise<WorkflowExecution | undefined> {
    await this.ensureInitialized();
    return this.executor.getExecution(executionId);
  }

  /**
   * List all executions.
   * 
   * @returns Array of all executions
   */
  async listExecutions(): Promise<WorkflowExecution[]> {
    await this.ensureInitialized();
    return this.executor.listExecutions();
  }

  /**
   * Cancel a running execution.
   * 
   * @param executionId - The execution ID to cancel
   * @returns True if cancelled, false if not found or not running
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.executor.cancelExecution(executionId);
  }

  /**
   * Get the current configuration.
   * 
   * @returns The workflow configuration
   */
  async getConfig(): Promise<WorkflowConfig | null> {
    await this.ensureInitialized();
    return this.executor.getConfig();
  }
}

// Re-export types for convenience
export type {
  Workflow,
  WorkflowExecution,
  WorkflowConfig,
  LoadedWorkflow,
  StreamCallback,
  InitFromDataOptions,
};
