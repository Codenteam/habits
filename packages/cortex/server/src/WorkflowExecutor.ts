import { v4 as uuidv4 } from 'uuid';
import { executeN8nModule } from './n8n/n8nExecutor';
import { executeActivepiecesModule } from './activepieces/activepiecesExecutor';
import { triggerHelper, TriggerHookType } from './activepieces/activepiecesTrigger';
import { executeBitsModule } from './bits/bitsDoer';
import { bitsTriggerHelper } from './bits/bitsWatcher';
import { executeScriptModule } from './script/scriptExecutor';
import { ensureModuleInstalled } from './utils/moduleLoader';
import { getSecurityConfig, scanInputForSecurity } from './security/inputScanner';
import { LoggerFactory, ILogger } from '@ha-bits/core';
import { IWebhookHandler } from './WebhookTriggerServer';
import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  ExecutionResult,
  WorkflowExecution,
  NodeDependencies,
  NodeExecutionStatus,
  Framework,
  WebhookTriggerInfo,
  WebhookPayload,
  WorkflowConfig,
  WorkflowReference,
  LoadedWorkflow,
  StreamCallback,
  StreamEvent,
  FlowControlMetadata,
  EdgeInfo,
} from '@habits/shared/types';

// ============================================================================
// Workflow Executor
// ============================================================================

/**
 * Options for initializing WorkflowExecutor from in-memory data
 */
export interface InitFromDataOptions {
  /** The workflow configuration (equivalent to config.json content) */
  config: WorkflowConfig;
  /** Map of workflow id to workflow object (instead of loading from file paths) */
  workflows: Map<string, Workflow> | Record<string, Workflow>;
  /** Environment variables to set (equivalent to .env file content parsed) */
  env?: Record<string, string>;
}

export class WorkflowExecutor {
  private executions: Map<string, WorkflowExecution> = new Map();
  private loadedWorkflows: Map<string, LoadedWorkflow> = new Map();
  private config: WorkflowConfig | null = null;
  private logger: ILogger = LoggerFactory.getRoot();
  private env: Record<string, string | undefined> = {};

  /**
   * Initialize from in-memory data (no file system access needed)
   * This is the ONLY initialization method - it's platform-agnostic (works in browser and Node.js)
   */
  async initFromData(options: InitFromDataOptions): Promise<void> {
    const { config, workflows, env } = options;

    // Store environment variables in class property (platform-agnostic)
    if (env) {
      this.env = { ...env };
      // Also set process.env for Node.js compatibility with modules that read it directly
      if (typeof process !== 'undefined' && process.env) {
        for (const [key, value] of Object.entries(env)) {
          process.env[key] = value;
        }
      }
    }

    // Initialize logger from config (env vars are applied automatically by ConfigResolver)
    this.logger = LoggerFactory.initRoot(config.logging);
    this.logger.info('Environment variables set from config');

    this.config = config;
    this.logger.info('Loading workflow configuration from data');
    this.logger.debug('Config details', { 
      version: this.config.version || 'not specified',
      workflowCount: this.config.workflows.length 
    });

    // Convert Record to Map if needed
    const workflowsMap = workflows instanceof Map 
      ? workflows 
      : new Map(Object.entries(workflows));

    // Load each workflow from the provided map
    for (const workflowRef of this.config.workflows) {
      if (workflowRef.enabled === false) {
        this.logger.log(`   ⏭️  Skipping disabled workflow: ${workflowRef.id || workflowRef.path}`);
        continue;
      }

      // Try to find workflow by id first, then by path (as a key)
      const workflowId = workflowRef.id || workflowRef.path;
      let workflow = workflowsMap.get(workflowId);
      
      // Also try the path as a fallback key
      if (!workflow && workflowRef.path) {
        workflow = workflowsMap.get(workflowRef.path);
      }

      if (!workflow) {
        this.logger.error(`   ❌ Workflow not found in data: ${workflowId}`);
        continue;
      }

      try {
        const finalWorkflowId = workflowRef.id || workflow.id || workflowId;

        if (!finalWorkflowId) {
          this.logger.error(`   ❌ No id found for workflow - please specify id in config or workflow`);
          continue;
        }

        // Update workflow id to match the resolved id
        workflow.id = finalWorkflowId;

        // Update reference with resolved id for consistency
        const resolvedRef = { ...workflowRef, id: finalWorkflowId };

        this.loadedWorkflows.set(finalWorkflowId, {
          reference: resolvedRef,
          workflow
        });

        this.logger.log(`   ✅ Loaded workflow: ${finalWorkflowId} (${workflow.name})`);

        // Print all env variables starting with HABITS_, only the names not values
        this.logger.log(`   🔑 Environment variables:`);
        for (const key of Object.keys(this.env)) {
          if (key.startsWith('HABITS_')) {
            this.logger.log(`      - ${key}: ${this.env[key]}`);
          }
        }

        // Log resolvable params that start with "habits."
        this.logger.log(`   📋 Resolvable habits params in workflow:`);
        const habitsParams = this.findHabitsParams(workflow);
        if (habitsParams.length > 0) {
          for (const param of habitsParams) {
            if (param.startsWith('habits.env.')) {
              const envVar = param.slice('habits.env.'.length);
              const value = this.env[envVar];
              this.logger.log(`      - {{${param}}} → ${value !== undefined ? value : '(not set)'}`);
            } else {
              this.logger.log(`      - {{${param}}} → (resolved at runtime)`);
            }
          }
        } else {
          this.logger.log(`      (none found)`);
        }
      } catch (error: any) {
        this.logger.error(`   ❌ Failed to load workflow ${workflowRef.id || workflowRef.path}: ${error.message}`);
      }
    }

    // Make sure no repeated workflowId
    const workflowIds = Array.from(this.loadedWorkflows.keys());
    const duplicates = workflowIds.filter((id, index) => workflowIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      throw new Error(`Duplicate workflow IDs found: ${duplicates.join(', ')}`);
    }

    this.logger.log(`\n📦 Successfully loaded ${this.loadedWorkflows.size} workflow(s)\n`);

    // Pre-load all modules to ensure they're ready before first request
    await this.preloadModules();
  }

