#!/usr/bin/env tsx
// Test pack bundle in browser with fetch proxy intercepting /api/* calls
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer-core';
import { getTauriFetchProxyScript } from '../packages/base/server/src/pack/templates/tauri/tauri-fetch-proxy';

const ROOT = path.resolve(__dirname, '..');
const CONFIG = path.join(ROOT, 'showcase/marketing-campaign/stack.yaml');
const HTML_PATH = path.join(ROOT, 'showcase/marketing-campaign/frontend/index.html');
const OUTPUT_DIR = '/tmp/browser-pack-test';
const BUNDLE_PATH = path.join(OUTPUT_DIR, 'cortex-bundle.js');

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

// Inject scripts before closing </head>
const testHtml = originalHtml.replace(
  '</head>',
  `<script>${bundleCode}</script>
   <script>${fetchProxy}</script>
   </head>`
);
const testHtmlPath = path.join(OUTPUT_DIR, 'index.html');
fs.writeFileSync(testHtmlPath, testHtml);

async function runTest() {
  console.log('\n🚀 Running in headless browser...');
  const browser = await puppeteer.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage();
  const logs: string[] = [];

  page.on('console', msg => { const text = msg.text(); logs.push(text); console.log('  [browser]', text); });
  page.on('pageerror', err => console.error('  [error]', err.message));

  try {
    await page.goto(`file://${testHtmlPath}`, { waitUntil: 'domcontentloaded' });
    const hasBundle = await page.evaluate(() => !!(window as any).HabitsBundle);
    if (!hasBundle) throw new Error('HabitsBundle not loaded');
    console.log('✅ HabitsBundle loaded');

    const testPrompt = 'Test campaign for AI productivity tools';
    await page.type('#prompt', testPrompt);
    console.log('✅ Text entered in textbox');

    console.log('⏳ Clicking button and waiting 10s for workflow...');
    await page.click('#sendBtn');
    await new Promise(r => setTimeout(r, 10000));

    // Capture results from the page
    const resultsHtml = await page.$eval('#resultsContainer', el => el.innerHTML).catch(() => '');
    const bodyText = await page.$eval('body', el => el.innerText.slice(0, 2000)).catch(() => '');

    console.log('\n📋 Console Logs:\n' + logs.join('\n'));
    console.log('\n📄 Results HTML:\n' + (resultsHtml || '(empty)').slice(0, 1500));
    console.log('\n📝 Page Text Preview:\n' + bodyText.slice(0, 800));

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
