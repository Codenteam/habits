import type { SimulateOptions, SimulationReport } from './types';

/**
 * Placeholder simulation executor.
 *
 * Re-exported from `@ha-bits/cortex-core` for downstream package
 * compatibility. The real implementation lives elsewhere or has not been
 * ported yet; calling `simulate` returns a minimal pass report so consumers
 * remain functional during the transition.
 */
export class SimulationExecutor {
  constructor(_executor?: unknown) {
    /* noop */
  }

  async simulate(opts: SimulateOptions = {}): Promise<SimulationReport> {
    return {
      workflowId: '',
      workflowName: '',
      status: 'pass',
      checks: {
        structure: [],
        environment: [],
        inputValidation: [],
        dataFlow: [],
        outputResolution: [],
        frontendAnalysis: [],
      },
      simulatedOutput: null,
      warnings: [],
      errors: [],
      metadata: {
        habitPath: opts.habitPath ?? '',
        timestamp: new Date().toISOString(),
        durationMs: 0,
      },
    };
  }
}

export function printSimulationReport(report: SimulationReport): void {
  // Minimal pass-through so callers compile.
  if (report.errors.length === 0 && report.warnings.length === 0) {
    return;
  }
  for (const e of report.errors) {
    // eslint-disable-next-line no-console
    console.error(`[sim:error] ${e.code} ${e.message}`);
  }
  for (const w of report.warnings) {
    // eslint-disable-next-line no-console
    console.warn(`[sim:warn] ${w.code} ${w.message}`);
  }
}