  /**
   * Pre-load all modules referenced in loaded workflows
   * This ensures dependencies are cloned/installed before the first request
   */
  private async preloadModules(): Promise<void> {
    const modulesToPreload: Set<string> = new Set();
    const moduleDefinitions: Map<string, { framework: string; source: string; module: string }> = new Map();

    // Scan all loaded workflows for modules
    for (const [workflowId, { workflow }] of this.loadedWorkflows) {
      for (const node of workflow.nodes || []) {
        const { framework, source, module: moduleName } = node.data;
        // Skip inline scripts - they don't need preloading
        if (source === 'inline') {
          continue;
        }
        if (framework && source && moduleName) {
          const key = `${framework}:${source}:${moduleName}`;
          if (!modulesToPreload.has(key)) {
            modulesToPreload.add(key);
            moduleDefinitions.set(key, { framework, source, module: moduleName });
          }
        }
      }
    }

    if (modulesToPreload.size === 0) {
      this.logger.log(`\n📦 No modules to preload\n`);
      return;
    }

    this.logger.log(`\n📦 Pre-loading ${modulesToPreload.size} module(s)...`);

    // Preload all modules in parallel
    const preloadPromises = Array.from(moduleDefinitions.entries()).map(async ([key, def]) => {
      try {
        this.logger.log(`   ⏳ Preloading: ${def.module}`);
        await ensureModuleInstalled({
          framework: def.framework,
          source: def.source as 'github' | 'npm',
          repository: def.module,
        });
        this.logger.log(`   ✅ Preloaded: ${def.module}`);
      } catch (error: any) {
        this.logger.error(`   ❌ Failed to preload ${def.module}: ${error.message}`);
      }
    });

    await Promise.all(preloadPromises);
    this.logger.log(`\n📦 Module preloading complete\n`);

    // Hook polling triggers for activepieces modules
    await this.hookPollingTriggers();
  }

  /**
   * Hook polling triggers for all loaded workflows
   * This sets up activepieces polling triggers to run immediately
   */
  private async hookPollingTriggers(): Promise<void> {
    for (const [workflowId, { workflow }] of this.loadedWorkflows) {
      for (const node of workflow.nodes || []) {
        // Check if this is an activepieces polling trigger
        if (triggerHelper.isActivepiecesTrigger(node) && node.data?.triggerType === 'polling') {
          const triggerName = node.data.operation;
          if (!triggerName) {
            this.logger.warn(`⚠️ No operation specified for polling trigger: ${node.id}`);
            continue;
          }

          this.logger.log(`\n🔔 Hooking polling trigger: ${node.id} (${triggerName}) in workflow ${workflowId}`);
          
          try {
            const moduleDefinition = {
              framework: node.data.framework,
              source: node.data.source as 'github' | 'npm',
              repository: node.data.module || '',
            };

            // Resolve template strings in params and credentials
            const resolvedParams = this.resolveParameters(node.data.params || {}, {});
            const resolvedCredentials = this.resolveParameters(node.data.credentials || {}, {});

            // Merge params and credentials for trigger input
            const triggerInput = {
              ...resolvedParams,
              credentials: resolvedCredentials,
            };

            this.logger.log(`  📋 Trigger input: ${JSON.stringify(triggerInput, null, 2)}`);

            // Execute the specific trigger immediately
            this.logger.log(`  🚀 Running trigger ${triggerName} immediately...`);
            const result = await triggerHelper.executeActivepiecesTrigger({
              moduleDefinition,
              triggerName,
              input: triggerInput,
            });

            this.logger.log(`\n📬 Trigger result for ${triggerName}:`);
            this.logger.log(`   Success: ${result.success}`);
            this.logger.log(`   Output items: ${result.output?.length || 0}`);
            if (result.output && result.output.length > 0) {
              this.logger.log(`   Output: ${JSON.stringify(result.output, null, 2)}`);
              
              // Trigger returned data - execute workflow continuation
              this.logger.log(`\n🚀 Trigger ${node.id} returned data, executing workflow continuation...`);
              for (const item of result.output) {
                try {
                  // Execute workflow with trigger node pre-populated
                  const executionResult = await this.executeWorkflow(workflowId, {
                    startFromNode: node.id,
                    triggerData: { [node.id]: item },
                  });
                  this.logger.log(`   ✅ Workflow execution completed: ${executionResult.status}`);
                } catch (execError: any) {
                  this.logger.error(`   ❌ Workflow execution failed: ${execError.message}`);
                }
              }
            }
          } catch (error: any) {
            this.logger.error(`   ❌ Failed to hook trigger ${node.id}: ${error.message}`);
          }
        }
      }
    }
  }

  /**
   * Find all template params starting with "habits." in a workflow
   */
  private findHabitsParams(workflow: Workflow): string[] {
    const habitsParams: Set<string> = new Set();
    const templateRegex = /\{\{(habits\.[^}]+)\}\}/g;

    const scanObject = (obj: any) => {
      if (typeof obj === 'string') {
        let match;
        while ((match = templateRegex.exec(obj)) !== null) {
          habitsParams.add(match[1].trim());
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(item => scanObject(item));
      } else if (typeof obj === 'object' && obj !== null) {
        Object.values(obj).forEach(value => scanObject(value));
      }
    };

    // Scan nodes
    workflow.nodes?.forEach(node => scanObject(node.data));
    // Scan output
    if (workflow.output) scanObject(workflow.output);
    if ((workflow as any).outputs) scanObject((workflow as any).outputs);

    return Array.from(habitsParams).sort();
  }

