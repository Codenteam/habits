// Shared types for workflow execution system
// This file consolidates DTOs from both frontend and backend

// Core workflow execution types (from backend)
export interface WorkflowStep {
  id: string;
  type: 'trigger' | 'action';
  framework: 'activepieces' | 'n8n' | 'script';
  module: string;
  params: Record<string, any>;
  conditions?: {
    skipIf?: string;
    stopIf?: string;
  };
  retries?: number;
  timeout?: number;
}

export interface ExecutionResult {
  nodeId: string;
  success: boolean;
  result?: any;
  error?: string;
  timestamp: Date;
  duration: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  results: ExecutionResult[];
  nodeStatuses: NodeExecutionStatus[];
  startTime: Date;
  endTime?: Date;
  currentNode?: string;
  output?: any; // Resolved workflow output
}

// Backend workflow definition
export interface BackendWorkflow {
  id?: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

// Frontend workflow UI types
export interface WorkflowNode {
  id: string;
  type: 'n8n' | 'activepieces' | 'script' | 'trigger' | 'action' | 'bits';
  position: { x: number; y: number };
  data: {
    label: string;
    framework: 'n8n' | 'activepieces' | 'script' | 'bits';
    source?: 'npm' | 'github' | 'local' | 'hub' | 'inline';
    module?: string;
    resource?: string;
    operation?: string;
    params?: Record<string, any>;
    credentials?: Record<string, any>;
    /** OAuth credentials config - clientId/clientSecret can reference env vars via {{habits.env.VAR}} */
    auth?: Record<string, any>;
    inputs?: string[];
    outputs?: string[];
    // Script-specific properties
    scriptPath?: string;
    language?: 'deno' | 'python3' | 'go' | 'bash' | 'sql' | 'typescript' | 'javascript';
    content?: string;
    inputTransforms?: Record<string, any>;
    stopAfterIf?: { expr: string; skipIfStopped?: boolean };
    // Script inline script
    script?: {
      type: 'script';
      language: 'deno' | 'python3' | 'go' | 'bash' | 'typescript' | 'javascript';
      content?: string;
      path?: string;
    };
    // Trigger-specific properties
    triggerType?: 'webhook' | 'polling' | 'schedule' | 'app_webhook';
    triggerSettings?: {
      authType?: 'none' | 'header' | 'query_param';
      authFields?: Record<string, any>;
    };
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  optional?: boolean; // If true, target node can run when ANY optional edge is satisfied
}

// Generate all export files
export interface ExportBundle {
  id: string; // Stack UUID for build caching
  stackYaml: string;
  habitFiles: Array<{ filename: string; content: string }>;
  envFile: string;
  frontendHtml?: string;
}

// Frontend workflow definition (visual representation)
export interface FrontendWorkflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  version: string;
  output?: Record<string, any>; // Template-based output definition
}

// Use frontend workflow format as the primary workflow type
export type Workflow = FrontendWorkflow;

// ============================================================================
// Visual Canvas Types - Structurally compatible with reactflow
// ============================================================================

/**
 * Visual canvas node type - structurally compatible with reactflow's Node<T>
 * Used by visual components for rendering workflow canvas
 */
export interface CanvasNode<T = any> {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: T;
  selected?: boolean;
  dragging?: boolean;
}

/**
 * Visual canvas edge type - structurally compatible with reactflow's Edge
 * Used by visual components for rendering workflow connections
 */
export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  animated?: boolean;
  label?: any; // Compatible with ReactNode from reactflow
}

// ============================================================================
// Export Format Types - Used for YAML/JSON serialization
// ============================================================================

/**
 * Node format for habit YAML export files
 * Simplified format for serialization and sharing
 */
export interface HabitNode {
  id: string;
  type: string;
  position?: { x: number; y: number };
  data: {
    framework: 'n8n' | 'activepieces' | 'script' | 'bits';
    module?: string;
    label?: string;
    source?: string;
    operation?: string;
    params?: Record<string, any>;
    credentials?: Record<string, any>;
    script?: {
      type: string;
      language: string;
      content: string;
    };
    content?: string;
    language?: string;
  };
}

/**
 * Edge format for habit YAML export files
 */
export interface HabitEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/**
 * Complete habit definition for export/import
 */
export interface Habit {
  id: string;
  name: string;
  description: string;
  nodes: HabitNode[];
  edges: HabitEdge[];
  output?: Record<string, string>; // Habit-level output mappings
  version: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Flow Control Types - Allow nodes to control downstream execution
// ============================================================================

/**
 * Flow control metadata returned by nodes that control branching.
 * This allows nodes like bit-if, switch, router to specify which downstream
 * branches should be executed and which should be skipped.
 */
export interface FlowControlMetadata {
  /**
   * Array of sourceHandle identifiers that should be activated.
   * Downstream nodes connected via these handles will execute.
   * e.g., ["branch-0"] to only activate the first branch
   */
  activeBranches?: string[];
  
