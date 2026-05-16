/**
 * RSS Trigger Cron Test
 *
 * Tests the bit-rss newItems polling trigger using REAL cron timing (1 minute interval).
 * Instead of the manual fire endpoint, this test waits for the natural cron fire at
 * every minute boundary and counts new workflow executions via GET /misc/executions.
 *
 * Steps:
 *   A. Wait for 1st cron fire: expect 3 executions (one per item)
 *   B. Wait for 2nd cron fire: expect 0 executions (all already seen)
 *   C. Add 2 items, wait for 3rd cron fire: expect 2 executions
 *   D. Restart cortex server
 *   E. Wait for 1st cron fire after restart: expect 0 executions (SQLite persisted)
 *   F. Add 1 item, wait for next cron fire: expect 1 execution
 *
 * Total runtime: ~7 minutes (6 cron fires + startup/restart overhead)
 *
 * Run with: npx tsx showcase/rss-test/test-cron.ts
 */

import { spawn, ChildProcess } from 'node:child_process';
import { createServer, Server } from 'node:http';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const WORKSPACE = join(import.meta.dirname, '..', '..');
const FEED_PATH = join(import.meta.dirname, 'feed.xml');
const STACK_PATH = join(import.meta.dirname, 'stack.yaml');
const CORTEX_PORT = 13002;
const HTTP_PORT = 8765;
const BASE_URL = `http://localhost:${CORTEX_PORT}`;

// Seconds after the minute boundary to wait before reading executions.
// Gives the cron handler and workflow executor time to finish.
const CRON_SETTLE_SECS = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg: string) {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`\n${'─'.repeat(60)}\n[${ts}] ${msg}\n${'─'.repeat(60)}`);
}

function pass(msg: string) {
  console.log(`  PASS: ${msg}`);
}

function fail(msg: string) {
  console.error(`  FAIL: ${msg}`);
  process.exit(1);
}

function assert(condition: boolean, message: string) {
  if (condition) pass(message);
  else fail(message);
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Feed XML ─────────────────────────────────────────────────────────────────

const ORIGINAL_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>RSS Test Feed</title>
    <link>http://localhost:${HTTP_PORT}/</link>
    <description>Test RSS feed for bit-rss trigger testing</description>
    <language>en-us</language>

    <item>
      <title>Item 3 - Third Article</title>
      <link>http://localhost:${HTTP_PORT}/item-3</link>
      <description>This is the third test article.</description>
      <pubDate>Thu, 15 May 2026 10:00:00 +0000</pubDate>
      <guid>http://localhost:${HTTP_PORT}/item-3</guid>
    </item>

    <item>
      <title>Item 2 - Second Article</title>
      <link>http://localhost:${HTTP_PORT}/item-2</link>
      <description>This is the second test article.</description>
      <pubDate>Wed, 14 May 2026 10:00:00 +0000</pubDate>
      <guid>http://localhost:${HTTP_PORT}/item-2</guid>
    </item>

    <item>
      <title>Item 1 - First Article</title>
      <link>http://localhost:${HTTP_PORT}/item-1</link>
      <description>This is the first test article.</description>
      <pubDate>Tue, 13 May 2026 10:00:00 +0000</pubDate>
      <guid>http://localhost:${HTTP_PORT}/item-1</guid>
    </item>

  </channel>
</rss>
`;

function resetFeed() {
  writeFileSync(FEED_PATH, ORIGINAL_FEED, 'utf8');
}

function prependItems(items: Array<{ id: string; title: string; pubDate: string }>) {
  const xml = readFileSync(FEED_PATH, 'utf8');
  const newItemsXml = items.map(item => `
    <item>
      <title>${item.title}</title>
      <link>http://localhost:${HTTP_PORT}/${item.id}</link>
      <description>Test article: ${item.title}</description>
      <pubDate>${item.pubDate}</pubDate>
      <guid>http://localhost:${HTTP_PORT}/${item.id}</guid>
    </item>`).join('\n');

  const updated = xml.replace(
    /(<description>.*?<\/description>\s*<language>.*?<\/language>)/s,
    `$1\n${newItemsXml}`,
  );
  writeFileSync(FEED_PATH, updated, 'utf8');
}

// ─── Local feed HTTP server ───────────────────────────────────────────────────

function startFeedServer(): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      if (req.url === '/feed.xml') {
        const xml = readFileSync(FEED_PATH, 'utf8');
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

// ─── Cortex server management ─────────────────────────────────────────────────

async function killPortIfInUse(port: number): Promise<void> {
  try {
    const { execSync } = await import('node:child_process');
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
    await sleep(1000);
    console.log(`  Cleared any existing process on port ${port}.`);
  } catch { /* ignore */ }
}

function startCortex(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const serverNodeModules = join(WORKSPACE, 'packages/cortex/server/node_modules');
    const existingNodePath = process.env.NODE_PATH || '';
    const nodePath = existingNodePath
      ? `${serverNodeModules}:${existingNodePath}`
      : serverNodeModules;

    const proc = spawn(
      'pnpm',
      ['nx', 'dev', '@ha-bits/cortex', '--config', STACK_PATH, '--skip-nx-cache'],
      {
        cwd: WORKSPACE,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        env: { ...process.env, NODE_PATH: nodePath },
      },
    );

    let resolved = false;

    const onData = (chunk: Buffer) => {
      process.stdout.write(
        chunk.toString().split('\n').map(l => (l ? `  [cortex] ${l}` : '')).join('\n'),
      );
    };

    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);
    proc.on('error', err => { if (!resolved) reject(err); });

    // Poll health until ready
    setTimeout(async () => {
      for (let i = 0; i < 40; i++) {
        try {
          const r = await fetch(`${BASE_URL}/misc/health`);
          if (r.ok) { resolved = true; resolve(proc); return; }
        } catch { /* not ready */ }
        await sleep(2000);
      }
      if (!resolved) reject(new Error('Cortex did not start within 80 seconds'));
    }, 3000);
  });
}

async function waitForCortex(): Promise<void> {
  console.log('  Polling for cortex readiness...');
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${BASE_URL}/misc/health`);
      if (r.ok) { console.log('  Cortex is ready.\n'); return; }
    } catch { /* not ready */ }
    await sleep(2000);
  }
  fail('Cortex server did not become ready within 80 seconds');
}

