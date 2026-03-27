#!/usr/bin/env tsx
/**
 * Test .habit file running via habits-cortex Tauri app
 * Usage: tsx scripts/e2e/dot-habit/test-habits-cortex-app.cts --habit-file <path> --workflow <name> [--input <json>] [--build]
 */
import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { 
    habitFile: '', 
    workflow: '', 
    input: '{}',
    build: false
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--habit-file' && args[i + 1]) result.habitFile = args[++i];
    else if (args[i] === '--workflow' && args[i + 1]) result.workflow = args[++i];
    else if (args[i] === '--input' && args[i + 1]) result.input = args[++i];
    else if (args[i] === '--build') result.build = true;
  }
  return result;
}

const { habitFile, workflow, input, build } = parseArgs();

// Validate required args
if (!habitFile) {
  console.error('❌ --habit-file is required');
  process.exit(1);
}
if (!workflow) {
  console.error('❌ --workflow is required');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '../../..');
const HABIT_FILE = path.isAbsolute(habitFile) ? habitFile : path.resolve(ROOT, habitFile);
const HABITS_CORTEX_DIR = path.join(ROOT, 'habits-cortex');
const TARGET_DIR = path.join(HABITS_CORTEX_DIR, 'src-tauri/target/debug');

console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│            .HABIT FILE - HABITS-CORTEX APP TEST                 │');
console.log('└─────────────────────────────────────────────────────────────────┘');
console.log(`📋 Habit file: ${HABIT_FILE}`);
console.log(`📋 Workflow:   ${workflow}`);
console.log(`📋 Input:      ${input}`);

// Check habit file exists
if (!fs.existsSync(HABIT_FILE)) {
  console.error(`❌ Habit file not found: ${HABIT_FILE}`);
  process.exit(1);
}

// Find or build habits-cortex binary
function findBinary(): string | null {
  if (!fs.existsSync(TARGET_DIR)) return null;
  
  const bins = fs.readdirSync(TARGET_DIR).filter(f => {
    const p = path.join(TARGET_DIR, f);
    // Look for habits-cortex binary (no extension on mac/linux)
    return (f === 'habits-cortex' || f === 'habits-cortex.exe') && 
           fs.statSync(p).isFile();
  });
  
  return bins.length > 0 ? path.join(TARGET_DIR, bins[0]) : null;
}

async function runTest() {
  let appPath = findBinary();
  
  // Build if needed or requested
  if (!appPath || build) {
    console.log('\n🔨 Building habits-cortex app...');
    try {
      execSync('pnpm install', { cwd: HABITS_CORTEX_DIR, stdio: 'inherit' });
      execSync('pnpm tauri build --debug --no-bundle', { cwd: HABITS_CORTEX_DIR, stdio: 'inherit' });
    } catch (err) {
      console.error('❌ Failed to build habits-cortex');
      process.exit(1);
    }
    
    appPath = findBinary();
    if (!appPath) {
      console.error('❌ Binary not found after build');
      process.exit(1);
    }
  }
  
  console.log(`✅ Using binary: ${appPath}`);
  
  // Run the app with test args
  console.log(`\n🚀 Running habits-cortex with .habit file...`);
  const result = spawnSync(appPath, [
    '--test',
    '--habit', HABIT_FILE,
    '--workflow', workflow,
    '--input', input
  ], {
    stdio: 'pipe',
    timeout: 120000,
    env: { ...process.env }
  });
  
  const stdout = result.stdout?.toString() || '';
  const stderr = result.stderr?.toString() || '';
  
  // Show logs
  const lines = stdout.trim().split('\n');
  const logLines = lines.filter(l => !l.startsWith('{'));
  if (logLines.length > 0) {
    console.log('\n📋 Logs:');
    logLines.slice(-20).forEach(l => console.log(l));
  }
  if (stderr) {
    console.error('\n⚠️ Stderr:', stderr.slice(0, 500));
  }
  
  // Parse result from stdout (last JSON line)
  const jsonLines = lines.filter(l => l.startsWith('{'));
  const jsonLine = jsonLines[jsonLines.length - 1];
  
  if (jsonLine) {
    try {
      const parsed = JSON.parse(jsonLine);
      
      // Show summary box
      const boxWidth = 80;
      const border = '═'.repeat(boxWidth);
      const innerWidth = boxWidth - 4;
      
      console.log('\n');
      console.log(`╔${border}╗`);
      console.log(`║  📥 INPUT${' '.repeat(innerWidth - 9)}║`);
      console.log(`╟${'─'.repeat(boxWidth)}╢`);
      const inputStr = JSON.stringify(JSON.parse(input), null, 2);
      inputStr.split('\n').forEach(line => {
        const padded = line.substring(0, innerWidth).padEnd(innerWidth);
        console.log(`║  ${padded}  ║`);
      });
      console.log(`╟${'─'.repeat(boxWidth)}╢`);
      console.log(`║  📤 OUTPUT${' '.repeat(innerWidth - 10)}║`);
      console.log(`╟${'─'.repeat(boxWidth)}╢`);
      
      const output = parsed.result?.output || parsed.result || parsed;
      const outputStr = JSON.stringify(output, null, 2);
      outputStr.split('\n').slice(0, 20).forEach(line => {
        const padded = line.substring(0, innerWidth).padEnd(innerWidth);
        console.log(`║  ${padded}  ║`);
      });
      if (outputStr.split('\n').length > 20) {
        console.log(`║  ${'... (truncated)'.padEnd(innerWidth)}  ║`);
      }
      console.log(`╚${border}╝`);
      
      if (parsed.success) {
        console.log('\n✅ habits-cortex app test passed!');
        process.exit(0);
      } else {
        console.error('\n❌ Failed:', parsed.error);
        process.exit(1);
      }
    } catch (e) {
      console.log('Raw output:', stdout);
    }
  } else {
    console.log('Output:', stdout || '(no output)');
  }
  
  if (result.status !== 0) {
    console.error(`\n❌ Exit code: ${result.status}`);
    process.exit(1);
  }
  
  console.log('\n✅ habits-cortex app test passed!');
}

runTest().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
