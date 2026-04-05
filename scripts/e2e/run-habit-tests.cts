#!/usr/bin/env tsx
/**
 * Unified E2E Test Runner for Habits
 * 
 * Runs tests from habit.test.yaml files with real AI models (no mocks)
 * Supports both Tauri (habits-cortex app) and Cortex (Node.js server) modes
 * 
 * Usage:
 *   npx tsx scripts/e2e/run-habit-tests.cts --test-file <path> [options]
 * 
 * Options:
 *   --test-file <path>    Path to habit.test.yaml file (required)
 *   --mode <mode>         'cortex' (default) or 'tauri'
 *   --tags <tags>         Comma-separated tags to filter tests
 *   --test <name>         Filter tests by name (substring match)
 *   --verbose, -v         Show detailed output
 *   --port <port>         Port for cortex server (default: 13000)
 *   --timeout <ms>        Timeout per test in ms (default: 300000)
 *   --skip-server-start   Don't start server, assume it's running
 * 
 * Examples:
 *   # Run all tests from local-ai showcase in cortex mode
 *   npx tsx scripts/e2e/run-habit-tests.cts --test-file showcase/local-ai/habit.test.yaml
 * 
 *   # Run quick tests in tauri mode
 *   npx tsx scripts/e2e/run-habit-tests.cts --test-file showcase/local-ai/habit.test.yaml --mode tauri --tags quick
 * 
 *   # Run specific test
 *   npx tsx scripts/e2e/run-habit-tests.cts --test-file showcase/local-ai/habit.test.yaml --test "math"
 */

import { spawn, spawnSync, ChildProcess, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface TestCase {
  name: string;
  workflow: string;
  description?: string;
  context?: {
    habits?: {
      input?: Record<string, any>;
      env?: Record<string, string>;
    };
  };
  trigger?: {
    body?: Record<string, any>;
  };
  expect?: Record<string, any>;
  expectSteps?: Record<string, any>;
  expectError?: string;
  expectContains?: { field: string; value: string };
  expectContainsAny?: { field: string; values: string[] };
  followUp?: {
    workflow: string;
    inputMapping: Record<string, string>;
    expect?: Record<string, any>;
    expectContains?: { field: string; value: string };
    expectContainsAny?: { field: string; values: string[] };
  };
  tags?: string[];
  mocks?: any; // Mocked tests will be skipped in real E2E
}

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  output?: any;
  skipped?: boolean;
  skipReason?: string;
}

interface CLIArgs {
  testFile: string;
  mode: 'cortex' | 'tauri';
  tags: string;
  test: string;
  verbose: boolean;
  port: number;
  timeout: number;
  skipServerStart: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI Argument Parsing
// ═══════════════════════════════════════════════════════════════════════════

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const result: CLIArgs = {
    testFile: '',
    mode: 'cortex',
    tags: '',
    test: '',
    verbose: false,
    port: 13000,
    timeout: 300000,
    skipServerStart: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--test-file':
        result.testFile = args[++i] || '';
        break;
      case '--mode':
        result.mode = (args[++i] || 'cortex') as 'cortex' | 'tauri';
        break;
      case '--tags':
        result.tags = args[++i] || '';
        break;
      case '--test':
        result.test = args[++i] || '';
        break;
      case '--verbose':
      case '-v':
        result.verbose = true;
        break;
      case '--port':
        result.port = parseInt(args[++i], 10) || 13000;
        break;
      case '--timeout':
        result.timeout = parseInt(args[++i], 10) || 300000;
        break;
      case '--skip-server-start':
        result.skipServerStart = true;
        break;
    }
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════

const ROOT = path.resolve(__dirname, '../..');

function containsString(actual: string, expected: string): boolean {
  if (typeof actual !== 'string') return false;
  return actual.toLowerCase().includes(expected.toLowerCase());
}

function containsAnyString(actual: string, expected: string[]): boolean {
  if (typeof actual !== 'string') return false;
  return expected.some(v => containsString(actual, v));
}

function getFieldValue(obj: any, field: string): any {
  return field.split('.').reduce((o, k) => o?.[k], obj);
}

function partialMatch(actual: any, expected: any): boolean {
  if (expected === undefined) return true;
  if (actual === expected) return true;
  
  // Empty object {} just checks existence
  if (typeof expected === 'object' && expected !== null && Object.keys(expected).length === 0) {
    return actual !== undefined && actual !== null;
  }
  
  if (typeof expected !== 'object' || expected === null) {
    return actual === expected;
  }
  
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return false;
    // Empty array [] just checks it's an array
    if (expected.length === 0) return true;
    return expected.every((item, i) => partialMatch(actual[i], item));
  }
  
