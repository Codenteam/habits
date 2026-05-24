import * as path from 'path';
import type { Workflow } from '@habits/shared/types';
import type { BitsExecutionParams } from '@ha-bits/cortex-core';
import type { ILogger } from '@ha-bits/core/logger';
import { LoggerFactory } from '@ha-bits/core/logger';
import {
  collectEnvVarReferences,
  defaultDataFlowPath,
  writeDataFlowFile,
} from './io';
import { pickEnvSnapshot, redactInput } from './redaction';
import type { CaptureSessionOptions, DataFlowNodeRecord } from './types';

export class DataFlowRecorder {
  private readonly workflow: Workflow;
  private readonly options: CaptureSessionOptions;
  private readonly env: Record<string, string | undefined>;
  private readonly logger: ILogger;
  private readonly redactSecrets: boolean;
  private readonly nodes: DataFlowNodeRecord[] = [];
  private habitInput: Record<string, unknown> = {};
  private envSnapshot: Record<string, string> = {};

  constructor(options: CaptureSessionOptions) {
    this.workflow = options.workflow;
    this.options = options;
    this.env = options.env ?? {};
    this.logger = options.logger ?? LoggerFactory.getRoot();
    this.redactSecrets = options.redactSecrets !== false;
    this.habitInput = redactInput(options.habitInput ?? {}, this.redactSecrets);
    this.envSnapshot = pickEnvSnapshot(
      this.env,
      collectEnvVarReferences(this.workflow),
      this.redactSecrets,
    );
  }

  recordBitsExecution(
    params: BitsExecutionParams,
    output: unknown,
    success: boolean,
    durationMs: number,
    error?: string,
  ): void {
    if (!params.nodeId) {
      return;
    }

    this.nodes.push({
      nodeId: params.nodeId,
      framework: params.framework || 'bits',
      module: params.moduleName,
      operation: params.params?.operation,
      input: redactInput(params.params ?? {}, this.redactSecrets),
      output: success ? output : undefined,
      success,
      durationMs,
      error,
    });
  }

  flush(execution: {
    id: string;
    workflowId: string;
    output?: unknown;
  }): string {
    const configPath = this.options.configPath;
    if (!configPath) {
      throw new Error('Capture session requires configPath');
    }

    const configDir = path.dirname(path.resolve(configPath));
    const filePath = this.options.filePath || defaultDataFlowPath(configDir);

    writeDataFlowFile(filePath, configPath, execution.workflowId, {
      workflowName: this.workflow.name,
      executionId: execution.id,
      habitInput: this.habitInput,
      env: Object.keys(this.envSnapshot).length > 0 ? this.envSnapshot : undefined,
      nodes: this.nodes,
      workflowOutput: execution.output,
    });

    this.logger.log(`📼 Data-flow captured to ${filePath} (${this.nodes.length} node(s))`);
    return filePath;
  }
}
