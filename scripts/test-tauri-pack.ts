#!/usr/bin/env tsx
// Test pack tauri command and run the app
// Usage: tsx scripts/test-tauri-pack.ts [--example <name>] [--habit <name>] [--input <text>]

import { execSync, spawn } from 'child_process';
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

const { example, habit, input } = parseArgs();

const ROOT = path.resolve(__dirname, '..');
const CONFIG = path.join(ROOT, `showcase/${example}/stack.yaml`);
const OUTPUT_DIR = '/tmp/tauri-pack-test';

console.log(`📋 Config: example=${example}, habit=${habit}, input=${input}`);

// Clean output directory
fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('📦 Generating Tauri project...');
try {
  execSync(
    `pnpm tsx packages/habits/app/src/main.ts pack --config "${CONFIG}" --format tauri --output "${OUTPUT_DIR}"`,
    { cwd: ROOT, stdio: 'inherit' }
  );
} catch (error: any) {
  console.error('❌ Pack command failed:', error.message);
  process.exit(1);
}

// Verify project was created
if (!fs.existsSync(path.join(OUTPUT_DIR, 'package.json'))) {
  console.error('❌ Tauri project not created properly');
  process.exit(1);
}

console.log('\n📦 Installing dependencies...');
execSync('npm install', { cwd: OUTPUT_DIR, stdio: 'inherit' });

console.log('\n🚀 Running Tauri dev mode...');
console.log('   Press Ctrl+C to stop\n');

// Run tauri dev - this will open the app window
const child = spawn('npm', ['run', 'tauri', 'dev'], { 
  cwd: OUTPUT_DIR, 
  stdio: 'inherit',
  shell: true 
});

child.on('error', (err) => console.error('❌ Failed to start:', err.message));
child.on('exit', (code) => {
  console.log(`\n✅ Tauri dev exited with code ${code}`);
  process.exit(code || 0);
});
