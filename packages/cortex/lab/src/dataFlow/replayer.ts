import type { Workflow } from '@habits/shared/types';
import type { BitsExecutionParams } from '@ha-bits/cortex-core';
import type { ILogger } from '@ha-bits/core/logger';
import { LoggerFactory } from '@ha-bits/core/logger';
import { getWorkflowRecord, readDataFlowFile } from './io';
import { redactInput } from './redaction';
import type { ReplaySessionOptions } from './types';

export class DataFlowReplayer {
  private readonly workflowRecord: ReturnType<typeof getWorkflowRecord>;
  private readonly liveNodeSet: Set<string>;
  private readonly assertInputs: boolean;
  private readonly logger: ILogger;

  constructor(options: ReplaySessionOptions & { workflow: Workflow }) {
    const filePath = options.filePath;
    if (!filePath) {
      throw new Error('Replay session requires filePath');
    }

    const file = readDataFlowFile(filePath);
    this.workflowRecord = getWorkflowRecord(file, options.workflow.id);
    this.liveNodeSet = new Set(options.liveNodes || []);
    this.assertInputs = options.assertInputs === true;
    this.logger = options.logger ?? LoggerFactory.getRoot();

    this.warnNodeMismatches(options.workflow);
  }

  shouldMock(nodeId: string | undefined): boolean {
    if (!nodeId) {
      return false;
    }
    return !this.liveNodeSet.has(nodeId);
  }

  assertInput(params: BitsExecutionParams): void {
    if (!this.assertInputs || !params.nodeId) {
      return;
    }

    const record = this.workflowRecord.nodes.find(node => node.nodeId === params.nodeId);
    if (!record) {
      throw new Error(`No recorded input for node "${params.nodeId}" in data-flow file`);
    }

    const actual = redactInput(params.params ?? {}, true);
    const expected = record.input;

    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(
        `Data-flow input mismatch for node "${params.nodeId}":\n` +
        `Expected: ${JSON.stringify(expected)}\n` +
        `Actual: ${JSON.stringify(actual)}`,
      );
    }
  }

  getOutput(nodeId: string): unknown {
    const record = this.workflowRecord.nodes.find(node => node.nodeId === nodeId);
    if (!record) {
      throw new Error(`No recorded data for node "${nodeId}" in data-flow file`);
    }
    if (!record.success) {
      throw new Error(`Recorded node "${nodeId}" failed: ${record.error || 'unknown error'}`);
    }
    return record.output;
  }

  private warnNodeMismatches(workflow: Workflow): void {
    const habitNodeIds = new Set((workflow.nodes || []).map(node => node.id));
    const recordedNodeIds = new Set(this.workflowRecord.nodes.map(node => node.nodeId));

    for (const nodeId of habitNodeIds) {
      if (!recordedNodeIds.has(nodeId) && !this.liveNodeSet.has(nodeId)) {
        this.logger.warn(
          `Data-flow replay: node "${nodeId}" is not in capture and is not listed as live — execution may fail`,
        );
      }
    }
  }
}