  if (typeof actual !== 'object' || actual === null) return false;
  
  return Object.keys(expected).every(key => partialMatch(actual[key], expected[key]));
}

function resolveTemplatePaths(input: any, baseDir: string): any {
  if (typeof input === 'string') {
    // Resolve relative file paths
    if (input.startsWith('./') || input.startsWith('../')) {
      return path.resolve(baseDir, input);
    }
    return input;
  }
  if (Array.isArray(input)) {
    return input.map(item => resolveTemplatePaths(item, baseDir));
  }
  if (typeof input === 'object' && input !== null) {
    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      resolved[key] = resolveTemplatePaths(value, baseDir);
    }
    return resolved;
  }
  return input;
}

// ═══════════════════════════════════════════════════════════════════════════
// Cortex Backend Executor
// ═══════════════════════════════════════════════════════════════════════════

class CortexExecutor {
  private serverProcess: ChildProcess | null = null;
  private serverLogs: string[] = [];
  private port: number;
  private configPath: string;
  private verbose: boolean;
  
  constructor(configPath: string, port: number, verbose: boolean) {
    this.configPath = configPath;
    this.port = port;
    this.verbose = verbose;
  }
  
  async startServer(): Promise<boolean> {
    // Check if server is already running
    if (await this.isServerReady()) {
      if (this.verbose) console.log('    ℹ️  Server already running');
      return true;
    }
    
    console.log('🚀 Starting cortex server...');
    
    this.serverProcess = spawn('npx', [
      'tsx',
      'packages/cortex/server/src/main.ts',
      'server',
      '--config', this.configPath,
      '--port', String(this.port)
    ], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PORT: String(this.port) }
    });
    
    this.serverProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      this.serverLogs.push(text);
      if (this.verbose && (text.includes('listening') || text.includes('ready') || text.includes('✅'))) {
        console.log('  [server]', text.trim());
      }
    });
    
    this.serverProcess.stderr?.on('data', (data) => {
      this.serverLogs.push('[stderr] ' + data.toString());
    });
    
    // Wait for server to be ready
    process.stdout.write('⏳ Waiting for server');
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.isServerReady()) {
        console.log(' ✅');
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      process.stdout.write('.');
    }
    
    console.log(' ❌');
    console.error('Server logs:\n' + this.serverLogs.slice(-20).join(''));
    return false;
  }
  
  private async isServerReady(): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${this.port}/misc/workflows`);
      return response.ok;
    } catch {
      return false;
    }
  }
  
  async executeWorkflow(workflow: string, input: Record<string, any>): Promise<{ success: boolean; output: any; error?: string }> {
    if (this.verbose) {
      const inputStr = JSON.stringify(input);
      console.log(`    📥 Input: ${inputStr.substring(0, 100)}${inputStr.length > 100 ? '...' : ''}`);
    }
    
    try {
      // The cortex server exposes workflows at /api/{workflowId}
      const response = await fetch(`http://localhost:${this.port}/api/${workflow}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      
      const result = await response.json();
      
      if (this.verbose) {
        const outputStr = JSON.stringify(result.output || result);
        console.log(`    📤 Output: ${outputStr.substring(0, 150)}${outputStr.length > 150 ? '...' : ''}`);
      }
      
      if (result.status === 'failed' || result.error) {
        return { success: false, output: result.output, error: result.error || 'Workflow failed' };
      }
      
      return { success: true, output: result.output || result };
    } catch (error: any) {
      return { success: false, output: null, error: error.message };
    }
  }
  
  async stop(): Promise<void> {
    if (this.serverProcess) {
      console.log('🛑 Stopping server...');
      this.serverProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.serverProcess = null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Tauri Executor
// ═══════════════════════════════════════════════════════════════════════════

class TauriExecutor {
  private binaryPath: string | null = null;
  private habitFile: string;
  private verbose: boolean;
  
  constructor(habitFile: string, verbose: boolean) {
    this.habitFile = habitFile;
    this.verbose = verbose;
  }
  
  private findBinary(): string | null {
    const targetDir = path.join(ROOT, 'habits-cortex/src-tauri/target/debug');
    if (!fs.existsSync(targetDir)) return null;
    
    const bins = fs.readdirSync(targetDir).filter(f => {
      const p = path.join(targetDir, f);
      return (f === 'habits-cortex' || f === 'habits-cortex.exe') && fs.statSync(p).isFile();
    });
    
    return bins.length > 0 ? path.join(targetDir, bins[0]) : null;
  }
  
  async ensureBinary(): Promise<boolean> {
    this.binaryPath = this.findBinary();
    
    if (!this.binaryPath) {
      console.log('🔨 Building habits-cortex app...');
      try {
        execSync('pnpm tauri build --debug --no-bundle', {
          cwd: path.join(ROOT, 'habits-cortex'),
          stdio: this.verbose ? 'inherit' : 'pipe'
        });
      } catch (err) {
        console.error('❌ Failed to build habits-cortex');
        return false;
      }
      
      this.binaryPath = this.findBinary();
    }
    
    if (!this.binaryPath) {
      console.error('❌ habits-cortex binary not found');
      return false;
    }
    
    if (this.verbose) {
      console.log(`✅ Using binary: ${this.binaryPath}`);
    }
    
    return true;
  }
  
  async executeWorkflow(workflow: string, input: Record<string, any>): Promise<{ success: boolean; output: any; error?: string }> {
    if (!this.binaryPath) {
      return { success: false, output: null, error: 'Binary not found' };
    }
    
    if (this.verbose) {
      const inputStr = JSON.stringify(input);
      console.log(`    📥 Input: ${inputStr.substring(0, 100)}${inputStr.length > 100 ? '...' : ''}`);
    }
    
    const result = spawnSync(this.binaryPath, [
      '--test',
      '--habit', this.habitFile,
      '--workflow', workflow,
      '--input', JSON.stringify(input)
    ], {
      stdio: 'pipe',
      timeout: 300000,
      env: { ...process.env }
    });
    
    const stdout = result.stdout?.toString() || '';
    const stderr = result.stderr?.toString() || '';
    
    if (this.verbose && stderr) {
      // Filter out GPU/Metal noise
      const relevantStderr = stderr.split('\n')
        .filter(l => !l.includes('ggml_') && !l.includes('MTL'))
        .join('\n').trim();
      if (relevantStderr) {
        console.log(`    ⚠️  ${relevantStderr.substring(0, 200)}`);
      }
    }
    
    // Parse result from stdout (look for JSON with workflow result)
    const lines = stdout.trim().split('\n');
    const jsonLines = lines.filter(l => l.includes('"workflowId"') || l.includes('"output"'));
    
    for (const line of jsonLines.reverse()) {
      try {
        // Extract JSON from log line
        const jsonMatch = line.match(/\{.*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.output !== undefined) {
            if (this.verbose) {
              const outputStr = JSON.stringify(parsed.output);
              console.log(`    📤 Output: ${outputStr.substring(0, 150)}${outputStr.length > 150 ? '...' : ''}`);
            }
            
            if (parsed.status === 'failed') {
              return { success: false, output: parsed.output, error: parsed.error || 'Workflow failed' };
            }
            
            return { success: true, output: parsed.output };
          }
        }
      } catch {
        // Not valid JSON, continue
      }
    }
    
    if (result.status !== 0) {
      return { success: false, output: null, error: `Exit code ${result.status}\n${stdout.slice(-500)}` };
    }
    
    return { success: false, output: null, error: `No workflow output found\n${stdout.slice(-500)}` };
  }
  
  async stop(): Promise<void> {
    // Nothing to clean up for Tauri
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Runner
// ═══════════════════════════════════════════════════════════════════════════

async function verifyAssertions(
  test: TestCase,
  output: any,
  prefix: string = ''
): Promise<{ passed: boolean; error?: string }> {
  const p = prefix ? `${prefix}: ` : '';
  
  // Check basic expect (partial match)
  if (test.expect) {
    if (!partialMatch(output, test.expect)) {
      return {
        passed: false,
        error: `${p}Output mismatch. Expected: ${JSON.stringify(test.expect)}, Got: ${JSON.stringify(output)}`
      };
    }
  }
  
  // Check expectContains (string containment)
  if (test.expectContains) {
    const actualValue = getFieldValue(output, test.expectContains.field);
    if (!containsString(String(actualValue || ''), test.expectContains.value)) {
      return {
        passed: false,
        error: `${p}Field "${test.expectContains.field}" does not contain "${test.expectContains.value}". Got: "${actualValue}"`
      };
    }
  }
  
  // Check expectContainsAny (string containment with multiple options)
  if (test.expectContainsAny) {
    const actualValue = getFieldValue(output, test.expectContainsAny.field);
    if (!containsAnyString(String(actualValue || ''), test.expectContainsAny.values)) {
      return {
        passed: false,
        error: `${p}Field "${test.expectContainsAny.field}" does not contain any of [${test.expectContainsAny.values.join(', ')}]. Got: "${actualValue}"`
      };
    }
  }
  
  return { passed: true };
}

async function runTest(
  test: TestCase,
  executor: CortexExecutor | TauriExecutor,
  baseDir: string,
  verbose: boolean
): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    name: test.name,
    passed: false,
    duration: 0
  };
  
  // Get input from context.habits.input or trigger.body
  let input = test.context?.habits?.input || test.trigger?.body || {};
  input = resolveTemplatePaths(input, baseDir);
  
  try {
    // Execute main workflow
    const exec = await executor.executeWorkflow(test.workflow, input);
    
    if (!exec.success) {
      // Check if we expected an error
      if (test.expectError && exec.error?.includes(test.expectError)) {
        result.passed = true;
        result.duration = Date.now() - startTime;
        return result;
      }
      
      result.error = exec.error;
      result.duration = Date.now() - startTime;
      return result;
    }
    
    result.output = exec.output;
    
    // Verify main assertions
    const mainCheck = await verifyAssertions(test, exec.output);
    if (!mainCheck.passed) {
      result.error = mainCheck.error;
      result.duration = Date.now() - startTime;
      return result;
    }
    
    // Handle follow-up workflow (pipeline tests)
    if (test.followUp) {
      const followUpInput: Record<string, any> = {};
      
      // Map outputs from first workflow to inputs for second
      for (const [key, mapping] of Object.entries(test.followUp.inputMapping)) {
        if (typeof mapping === 'string' && mapping.startsWith('{{output.')) {
          const field = mapping.slice(9, -2); // Extract field name from {{output.field}}
          followUpInput[key] = getFieldValue(exec.output, field);
        } else {
          followUpInput[key] = mapping;
        }
      }
      
      if (verbose) {
        console.log(`    🔗 Follow-up workflow: ${test.followUp.workflow}`);
      }
      
      const followUpExec = await executor.executeWorkflow(test.followUp.workflow, followUpInput);
      
      if (!followUpExec.success) {
        result.error = `Follow-up workflow failed: ${followUpExec.error}`;
        result.duration = Date.now() - startTime;
        return result;
      }
      
      // Verify follow-up assertions
      const followUpCheck = await verifyAssertions(
        {
          name: test.name,
          workflow: test.followUp.workflow,
          expect: test.followUp.expect,
          expectContains: test.followUp.expectContains,
          expectContainsAny: test.followUp.expectContainsAny,
        },
        followUpExec.output,
        'Follow-up'
      );
      
      if (!followUpCheck.passed) {
        result.error = followUpCheck.error;
        result.duration = Date.now() - startTime;
        return result;
      }
    }
    
    result.passed = true;
    result.duration = Date.now() - startTime;
    return result;
    
  } catch (error: any) {
    result.error = error.message;
    result.duration = Date.now() - startTime;
    return result;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const args = parseArgs();
  
  // Validate required args
  if (!args.testFile) {
    console.error('❌ --test-file is required');
    console.error('\nUsage: npx tsx scripts/e2e/run-habit-tests.cts --test-file <path> [options]');
    console.error('\nOptions:');
    console.error('  --test-file <path>    Path to habit.test.yaml file (required)');
    console.error('  --mode <mode>         "cortex" (default) or "tauri"');
    console.error('  --tags <tags>         Comma-separated tags to filter tests');
    console.error('  --test <name>         Filter tests by name (substring match)');
    console.error('  --verbose, -v         Show detailed output');
    console.error('  --port <port>         Port for cortex server (default: 13000)');
    console.error('  --skip-server-start   Assume server is already running');
    process.exit(1);
  }
  
  // Resolve paths
  const testFilePath = path.isAbsolute(args.testFile) 
    ? args.testFile 
    : path.resolve(ROOT, args.testFile);
  
  if (!fs.existsSync(testFilePath)) {
    console.error(`❌ Test file not found: ${testFilePath}`);
    process.exit(1);
  }
  
  const testDir = path.dirname(testFilePath);
  
  // Load test file
  const content = fs.readFileSync(testFilePath, 'utf-8');
  const testFile = yaml.parse(content);
  
  // Resolve config path (stack.yaml relative to test file)
  let configPath = testFile.workflow || './stack.yaml';
  if (configPath.startsWith('./') || configPath.startsWith('../')) {
    configPath = path.resolve(testDir, configPath);
  }
  
  if (!fs.existsSync(configPath)) {
    console.error(`❌ Config file not found: ${configPath}`);
    process.exit(1);
  }
  
  // Get tests
  const tests: TestCase[] = testFile.tests || [];
  
  // Filter by tags
  let filteredTests = tests;
  if (args.tags) {
    const tagList = args.tags.split(',').map(t => t.trim().toLowerCase());
    filteredTests = tests.filter(t => t.tags?.some(tag => tagList.includes(tag.toLowerCase())));
  }
  
  // Filter by name
  if (args.test) {
    filteredTests = filteredTests.filter(t => t.name.toLowerCase().includes(args.test.toLowerCase()));
  }
  
  // Print header
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('              HABIT E2E TEST RUNNER                                ');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`📋 Test file: ${testFilePath}`);
  console.log(`📋 Config:    ${configPath}`);
  console.log(`📋 Mode:      ${args.mode.toUpperCase()}`);
  console.log(`📋 Tests:     ${filteredTests.length}/${tests.length}${args.tags ? ` (tags: ${args.tags})` : ''}${args.test ? ` (filter: ${args.test})` : ''}`);
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  // Create executor based on mode
  let executor: CortexExecutor | TauriExecutor;
  
  if (args.mode === 'tauri') {
    // For Tauri, we need the .habit file, not stack.yaml
    // Look for dist/<name>.habit
    const showcaseName = path.basename(testDir);
    const habitFile = path.join(testDir, 'dist', `${showcaseName}.habit`);
    
    if (!fs.existsSync(habitFile)) {
      console.log(`⚠️  .habit file not found at ${habitFile}`);
      console.log('   Building .habit file...');
      try {
        execSync(`pnpm tsx packages/habits/app/src/cli.ts pack --config "${configPath}" --format habit`, {
          cwd: ROOT,
          stdio: args.verbose ? 'inherit' : 'pipe'
        });
      } catch (err) {
        console.error('❌ Failed to build .habit file');
        process.exit(1);
      }
    }
    
    executor = new TauriExecutor(habitFile, args.verbose);
    if (!(await executor.ensureBinary())) {
      process.exit(1);
    }
  } else {
    executor = new CortexExecutor(configPath, args.port, args.verbose);
    if (!args.skipServerStart) {
      if (!(await executor.startServer())) {
        process.exit(1);
      }
    }
  }
  
  // Run tests
  const results: TestResult[] = [];
  
  for (const test of filteredTests) {
    console.log(`🧪 ${test.name}`);
    
    // Skip tests with mocks (we're running E2E with real services)
    if (test.mocks && Object.keys(test.mocks).length > 0) {
      console.log(`   ⏭️  Skipped (uses mocks)\n`);
      results.push({ name: test.name, passed: true, duration: 0, skipped: true, skipReason: 'uses mocks' });
      continue;
    }
    
    // Skip tests with 'skip' tag
    if (test.tags?.includes('skip')) {
      console.log(`   ⏭️  Skipped (skip tag)\n`);
      results.push({ name: test.name, passed: true, duration: 0, skipped: true, skipReason: 'skip tag' });
      continue;
    }
    
    // Skip tests with unresolved placeholders
    const inputStr = JSON.stringify(test.context?.habits?.input || test.trigger?.body || {});
    if (inputStr.includes('{{') && !inputStr.includes('{{output.')) {
      const placeholder = inputStr.match(/\{\{([^}]+)\}\}/)?.[1] || 'unknown';
      console.log(`   ⏭️  Skipped (unresolved placeholder: ${placeholder})\n`);
      results.push({ name: test.name, passed: true, duration: 0, skipped: true, skipReason: `placeholder: ${placeholder}` });
      continue;
    }
    
    const result = await runTest(test, executor, testDir, args.verbose);
    results.push(result);
    
    if (result.passed) {
      console.log(`   ✅ Passed (${(result.duration / 1000).toFixed(2)}s)\n`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
      if (args.verbose && result.output) {
        console.log(`   📤 Output: ${JSON.stringify(result.output).substring(0, 300)}`);
      }
      console.log('');
    }
  }
  
  // Stop executor
  await executor.stop();
  
  // Print summary
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                         TEST SUMMARY                              ');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const passed = results.filter(r => r.passed && !r.skipped).length;
  const failed = results.filter(r => !r.passed).length;
  const skipped = results.filter(r => r.skipped).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  for (const result of results) {
    const status = result.skipped ? '⏭️  SKIP' : result.passed ? '✅ PASS' : '❌ FAIL';
    const duration = result.skipped ? '-' : `${(result.duration / 1000).toFixed(2)}s`;
    const name = result.name.length > 50 ? result.name.substring(0, 47) + '...' : result.name;
    console.log(`${status} │ ${name.padEnd(50)} │ ${duration}`);
    if (result.skipped && result.skipReason) {
      console.log(`       │ ${'(' + result.skipReason + ')'.padEnd(50)} │`);
    }
  }
  
  console.log('───────────────────────────────────────────────────────────────────');
  console.log(`Total: ${passed} passed, ${failed} failed, ${skipped} skipped │ Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
