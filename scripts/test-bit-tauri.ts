#!/usr/bin/env npx tsx
/**
 * scripts/test-bit-tauri.ts — Standalone single-bit test runner (Tauri)
 *
 * Tests a bit action inside the Tauri app via WebDriver.
 *
 * TWO MODES:
 *
 * 1. Manual mode (default): Tauri app must already be running with WebDriver on port 4445.
 *    The bit must be bundled in the app's HabitsBundle (loaded via a habit).
 *
 * 2. Headless mode (--headless): Auto-launches the Tauri app, runs the bit, then kills it.
 *    Requires a .habit file that includes the bit.
 *
 * @usage
 *   # Manual mode (app already running)
 *   npx tsx scripts/test-bit-tauri.ts @ha-bits/bit-hello-world greet '{"param1":"hello","param2":"world"}'
 *
 *   # Headless mode (auto-launch + auto-kill)
 *   npx tsx scripts/test-bit-tauri.ts --headless --habit ./my.habit @ha-bits/bit-hello-world greet '{"param1":"hello","param2":"world"}'
 *
 *   # With expected output assertion
 *   npx tsx scripts/test-bit-tauri.ts --headless --habit ./my.habit @ha-bits/bit-hello-world greet '{"param1":"hello","param2":"world"}' --expected '"HELLO THERE"'
 */

import * as http from 'http';
import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════════════════
// Parse CLI args
// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);

function printUsage() {
  console.error('Usage: npx tsx scripts/test-bit-tauri.ts [--headless] [--habit <path>] <bit> <action> <input-json> [--expected <json>] [--auth <json>] [--timeout <ms>] [--port <port>]');
  console.error('');
  console.error('  bit         Bit name (e.g., @ha-bits/bit-hello-world)');
  console.error('  action      Action name to run (e.g., greet, send, get)');
  console.error('  input-json  JSON input for the action propsValue');
  console.error('');
  console.error('Options:');
  console.error('  --headless   Auto-launch Tauri, run test, then kill the app');
  console.error('  --habit      Path to .habit file (required for --headless)');
  console.error('  --expected   Expected JSON output. If provided, asserts equality and exits 0/1.');
  console.error('  --auth       Auth JSON (optional)');
  console.error('  --timeout    Timeout in ms (default: 60000)');
  console.error('  --port       WebDriver port (default: 4445)');
  console.error('');
  console.error('Manual mode (app already running):');
  console.error('  npx tsx scripts/test-bit-tauri.ts @ha-bits/bit-hello-world greet \'{"param1":"hello","param2":"world"}\'');
  console.error('');
  console.error('Headless mode (auto-launch + kill):');
  console.error('  npx tsx scripts/test-bit-tauri.ts --headless --habit ./my.habit @ha-bits/bit-hello-world greet \'{"param1":"hello","param2":"world"}\'');
  console.error('');
  console.error('Prerequisites for headless mode:');
  console.error('  1. cd habits-cortex/src-tauri && cargo build');
  process.exit(2);
}

if (args.includes('--help') || args.includes('-h')) {
  printUsage();
}

let headless = false;
let habitPath: string | undefined;
let bitName = '';
let actionName = '';
let inputJson = '';
let expectedJson: string | undefined;
let authJson: string | undefined;
let timeout = 60000;
let webdriverPort = 4445;

// Parse positional and optional args
const positionals: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--headless') {
    headless = true;
  } else if (args[i] === '--habit') {
    habitPath = args[++i];
  } else if (args[i] === '--expected' || args[i] === '-e') {
    expectedJson = args[++i];
  } else if (args[i] === '--auth' || args[i] === '-a') {
    authJson = args[++i];
  } else if (args[i] === '--timeout' || args[i] === '-t') {
    timeout = parseInt(args[++i], 10);
  } else if (args[i] === '--port' || args[i] === '-p') {
    webdriverPort = parseInt(args[++i], 10);
  } else if (!args[i].startsWith('-')) {
    positionals.push(args[i]);
  }
}

if (positionals.length < 3) {
  printUsage();
}

bitName = positionals[0];
actionName = positionals[1];
inputJson = positionals[2];

if (headless && !habitPath) {
  console.error('❌ --headless requires --habit <path>');
  process.exit(2);
}

if (habitPath && !headless) {
  console.error('⚠️  --habit is only used with --headless mode');
}

// ═══════════════════════════════════════════════════════════════════════════
// Parse inputs
// ═══════════════════════════════════════════════════════════════════════════

let input: Record<string, any>;
let auth: Record<string, any> | undefined;
let expected: any = undefined;

try {
  input = JSON.parse(inputJson);
} catch {
  console.error('❌ Invalid input JSON:', inputJson);
  process.exit(2);
}

if (authJson) {
  try {
    auth = JSON.parse(authJson);
  } catch {
    console.error('❌ Invalid auth JSON:', authJson);
    process.exit(2);
  }
}

