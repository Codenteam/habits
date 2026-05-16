/**
 * RSS Trigger Test
 *
 * Tests the bit-rss newItems polling trigger lifecycle:
 *   A. Initial fire: picks up all 3 items in feed.xml
 *   B. Repeat fire: picks up 0 items (all already seen)
 *   C. Add 2 items to feed: picks up exactly 2 new items
 *   D. Restart cortex server
 *   E. Fire after restart: picks up 0 items (SQLite state survived restart)
 *   F. Add 1 more item: picks up exactly 1 new item
 *
 * Run with: npx tsx showcase/rss-test/test.ts
 */

import { spawn, ChildProcess } from 'node:child_process';
import { createServer, Server } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as path from 'node:path';
import { rmSync } from 'node:fs';

const WORKSPACE = join(import.meta.dirname, '..', '..');
const FEED_PATH = join(import.meta.dirname, 'feed.xml');
const STACK_PATH = join(import.meta.dirname, 'stack.yaml');
const CORTEX_PORT = 13002;
const HTTP_PORT = 8765;
const BASE_URL = `http://localhost:${CORTEX_PORT}`;
const WORKFLOW_ID = 'rss-test';
const TRIGGER_NODE_ID = 'fetch-rss';
const FIRE_URL = `${BASE_URL}/misc/trigger/${WORKFLOW_ID}/${TRIGGER_NODE_ID}/fire`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`\n${'─'.repeat(60)}\n${msg}\n${'─'.repeat(60)}`);
}

function pass(msg: string) {
  console.log(`  PASS: ${msg}`);
}

function fail(msg: string) {
  console.error(`  FAIL: ${msg}`);
  process.exit(1);
}

function assert(condition: boolean, message: string) {
  if (condition) {
    pass(message);
  } else {
    fail(message);
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Feed XML manipulation ─────────────────────────────────────────────────────

const ORIGINAL_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>RSS Test Feed</title>
    <link>http://localhost:8765/</link>
    <description>Test RSS feed for bit-rss trigger testing</description>
    <language>en-us</language>

    <item>
      <title>Item 3 - Third Article</title>
      <link>http://localhost:8765/item-3</link>
      <description>This is the third test article.</description>
      <pubDate>Thu, 15 May 2026 10:00:00 +0000</pubDate>
      <guid>http://localhost:8765/item-3</guid>
    </item>

    <item>
      <title>Item 2 - Second Article</title>
      <link>http://localhost:8765/item-2</link>
      <description>This is the second test article.</description>
      <pubDate>Wed, 14 May 2026 10:00:00 +0000</pubDate>
      <guid>http://localhost:8765/item-2</guid>
    </item>

    <item>
      <title>Item 1 - First Article</title>
      <link>http://localhost:8765/item-1</link>
      <description>This is the first test article.</description>
      <pubDate>Tue, 13 May 2026 10:00:00 +0000</pubDate>
      <guid>http://localhost:8765/item-1</guid>
    </item>

  </channel>
</rss>
`;

function resetFeed() {
  writeFeed(ORIGINAL_FEED);
}

function readFeed(): string {
  return readFileSync(FEED_PATH, 'utf8');
}

function writeFeed(xml: string) {
  writeFileSync(FEED_PATH, xml, 'utf8');
}

function prependItems(items: Array<{ id: string; title: string; pubDate: string }>) {
  const xml = readFeed();
  const newItemsXml = items.map(item => `
    <item>
      <title>${item.title}</title>
      <link>http://localhost:${HTTP_PORT}/${item.id}</link>
      <description>Test article: ${item.title}</description>
      <pubDate>${item.pubDate}</pubDate>
      <guid>http://localhost:${HTTP_PORT}/${item.id}</guid>
    </item>`).join('\n');

  // Insert new items right after the <channel> opening block (before the first <item>)
  const updated = xml.replace(/(<description>.*?<\/description>\s*<language>.*?<\/language>)/s,
    `$1\n${newItemsXml}`);
  writeFeed(updated);
}

// ─── Local HTTP server (serves feed.xml) ──────────────────────────────────────

function startFeedServer(): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      if (req.url === '/feed.xml') {
        const xml = readFeed();
        res.writeHead(200, { 'Content-Type': 'application/rss+xml; charset=utf-8' });
        res.end(xml);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(HTTP_PORT, '127.0.0.1', () => {
      console.log(`  Feed server listening on http://localhost:${HTTP_PORT}/feed.xml`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

function stopFeedServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close(err => (err ? reject(err) : resolve()));
  });
}

