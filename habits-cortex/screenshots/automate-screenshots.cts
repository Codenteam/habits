#!/usr/bin/env -S npx tsx
import { spawn } from 'child_process';
import { copyFileSync, mkdirSync } from 'fs';
import {DEVICES} from './constants.cjs';
// === Configuration ===



type Action =
  | { type: 'screenshot'; id: string }
  | { type: 'click'; selector: string }
  | { type: 'click-text'; text: string }
  | { type: 'hover'; selector: string }
  | { type: 'wait'; ms: number }
  | { type: 'eval'; code: string };

const oneAction: Action[] = [
  // 1. Initial app screenshots
  { type: 'wait', ms: 500 },
  { type: 'screenshot', id: 'home' },

];

const allActions: Action[] = [
  // 1. Initial app screenshots
  { type: 'wait', ms: 500 },
  { type: 'screenshot', id: 'home' },

  // 2. Click Open Habit and take screenshots
  { type: 'click-text', text: 'Open Habit' },
  { type: 'wait', ms: 500 },
  { type: 'screenshot', id: 'open-habit' },

  // 3. Click first habit's 3-dots menu and hover View Files
  { type: 'click', selector: '.habit-item:first-child [data-menu-trigger], .habit-card:first-child button:last-child' },
  { type: 'wait', ms: 300 },
  { type: 'hover', selector: '[role="menuitem"]:nth-child(2)' },
  { type: 'wait', ms: 200 },
  { type: 'screenshot', id: 'habit-menu-files' },

  // 4. Click Secrets button and take screenshots
  { type: 'click-text', text: 'Secrets' },
  { type: 'wait', ms: 500 },
  { type: 'screenshot', id: 'secrets' },

  // 5. Close secrets modal, go back to list, select View Files for first habit
  { type: 'click', selector: '#secrets-close' },
  { type: 'wait', ms: 300 },
  { type: 'click-text', text: 'Back' },
  { type: 'wait', ms: 300 },
  { type: 'click', selector: '.habit-item:first-child [data-menu-trigger], .habit-card:first-child button:last-child' },
  { type: 'wait', ms: 300 },
  { type: 'click-text', text: 'View Files' },
  { type: 'wait', ms: 500 },
  { type: 'click', selector: '#btn-auto-arrange' },
  { type: 'wait', ms: 5000 },
  { type: 'screenshot', id: 'view-files' },

  // 6. Select first item and take screenshot
  { type: 'click', selector: '#file-select-list .picker-item:first-child' },
  { type: 'wait', ms: 300 },
  { type: 'screenshot', id: 'file-selected' },
];

const actions = allActions;

// === Execution Engine ===

const OUTPUT_DIR = 'source';
const d = (ms: number) => new Promise(r => setTimeout(r, ms));

async function sendCommand(body: string): Promise<string | null> {
  try {
    const res = await fetch('http://127.0.0.1:9987/e', { method: 'POST', body });
    if (res.ok) return await res.text();
  } catch (e) {
    console.error('Command error:', e);
  }
  return null;
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9987/e', { method: 'POST', body: 'resize:800x600' });
      if (res.ok) {
        const text = await res.text();
        if (text.includes('x') && !text.includes('not found')) return true;
      }
    } catch { /* ignore */ }
    await d(100);
  }
  return false;
}

async function takeScreenshot(filename: string): Promise<boolean> {
  try {
    const res = await fetch('http://127.0.0.1:9987/e', { method: 'POST', body: 'screenshot' });
    if (res.ok) {
      const tempPath = (await res.text()).trim();
      copyFileSync(tempPath, filename);
      return true;
    }
  } catch { /* ignore */ }
  return false;
}

async function resize(width: number, height: number): Promise<string | null> {
  return sendCommand(`resize:${width}x${height}`);
}

async function reload(): Promise<void> {
  await sendCommand('reload');
  await d(500); // Wait for reload to complete
}

async function evalJS(code: string): Promise<string | null> {
  const result = await sendCommand(code);
  return result;
}

async function clickSelector(selector: string, retries = 3): Promise<void> {
  const selectors = selector.split(', ');
  for (let attempt = 1; attempt <= retries; attempt++) {
    const result = await evalJS(`
      (function() {
        const selectors = ${JSON.stringify(selectors)};
        for (const sel of selectors) {
          try {
            const el = document.querySelector(sel);
            if (el) { el.click(); return 'CLICKED: ' + sel; }
          } catch {}
        }
        return 'NOT_FOUND: ' + selectors.join(', ');
      })();
    `);
    console.log(`    click result (attempt ${attempt}/${retries}):`, result?.trim() || '(empty - click likely succeeded)');
    // Empty result means click worked but response was lost (e.g., modal opened)
    // Only fail on explicit NOT_FOUND
    if (!result || !result.includes('NOT_FOUND')) {
      return;
    }
    if (attempt < retries) {
      console.log(`    Retrying in 100ms...`);
      await d(100);
    } else {
      throw new Error(`Click failed: element not found for selector(s): ${selector} after ${retries} attempts. Last result: ${result}`);
    }
  }
}