  /**
   * Array of sourceHandle identifiers that should be skipped.
   * Downstream nodes connected via these handles will be marked as skipped.
   * If activeBranches is provided, skipBranches is ignored.
   */
  skipBranches?: string[];
  
  /**
   * If true, only connections from activeBranches will execute.
   * If false or undefined, flow control is not applied.
   */
  controlsFlow?: boolean;
}

/**
 * Edge information for dependency tracking
 */
export interface EdgeInfo {
  sourceNodeId: string;
  sourceHandle?: string; // e.g., "branch-0", "branch-1"
  targetHandle?: string;
  optional?: boolean;
}

// Node dependency tracking for execution
export interface NodeDependencies {
  nodeId: string;
  dependsOn: string[]; // Node IDs this node depends on (incoming edges) - required
  optionalDependsOn: string[]; // Optional dependencies - node runs when ANY is satisfied
  dependencyFor: string[]; // Node IDs that depend on this node (outgoing edges)
  /**
   * Detailed edge information for flow control.
   * Maps source node ID to edge info including sourceHandle.
   */
  incomingEdges?: EdgeInfo[];
}

// Execution context for tracking node execution status
export interface NodeExecutionStatus {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
}

// Module management types
export interface AvailableModuleDefinition {
  framework: string;
  name: string;
  package: string;
  version: string;
  description: string;
  license: string;
  repository?: string;
  cloned?: boolean;
  built?: boolean;
  installed?: boolean;
  /** Icon URL or Lucide icon reference (e.g., "lucide:Database") */
  logoUrl?: string;
  displayName?: string;
}

// Script-specific types
export interface ScriptModule {
  id: string;
  summary?: string;
  value: {
    type: 'script' | 'forloopflow' | 'branchone' | 'branchall';
    path?: string;
    content?: string;
    language?: 'deno' | 'python3' | 'go' | 'bash' | 'sql' | 'typescript' | 'javascript';
    lock?: string;
    inputTransforms?: Record<string, any>;
    modules?: ScriptModule[]; // For flow types
    iterator?: { expr: string; type: string }; // For forloopflow
    branches?: { expr: string; modules: ScriptModule[] }[]; // For branches
    parallel?: boolean;
    skipFailures?: boolean;
  };
  stopAfterIf?: {
    expr: string;
    skipIfStopped?: boolean;
  };
}

export interface ScriptWorkflow {
  summary: string;
  description?: string;
  value: {
    modules: ScriptModule[];
    failureModule?: ScriptModule;
  };
  schema: {
    type: string;
    $schema: string;
    required?: string[];
    properties: Record<string, any>;
  };
}

// Node templates for UI
export interface NodeTemplate {
  id: string;
  label: string;
  framework: 'n8n' | 'activepieces' | 'script' | 'bits';
  module: string;
  icon?: string;
  color: string;
  description?: string;
  resources?: {
    name: string;
    operations: string[];
  }[];
  // Script-specific template properties
  scriptType?: 'script' | 'flow';
  language?: 'deno' | 'python3' | 'go' | 'bash' | 'sql' | 'typescript';
}

// Execution API types
export interface ExecutionRequest {
  framework: string;
  module: string;
  async?: boolean;
  params: Record<string, any>;
}

// Webhook trigger types
export interface WebhookTriggerInfo {
  nodeId: string;
  path: string;
  method?: string;
  authType?: 'none' | 'header' | 'query_param';
  authFields?: Record<string, any>;
}

export interface WebhookPayload {
  nodeId: string;
  payload: any;
  headers?: Record<string, string>;
  query?: Record<string, string>;
}

// Multi-workflow configuration types
export interface WorkflowReference {
  id?: string; // Optional - if not provided, uses the id from the workflow JSON file
  path: string; // Path to workflow JSON file (relative to config.json or absolute)
  enabled?: boolean; // Whether this workflow is enabled (default: true)
  webhookTimeout?: number; // Optional per-workflow webhook timeout
}

/**
 * Modules operation mode:
 * - 'restricted': Only allows using modules already defined in modules.json
 * - 'open': Allows adding any module and appends it to modules.json if it doesn't exist
 */
export type ModulesMode = 'restricted' | 'open';

export interface WorkflowConfig {
  version?: string;
  workflows: WorkflowReference[];
  server?: {
    port?: number;
    host?: string;
    webhookPort?: number; // Deprecated: webhooks now served on same port under /webhook
    webhookHost?: string; // Deprecated: webhooks now served on same port under /webhook
    frontend?: string; // Path to static frontend folder to serve at "/" (relative to config.json or absolute)
    openapi?: boolean; // Enable OpenAPI/Swagger documentation at /api/docs (default: false)
  };
  modules?: {
    mode?: ModulesMode; // 'restricted' (default) or 'open' - can also be set via HABITS_MODULES_MODE env var
  };
  defaults?: {
    webhookTimeout?: number;
  };
  /**
   * Application configuration for desktop/mobile builds
   */
  application?: {
    /** Custom URL scheme for OAuth deep links (e.g., "myapp" for myapp://oauth/callback) */
    scheme?: string;
    /** Application display name (used in Tauri builds) */
    name?: string;
    /** Application identifier (e.g., "com.mycompany.myapp") */
    identifier?: string;
  };
  /**
   * Logging configuration
   * Can be overridden by environment variables (HABITS_LOG_*)
   */
  logging?: {
    /** Default log level: trace, debug, info, warn, error, fatal, none */
    level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'none';
    /** Output destinations */
    outputs?: ('console' | 'file' | 'json')[];
    /** File output configuration */
    file?: {
      path?: string;
      maxSize?: string; // e.g., '10mb'
      maxFiles?: number;
    };
    /** Output format for console/file */
    format?: 'text' | 'json';
    /** Enable colors in console output */
    colorize?: boolean;
    /** Per-bit log level overrides (e.g., { 'bit-http': 'debug' }) */
    bitOverrides?: Record<string, 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'none'>;
  };
}

export interface LoadedWorkflow {
  reference: WorkflowReference;
  workflow: Workflow;
}

export function isFrontendWorkflow(workflow: Workflow): workflow is FrontendWorkflow {
  return 'nodes' in workflow && 'edges' in workflow && Array.isArray(workflow.nodes) && Array.isArray(workflow.edges);
}

// ============================================================================
// Execution Response Types (shared between streaming and non-streaming)
// ============================================================================

/**
 * Base execution context - common fields for all responses
 */
export interface ExecutionContext {
  executionId: string;
  workflowId: string;
}

/**
 * Node result - emitted when a node completes or fails
 * Used in both streaming (per-node) and non-streaming (in nodeResults array)
 */
export interface NodeResult extends ExecutionContext {
  nodeId: string;
  nodeName: string;
  status: 'completed' | 'failed';
  output?: any;
  error?: string;
  duration?: number;
}

/**
 * Execution summary - final execution status
 * Used in both streaming (final event) and non-streaming (response)
 */
export interface ExecutionSummary extends ExecutionContext {
  status: 'completed' | 'failed' | 'cancelled';
  output?: any;
  error?: string;
  startTime: string;
  endTime: string;
}

/**
 * Full execution response (non-streaming mode)
 * Contains summary plus optional node results
 */
export interface ExecutionResponse extends ExecutionSummary {
  nodeResults?: NodeResult[];
}

// ============================================================================
// Streaming Types
// ============================================================================

export type StreamEventType = 'execution_started' | 'node_started' | 'node_completed' | 'node_failed' | 'execution_completed' | 'execution_failed';

/**
 * Minimal node stream event (non-debug mode)
 * Mirrors NodeResult structure for consistency
 */
export interface StreamNodeEvent extends NodeResult {
  type?: 'node_completed' | 'node_failed';
}

/**
 * Minimal execution stream event (non-debug mode)  
 * Mirrors ExecutionSummary structure for consistency
 */
export interface StreamExecutionEvent extends ExecutionContext {
  type: 'execution_completed' | 'execution_failed';
  status: 'completed' | 'failed';
  output?: any;
  error?: string;
}

/**
 * Verbose stream event - contains all fields (used in debug mode)
 */
export interface StreamEvent extends ExecutionContext {
  type: StreamEventType;
  timestamp: string;
  nodeId?: string;
  nodeName?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: any; // Alias for output in verbose mode
  output?: any; // Final workflow output (only in execution_completed)
  error?: string;
  duration?: number;
  progress?: {
    completed: number;
    total: number;
    percentage: number;
  };
}

export type StreamCallback = (event: StreamEvent) => void;

// Common framework types
export type Framework = 'activepieces' | 'n8n' | 'script' | 'bits';
export type StepType = 'trigger' | 'action';
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ScriptLanguage = 'deno' | 'python3' | 'go' | 'bash' | 'sql' | 'typescript';
export type ScriptModuleType = 'script' | 'forloopflow' | 'branchone' | 'branchall';