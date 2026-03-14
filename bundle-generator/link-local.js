#!/usr/bin/env node
/**
 * Link/unlink local @ha-bits packages for bundle-generator.
 * Usage: node link-local.js [link|unlink]
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const c = { g: '\x1b[32m', r: '\x1b[31m', b: '\x1b[34m', y: '\x1b[33m', x: '\x1b[0m' };
const log = (m) => console.log(`${c.b}ℹ${c.x} ${m}`);
const run = (cmd, cwd) => { try { execSync(cmd, { cwd, stdio: 'inherit' }); return true; } catch { return false; } };

const ROOT = path.join(__dirname, '..');
const CORTEX_CORE = path.join(ROOT, 'dist/packages/cortex/core');
const BITS_DIR = path.join(ROOT, 'nodes/bits/@ha-bits');

// Find all @ha-bits packages dynamically
function findAllBits() {
  const bits = [];
  if (!fs.existsSync(BITS_DIR)) return bits;
  
  for (const name of fs.readdirSync(BITS_DIR)) {
    const bitPath = path.join(BITS_DIR, name);
    const pkgPath = path.join(bitPath, 'package.json');
    if (fs.statSync(bitPath).isDirectory() && fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        bits.push({ name: pkg.name, path: bitPath });
      } catch { /* skip invalid */ }
    }
  }
  return bits;
}

const cmd = process.argv[2] || 'link';
const bits = findAllBits();

if (cmd === 'link') {
  if (!fs.existsSync(CORTEX_CORE)) { console.log(`${c.r}✗${c.x} Build cortex-core first`); process.exit(1); }
  
  log('Creating global links...');
  run('npm link', CORTEX_CORE);
  
  console.log(`${c.y}Found ${bits.length} bits to link:${c.x}`);
  for (const bit of bits) {
    console.log(`  - ${bit.name}`);
    run('npm link', bit.path);
  }
  
  const pkgNames = ['@ha-bits/cortex-core', ...bits.map(b => b.name)].join(' ');
  log('Linking into bundle-generator...');
  run(`npm link ${pkgNames}`, __dirname);
  
  console.log(`${c.g}✓${c.x} Linked ${bits.length} bits. Unlink: node link-local.js unlink`);
} else {
  const pkgNames = ['@ha-bits/cortex-core', ...bits.map(b => b.name)].join(' ');
  run(`npm unlink ${pkgNames}`, __dirname);
  console.log(`${c.g}✓${c.x} Unlinked. Run 'npm i' to restore.`);
}
