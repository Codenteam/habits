export type SimulationStatus = 'pass' | 'warning' | 'error';
export type IssueSeverity = 'warning' | 'error';

export interface SimulationIssue {
  severity: IssueSeverity;
  /** Short machine-readable code, e.g. MISSING_ENV, BROKEN_REF */
  code: string;
  message: string;
  location?: string;   // nodeId, field path, or file path
  suggestion?: string;
}

export interface NodeSimulation {
  nodeId: string;
  nodeName: string;
  framework: string;
  module?: string;
  /** Resolved parameters after template substitution with real input + env */
  resolvedParams: Record<string, any>;
  /** Every field path accessed on this node's output by downstream templates */
  accessedFields: string[];
  issues: SimulationIssue[];
}

export interface SimulationReport {
  workflowId: string;
  workflowName: string;
  status: SimulationStatus;
  checks: {
    structure: SimulationIssue[];
    environment: SimulationIssue[];
    inputValidation: SimulationIssue[];
    dataFlow: NodeSimulation[];
    outputResolution: SimulationIssue[];
    frontendAnalysis: SimulationIssue[];
  };
  /** Output shape with [sim:nodeId.field] placeholders where bits would produce values */
  simulatedOutput: Record<string, any> | null;
  warnings: SimulationIssue[];
  errors: SimulationIssue[];
  metadata: {
    habitPath: string;
    timestamp: string;
    durationMs: number;
  };
}

export interface SimulateOptions {
  /** Path to the habit config file (stack.yaml or .habit), used for frontend analysis */
  habitPath?: string;
  /** Resolved config directory (may differ from habitPath dirname for .habit files) */
  configDir?: string;
  /** Print colored summary to the server terminal */
  printSummary?: boolean;
}