  /**
   * Get a loaded workflow by ID
   */
  getWorkflow(workflowId: string): LoadedWorkflow | undefined {
    return this.loadedWorkflows.get(workflowId);
  }

  /**
   * Get all loaded workflows
   */
  getAllWorkflows(): LoadedWorkflow[] {
    return Array.from(this.loadedWorkflows.values());
  }

  /**
   * Add a workflow programmatically (for OpenAPI generation without file loading)
   */
  addWorkflow(workflow: Workflow, reference?: Partial<WorkflowReference>): void {
    const workflowId = reference?.id || workflow.id;
    if (!workflowId) {
      throw new Error('Workflow must have an id');
    }
    
    const fullReference: WorkflowReference = {
      id: workflowId,
      path: reference?.path || `inline:${workflowId}`,
      enabled: reference?.enabled !== false,
      ...(reference?.webhookTimeout && { webhookTimeout: reference.webhookTimeout }),
    };
    
    this.loadedWorkflows.set(workflowId, {
      reference: fullReference,
      workflow: { ...workflow, id: workflowId },
    });
  }

  /**
   * Get the current config
   */
  getConfig(): WorkflowConfig | null {
    return this.config;
  }

  /**
   * Execute a complete workflow using dependency-based execution
   */
  async executeWorkflow(workflowOrId: Workflow | string, options?: {
    webhookHandler?: IWebhookHandler;   // Optional webhook handler for workflow triggers (Node.js server only)
    webhookTimeout?: number;
    initialContext?: Record<string, any>;
    onStream?: StreamCallback;
    triggerData?: Record<string, any>;  // Pre-populate trigger node outputs
    startFromNode?: string;             // Start execution from a specific node
  }): Promise<WorkflowExecution> {
    // Resolve workflow from ID if string provided
    let workflow: Workflow;
    if (typeof workflowOrId === 'string') {
      const loaded = this.loadedWorkflows.get(workflowOrId);
      if (!loaded) {
        throw new Error(`Workflow not found: ${workflowOrId}`);
      }
      workflow = loaded.workflow;
    } else {
      workflow = workflowOrId;
    }

    const executionId = uuidv4();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      status: 'running',
      results: [],
      nodeStatuses: [],
      startTime: new Date(),
    };

    this.executions.set(executionId, execution);
    this.logger.log(`\n🚀 Starting workflow execution: ${workflow.name} (${executionId})`);

    // Helper function to emit stream events
    const emitStreamEvent = (event: Omit<StreamEvent, 'timestamp' | 'executionId' | 'workflowId'>) => {
      if (options?.onStream) {
        const completedCount = execution.nodeStatuses.filter(s => s.status === 'completed' || s.status === 'failed').length;
        const totalCount = workflow.nodes.length;
        options.onStream({
          ...event,
          timestamp: new Date().toISOString(),
          executionId,
          workflowId: workflow.id,
          progress: {
            completed: completedCount,
            total: totalCount,
            percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
          }
        });
      }
    };

    // Emit execution started event
    emitStreamEvent({
      type: 'execution_started',
      status: 'running'
    });

