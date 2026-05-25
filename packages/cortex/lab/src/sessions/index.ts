import type { WorkflowExecution } from '@habits/shared/types';
import * as path from 'path';
import {
  runWithExecutionOverrides,
  type BitsExecutionParams,
  type BitsExecutionResult,
} from '@ha-bits/cortex-core';
import { DataFlowRecorder } from '../dataFlow/recorder';
import { DataFlowReplayer } from '../dataFlow/replayer';
import { defaultDataFlowPath } from '../dataFlow/io';
import type { CaptureSessionOptions, DryRunSessionOptions, ReplaySessionOptions } from '../dataFlow/types';
import { createBitsProxy } from '../proxy/createBitsProxy';
import { createProxyMock } from '../simulation/MockOutputFactory';
import { buildDryRunReport, printSimulationReport } from '../simulation/report';

export async function runCaptureSession(
  options: CaptureSessionOptions,
  run: () => Promise<WorkflowExecution>,
): Promise<WorkflowExecution> {
  const recorder = new DataFlowRecorder(options);

  const executeBits = createBitsProxy(async (params, invoke) => {
    const start = Date.now();
    try {
      const result = await invoke(params);
      recorder.recordBitsExecution(params, result.result, true, Date.now() - start);
      return result;
    } catch (error: any) {
      recorder.recordBitsExecution(
        params,
        undefined,
        false,
        Date.now() - start,
        error?.message || String(error),
      );
      throw error;
    }
  });

  return runWithExecutionOverrides({ executeBits }, async () => {
    const execution = await run();
    recorder.flush(execution);
    return execution;
  });
}

export async function runReplaySession(
  options: ReplaySessionOptions,
  run: () => Promise<WorkflowExecution>,
): Promise<WorkflowExecution> {
  const replayer = new DataFlowReplayer(options);

  const executeBits = createBitsProxy(async (params, invoke) => {
    if (!replayer.shouldMock(params.nodeId)) {
      return invoke(params);
    }

    replayer.assertInput(params);
    const output = replayer.getOutput(params.nodeId!);
    return mockBitsResult(params, output);
  });

  return runWithExecutionOverrides({ executeBits }, run);
}

export async function runDryRunSession(
  options: DryRunSessionOptions,
  run: () => Promise<WorkflowExecution>,
): Promise<{ execution: WorkflowExecution; report: ReturnType<typeof buildDryRunReport> }> {
  const accessLog = new Map<string, Set<string>>();
  const startTime = Date.now();

  const executeBits = createBitsProxy(async (params) => {
    if (!params.nodeId) {
      return mockBitsResult(params, null);
    }
    return mockBitsResult(params, createProxyMock(params.nodeId, accessLog));
  });

  const execution = await runWithExecutionOverrides({ executeBits }, run);
  const report = buildDryRunReport(options.workflow, execution, accessLog, {
    habitPath: options.configPath,
    durationMs: Date.now() - startTime,
  });

  if (options.printSummary) {
    printSimulationReport(report);
  }

  return { execution, report };
}

function mockBitsResult(
  params: BitsExecutionParams,
  output: unknown,
): BitsExecutionResult {
  return {
    success: true,
    module: params.moduleName,
    pieceLoaded: true,
    params: params.params,
    result: output,
    executedAt: new Date().toISOString(),
    data: {
      message: 'mocked by @ha-bits/cortex-lab',
      status: 'completed',
      pieceExports: [],
    },
  };
}

export { defaultDataFlowPath } from '../dataFlow/io';
export type { CaptureSessionOptions, ReplaySessionOptions, DryRunSessionOptions } from '../dataFlow/types';
export type { SimulationReport } from '../simulation/types';

export interface LabExecutionOptions {
  capture?: boolean;
  configPath?: string;
  configDir?: string;
  dataFlowPath?: string;
  replay?: string | null;
  liveNodes?: string[];
  assertInputs?: boolean;
  habitInput?: Record<string, unknown>;
  env?: NodeJS.ProcessEnv;
  workflow: import('@habits/shared/types').Workflow;
}

/**
 * Dispatch capture/replay session modes for a workflow execution callback.
 * Shared by the habits CLI and cortex server.
 */
export async function runWorkflowWithLabOptions(
  options: LabExecutionOptions,
  run: () => Promise<WorkflowExecution>,
): Promise<WorkflowExecution> {
  if (options.capture && options.replay) {
    throw new Error('Use either capture or replay, not both');
  }

  if (options.capture) {
    const resolvedConfigPath = options.configPath ? path.resolve(options.configPath) : undefined;
    const configDir = options.configDir
      ?? (resolvedConfigPath ? path.dirname(resolvedConfigPath) : undefined);
    if (!resolvedConfigPath) {
      throw new Error('Capture mode requires configPath so capture metadata can be written');
    }
    return runCaptureSession({
      configPath: resolvedConfigPath,
      filePath: options.dataFlowPath || (configDir ? defaultDataFlowPath(configDir) : undefined),
      workflow: options.workflow,
      env: options.env ?? process.env,
      habitInput: options.habitInput,
    }, run);
  }

  if (options.replay) {
    return runReplaySession({
      filePath: path.resolve(options.replay),
      liveNodes: options.liveNodes,
      assertInputs: options.assertInputs === true,
      workflow: options.workflow,
    }, run);
  }

  return run();
}
