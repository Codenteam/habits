#!/usr/bin/env node
/**
 * Copy cortex-core bundled assets (icons + fonts) into a runtime web root as ha-assets/.
 * Used when deploying the Cortex/Tauri shell — not copied into individual .habit files.
 *
 * Usage:
 *   node scripts/sync-cortex-ha-assets.mjs [destDir ...]
 *
 * With no args, syncs to habits-cortex/www and .compiled-frontends.
 */
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const corePkg = path.join(repoRoot, 'dist/packages/cortex/core/index.cjs');

if (!existsSync(corePkg)) {
  console.error('✖ Build cortex-core first: pnpm nx build @ha-bits/cortex-core');
  process.exit(1);
}

const { createRequire } = await import('node:module');
const { copyHaAssetsTo } = createRequire(import.meta.url)(corePkg);

const defaultTargets = [
  path.join(repoRoot, 'habits-cortex/www'),
  path.join(repoRoot, '.compiled-frontends'),
];

const targets = process.argv.slice(2).map((p) => path.resolve(p));
const destRoots = targets.length > 0 ? targets : defaultTargets;

let ok = 0;
for (const destRoot of destRoots) {
  if (copyHaAssetsTo(destRoot)) {
    console.log(`✓ ha-assets → ${path.relative(repoRoot, destRoot)}/ha-assets`);
    ok += 1;
  } else {
    console.error(`✖ Failed to copy ha-assets into ${destRoot}`);
  }
}

process.exit(ok === destRoots.length ? 0 : 1);