async function clickText(text: string, retries = 3): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const result = await evalJS(`
      (function() {
        const text = ${JSON.stringify(text)}.toLowerCase();
        for (const el of document.querySelectorAll('button, a, [role="button"], [role="menuitem"], .dropdown-item, .picker-item')) {
          if (el.textContent?.trim().toLowerCase().includes(text)) { el.click(); return 'CLICKED: ' + el.tagName + ' with text ' + el.textContent?.trim().slice(0, 30); }
        }
        // Debug: list all button/link texts
        const allTexts = [...document.querySelectorAll('button, a, [role="button"]')].map(e => e.textContent?.trim()).filter(Boolean).slice(0, 10);
        return 'NOT_FOUND: "' + text + '" - available: ' + allTexts.join(', ');
      })();
    `);
    console.log(`    click-text result (attempt ${attempt}/${retries}):`, result?.trim() || '(empty - click likely succeeded)');
    // Empty result means click worked but response was lost (e.g., modal opened)
    // Only fail on explicit NOT_FOUND
    if (!result || !result.includes('NOT_FOUND')) {
      return;
    }
    if (attempt < retries) {
      console.log(`    Retrying in 500ms...`);
      await d(100);
    } else {
      throw new Error(`Click-text failed: "${text}" not found after ${retries} attempts. Last result: ${result}`);
    }
  }
}

async function hoverSelector(selector: string): Promise<void> {
  const selectors = selector.split(', ');
  const result = await evalJS(`
    (function() {
      const selectors = ${JSON.stringify(selectors)};
      for (const sel of selectors) {
        try {
          const el = document.querySelector(sel);
          if (el) {
            el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            el.classList.add('hover');
            return 'HOVERED: ' + sel;
          }
        } catch {}
      }
      return 'NOT_FOUND for hover: ' + selectors.join(', ');
    })();
  `);
  console.log('    hover result:', result?.trim() || '(empty - hover likely succeeded)');
  // Empty result means hover worked but response was lost
  // Only fail on explicit NOT_FOUND
  if (result && result.includes('NOT_FOUND')) {
    throw new Error(`Hover failed: element not found for selector(s): ${selector}. Result: ${result}`);
  }
}

async function executeAction(action: Action): Promise<void> {
  switch (action.type) {
    case 'wait':
      // await d(action.ms);
      break;
    case 'click':
      await clickSelector(action.selector);
      break;
    case 'click-text':
      await clickText(action.text);
      break;
    case 'hover':
      await hoverSelector(action.selector);
      break;
    case 'eval':
      await evalJS(action.code);
      break;
    case 'screenshot':
      // Handled separately in main loop
      break;
  }
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('Starting habits-cortex...');
  const app = spawn('npm', ['run', 'dev'], { cwd: '..', stdio: 'inherit' });

  console.log('Waiting for automation server...');
  if (!await waitForServer()) {
    console.error('Server failed to start!');
    app.kill();
    process.exit(1);
  }
  console.log('Server ready!');
  const retina = true;
  for (const device of DEVICES) {
    const { capture, platform } = device;

    let width = capture.width;
    let height = capture.height;
    if (retina) {
      width = Math.floor(width / 1.5) as any;
      height = Math.floor(height / 1.5) as any;
    }

    console.log(`\n=== ${platform} (${width}x${height}) ===`);
    await resize(width, height);
    await d(100);
    await reload();

    for (const action of actions) {
      try {
        if (action.type === 'screenshot') {
          const filename = `${OUTPUT_DIR}/${action.id}_${platform}_${width}x${height}.png`;
          console.log(`  📸 ${filename}`);
          await takeScreenshot(filename);
        } else {
          const desc = action.type === 'wait' ? `${action.ms}ms` : 
                       action.type === 'click' ? action.selector.slice(0, 40) :
                       action.type === 'click-text' ? `"${action.text}"` :
                       action.type === 'hover' ? action.selector.slice(0, 40) :
                       'eval';
          console.log(`  ${action.type}: ${desc}`);
          await executeAction(action);
        }
      } catch (err) {
        console.error(`\n❌ FATAL ERROR: ${err instanceof Error ? err.message : err}`);
        app.kill();
        process.exit(1);
      }
    }
  }

  console.log('\nDone! Killing app...');
  app.kill();
  process.exit(0);
}

main();


