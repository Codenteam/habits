#!/usr/bin/env npx tsx
/**
 * Publish Bits - Detects changed bits and publishes them to NPM.
 * 
 * This script handles all bits publishing logic:
 * - Detects changed packages from git or accepts specific package input
 * - Skips packages that require external dependencies
 * - Checks if versions are already published
 * - Builds and publishes packages to npm
 * 
 * Usage:
 *   npx tsx scripts/publish-bits.ts                    # Publish changed packages
 *   npx tsx scripts/publish-bits.ts --package bit-foo  # Publish specific package
 *   npx tsx scripts/publish-bits.ts --all              # Publish all packages
 * 
 * Environment Variables:
 *   NODE_AUTH_TOKEN - npm authentication token (required for publish)
 *   GITHUB_STEP_SUMMARY - GitHub Actions step summary file path
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const BITS_DIR = join(ROOT_DIR, 'nodes', 'bits', '@ha-bits');

// Packages to skip (add package names here if they require external dependencies)
const SKIP_PACKAGES: string[] = [];

// CI detection
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const summaryFile = process.env.GITHUB_STEP_SUMMARY;

interface PackageInfo {
  name: string;
  version: string;
}

function log(msg: string): void {
  console.log(msg);
}

function logSummary(msg: string): void {
  if (summaryFile) {
    appendFileSync(summaryFile, msg + '\n');
  }
  log(msg);
}

function run(cmd: string, opts: { cwd?: string; allowFail?: boolean } = {}): { success: boolean; output: string } {
  const cwd = opts.cwd || ROOT_DIR;
  try {
    const output = execSync(cmd, { cwd, stdio: 'pipe', env: { ...process.env, FORCE_COLOR: '0' } });
    return { success: true, output: output.toString().trim() };
  } catch (error) {
    const err = error as { stderr?: Buffer; stdout?: Buffer };
    const output = [err.stdout?.toString() || '', err.stderr?.toString() || ''].join('\n').trim();
    if (!opts.allowFail) {
      log(`Command failed: ${cmd}`);
      log(output);
    }
    return { success: false, output };
  }
}

function discoverAllBits(): string[] {
  if (!existsSync(BITS_DIR)) return [];
  return readdirSync(BITS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name.startsWith('bit-'))
    .map(e => e.name)
    .sort();
}

function getChangedBitsFromGit(): string[] {
  const result = run('git diff --name-only HEAD~1 HEAD', { allowFail: true });
  if (!result.success || !result.output) return [];
  
  const changedFiles = result.output.split('\n');
  const changedBits = new Set<string>();
  
  for (const file of changedFiles) {
    const match = file.match(/^nodes\/bits\/@ha-bits\/([^/]+)\//);
    if (match) {
      changedBits.add(match[1]);
    }
  }
  
  return Array.from(changedBits).sort();
}

function filterSkippedPackages(packages: string[]): string[] {
  return packages.filter(pkg => {
    if (SKIP_PACKAGES.includes(pkg)) {
      log(`⏭️  Skipping ${pkg} (in skip list)`);
      return false;
    }
    return true;
  });
}

function getPackageInfo(pkgDir: string): PackageInfo | null {
  const pkgJsonPath = join(pkgDir, 'package.json');
  if (!existsSync(pkgJsonPath)) return null;
  
  try {
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
    return {
      name: pkgJson.name,
      version: pkgJson.version,
    };
  } catch {
    return null;
  }
}

function isVersionPublished(packageName: string, version: string): boolean {
  const result = run(`npm view "${packageName}@${version}" version 2>/dev/null`, { allowFail: true });
  return result.success && result.output === version;
}

function buildPackage(pkgDir: string): boolean {
  log(`📦 Building...`);
  
  // Install dependencies
  const installResult = run('npm install', { cwd: pkgDir, allowFail: true });
  if (!installResult.success) {
    log(`❌ Install failed`);
    return false;
  }
  
  // Build
  const buildResult = run('npm run build', { cwd: pkgDir, allowFail: true });
  if (!buildResult.success) {
    log(`❌ Build failed`);
    return false;
  }
  
  return true;
}

function publishPackage(pkgDir: string): boolean {
  log(`🚀 Publishing...`);
  const result = run('npm publish --access public', { cwd: pkgDir, allowFail: true });
  return result.success;
}

interface PublishResult {
  package: string;
  status: 'published' | 'skipped-already-published' | 'skipped-list' | 'failed-build' | 'failed-publish' | 'not-found';
  version?: string;
}

function processPackage(bitName: string): PublishResult {
  const pkgDir = join(BITS_DIR, bitName);
  
  if (!existsSync(pkgDir)) {
    return { package: bitName, status: 'not-found' };
  }
  
  log(`\n${'═'.repeat(50)}`);
  log(`Processing: ${bitName}`);
  log(`${'═'.repeat(50)}`);
  
  const pkgInfo = getPackageInfo(pkgDir);
  if (!pkgInfo) {
    log(`❌ Could not read package.json`);
    return { package: bitName, status: 'not-found' };
  }
  
  log(`Package: ${pkgInfo.name}@${pkgInfo.version}`);
  
  // Check if already published
  if (isVersionPublished(pkgInfo.name, pkgInfo.version)) {
    log(`✅ Already published, skipping`);
    return { package: bitName, status: 'skipped-already-published', version: pkgInfo.version };
  }
  
  // Build
  if (!buildPackage(pkgDir)) {
    return { package: bitName, status: 'failed-build', version: pkgInfo.version };
  }
  
  // Publish
  if (!publishPackage(pkgDir)) {
    return { package: bitName, status: 'failed-publish', version: pkgInfo.version };
  }
  
  log(`✅ Published ${pkgInfo.name}@${pkgInfo.version}`);
  return { package: bitName, status: 'published', version: pkgInfo.version };
}

function parseArgs(): { packages: string[]; all: boolean } {
  const args = process.argv.slice(2);
  const packages: string[] = [];
  let all = false;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--package' || args[i] === '-p') {
      if (args[i + 1]) {
        packages.push(args[i + 1]);
        i++;
      }
    } else if (args[i] === '--all' || args[i] === '-a') {
      all = true;
    }
  }
  
  return { packages, all };
}

async function main(): Promise<void> {
  log(`\n${'═'.repeat(60)}`);
  log(`  📦 Bits Publishing Script`);
  log(`${'═'.repeat(60)}\n`);
  
  const { packages: specifiedPackages, all } = parseArgs();
  
  let packagesToProcess: string[];
  
  if (specifiedPackages.length > 0) {
    // Specific packages requested
    log(`Mode: Specific packages`);
    packagesToProcess = specifiedPackages;
  } else if (all) {
    // All packages
    log(`Mode: All packages`);
    packagesToProcess = discoverAllBits();
  } else {
    // Detect changed packages from git
    log(`Mode: Changed packages (from git diff)`);
    packagesToProcess = getChangedBitsFromGit();
  }
  
  // Filter out skipped packages
  packagesToProcess = filterSkippedPackages(packagesToProcess);
  
  if (packagesToProcess.length === 0) {
    log(`\n✅ No packages to publish`);
    logSummary(`ℹ️ No bits packages to publish`);
    return;
  }
  
  log(`\nPackages to process: ${packagesToProcess.join(', ')}`);
  
  // Process each package
  const results: PublishResult[] = [];
  for (const pkg of packagesToProcess) {
    results.push(processPackage(pkg));
  }
  
  // Summary
  log(`\n${'═'.repeat(60)}`);
  log(`  📊 Summary`);
  log(`${'═'.repeat(60)}\n`);
  
  const published = results.filter(r => r.status === 'published');
  const alreadyPublished = results.filter(r => r.status === 'skipped-already-published');
  const failed = results.filter(r => r.status === 'failed-build' || r.status === 'failed-publish');
  
  if (published.length > 0) {
    log(`✅ Published (${published.length}):`);
    published.forEach(r => {
      log(`   - ${r.package}@${r.version}`);
      logSummary(`📦 Published @ha-bits/${r.package}@${r.version}`);
    });
  }
  
  if (alreadyPublished.length > 0) {
    log(`⏭️  Already published (${alreadyPublished.length}):`);
    alreadyPublished.forEach(r => {
      log(`   - ${r.package}@${r.version}`);
      logSummary(`⏭️ Skipped @ha-bits/${r.package}@${r.version} (already published)`);
    });
  }
  
  if (failed.length > 0) {
    log(`❌ Failed (${failed.length}):`);
    failed.forEach(r => {
      log(`   - ${r.package}: ${r.status}`);
      logSummary(`❌ Failed @ha-bits/${r.package}: ${r.status}`);
    });
    process.exit(1);
  }
  
  log(`\n✅ Done!`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
