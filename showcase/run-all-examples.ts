#!/usr/bin/env npx tsx

/**
 * =============================================================================
 * Habits Examples Test Runner
 * =============================================================================
 * Runs through each example directory, starts the server, executes tests,
 * and saves all output to logs/ directory.
 * 
 * Log files created per example:
 *   logs/{example}/server.log      - Server startup output
 *   logs/{example}/http-tests.log  - HTTP test results (.http files)
 *   logs/{example}/yaml-tests.log  - YAML test results (.test.yaml files)
 * 
 * Usage:
 *   npx tsx showcase/run-all-examples.ts [options]
 * 
 * Options:
 *   --only <name>        Only run specific example(s) (comma-separated)
 *   --skip <name>        Skip specific example(s) (comma-separated)
 *   --http-only          Only run HTTP tests
 *   --test-only          Only run habit.test.yaml tests
 *   --dry-run            List what would be run without executing
 * =============================================================================
 */

import { spawn, ChildProcess, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

// Configuration
const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.join(SCRIPT_DIR, '..');
const EXAMPLES_DIR = SCRIPT_DIR;
const LOGS_DIR = path.join(PROJECT_ROOT, 'logs');
const SUMMARY_FILE = path.join(LOGS_DIR, 'summary.txt');
const DEFAULT_PORT = 3000;
const SERVER_STARTUP_TIMEOUT = 45000;
const SERVER_SHUTDOWN_WAIT = 2000;

// ANSI Colors
const c = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// CLI Options
interface CliOptions {
  only: string[];
  skip: string[];
  httpOnly: boolean;
  testOnly: boolean;
  dryRun: boolean;
}

interface ExampleConfig {
  name: string;
  path: string;
  configFile: string | null;
  configType: 'stack' | 'config' | null;
  httpFiles: string[];
  testFiles: string[];
  hasEnv: boolean;
}

interface ExampleResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'partial';
  serverStarted: boolean;
  httpTests?: { success: boolean };
  habitTests?: { success: boolean };
  duration: number;
  error?: string;
  logDir: string;
}

const results: ExampleResult[] = [];
let currentServerProcess: ChildProcess | null = null;
let options: CliOptions;

// =============================================================================
// Logging
// =============================================================================

function log(icon: string, message: string, color: string = c.reset): void {
  console.log(`${color}${icon} ${message}${c.reset}`);
}

function logHeader(message: string): void {
  const line = '═'.repeat(60);
  console.log(`\n${c.cyan}${line}${c.reset}`);
  console.log(`${c.cyan}  ${message}${c.reset}`);
  console.log(`${c.cyan}${line}${c.reset}\n`);
}

function logExample(name: string, status: string): void {
  const icon = status === 'running' ? '▶' : 
               status === 'passed' ? '✓' : 
               status === 'failed' ? '✗' : 
               status === 'partial' ? '◐' : '○';
  const color = status === 'running' ? c.blue :
                status === 'passed' ? c.green :
                status === 'failed' ? c.red :
                status === 'partial' ? c.yellow : c.gray;
  console.log(`${color}${icon} ${name}${c.reset}`);
}

// =============================================================================
// File Logging
// =============================================================================

function ensureLogDir(exampleName: string): string {
  const logDir = path.join(LOGS_DIR, exampleName);
  fs.mkdirSync(logDir, { recursive: true });
  return logDir;
}

function createLogFile(logDir: string, filename: string): fs.WriteStream {
  const filepath = path.join(logDir, filename);
  return fs.createWriteStream(filepath, { flags: 'w' });
}

function writeLogHeader(stream: fs.WriteStream, title: string, example: ExampleConfig): void {
  const timestamp = new Date().toISOString();
  stream.write(`${'='.repeat(60)}\n`);
  stream.write(`${title}\n`);
  stream.write(`${'='.repeat(60)}\n`);
  stream.write(`Example: ${example.name}\n`);
  stream.write(`Path: ${example.path}\n`);
  stream.write(`Config: ${example.configFile || 'none'}\n`);
  stream.write(`Timestamp: ${timestamp}\n`);
  stream.write(`${'='.repeat(60)}\n\n`);
}

// =============================================================================
// CLI Parsing
// =============================================================================

