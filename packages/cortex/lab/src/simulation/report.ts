import type { Workflow, WorkflowExecution } from '@habits/shared/types';
import type { NodeSimulation, SimulationReport, SimulationStatus } from './types';

export function buildDryRunReport(
  workflow: Workflow,
  execution: WorkflowExecution,
  accessLog: Map<string, Set<string>>,
  opts: { habitPath?: string; durationMs: number },
): SimulationReport {
  const nodeSimulations: NodeSimulation[] = (workflow.nodes || []).map(node => ({
    nodeId: node.id,
    nodeName: node.data?.label || node.id,
    framework: node.data?.framework || 'unknown',
    module: node.data?.module,
    resolvedParams: {},
    accessedFields: Array.from(accessLog.get(node.id) || []),
    issues: [],
  }));

  const errors = execution.status === 'failed'
    ? [{
        severity: 'error' as const,
        code: 'EXECUTION_FAILED',
        message: 'Workflow execution failed during dry-run graph walk',
      }]
    : [];

  const status: SimulationStatus = errors.length > 0 ? 'error' : 'pass';

  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    status,
    checks: {
      structure: [],
      environment: [],
      inputValidation: [],
      dataFlow: nodeSimulations,
      outputResolution: [],
      frontendAnalysis: [],
    },
    simulatedOutput: execution.output ?? null,
    warnings: [],
    errors,
    metadata: {
      habitPath: opts.habitPath ?? '',
      timestamp: new Date().toISOString(),
      durationMs: opts.durationMs,
    },
  };
}

export function printSimulationReport(report: SimulationReport): void {
  if (report.errors.length === 0 && report.warnings.length === 0) {
    return;
  }
  for (const error of report.errors) {
    // eslint-disable-next-line no-console
    console.error(`[sim:error] ${error.code} ${error.message}`);
  }
  for (const warning of report.warnings) {
    // eslint-disable-next-line no-console
    console.warn(`[sim:warn] ${warning.code} ${warning.message}`);
  }
}
