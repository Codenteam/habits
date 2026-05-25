#!/usr/bin/env node
/**
 * E2E: verify ha-assets icons/fonts inside the real Tauri webview via WebDriver.
 * Prerequisite: habits-cortex running with debug-tools + no-external-habits:
 *   cd habits-cortex && npm run tauri -- dev --config src-tauri/tauri.dev.conf.json --features no-external-habits,debug-tools
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const habitPath = path.join(repoRoot, 'habits-cortex/www/builtin-habits/hello-world.habit');
const WD = process.env.TAURI_WEBDRIVER_URL || 'http://127.0.0.1:4445';

async function wd(method, path, body) {
  const res = await fetch(`${WD}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok && json.value === undefined && json.error === undefined) {
    throw new Error(`WebDriver ${method} ${path}: ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

function elId(result) {
  return result?.value?.['element-6066-11e4-a52e-4f735466cecf'] ?? null;
}

async function evalSync(sessionId, script, args = []) {
  const r = await wd('POST', `/session/${sessionId}/execute/sync`, { script, args });
  return r.value;
}

async function evalAsync(sessionId, script, args = []) {
  const r = await wd('POST', `/session/${sessionId}/execute/async`, { script, args });
  return r.value;
}

async function waitFor(fn, label, timeoutMs = 45000) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < timeoutMs) {
    try {
      const v = await fn();
      if (v) return v;
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for ${label}${lastErr ? `: ${lastErr}` : ''}`);
}

async function main() {
  console.log(`WebDriver: ${WD}`);

  await waitFor(async () => {
    const s = await wd('GET', '/status');
    return s?.value?.ready !== false;
  }, 'webdriver status');

  const habitB64 = (await readFile(habitPath)).toString('base64');

  const session = await wd('POST', '/session', {
    capabilities: { alwaysMatch: { browserName: 'habits-cortex' } },
  });
  const sessionId = session.value?.sessionId;
  if (!sessionId) throw new Error('No sessionId: ' + JSON.stringify(session));

  try {
    await waitFor(async () => {
      const ready = await evalSync(sessionId, `return typeof __habits__ !== 'undefined'`);
      return ready === true;
    }, '__habits__ API');

    // Import repacked hello-world.habit via in-app API (real Tauri file IO path)
    const imported = await evalAsync(
      sessionId,
      `
      var b64 = arguments[0];
      var done = arguments[1];
      __habits__.importHabitFromBase64(b64, 'Hello World').then(function(ok) {
        done({ ok: ok, habits: __habits__.getHabits().map(function(h) { return h.name; }) });
      }).catch(function(e) { done({ error: String(e) }); });
      `,
      [habitB64],
    );
    console.log('Import:', imported);
    if (!imported?.ok?.success) throw new Error('Import failed: ' + JSON.stringify(imported));
    const habitId = imported.ok.habitId;

    // hello-world requires PARAM1 in keyring before the UI opens
    const runResult = await evalAsync(
      sessionId,
      `
      var habitId = arguments[0];
      var done = arguments[1];
      (async function() {
        try {
          if (typeof initKeyring === 'function' && !state.keyringReady) {
            state.keyringReady = await initKeyring();
          }
          if (typeof saveSecret === 'function') {
            await saveSecret('PARAM1', 'hello');
          }

          function clickHabit() {
            var card = document.querySelector('.habit-menu-btn[data-habit-id="' + habitId + '"]')?.closest('.habit-card');
            if (card) card.click();
          }

          clickHabit();
          await new Promise(function(r) { setTimeout(r, 800); });

          var secretsModal = document.getElementById('secrets-modal');
          if (secretsModal && secretsModal.classList.contains('active')) {
            var input = document.querySelector('.secret-input-inline[data-key="PARAM1"]');
            if (input) {
              input.value = 'hello';
              var saveBtn = document.getElementById('secrets-save-all-btn');
              if (saveBtn) saveBtn.click();
              await new Promise(function(r) { setTimeout(r, 800); });
            }
            clickHabit();
            await new Promise(function(r) { setTimeout(r, 1500); });
          }

          done({
            habitViewActive: document.getElementById('habit-view')?.classList.contains('active'),
            secretsOpen: document.getElementById('secrets-modal')?.classList.contains('active'),
            hasIframe: !!document.querySelector('#habit-content iframe'),
          });
        } catch (e) {
          done({ error: String(e) });
        }
      })();
      `,
      [habitId],
    );
    console.log('Run habit:', runResult);

    await waitFor(async () => {
      const active = await evalSync(
        sessionId,
        `return document.getElementById('habit-view')?.classList.contains('active') && !!document.querySelector('#habit-content iframe');`,
      );
      return active === true;
    }, 'habit iframe');

    await new Promise((r) => setTimeout(r, 1500));

    const domCheck = await evalSync(
      sessionId,
      `
      var iframe = document.querySelector('#habit-content iframe');
      var doc = iframe.contentDocument;
      var icons = doc.querySelectorAll('.ha-icon--lucide');
      var iconStyles = Array.from(icons).slice(0, 5).map(function(el) {
        return window.getComputedStyle(el).webkitMaskImage || window.getComputedStyle(el).maskImage;
      });
      var title = doc.querySelector('.ha-header__title, h1');
      var titleFont = title ? window.getComputedStyle(title).fontFamily : '';
      return {
        iconCount: icons.length,
        iconStyles: iconStyles,
        titleFont: titleFont,
        htmlHasHaAssets: doc.documentElement.innerHTML.indexOf('ha-assets/') >= 0,
      };
      `,
    );

    const assetChecks = await evalAsync(
      sessionId,
      `
      var paths = arguments[0];
      var done = arguments[1];
      Promise.all(paths.map(function(p) {
        return fetch('/' + p).then(function(r) { return r.arrayBuffer().then(function(b) {
          return { path: p, status: r.status, bytes: b.byteLength };
        }); });
      })).then(function(results) { done(results); }).catch(function(e) { done({ error: String(e) }); });
      `,
      [
        [
          'ha-assets/icons/lucide/Hand.svg',
          'ha-assets/icons/lucide/PenLine.svg',
          'ha-assets/fonts/orbitron-latin-700-normal.woff2',
        ],
      ],
    );

    const screenshot = await wd('GET', `/session/${sessionId}/screenshot`);
    if (screenshot?.value) {
      const out = path.join(repoRoot, '.compiled-frontends/tauri-ha-assets-screenshot.png');
      await import('node:fs/promises').then((fs) => fs.writeFile(out, Buffer.from(screenshot.value, 'base64')));
      console.log(`Screenshot: ${path.relative(repoRoot, out)}`);
    }

    const check = {
      ...domCheck,
      assetChecks,
      ok:
        domCheck?.iconCount > 0 &&
        domCheck?.htmlHasHaAssets &&
        Array.isArray(assetChecks) &&
        assetChecks.every((a) => a.status === 200 && a.bytes > 0) &&
        domCheck?.iconStyles?.some((s) => String(s).includes('ha-assets/icons/lucide/')),
    };

    console.log(JSON.stringify(check, null, 2));

    if (!check.ok) {
      console.error('✗ Tauri ha-assets check failed');
      process.exit(1);
    }

    console.log('✓ Tauri webview: habit UI loaded with Lucide icons + cortex-core ha-assets');
    console.log(`  icons: ${check.iconCount}, title font: ${check.titleFont}`);
  } finally {
    await wd('DELETE', `/session/${sessionId}`).catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