    try {
      // Scan for webhook triggers
      const webhookTriggers = this.findWebhookTriggers(workflow.nodes);

      // If there are webhook triggers, ensure a webhook handler is provided
      if (webhookTriggers.length > 0) {
        if (!options?.webhookHandler) {
          throw new Error(
            `Workflow "${workflow.name}" contains ${webhookTriggers.length} webhook trigger(s) but no webhookHandler was provided. ` +
            `Webhook triggers are only supported in Node.js server environments. ` +
            `Provide a webhookHandler via options or remove webhook triggers from the workflow.`
          );
        }

        this.logger.log(`\n📋 Detected ${webhookTriggers.length} webhook trigger(s):`);
        for (const trigger of webhookTriggers) {
          this.logger.log(`   - Node: ${trigger.nodeId}`);
        }
        this.logger.log('\n⏳ Waiting for webhook(s) to be triggered...\n');
      }

      // Build dependency arrays
      const dependencies = this.buildDependencyMap(workflow.nodes, workflow.edges);

      // Initialize node statuses
      execution.nodeStatuses = workflow.nodes.map(node => ({
        nodeId: node.id,
        status: 'pending' as const
      }));

      // Execution context to share data between nodes
      // Initialize with any provided initial context (e.g., habits.input, habits.headers, habits.cookies)
      let context: Record<string, any> = options?.initialContext ? { ...options.initialContext } : {};

      // Initialize habits namespace if not present
      if (!context.habits) {
        context.habits = {};
      }

      // Add habits.context with workflow execution metadata
      context.habits.context = {
        workflowId: workflow.id,
        workflowName: workflow.name,
        executionId,
        timestamp: new Date().toISOString(),
        startTime: execution.startTime.toISOString(),
        nodeId: '', // Will be set per-node during execution
      };

      // Security scanning on habits.input.* data (DLP, PII, Moderation)
      const securityConfig = getSecurityConfig();
      if (context.habits?.input) {
        context.habits.input = await scanInputForSecurity(context.habits.input, securityConfig, this.logger);
      }

      // If triggerData provided, mark trigger nodes as completed and add to context
      if (options?.triggerData) {
        for (const [nodeId, data] of Object.entries(options.triggerData)) {
          // Security scanning on trigger output data
          const scannedData = await scanInputForSecurity(data, securityConfig, this.logger);
          context[nodeId] = scannedData;
          this.updateNodeStatus(execution, nodeId, 'completed', { result: data });
          this.logger.log(`📍 Pre-populated trigger node: ${nodeId}`);
          
          // Add result to execution
          execution.results.push({
            nodeId,
            success: true,
            result: data,
            duration: 0,
            timestamp: new Date(),
          });
        }
      }

      // Keep executing until all nodes are completed or failed
      while (this.hasRunnableNodes(execution.nodeStatuses, dependencies)) {
        const runnableNodes = this.findRunnableNodes(execution.nodeStatuses, dependencies);

        if (runnableNodes.length === 0) {
          this.logger.log('⚠️  No runnable nodes found, stopping execution');
          break;
        }

        // Execute all runnable nodes in parallel
        const nodeExecutionPromises = runnableNodes.map(async (nodeId) => {
          const node = workflow.nodes.find(n => n.id === nodeId);
          if (!node) return;

          // Check flow control - skip nodes on non-activated branches
          const flowControlResult = this.checkFlowControl(nodeId, dependencies, context);
          if (flowControlResult === 'skip') {
            // Mark node as skipped and add minimal context
            context[nodeId] = { _skipped: true, _reason: 'Branch not activated by upstream flow control' };
            this.updateNodeStatus(execution, nodeId, 'skipped');
            
            // Emit node skipped event
            emitStreamEvent({
              type: 'node_completed',
              nodeId,
              nodeName: node.data.label,
              status: 'skipped',
              result: { _skipped: true },
              duration: 0
            });
            return;
          }

          execution.currentNode = nodeId;
          this.logger.log(`\n📝 Executing node: ${nodeId} (${node.data.label})`);

          // Update habits.context.nodeId for the current node
          if (context.habits?.context) {
            context.habits.context.nodeId = nodeId;
          }

          // Update node status to running
          this.updateNodeStatus(execution, nodeId, 'running');

          // Emit node started event
          emitStreamEvent({
            type: 'node_started',
            nodeId,
            nodeName: node.data.label,
            status: 'running'
          });

          try {
            // Check if this is a webhook trigger node
            if (this.isWebhookTriggerNode(node)) {
              // webhookHandler is guaranteed to exist here - we validated at the start of executeWorkflow
              const webhookResult = await this.handleWebhookTrigger(node, context, execution, options!.webhookHandler!, options?.webhookTimeout);

              // Security scanning on webhook trigger output data
              const scannedResult = await scanInputForSecurity(webhookResult.result, securityConfig, this.logger);

              // Update context with scanned webhook result
              context[`${nodeId}`] = scannedResult;
              context[nodeId] = scannedResult;
              context.previous_result = scannedResult;
              context.webhookPayload = scannedResult; // Also store as webhookPayload for easy access

              this.updateNodeStatus(execution, nodeId, webhookResult.success ? 'completed' : 'failed', {
                result: scannedResult,
                error: webhookResult.error,
                startTime: new Date(webhookResult.timestamp.getTime() - webhookResult.duration),
                endTime: webhookResult.timestamp,
                duration: webhookResult.duration
              });

              // Emit node completed/failed event
              emitStreamEvent({
                type: webhookResult.success ? 'node_completed' : 'node_failed',
                nodeId,
                nodeName: node.data.label,
                status: webhookResult.success ? 'completed' : 'failed',
                result: scannedResult,
                error: webhookResult.error,
                duration: webhookResult.duration
              });

              if (!webhookResult.success) {
                this.logger.error(`❌ Webhook trigger ${nodeId} failed: ${webhookResult.error}`);
              }
            } else {
              const nodeResult = await this.executeNode(node, context, execution);

              // Update context with node result
              context[`${nodeId}`] = nodeResult.result;
              context[nodeId] = nodeResult.result; // Also store by node ID for easier access
              context.previous_result = nodeResult.result;

              // Update node status based on result
              this.updateNodeStatus(execution, nodeId, nodeResult.success ? 'completed' : 'failed', {
                result: nodeResult.result,
                error: nodeResult.error,
                startTime: new Date(nodeResult.timestamp.getTime() - nodeResult.duration),
                endTime: nodeResult.timestamp,
                duration: nodeResult.duration
              });

              // Emit node completed/failed event
              emitStreamEvent({
                type: nodeResult.success ? 'node_completed' : 'node_failed',
                nodeId,
                nodeName: node.data.label,
                status: nodeResult.success ? 'completed' : 'failed',
                result: nodeResult.result,
                error: nodeResult.error,
                duration: nodeResult.duration
              });

              // If node failed, we might want to stop (depending on strategy)
              if (!nodeResult.success) {
                this.logger.error(`❌ Workflow Node ${nodeId} failed: ${nodeResult.error}`);
                // For now, continue with other nodes - could add failure strategies later
              }
            }

          } catch (error: any) {
            this.logger.error(`❌ Node ${nodeId} execution failed: ${error.message}`);
            this.updateNodeStatus(execution, nodeId, 'failed', {
              error: error.message,
              startTime: new Date(),
              endTime: new Date(),
              duration: 0
            });

            // Emit node failed event
            emitStreamEvent({
              type: 'node_failed',
              nodeId,
              nodeName: node.data.label,
              status: 'failed',
              error: error.message,
              duration: 0
            });
          }
        });

        // Wait for all parallel node executions to complete
        await Promise.all(nodeExecutionPromises);

        // Wait one second before next iteration to avoid tight loop, disabling for now, making stuff slow as hell if serving a backend!!
        // await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Determine final execution status
      const failedNodes = execution.nodeStatuses.filter(s => s.status === 'failed');
      const completedNodes = execution.nodeStatuses.filter(s => s.status === 'completed');
      const skippedNodes = execution.nodeStatuses.filter(s => s.status === 'skipped');
      const totalProcessed = completedNodes.length + skippedNodes.length;

      if (failedNodes.length > 0) {
        execution.status = 'failed';
        this.logger.log(`❌ Workflow failed - ${failedNodes.length} nodes failed`);
      } else if (totalProcessed === workflow.nodes.length) {
        execution.status = 'completed';
        if (skippedNodes.length > 0) {
          this.logger.log(`✅ Workflow completed successfully - ${completedNodes.length} nodes executed, ${skippedNodes.length} skipped (flow control)`);
        } else {
          this.logger.log(`✅ Workflow completed successfully - all ${completedNodes.length} nodes executed`);
        }
      } else {
        execution.status = 'failed';
        this.logger.log(`⚠️  Workflow incomplete - ${totalProcessed}/${workflow.nodes.length} nodes processed (${completedNodes.length} completed, ${skippedNodes.length} skipped)`);
      }

      // Process workflow output if defined (support both 'output' and 'outputs' keys)
      const workflowOutput = workflow.    output || (workflow as any).outputs;
      if (workflowOutput) {
        try {
          this.logger.log(`\n📤 Processing workflow output...`);
          execution.output = this.resolveParameters(workflowOutput, context);
          this.logger.log(`   Output resolved successfully`);
        } catch (error: any) {
          this.logger.error(`⚠️ Failed to resolve workflow output: ${error.message}`);
          execution.output = { error: `Failed to resolve output: ${error.message}` };
        }
      }

      // Emit execution completed/failed event
      emitStreamEvent({
        type: execution.status === 'completed' ? 'execution_completed' : 'execution_failed',
        status: execution.status as any,
        output: execution.output
      });

    } catch (error: any) {
      this.logger.error(`❌ Workflow execution failed: ${error.message}`);
      this.logger.error(error.stack);
      execution.status = 'failed';
      execution.results.push({
        nodeId: 'workflow',
        success: false,
        error: error.message,
        timestamp: new Date(),
        duration: 0,
      });

      // Emit execution failed event
      emitStreamEvent({
        type: 'execution_failed',
        status: 'failed',
        error: error.message
      });
    } finally {
      execution.endTime = new Date();
      execution.currentNode = undefined;
      this.logger.log(`\n✅ Workflow execution completed: ${execution.status}`);
    }

    return execution;
  }

