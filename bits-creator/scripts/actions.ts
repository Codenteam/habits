/**
 * Bits Creator Actions - Modular functions for managing bits.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const BITS_DIR = path.join(PROJECT_ROOT, 'nodes', 'bits', '@ha-bits');
const NODES_ROOT = path.join(PROJECT_ROOT, 'nodes', 'bits');

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

const runInNodes = (cmd: string, opts: { silent?: boolean } = {}) => run(cmd, { cwd: NODES_ROOT, ...opts });

// Discovery
export function discoverBits(): string[] {
  if (!fs.existsSync(BITS_DIR)) return [];
  return fs.readdirSync(BITS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name.startsWith('bit-'))
    .map(e => e.name).sort();
}

export const getBitPath = (name: string) => path.join(BITS_DIR, name);
export const getBitPkg = (name: string) => `@ha-bits/${name}`;

// Build
export const buildBit = (name: string) => runInNodes(`pnpm nx build ${getBitPkg(name)}`);
export const buildAll = () => discoverBits().forEach(b => buildBit(b));

// Publish Verdaccio
export const publishBitVerdaccio = (name: string) => runInNodes(`pnpm nx publish-verdaccio ${getBitPkg(name)}`);
export const publishAllVerdaccio = () => discoverBits().forEach(b => publishBitVerdaccio(b));

// Version bump
export const bumpBit = (name: string) => run('npm version patch --no-git-tag-version', { cwd: getBitPath(name) });

// Publish npm (bumps version first)
export const publishBitNpm = (name: string) => {
  bumpBit(name);
  buildBit(name);
  run('npm publish --access public --registry https://registry.npmjs.org/', { cwd: getBitPath(name) });
};
export const publishAllNpm = () => discoverBits().forEach(b => publishBitNpm(b));

// Link
export const linkBit = (name: string) => run('npm link', { cwd: getBitPath(name), silent: true });
export const unlinkBit = (name: string) => run('npm unlink', { cwd: getBitPath(name), silent: true });
export const linkAll = () => discoverBits().forEach(b => linkBit(b));
export const unlinkAll = () => discoverBits().forEach(b => unlinkBit(b));

// NPM
export const npmLogin = () => run('npm login --registry https://registry.npmjs.org/');
export const npmWhoami = () => run('npm whoami --registry https://registry.npmjs.org/');

// Utils
export const runConverter = () => run('npx tsx src/cli.ts');
export const clean = () => { run('rm -rf dist'); runInNodes('rm -rf dist', { silent: true }); };
export const install = () => { run('pnpm install'); run('pnpm install', { cwd: NODES_ROOT }); };

// Link/Unlink Habits Workspace Dependencies
const HABITS_ROOT = path.join(PROJECT_ROOT, '..');
const HABITS_PACKAGES: { name: string; path: string }[] = [
  { name: '@ha-bits/cortex', path: 'packages/cortex/server' },
  { name: '@ha-bits/core', path: 'packages/core' },
  { name: '@ha-bits/base', path: 'packages/base/server' },
  { name: '@ha-bits/workflow-canvas', path: 'packages/workflow-canvas' },
  { name: '@ha-bits/base-ui', path: 'packages/base/ui' },
  { name: '@ha-bits/cortex-ui', path: 'packages/cortex/ui' },
  { name: 'habits', path: 'packages/habits/app' },
];

export function linkHabitsDeps() {
  logHeader('Linking Habits Workspace Dependencies');
  // Create global links from habits workspace
  for (const pkg of HABITS_PACKAGES) {
    const pkgPath = path.join(HABITS_ROOT, pkg.path);
    if (fs.existsSync(pkgPath)) {
      logInfo(`Creating global link: ${pkg.name}`);
      run('npm link', { cwd: pkgPath, silent: true });
    } else {
      logError(`Package not found: ${pkgPath}`);
    }
  }
  // Link into bits-creator
  for (const pkg of HABITS_PACKAGES) {
    logInfo(`Linking ${pkg.name} into bits-creator`);
    run(`npm link ${pkg.name}`, { cwd: PROJECT_ROOT, silent: true });
  }
  logSuccess('Habits dependencies linked');
}

export function unlinkHabitsDeps() {
  logHeader('Unlinking Habits Workspace Dependencies');
  for (const pkg of HABITS_PACKAGES) {
    logInfo(`Unlinking ${pkg.name}`);
    run(`npm unlink ${pkg.name}`, { cwd: PROJECT_ROOT, silent: true });
  }
  logSuccess('Habits dependencies unlinked');
}

// List
export function listBits() {
  const bits = discoverBits();
  bits.forEach(b => {
    const pkg = path.join(getBitPath(b), 'package.json');
    const ver = fs.existsSync(pkg) ? JSON.parse(fs.readFileSync(pkg, 'utf-8')).version || '' : '';
    console.log(`  ${c.green}•${c.reset} ${b} ${c.gray}${ver}${c.reset}`);
  });
  console.log(`\n  ${c.gray}Total: ${bits.length}${c.reset}`);
}

// Server
const SERVER_DIR = path.join(PROJECT_ROOT, 'server');

export function startServerMock() {
  logHeader('Starting Bits Creator Server (Mock Mode)');
  logInfo('Returns hello-world example for create-habit endpoint');
  run('MOCK_MODE=true npx tsx ./src/main.ts', { cwd: SERVER_DIR });
}

export function startServer() {
  logHeader('Starting Bits Creator Server');
  logInfo('Non-mock mode - AI integration placeholder');
  run('npx tsx ./src/main.ts', { cwd: SERVER_DIR });
}
