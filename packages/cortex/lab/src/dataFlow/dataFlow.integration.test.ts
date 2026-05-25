/**
 * Integration test: capture and replay hello-world habit execution.
 *
 * Run with: pnpm jest --config packages/cortex/lab/jest.config.js
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
import { WorkflowExecutor } from '@ha-bits/cortex-core';
import {
  readDataFlowFile,
  defaultDataFlowPath,
  runCaptureSession,
  runReplaySession,
} from '@ha-bits/cortex-lab';

const workspaceRoot = path.resolve(__dirname, '../../../../..');
const showcaseDir = path.join(workspaceRoot, 'showcase/hello-world');
const stackPath = path.join(showcaseDir, 'stack.yaml');

describe('hello-world data-flow capture and replay', () => {
  let tmpDir: string;
  let dataFlowPath: string;

  beforeAll(() => {
    if (!fs.existsSync(stackPath)) {
      throw new Error(`Missing fixture: ${stackPath}`);
    }
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'data-flow-integration-'));
    dataFlowPath = path.join(tmpDir, 'data-flow.yaml');
  });

  async function loadHelloWorldExecutor(): Promise<WorkflowExecutor> {
    const config = parseYaml(fs.readFileSync(stackPath, 'utf8'));
    const configDir = path.dirname(stackPath);
    const workflows = new Map<string, any>();

    for (const ref of config.workflows) {
      if (ref.enabled === false) continue;
      const workflowPath = path.resolve(configDir, ref.path);
      const workflow = parseYaml(fs.readFileSync(workflowPath, 'utf8'));
      workflow.id = ref.id || workflow.id;
      workflows.set(workflow.id, workflow);
    }

    const executor = new WorkflowExecutor();
    await executor.initFromData({ config, workflows });
    return executor;
  }

  it('captures a real run and replays with identical workflow output', async () => {
    const executor = await loadHelloWorldExecutor();
    const input = { param1: 'hello', param2: 'world' };
    const workflow = executor.getWorkflow('hello-world')!.workflow;

    const captureResult = await runCaptureSession({
      configPath: stackPath,
      filePath: dataFlowPath,
      workflow,
      habitInput: input,
    }, () => executor.executeWorkflow('hello-world', {
      initialContext: { habits: { input } },
    }));

    expect(captureResult.status).toBe('completed');
    expect(captureResult.output?.greeting?.value).toBe('HELLO_THERE');

    const captured = readDataFlowFile(dataFlowPath);
    expect(captured.workflows['hello-world']).toBeDefined();
    expect(captured.workflows['hello-world'].nodes).toHaveLength(1);
    expect(captured.workflows['hello-world'].nodes[0].output).toBe('HELLO_THERE');

    const replayExecutor = await loadHelloWorldExecutor();
    const replayWorkflow = replayExecutor.getWorkflow('hello-world')!.workflow;

    const replayResult = await runReplaySession({
      filePath: dataFlowPath,
      workflow: replayWorkflow,
    }, () => replayExecutor.executeWorkflow('hello-world', {
      initialContext: { habits: { input } },
    }));

    expect(replayResult.status).toBe('completed');
    expect(replayResult.output).toEqual(captureResult.output);
  });

  it('runs live nodes during mixed replay', async () => {
    const executor = await loadHelloWorldExecutor();
    const input = { param1: 'hello', param2: 'world' };
    const workflow = executor.getWorkflow('hello-world')!.workflow;

    await runCaptureSession({
      configPath: stackPath,
      filePath: dataFlowPath,
      workflow,
      habitInput: input,
    }, () => executor.executeWorkflow('hello-world', {
      initialContext: { habits: { input } },
    }));

    const replayExecutor = await loadHelloWorldExecutor();
    const replayWorkflow = replayExecutor.getWorkflow('hello-world')!.workflow;

    const replayResult = await runReplaySession({
      filePath: dataFlowPath,
      liveNodes: ['say-hello'],
      workflow: replayWorkflow,
    }, () => replayExecutor.executeWorkflow('hello-world', {
      initialContext: { habits: { input } },
    }));

    expect(replayResult.status).toBe('completed');
    expect(replayResult.output?.greeting?.value).toBe('HELLO_THERE');
  });

  it('writes capture beside config dir by default', () => {
    expect(defaultDataFlowPath(showcaseDir)).toBe(path.join(showcaseDir, 'data-flow.yaml'));
  });
});
