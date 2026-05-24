import type { GraphHabitInput } from '../graph';
import {
  orderWorkflowNodes,
  buildNodeBlueprint,
  discoverNodeOutputPlaceholder,
} from './buildWorkflowBlueprint';

describe('buildWorkflowBlueprint helpers', () => {
  it('orders nodes by edges when present', () => {
    const habit: GraphHabitInput = {
      id: 'wf',
      name: 'WF',
      nodes: [
        { id: 'b', data: { framework: 'bits' } },
        { id: 'a', data: { framework: 'bits' } },
        { id: 'c', data: { framework: 'bits' } },
      ],
      edges: [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
      ],
    };

    expect(orderWorkflowNodes(habit).map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('falls back to declaration order when edges are empty', () => {
    const habit: GraphHabitInput = {
      id: 'wf',
      name: 'WF',
      nodes: [
        { id: 'first', data: {} },
        { id: 'second', data: {} },
      ],
      edges: [],
    };

    expect(orderWorkflowNodes(habit).map((n) => n.id)).toEqual(['first', 'second']);
  });

  it('builds node blueprint with placeholder output', () => {
    const node = buildNodeBlueprint({
      id: 'say-hello',
      data: {
        framework: 'bits',
        module: '@ha-bits/bit-hello-world',
        operation: 'greet',
        params: {
          param1: '{{habits.input.param1}}',
        },
      },
    });

    expect(node.output).toBe(discoverNodeOutputPlaceholder('say-hello'));
    expect(node.input.param1).toBe('{{habits.input.param1}}');
    expect(node.input.operation).toBe('greet');
  });
});