  /**
   * Find all webhook trigger nodes in the workflow
   */
  private findWebhookTriggers(nodes: WorkflowNode[]): WebhookTriggerInfo[] {
    return nodes
      .filter(node => this.isWebhookTriggerNode(node))
      .map(node => triggerHelper.getWebhookConfig(node));
  }

  /**
   * Check if a node is a webhook trigger
   */
  private isWebhookTriggerNode(node: WorkflowNode): boolean {
    return triggerHelper.isWebhookTrigger(node);
  }

  /**
   * Handle webhook trigger execution - waits for webhook to be received
   * Requires a webhookHandler to be passed (typically provided by the server layer)
   */
  private async handleWebhookTrigger(
    node: WorkflowNode,
    context: Record<string, any>,
    execution: WorkflowExecution,
    webhookHandler: IWebhookHandler,
    timeout?: number
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const result: ExecutionResult = {
      nodeId: node.id,
      success: false,
      timestamp: new Date(),
      duration: 0,
    };

    try {
      const workflowId = execution.workflowId;
      this.logger.log(`🔔 Waiting for webhook for workflow ${workflowId}, node ${node.id}`);

      // Wait for the webhook to be triggered (with workflow ID)
      const webhookPayload = await webhookHandler.waitForWebhook(node.id, timeout || 300000, workflowId);

      this.logger.log(`✅ Webhook received for workflow ${workflowId}, node ${node.id}`);

      // Execute the webhook trigger handler
      const triggerResult = await triggerHelper.executeWebhookTrigger(
        node.id,
        webhookPayload.payload,
        webhookPayload.headers,
        webhookPayload.query
      );

      if (triggerResult.success) {
        result.success = true;
        result.result = triggerResult.output?.[0] || webhookPayload;
        this.logger.log(`✅ Webhook trigger ${node.id} executed successfully`);
      } else {
        result.success = false;
        result.error = triggerResult.message || 'Webhook trigger execution failed';
      }

    } catch (error: any) {
      this.logger.error(`❌ Webhook trigger ${node.id} failed: ${error.message}`);
      result.success = false;
      result.error = error.message;
    }

    result.duration = Date.now() - startTime;
    execution.results.push(result);

    return result;
  }

  /**
   * Build dependency map from workflow nodes and edges
   * Now includes detailed edge information for flow control
   */
  private buildDependencyMap(nodes: WorkflowNode[], edges: WorkflowEdge[]): Map<string, NodeDependencies> {
    const dependencyMap = new Map<string, NodeDependencies>();

    // Initialize dependency map for all nodes
    nodes.forEach(node => {
      dependencyMap.set(node.id, {
        nodeId: node.id,
        dependsOn: [],
        optionalDependsOn: [],
        dependencyFor: [],
        incomingEdges: [], // Track detailed edge info for flow control
      });
    });

    // Build dependency relationships from edges
    edges.forEach(edge => {
      const sourceDeps = dependencyMap.get(edge.source);
      const targetDeps = dependencyMap.get(edge.target);

      if (sourceDeps && targetDeps) {
        // Target depends on source - check if optional
        if (edge.optional) {
          targetDeps.optionalDependsOn.push(edge.source);
        } else {
          targetDeps.dependsOn.push(edge.source);
        }
        // Source is a dependency for target
        sourceDeps.dependencyFor.push(edge.target);
        
        // Store detailed edge info for flow control
        targetDeps.incomingEdges!.push({
          sourceNodeId: edge.source,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          optional: edge.optional,
        });
      }
    });

    return dependencyMap;
  }

  /**
   * Check if there are any runnable nodes
   */
  private hasRunnableNodes(nodeStatuses: NodeExecutionStatus[], dependencies: Map<string, NodeDependencies>): boolean {
    return nodeStatuses.some(status =>
      status.status === 'pending' && this.areAllDependenciesSatisfied(status.nodeId, nodeStatuses, dependencies)
    );
  }