function stopCortex(proc: ChildProcess): Promise<void> {
  return new Promise(resolve => {
    if (proc.exitCode !== null) { resolve(); return; }
    proc.on('exit', () => resolve());
    proc.kill('SIGTERM');
    setTimeout(() => { if (proc.exitCode === null) proc.kill('SIGKILL'); }, 5000);
  });
}

// ─── Execution counting ───────────────────────────────────────────────────────

async function listExecutions(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/misc/executions`);
  if (!res.ok) throw new Error(`/misc/executions returned ${res.status}`);
  return res.json() as Promise<any[]>;
}

/**
 * Count workflow executions whose startTime > windowStart.
 * Waits until the count has been stable for 5 seconds (all processing done).
 */
async function countExecutionsSince(windowStart: Date): Promise<number> {
  let stableCount = -1;
  let stableFor = 0;

  for (let i = 0; i < 30; i++) {
    const all = await listExecutions();
    const count = all.filter(e => new Date(e.startTime) > windowStart).length;
    if (count === stableCount) {
      stableFor++;
      if (stableFor >= 3) return count; // stable for 3 × 2s = 6 seconds
    } else {
      stableCount = count;
      stableFor = 0;
    }
    await sleep(2000);
  }
  return stableCount;
}

/**
 * Sleep until the next minute boundary, then add CRON_SETTLE_SECS more seconds.
 * Always waits at least 5 seconds past the boundary so a cron that fired
 * right before we called this still gets a full minute to re-fire.
 */
async function waitForNextCronFire(label: string): Promise<Date> {
  const windowStart = new Date();
  const msIntoCurrentMinute = Date.now() % 60000;
  const msToNextMinute = 60000 - msIntoCurrentMinute;
  // Ensure we always wait at least 10s into the new minute
  const waitMs = msToNextMinute + CRON_SETTLE_SECS * 1000;
  const firesAt = new Date(Date.now() + waitMs);

  console.log(
    `  Waiting ${Math.ceil(waitMs / 1000)}s for cron to fire` +
    ` (fires at :${firesAt.getUTCMinutes().toString().padStart(2, '0')}:${firesAt.getUTCSeconds().toString().padStart(2, '0')} UTC)...`,
  );

  // Print countdown every 10s
  const interval = setInterval(() => {
    const remaining = Math.ceil((firesAt.getTime() - Date.now()) / 1000);
    if (remaining > 0) console.log(`  ${remaining}s remaining...`);
  }, 10000);

  await sleep(waitMs);
  clearInterval(interval);

  console.log(`  Cron window closed. Counting executions since ${windowStart.toISOString()}...`);
  return windowStart;
}

// ─── Main test ────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n====================================================');
  console.log('  RSS Trigger Cron Test');
  console.log('  (uses real 1-minute cron, ~7 min total runtime)');
  console.log('====================================================\n');

  // Clean state
  resetFeed();
  console.log('  Reset feed.xml to original 3 items.');
  try {
    rmSync('/tmp/habits-sql/habits-polling.db');
    console.log('  Cleared previous SQLite polling state.');
  } catch { /* fine if absent */ }

  log('Starting local feed HTTP server...');
  const feedServer = await startFeedServer();

  await killPortIfInUse(CORTEX_PORT);

  log('Starting cortex server...');
  let cortexProc = await startCortex();
  await waitForCortex();

  try {
    // ── Step A: First cron fire – should trigger 3 executions ─────────────────
    log('Step A: Waiting for 1st cron fire – expect 3 executions (all new items)');
    const windowA = await waitForNextCronFire('A');
    const countA = await countExecutionsSince(windowA);
    console.log(`  Executions in window: ${countA}`);
    assert(countA === 3, `Expected 3 executions (one per item), got ${countA}`);

    // ── Step B: Second cron fire – should trigger 0 executions ────────────────
    log('Step B: Waiting for 2nd cron fire – expect 0 executions (all items seen)');
    const windowB = await waitForNextCronFire('B');
    const countB = await countExecutionsSince(windowB);
    console.log(`  Executions in window: ${countB}`);
    assert(countB === 0, `Expected 0 executions, got ${countB}`);

    // ── Step C: Add 2 items, wait for cron – should trigger 2 executions ──────
    log('Step C: Adding 2 new items, waiting for cron – expect 2 executions');
    prependItems([
      { id: 'item-5', title: 'Item 5 - Fifth Article', pubDate: 'Sat, 17 May 2026 10:00:00 +0000' },
      { id: 'item-4', title: 'Item 4 - Fourth Article', pubDate: 'Fri, 16 May 2026 10:00:00 +0000' },
    ]);
    console.log('  Feed updated with 2 new items (item-4, item-5).');
    const windowC = await waitForNextCronFire('C');
    const countC = await countExecutionsSince(windowC);
    console.log(`  Executions in window: ${countC}`);
    assert(countC === 2, `Expected 2 executions, got ${countC}`);

    // ── Step D: Restart cortex ─────────────────────────────────────────────────
    log('Step D: Restarting cortex server...');
    await stopCortex(cortexProc);
    console.log('  Cortex stopped.');
    await sleep(2000);
    await killPortIfInUse(CORTEX_PORT);
    cortexProc = await startCortex();
    await waitForCortex();
    console.log('  Cortex restarted.');

    // ── Step E: First cron fire after restart – should trigger 0 executions ───
    log('Step E: Waiting for cron fire after restart – expect 0 executions (SQLite persisted)');
    const windowE = await waitForNextCronFire('E');
    const countE = await countExecutionsSince(windowE);
    console.log(`  Executions in window: ${countE}`);
    assert(countE === 0, `Expected 0 executions after restart (SQLite should have persisted seen state), got ${countE}`);

    // ── Step F: Add 1 item, wait for cron – should trigger 1 execution ────────
    log('Step F: Adding 1 new item, waiting for cron – expect 1 execution');
    prependItems([
      { id: 'item-6', title: 'Item 6 - Sixth Article', pubDate: 'Sun, 18 May 2026 10:00:00 +0000' },
    ]);
    console.log('  Feed updated with 1 new item (item-6).');
    const windowF = await waitForNextCronFire('F');
    const countF = await countExecutionsSince(windowF);
    console.log(`  Executions in window: ${countF}`);
    assert(countF === 1, `Expected 1 execution, got ${countF}`);

    // ── All steps passed ───────────────────────────────────────────────────────
    console.log('\n====================================================');
    console.log('  ALL CRON STEPS PASSED');
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
