#!/usr/bin/env npx tsx

/**
 * =============================================================================
 * Habits HTTP Integration Test Runner
 * =============================================================================
 * This script runs through each test directory, starts the workflow server,
 * executes HTTP tests using httpyac, and reports assertion results.
 * =============================================================================
 */

import { spawn, ChildProcess, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

// Configuration
const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.join(SCRIPT_DIR, '..');
const TEST_DIR = SCRIPT_DIR; // Script is now in test directory
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'test-results-http.txt');
const DEFAULT_PORT = 3000;
const SERVER_STARTUP_TIMEOUT = 30000; // 30 seconds
const SERVER_SHUTDOWN_WAIT = 2000; // 2 seconds

// ANSI Colors
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

// Test results tracking
interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
}

const results: TestResult[] = [];
let currentServerProcess: ChildProcess | null = null;

// =============================================================================
// Logging Functions
// =============================================================================

function logInfo(message: string): void {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function logSuccess(message: string): void {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message: string): void {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logWarning(message: string): void {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function logHeader(message: string): void {
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  ${message}${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
}

// =============================================================================
// Helper Functions
// =============================================================================

function getPortFromConfig(configPath: string): number {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config?.server?.port || DEFAULT_PORT;
  } catch {
    return DEFAULT_PORT;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port,
      path: '/health',
      method: 'GET',
      timeout: 1000,
    }, (res) => {
      resolve(true);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

async function waitForServer(port: number, timeout: number = SERVER_STARTUP_TIMEOUT): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await isPortInUse(port)) {
      return true;
    }
    await sleep(500);
  }
  
  return false;
}

function killPort(port: number): void {
  try {
    if (process.platform === 'darwin') {
      // macOS - xargs without -r flag
      execSync(`lsof -t -i :${port} 2>/dev/null | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
    } else if (process.platform === 'linux') {
      execSync(`lsof -t -i :${port} | xargs -r kill -9 2>/dev/null || true`, { stdio: 'ignore' });
    } else {
      // Windows
      execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { stdio: 'ignore' });
    }
  } catch {
    // Ignore errors - port might not be in use
  }
}

async function startServer(testName: string, port: number): Promise<boolean> {
  const testPath = path.join(TEST_DIR, testName);
  const configFile = path.join(testPath, 'config.json');
  const envFile = path.join(testPath, '.env');
  
  // Kill any existing process on this port
  killPort(port);
  await sleep(1000);
  
  logInfo(`Starting server on port ${port} for ${testName}...`);
  
  // Build command args
  const args = ['tsx'];
  
  // Add env file if exists
  if (fs.existsSync(envFile)) {
    args.push(`--env-file=${envFile}`);
  }
  
  args.push('src/executer.ts', 'server', '--config', configFile);
  
  // Start server process
  currentServerProcess = spawn('npx', args, {
    cwd: PROJECT_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });
  
  // Log server output to file
  const logFile = fs.createWriteStream(`/tmp/habits-server-${testName}.log`);
  currentServerProcess.stdout?.pipe(logFile);
  currentServerProcess.stderr?.pipe(logFile);
  
  // Handle process errors
  currentServerProcess.on('error', (err) => {
    logError(`Server process error: ${err.message}`);
  });
  
  // Wait for server to be ready
  if (await waitForServer(port)) {
    logSuccess(`Server started (PID: ${currentServerProcess.pid})`);
    return true;
  } else {
    logError('Server failed to start within timeout');
    stopServer(port);
    return false;
  }
}

async function stopServer(port: number): Promise<void> {
  if (currentServerProcess) {
    logInfo(`Stopping server (PID: ${currentServerProcess.pid})...`);
    
    try {
      currentServerProcess.kill('SIGTERM');
    } catch {
      // Process might already be dead
    }
    
    currentServerProcess = null;
  }
  
  killPort(port);
  await sleep(SERVER_SHUTDOWN_WAIT);
}

async function runHttpTests(testName: string): Promise<{ success: boolean; output: string }> {
  const httpFile = path.join(TEST_DIR, testName, 'test.http');
  
  if (!fs.existsSync(httpFile)) {
    return { success: false, output: 'No test.http file found' };
  }
  
  logInfo(`Running HTTP tests: ${httpFile}`);
  
  const HTTP_TEST_TIMEOUT = 60000; // 60 seconds timeout for HTTP tests
  
  return new Promise((resolve) => {
    const httpyac = spawn('npx', ['httpyac', httpFile, '--all', '--output', 'short'], {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    let stdout = '';
    let stderr = '';
    let resolved = false;
    
    // Set timeout
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        logWarning(`HTTP tests timed out after ${HTTP_TEST_TIMEOUT / 1000}s`);
        try {
          httpyac.kill('SIGKILL');
        } catch {}
        resolve({ success: false, output: `Timeout after ${HTTP_TEST_TIMEOUT / 1000}s\n${stdout}` });
      }
    }, HTTP_TEST_TIMEOUT);
    
    httpyac.stdout?.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });
    
    httpyac.stderr?.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });
    
    httpyac.on('close', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        const output = stdout + (stderr ? `\nStderr:\n${stderr}` : '');
        resolve({ success: code === 0, output });
      }
    });
    
    httpyac.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve({ success: false, output: `Failed to run httpyac: ${err.message}` });
      }
    });
  });
}

async function runTestDirectory(testName: string): Promise<void> {
  const testPath = path.join(TEST_DIR, testName);
  const configFile = path.join(testPath, 'config.json');
  const httpFile = path.join(testPath, 'test.http');
  
  console.log('');
  logHeader(`Testing: ${testName}`);
  
  const startTime = Date.now();
  
  // Check if config.json exists
  if (!fs.existsSync(configFile)) {
    logWarning('No config.json found, skipping...');
    results.push({ name: testName, status: 'skipped', error: 'No config.json' });
    return;
  }
  
  // Check if test.http exists
  if (!fs.existsSync(httpFile)) {
    logWarning('No test.http found, skipping...');
    results.push({ name: testName, status: 'skipped', error: 'No test.http' });
    return;
  }
  
  // Get port from config
  const port = getPortFromConfig(configFile);
  
  // Start the server
  if (!await startServer(testName, port)) {
    results.push({ 
      name: testName, 
      status: 'failed', 
      error: 'Server failed to start',
      duration: Date.now() - startTime 
    });
    return;
  }
  
  // Run HTTP tests
  const { success, output } = await runHttpTests(testName);
  const duration = Date.now() - startTime;
  
  if (success) {
    logSuccess(`${testName}: All assertions passed!`);
    results.push({ name: testName, status: 'passed', duration });
  } else {
    logError(`${testName}: Some assertions failed!`);
    results.push({ name: testName, status: 'failed', duration, error: output });
  }
  
  // Stop the server
  await stopServer(port);
}

function getTestDirectories(): string[] {
  const dirs: string[] = [];
  
  if (!fs.existsSync(TEST_DIR)) {
    return dirs;
  }
  
  const entries = fs.readdirSync(TEST_DIR, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== 'unit-tests') {
      dirs.push(entry.name);
    }
  }
  
  return dirs.sort();
}

function writeResults(): void {
  const passed = results.filter(r => r.status === 'passed');
  const failed = results.filter(r => r.status === 'failed');
  const skipped = results.filter(r => r.status === 'skipped');
  
  let output = '';
  output += '========================================\n';
  output += 'HABITS HTTP INTEGRATION TEST RESULTS\n';
  output += `Generated: ${new Date().toISOString()}\n`;
  output += '========================================\n\n';
  
  for (const result of results) {
    const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⚠️';
    const duration = result.duration ? ` (${(result.duration / 1000).toFixed(2)}s)` : '';
    output += `${icon} ${result.name}: ${result.status.toUpperCase()}${duration}\n`;
    if (result.error) {
      output += `   Error: ${result.error.substring(0, 200)}...\n`;
    }
  }
  
  output += '\n========================================\n';
  output += 'SUMMARY\n';
  output += '========================================\n';
  output += `Total: ${results.length} | Passed: ${passed.length} | Failed: ${failed.length} | Skipped: ${skipped.length}\n`;
  output += `Finished: ${new Date().toISOString()}\n`;
  output += '========================================\n';
  
  fs.writeFileSync(OUTPUT_FILE, output);
}

function printSummary(): void {
  const passed = results.filter(r => r.status === 'passed');
  const failed = results.filter(r => r.status === 'failed');
  const skipped = results.filter(r => r.status === 'skipped');
  
  console.log('');
  logHeader('Test Summary');
  console.log('');
  
  console.log(`Total Tests Run: ${results.length - skipped.length}`);
  console.log(`${colors.green}Passed: ${passed.length}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed.length}${colors.reset}`);
  console.log(`${colors.yellow}Skipped: ${skipped.length}${colors.reset}`);
  console.log('');
  
  if (passed.length > 0) {
    console.log(`${colors.green}✅ Passed Tests:${colors.reset}`);
    for (const r of passed) {
      const duration = r.duration ? ` (${(r.duration / 1000).toFixed(2)}s)` : '';
      console.log(`   - ${r.name}${duration}`);
    }
    console.log('');
  }
  
  if (failed.length > 0) {
    console.log(`${colors.red}❌ Failed Tests:${colors.reset}`);
    for (const r of failed) {
      console.log(`   - ${r.name}: ${r.error?.substring(0, 100) || 'Unknown error'}`);
    }
    console.log('');
  }
  
  if (skipped.length > 0) {
    console.log(`${colors.yellow}⚠️  Skipped Tests:${colors.reset}`);
    for (const r of skipped) {
      console.log(`   - ${r.name}: ${r.error || 'Unknown reason'}`);
    }
    console.log('');
  }
  
  console.log(`Results saved to: ${OUTPUT_FILE}`);
  console.log('');
}

async function cleanup(): Promise<void> {
  logInfo('Cleaning up...');
  
  if (currentServerProcess) {
    try {
      currentServerProcess.kill('SIGTERM');
    } catch {
      // Ignore
    }
    currentServerProcess = null;
  }
  
  // Kill any remaining tsx processes
  try {
    execSync('pkill -f "tsx src/executer.ts server" 2>/dev/null || true', { stdio: 'ignore' });
  } catch {
    // Ignore
  }
}

async function main(): Promise<void> {
  logHeader('Habits HTTP Integration Test Runner');
  console.log('');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('');
  
  // Check for httpyac
  logInfo('Checking httpyac installation...');
  try {
    execSync('npx httpyac --version', { stdio: 'ignore' });
  } catch {
    logWarning('httpyac not found, installing...');
    try {
      execSync('npm install -g httpyac', { stdio: 'inherit' });
    } catch (err) {
      logError('Failed to install httpyac. Please install manually: npm install -g httpyac');
      process.exit(1);
    }
  }
  
  // Get test directories
  const testDirs = getTestDirectories();
  logInfo(`Found ${testDirs.length} test directories to process`);
  console.log('');
  
  // Process each test directory
  for (const testName of testDirs) {
    await runTestDirectory(testName);
  }
  
  // Write results and print summary
  writeResults();
  printSummary();
  
  // Exit with appropriate code
  const failed = results.filter(r => r.status === 'failed');
  process.exit(failed.length > 0 ? 1 : 0);
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  await cleanup();
  process.exit(130);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(143);
});

process.on('uncaughtException', async (err) => {
  console.error('Uncaught exception:', err);
  await cleanup();
  process.exit(1);
});

// Run main
main().catch(async (err) => {
  console.error('Fatal error:', err);
  await cleanup();
  process.exit(1);
});