const hasExpected = expectedJson !== undefined;
if (hasExpected) {
  try {
    expected = JSON.parse(expectedJson!);
  } catch {
    console.error('❌ Invalid expected JSON:', expectedJson);
    process.exit(2);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WebDriver HTTP helpers (no external deps — pure Node.js http)
// ═══════════════════════════════════════════════════════════════════════════

const WD_HOST = '127.0.0.1';

function wdRequest(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const opts: http.RequestOptions = {
      hostname: WD_HOST,
      port: webdriverPort,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data).toString() } : {}),
      },
      timeout,
    };

    const req = http.request(opts, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, value: parsed.value, body: parsed });
        } catch {
          resolve({ status: res.statusCode, value: responseData, body: null });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });

    if (data) req.write(data);
    req.end();
  });
}

async function checkWebDriver(): Promise<boolean> {
  try {
    const res = await wdRequest('GET', '/status');
    return res.status === 200;
  } catch {
    return false;
  }
}

async function createSession(): Promise<string> {
  const res = await wdRequest('POST', '/session', {
    capabilities: { browserName: 'wry' },
  });
  if (res.status !== 200 || !res.value?.sessionId) {
    throw new Error(`Failed to create WebDriver session: ${JSON.stringify(res.body)}`);
  }
  return res.value.sessionId;
}

async function deleteSession(sessionId: string): Promise<void> {
  await wdRequest('DELETE', `/session/${sessionId}`);
}

async function executeAsync(sessionId: string, script: string): Promise<any> {
  const res = await wdRequest('POST', `/session/${sessionId}/execute/async`, {
    script: `
      const done = arguments[arguments.length - 1];
      (async function() {
        ${script}
      })().then(done).catch(function(e) { done({ __error: e.message || String(e) }); });
    `,
    args: [],
  });
  return res.value;
}

// ═══════════════════════════════════════════════════════════════════════════
// Headless Tauri lifecycle management
// ═══════════════════════════════════════════════════════════════════════════

function getWorkspaceRoot(): string {
  let current = path.dirname(new URL(import.meta.url).pathname);
  // resolve the scripts/ directory up to workspace root
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return process.cwd();
}

