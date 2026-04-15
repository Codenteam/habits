#!/usr/bin/env npx tsx
/**
 * Deploy Documentation - Builds and prepares documentation for deployment.
 * 
 * This script handles all documentation build steps:
 * - Building required packages (habit-viewer, cortex)
 * - Copying assets to docs/public
 * - Generating showcase and bits documentation
 * - Building the VitePress documentation
 * - Generating downloads manifest
 * - Uploading to server via SCP
 * 
 * Usage:
 *   npx tsx scripts/deploy-docs.ts
 * 
 * Environment Variables:
 *   GITHUB_TOKEN - GitHub personal access token (for downloads manifest)
 *   SKIP_BUILD - Skip package builds if "true" (useful for local testing)
 *   SCP_HOST, SCP_USERNAME, SCP_KEY, SCP_PASSPHRASE, SCP_PORT, SCP_PATH - For upload
 * 
 * Note: This script runs silently with no console output for CI/CD compatibility.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, copyFileSync, rmSync, cpSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DOCS_DIR = join(ROOT_DIR, 'docs');
const DOCS_PUBLIC = join(DOCS_DIR, 'public');
const SHOWCASE_DIR = join(ROOT_DIR, 'showcase');
const DIST_DIR = join(ROOT_DIR, 'dist');

// Debug mode: enabled when DEBUG=true and not in CI/CD
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const isDebug = process.env.DEBUG === 'true' && !isCI;

function run(cmd: string, opts: { cwd?: string; allowFail?: boolean } = {}): boolean {
  const cwd = opts.cwd || ROOT_DIR;
  if (isDebug) {
    console.log(`[DEBUG] Running: ${cmd}`);
    console.log(`[DEBUG] CWD: ${cwd}`);
  }
  try {
    const output = execSync(cmd, { cwd, stdio: 'pipe', env: { ...process.env, FORCE_COLOR: '0' } });
    if (isDebug && output) {
      console.log(`[DEBUG] Output:\n${output.toString()}`);
    }
    return true;
  } catch (error) {
    if (isDebug) {
      const err = error as { stderr?: Buffer; stdout?: Buffer };
      if (err.stdout) console.log(`[DEBUG] Stdout:\n${err.stdout.toString()}`);
      if (err.stderr) console.log(`[DEBUG] Stderr:\n${err.stderr.toString()}`);
    }
    if (!opts.allowFail) throw error;
    return false;
  }
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function copyDir(src: string, dest: string): void {
  if (!existsSync(src)) {
    return;
  }
  ensureDir(dest);
  cpSync(src, dest, { recursive: true });
}

function findFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  function walk(currentDir: string) {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (extensions.some(ext => entry.name.endsWith(ext))) results.push(fullPath);
    }
  }
  walk(dir);
  return results;
}

function buildPackages(): void {
  if (process.env.SKIP_BUILD === 'true') {
    return;
  }
  return;
  run('pnpm nx build @ha-bits/habit-viewer');
  run('pnpm nx build @ha-bits/cortex');
  run('npx tsx scripts/link-local.cts');
}

function copyHabitViewer(): void {
  console.log('\n=== Copying Habit Viewer ===\n');
  const viewerSrc = join(DIST_DIR, 'packages/habit-viewer');
  const viewerDest = join(DOCS_PUBLIC, 'viewer');
  if (existsSync(viewerDest)) rmSync(viewerDest, { recursive: true });
  ensureDir(viewerDest);
  copyDir(viewerSrc, viewerDest);
  const pkgJson = join(viewerDest, 'package.json');
  if (existsSync(pkgJson)) rmSync(pkgJson);
}

function copyShowcaseFiles(): void {
  const showcasePublic = join(DOCS_PUBLIC, 'showcase');
  ensureDir(showcasePublic);

  const yamlFiles = findFiles(SHOWCASE_DIR, ['.yaml', '.yml']);
  for (const file of yamlFiles) {
    const relativePath = relative(SHOWCASE_DIR, file);
    const destPath = join(showcasePublic, relativePath);
    ensureDir(dirname(destPath));
    copyFileSync(file, destPath);
  }

  for (const demoDir of ['ai-cookbook/demo', 'ai-journal/demo']) {
    const src = join(SHOWCASE_DIR, demoDir);
    const dest = join(showcasePublic, demoDir);
    if (existsSync(src)) {
      copyDir(src, dest);
    }
  }
}

function copyInstallScript(): void {
  console.log('\n=== Copying Install Script ===\n');
  const src = join(ROOT_DIR, 'scripts/install.sh');
  const dest = join(DOCS_PUBLIC, 'install.sh');
  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log('install.sh copied to docs/public');
  }
}

function installDocsPackages(): void {
  console.log('\n=== Installing Documentation Dependencies ===\n');
  run('pnpm install', { cwd: DOCS_DIR });
}

function generateDocsContent(): void {
  console.log('\n=== Generating Documentation Content ===\n');
  run('npx tsx scripts/generate-showcase.ts');
  run('npx tsx scripts/update-bits-stats.ts'); // Fetch stats first
  run('npx tsx scripts/generate-bits.ts');     // Then generate pages with stats
}

function buildDocs(): void {
  console.log('\n=== Building VitePress Documentation ===\n');
  run('npm run build', { cwd: DOCS_DIR });
}

function generateDownloadsManifest(): void {
  console.log('\n=== Generating Downloads Manifest ===\n');
  run('npx tsx scripts/generate-downloads-manifest.ts');
}

function uploadToServer(): void {
  console.log('\n=== Uploading to Server ===\n');

  const { SCP_HOST, SCP_USERNAME, SCP_KEY, SCP_PASSPHRASE, SCP_PORT, SCP_PATH } = process.env;
  
  if (!SCP_HOST || !SCP_USERNAME || !SCP_KEY || !SCP_PATH) {
    console.log('SCP environment variables not set, skipping upload');
    return;
  }

  const keyFile = '/tmp/deploy-key';

  // Convert from base64 to PEM format
  // The key is stored as base64-encoded PEM content
  let keyContent = Buffer.from(SCP_KEY, 'base64').toString('utf8');
  if (!keyContent.endsWith('\n')) {
    keyContent += '\n';
  }
  writeFileSync(keyFile, keyContent, { mode: 0o600 });

  // If passphrase is provided, decrypt the key for non-interactive use
  if (SCP_PASSPHRASE) {
    run(`ssh-keygen -p -P "${SCP_PASSPHRASE}" -N "" -f ${keyFile}`);
  }

  try {
    const port = SCP_PORT || '22';
    const source = join(DOCS_DIR, '.vitepress/dist/');
    
    // Build rsync command with checksum-based sync
    // -a: archive mode, -z: compress, -c: checksum (content-based diff), --delete: remove extra files on remote
    const rsyncCmd = `rsync -azc --delete -e "ssh -p ${port} -o StrictHostKeyChecking=no -o BatchMode=yes -i ${keyFile}" "${source}" "${SCP_USERNAME}@${SCP_HOST}:${SCP_PATH}"`;
    
    run(rsyncCmd);
    console.log('Upload complete');
  } catch(e) {
    console.error(`Upload failed: ${(e as Error).message}`);
  }finally {
    // if (existsSync(keyFile)) unlinkSync(keyFile);
  }
}

async function main(): Promise<void> {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           📚 Habits Documentation Deployment 📚            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    buildPackages();
    copyHabitViewer();
    copyShowcaseFiles();
    copyInstallScript();
    installDocsPackages();
    generateDocsContent();
    buildDocs();
    generateDownloadsManifest();
    uploadToServer();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✓ Documentation deployment complete in ${elapsed}s\n`);
  } catch (error) {
    process.exit(1);
  }
}

main();
