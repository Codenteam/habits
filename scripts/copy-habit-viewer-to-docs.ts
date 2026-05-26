#!/usr/bin/env npx tsx
/**
 * Build habit-viewer and copy static assets to docs/public/viewer/
 *
 * Usage: npx tsx scripts/copy-habit-viewer-to-docs.ts
 *
 * Environment:
 *   SKIP_BUILD=true - skip nx build, copy existing dist only
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DIST_DIR = join(ROOT_DIR, 'dist');
const DOCS_PUBLIC = join(ROOT_DIR, 'docs/public');
const VIEWER_SRC = join(DIST_DIR, 'packages/habit-viewer');
const VIEWER_DEST = join(DOCS_PUBLIC, 'viewer');

function run(cmd: string): void {
  execSync(cmd, { cwd: ROOT_DIR, stdio: 'inherit', env: { ...process.env, FORCE_COLOR: '0' } });
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function buildHabitViewer(): void {
  if (process.env.SKIP_BUILD === 'true') {
    console.log('SKIP_BUILD=true — skipping habit-viewer build');
    return;
  }
  console.log('Building @ha-bits/habit-viewer...');
  run('pnpm nx build @ha-bits/habit-viewer');
}

function copyHabitViewer(): void {
  if (!existsSync(VIEWER_SRC)) {
    console.error(`Habit viewer build not found at ${VIEWER_SRC}`);
    console.error('Run without SKIP_BUILD or build manually: pnpm nx build @ha-bits/habit-viewer');
    process.exit(1);
  }

  console.log(`Copying habit viewer to ${VIEWER_DEST}`);
  if (existsSync(VIEWER_DEST)) rmSync(VIEWER_DEST, { recursive: true });
  ensureDir(VIEWER_DEST);
  cpSync(VIEWER_SRC, VIEWER_DEST, { recursive: true });

  const pkgJson = join(VIEWER_DEST, 'package.json');
  if (existsSync(pkgJson)) rmSync(pkgJson);

  console.log('Habit viewer copied to docs/public/viewer/');
}

buildHabitViewer();
copyHabitViewer();
