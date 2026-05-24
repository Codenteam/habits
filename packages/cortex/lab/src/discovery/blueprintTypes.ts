export const DATA_FLOW_BLUEPRINT_VERSION = 1;
export const DATA_FLOW_BLUEPRINT_KIND = 'blueprint' as const;

/** Schema for a habit input field (no runtime value). */
export interface DataFlowInputFieldBlueprint {
  type?: string;
  required?: boolean;
  default?: unknown;
  label?: string;
  description?: string;
  displayAs?: string;
}

/** Per-node static trace — mirrors capture shape with templates / placeholders. */
export interface DataFlowNodeBlueprint {
  nodeId: string;
  framework: string;
  module?: string;
  operation?: string;
  /** Unresolved param templates from the habit YAML. */
  input: Record<string, unknown>;
  /** Placeholder for bit output, e.g. "[discover:say-hello]". */
  output: string;
}

export interface DataFlowWorkflowBlueprint {
  workflowName: string;
  /** Field schemas keyed by input name. */
  habitInput: Record<string, DataFlowInputFieldBlueprint>;
  /** Referenced env vars as template strings. */
  env?: Record<string, string>;
  /** Nodes in execution order (from edges, or declaration order). */
  executionOrder: string[];
  nodes: DataFlowNodeBlueprint[];
  /** Output mapping templates from habit YAML. */
  workflowOutput: Record<string, unknown>;
}

/**
 * Static data-flow blueprint — same top-level shape as {@link DataFlowFile}
 * but with schemas/templates instead of captured runtime values.
 */
export interface DataFlowBlueprintFile {
  version: number;
  kind: typeof DATA_FLOW_BLUEPRINT_KIND;
  configPath: string;
  discoveredAt: string;
  workflows: Record<string, DataFlowWorkflowBlueprint>;
}

export interface DataFlowBlueprintReport {
  blueprint: DataFlowBlueprintFile;
  configPath: string;
}
