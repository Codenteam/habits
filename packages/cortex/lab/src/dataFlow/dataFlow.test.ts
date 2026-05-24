import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  collectEnvVarReferences,
  readDataFlowFile,
  writeDataFlowFile,
  toRelativeConfigPath,
  DataFlowReplayer,
  redactInput,
  pickEnvSnapshot,
  DATA_FLOW_VERSION,
} from './index';
import type { Workflow } from '@habits/shared/types';
import { LoggerFactory } from '@ha-bits/core/logger';

describe('dataFlow redaction', () => {
  it('strips credentials and secret-like keys', () => {
    const input = {
      param1: 'hello',
      credentials: { apiKey: 'secret' },
      API_KEY: 'hidden',
      nested: { ACCESS_TOKEN: 'tok' },
    };

    expect(redactInput(input)).toEqual({
      param1: 'hello',
      nested: {},
    });
  });

  it('omits secret env vars from snapshot', () => {
    const env = {
      PARAM1: 'visible',
      API_KEY: 'hidden',
      OPENAI_API_KEY: 'hidden',
    };

    expect(pickEnvSnapshot(env, ['PARAM1', 'API_KEY', 'OPENAI_API_KEY'], true)).toEqual({
      PARAM1: 'visible',
    });
  });
});

describe('dataFlow io', () => {
  it('stores configPath relative to cwd, not as an absolute path', () => {
    const cwd = process.cwd();
    const absolute = path.join(cwd, 'showcase/hello-world/stack.yaml');
    expect(toRelativeConfigPath(absolute, cwd)).toBe('showcase/hello-world/stack.yaml');
    expect(toRelativeConfigPath('showcase/hello-world/stack.yaml', cwd)).toBe(
      'showcase/hello-world/stack.yaml',
    );
    expect(toRelativeConfigPath('./showcase/hello-world/stack.yaml', cwd)).toBe(
      'showcase/hello-world/stack.yaml',
    );
  });

  it('round-trips multi-workflow files and merges by workflowId', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'data-flow-'));
    const filePath = path.join(tmpDir, 'data-flow.yaml');
    const configPath = path.join(tmpDir, 'stack.yaml');

    writeDataFlowFile(filePath, configPath, 'workflow-a', {
      workflowName: 'A',
      executionId: 'exec-a',
      habitInput: { x: 1 },
      nodes: [],
    });

    writeDataFlowFile(filePath, configPath, 'workflow-b', {
      workflowName: 'B',
      executionId: 'exec-b',
      habitInput: { y: 2 },
      nodes: [],
    });

    const file = readDataFlowFile(filePath);
    expect(file.version).toBe(DATA_FLOW_VERSION);
    expect(file.configPath).toBe('stack.yaml');
    expect(path.isAbsolute(file.configPath)).toBe(false);
    expect(Object.keys(file.workflows)).toEqual(['workflow-a', 'workflow-b']);
    expect(file.workflows['workflow-a'].habitInput).toEqual({ x: 1 });
    expect(file.workflows['workflow-b'].habitInput).toEqual({ y: 2 });
  });

  it('collects env var references from workflow templates', () => {
    const workflow: Workflow = {
      id: 'test',
      name: 'Test',
      nodes: [
        {
          id: 'node-1',
          type: 'action',
          data: {
            framework: 'bits',
            params: {
              a: '{{habits.env.PARAM1}}',
              b: '{{habits.input.x}}',
            },
          },
        },
      ],
      output: {
        out: '{{habits.env.PARAM2}}',
      },
    };

    expect(collectEnvVarReferences(workflow).sort()).toEqual(['PARAM1', 'PARAM2']);
  });
});

describe('DataFlowReplayer', () => {
  const logger = LoggerFactory.getRoot();

  it('selects mock vs live nodes', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'data-flow-replay-'));
    const filePath = path.join(tmpDir, 'data-flow.yaml');
    const configPath = path.join(tmpDir, 'stack.yaml');

    fs.writeFileSync(
      filePath,
      stringifyYaml({
        version: 1,
        configPath,
        capturedAt: new Date().toISOString(),
        workflows: {
          'hello-world': {
            workflowName: 'Hello',
            executionId: '1',
            habitInput: {},
            nodes: [
              {
                nodeId: 'say-hello',
                framework: 'bits',
                input: { param1: 'hello', operation: 'greet' },
                output: 'hello there',
                success: true,
                durationMs: 1,
              },
            ],
          },
        },
      }),
    );

    const workflow: Workflow = {
      id: 'hello-world',
      name: 'Hello',
      nodes: [
        {
          id: 'say-hello',
          type: 'action',
          data: { framework: 'bits' },
        },
      ],
    };

    const fullReplay = new DataFlowReplayer({
      filePath,
      workflow,
      logger,
    });
    expect(fullReplay.shouldMock('say-hello')).toBe(true);
    expect(fullReplay.getOutput('say-hello')).toBe('hello there');

    const mixedReplay = new DataFlowReplayer({
      filePath,
      liveNodes: ['say-hello'],
      workflow,
      logger,
    });
    expect(mixedReplay.shouldMock('say-hello')).toBe(false);
  });

  it('throws on input assertion mismatch', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'data-flow-assert-'));
    const filePath = path.join(tmpDir, 'data-flow.yaml');

    fs.writeFileSync(
      filePath,
      stringifyYaml({
        version: 1,
        configPath: path.join(tmpDir, 'stack.yaml'),
        capturedAt: new Date().toISOString(),
        workflows: {
          wf: {
            workflowName: 'WF',
            executionId: '1',
            habitInput: {},
            nodes: [
              {
                nodeId: 'n1',
                framework: 'bits',
                input: { param1: 'expected' },
                output: 'ok',
                success: true,
                durationMs: 1,
              },
            ],
          },
        },
      }),
    );

    const replayer = new DataFlowReplayer({
      filePath,
      assertInputs: true,
      workflow: { id: 'wf', name: 'WF', nodes: [{ id: 'n1', type: 'action', data: { framework: 'bits' } }] },
      logger,
    });

    expect(() => replayer.assertInput({
      nodeId: 'n1',
      moduleName: 'test',
      framework: 'bits',
      params: { param1: 'actual' },
    })).toThrow(/input mismatch/i);

    expect(() => replayer.assertInput({
      nodeId: 'n1',
      moduleName: 'test',
      framework: 'bits',
      params: { param1: 'expected' },
    })).not.toThrow();
  });
});
