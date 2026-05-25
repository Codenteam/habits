#!/usr/bin/env node
/** Repack builtin hello-world.habit with fresh YAML-compiled frontend HTML. */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const corePkg = path.join(repoRoot, 'dist/packages/cortex/core/index.cjs');
const habitPath = path.join(repoRoot, 'habits-cortex/www/builtin-habits/hello-world.habit');
const yamlPath = path.join(repoRoot, 'showcase/hello-world/frontend/index.yaml');

if (!existsSync(corePkg)) throw new Error('Build cortex-core first');
const { createRequire } = await import('node:module');
const { compileUiYaml } = createRequire(import.meta.url)(corePkg);

const yamlSource = await readFile(yamlPath, 'utf8');
const { html } = compileUiYaml(yamlSource);
if (!html.includes('ha-assets/icons/lucide/')) {
  throw new Error('Compiled HTML missing ha-assets icon paths');
}

const zipData = await readFile(habitPath);
const zip = await JSZip.loadAsync(zipData);
zip.file('frontend/index.html', html);
// YAML is source of truth in repo; habit UI is compiled HTML only.
zip.remove('frontend/index.yaml');
zip.remove('frontend/index.yml');

const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
await writeFile(habitPath, out);
console.log(`✓ Repacked ${path.relative(repoRoot, habitPath)} (${(out.length / 1024).toFixed(1)} KB)`);
console.log(`  HTML references ha-assets paths (icons + fonts from cortex-core www/)`);
