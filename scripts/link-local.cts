#!/usr/bin/env tsx
// Link local @ha-bits packages for development
// Usage: tsx scripts/link-local.ts [link|unlink] [--skip-build]
import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

const ROOT = path.resolve(__dirname, '..');
const BITS_DIR = path.join(ROOT, 'nodes/bits/@ha-bits');
const CORTEX_CORE = path.join(ROOT, 'dist/packages/cortex/core');
const CORE_PKG = path.join(ROOT, 'packages/core'); // @ha-bits/core (TypeScript source for types)

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

function run(cmd: string, cwd: string, stdio: 'pipe' | 'inherit' = 'pipe'): boolean {
  try {
    execSync(cmd, { cwd, stdio });
    return true;
  } catch {
    return false;
  }
}

async function linkAndBuildBit(bit: { name: string; path: string }): Promise<{ name: string; success: boolean; error?: string }> {
  // Remove old cortex-core to ensure fresh link
  const cortexCorePath = path.join(bit.path, 'node_modules/@ha-bits/cortex-core');
  if (fs.existsSync(cortexCorePath)) {
    fs.rmSync(cortexCorePath, { recursive: true });
  }
  
  // First link cortex-core and core to this bit
  if (!run('npm link @ha-bits/cortex-core', bit.path)) {
    console.log(`  ❌ ${bit.name} (failed to link cortex-core)`);
    return { name: bit.name, success: false, error: 'Failed to link cortex-core' };
  }
  // Also link @ha-bits/core for TypeScript type resolution (cortex-core re-exports from it)
  if (!run('npm link @ha-bits/core', bit.path)) {
    console.log(`  ❌ ${bit.name} (failed to link core)`);
    return { name: bit.name, success: false, error: 'Failed to link core' };
  }

  const pkgPath = path.join(bit.path, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  if (!pkg.scripts?.build) {
    console.log(`  ✅ ${bit.name} (no build needed)`);
    return { name: bit.name, success: true };
  }

  try {
    await execAsync('npm run build', { cwd: bit.path });
    console.log(`  ✅ ${bit.name}`);
    return { name: bit.name, success: true };
  } catch (e: any) {
    const error = e.stderr?.toString() || e.stdout?.toString() || e.message;
    console.log(`  ❌ ${bit.name}`);
    if (error) {
      console.log(`     Error: ${error.split('\n').slice(0, 5).join('\n     ')}`);
    }
    return { name: bit.name, success: false, error };
  }
}

async function linkAndBuildBits(bits: Array<{ name: string; path: string }>): Promise<void> {
  // First, register cortex-core globally
  if (!fs.existsSync(CORTEX_CORE)) {
    console.log(`⚠️  cortex-core not built (run: pnpm nx build @ha-bits/cortex-core)`);
    return;
  }

  console.log(`\n🔗 Registering @ha-bits/cortex-core globally with npm link...`);
  if (!run('npm link', CORTEX_CORE)) {
    console.log(`  ❌ Failed to register cortex-core globally`);
    return;
  }
  console.log(`  ✅ Registered cortex-core globally`);

  // Also register @ha-bits/core globally (for TypeScript type resolution)
  console.log(`\n🔗 Registering @ha-bits/core globally with npm link...`);
  if (!run('npm link', CORE_PKG)) {
    console.log(`  ❌ Failed to register core globally`);
    return;
  }
  console.log(`  ✅ Registered core globally`);

  console.log(`\n🔨 Linking cortex-core, core, and building ${bits.length} bits in parallel...\n`);

  const results = await Promise.all(bits.map(linkAndBuildBit));
  
  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n📊 Build results: ${succeeded.length} succeeded, ${failed.length} failed`);
  if (failed.length > 0) {
    console.log(`⚠️  Some builds failed - links may not work correctly`);
  }
}

function unlinkCortexCoreFromBits(bits: Array<{ name: string; path: string }>): void {
  console.log(`\n🔗 Unlinking @ha-bits/cortex-core and @ha-bits/core from all bits...`);
  for (const bit of bits) {
    run('npm unlink @ha-bits/cortex-core', bit.path);
    run('npm unlink @ha-bits/core', bit.path);
  }
  
  // Unregister globally
  if (fs.existsSync(CORTEX_CORE)) {
    run('npm unlink', CORTEX_CORE);
  }
  if (fs.existsSync(CORE_PKG)) {
    run('npm unlink', CORE_PKG);
  }
  console.log(`  ✅ Unlinked cortex-core and core from all bits`);
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
const skipBuild = process.argv.includes('--skip-build');
const bits = findAllBits();

console.log(`\n📦 Found ${bits.length} local bits\n`);

(async () => {
if (cmd === 'link') {
  // Link cortex-core to each bit and build (in parallel)
  if (!skipBuild) {
    await linkAndBuildBits(bits);
  } else {
    console.log(`⏭️  Skipping build (--skip-build)`);
  }

  // Link cortex-core to bundle-generator using npm link
  if (fs.existsSync(CORTEX_CORE)) {
    const bundleGeneratorDir = path.join(ROOT, 'bundle-generator');
    console.log(`\n🔗 Linking @ha-bits/cortex-core → bundle-generator`);
    if (run('npm link @ha-bits/cortex-core', bundleGeneratorDir)) {
      console.log(`  ✅ Linked cortex-core to bundle-generator`);
    } else {
      console.log(`  ❌ Failed to link cortex-core to bundle-generator`);
    }
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
  // Unlink cortex-core from all bits
  unlinkCortexCoreFromBits(bits);

  // Unlink from bundle-generator
  const bundleGeneratorDir = path.join(ROOT, 'bundle-generator');
  run('npm unlink @ha-bits/cortex-core', bundleGeneratorDir);
  
  for (const dest of DESTINATIONS) {
    for (const bit of bits) {
      const linkPath = path.join(dest, 'node_modules/@ha-bits', path.basename(bit.path));
      if (fs.existsSync(linkPath)) fs.rmSync(linkPath, { recursive: true });
    }
  }
  console.log(`✅ Unlinked all bits\n`);
}
})();
