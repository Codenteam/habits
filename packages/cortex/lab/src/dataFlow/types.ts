export const DATA_FLOW_VERSION = 1;

export interface DataFlowNodeRecord {
  nodeId: string;
  framework: string;
  module?: string;
  operation?: string;
  input: Record<string, unknown>;
  output?: unknown;
  success: boolean;
  durationMs: number;
  error?: string;
}

export interface DataFlowWorkflowRecord {
  workflowName: string;
  executionId: string;
  habitInput: Record<string, unknown>;
  env?: Record<string, string>;
  nodes: DataFlowNodeRecord[];
  workflowOutput?: unknown;
}

export interface DataFlowFile {
  version: number;
  configPath: string;
  capturedAt: string;
  workflows: Record<string, DataFlowWorkflowRecord>;
}

export interface CaptureSessionOptions {
  configPath: string;
  filePath?: string;
  workflow: import('@habits/shared/types').Workflow;
  env?: Record<string, string | undefined>;
  habitInput?: Record<string, unknown>;
  redactSecrets?: boolean;
  logger?: import('@ha-bits/core/logger').ILogger;
}

export interface ReplaySessionOptions {
  filePath: string;
  liveNodes?: string[];
  assertInputs?: boolean;
  workflow: import('@habits/shared/types').Workflow;
  logger?: import('@ha-bits/core/logger').ILogger;
}

export interface DryRunSessionOptions {
  configPath?: string;
  configDir?: string;
  workflow: import('@habits/shared/types').Workflow;
  printSummary?: boolean;
}
