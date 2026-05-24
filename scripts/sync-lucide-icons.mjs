#!/usr/bin/env node
/**
 * Copy Lucide SVG icons from lucide-static into cortex-core assets (and optional extra targets).
 * Generates manifest.json for hasLucideIcon / getLucideIconNames.
 *
 * Run before building @ha-bits/cortex-core or in CI so icons are not committed to git.
 *
 * Usage:
 *   node scripts/sync-lucide-icons.mjs [--clean] [extraDestDir ...]
 *
 * Default output:
 *   packages/cortex/core/assets/icons/lucide/*.svg
 *   packages/cortex/core/assets/icons/manifest.json
 *
 * Extra dest dirs receive the same lucide/*.svg tree (e.g. habits-cortex/www/ha-assets/icons).
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const require = createRequire(import.meta.url);

const DEFAULT_ICONS_ROOT = path.join(repoRoot, 'packages/cortex/core/assets/icons');
const DEFAULT_LUCIDE_DIR = path.join(DEFAULT_ICONS_ROOT, 'lucide');
const DEFAULT_MANIFEST = path.join(DEFAULT_ICONS_ROOT, 'manifest.json');

const args = process.argv.slice(2);
const clean = args.includes('--clean');
const extraDestRoots = args.filter((a) => a !== '--clean').map((p) => path.resolve(p));

/** kebab-case file stem → PascalCase Lucide component name (Hand, Wand2, AArrowDown). */
function kebabToPascal(kebab) {
  return kebab
    .split('-')
    .filter(Boolean)
    .map((part) => (/^\d+$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}

/** Strip lucide-static comment/noise; keep mask-friendly SVG attributes. */
function normalizeLucideSvg(raw) {
  let svg = raw.replace(/<!--[\s\S]*?-->\s*/g, '').trim();
  svg = svg.replace(/\sclass="[^"]*"/g, '');
  svg = svg.replace(/\swidth="[^"]*"/g, '');
  svg = svg.replace(/\sheight="[^"]*"/g, '');
  return `${svg}\n`;
}

function resolveLucideStaticIconsDir() {
  let pkgRoot;
  try {
    pkgRoot = path.dirname(require.resolve('lucide-static/package.json'));
  } catch {
    console.error('✖ lucide-static is not installed. Run: pnpm add -D lucide-static');
    process.exit(1);
  }
  const iconsDir = path.join(pkgRoot, 'icons');
  if (!existsSync(iconsDir)) {
    console.error(`✖ lucide-static icons directory not found: ${iconsDir}`);
    process.exit(1);
  }
  const canonicalKebab = new Set(
    Object.keys(JSON.parse(readFileSync(path.join(pkgRoot, 'icon-nodes.json'), 'utf8'))),
  );
  return { iconsDir, canonicalKebab, pkgRoot };
}

function writeLucideTree(srcIconsDir, canonicalKebab, lucideDestDir, manifestDest) {
  if (clean && existsSync(lucideDestDir)) {
    rmSync(lucideDestDir, { recursive: true, force: true });
  }
  mkdirSync(lucideDestDir, { recursive: true });

  const allFiles = readdirSync(srcIconsDir)
    .filter((f) => f.endsWith('.svg'))
    .sort((a, b) => a.localeCompare(b));
  const canonicalFiles = allFiles.filter((f) => canonicalKebab.has(f.slice(0, -4)));
  const aliasFiles = allFiles.filter((f) => !canonicalKebab.has(f.slice(0, -4)));

  const writtenLower = new Set();
  let copied = 0;
  let skipped = 0;

  for (const file of [...canonicalFiles, ...aliasFiles]) {
    const kebab = file.slice(0, -4);
    const pascal = kebabToPascal(kebab);
    const lower = pascal.toLowerCase();
    if (writtenLower.has(lower)) {
      skipped += 1;
      continue;
    }

    const raw = readFileSync(path.join(srcIconsDir, file), 'utf8');
    writeFileSync(path.join(lucideDestDir, `${pascal}.svg`), normalizeLucideSvg(raw));
    writtenLower.add(lower);
    copied += 1;
  }

  const names = readdirSync(lucideDestDir)
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.slice(0, -4))
    .sort((a, b) => a.localeCompare(b));
  writeFileSync(manifestDest, `${JSON.stringify(names, null, 2)}\n`);

  return { copied, skipped, names };
}

function copyLucideTreeTo(lucideSrcDir, manifestSrc, destIconsRoot) {
  const lucideDest = path.join(destIconsRoot, 'lucide');
  mkdirSync(lucideDest, { recursive: true });
  cpSync(lucideSrcDir, lucideDest, { recursive: true, force: true });
  cpSync(manifestSrc, path.join(destIconsRoot, 'manifest.json'));
}

function main() {
  const { iconsDir: srcIconsDir, canonicalKebab, pkgRoot } = resolveLucideStaticIconsDir();
  const pkgVersion = JSON.parse(readFileSync(path.join(pkgRoot, 'package.json'), 'utf8')).version;

  const { copied, skipped, names } = writeLucideTree(
    srcIconsDir,
    canonicalKebab,
    DEFAULT_LUCIDE_DIR,
    DEFAULT_MANIFEST,
  );

  console.log(
    `✓ lucide-static@${pkgVersion}: ${copied} icons (${skipped} alias/case duplicates skipped) → ${path.relative(repoRoot, DEFAULT_LUCIDE_DIR)}`,
  );
  console.log(`✓ manifest (${names.length} names) → ${path.relative(repoRoot, DEFAULT_MANIFEST)}`);

  for (const destRoot of extraDestRoots) {
    copyLucideTreeTo(DEFAULT_LUCIDE_DIR, DEFAULT_MANIFEST, destRoot);
    console.log(`✓ copied lucide tree → ${path.relative(repoRoot, destRoot)}`);
  }
}

main();