// ─── Cortex server management ──────────────────────────────────────────────────

async function killPortIfInUse(port: number): Promise<void> {
  try {
    const { execSync } = await import('node:child_process');
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
    await sleep(1000); // Give the OS time to release the port
    console.log(`  Cleared any existing process on port ${port}.`);
  } catch { /* ignore */ }
}

function startCortex(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    // Add server node_modules to NODE_PATH so store.ts can find @ha-bits/bit-database-sql/driver
    const serverNodeModules = path.join(WORKSPACE, 'packages/cortex/server/node_modules');
    const existingNodePath = process.env.NODE_PATH || '';
    const nodePath = existingNodePath ? `${serverNodeModules}:${existingNodePath}` : serverNodeModules;

    const proc = spawn(
      'pnpm',
      ['nx', 'dev', '@ha-bits/cortex', '--config', STACK_PATH, '--skip-nx-cache'],
      {
        cwd: WORKSPACE,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        env: { ...process.env, NODE_PATH: nodePath },
      }
    );

    let resolved = false;

    const onData = (chunk: Buffer) => {
      const line = chunk.toString();
      // Log cortex output with prefix
      process.stdout.write(line.split('\n').map(l => l ? `  [cortex] ${l}` : '').join('\n'));
      if (!resolved && line.includes('Server listening on')) {
        resolved = true;
        resolve(proc);
      }
    };

    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);

    proc.on('error', err => {
      if (!resolved) reject(err);
    });

    // Fallback: if server doesn't announce itself, poll the health endpoint
    setTimeout(async () => {
      if (resolved) return;
      for (let i = 0; i < 30; i++) {
        try {
          const r = await fetch(`${BASE_URL}/misc/health`);
          if (r.ok) { resolved = true; resolve(proc); return; }
        } catch { /* not ready yet */ }
        await sleep(2000);
      }
      if (!resolved) reject(new Error('Cortex server did not start within 60 seconds'));
    }, 5000);
  });
}

async function waitForCortex(): Promise<void> {
  console.log('  Polling for cortex readiness...');
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(`${BASE_URL}/misc/health`);
      if (r.ok) { console.log('  Cortex is ready.'); return; }
    } catch { /* not ready yet */ }
    await sleep(2000);
  }
  fail('Cortex server did not become ready within 60 seconds');
}

function stopCortex(proc: ChildProcess): Promise<void> {
  return new Promise(resolve => {
    if (proc.exitCode !== null) { resolve(); return; }
    proc.on('exit', () => resolve());
    proc.kill('SIGTERM');
    // Force kill if still running after 5 seconds
    setTimeout(() => {
      if (proc.exitCode === null) proc.kill('SIGKILL');
    }, 5000);
  });
}

// ─── Trigger fire helper ───────────────────────────────────────────────────────

async function fireTrigger(): Promise<any[]> {
  const res = await fetch(FIRE_URL, { method: 'POST' });
  if (!res.ok) {
    const text = await res.text();
    fail(`fire endpoint returned ${res.status}: ${text}`);
  }
  const body = await res.json() as { success: boolean; items: any[]; message?: string };
  if (!body.success) {
    fail(`fire endpoint failed: ${body.message}`);
  }
  return body.items;
}

