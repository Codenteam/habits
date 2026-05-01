#!/usr/bin/env npx tsx
/**
 * Generate all "Get Started" screenshots used in Variant11.vue
 *
 * Usage:
 *   npx tsx scripts/generate-get-started-shots.ts
 *
 * Flags:
 *   --only <name>     Regenerate a single shot (e.g. --only desktop-offline)
 *   --skip-servers    Skip starting/stopping servers (assume they are running)
 *   --no-wire         Skip updating Variant11.vue shot arrays
 *
 * Prerequisites:
 *   - Google Chrome installed, or set CHROME_PATH env var
 *   - puppeteer-core in devDependencies (already present)
 *
 * Servers managed automatically:
 *   base  →  pnpm nx dev @ha-bits/base   (port 3000)
 *   admin →  packages/manage/admin       (port 3099, NS_MANAGER_DEV_USER=admin bypass)
 *
 * HTML mockups:
 *   Each shot that uses a local HTML mockup has a corresponding template file in
 *   scripts/screenshots/templates/<shot-name>.html
 *   Edit those files to change what the mockup looks like, then re-run this script.
 */

import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn, type ChildProcess } from 'child_process';
import { createConnection } from 'net';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Paths ───────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const TEMPLATES_DIR = join(__dirname, 'screenshots', 'templates');
const OUTPUT_DIR = join(ROOT, 'docs', 'public', 'images', 'get-started');
const VARIANT_VUE = join(ROOT, 'docs', '.vitepress', 'theme', 'components', 'WhoAreYou', 'Variant11.vue');

// ─── Config ──────────────────────────────────────────────────────────────────

const CHROME_PATH =
  process.env['CHROME_PATH'] ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const DESKTOP_VIEWPORT = { width: 1600, height: 900, deviceScaleFactor: 2 };

// ─── Shot definitions ────────────────────────────────────────────────────────
// source: 'template' → loads scripts/screenshots/templates/<name>.html
// source: <url>      → navigates to the URL directly
// server: 'base'     → requires the Base UI server on port 3000
// server: 'admin'    → requires the admin server on port 3099
// action: <name>     → runs a puppeteer interaction after navigation (see ACTIONS below)

interface ShotDef {
  name: string;
  source: 'template' | string;
  server?: 'base' | 'admin';
  action?: string;
}

const SHOTS: ShotDef[] = [
  // ── Enterprise ──────────────────────────────────────────────────────────────
  // Terminal showing `docker compose up` output with habits-admin services starting
  { name: 'enterprise-docker-boot',     source: 'template' },
  // Real admin UI – services list / habit library
  { name: 'enterprise-admin-library',   source: 'http://localhost:3099/', server: 'admin' },
  // Real admin UI – deploy form filled with subdomain "my-habit"
  { name: 'enterprise-admin-subdomain', source: 'http://localhost:3099/', server: 'admin', action: 'fillAdminSubdomain' },
  // Browser at my-habit.habits.local showing the deployed habit UI
  { name: 'enterprise-live-subdomain',  source: 'template' },

  // ── Automation ──────────────────────────────────────────────────────────────
  // Base UI canvas with marketing-campaign habit (9 connected nodes) loaded
  { name: 'automation-canvas',          source: 'http://localhost:3000/habits/base/', server: 'base', action: 'loadMarketingCampaign' },
  // Node palette sidebar open – shows API, AI, transform, trigger node categories
  { name: 'automation-palette',         source: 'http://localhost:3000/habits/base/', server: 'base', action: 'openPalette' },
  // Canvas with a node selected and its config panel visible on the right
  { name: 'automation-run-panel',       source: 'http://localhost:3000/habits/base/', server: 'base', action: 'openRunPanel' },
  // Export modal open showing the .habit file pack/deploy option
  { name: 'automation-pack',            source: 'http://localhost:3000/habits/base/', server: 'base', action: 'openPackModal' },

  // ── Mobile ──────────────────────────────────────────────────────────────────
  // iPhone frame – App Store listing for the Habits mobile app
  { name: 'mobile-app-store',           source: 'template' },
  // iPhone frame – home screen with list of running habits and status badges
  { name: 'mobile-home',                source: 'template' },
  // iPhone frame – habit detail view: inputs, trigger settings, and Run button
  { name: 'mobile-detail',              source: 'template' },
  // iPhone lock screen with push notification from a completing habit
  { name: 'mobile-notification',        source: 'template' },

  // ── Desktop ─────────────────────────────────────────────────────────────────
  // Download page with macOS (featured), Windows, and Linux platform cards
  { name: 'desktop-download',           source: 'template' },
  // macOS window frame showing the Habits desktop app with node canvas visible
  { name: 'desktop-app',                source: 'template' },
  // macOS keychain access dialog: "Habits wants to use your keychain"
  { name: 'desktop-keychain',           source: 'template' },
  // Habits desktop in offline mode: execution log, local engine banner, skipped email node
  { name: 'desktop-offline',            source: 'template' },

  // ── Developer ───────────────────────────────────────────────────────────────
  // Terminal mockup: `npx habits@latest init my-habit` scaffold command + output
  { name: 'developer-init',             source: 'template' },
  // VS Code mockup with habit.ts open and TypeScript bit definitions visible
  { name: 'developer-vscode',           source: 'template' },
  // Base UI canvas with the Custom Bits section visible in the node palette
  { name: 'developer-custom-nodes',     source: 'http://localhost:3000/habits/base/', server: 'base', action: 'showCustomNodes' },
  // npmjs.com/package/habits showing the published habits package page
  { name: 'developer-npm',              source: 'https://www.npmjs.com/package/habits' },
];

