/**
 * Integration test: static data-flow blueprint for hello-world.
 */

import * as fs from 'fs';
import * as path from 'path';
import { discoverDataFlowBlueprint } from './discoverDataFlowBlueprint';

const workspaceRoot = path.resolve(__dirname, '../../../../..');
const stackPath = path.join(workspaceRoot, 'showcase/hello-world/stack.yaml');

describe('hello-world data-flow blueprint', () => {
  beforeAll(() => {
    if (!fs.existsSync(stackPath)) {
      throw new Error(`Missing fixture: ${stackPath}`);
    }
  });

  it('produces capture-shaped blueprint without runtime values', () => {
    const { blueprint } = discoverDataFlowBlueprint(stackPath);

    expect(blueprint.kind).toBe('blueprint');
    expect(blueprint.version).toBe(1);
    expect(blueprint.configPath).toContain('showcase/hello-world/stack.yaml');
    expect(Object.keys(blueprint.workflows).sort()).toEqual(['hello-world', 'hello-world-env']);

    const hello = blueprint.workflows['hello-world'];
    expect(hello.workflowName).toBe('Hello World Demo');
    expect(hello.habitInput.param1).toMatchObject({ type: 'string', required: true, default: 'hello' });
    expect(hello.habitInput.param2).toMatchObject({ type: 'string', required: true, default: 'world' });
    expect(hello.executionOrder).toEqual(['say-hello']);
    expect(hello.nodes).toHaveLength(1);
    expect(hello.nodes[0]).toMatchObject({
      nodeId: 'say-hello',
      framework: 'bits',
      module: '@ha-bits/bit-hello-world',
      operation: 'greet',
      input: {
        param1: '{{habits.input.param1}}',
        param2: '{{habits.input.param2}}',
        operation: 'greet',
      },
      output: '[discover:say-hello]',
    });
    expect(hello.workflowOutput.greeting).toMatchObject({ value: '{{say-hello}}' });

    const envWf = blueprint.workflows['hello-world-env'];
    expect(envWf.env).toEqual({ PARAM1: '{{habits.env.PARAM1}}' });
    expect(envWf.habitInput.param2).toMatchObject({ type: 'unknown', required: false });
    expect(envWf.nodes[0].input.param1).toBe('{{habits.env.PARAM1}}');
  });
});
