#!/usr/bin/env tsx
// Test backend pack using cortex server
// Usage: tsx scripts/test-backend-pack.ts [--example <name>] [--habit <name>] [--input <text>]
import { execSync, spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
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

const { example, habit, input: rawInput } = parseArgs();

// Parse JSON input if it looks like JSON, otherwise use as-is
let testPrompt: any = rawInput;
try {
  if (rawInput.startsWith('{') || rawInput.startsWith('[')) {
    testPrompt = JSON.parse(rawInput);
  }
} catch { /* keep as string */ }

const ROOT = path.resolve(__dirname, '../..');
const CONFIG = path.join(ROOT, `showcase/${example}/stack.yaml`);
const PORT = 13001; // Use a different port to avoid conflicts

console.log(`📋 Config: example=${example}, habit=${habit}, input=${JSON.stringify(testPrompt)}`);

// Check config exists
if (!fs.existsSync(CONFIG)) {
  console.error(`❌ Config not found: ${CONFIG}`);
  process.exit(1);
}

// Wait for server to be ready
async function waitForServer(port: number, maxAttempts = 30): Promise<boolean> {
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
    console.log('\n🚀 Starting cortex server...');
    
    // Start cortex server directly with tsx (bypassing nx to properly pass port)
    serverProcess = spawn('npx', ['tsx', 'packages/cortex/server/src/main.ts', 'server', '--config', CONFIG, '--port', String(PORT)], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PORT: String(PORT) }
    });
    
    // Capture server output for debugging
    serverProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      serverLogs.push(text);
      // Only show server-ready messages
      if (text.includes('listening') || text.includes('ready') || text.includes('✅') || text.includes('running')) {
        console.log('  [server]', text.trim());
      }
    });
    serverProcess.stderr?.on('data', (data) => {
      const text = data.toString();
      serverLogs.push('[stderr] ' + text);
    });
    
    // Monitor for process exit
    serverProcess.on('exit', (code, signal) => {
      serverLogs.push(`[exit] Server exited with code ${code}, signal ${signal}`);
    });
    
    // Wait for server to be ready
    process.stdout.write('⏳ Waiting for server');
    const serverReady = await waitForServer(PORT);
    console.log();
    
    if (!serverReady) {
      console.error('❌ Server failed to start');
      console.error('Server logs:\n' + serverLogs.join(''));
      process.exit(1);
    }
    console.log('✅ Server ready');
    
    // Execute workflow via API
    console.log(`⏳ Executing workflow: ${habit}...`);
    const response = await fetch(`http://localhost:${PORT}/api/${habit}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPrompt)
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
    const inputStr = JSON.stringify(testPrompt, null, 2);
    inputStr.split('\n').forEach((line: string) => {
      const padded = line.substring(0, innerWidth).padEnd(innerWidth);
      console.log(`║  ${padded}  ║`);
    });
    console.log(`╟${'─'.repeat(boxWidth)}╢`);
    console.log(`║  📤 OUTPUT${' '.repeat(innerWidth - 10)}║`);
    console.log(`╟${'─'.repeat(boxWidth)}╢`);
    
    // Extract output from the workflow result
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
    
    console.log('\n✅ Backend test passed!');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    // Show recent server logs on error
    const recentLogs = serverLogs.slice(-30).join('');
    if (recentLogs) {
      console.error('\n📋 Recent server logs:\n' + recentLogs);
    }
    process.exit(1);
  } finally {
    // Clean up server process
    if (serverProcess) {
      console.log('\n🛑 Stopping server...');
      serverProcess.kill('SIGTERM');
      // Give it a moment to clean up
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

runTest().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