function parseArgs(args: string[]): CliOptions {
  const opts: CliOptions = {
    only: [],
    skip: [],
    httpOnly: false,
    testOnly: false,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--only':
        opts.only = (args[++i] || '').split(',').filter(Boolean);
        break;
      case '--skip':
        opts.skip = (args[++i] || '').split(',').filter(Boolean);
        break;
      case '--http-only':
        opts.httpOnly = true;
        break;
      case '--test-only':
        opts.testOnly = true;
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return opts;
}

function printHelp(): void {
  console.log(`
${c.bold}Habits Examples Test Runner${c.reset}

${c.cyan}Usage:${c.reset}
  npx tsx showcase/run-all-examples.ts [options]

${c.cyan}Options:${c.reset}
  --only <name>        Only run specific example(s) (comma-separated)
  --skip <name>        Skip specific example(s) (comma-separated)
  --http-only          Only run HTTP tests (skip .test.yaml)
  --test-only          Only run .test.yaml tests (skip HTTP)
  --dry-run            List what would be run without executing
  --help, -h           Show this help

${c.cyan}Output:${c.reset}
  logs/{example}/server.log       Server output
  logs/{example}/http-tests.log   HTTP test results
  logs/{example}/yaml-tests.log   YAML test results
  logs/summary.txt                Overall summary

${c.cyan}Examples:${c.reset}
  npx tsx showcase/run-all-examples.ts
  npx tsx showcase/run-all-examples.ts --only hello-world,mixed
  npx tsx showcase/run-all-examples.ts --skip hello-world
`);
}

// =============================================================================
// Example Discovery
// =============================================================================

function discoverExamples(): ExampleConfig[] {
  const examples: ExampleConfig[] = [];
  if (!fs.existsSync(EXAMPLES_DIR)) return examples;

  const entries = fs.readdirSync(EXAMPLES_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (['unit-tests', 'bits', 'docs', 'test-script', 'logs'].includes(entry.name)) continue;

    const examplePath = path.join(EXAMPLES_DIR, entry.name);
    const stackYaml = path.join(examplePath, 'stack.yaml');
    const configJson = path.join(examplePath, 'config.json');
    const envFile = path.join(examplePath, '.env');

    let configFile: string | null = null;
    let configType: 'stack' | 'config' | null = null;

    if (fs.existsSync(stackYaml)) {
      configFile = stackYaml;
      configType = 'stack';
    } else if (fs.existsSync(configJson)) {
      configFile = configJson;
      configType = 'config';
    }

    const httpFiles: string[] = [];
    const testFiles: string[] = [];
    const files = fs.readdirSync(examplePath);
    
    for (const file of files) {
      if (file.endsWith('.http')) {
        httpFiles.push(path.join(examplePath, file));
      }
      if (file.endsWith('.test.yaml')) {
        testFiles.push(path.join(examplePath, file));
      }
    }

    examples.push({
      name: entry.name,
      path: examplePath,
      configFile,
      configType,
      httpFiles,
      testFiles,
      hasEnv: fs.existsSync(envFile),
    });
  }

  return examples.sort((a, b) => a.name.localeCompare(b.name));
}

function filterExamples(examples: ExampleConfig[]): ExampleConfig[] {
  let filtered = examples;

  if (options.only.length > 0) {
    filtered = filtered.filter(e => 
      options.only.some(pattern => e.name.includes(pattern))
    );
  }

  if (options.skip.length > 0) {
    filtered = filtered.filter(e => 
      !options.skip.some(pattern => e.name.includes(pattern))
    );
  }

  return filtered;
}

// =============================================================================
// Server Management
// =============================================================================

function getPortFromConfig(configPath: string): number {
  try {
    if (configPath.endsWith('.yaml')) {
      const content = fs.readFileSync(configPath, 'utf-8');
      const portMatch = content.match(/port:\s*(\d+)/);
      return portMatch ? parseInt(portMatch[1], 10) : DEFAULT_PORT;
    }
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
    }, () => resolve(true));

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
    if (await isPortInUse(port)) return true;
    await sleep(500);
  }
  return false;
}

