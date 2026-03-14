/**
 * Habits Dev Actions - Modular functions for dev tasks.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const EXAMPLES_DIR = path.join(PROJECT_ROOT, 'showcase');
const SKIP_DIRS = ['unit-tests', 'bits', 'docs', 'test-script', 'logs', 'node_modules'];

export const c = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m', gray: '\x1b[90m', reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m' };

export const logInfo = (msg: string) => console.log(`${c.blue}ℹ ${msg}${c.reset}`);
export const logSuccess = (msg: string) => console.log(`${c.green}✓ ${msg}${c.reset}`);
export const logError = (msg: string) => console.log(`${c.red}✗ ${msg}${c.reset}`);
export const logHeader = (msg: string) => console.log(`\n${c.cyan}${'═'.repeat(60)}\n  ${msg}\n${'═'.repeat(60)}${c.reset}\n`);

export function run(cmd: string, opts: { cwd?: string; silent?: boolean } = {}): boolean {
  try {
    if (!opts.silent) logInfo(`Running: ${c.gray}${cmd}${c.reset}`);
    execSync(cmd, { cwd: opts.cwd || PROJECT_ROOT, stdio: opts.silent ? 'pipe' : 'inherit', env: { ...process.env, FORCE_COLOR: '1' } });
    return true;
  } catch { if (!opts.silent) logError(`Failed: ${cmd}`); return false; }
}

// Discovery
export function discoverExamples(): string[] {
  if (!fs.existsSync(EXAMPLES_DIR)) return [];
  return fs.readdirSync(EXAMPLES_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && !SKIP_DIRS.includes(e.name))
    .filter(e => fs.existsSync(path.join(EXAMPLES_DIR, e.name, 'stack.yaml')) || fs.existsSync(path.join(EXAMPLES_DIR, e.name, 'config.json')))
    .map(e => e.name).sort();
}

export function getExampleConfig(name: string): string | null {
  const yaml = path.join(EXAMPLES_DIR, name, 'stack.yaml');
  const json = path.join(EXAMPLES_DIR, name, 'config.json');
  return fs.existsSync(yaml) ? yaml : fs.existsSync(json) ? json : null;
}

// Build
export const buildHabits = () => run('pnpm nx build habits');
export const buildCortex = () => run('pnpm nx build @ha-bits/cortex');
export const buildBase = () => run('pnpm nx build @ha-bits/base');
export const buildAll = () => { buildHabits(); buildCortex(); buildBase(); };

// Pack
export const packHabits = () => run('pnpm nx pack habits');
export const packCortex = () => run('pnpm nx pack @ha-bits/cortex');
export const packBase = () => run('pnpm nx pack @ha-bits/base');
export const packAll = () => { packHabits(); packCortex(); packBase(); };

// Pack formats
const DEFAULT_CONFIG = 'showcase/mixed/stack.yaml';
const DEFAULT_BACKEND = 'http://localhost:3000';
export const packSea = (config = DEFAULT_CONFIG) => run(`node dist/packages/habits/app/main.cjs pack --config ${config} --format single-executable -o /tmp/habits-sea`);
export const packDesktop = (config = DEFAULT_CONFIG, backendUrl = DEFAULT_BACKEND) => run(`node dist/packages/habits/app/main.cjs pack --config ${config} --format desktop --backend-url ${backendUrl} --desktop-platform dmg -o /tmp/habits-desktop`);
export const packMobile = (config = DEFAULT_CONFIG, backendUrl = DEFAULT_BACKEND) => run(`node dist/packages/habits/app/main.cjs pack --config ${config} --format mobile --backend-url ${backendUrl} --mobile-target android -o /tmp/habits-mobile`);

// Version bump
export const bumpHabits = () => run('npm version patch --no-git-tag-version', { cwd: path.join(PROJECT_ROOT, 'packages/habits') });
export const bumpCortex = () => {
    // Bump version for both cortex server and cortex UI
    run('npm version patch --no-git-tag-version', { cwd: path.join(PROJECT_ROOT, 'packages/cortex/server') });
    run('npm version patch --no-git-tag-version', { cwd: path.join(PROJECT_ROOT, 'packages/cortex/ui') });
};
export const bumpBase = () => {
    run('npm version patch --no-git-tag-version', { cwd: path.join(PROJECT_ROOT, 'packages/base/server') });
    run('npm version patch --no-git-tag-version', { cwd: path.join(PROJECT_ROOT, 'packages/base/ui') });
}
// Publish (bumps version first)
export const publishHabits = (tag = 'latest') => {
  bumpHabits();
  packHabits();
  run(`cd dist/packages/habits && npm publish --access public --registry https://registry.npmjs.org/${tag !== 'latest' ? ` --tag ${tag}` : ''}`);
};
export const publishCortex = (tag = 'latest') => { bumpCortex(); packCortex(); run(`cd dist/packages/cortex && npm publish --registry https://registry.npmjs.org/${tag !== 'latest' ? ` --tag ${tag}` : ''}`); };
export const publishBase = (tag = 'latest') => { bumpBase(); packBase(); run(`cd dist/packages/base && npm publish --registry https://registry.npmjs.org/${tag !== 'latest' ? ` --tag ${tag}` : ''}`); };
export const publishAll = (tag = 'latest') => { publishHabits(tag); publishCortex(tag); publishBase(tag); };

// Clean
export const cleanDist = () => run('rm -rf dist');
export const cleanCache = () => run('pnpm nx reset');
export const cleanAll = () => { cleanDist(); cleanCache(); };
export const killPort = () => run('lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "No process"');

// Test
export const testUnit = () => run('pnpm jest');
export const testHttp = () => run('httpyac http/cortex-tests.http --all');
export const typecheck = () => run('pnpm nx run-many --target=typecheck');

// NPM
export const npmLogin = () => run('npm login --registry https://registry.npmjs.org/');
export const npmWhoami = () => run('npm whoami --registry https://registry.npmjs.org/');

// Dev servers
export const devCortex = (config = 'showcase/mixed/stack.yaml') => run(`pnpm nx cortex habits --config ${config}`);
export const devBase = () => run('pnpm nx dev @ha-bits/base');

// Run example
export function runExample(name: string) {
  const cfg = getExampleConfig(name);
  if (cfg) run(`pnpm nx cortex habits --config ${path.relative(PROJECT_ROOT, cfg)}`);
}

// Link packages for local development
const CORTEX_CORE_DIST = path.join(PROJECT_ROOT, 'dist/packages/cortex/core');

export function linkCortexCore() {
  logInfo('Creating global link for @ha-bits/cortex-core');
  if (!fs.existsSync(CORTEX_CORE_DIST)) {
    logError(`Dist not found: ${CORTEX_CORE_DIST}. Run 'Build Cortex' first.`);
    return false;
  }
  return run('npm link', { cwd: CORTEX_CORE_DIST });
}

export function unlinkCortexCore() {
  logInfo('Removing global link for @ha-bits/cortex-core');
  return run('npm unlink -g @ha-bits/cortex-core', { silent: true });
}

// List
export function listExamples() {
  discoverExamples().forEach(e => console.log(`  ${c.green}•${c.reset} ${e}`));
}
