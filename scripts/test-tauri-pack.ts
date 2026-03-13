#!/usr/bin/env tsx
// Test pack tauri command on marketing-campaign and run the app

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const CONFIG = path.join(ROOT, 'showcase/marketing-campaign/stack.yaml');
const OUTPUT_DIR = '/tmp/tauri-pack-test';

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