// ─── Puppeteer actions ───────────────────────────────────────────────────────
// Each action receives the page after initial navigation. It should leave the
// page in the desired visual state before the screenshot is taken.

const MARKETING_CAMPAIGN_YAML = `
name: marketing-campaign
description: Marketing Campaign Automation
nodes:
  - id: prompt-expander
    module: "@ha-bits/bit-intersect"
    action: ask_chatgpt
    label: Prompt Expander
  - id: image-prompt
    module: "@ha-bits/bit-intersect"
    action: ask_chatgpt
    label: Image Prompt Gen
  - id: poster-prompt
    module: "@ha-bits/bit-intersect"
    action: ask_chatgpt
    label: Poster Prompt Gen
  - id: image-gen
    module: "@ha-bits/bit-intersect"
    action: generate_image
    label: Image Generator
`.trim();

async function action_loadMarketingCampaign(page: Page): Promise<void> {
  // Inject the marketing campaign into localStorage so Base UI picks it up
  await page.evaluate((yaml: string) => {
    localStorage.setItem('habits_current_habit', yaml);
    localStorage.setItem('habits_habit_name', 'marketing-campaign');
  }, MARKETING_CAMPAIGN_YAML);
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(2000);
}

async function action_openPalette(page: Page): Promise<void> {
  await action_loadMarketingCampaign(page);
  // Try common selectors for a palette/nodes toggle button
  const selectors = ['[data-testid="palette-btn"]', '[title*="palette" i]', '[aria-label*="palette" i]', 'button[class*="palette"]', '[title*="node" i]'];
  for (const sel of selectors) {
    const el = await page.$(sel);
    if (el) { await el.click(); await sleep(800); break; }
  }
}

async function action_openRunPanel(page: Page): Promise<void> {
  await action_loadMarketingCampaign(page);
  // Click on a node to select it (triggers config panel on the right)
  const nodeSelectors = ['[data-node-id]', '.node-card', '.flow-node', '[class*="nodeCard"]'];
  for (const sel of nodeSelectors) {
    const el = await page.$(sel);
    if (el) { await el.click(); await sleep(800); break; }
  }
}

async function action_openPackModal(page: Page): Promise<void> {
  await action_loadMarketingCampaign(page);
  const btnSelectors = ['[data-testid="pack-btn"]', '[title*="pack" i]', 'button[class*="pack" i]', '[aria-label*="pack" i]', '[title*="export" i]'];
  for (const sel of btnSelectors) {
    const el = await page.$(sel);
    if (el) { await el.click(); await sleep(800); break; }
  }
}