  /**
   * Find all nodes that can be executed (no pending dependencies)
   */
  private findRunnableNodes(nodeStatuses: NodeExecutionStatus[], dependencies: Map<string, NodeDependencies>): string[] {
    return nodeStatuses
      .filter(status =>
        status.status === 'pending' &&
        this.areAllDependenciesSatisfied(status.nodeId, nodeStatuses, dependencies)
      )
      .map(status => status.nodeId);
  }

  /**
   * Check if all dependencies for a node are satisfied (completed or skipped)
   * For required dependencies: ALL must be completed or skipped
   * For optional dependencies: ANY one being completed/skipped is sufficient (OR logic)
   * Note: 'skipped' nodes are treated as satisfied for dependency purposes
   */
  private areAllDependenciesSatisfied(nodeId: string, nodeStatuses: NodeExecutionStatus[], dependencies: Map<string, NodeDependencies>): boolean {
    const nodeDeps = dependencies.get(nodeId);
    if (!nodeDeps) {
      return true; // No dependencies info
    }
    
    const hasRequiredDeps = nodeDeps.dependsOn.length > 0;
    const hasOptionalDeps = nodeDeps.optionalDependsOn.length > 0;
    
    // Helper to check if a node status is "done" (completed or skipped)
    const isDone = (status: NodeExecutionStatus['status'] | undefined) => 
      status === 'completed' || status === 'skipped';
    
    // If no dependencies at all, node can run
    if (!hasRequiredDeps) {
      return true;
    }

    // Check required dependencies - ALL must be completed or skipped
    const allRequiredSatisfied = nodeDeps.dependsOn.every(depNodeId => {
      const depStatus = nodeStatuses.find(s => s.nodeId === depNodeId);
      return isDone(depStatus?.status);
    });

    // If has required deps and they're not all satisfied, can't run
    if (hasRequiredDeps && !allRequiredSatisfied) {
      return false;
    }

    // Check optional dependencies - ANY one being completed/skipped is sufficient
    if (hasOptionalDeps) {
      const anyOptionalSatisfied = nodeDeps.optionalDependsOn.some(depNodeId => {
        const depStatus = nodeStatuses.find(s => s.nodeId === depNodeId);
        return isDone(depStatus?.status);
      });
      
      // If only optional deps exist, need at least one satisfied
      if (!hasRequiredDeps) {
        return anyOptionalSatisfied;
      }
      // If both required and optional exist, required must all be done, 
      // and at least one optional must be done
      return allRequiredSatisfied && anyOptionalSatisfied;
    }

    // Only required deps, and they're all satisfied
    return allRequiredSatisfied;
  }

  /**
   * Check if a node should be skipped due to flow control from upstream nodes.
   * Flow control nodes (like bit-if) can specify which branches are activated.
   * Nodes connected via non-activated branches should be skipped.
   * 
   * @returns 'execute' if the node should execute, 'skip' if it should be skipped
   */
  private checkFlowControl(
    nodeId: string,
    dependencies: Map<string, NodeDependencies>,
    context: Record<string, any>
  ): 'execute' | 'skip' {
    const nodeDeps = dependencies.get(nodeId);
    if (!nodeDeps || !nodeDeps.incomingEdges?.length) {
      return 'execute'; // No incoming edges, execute normally
    }

    // Check each incoming edge for flow control
    for (const edge of nodeDeps.incomingEdges) {
      const sourceResult = context[edge.sourceNodeId];
      if (!sourceResult) {
        continue; // Source hasn't executed yet or has no result
      }

      // Check if the source node returned flow control metadata
      // Can be in _flowControl field or directly in the result
      const flowControl: FlowControlMetadata | undefined = 
        sourceResult._flowControl || 
        (sourceResult.controlsFlow ? sourceResult : undefined);

      if (!flowControl?.controlsFlow) {
        continue; // Source doesn't control flow
      }

      // Source controls flow - check if this edge's sourceHandle is activated
      const { activeBranches, skipBranches } = flowControl;
      const edgeHandle = edge.sourceHandle || 'default';

      if (activeBranches && activeBranches.length > 0) {
        // If activeBranches is specified, only those branches execute
        if (!activeBranches.includes(edgeHandle)) {
          this.logger.log(`⏭️  Skipping node ${nodeId}: branch "${edgeHandle}" not in activeBranches [${activeBranches.join(', ')}]`);
          return 'skip';
        }
      } else if (skipBranches && skipBranches.length > 0) {
        // If skipBranches is specified, those branches are skipped
        if (skipBranches.includes(edgeHandle)) {
          this.logger.log(`⏭️  Skipping node ${nodeId}: branch "${edgeHandle}" in skipBranches [${skipBranches.join(', ')}]`);
          return 'skip';
        }
      }
    }

    return 'execute';
  }

  /**
   * Update node execution status
   */
  private updateNodeStatus(
    execution: WorkflowExecution,
    nodeId: string,
    status: NodeExecutionStatus['status'],
    additionalData?: Partial<NodeExecutionStatus>
  ): void {
    const nodeStatus = execution.nodeStatuses.find(s => s.nodeId === nodeId);
    if (nodeStatus) {
      nodeStatus.status = status;
      if (additionalData) {
        Object.assign(nodeStatus, additionalData);
      }
    }
  }

