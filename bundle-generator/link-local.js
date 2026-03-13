#!/usr/bin/env node
/**
 * Link/unlink local @ha-bits packages for bundle-generator.
 * Usage: node link-local.js [link|unlink]
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const c = { g: '\x1b[32m', r: '\x1b[31m', b: '\x1b[34m', x: '\x1b[0m' };
const log = (m) => console.log(`${c.b}ℹ${c.x} ${m}`);
const run = (cmd, cwd) => { try { execSync(cmd, { cwd, stdio: 'inherit' }); return true; } catch { return false; } };

const ROOT = path.join(__dirname, '..');
const CORTEX_CORE = path.join(ROOT, 'dist/packages/cortex/core');
const BIT_INTERSECT = path.join(ROOT, 'nodes/bits/@ha-bits/bit-intersect');

const cmd = process.argv[2] || 'link';

if (cmd === 'link') {
  if (!fs.existsSync(CORTEX_CORE)) { console.log(`${c.r}✗${c.x} Build cortex-core first`); process.exit(1); }
  log('Creating global links...'); run('npm link', CORTEX_CORE); run('npm link', BIT_INTERSECT);
  log('Linking into bundle-generator...'); run('npm link @ha-bits/cortex-core @ha-bits/bit-intersect', __dirname);
  console.log(`${c.g}✓${c.x} Linked. Unlink: node link-local.js unlink`);
} else {
  run('npm unlink @ha-bits/cortex-core @ha-bits/bit-intersect', __dirname);
  console.log(`${c.g}✓${c.x} Unlinked. Run 'npm i' to restore.`);
}
