#!/usr/bin/env tsx
// Link local @ha-bits packages for development
// Usage: tsx scripts/link-local.ts [link|unlink]
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const BITS_DIR = path.join(ROOT, 'nodes/bits/@ha-bits');
const CORTEX_CORE = path.join(ROOT, 'dist/packages/cortex/core');

// Destinations to link bits into
const DESTINATIONS = [
  path.join(ROOT, 'bundle-generator'),
  path.join(ROOT, 'packages/cortex/server'),
  '/tmp/habits-nodes', // Runtime module installation dir
];

// Find all @ha-bits packages
function findAllBits(): Array<{ name: string; path: string }> {
  const bits: Array<{ name: string; path: string }> = [];
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

function run(cmd: string, cwd: string): boolean {
  try {
    execSync(cmd, { cwd, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function symlink(src: string, dest: string): boolean {
  try {
    if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true });
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.symlinkSync(src, dest, 'dir');
    return true;
  } catch (e: any) {
    console.error(`  ❌ Failed: ${e.message}`);
    return false;
  }
}

const cmd = process.argv[2] || 'link';
const bits = findAllBits();

console.log(`\n📦 Found ${bits.length} local bits\n`);

if (cmd === 'link') {
  // Link cortex-core to bundle-generator
  if (fs.existsSync(CORTEX_CORE)) {
    const dest = path.join(ROOT, 'bundle-generator/node_modules/@ha-bits/cortex-core');
    console.log(`🔗 Linking @ha-bits/cortex-core → bundle-generator`);
    symlink(CORTEX_CORE, dest);
  } else {
    console.log(`⚠️  cortex-core not built (run: pnpm nx build @ha-bits/cortex-core)`);
  }

  // Link all bits to each destination
  for (const dest of DESTINATIONS) {
    const destName = path.basename(dest);
    console.log(`\n📁 Linking bits → ${destName}/node_modules/@ha-bits/`);
    
    for (const bit of bits) {
      const linkPath = path.join(dest, 'node_modules/@ha-bits', path.basename(bit.path));
      const ok = symlink(bit.path, linkPath);
      console.log(`  ${ok ? '✅' : '❌'} ${bit.name}`);
    }
  }

  console.log(`\n✅ Linked ${bits.length} bits to ${DESTINATIONS.length} destinations`);
  console.log(`   Unlink: tsx scripts/link-local.ts unlink\n`);

} else if (cmd === 'unlink') {
  // Remove symlinks
  const cortexCoreDest = path.join(ROOT, 'bundle-generator/node_modules/@ha-bits/cortex-core');
  if (fs.existsSync(cortexCoreDest)) fs.rmSync(cortexCoreDest, { recursive: true });
  
  for (const dest of DESTINATIONS) {
    for (const bit of bits) {
      const linkPath = path.join(dest, 'node_modules/@ha-bits', path.basename(bit.path));
      if (fs.existsSync(linkPath)) fs.rmSync(linkPath, { recursive: true });
    }
  }
  console.log(`✅ Unlinked all bits\n`);
}