  /**
   * Execute a single workflow node
   */
  private async executeNode(
    node: WorkflowNode,
    context: Record<string, any>,
    execution: WorkflowExecution
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const result: ExecutionResult = {
      nodeId: node.id,
      success: false,
      timestamp: new Date(),
      duration: 0,
    };
    let fullParams;
    try {
      
      // Resolve dynamic parameters using context
      const resolvedParams = this.resolveParameters(node.data.params || {}, context);
      // Resolve credentials as well (they may contain {{process.env.XXX}} templates)
      const resolvedCredentials = node.data.credentials
        ? this.resolveParameters(node.data.credentials, context)
        : undefined;

      
      // Add additional node data to params
      fullParams = {
        ...resolvedParams,
        ...(node.data.resource && { resource: node.data.resource }),
        ...(node.data.operation && { operation: node.data.operation }),
        ...(resolvedCredentials && { credentials: resolvedCredentials })
      };

      // Execute based on framework
      let nodeResult: any;
      switch (node.data.framework) {
        case 'activepieces':
          if (triggerHelper.isActivepiecesTrigger(node)) {
            const triggerResult = await triggerHelper.executeActivepiecesTrigger({
              moduleDefinition: {
                framework: node.data.framework,
                source: (node.data.source as 'github' | 'npm') || 'npm',
                repository: node.data.module || 'unknown',
              },
              triggerName: node.data.operation || 'unknown',
              input: fullParams,
              payload: context.triggerPayload || context.webhookPayload || {},
              webhookUrl: context.webhookUrl,
            });

            if (!triggerResult.success) {
              throw new Error(triggerResult.message || 'Trigger execution failed');
            }
            nodeResult = triggerResult.output;
          } else {
            // Regular action execution
            const output = await executeActivepiecesModule({ source: node.data.source!, framework: node.data.framework, moduleName: node.data.module || 'unknown', params: fullParams });
            nodeResult = output.result;
          }
          break;
        case 'n8n':
          // Pass full execution params including source
          nodeResult = await executeN8nModule({
            framework: 'n8n',
            source: node.data.source || 'npm',
            moduleName: node.data.module || 'unknown',
            params: fullParams
          });
          break;
        case 'script':
          nodeResult = await executeScriptModule({
            framework: 'script',
            source: (node.data.source as 'local' | 'hub' | 'inline') || 'local',
            moduleName: node.data.module || 'unknown',
            params: fullParams,
            script: {
              type: fullParams.type || 'script',
              language: fullParams.language || 'deno',
              content: fullParams.script,
            },
          });
          break;
        case 'bits':
          // Bits framework - independent of activepieces dependencies
          if (bitsTriggerHelper.isBitsTrigger(node)) {
            const triggerResult = await bitsTriggerHelper.executeBitsTrigger({
              moduleDefinition: {
                framework: node.data.framework,
                source: (node.data.source as 'github' | 'npm') || 'npm',
                repository: node.data.module || 'unknown',
              },
              triggerName: node.data.operation || 'unknown',
              input: fullParams,
              payload: context.triggerPayload || context.webhookPayload || {},
              webhookUrl: context.webhookUrl,
            });

            if (!triggerResult.success) {
              throw new Error(triggerResult.message || 'Trigger execution failed');
            }
            nodeResult = triggerResult.output;
          } else {
            // Regular action execution
            const output = await executeBitsModule({
              source: node.data.source!,
              framework: node.data.framework,
              moduleName: node.data.module || 'unknown',
              params: fullParams,
              logger: this.logger,
              workflowId: execution.workflowId,
              nodeId: node.id,
              executionId: execution.id,
            });
            nodeResult = output.result;
          }
          break;
        default:
          throw new Error(`Unsupported framework: ${node.data.framework}`);
      }

      result.success = true;
      result.result = nodeResult;

      this.logger.info(`Node ${node.id} executed successfully`);

    } catch (error: any) {
      this.logger.error(`Node ${node.id} failed`, { 
        error: error.message, 
        inputs: fullParams 
      });
      result.success = false;
      result.error = error.message;
    }

    result.duration = Date.now() - startTime;
    execution.results.push(result);

    return result;
  }



