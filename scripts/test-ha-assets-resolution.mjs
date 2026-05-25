#!/usr/bin/env node
/**
 * Verify ha-assets (icons + fonts) resolve correctly in:
 * 1. Node.js Cortex server (/ha-assets from cortex-core dist)
 * 2. Tauri www shell (static ha-assets/ beside habits-cortex index)
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const corePkg = path.join(repoRoot, 'dist/packages/cortex/core/index.cjs');
const stackPath = path.join(repoRoot, 'showcase/hello-world/stack.yaml');
const tauriWww = path.join(repoRoot, 'habits-cortex/www');
const sampleHtmlPath = path.join(repoRoot, '.compiled-frontends/hello-world.html');

const ASSET_RE = /ha-assets\/(?:icons\/lucide\/[A-Za-z0-9_-]+\.svg|fonts\/[a-z0-9-]+\.woff2)/g;

function log(ok, msg) {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHealth(baseUrl, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await sleep(300);
  }
  throw new Error(`Server did not become healthy: ${baseUrl}`);
}

function extractAssetPaths(html) {
  return [...new Set(html.match(ASSET_RE) || [])];
}

async function validateAsset(baseUrl, assetPath) {
  const url = `${baseUrl}/${assetPath}`;
  const res = await fetch(url);
  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}` };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (assetPath.endsWith('.svg')) {
    const text = buf.toString('utf8');
    if (!/^\s*<svg[\s>]/i.test(text)) {
      return { ok: false, error: 'not valid SVG' };
    }
    return { ok: true, bytes: buf.length };
  }

  if (assetPath.endsWith('.woff2')) {
    const magic = buf.subarray(0, 4).toString('ascii');
    if (magic !== 'wOF2') {
      return { ok: false, error: `bad woff2 magic: ${magic}` };
    }
    return { ok: true, bytes: buf.length };
  }

  return { ok: false, error: 'unknown asset type' };
}

async function testAssets(label, baseUrl, assetPaths) {
  let failed = 0;
  for (const assetPath of assetPaths) {
    const result = await validateAsset(baseUrl, assetPath);
    if (result.ok) {
      log(true, `[${label}] ${assetPath} (${result.bytes} bytes)`);
    } else {
      log(false, `[${label}] ${assetPath} — ${result.error}`);
      failed += 1;
    }
  }
  return failed;
}

function startStaticServer(rootDir, port) {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
        const rel = reqPath === '/' ? 'index.html' : reqPath.replace(/^\//, '');
        const filePath = path.join(rootDir, rel);
        if (!filePath.startsWith(rootDir)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }
        if (!existsSync(filePath)) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const data = await readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const types = {
          '.html': 'text/html',
          '.svg': 'image/svg+xml',
          '.woff2': 'font/woff2',
          '.css': 'text/css',
          '.js': 'application/javascript',
        };
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
        res.end(data);
      } catch (err) {
        res.writeHead(500);
        res.end(String(err));
      }
    });
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function startCortexServer(port) {
  const mainCjs = path.join(repoRoot, 'dist/packages/cortex/server/main.cjs');
  const entry = existsSync(mainCjs)
    ? ['node', mainCjs, 'server', '--config', stackPath, '--port', String(port)]
    : ['pnpm', 'tsx', 'packages/cortex/server/src/main.ts', 'server', '--config', stackPath, '--port', String(port)];

  const proc = spawn(entry[0], entry.slice(1), {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0' },
  });

  let stderr = '';
  proc.stderr.on('data', (d) => { stderr += d.toString(); });

  return { proc, stderr: () => stderr };
}

async function main() {
  if (!existsSync(corePkg)) {
    console.error('Build cortex-core first: pnpm nx build @ha-bits/cortex-core');
    process.exit(1);
  }

  const { createRequire } = await import('node:module');
  const requireCjs = createRequire(import.meta.url);
  const { compileUiYaml, copyHaAssetsTo } = requireCjs(corePkg);

  let html;
  if (existsSync(sampleHtmlPath)) {
    html = await readFile(sampleHtmlPath, 'utf8');
  } else {
    const yamlSource = await readFile(path.join(repoRoot, 'showcase/hello-world/frontend/index.yaml'), 'utf8');
    html = compileUiYaml(yamlSource).html;
  }

  const assetPaths = extractAssetPaths(html);
  if (assetPaths.length === 0) {
    console.error('No ha-assets paths found in compiled hello-world HTML');
    process.exit(1);
  }

  console.log(`Sample assets from compiled HTML (${assetPaths.length}):`);
  assetPaths.slice(0, 5).forEach((p) => console.log(`  - ${p}`));
  if (assetPaths.length > 5) console.log(`  ... and ${assetPaths.length - 5} more`);

  copyHaAssetsTo(tauriWww);
  if (!existsSync(path.join(tauriWww, 'ha-assets/icons/lucide/Hand.svg'))) {
    console.error('Failed to sync ha-assets into habits-cortex/www');
    process.exit(1);
  }

  let totalFailed = 0;
  const cortexPort = 19200 + Math.floor(Math.random() * 800);
  const tauriPort = 20200 + Math.floor(Math.random() * 800);

  console.log('\n--- Node.js Cortex server ---');
  const { proc: cortexProc, stderr: cortexErr } = await startCortexServer(cortexPort);
  let tauriServer;

  try {
    const cortexBase = `http://127.0.0.1:${cortexPort}`;
    await waitForHealth(cortexBase);

    const indexRes = await fetch(`${cortexBase}/`);
    if (!indexRes.ok) {
      log(false, `Cortex index HTML HTTP ${indexRes.status}`);
      totalFailed += 1;
    } else {
      const indexHtml = await indexRes.text();
      const runtimeAssets = extractAssetPaths(indexHtml);
      log(true, `Cortex served compiled HTML (${runtimeAssets.length} asset refs)`);
      totalFailed += await testAssets('cortex', cortexBase, assetPaths);
    }

    console.log('\n--- Tauri www shell (static) ---');
    tauriServer = await startStaticServer(tauriWww, tauriPort);
    const tauriBase = `http://127.0.0.1:${tauriPort}`;
    totalFailed += await testAssets('tauri', tauriBase, assetPaths);

    // Simulate habit iframe: parent page at www root, relative ha-assets URLs
    const iframeRes = await fetch(`${tauriBase}/${assetPaths[0]}`);
    if (!iframeRes.ok) {
      log(false, `Tauri iframe-relative path failed for ${assetPaths[0]}`);
      totalFailed += 1;
    } else {
      log(true, `Tauri iframe-relative resolution OK for ${assetPaths[0]}`);
    }
  } finally {
    cortexProc.kill('SIGTERM');
    if (tauriServer) tauriServer.close();
  }

  console.log(`\n${totalFailed === 0 ? 'All ha-assets resolution checks passed.' : `${totalFailed} check(s) failed.`}`);
  if (totalFailed > 0 && cortexErr()) {
    console.error('\nCortex stderr:\n', cortexErr().slice(-2000));
  }
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
