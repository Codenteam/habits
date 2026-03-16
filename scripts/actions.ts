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

// Pack showcase app
export interface PackShowcaseOptions {
  showcase: string;
  format: 'mobile-full' | 'desktop-full' | 'mobile' | 'desktop';
  target: 'android' | 'ios' | 'mac' | 'windows' | 'linux';
  appName: string;
  appIcon?: string;
  output: string;
  debug?: boolean;
}

export function buildPackShowcaseCommand(opts: PackShowcaseOptions): string {
  const configPath = `showcase/${opts.showcase}/stack.yaml`;
  const targetFlag = opts.format.includes('mobile') ? '--mobile-target' : '--desktop-platform';
  
  let cmd = `pnpm tsx packages/habits/app/src/main.ts pack`;
  cmd += ` --config ${configPath}`;
  cmd += ` --format ${opts.format}`;
  cmd += ` ${targetFlag} ${opts.target}`;
  cmd += ` --app-name "${opts.appName}"`;
  if (opts.appIcon) cmd += ` --app-icon ${opts.appIcon}`;
  cmd += ` --output ${opts.output}`;
  if (opts.debug) cmd += ` --debug`;
  
  return cmd;
}

export function packShowcase(opts: PackShowcaseOptions): boolean {
  const cmd = buildPackShowcaseCommand(opts);
  logInfo(`Command: ${c.gray}${cmd}${c.reset}`);
  return run(cmd);
}

export function getShowcaseDefaults(showcase: string) {
  const showcasePath = `showcase/${showcase}`;
  const defaultIcon = `${showcasePath}/frontend/Icon.png`;
  const hasIcon = fs.existsSync(path.join(PROJECT_ROOT, defaultIcon));
  const defaultAppName = showcase.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  
  return {
    appName: defaultAppName,
    appIcon: hasIcon ? defaultIcon : undefined,
  };
}

export function getOutputExtension(format: string, target: string): string {
  if (format.includes('mobile')) {
    return target === 'android' ? '.apk' : '.ipa';
  }
  return target === 'mac' ? '.dmg' : target === 'windows' ? '.exe' : '.AppImage';
}

// Interactive showcase builder types and helpers
export type MenuItem = { id: string; label: string; desc?: string };

export const SHOWCASE_FORMATS: MenuItem[] = [
  { id: 'mobile-full', label: 'Mobile Full', desc: 'standalone mobile app with embedded server' },
  { id: 'desktop-full', label: 'Desktop Full', desc: 'standalone desktop app with embedded server' },
  { id: 'mobile', label: 'Mobile', desc: 'mobile app (needs backend)' },
  { id: 'desktop', label: 'Desktop', desc: 'desktop app (needs backend)' },
];

export const MOBILE_TARGETS: MenuItem[] = [
  { id: 'android', label: 'Android', desc: '.apk' },
  { id: 'ios', label: 'iOS', desc: '.ipa (requires Xcode)' },
];

export const DESKTOP_TARGETS: MenuItem[] = [
  { id: 'mac', label: 'macOS', desc: '.dmg' },
  { id: 'windows', label: 'Windows', desc: '.exe' },
  { id: 'linux', label: 'Linux', desc: '.AppImage' },
];

export function getTargetsForFormat(format: string): MenuItem[] {
  return format.includes('mobile') ? MOBILE_TARGETS : DESKTOP_TARGETS;
}

export interface ShowcaseBuilderCallbacks {
  select: (title: string, items: MenuItem[]) => Promise<string | null>;
  prompt: (msg: string) => Promise<string>;
}

export async function buildShowcaseInteractive(callbacks: ShowcaseBuilderCallbacks): Promise<string | null> {
  const { select, prompt } = callbacks;
  
  // 1. Select showcase
  const examples = discoverExamples();
  const exampleItems: MenuItem[] = examples.map(e => ({ id: e, label: e }));
  const showcase = await select('Select showcase:', exampleItems);
  if (!showcase) return null;
  
  // 2. Select format
  const format = await select('Select format:', SHOWCASE_FORMATS) as PackShowcaseOptions['format'] | null;
  if (!format) return null;
  
  // 3. Select target
  const targetItems = getTargetsForFormat(format);
  const target = await select('Select target:', targetItems) as PackShowcaseOptions['target'] | null;
  if (!target) return null;
  
  // Get defaults
  const defaults = getShowcaseDefaults(showcase);
  
  // 4. App name
  const appNameInput = await prompt(`${c.green}App name [${defaults.appName}]: ${c.reset}`);
  const appName = appNameInput || defaults.appName;
  
  // 5. App icon
  const iconPrompt = defaults.appIcon 
    ? `${c.green}App icon [${defaults.appIcon}]: ${c.reset}` 
    : `${c.green}App icon (optional): ${c.reset}`;
  const appIconInput = await prompt(iconPrompt);
  const appIcon = appIconInput || defaults.appIcon;
  
  // 6. Output path
  const ext = getOutputExtension(format, target);
  const defaultOutput = `/tmp/${showcase}${ext}`;
  const outputInput = await prompt(`${c.green}Output path [${defaultOutput}]: ${c.reset}`);
  const output = outputInput || defaultOutput;
  
  // Build command
  return buildPackShowcaseCommand({ showcase, format, target, appName, appIcon, output });
}

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

// ============================================================================
// Bits Creator Actions (merged from bits-creator/scripts/actions.ts)
// ============================================================================

const BITS_DIR = path.join(PROJECT_ROOT, 'nodes', 'bits', '@ha-bits');
const BITS_NODES_ROOT = path.join(PROJECT_ROOT, 'nodes', 'bits');
const BITS_CREATOR_ROOT = path.join(PROJECT_ROOT, 'bits-creator');
const BITS_CREATOR_SERVER = path.join(BITS_CREATOR_ROOT, 'server');