  /**
   * Resolve dynamic parameters using context
   */
  private resolveParameters(params: Record<string, any>, context: Record<string, any>): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        // Template variable like {{previous_result.id}}
        const expression = value.slice(2, -2).trim();
        resolved[key] = this.evaluateExpression(expression, context);
      } else if (typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
        // Handle mixed templates like "{{step_abc.value}}_suffix"
        // If an object, serialize it
        let resolvedString = value;
        const templateRegex = /\{\{([^}]+)\}\}/g;
        let match;
        while ((match = templateRegex.exec(value)) !== null) {
          const expression = match[1].trim();
          const evaluatedValue = this.evaluateExpression(expression, context);
          if (typeof evaluatedValue === 'object') {
            // If the evaluated value is an object, serialize it to JSON
            this.logger.warn(`⚠️  Evaluated value for expression "${expression}" is an object, serializing to JSON string`);
            resolvedString = resolvedString.replace(match[0], JSON.stringify(evaluatedValue));
            continue;
          }
          resolvedString = resolvedString.replace(match[0], String(evaluatedValue));
        }
        resolved[key] = resolvedString;
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        resolved[key] = this.resolveParameters(value, context);
      } else if (Array.isArray(value)) {
        resolved[key] = value.map(item => {
          if (typeof item === 'string' && item.startsWith('{{') && item.endsWith('}}')) {
            // Template variable in array
            const expression = item.slice(2, -2).trim();
            return this.evaluateExpression(expression, context);
          } else if (typeof item === 'string' && item.includes('{{') && item.includes('}}')) {
            // Mixed template in array
            let resolvedString = item;
            const templateRegex = /\{\{([^}]+)\}\}/g;
            let match;
            while ((match = templateRegex.exec(item)) !== null) {
              const expression = match[1].trim();
              const evaluatedValue = this.evaluateExpression(expression, context);
              resolvedString = resolvedString.replace(match[0], String(evaluatedValue));
            }
            return resolvedString;
          } else if (typeof item === 'object' && item !== null) {
            return this.resolveParameters(item, context);
          }
          return item;
        });
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Evaluate a JavaScript expression in the given context
   */
  private evaluateExpression(expression: string, context: Record<string, any>): any {
    try {

      // Handle habits.env. variables (special case for environment variables)
      // Allow access to any environment variable via habits.env.VAR_NAME
      if (expression.startsWith('habits.env.')) {
        // Strip 'habits.env.' prefix to get the actual env var name
        const envVar = expression.slice('habits.env.'.length);
        // Check this.env first (platform-agnostic), fall back to process.env for Node.js
        const value = this.env[envVar] ?? (typeof process !== 'undefined' ? process.env?.[envVar] : undefined);
        if (value === undefined) {
          this.logger.warn(`⚠️  Environment variable ${envVar} is not set`);
        }
        return value || '';
      }

      // Handle habits.function.* - utility functions
      if (expression.startsWith('habits.function.')) {
        const funcCall = expression.slice('habits.function.'.length);
        return this.evaluateHabitsFunction(funcCall);
      }

      // Handle habits.context.* - workflow execution context
      if (expression.startsWith('habits.context.')) {
        const contextKey = expression.slice('habits.context.'.length);
        const habitsContext = context.habits?.context || {};
        if (contextKey in habitsContext) {
          return habitsContext[contextKey];
        }
        this.logger.warn(`⚠️  Context key '${contextKey}' not found`);
        return '';
      }

      // Handle habits.header.* - HTTP request headers (alias for habits.headers.*)
      if (expression.startsWith('habits.header.')) {
        const headerName = expression.slice('habits.header.'.length).toLowerCase();
        const headers = context.habits?.headers || {};
        // Headers are case-insensitive, find the matching header
        for (const [key, value] of Object.entries(headers)) {
          if (key.toLowerCase() === headerName) {
            return value;
          }
        }
        this.logger.warn(`⚠️  Header '${headerName}' not found`);
        return '';
      }

      // Handle simple property access like habits.input.userId or step_abc.value
      // Also supports array indexing like result[0].base64
      if (expression.includes('.') || expression.includes('[')) {
        // Parse the expression to handle both dot notation and array indexing
        // e.g., "text-to-speech.result[0].base64" -> ["text-to-speech", "result", "0", "base64"]
        const parts: string[] = [];
        let current = '';
        let i = 0;
        while (i < expression.length) {
          const char = expression[i];
          if (char === '.') {
            if (current) parts.push(current);
            current = '';
          } else if (char === '[') {
            if (current) parts.push(current);
            current = '';
            // Find the closing bracket
            i++;
            while (i < expression.length && expression[i] !== ']') {
              current += expression[i];
              i++;
            }
            if (current) parts.push(current);
            current = '';
          } else {
            current += char;
          }
          i++;
        }
        if (current) parts.push(current);

        let result = context;
        for (const part of parts) {
          // Handle numeric indices for arrays
          const index = /^\d+$/.test(part) ? parseInt(part, 10) : part;

          if (result && typeof result === 'object' && (Array.isArray(result) ? index in result : part in result)) {
            result = (result as any)[index];
          } else {
            throw new Error(`Property ${part} not found`);
          }
        }
        return result;
      }

      // Handle direct context access
      if (expression in context) {
        return context[expression];
      }

      // Fallback to Function evaluation
      const func = new Function(...Object.keys(context), `return ${expression}`);
      return func(...Object.values(context));
    } catch (error: any) {
      this.logger.warn(`⚠️  Failed to evaluate expression: ${expression} - ${error.message}`);
      return expression; // Return original if evaluation fails
    }
  }

  /**
   * Evaluate a condition expression
   */
  private evaluateCondition(condition: string, context: Record<string, any>): boolean {
    try {
      return Boolean(this.evaluateExpression(condition, context));
    } catch {
      return false;
    }
  }

  // TODO: Allow functions to use context and node outputs
  // TODO: Implement a way to register custom functions that can be used in habits.function.* expressions, with access to context and other utilities
  /**
   * Evaluate habits.function.* utility functions
   * Supported functions:
   * - date() - Returns current date in ISO format
   * - now() - Alias for date()
   * - timestamp() - Returns Unix timestamp in milliseconds
   * - uuid() - Generates a random UUID
   * - random(min, max) - Generates random number in range
   * - stringify(value) - Converts value to JSON string (value should be context path)
   */
  private evaluateHabitsFunction(funcCall: string): any {
    // Parse function name and arguments
    const funcMatch = funcCall.match(/^(\w+)\((.*)\)$/);
    if (!funcMatch) {
      this.logger.warn(`⚠️  Invalid function call: ${funcCall}`);
      return '';
    }

    const [, funcName, argsStr] = funcMatch;
    const args = argsStr ? argsStr.split(',').map(a => a.trim()) : [];

    switch (funcName) {
      case 'date':
      case 'now':
        return new Date().toISOString();

      case 'timestamp':
        return Date.now();

      case 'uuid':
        return uuidv4();

      case 'random': {
        const min = args[0] ? parseFloat(args[0]) : 0;
        const max = args[1] ? parseFloat(args[1]) : 1;
        return Math.random() * (max - min) + min;
      }

      case 'randomInt': {
        const min = args[0] ? parseInt(args[0], 10) : 0;
        const max = args[1] ? parseInt(args[1], 10) : 100;
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }

      case 'stringify':
        // For stringify, the arg should be a value in context, but without context here
        // we'll just return the stringified arg itself
        if (args[0]) {
          try {
            return JSON.stringify(args[0]);
          } catch {
            return String(args[0]);
          }
        }
        return '';

      default:
        this.logger.warn(`⚠️  Unknown function: ${funcName}`);
        return '';
    }
  }

  /**
   * Get execution status
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * List all executions
   */
  listExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }

  /**
   * Cancel a running execution
   */
  cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      execution.endTime = new Date();
      return true;
    }
    return false;
  }
}
