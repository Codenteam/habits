/**
 * Integration test: discover hello-world data flow without runtime input.
 *
 * Run with: pnpm jest --config packages/cortex/lab/jest.config.js
 */

import * as fs from 'fs';
import * as path from 'path';
import { discoverDataFlow } from '../discovery';

const workspaceRoot = path.resolve(__dirname, '../../../../..');
const stackPath = path.join(workspaceRoot, 'showcase/hello-world/stack.yaml');

describe('hello-world data-flow discovery (no input)', () => {
  beforeAll(() => {
    if (!fs.existsSync(stackPath)) {
      throw new Error(`Missing fixture: ${stackPath}`);
    }
  });

  it('discovers UI → action → workflow → node → output paths', () => {
    const report = discoverDataFlow(stackPath);

    expect(report.ok).toBe(true);
    expect(report.summary.errorCount).toBe(0);
    expect(report.graph.nodes.some((n) => n.id === 'action:callInput')).toBe(true);
    expect(report.graph.nodes.some((n) => n.id === 'workflow:hello-world')).toBe(true);
    expect(report.graph.nodes.some((n) => n.id === 'node:hello-world:say-hello')).toBe(true);
    expect(report.graph.nodes.some((n) => n.id === 'output:hello-world:greeting')).toBe(true);

    expect(report.graph.edges.some((e) =>
      e.source === 'action:callInput' && e.target === 'workflow:hello-world',
    )).toBe(true);
    expect(report.graph.edges.some((e) =>
      e.source === 'node:hello-world:say-hello' && e.target === 'output:hello-world:greeting',
    )).toBe(true);
  });

  it('connects form fields to actions and habit inputs', () => {
    const report = discoverDataFlow(stackPath);

    expect(report.graph.edges.some((e) =>
      e.source === 'state:param1' && e.target === 'action:callInput' && e.label === 'param1',
    )).toBe(true);
    expect(report.graph.edges.some((e) =>
      e.source === 'input:hello-world:param1' && e.target === 'workflow:hello-world',
    )).toBe(true);
  });

  it('validates env-based workflow wiring', () => {
    const report = discoverDataFlow(stackPath);

    expect(report.graph.nodes.some((n) => n.id === 'env:PARAM1')).toBe(true);
    expect(report.graph.edges.some((e) =>
      e.source === 'env:PARAM1' && e.target === 'workflow:hello-world-env',
    )).toBe(true);
    expect(report.graph.edges.some((e) =>
      e.source === 'action:callEnv' && e.target === 'workflow:hello-world-env',
    )).toBe(true);
  });
});
