#!/usr/bin/env node
/**
 * Relinks all local workspace bits into /tmp/habits-nodes/node_modules/@ha-bits
 * so the running Cortex server picks up local source changes instead of the npm-installed copies.
 * Also builds any bit that has no dist/ yet.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.resolve(__dirname, '..');

const bitsSourceDir = path.join(cwd, 'nodes', 'bits', '@ha-bits');
const nodesModulesDir = path.join('/tmp', 'habits-nodes', 'node_modules', '@ha-bits');

fs.mkdirSync(nodesModulesDir, { recursive: true });

if (!fs.existsSync(bitsSourceDir)) {
  console.error('ERROR: local bits source dir not found:', bitsSourceDir);
  process.exit(1);
}

const bitDirs = fs.readdirSync(bitsSourceDir).filter(d =>
  fs.statSync(path.join(bitsSourceDir, d)).isDirectory()
);

let linked = 0;
let built = 0;
let failed = 0;

for (const bit of bitDirs) {
  const src = path.join(bitsSourceDir, bit);
  const dest = path.join(nodesModulesDir, bit);

  // Build if no dist
  const distDir = path.join(src, 'dist');
  if (!fs.existsSync(distDir)) {
    process.stdout.write(`  ⚙️  Building ${bit} (no dist)... `);
    try {
      execSync('npx tsc', { cwd: src, stdio: 'pipe' });
      process.stdout.write('done\n');
      built++;
    } catch (e) {
      process.stdout.write(`FAILED\n`);
      failed++;
      continue;
    }
  }

  // Remove existing entry (npm copy or stale symlink)
  try {
    const stat = fs.lstatSync(dest);
    fs.rmSync(dest, { recursive: true, force: true });
  } catch {
    // doesn't exist — fine
  }

  fs.symlinkSync(src, dest, 'dir');
  console.log(`  🔗 ${bit}`);
  linked++;
}

console.log(`\n✅ Relinked ${linked} bits (built ${built} from source, ${failed} failed).`);
console.log(`   @ha-bits/cortex is resolved via the require hook — no symlink needed.`);