// ─── Main test ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n====================================================');
  console.log('  RSS Trigger Test');
  console.log('====================================================\n');

  // Reset feed to original 3 items and clear any previous SQLite state
  resetFeed();
  console.log('  Reset feed.xml to original 3 items.');
  try {
    rmSync('/tmp/habits-sql/habits-polling.db');
    console.log('  Cleared previous SQLite polling state.');
  } catch { /* fine if it doesn't exist */ }

  // Start feed HTTP server
  log('Starting local feed HTTP server...');
  const feedServer = await startFeedServer();

  // Kill any zombie cortex server on the port before starting fresh
  await killPortIfInUse(CORTEX_PORT);

  // Start cortex server
  log('Starting cortex server...');
  let cortexProc = await startCortex();
  await waitForCortex();

  try {
    // ── Step A: First fire – should pick up all 3 items ─────────────────────
    log('Step A: First fire – expect 3 items (all new)');
    const itemsA = await fireTrigger();
    console.log(`  Items returned: ${itemsA.length}`);
    itemsA.forEach(item => console.log(`    - ${item.guid || item.title}`));
    assert(itemsA.length === 3, `Expected 3 items, got ${itemsA.length}`);

    // ── Step B: Repeat fire – should pick up 0 items (all seen) ─────────────
    log('Step B: Repeat fire – expect 0 items (already seen)');
    const itemsB = await fireTrigger();
    console.log(`  Items returned: ${itemsB.length}`);
    assert(itemsB.length === 0, `Expected 0 items, got ${itemsB.length}`);

    // ── Step C: Add 2 new items – should pick up exactly 2 ──────────────────
    log('Step C: Adding 2 new items to feed, expect 2 new items');
    prependItems([
      { id: 'item-5', title: 'Item 5 - Fifth Article', pubDate: 'Sat, 17 May 2026 10:00:00 +0000' },
      { id: 'item-4', title: 'Item 4 - Fourth Article', pubDate: 'Fri, 16 May 2026 10:00:00 +0000' },
    ]);
    console.log('  Feed updated with 2 new items.');

    const itemsC = await fireTrigger();
    console.log(`  Items returned: ${itemsC.length}`);
    itemsC.forEach(item => console.log(`    - ${item.guid || item.title}`));
    assert(itemsC.length === 2, `Expected 2 items, got ${itemsC.length}`);
    const guidC = itemsC.map((i: any) => i.guid);
    assert(guidC.includes('http://localhost:8765/item-5'), 'item-5 should be in results');
    assert(guidC.includes('http://localhost:8765/item-4'), 'item-4 should be in results');

    // ── Step D: Restart cortex server ───────────────────────────────────────
    log('Step D: Stopping cortex server...');
    await stopCortex(cortexProc);
    console.log('  Cortex stopped.');

    await sleep(2000);

    log('Step D: Restarting cortex server...');
    await killPortIfInUse(CORTEX_PORT);
    cortexProc = await startCortex();
    await waitForCortex();
    console.log('  Cortex restarted.');

    // ── Step E: Fire after restart – SQLite state must survive ───────────────
    log('Step E: Fire after restart – expect 0 items (SQLite persisted seen state)');
    const itemsE = await fireTrigger();
    console.log(`  Items returned: ${itemsE.length}`);
    assert(itemsE.length === 0, `Expected 0 items after restart, got ${itemsE.length} (SQLite state not persisted!)`);

    // ── Step F: Add 1 more item – should pick up exactly 1 ──────────────────
    log('Step F: Adding 1 new item to feed, expect 1 new item');
    prependItems([
      { id: 'item-6', title: 'Item 6 - Sixth Article', pubDate: 'Sun, 18 May 2026 10:00:00 +0000' },
    ]);
    console.log('  Feed updated with 1 new item.');

    const itemsF = await fireTrigger();
    console.log(`  Items returned: ${itemsF.length}`);
    itemsF.forEach(item => console.log(`    - ${item.guid || item.title}`));
    assert(itemsF.length === 1, `Expected 1 item, got ${itemsF.length}`);
    assert((itemsF[0] as any).guid === 'http://localhost:8765/item-6', 'item-6 should be the new item');

    // ── All steps passed ────────────────────────────────────────────────────
    console.log('\n====================================================');
    console.log('  ALL STEPS PASSED');
    console.log('====================================================\n');
  } finally {
    log('Cleanup: stopping servers...');
    await stopCortex(cortexProc);
    await stopFeedServer(feedServer);
    console.log('  Done.\n');
  }
}

main().catch(err => {
  console.error('\nTest failed with error:', err);
  process.exit(1);
});
