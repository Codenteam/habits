#!/usr/bin/env tsx
/**
 * Test .habit by packing to standalone Tauri app
 * Usage: tsx scripts/e2e/dot-habit/test-standalone-tauri.cts --example <name> --workflow <name> [--input <json>]
 */
import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { 
    example: 'marketing-campaign', 
    workflow: 'marketing-campaign', 
    input: '{}',
    buildOnly: false
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--example' && args[i + 1]) result.example = args[++i];
    else if (args[i] === '--workflow' && args[i + 1]) result.workflow = args[++i];
    else if (args[i] === '--input' && args[i + 1]) result.input = args[++i];
    else if (args[i] === '--build-only') result.buildOnly = true;
  }
  return result;
}

const { example, workflow, input, buildOnly } = parseArgs();

const ROOT = path.resolve(__dirname, '../../..');
const CONFIG = path.join(ROOT, `showcase/${example}/stack.yaml`);
const OUTPUT_DIR = `/tmp/tauri-standalone-test-${example}`;

console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│            .HABIT - STANDALONE TAURI APP TEST                   │');
console.log('└─────────────────────────────────────────────────────────────────┘');
console.log(`📋 Example:  ${example}`);
console.log(`📋 Workflow: ${workflow}`);
console.log(`📋 Input:    ${input}`);

// Check config exists
if (!fs.existsSync(CONFIG)) {
  console.error(`❌ Config not found: ${CONFIG}`);
  process.exit(1);
}

// Clean and generate
console.log('\n📦 Generating Tauri pack...');
fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

try {
  execSync(`pnpm tsx packages/habits/app/src/main.ts pack --config "${CONFIG}" --format tauri --output "${OUTPUT_DIR}"`, { 
    cwd: ROOT, 
    stdio: 'inherit' 
  });
} catch (err) {
  console.error('❌ Pack failed');
  process.exit(1);
}

console.log('\n🔨 Installing & building...');
try {
  execSync('pnpm install', { cwd: OUTPUT_DIR, stdio: 'inherit' });
  execSync('pnpm tauri build --debug --no-bundle', { cwd: OUTPUT_DIR, stdio: 'inherit' });
} catch (err) {
  console.error('❌ Build failed');
  process.exit(1);
}

// Find binary
const target = path.join(OUTPUT_DIR, 'src-tauri/target/debug');
const bins = fs.readdirSync(target).filter(f => {
  const p = path.join(target, f);
  return !f.includes('.') && fs.statSync(p).isFile() && (fs.statSync(p).mode & 0o111);
});

if (!bins.length) {
  console.error('❌ No binary found');
  process.exit(1);
}

const appPath = path.join(target, bins[0]);
console.log(`✅ Built: ${appPath}`);

if (buildOnly) {
  console.log('✅ Build complete!');
  process.exit(0);
}

// Run with test args
console.log(`\n🚀 Running standalone app: ${workflow}...`);
const result = spawnSync(appPath, ['--test', '--habit', workflow, '--input', input], { 
  stdio: 'pipe', 
  timeout: 120000 
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

// Parse result from stdout
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
      console.log('\n✅ Standalone Tauri test passed!');
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

console.log('\n✅ Standalone Tauri test passed!');
