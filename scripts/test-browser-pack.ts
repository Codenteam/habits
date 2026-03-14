#!/usr/bin/env tsx
// Test pack bundle in browser with fetch proxy intercepting /api/* calls
// Usage: tsx scripts/test-browser-pack.ts [--example <name>] [--habit <name>] [--input <text>]
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer-core';
import { getTauriFetchProxyScript } from '../packages/base/server/src/pack/templates/tauri/tauri-fetch-proxy';

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

const ROOT = path.resolve(__dirname, '..');
const CONFIG = path.join(ROOT, `showcase/${example}/stack.yaml`);
const HTML_PATH = path.join(ROOT, `showcase/${example}/frontend/index.html`);
const OUTPUT_DIR = '/tmp/browser-pack-test';
const BUNDLE_PATH = path.join(OUTPUT_DIR, 'cortex-bundle.js');

console.log(`📋 Config: example=${example}, habit=${habit}, input=${testPrompt}`);

const CHROME_PATHS = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium-browser'];
const chromePath = CHROME_PATHS.find(p => fs.existsSync(p));
if (!chromePath) { console.error('❌ No Chrome/Chromium found'); process.exit(1); }

// Clean and setup output directory
fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Generate bundle
console.log('📦 Generating bundle...');
execSync(
  `pnpm tsx packages/habits/app/src/main.ts pack --config "${CONFIG}" --format bundle --output "${BUNDLE_PATH}"`,
  { cwd: ROOT, stdio: 'inherit' }
);

// Create test HTML that loads bundle + fetch proxy + original page
const bundleCode = fs.readFileSync(BUNDLE_PATH, 'utf-8');
const fetchProxy = getTauriFetchProxyScript({ mode: 'full' });
const originalHtml = fs.readFileSync(HTML_PATH, 'utf-8');

// Write fetch proxy as separate file
const fetchProxyPath = path.join(OUTPUT_DIR, 'fetch-proxy.js');
fs.writeFileSync(fetchProxyPath, fetchProxy);

// Inject global polyfills and scripts as external files before closing </head>
const testHtml = originalHtml.replace(
  '</head>',
  `<script>
     // Browser polyfills
     if (typeof global === 'undefined') { window.global = window; }
     if (typeof globalThis === 'undefined') { window.globalThis = window; }
   </script>
   <script src="cortex-bundle.js"></script>
   <script src="fetch-proxy.js"></script>
   </head>`
);
const testHtmlPath = path.join(OUTPUT_DIR, 'index.html');
fs.writeFileSync(testHtmlPath, testHtml);

async function runTest() {
  console.log('\n🚀 Running in headless browser...');
  const browser = await puppeteer.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage();
  const logs: string[] = [];

  // Set timeout for page operations
  page.setDefaultTimeout(60000); // 60 seconds

  page.on('console', msg => { const text = msg.text(); logs.push(text); console.log('  [browser]', text); });
  page.on('pageerror', err => { console.error('  [error]', err.message); console.error('  [stack]', err.stack); });

  try {
    await page.goto(`file://${testHtmlPath}`, { waitUntil: 'domcontentloaded' });
    
    // Check IndexedDB availability
    const hasIndexedDB = await page.evaluate(() => typeof indexedDB !== 'undefined');
    console.log(`📊 IndexedDB available: ${hasIndexedDB}`);
    
    const hasBundle = await page.evaluate(() => !!(window as any).HabitsBundle);
    if (!hasBundle) throw new Error('HabitsBundle not loaded');
    console.log('✅ HabitsBundle loaded');

    console.log(`⏳ Executing workflow: ${habit}...`);
    
    // Execute with manual timeout
    const executionPromise = page.evaluate(async (habitName, habitInput) => {
      const bundle = (window as any).HabitsBundle;
      return await bundle.executeWorkflow(habitName, habitInput);
    }, habit, testPrompt);
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Workflow execution timeout after 45s')), 45000)
    );
    
    const result = await Promise.race([executionPromise, timeoutPromise]);

    console.log('\n📋 Console Logs:\n' + logs.join('\n'));
    console.log('\n📄 Workflow Result:\n' + JSON.stringify(result, null, 2));

    await browser.close();
    console.log('\n✅ Browser test passed!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    await browser.close();
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
