#!/usr/bin/env tsx
// E2E Test Runner - Runs both backend and browser pack tests on the same input
// Usage: tsx scripts/e2e-test.ts [--example <name>] [--habit <name>] [--input <text>]
import { execSync, spawnSync } from 'child_process';
import * as path from 'path';
// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { example: 'marketing-campaign', habit: 'marketing-campaign', input: 'Test campaign for AI productivity tools' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--example' && args[i + 1]) result.example = args[++i];
    else if (args[i] === '--habit' && args[i + 1]) result.habit = args[++i];
    else if (args[i] === '--input' && args[i + 1]) result.input = args[++i];
  }
  return result;
}

const { example, habit, input } = parseArgs();
const ROOT = path.resolve(__dirname, '../..');

console.log('═══════════════════════════════════════════════════════════════════');
console.log('                     E2E Test Runner                               ');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(`📋 Example: ${example}`);
console.log(`📋 Habit:   ${habit}`);
console.log(`📋 Input:   ${input}`);
console.log('═══════════════════════════════════════════════════════════════════\n');

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

// Run Backend Pack Test
console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│                     BACKEND PACK TEST                           │');
console.log('└─────────────────────────────────────────────────────────────────┘\n');

const backendStart = Date.now();
try {
  const backendResult = spawnSync('npx', ['tsx', 'scripts/e2e/test-backend-pack.cts', '--example', example, '--habit', habit, '--input', input], {
    cwd: ROOT,
    stdio: 'inherit',
    encoding: 'utf-8',
  });
  
  if (backendResult.status !== 0) {
    throw new Error(`Process exited with code ${backendResult.status}`);
  }
  
  results.push({
    name: 'Backend Pack',
    success: true,
    duration: Date.now() - backendStart
  });
} catch (error: any) {
  results.push({
    name: 'Backend Pack',
    success: false,
    duration: Date.now() - backendStart,
    error: error.message
  });
}

console.log('\n');

// Run Tauri Pack Test
console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│                      TAURI PACK TEST                            │');
console.log('└─────────────────────────────────────────────────────────────────┘\n');

const tauriStart = Date.now();
try {
  const tauriResult = spawnSync('npx', ['tsx', 'scripts/e2e/test-tauri-pack.cts', '--example', example, '--habit', habit, '--input', input], {
    cwd: ROOT,
    stdio: 'inherit',
    encoding: 'utf-8',
  });
  
  if (tauriResult.status !== 0) {
    throw new Error(`Process exited with code ${tauriResult.status}`);
  }
  
  results.push({
    name: 'Tauri Pack',
    success: true,
    duration: Date.now() - tauriStart
  });
} catch (error: any) {
  results.push({
    name: 'Tauri Pack',
    success: false,
    duration: Date.now() - tauriStart,
    error: error.message
  });
}

// Print Summary
console.log('\n');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('                         TEST SUMMARY                              ');
console.log('═══════════════════════════════════════════════════════════════════\n');

const passed = results.filter(r => r.success).length;
const failed = results.filter(r => !r.success).length;
const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

for (const result of results) {
  const status = result.success ? '✅ PASS' : '❌ FAIL';
  const duration = `${(result.duration / 1000).toFixed(2)}s`;
  console.log(`${status} │ ${result.name.padEnd(15)} │ ${duration}`);
  if (result.error) {
    console.log(`       │ Error: ${result.error}`);
  }
}

console.log('───────────────────────────────────────────────────────────────────');
console.log(`Total: ${passed} passed, ${failed} failed │ Duration: ${(totalDuration / 1000).toFixed(2)}s`);
console.log('═══════════════════════════════════════════════════════════════════\n');

// Exit with appropriate code
process.exit(failed > 0 ? 1 : 0);
