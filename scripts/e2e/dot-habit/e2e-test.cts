#!/usr/bin/env tsx
/**
 * E2E Test Runner for .habit files
 * Runs all three test modes: cortex backend, habits-cortex app, standalone tauri
 * 
 * Usage: tsx scripts/e2e/dot-habit/e2e-test.cts --example <name> --workflow <name> [--input <json>] [--skip-cortex-app] [--skip-standalone]
 */
import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { 
    example: 'marketing-campaign', 
    workflow: 'marketing-campaign', 
    input: '{}',
    skipCortexApp: false,
    skipStandalone: false
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--example' && args[i + 1]) result.example = args[++i];
    else if (args[i] === '--workflow' && args[i + 1]) result.workflow = args[++i];
    else if (args[i] === '--input' && args[i + 1]) result.input = args[++i];
    else if (args[i] === '--skip-cortex-app') result.skipCortexApp = true;
    else if (args[i] === '--skip-standalone') result.skipStandalone = true;
  }
  return result;
}

const { example, workflow, input, skipCortexApp, skipStandalone } = parseArgs();

const ROOT = path.resolve(__dirname, '../../..');
const SHOWCASE_DIR = path.join(ROOT, `showcase/${example}`);
const CONFIG = path.join(SHOWCASE_DIR, 'stack.yaml');
const HABIT_FILE = path.join(SHOWCASE_DIR, `dist/${example}.habit`);

console.log('═══════════════════════════════════════════════════════════════════');
console.log('              .HABIT FILE E2E TEST RUNNER                          ');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(`📋 Example:  ${example}`);
console.log(`📋 Workflow: ${workflow}`);
console.log(`📋 Input:    ${input}`);
console.log('═══════════════════════════════════════════════════════════════════\n');

// Check config exists
if (!fs.existsSync(CONFIG)) {
  console.error(`❌ Config not found: ${CONFIG}`);
  process.exit(1);
}

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  skipped?: boolean;
}

const results: TestResult[] = [];

// Step 1: Ensure .habit file exists
console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│                  STEP 1: ENSURE .HABIT FILE                     │');
console.log('└─────────────────────────────────────────────────────────────────┘\n');

if (!fs.existsSync(HABIT_FILE)) {
  console.log(`📦 .habit file not found, packing...`);
  try {
    execSync(`pnpm tsx packages/habits/app/src/cli.ts pack --config "${CONFIG}" --format habit`, {
      cwd: ROOT,
      stdio: 'inherit'
    });
  } catch (err) {
    console.error('❌ Failed to pack .habit file');
    process.exit(1);
  }
  
  if (!fs.existsSync(HABIT_FILE)) {
    console.error(`❌ .habit file still not found after packing: ${HABIT_FILE}`);
    process.exit(1);
  }
}
console.log(`✅ .habit file ready: ${HABIT_FILE}\n`);

// Test 1: Cortex Backend
console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│              TEST 1: CORTEX BACKEND (.habit)                    │');
console.log('└─────────────────────────────────────────────────────────────────┘\n');

const backendStart = Date.now();
try {
  const backendResult = spawnSync('npx', [
    'tsx', 
    'scripts/e2e/dot-habit/test-cortex-backend.cts',
    '--habit-file', HABIT_FILE,
    '--workflow', workflow,
    '--input', input
  ], {
    cwd: ROOT,
    stdio: 'inherit',
    encoding: 'utf-8',
    timeout: 180000
  });
  
  if (backendResult.status !== 0) {
    throw new Error(`Process exited with code ${backendResult.status}`);
  }
  
  results.push({
    name: 'Cortex Backend',
    success: true,
    duration: Date.now() - backendStart
  });
} catch (error: any) {
  results.push({
    name: 'Cortex Backend',
    success: false,
    duration: Date.now() - backendStart,
    error: error.message
  });
}

console.log('\n');

// Test 2: habits-cortex Tauri App
console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│           TEST 2: HABITS-CORTEX TAURI APP (.habit)              │');
console.log('└─────────────────────────────────────────────────────────────────┘\n');

if (skipCortexApp) {
  console.log('⏭️  Skipped (--skip-cortex-app)');
  results.push({
    name: 'habits-cortex App',
    success: true,
    duration: 0,
    skipped: true
  });
} else {
  const cortexAppStart = Date.now();
  try {
    const cortexAppResult = spawnSync('npx', [
      'tsx',
      'scripts/e2e/dot-habit/test-habits-cortex-app.cts',
      '--habit-file', HABIT_FILE,
      '--workflow', workflow,
      '--input', input
    ], {
      cwd: ROOT,
      stdio: 'inherit',
      encoding: 'utf-8',
      timeout: 300000
    });
    
    if (cortexAppResult.status !== 0) {
      throw new Error(`Process exited with code ${cortexAppResult.status}`);
    }
    
    results.push({
      name: 'habits-cortex App',
      success: true,
      duration: Date.now() - cortexAppStart
    });
  } catch (error: any) {
    results.push({
      name: 'habits-cortex App',
      success: false,
      duration: Date.now() - cortexAppStart,
      error: error.message
    });
  }
}

console.log('\n');

// Test 3: Standalone Tauri App
console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│             TEST 3: STANDALONE TAURI APP (pack)                 │');
console.log('└─────────────────────────────────────────────────────────────────┘\n');

if (skipStandalone) {
  console.log('⏭️  Skipped (--skip-standalone)');
  results.push({
    name: 'Standalone Tauri',
    success: true,
    duration: 0,
    skipped: true
  });
} else {
  const standaloneStart = Date.now();
  try {
    const standaloneResult = spawnSync('npx', [
      'tsx',
      'scripts/e2e/dot-habit/test-standalone-tauri.cts',
      '--example', example,
      '--workflow', workflow,
      '--input', input
    ], {
      cwd: ROOT,
      stdio: 'inherit',
      encoding: 'utf-8',
      timeout: 600000
    });
    
    if (standaloneResult.status !== 0) {
      throw new Error(`Process exited with code ${standaloneResult.status}`);
    }
    
    results.push({
      name: 'Standalone Tauri',
      success: true,
      duration: Date.now() - standaloneStart
    });
  } catch (error: any) {
    results.push({
      name: 'Standalone Tauri',
      success: false,
      duration: Date.now() - standaloneStart,
      error: error.message
    });
  }
}

// Print Summary
console.log('\n');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('                         TEST SUMMARY                              ');
console.log('═══════════════════════════════════════════════════════════════════\n');

const passed = results.filter(r => r.success && !r.skipped).length;
const failed = results.filter(r => !r.success).length;
const skipped = results.filter(r => r.skipped).length;
const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

for (const result of results) {
  let status: string;
  if (result.skipped) {
    status = '⏭️ SKIP';
  } else if (result.success) {
    status = '✅ PASS';
  } else {
    status = '❌ FAIL';
  }
  const duration = `${(result.duration / 1000).toFixed(2)}s`;
  console.log(`${status} │ ${result.name.padEnd(20)} │ ${duration}`);
  if (result.error) {
    console.log(`       │ Error: ${result.error}`);
  }
}

console.log('───────────────────────────────────────────────────────────────────');
console.log(`Total: ${passed} passed, ${failed} failed, ${skipped} skipped │ Duration: ${(totalDuration / 1000).toFixed(2)}s`);
console.log('═══════════════════════════════════════════════════════════════════\n');

// Exit with appropriate code
process.exit(failed > 0 ? 1 : 0);