function getTauriBinary(): string | null {
  const workspaceRoot = getWorkspaceRoot();
  // Try debug binary first
  const candidates = [
    path.join(workspaceRoot, 'habits-cortex/src-tauri/target/debug/habits-cortex'),
    path.join(workspaceRoot, 'habits-cortex/src-tauri/target/release/habits-cortex'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

let tauriProcess: ReturnType<typeof spawn> | null = null;

async function launchTauriApp(habitPath: string): Promise<void> {
  const binary = getTauriBinary();
  if (!binary) {
    throw new Error(
      'Tauri binary not found. Build it first:\n' +
      '  cd habits-cortex/src-tauri && cargo build'
    );
  }

  // Resolve habit to absolute
  const absHabit = path.resolve(habitPath);
  if (!fs.existsSync(absHabit)) {
    throw new Error(`Habit file not found: ${absHabit}`);
  }

  console.error(`🚀 Launching Tauri: ${binary} --habit ${absHabit}`);
  tauriProcess = spawn(binary, ['--habit', absHabit], {
    stdio: 'pipe',
    env: { ...process.env },
  });

  // Wait for WebDriver to become available
  console.error('   Waiting for WebDriver...');
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (tauriProcess.exitCode !== null && tauriProcess.exitCode !== 0) {
      const stderr = tauriProcess.stderr ? 'Check logs' : '';
      throw new Error(`Tauri process exited with code ${tauriProcess.exitCode}. ${stderr}`);
    }
    const available = await checkWebDriver();
    if (available) return;
    await sleep(500);
  }
  throw new Error('Timed out waiting for WebDriver to start');
}

async function killTauriApp(): Promise<void> {
  if (!tauriProcess) return;
  
  console.error('🛑 Stopping Tauri...');
  
  // Try graceful kill first
  tauriProcess.kill('SIGTERM');
  
  // Wait up to 5s for graceful exit
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (tauriProcess.exitCode !== null) break;
    await sleep(200);
  }
  
  // Force kill if still running
  if (tauriProcess.exitCode === null) {
    tauriProcess.kill('SIGKILL');
  }
  
  tauriProcess = null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.error(`🧪 Testing (Tauri): ${bitName}/${actionName}`);
  console.error(`   Input: ${JSON.stringify(input)}`);
  if (headless) {
    console.error(`   Mode: headless (auto-launch + auto-kill)`);
    console.error(`   Habit: ${habitPath}`);
  }

  // In headless mode, launch the Tauri app
  if (headless) {
    try {
      await launchTauriApp(habitPath!);
    } catch (err: any) {
      console.error(`❌ Failed to launch Tauri: ${err.message}`);
      process.exit(1);
    }
  }

  // Check WebDriver availability
  const available = await checkWebDriver();
  if (!available) {
    console.error('❌ WebDriver not available on port', webdriverPort);
    console.error('');
    if (!headless) {
      console.error('   To start Tauri with WebDriver:');
      console.error('   1. cd habits-cortex/src-tauri && cargo build');
      console.error('   2. cd habits-cortex && pnpm tauri dev');
      console.error('   3. Wait for "WebDriver server listening on http://127.0.0.1:4445"');
      console.error('');
      console.error('   Or use --headless --habit <path> for auto-launch');
    }
    process.exit(1);
  }

  const startTime = Date.now();
  let sessionId: string | undefined;

  try {
    sessionId = await createSession();
    console.error('   Connected to WebDriver');

    // Execute bit action in the Tauri app's browser context
    const result = await executeAsync(sessionId, `
      const logs = [];
      const _origLog = console.log;
      const _origWarn = console.warn;
      const _origError = console.error;
      console.log = function() { logs.push('[LOG] ' + Array.from(arguments).map(function(a) { return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' ')); _origLog.apply(console, arguments); };
      console.warn = function() { logs.push('[WARN] ' + Array.from(arguments).map(function(a) { return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' ')); _origWarn.apply(console, arguments); };
      console.error = function() { logs.push('[ERROR] ' + Array.from(arguments).map(function(a) { return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' ')); _origError.apply(console, arguments); };

      try {
        if (!window.HabitsBundle) {
          return done({ success: false, error: 'HabitsBundle not available. Load a habit in the app first.', logs: logs });
        }

        var bitName = ${JSON.stringify(bitName)};
        var actionName = ${JSON.stringify(actionName)};
        var input = ${JSON.stringify(input)};
        var auth = ${JSON.stringify(auth || null)};

        // Get bit from bundle registry
        var bits = window.HabitsBundle.bits || {};
        var bit = bits[bitName];

        if (!bit) {
          var available = Object.keys(bits);
          return done({ success: false, error: 'Bit not found in bundle: ' + bitName + '. Available: ' + available.join(', '), logs: logs });
        }

        // Get action
        var action = null;
        if (bit.actions && bit.actions[actionName]) {
          action = bit.actions[actionName];
        } else if (bit.triggers && bit.triggers[actionName]) {
          action = bit.triggers[actionName];
        } else if (bit[actionName]) {
          action = bit[actionName];
        }

        if (!action || (typeof action.run !== 'function' && typeof action.test !== 'function')) {
          return done({ success: false, error: 'Action not found or has no run/test: ' + actionName, logs: logs });
        }

        // Build context
        var context = {
          propsValue: input,
          auth: auth,
          logger: console,
          store: { get: async function() { return null; }, put: async function() {}, delete: async function() {} },
          files: { write: async function(opts) { return '/tmp/' + opts.fileName; } }
        };

        // Execute
        var output = typeof action.run === 'function' ? await action.run(context) : await action.test(context);

        return done({ success: true, output: output, logs: logs });

      } catch (err) {
        return done({ success: false, error: err.message || String(err), logs: logs });
      } finally {
        console.log = _origLog;
        console.warn = _origWarn;
        console.error = _origError;
      }
    `);

    const duration = Date.now() - startTime;

    if (result.__error) {
      console.error(`\n❌ Tauri — ${duration}ms`);
      console.error(`   Error: ${result.__error}`);
      await cleanup(1);
    }

    if (!result.success) {
      console.error(`\n❌ Tauri — ${duration}ms`);
      console.error(`   Error: ${result.error}`);
      if (result.logs && result.logs.length > 0) {
        console.error('   Logs:');
        result.logs.slice(0, 20).forEach((l: string) => console.error('      ' + l));
      }
      await cleanup(1);
    }

    const outputStr = typeof result.output === 'string' ? result.output : JSON.stringify(result.output, null, 2);

    if (hasExpected) {
      const passed = deepEqual(result.output, expected);

      console.error(`\n✅ Tauri — ${duration}ms`);
      console.error(`   Expected: ${JSON.stringify(expected)}`);
      console.error(`   Got:      ${typeof result.output === 'string' ? result.output : JSON.stringify(result.output)}`);

      if (passed) {
        console.error('   ✅ PASS — output matches expected');
      } else {
        console.error('   ❌ FAIL — output does not match expected');
      }
      console.log(outputStr);
      await cleanup(passed ? 0 : 1);
    } else {
      console.error(`\n✅ Tauri — ${duration}ms`);
      console.log(outputStr);
      await cleanup(0);
    }

  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ Tauri — ${duration}ms`);
    console.error(`   Error: ${err.message || String(err)}`);
    await cleanup(1);
  } finally {
    if (sessionId) {
      try { await deleteSession(sessionId); } catch {}
    }
  }
}

async function cleanup(exitCode: number): Promise<never> {
  if (headless) {
    await killTauriApp();
  }
  process.exit(exitCode);
}

// ═══════════════════════════════════════════════════════════════════════════
// Deep equal comparison
// ═══════════════════════════════════════════════════════════════════════════

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object') {
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
    }
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(k => deepEqual(a[k], b[k]));
  }

  return false;
}

main();
