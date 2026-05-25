#!/usr/bin/env node
/**
 * Smoke test for the YAML UI engine: compile every showcase
 * `frontend/index.yaml` (or any *.yaml argument you pass) and write the
 * resulting HTML to `.compiled/<showcase-id>.html`.
 *
 * Usage:
 *   node scripts/smoke-test-ui-engine.mjs                       # all showcases
 *   node scripts/smoke-test-ui-engine.mjs showcase/ai-quiz/frontend/index.yaml
 *
 * Exits non-zero on the first compilation error.
 */
import { readFile, readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const corePkg = path.join(repoRoot, 'dist/packages/cortex/core/index.cjs');

if (!existsSync(corePkg)) {
  console.error(`✖ Build cortex-core first: pnpm nx build @ha-bits/cortex-core`);
  process.exit(1);
}
const { createRequire } = await import('node:module');
const requireCjs = createRequire(import.meta.url);
const { compileUiYaml } = requireCjs(corePkg);

async function syncHaAssets(outDir) {
  const { copyHaAssetsTo } = requireCjs(corePkg);
  copyHaAssetsTo(outDir);
}

const inputs = process.argv.slice(2);
let files = [];
if (inputs.length > 0) {
  files = inputs.map((p) => path.resolve(p));
} else {
  const showcaseDir = path.join(repoRoot, 'showcase');
  for (const sub of await readdir(showcaseDir)) {
    const candidate = path.join(showcaseDir, sub, 'frontend', 'index.yaml');
    if (existsSync(candidate) && (await stat(candidate)).isFile()) {
      files.push(candidate);
    }
  }
}

const outDir = path.join(repoRoot, '.compiled-frontends');
await mkdir(outDir, { recursive: true });
await syncHaAssets(outDir);

function outName(file) {
  // showcase/<id>/frontend/index.yaml → <id>.html
  const parts = file.split(path.sep);
  const idx = parts.indexOf('showcase');
  if (idx >= 0 && parts[idx + 1]) return `${parts[idx + 1]}.html`;
  return `${path.basename(file).replace(/\.ya?ml$/i, '')}.html`;
}

let ok = 0;
let failed = 0;
for (const file of files) {
  const label = path.relative(repoRoot, file);
  try {
    const src = await readFile(file, 'utf-8');
    const { html } = compileUiYaml(src);
    const out = path.join(outDir, outName(file));
    await writeFile(out, html, 'utf-8');
    console.log(`✓ ${label} → ${path.relative(repoRoot, out)} (${(html.length / 1024).toFixed(1)} KB)`);
    ok += 1;
  } catch (err) {
    console.error(`✖ ${label} — ${err && err.message ? err.message : err}`);
    failed += 1;
  }
}

console.log(`\n${ok} ok, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
