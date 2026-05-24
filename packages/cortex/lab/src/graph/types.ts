import type { UiSpec } from '@ha-bits/cortex-core/ui/types';

export type GraphLayer =
  | 'source'
  | 'state'
  | 'ui'
  | 'workflow'
  | 'output'
  | 'response';

export type GraphNodeStatus = 'ok' | 'warning' | 'error' | 'disconnected';

export type GraphIssueSeverity = 'error' | 'warning';

export interface GraphIssue {
  severity: GraphIssueSeverity;
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
  suggestion?: string;
}

export interface HabitGraphNode {
  id: string;
  label: string;
  layer: GraphLayer;
  layerIndex: number;
  status: GraphNodeStatus;
  issues: GraphIssue[];
  meta?: Record<string, string>;
}

export interface HabitGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  status: GraphNodeStatus;
  issues: GraphIssue[];
}

export interface HabitGraph {
  nodes: HabitGraphNode[];
  edges: HabitGraphEdge[];
}

export interface HabitGraphReport {
  ok: boolean;
  graph: HabitGraph;
  issues: GraphIssue[];
  errors: GraphIssue[];
  warnings: GraphIssue[];
  summary: {
    nodeCount: number;
    edgeCount: number;
    errorCount: number;
    warningCount: number;
  };
}

export interface GraphHabitInput {
  id: string;
  name: string;
  nodes: Array<{
    id: string;
    data?: {
      params?: Record<string, unknown>;
      credentials?: Record<string, unknown>;
      label?: string;
      [key: string]: unknown;
    };
  }>;
  edges: Array<{ source: string; target: string }>;
  output?: Record<string, string | { value?: string; [key: string]: unknown }>;
  input?: Array<{ name?: string; id?: string; [key: string]: unknown }>;
}

export interface BuildHabitGraphInput {
  workflowIds: string[];
  habits: GraphHabitInput[];
  uiSpec?: UiSpec | null;
  uiSpecYaml?: string | null;
  envKeys?: string[];
}

export interface ValidateGraphOptions {
  strict?: boolean;
}
