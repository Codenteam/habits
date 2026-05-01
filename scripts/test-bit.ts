#!/usr/bin/env npx tsx
/**
 * scripts/test-bit.ts — Standalone single-bit test runner (Node.js)
 *
 * The smallest possible command to test a bit action in Node.js.
 * No CLI build required — runs directly with tsx.
 *
 * @usage
 *   npx tsx scripts/test-bit.ts @ha-bits/bit-hello-world greet '{"param1":"hello","param2":"world"}'
 *   npx tsx scripts/test-bit.ts @ha-bits/bit-hello-world greet '{"param1":"hello","param2":"world"}' --expected '"HELLO THERE"'
 *   npx tsx scripts/test-bit.ts @ha-bits/bit-hello-world greet '{"param1":"x","param2":"y"}' --expected '"Nah!"'
 *
 *   # Using path instead of package name:
 *   npx tsx scripts/test-bit.ts nodes/bits/@ha-bits/bit-http/src/index.ts send '{"url":"..."}'
 */

import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════════════════
// Parse CLI args: bit action input [--expected <json>] [--auth <json>] [--timeout <ms>]
// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);

function printUsage() {
  console.error('Usage: npx tsx scripts/test-bit.ts <bit> <action> <input-json> [--expected <json>] [--auth <json>] [--timeout <ms>]');
  console.error('');
  console.error('  bit         Bit name (e.g., @ha-bits/bit-hello-world) or path to index.ts');
  console.error('  action      Action name to run (e.g., greet, send, get)');
  console.error('  input-json  JSON input for the action propsValue');
  console.error('');
  console.error('Options:');
  console.error('  --expected   Expected JSON output. If provided, asserts equality and exits 0/1.');
  console.error('  --auth       Auth JSON (optional)');
  console.error('  --timeout    Timeout in ms (default: 30000)');
  console.error('');
  console.error('Examples:');
  console.error('  npx tsx scripts/test-bit.ts @ha-bits/bit-hello-world greet \'{"param1":"hello","param2":"world"}\'');
  console.error('  npx tsx scripts/test-bit.ts @ha-bits/bit-hello-world greet \'{"param1":"hello","param2":"world"}\' --expected \'"HELLO THERE"\'');
  process.exit(2);
}

if (args.length < 3 || args.includes('--help') || args.includes('-h')) {
  printUsage();
}

const bitNameOrPath = args[0];
const actionName = args[1];
let inputJson = args[2];

let expectedJson: string | undefined;
let authJson: string | undefined;
let timeout = 30000;

// Parse remaining args
for (let i = 3; i < args.length; i++) {
  if (args[i] === '--expected' || args[i] === '-e') {
    expectedJson = args[++i];
  } else if (args[i] === '--auth' || args[i] === '-a') {
    authJson = args[++i];
  } else if (args[i] === '--timeout' || args[i] === '-t') {
    timeout = parseInt(args[++i], 10);
  }
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
// Resolve bit path
// ═══════════════════════════════════════════════════════════════════════════

function getWorkspaceRoot(): string {
  let current = __dirname;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return process.cwd();
}

function resolveBitPath(bit: string): string | null {
  const workspaceRoot = getWorkspaceRoot();

  // Direct path to a file
  if ((bit.startsWith('.') || bit.startsWith('/') || bit.startsWith('nodes/')) && fs.existsSync(bit)) {
    return path.resolve(bit);
  }

  // @ha-bits/bit-xyz pattern
  if (bit.startsWith('@ha-bits/')) {
    const bitName = bit.replace('@ha-bits/', '');
    const candidates = [
      path.join(workspaceRoot, 'nodes/bits/@ha-bits', bitName, 'src/index.ts'),
      path.join(workspaceRoot, 'nodes/bits/@ha-bits', bitName, 'dist/index.js'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Run the bit action
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const bitPath = resolveBitPath(bitNameOrPath);
  if (!bitPath) {
    console.error(`❌ Bit not found: ${bitNameOrPath}`);
    console.error('   Tried workspace nodes/bits/@ha-bits/<name>/src/index.ts');
    process.exit(1);
  }

  const startTime = Date.now();

  console.error(`🧪 Testing: ${bitNameOrPath}/${actionName}`);
  console.error(`   Bit path: ${bitPath}`);
  console.error(`   Input: ${JSON.stringify(input)}`);

  // Dynamic import the bit module
  const bitModule = await import(bitPath);
  const bit = bitModule.default || bitModule;

  // Resolve the action
  let action: any = null;
  if (bit.actions && bit.actions[actionName]) {
    action = bit.actions[actionName];
  } else if (bit.triggers && bit.triggers[actionName]) {
    action = bit.triggers[actionName];
  } else if (bit[actionName]) {
    action = bit[actionName];
  }

  if (!action) {
    console.error(`❌ Action/trigger not found: ${actionName}`);
    const available = [
      ...Object.keys(bit.actions || {}).map(k => `action:${k}`),
      ...Object.keys(bit.triggers || {}).map(k => `trigger:${k}`),
    ];
    if (available.length > 0) {
      console.error(`   Available: ${available.join(', ')}`);
    }
    process.exit(1);
  }

  if (typeof action.run !== 'function' && typeof action.test !== 'function') {
    console.error(`❌ Action "${actionName}" has no run() or test() method`);
    process.exit(1);
  }

  // Build context
  const context = {
    propsValue: input,
    auth: auth || null,
    logger: console,
    store: {
      get: async () => null,
      put: async () => {},
      delete: async () => {},
    },
    files: {
      write: async ({ fileName, data }: { fileName: string; data: string }) => '/tmp/' + fileName,
    },
  };

  try {
    // Prefer run(), fall back to test()
    const result = typeof action.run === 'function'
      ? await action.run(context)
      : await action.test(context);

    const duration = Date.now() - startTime;
    const outputStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2);

    // ═══════════════════════════════════════════════════════════════════════
    // Output & assertion
    // ═══════════════════════════════════════════════════════════════════════

    if (hasExpected) {
      const passed = deepEqual(result, expected);

      console.error(`\n✅ Node.js — ${duration}ms`);
      console.error(`   Expected: ${JSON.stringify(expected)}`);
      console.error(`   Got:      ${typeof result === 'string' ? result : JSON.stringify(result)}`);

      if (passed) {
        console.error('   ✅ PASS — output matches expected');
      } else {
        console.error('   ❌ FAIL — output does not match expected');
      }
      console.log(outputStr);
      process.exit(passed ? 0 : 1);
    } else {
      console.error(`\n✅ Node.js — ${duration}ms`);
      console.log(outputStr);
      process.exit(0);
    }
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ Node.js — ${duration}ms`);
    console.error(`   Error: ${err.message || String(err)}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(0, 5).map((l: string) => '   ' + l).join('\n'));
    }
    process.exit(1);
  }
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
