export interface Execution {
  id: string;
  workflowId: string;
  workflowName?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  completedNodes: number;
  nodeCount: number;
  currentNode?: string;
}

export interface ExecutionDetails extends Execution {
  inputParams?: Record<string, unknown>;
  output?: unknown;
  nodeStatuses: NodeStatus[];
}

export interface NodeStatus {
  nodeId: string;
  nodeName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: unknown;
  error?: string;
  duration?: number;
}

export interface Workflow {
  id: string;
  name: string;
  nodeCount: number;
  enabled: boolean;
}

export interface Stats {
  total: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}
