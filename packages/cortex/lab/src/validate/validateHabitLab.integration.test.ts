/**
 * Integration test: full lab validation (discovery + dry-run) for hello-world.
 */

import * as fs from 'fs';
import * as path from 'path';
import { discoverDataFlow } from '../discovery';
import { validateHabitLab } from '../validate/validateHabitLab';
import { loadStackGraphInput } from '../discovery/loadStackGraphInput';

const workspaceRoot = path.resolve(__dirname, '../../../../..');
const stackPath = path.join(workspaceRoot, 'showcase/hello-world/stack.yaml');

describe('hello-world lab validation', () => {
  beforeAll(() => {
    if (!fs.existsSync(stackPath)) {
      throw new Error(`Missing fixture: ${stackPath}`);
    }
  });

  it('discovers graph wiring without input', () => {
    const report = discoverDataFlow(stackPath);
    expect(report.ok).toBe(true);
    expect(report.summary.errorCount).toBe(0);
  });

  it('runs discovery and dry-run without runtime input', async () => {
    const input = loadStackGraphInput(stackPath);
    const report = await validateHabitLab(input);
    expect(report.ok).toBe(true);
    expect(report.blueprint.kind).toBe('blueprint');
    expect(report.blueprint.workflows['hello-world']).toBeDefined();
    expect(report.dryRun.length).toBeGreaterThanOrEqual(2);
    expect(report.dryRun.every((item) => item.report.status !== 'error')).toBe(true);
  });
});
