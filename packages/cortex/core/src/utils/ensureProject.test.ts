import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { defaultModules } from '@ha-bits/core';
import { ensureHabitsProject, ensureHabitsProjectFiles } from './ensureProject';
import { preinstallModules } from './moduleLoader';

jest.mock('./moduleLoader', () => ({
  preinstallModules: jest.fn().mockResolvedValue({
    total: defaultModules.modules.length,
    pending: 0,
    installed: 0,
    failed: [],
  }),
}));

const mockedPreinstallModules = preinstallModules as jest.MockedFunction<typeof preinstallModules>;

describe('ensureHabitsProjectFiles', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'habits-ensure-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates .env and modules.json when missing', () => {
    const result = ensureHabitsProjectFiles({ cwd: tempDir });

    expect(result.firstRun).toBe(true);
    expect(result.createdEnv).toBe(true);
    expect(result.createdModules).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.env'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'modules.json'))).toBe(true);

    const modules = JSON.parse(fs.readFileSync(path.join(tempDir, 'modules.json'), 'utf-8'));
    expect(modules.modules.length).toBe(defaultModules.modules.length);
    expect(fs.readFileSync(path.join(tempDir, '.env'), 'utf-8')).toContain('HABITS_MODULES_MODE=open');
  });

  it('is idempotent when project files already exist', () => {
    ensureHabitsProjectFiles({ cwd: tempDir });
    const result = ensureHabitsProjectFiles({ cwd: tempDir });

    expect(result.firstRun).toBe(false);
    expect(result.createdEnv).toBe(false);
    expect(result.createdModules).toBe(false);
  });

  it('treats partial setup as first run when only .env exists', () => {
    fs.writeFileSync(path.join(tempDir, '.env'), 'HABITS_MODULES_MODE=open\n');
    const result = ensureHabitsProjectFiles({ cwd: tempDir });

    expect(result.firstRun).toBe(true);
    expect(result.createdEnv).toBe(false);
    expect(result.createdModules).toBe(true);
  });
});

describe('ensureHabitsProject', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'habits-ensure-'));
    mockedPreinstallModules.mockClear();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('runs preinstall by default', async () => {
    await ensureHabitsProject({ cwd: tempDir, quiet: true });

    expect(mockedPreinstallModules).toHaveBeenCalledTimes(1);
    expect(mockedPreinstallModules).toHaveBeenCalledWith({ verbose: false });
  });

  it('skips preinstall when requested', async () => {
    await ensureHabitsProject({ cwd: tempDir, quiet: true, skipInstall: true });

    expect(mockedPreinstallModules).not.toHaveBeenCalled();
  });

  it('uses verbose preinstall on first run', async () => {
    await ensureHabitsProject({ cwd: tempDir });

    expect(mockedPreinstallModules).toHaveBeenCalledWith({ verbose: true });
  });
});
