import type { Workflow } from '@habits/shared/types';
import { WorkflowExecutor } from '@ha-bits/cortex-core';
import {
  buildAndValidateHabitGraph,
  type BuildHabitGraphInput,
  type GraphHabitInput,
  type HabitGraphReport,
  type ValidateGraphOptions,
} from '../graph';
import { discoverDataFlowBlueprintFromInput } from '../discovery/discoverDataFlowBlueprint';
import type { DataFlowBlueprintFile } from '../discovery/blueprintTypes';
import { runDryRunSession } from '../sessions';
import type { SimulationReport } from '../simulation/types';

export interface HabitLabValidationReport {
  ok: boolean;
  discovery: HabitGraphReport;
  blueprint: DataFlowBlueprintFile;
  dryRun: Array<{
    workflowId: string;
    workflowName: string;
    report: SimulationReport;
  }>;
  summary: {
    discoveryErrors: number;
    discoveryWarnings: number;
    dryRunErrors: number;
    dryRunWarnings: number;
  };
}

function buildSyntheticInput(habit: GraphHabitInput): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const field of habit.input || []) {
    const name = field.name ?? field.id;
    if (!name) continue;
    const def = (field as { default?: unknown }).default;
    const type = (field as { type?: string }).type;
    if (def !== undefined) {
      input[name] = def;
    } else if (type === 'boolean') {
      input[name] = false;
    } else if (type === 'number') {
      input[name] = 0;
    } else {
      input[name] = `[discover:${name}]`;
    }
  }
  return input;
}

function buildEnvRecord(envKeys: string[] = []): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of envKeys) {
    env[key] = `[discover:env:${key}]`;
  }
  return env;
}

export async function validateHabitLab(
  input: BuildHabitGraphInput,
  options: ValidateGraphOptions = {},
): Promise<HabitLabValidationReport> {
  const discovery = buildAndValidateHabitGraph(input, options);
  const { blueprint } = discoverDataFlowBlueprintFromInput(input);
  const dryRun = await runHabitLabDryRun(input);

  if (input.habits.length === 0) {
    return {
      ok: discovery.ok,
      discovery,
      blueprint,
      dryRun,
      summary: {
        discoveryErrors: discovery.summary.errorCount,
        discoveryWarnings: discovery.summary.warningCount,
        dryRunErrors: 0,
        dryRunWarnings: 0,
      },
    };
  }

  const dryRunErrors = dryRun.reduce(
    (n, item) => n + item.report.errors.length + (item.report.status === 'error' ? 1 : 0),
    0,
  );
  const dryRunWarnings = dryRun.reduce((n, item) => n + item.report.warnings.length, 0);

  return {
    ok: discovery.ok && dryRun.every((item) => item.report.status !== 'error'),
    discovery,
    blueprint,
    dryRun,
    summary: {
      discoveryErrors: discovery.summary.errorCount,
      discoveryWarnings: discovery.summary.warningCount,
      dryRunErrors,
      dryRunWarnings,
    },
  };
}

export interface HabitLabDryRunReport {
  ok: boolean;
  dryRun: HabitLabValidationReport['dryRun'];
  summary: {
    dryRunErrors: number;
    dryRunWarnings: number;
  };
}

export async function validateHabitLabDryRun(
  input: BuildHabitGraphInput,
): Promise<HabitLabDryRunReport> {
  const dryRun = await runHabitLabDryRun(input);
  const dryRunErrors = dryRun.reduce(
    (n, item) => n + item.report.errors.length + (item.report.status === 'error' ? 1 : 0),
    0,
  );
  const dryRunWarnings = dryRun.reduce((n, item) => n + item.report.warnings.length, 0);

  return {
    ok: dryRun.every((item) => item.report.status !== 'error'),
    dryRun,
    summary: {
      dryRunErrors,
      dryRunWarnings,
    },
  };
}

async function runHabitLabDryRun(
  input: BuildHabitGraphInput,
): Promise<HabitLabValidationReport['dryRun']> {
  const dryRun: HabitLabValidationReport['dryRun'] = [];

  if (input.habits.length === 0) {
    return dryRun;
  }

  const executor = new WorkflowExecutor();
  const workflowsMap = new Map<string, Workflow>();
  for (const habit of input.habits) {
    workflowsMap.set(habit.id, habit as unknown as Workflow);
  }

  const env = buildEnvRecord(input.envKeys);
  await executor.initFromData({
    config: {
      version: '1.0',
      workflows: input.habits.map((h) => ({ id: h.id, path: '', enabled: true })),
    },
    workflows: workflowsMap,
    env,
  });

  for (const habit of input.habits) {
    const workflow = workflowsMap.get(habit.id)!;
    const syntheticInput = buildSyntheticInput(habit);
    const { report } = await runDryRunSession({
      workflow,
      printSummary: false,
    }, () => executor.executeWorkflow(workflow, {
      initialContext: {
        habits: {
          input: syntheticInput,
        },
      },
    }));

    dryRun.push({
      workflowId: workflow.id,
      workflowName: workflow.name,
      report,
    });
  }

  return dryRun;
}

export function validateHabitLabDiscovery(
  input: BuildHabitGraphInput,
  options: ValidateGraphOptions = {},
): HabitGraphReport {
  return buildAndValidateHabitGraph(input, options);
}