async function action_fillAdminSubdomain(page: Page): Promise<void> {
  // Navigate to services page and find a deploy/subdomain input
  await page.goto('http://localhost:3099/', { waitUntil: 'networkidle2' });
  await sleep(1500);
  const inputSelectors = ['input[placeholder*="subdomain" i]', 'input[name*="subdomain" i]', 'input[placeholder*="domain" i]', 'input[type="text"]'];
  for (const sel of inputSelectors) {
    const el = await page.$(sel);
    if (el) {
      await el.click({ clickCount: 3 });
      await el.type('my-habit');
      await sleep(500);
      break;
    }
  }
}

async function action_showCustomNodes(page: Page): Promise<void> {
  await action_loadMarketingCampaign(page);
  // Attempt to scroll to / expand the custom nodes section in the palette
  await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'));
    const custom = elements.find(el => el.textContent?.toLowerCase().includes('custom') && el.tagName !== 'BODY');
    if (custom) (custom as HTMLElement).scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await sleep(500);
}

const ACTIONS: Record<string, (page: Page) => Promise<void>> = {
  loadMarketingCampaign: action_loadMarketingCampaign,
  openPalette: action_openPalette,
  openRunPanel: action_openRunPanel,
  openPackModal: action_openPackModal,
  fillAdminSubdomain: action_fillAdminSubdomain,
  showCustomNodes: action_showCustomNodes,
};

// ─── Server management ───────────────────────────────────────────────────────

async function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const c = createConnection({ port, host: '127.0.0.1' });
    c.setTimeout(500);
    c.once('connect', () => { c.destroy(); resolve(true); });
    c.once('error', () => resolve(false));
    c.once('timeout', () => { c.destroy(); resolve(false); });
  });
}

async function waitForPort(port: number, timeoutMs = 30_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) return true;
    await sleep(500);
  }
  return false;
}

type ServerHandle = { proc: ChildProcess; port: number; kill: () => void };

async function startBaseServer(): Promise<ServerHandle | null> {
  if (await isPortOpen(3000)) {
    console.log('  ✓ Base server already running on port 3000');
    return null;
  }
  console.log('  → Starting Base server (pnpm nx dev @ha-bits/base)...');
  const proc = spawn('pnpm', ['nx', 'dev', '@ha-bits/base'], {
    cwd: ROOT,
    stdio: 'ignore',
    detached: false,
  });
  const ready = await waitForPort(3000, 60_000);
  if (!ready) throw new Error('Base server did not start within 60s');
  console.log('  ✓ Base server ready on port 3000');
  return { proc, port: 3000, kill: () => proc.kill('SIGTERM') };
}

