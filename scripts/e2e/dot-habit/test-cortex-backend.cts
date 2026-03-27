#!/usr/bin/env tsx
/**
 * Test .habit file running via Node.js cortex server
 * Usage: tsx scripts/e2e/dot-habit/test-cortex-backend.cts --habit-file <path> --workflow <name> [--input <json>]
 */
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { 
    habitFile: '', 
    workflow: '', 
    input: '{}',
    port: 13002
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--habit-file' && args[i + 1]) result.habitFile = args[++i];
    else if (args[i] === '--workflow' && args[i + 1]) result.workflow = args[++i];
    else if (args[i] === '--input' && args[i + 1]) result.input = args[++i];
    else if (args[i] === '--port' && args[i + 1]) result.port = parseInt(args[++i], 10);
  }
  return result;
}

const { habitFile, workflow, input: rawInput, port } = parseArgs();

// Validate required args
if (!habitFile) {
  console.error('❌ --habit-file is required');
  process.exit(1);
}
if (!workflow) {
  console.error('❌ --workflow is required');
  process.exit(1);
}

// Parse JSON input
let testInput: any = {};
try {
  testInput = JSON.parse(rawInput);
} catch {
  testInput = rawInput; // Use as string if not valid JSON
}

const ROOT = path.resolve(__dirname, '../../..');
const HABIT_FILE = path.isAbsolute(habitFile) ? habitFile : path.resolve(ROOT, habitFile);

console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│              .HABIT FILE - CORTEX BACKEND TEST                  │');
console.log('└─────────────────────────────────────────────────────────────────┘');
console.log(`📋 Habit file: ${HABIT_FILE}`);
console.log(`📋 Workflow:   ${workflow}`);
console.log(`📋 Input:      ${JSON.stringify(testInput)}`);
console.log(`📋 Port:       ${port}`);

// Check habit file exists
if (!fs.existsSync(HABIT_FILE)) {
  console.error(`❌ Habit file not found: ${HABIT_FILE}`);
  process.exit(1);
}

// Wait for server to be ready
async function waitForServer(maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/misc/workflows`);
      if (response.ok) {
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    process.stdout.write('.');
  }
  return false;
}

async function runTest() {
  let serverProcess: ChildProcess | null = null;
  const serverLogs: string[] = [];
  
  try {
    console.log('\n🚀 Starting cortex server with .habit file...');
    
    // Start cortex server with the .habit file
    serverProcess = spawn('npx', [
      'tsx', 
      'packages/cortex/server/src/main.ts', 
      'server', 
      '--config', HABIT_FILE, 
      '--port', String(port)
    ], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PORT: String(port) }
    });
    
    // Capture server output for debugging
    serverProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      serverLogs.push(text);
      if (text.includes('listening') || text.includes('ready') || text.includes('✅') || text.includes('running')) {
        console.log('  [server]', text.trim());
      }
    });
    serverProcess.stderr?.on('data', (data) => {
      serverLogs.push('[stderr] ' + data.toString());
    });
    serverProcess.on('exit', (code, signal) => {
      serverLogs.push(`[exit] Server exited with code ${code}, signal ${signal}`);
    });
    
    // Wait for server to be ready
    process.stdout.write('⏳ Waiting for server');
    const serverReady = await waitForServer();
    console.log();
    
    if (!serverReady) {
      console.error('❌ Server failed to start');
      console.error('Server logs:\n' + serverLogs.slice(-20).join(''));
      process.exit(1);
    }
    console.log('✅ Server ready');
    
    // Execute workflow via API
    console.log(`⏳ Executing workflow: ${workflow}...`);
    const response = await fetch(`http://localhost:${port}/api/${workflow}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testInput)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    // Show summary box
    const boxWidth = 80;
    const border = '═'.repeat(boxWidth);
    const innerWidth = boxWidth - 4;
    
    console.log('\n');
    console.log(`╔${border}╗`);
    console.log(`║  📥 INPUT${' '.repeat(innerWidth - 9)}║`);
    console.log(`╟${'─'.repeat(boxWidth)}╢`);
    const inputStr = JSON.stringify(testInput, null, 2);
    inputStr.split('\n').forEach((line: string) => {
      const padded = line.substring(0, innerWidth).padEnd(innerWidth);
      console.log(`║  ${padded}  ║`);
    });
    console.log(`╟${'─'.repeat(boxWidth)}╢`);
    console.log(`║  📤 OUTPUT${' '.repeat(innerWidth - 10)}║`);
    console.log(`╟${'─'.repeat(boxWidth)}╢`);
    
    const output = result.output || result;
    const outputStr = JSON.stringify(output, null, 2);
    outputStr.split('\n').slice(0, 20).forEach((line: string) => {
      const padded = line.substring(0, innerWidth).padEnd(innerWidth);
      console.log(`║  ${padded}  ║`);
    });
    if (outputStr.split('\n').length > 20) {
      console.log(`║  ${'... (truncated)'.padEnd(innerWidth)}  ║`);
    }
    console.log(`╚${border}╝`);
    
    console.log('\n✅ Cortex backend test passed!');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    const recentLogs = serverLogs.slice(-30).join('');
    if (recentLogs) {
      console.error('\n📋 Recent server logs:\n' + recentLogs);
    }
    process.exit(1);
  } finally {
    if (serverProcess) {
      console.log('\n🛑 Stopping server...');
      serverProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

runTest().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