function killPort(port: number): void {
  try {
    if (process.platform === 'darwin') {
      execSync(`lsof -t -i :${port} 2>/dev/null | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
    } else if (process.platform === 'linux') {
      execSync(`lsof -t -i :${port} | xargs -r kill -9 2>/dev/null || true`, { stdio: 'ignore' });
    }
  } catch {}
}

async function startServer(example: ExampleConfig, logStream: fs.WriteStream): Promise<boolean> {
  if (!example.configFile) return false;

  const port = getPortFromConfig(example.configFile);
  killPort(port);
  await sleep(1000);

  logStream.write(`Starting server on port ${port}...\n`);
  logStream.write(`Command: npx nx dev @ha-bits/cortex --config ${example.configFile}\n\n`);

  let args: string[];
  if (example.configType === 'stack') {
    args = ['nx', 'dev', '@ha-bits/cortex', '--config', example.configFile];
  } else {
    args = ['tsx'];
    if (example.hasEnv) {
      args.push(`--env-file=${path.join(example.path, '.env')}`);
    }
    args.push(path.join(PROJECT_ROOT, 'src', 'executer.ts'), 'server', '--config', example.configFile);
  }

  currentServerProcess = spawn('npx', args, {
    cwd: PROJECT_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
    env: {
      ...process.env,
      ...(example.hasEnv ? { DOTENV_CONFIG_PATH: path.join(example.path, '.env') } : {}),
    },
  });

  currentServerProcess.stdout?.on('data', (data) => logStream.write(data));
  currentServerProcess.stderr?.on('data', (data) => logStream.write(data));

  currentServerProcess.on('error', (err) => {
    logStream.write(`\nServer process error: ${err.message}\n`);
  });

  if (await waitForServer(port)) {
    logStream.write(`\n✓ Server started successfully (PID: ${currentServerProcess.pid})\n`);
    return true;
  } else {
    logStream.write(`\n✗ Server failed to start within ${SERVER_STARTUP_TIMEOUT / 1000}s\n`);
    stopServer(port);
    return false;
  }
}

async function stopServer(port: number): Promise<void> {
  if (currentServerProcess) {
    try {
      currentServerProcess.kill('SIGTERM');
    } catch {}
    currentServerProcess = null;
  }
  killPort(port);
  await sleep(SERVER_SHUTDOWN_WAIT);
}

// =============================================================================
// Test Runners
// =============================================================================

async function runHttpTests(
  httpFiles: string[], 
  logStream: fs.WriteStream
): Promise<{ success: boolean; output: string }> {
  if (httpFiles.length === 0) {
    logStream.write('No HTTP test files found.\n');
    return { success: true, output: 'No HTTP test files' };
  }

  let allOutput = '';
  let allSuccess = true;

  for (const httpFile of httpFiles) {
    const filename = path.basename(httpFile);
    logStream.write(`\n${'─'.repeat(50)}\n`);
    logStream.write(`Running: ${filename}\n`);
    logStream.write(`${'─'.repeat(50)}\n\n`);

    const result = await new Promise<{ success: boolean; output: string }>((resolve) => {
      const httpyac = spawn('npx', ['httpyac', httpFile, '--all', '--output', 'short'], {
        cwd: PROJECT_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let resolved = false;

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { httpyac.kill('SIGKILL'); } catch {}
          resolve({ success: false, output: 'Timeout after 60s' });
        }
      }, 60000);

      httpyac.stdout?.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        logStream.write(text);
      });

      httpyac.stderr?.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        logStream.write(text);
      });

      httpyac.on('close', (code) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve({ success: code === 0, output: stdout + stderr });
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

    const statusIcon = result.success ? '✓' : '✗';
    logStream.write(`\n${statusIcon} ${filename}: ${result.success ? 'PASSED' : 'FAILED'}\n`);
    
    allOutput += `\n--- ${filename} ---\n${result.output}`;
    if (!result.success) allSuccess = false;
  }

  logStream.write(`\n${'='.repeat(50)}\n`);
  logStream.write(`Overall HTTP Tests: ${allSuccess ? 'PASSED' : 'FAILED'}\n`);
  logStream.write(`${'='.repeat(50)}\n`);

  return { success: allSuccess, output: allOutput };
}

async function runYamlTests(
  testFiles: string[], 
  logStream: fs.WriteStream
): Promise<{ success: boolean; output: string }> {
  if (testFiles.length === 0) {
    logStream.write('No YAML test files found.\n');
    return { success: true, output: 'No YAML test files' };
  }

  let allOutput = '';
  let allSuccess = true;

  for (const testFile of testFiles) {
    const filename = path.basename(testFile);
    logStream.write(`\n${'─'.repeat(50)}\n`);
    logStream.write(`Running: ${filename}\n`);
    logStream.write(`${'─'.repeat(50)}\n\n`);

    const result = await new Promise<{ success: boolean; output: string }>((resolve) => {
      const bitsTest = spawn('npx', ['bits-test', '-f', testFile], {
        cwd: PROJECT_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let resolved = false;

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { bitsTest.kill('SIGKILL'); } catch {}
          resolve({ success: false, output: 'Timeout after 120s' });
        }
      }, 120000);

      bitsTest.stdout?.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        logStream.write(text);
      });

      bitsTest.stderr?.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        logStream.write(text);
      });

      bitsTest.on('close', (code) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve({ success: code === 0, output: stdout + stderr });
        }
      });

      bitsTest.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve({ success: false, output: `Failed to run bits-test: ${err.message}` });
        }
      });
    });

    const statusIcon = result.success ? '✓' : '✗';
    logStream.write(`\n${statusIcon} ${filename}: ${result.success ? 'PASSED' : 'FAILED'}\n`);
    
    allOutput += `\n--- ${filename} ---\n${result.output}`;
    if (!result.success) allSuccess = false;
  }

  logStream.write(`\n${'='.repeat(50)}\n`);
  logStream.write(`Overall YAML Tests: ${allSuccess ? 'PASSED' : 'FAILED'}\n`);
  logStream.write(`${'='.repeat(50)}\n`);

  return { success: allSuccess, output: allOutput };
}

// =============================================================================
// Example Runner
// =============================================================================

async function runExample(example: ExampleConfig): Promise<ExampleResult> {
  const startTime = Date.now();
  const logDir = ensureLogDir(example.name);
  
  logExample(example.name, 'running');

  const result: ExampleResult = {
    name: example.name,
    status: 'skipped',
    serverStarted: false,
    duration: 0,
    logDir,
  };

  const hasHttpTests = example.httpFiles.length > 0 && !options.testOnly;
  const hasYamlTests = example.testFiles.length > 0 && !options.httpOnly;
  const needsServer = hasHttpTests;

  if (!hasHttpTests && !hasYamlTests) {
    result.status = 'skipped';
    result.error = 'No test files found';
    result.duration = Date.now() - startTime;
    logExample(example.name, 'skipped');
    return result;
  }

  // Create log files
  const serverLog = createLogFile(logDir, 'server.log');
  const httpLog = createLogFile(logDir, 'http-tests.log');
  const yamlLog = createLogFile(logDir, 'yaml-tests.log');

  writeLogHeader(serverLog, 'SERVER LOG', example);
  writeLogHeader(httpLog, 'HTTP TESTS LOG', example);
  writeLogHeader(yamlLog, 'YAML TESTS LOG', example);

  // Start server if needed
  if (needsServer && example.configFile) {
    result.serverStarted = await startServer(example, serverLog);
    if (!result.serverStarted) {
      result.status = 'failed';
      result.error = 'Server failed to start';
      result.duration = Date.now() - startTime;
      serverLog.end();
      httpLog.write('Server failed to start - HTTP tests skipped.\n');
      httpLog.end();
      yamlLog.end();
      logExample(example.name, 'failed');
      return result;
    }
  } else {
    serverLog.write('No server required for this example.\n');
  }

  let allPassed = true;

  // Run HTTP tests
  if (hasHttpTests) {
    if (result.serverStarted) {
      const httpResult = await runHttpTests(example.httpFiles, httpLog);
      result.httpTests = { success: httpResult.success };
      if (!httpResult.success) allPassed = false;
    } else {
      httpLog.write('Skipped - server not running.\n');
      result.httpTests = { success: false };
      allPassed = false;
    }
  } else {
    httpLog.write('No HTTP tests configured.\n');
  }

  // Run YAML tests
  if (hasYamlTests) {
    const yamlResult = await runYamlTests(example.testFiles, yamlLog);
    result.habitTests = { success: yamlResult.success };
    if (!yamlResult.success) allPassed = false;
  } else {
    yamlLog.write('No YAML tests configured.\n');
  }

  // Stop server
  if (result.serverStarted && example.configFile) {
    const port = getPortFromConfig(example.configFile);
    serverLog.write('\nStopping server...\n');
    await stopServer(port);
    serverLog.write('Server stopped.\n');
  }

  // Close log files
  serverLog.end();
  httpLog.end();
  yamlLog.end();

  // Determine final status
  if (allPassed) {
    result.status = 'passed';
  } else if (result.httpTests?.success || result.habitTests?.success) {
    result.status = 'partial';
  } else {
    result.status = 'failed';
  }

  result.duration = Date.now() - startTime;
  logExample(example.name, result.status);
  return result;
}

// =============================================================================
// Summary
// =============================================================================

function writeSummary(): void {
  const passed = results.filter(r => r.status === 'passed');
  const failed = results.filter(r => r.status === 'failed');
  const partial = results.filter(r => r.status === 'partial');
  const skipped = results.filter(r => r.status === 'skipped');

  let output = '';
  output += `${'='.repeat(60)}\n`;
  output += `HABITS EXAMPLES TEST SUMMARY\n`;
  output += `${'='.repeat(60)}\n`;
  output += `Generated: ${new Date().toISOString()}\n`;
  output += `\n`;
  output += `Total: ${results.length}\n`;
  output += `Passed: ${passed.length}\n`;
  output += `Failed: ${failed.length}\n`;
  output += `Partial: ${partial.length}\n`;
  output += `Skipped: ${skipped.length}\n`;
  output += `${'='.repeat(60)}\n\n`;

  for (const result of results) {
    const icon = result.status === 'passed' ? '✓' : 
                 result.status === 'failed' ? '✗' : 
                 result.status === 'partial' ? '◐' : '○';
    const duration = `${(result.duration / 1000).toFixed(2)}s`;
    
    output += `${icon} ${result.name} [${result.status.toUpperCase()}] (${duration})\n`;
    output += `  Logs: ${result.logDir}\n`;
    
    if (result.httpTests !== undefined) {
      output += `  HTTP: ${result.httpTests.success ? 'PASS' : 'FAIL'}\n`;
    }
    if (result.habitTests !== undefined) {
      output += `  YAML: ${result.habitTests.success ? 'PASS' : 'FAIL'}\n`;
    }
    if (result.error) {
      output += `  Error: ${result.error}\n`;
    }
    output += '\n';
  }

  fs.writeFileSync(SUMMARY_FILE, output);

  // Print to console
  console.log('');
  logHeader('Summary');
  console.log(`  Total: ${results.length}`);
  console.log(`  ${c.green}Passed: ${passed.length}${c.reset}`);
  console.log(`  ${c.red}Failed: ${failed.length}${c.reset}`);
  console.log(`  ${c.yellow}Partial: ${partial.length}${c.reset}`);
  console.log(`  ${c.gray}Skipped: ${skipped.length}${c.reset}`);
  console.log('');
  console.log(`  Logs: ${LOGS_DIR}`);
  console.log(`  Summary: ${SUMMARY_FILE}`);
  console.log('');

  if (failed.length === 0 && partial.length === 0) {
    console.log(`${c.green}${c.bold}  ✓ ALL TESTS PASSED${c.reset}`);
  } else if (failed.length > 0) {
    console.log(`${c.red}${c.bold}  ✗ ${failed.length} TEST(S) FAILED${c.reset}`);
  }
  console.log('');
}

function printDryRun(examples: ExampleConfig[]): void {
  logHeader('Dry Run - Examples to Test');
  
  for (const example of examples) {
    const config = example.configType || 'none';
    const http = example.httpFiles.length;
    const yaml = example.testFiles.length;
    
    console.log(`  ${c.bold}${example.name}${c.reset}`);
    console.log(`    Config: ${config} | HTTP: ${http} | YAML: ${yaml}`);
  }
  
  console.log(`\n  Total: ${examples.length} examples`);
  console.log(`  Logs will be written to: ${LOGS_DIR}`);
}

// =============================================================================
// Cleanup
// =============================================================================

async function cleanup(): Promise<void> {
  if (currentServerProcess) {
    try {
      currentServerProcess.kill('SIGTERM');
    } catch {}
    currentServerProcess = null;
  }

  try {
    execSync('pkill -f "@ha-bits/cortex" 2>/dev/null || true', { stdio: 'ignore' });
  } catch {}
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  options = parseArgs(process.argv.slice(2));

  logHeader('Habits Examples Test Runner');
  console.log(`  Started: ${new Date().toISOString()}`);
  console.log(`  Logs: ${LOGS_DIR}`);

  // Create logs directory
  fs.mkdirSync(LOGS_DIR, { recursive: true });

  // Discover and filter examples
  const allExamples = discoverExamples();
  const examples = filterExamples(allExamples);
  
  console.log(`  Examples: ${examples.length} of ${allExamples.length}`);
  console.log('');

  if (options.dryRun) {
    printDryRun(examples);
    return;
  }

  // Check for httpyac
  try {
    execSync('npx httpyac --version 2>/dev/null', { stdio: 'ignore' });
  } catch {
    log('!', 'httpyac not found, installing...', c.yellow);
    try {
      execSync('npm install -g httpyac', { stdio: 'inherit' });
    } catch {
      log('✗', 'Failed to install httpyac', c.red);
    }
  }

  // Run each example
  for (const example of examples) {
    const result = await runExample(example);
    results.push(result);
  }

  // Write summary
  writeSummary();

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

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await cleanup();
  process.exit(1);
});
