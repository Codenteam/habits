#!/usr/bin/env tsx
// Test Tauri pack: generates pack, builds app, runs with --test --habit --input, captures output
// Usage: tsx scripts/test-tauri-pack.ts [--example <name>] [--habit <name>] [--input <json>] [--build-only]

import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { example: 'marketing-campaign', habit: 'marketing-campaign', input: '{}', buildOnly: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--example' && args[i + 1]) result.example = args[++i];
    else if (args[i] === '--habit' && args[i + 1]) result.habit = args[++i];
    else if (args[i] === '--input' && args[i + 1]) result.input = args[++i];
    else if (args[i] === '--build-only') result.buildOnly = true;
  }
  return result;
}

const { example, habit, input, buildOnly } = parseArgs();
const ROOT = path.resolve(__dirname, '../..');
const CONFIG = path.join(ROOT, `showcase/${example}/stack.yaml`);
const OUTPUT_DIR = '/tmp/tauri-pack-test';

console.log(`📋 example=${example}, habit=${habit}, input=${input}`);

// Clean and generate
fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('📦 Generating Tauri pack...');
execSync(`pnpm tsx packages/habits/app/src/main.ts pack --config "${CONFIG}" --format tauri --output "${OUTPUT_DIR}"`, { cwd: ROOT, stdio: 'inherit' });

console.log('🔨 Installing & building...');
execSync('pnpm install', { cwd: OUTPUT_DIR, stdio: 'inherit' });
execSync('pnpm tauri build --debug --no-bundle', { cwd: OUTPUT_DIR, stdio: 'inherit' });

// Find binary
const target = path.join(OUTPUT_DIR, 'src-tauri/target/debug');
const bins = fs.readdirSync(target).filter(f => {
  const p = path.join(target, f);
  return !f.includes('.') && fs.statSync(p).isFile() && (fs.statSync(p).mode & 0o111);
});
if (!bins.length) { console.error('❌ No binary found'); process.exit(1); }
const appPath = path.join(target, bins[0]);
console.log(`✅ Built: ${appPath}`);

if (buildOnly) { console.log('✅ Build complete!'); process.exit(0); }

// Run with test args
console.log(`🚀 Running: ${habit}...`);
const result = spawnSync(appPath, ['--test', '--habit', habit, '--input', input], { stdio: 'pipe', timeout: 120000 });

const stdout = result.stdout?.toString() || '';
const stderr = result.stderr?.toString() || '';

// Show all logs (Tauri log plugin outputs to stdout)
const lines = stdout.trim().split('\n');
const logLines = lines.filter(l => !l.startsWith('{'));
if (logLines.length > 0) {
  console.log('\n📋 Logs:');
  logLines.forEach(l => console.log(l));
}
if (stderr) console.error('\n⚠️ Stderr:', stderr);

// Parse result from stdout (last JSON line)
const jsonLine = lines.find(l => l.startsWith('{'));
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
    
    // Extract output from the workflow result
    const output = parsed.result?.output || parsed.output || parsed.result || parsed;
    const outputStr = JSON.stringify(output, null, 2);
    outputStr.split('\n').slice(0, 20).forEach(line => {
      const padded = line.substring(0, innerWidth).padEnd(innerWidth);
      console.log(`║  ${padded}  ║`);
    });
    if (outputStr.split('\n').length > 20) {
      console.log(`║  ${'... (truncated)'.padEnd(innerWidth)}  ║`);
    }
    console.log(`╚${border}╝`);
    
    if (parsed.success) { console.log('\n✅ Test passed!'); process.exit(0); }
    else { console.error('\n❌ Failed:', parsed.error); process.exit(1); }
  } catch { console.log(stdout); }
} else {
  console.log(stdout || '(no output)');
}

if (result.status !== 0) { console.error(`\n❌ Exit code: ${result.status}`); process.exit(1); }
console.log('\n✅ Test passed!');