// Discovery
export function discoverBits(): string[] {
  if (!fs.existsSync(BITS_DIR)) return [];
  return fs.readdirSync(BITS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name.startsWith('bit-'))
    .map(e => e.name).sort();
}

export const getBitPath = (name: string) => path.join(BITS_DIR, name);
export const getBitPkg = (name: string) => `@ha-bits/${name}`;

// Build bits
export const buildBit = (name: string) => run(`pnpm nx build ${getBitPkg(name)}`, { cwd: BITS_NODES_ROOT });
export const buildAllBits = () => discoverBits().forEach(b => buildBit(b));

// Publish Verdaccio
export const publishBitVerdaccio = (name: string) => run(`pnpm nx publish-verdaccio ${getBitPkg(name)}`, { cwd: BITS_NODES_ROOT });
export const publishAllBitsVerdaccio = () => discoverBits().forEach(b => publishBitVerdaccio(b));

// Version bump bit
export const bumpBit = (name: string) => run('npm version patch --no-git-tag-version', { cwd: getBitPath(name) });

// Publish npm (bumps version first)
export const publishBitNpm = (name: string) => {
  bumpBit(name);
  buildBit(name);
  run('npm publish --access public --registry https://registry.npmjs.org/', { cwd: getBitPath(name) });
};
export const publishAllBitsNpm = () => discoverBits().forEach(b => publishBitNpm(b));

// Link bits
export const linkBit = (name: string) => run('npm link', { cwd: getBitPath(name), silent: true });
export const unlinkBit = (name: string) => run('npm unlink', { cwd: getBitPath(name), silent: true });
export const linkAllBits = () => discoverBits().forEach(b => linkBit(b));
export const unlinkAllBits = () => discoverBits().forEach(b => unlinkBit(b));

// Bits creator utils
export const runBitsConverter = () => run('npx tsx src/cli.ts', { cwd: BITS_CREATOR_ROOT });
export const cleanBits = () => { run('rm -rf dist', { cwd: BITS_CREATOR_ROOT }); run('rm -rf dist', { cwd: BITS_NODES_ROOT, silent: true }); };
export const installBits = () => { run('pnpm install', { cwd: BITS_CREATOR_ROOT }); run('pnpm install', { cwd: BITS_NODES_ROOT }); };

// List bits
export function listBits() {
  const bits = discoverBits();
  bits.forEach(b => {
    const pkg = path.join(getBitPath(b), 'package.json');
    const ver = fs.existsSync(pkg) ? JSON.parse(fs.readFileSync(pkg, 'utf-8')).version || '' : '';
    console.log(`  ${c.green}•${c.reset} ${b} ${c.gray}${ver}${c.reset}`);
  });
  console.log(`\n  ${c.gray}Total: ${bits.length}${c.reset}`);
}

// Bits creator server
export function startBitsServerMock() {
  logHeader('Starting Bits Creator Server (Mock Mode)');
  logInfo('Returns hello-world example for create-habit endpoint');
  run('MOCK_MODE=true npx tsx ./src/main.ts', { cwd: BITS_CREATOR_SERVER });
}

export function startBitsServer() {
  logHeader('Starting Bits Creator Server');
  logInfo('Non-mock mode - AI integration placeholder');
  run('npx tsx ./src/main.ts', { cwd: BITS_CREATOR_SERVER });
}

// ============================================================================
// APK Signing
// ============================================================================

/**
 * Sign an APK with the Android debug keystore
 * @param apkPath Path to the unsigned APK
 * @returns true if signing succeeded
 */
export function signApkDebug(apkPath: string): boolean {
  const keystorePath = path.join(process.env.HOME || '~', '.android', 'debug.keystore');
  
  if (!fs.existsSync(keystorePath)) {
    logError(`Debug keystore not found: ${keystorePath}`);
    logInfo('Run Android Studio or create one with: keytool -genkey -v -keystore ~/.android/debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000');
    return false;
  }
  
  if (!fs.existsSync(apkPath)) {
    logError(`APK not found: ${apkPath}`);
    return false;
  }
  
  logInfo(`Signing APK: ${apkPath}`);
  return run(`jarsigner -verbose -keystore "${keystorePath}" -storepass android -keypass android "${apkPath}" androiddebugkey`);
}

/**
 * Pack mobile APK (release mode) and sign with debug key
 * @param config Path to stack.yaml config
 * @param target Mobile target (android/ios)
 * @returns true if pack and sign succeeded
 */
export function packMobileFullSigned(config: string, target: 'android' | 'ios' = 'android'): boolean {
  logHeader('Packing Mobile App (Release + Sign)');
  
  // Pack without --debug flag (release mode)
  const packCmd = `pnpm tsx packages/habits/app/src/main.ts pack --config ${config} --format mobile-full --mobile-target ${target}`;
  logInfo(`Running: ${c.gray}${packCmd}${c.reset}`);
  
  const packResult = run(packCmd);
  if (!packResult) {
    logError('Pack failed');
    return false;
  }
  
  // Find the output APK in the showcase dist folder
  const showcaseName = path.basename(path.dirname(config));
  const apkPath = path.join(PROJECT_ROOT, 'showcase', showcaseName, 'dist', 'habits-app.tauri.apk');
  
  if (!fs.existsSync(apkPath)) {
    logError(`APK not found at expected path: ${apkPath}`);
    return false;
  }
  
  logSuccess(`APK built: ${apkPath}`);
  
  // Sign with debug key
  if (target === 'android') {
    return signApkDebug(apkPath);
  }
  
  return true;
}
