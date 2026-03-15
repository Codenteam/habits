#!/usr/bin/env tsx
// Test pack bundle in browser with fetch proxy intercepting /api/* calls
// Usage: tsx scripts/test-browser-pack.ts [--example <name>] [--habit <name>] [--input <text>] [--headful] [--chrome]
// --chrome: Opens in Chrome directly (no puppeteer), starts local server
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import puppeteer from 'puppeteer-core';
import { getTauriFetchProxyScript } from '../../packages/base/server/src/pack/templates/tauri/tauri-fetch-proxy';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { example: 'marketing-campaign', habit: 'marketing-campaign', input: 'Test campaign for AI productivity tools', headless: true, chrome: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--example' && args[i + 1]) result.example = args[++i];
    else if (args[i] === '--habit' && args[i + 1]) result.habit = args[++i];
    else if (args[i] === '--input' && args[i + 1]) result.input = args[++i];
    else if (args[i] === '--headful') result.headless = false;
    else if (args[i] === '--chrome') result.chrome = true;
  }
  return result;
}

const { example, habit, input: rawInput, headless, chrome } = parseArgs();

// Parse JSON input if it looks like JSON, otherwise use as-is
let testPrompt: any = rawInput;
try {
  if (rawInput.startsWith('{') || rawInput.startsWith('[')) {
    testPrompt = JSON.parse(rawInput);
  }
} catch { /* keep as string */ }

const ROOT = path.resolve(__dirname, '../..');
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

// Start a simple HTTP server for Chrome direct mode
function startServer(port: number): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = req.url || '/';
      let filePath = path.join(OUTPUT_DIR, url === '/' ? 'index.html' : url);
      
      const ext = path.extname(filePath);
      const contentTypes: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
      };
      
      if (fs.existsSync(filePath)) {
        res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
        res.end(fs.readFileSync(filePath));
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(port, () => resolve(server));
  });
}

// Run in Chrome directly (opens browser, serves files via HTTP)
async function runChrome() {
  const port = 8765;
  const server = await startServer(port);
  const url = `http://localhost:${port}`;
  
  console.log(`\n🌐 Starting local server at ${url}`);
  console.log(`📋 Test workflow: ${habit}`);
  console.log(`📝 Input: ${JSON.stringify(testPrompt)}`);
  console.log(`\n💡 Open browser console and run:`);
  console.log(`   await HabitsBundle.executeWorkflow('${habit}', ${JSON.stringify(testPrompt)})`);
  console.log(`\n⏳ Press Ctrl+C to stop server...\n`);
  
  // Open Chrome
  const chromeProcess = spawn(chromePath!, [url], { detached: true, stdio: 'ignore' });
  chromeProcess.unref();
  
  // Keep server running until Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping server...');
    server.close();
    process.exit(0);
  });
}

async function runTest() {
  // If --chrome mode, open in Chrome directly
  if (chrome) {
    return runChrome();
  }
  
  console.log(`\n🚀 Running in ${headless ? 'headless' : 'headful'} browser...`);
  const browser = await puppeteer.launch({ executablePath: chromePath, headless });
  const page = await browser.newPage();
  const logs: string[] = [];

  // Set timeout for page operations
  page.setDefaultTimeout(60000); // 60 seconds

  page.on('console', msg => { const text = msg.text(); logs.push(text); console.log('  [browser]', text); });
  page.on('pageerror', (err: Error) => { console.error('  [error]', err.message); console.error('  [stack]', err.stack); });

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
    
    const waitFor = 120;
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Workflow execution timeout after ${waitFor} seconds`)), waitFor * 1000)
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