async function startAdminServer(): Promise<ServerHandle | null> {
  if (await isPortOpen(3099)) {
    console.log('  ✓ Admin server already running on port 3099');
    return null;
  }
  console.log('  → Starting Admin server (port 3099)...');
  const proc = spawn('npx', ['tsx', 'src/server/index.ts'], {
    cwd: join(ROOT, 'packages', 'manage', 'admin'),
    stdio: 'ignore',
    detached: false,
    env: {
      ...process.env,
      NS_MANAGER_ROOT_DOMAIN: 'habits.local',
      NS_MANAGER_USERNAME: 'admin',
      NS_MANAGER_DEV_USER: 'admin',     // bypass bcrypt auth
      NS_MANAGER_PDNS_API_KEY: 'test',
      NS_MANAGER_DATA_DIR: '/tmp/habits-admin-test',
      PORT: '3099',
      HOST: '127.0.0.1',
    },
  });
  const ready = await waitForPort(3099, 30_000);
  if (!ready) throw new Error('Admin server did not start within 30s');
  console.log('  ✓ Admin server ready on port 3099');
  return { proc, port: 3099, kill: () => proc.kill('SIGTERM') };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const onlyFlag = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
  const skipServers = args.includes('--skip-servers');
  const noWire = args.includes('--no-wire');

  const shotsToRun = onlyFlag ? SHOTS.filter(s => s.name === onlyFlag) : SHOTS;
  if (onlyFlag && shotsToRun.length === 0) {
    console.error(`Unknown shot: ${onlyFlag}`);
    process.exit(1);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Determine which servers are needed
  const needsBase  = shotsToRun.some(s => s.server === 'base');
  const needsAdmin = shotsToRun.some(s => s.server === 'admin');

  const servers: (ServerHandle | null)[] = [];

  if (!skipServers) {
    if (needsBase)  servers.push(await startBaseServer());
    if (needsAdmin) servers.push(await startAdminServer());
  }

  // Launch browser
  if (!existsSync(CHROME_PATH)) {
    console.error(`Chrome not found at: ${CHROME_PATH}`);
    console.error('Set CHROME_PATH env var to your Chrome executable path.');
    process.exit(1);
  }

  const browser: Browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
    defaultViewport: DESKTOP_VIEWPORT,
  });

  let passed = 0;
  let failed = 0;

  for (const shot of shotsToRun) {
    const outPath = join(OUTPUT_DIR, `${shot.name}.webp`);
    process.stdout.write(`  [${shot.name}] `);
    try {
      const page: Page = await browser.newPage();
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);

      // Navigate
      let url: string;
      if (shot.source === 'template') {
        const tplPath = join(TEMPLATES_DIR, `${shot.name}.html`);
        if (!existsSync(tplPath)) throw new Error(`Template not found: ${tplPath}`);
        url = `file://${tplPath}`;
      } else {
        url = shot.source;
      }

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });

      // Run action if specified
      if (shot.action) {
        const fn = ACTIONS[shot.action];
        if (!fn) throw new Error(`Unknown action: ${shot.action}`);
        await fn(page);
      }

      // Short settle pause for animations
      await sleep(600);

      await page.screenshot({ path: outPath, type: 'webp', quality: 92 } as any);
      await page.close();

      const size = Math.round(statSync(outPath).size / 1024);
      console.log(`✓  (${size} KB)`);
      passed++;
    } catch (err: any) {
      console.log(`✗  ${err.message}`);
      failed++;
    }
  }

  await browser.close();

  // Stop any servers we started
  for (const srv of servers) {
    if (srv) { srv.kill(); }
  }

  console.log(`\n  ${passed} passed, ${failed} failed`);

  if (!noWire && !onlyFlag) {
    wireVariant(shotsToRun);
  }

  process.exit(failed > 0 ? 1 : 0);
}

// ─── Wire into Variant11.vue ─────────────────────────────────────────────────
// Ensures every shot array in the Vue component has a `file` property matching
// the shot name. Idempotent – safe to re-run.

function wireVariant(shots: ShotDef[]) {
  if (!existsSync(VARIANT_VUE)) {
    console.log('\n  Variant11.vue not found, skipping wire step.');
    return;
  }

  const GROUPS: Record<string, string[]> = {
    enterpriseShots:  shots.filter(s => s.name.startsWith('enterprise')).map(s => s.name),
    automationShots:  shots.filter(s => s.name.startsWith('automation')).map(s => s.name),
    mobileShots:      shots.filter(s => s.name.startsWith('mobile')).map(s => s.name),
    desktopShots:     shots.filter(s => s.name.startsWith('desktop')).map(s => s.name),
    developerShots:   shots.filter(s => s.name.startsWith('developer')).map(s => s.name),
  };

  let src = readFileSync(VARIANT_VUE, 'utf8');

  for (const [varName, names] of Object.entries(GROUPS)) {
    if (names.length === 0) continue;
    // Match the array definition and ensure each object has a `file` property
    src = src.replace(
      new RegExp(`(const ${varName}\\s*=\\s*\\[)([\\s\\S]*?)(\\])`, 'g'),
      (_full, open, body, close) => {
        const updated = body.replace(
          /\{\s*shot:\s*'([^']+)'(?:,\s*file:\s*'[^']+')?\s*\}/g,
          (_obj: string, shot: string) => {
            const matching = SHOTS.find(s => s.name.startsWith(varName.replace('Shots', '').toLowerCase()) &&
              /* map by position */
              names.includes(s.name));
            // Match by index instead
            const idx = names.findIndex(n => {
              // rough label match
              const label = n.replace(/^[^-]+-/, '').replace(/-/g, ' ');
              return shot.toLowerCase().includes(label.split(' ')[0]);
            });
            const file = idx >= 0 ? names[idx] : names[0];
            return `{ shot: '${shot}', file: '${file}' }`;
          }
        );
        return `${open}${updated}${close}`;
      }
    );
  }

  writeFileSync(VARIANT_VUE, src, 'utf8');
  console.log('\n  Variant11.vue wired ✓');
}

main().catch(err => { console.error(err); process.exit(1); });
