#!/usr/bin/env npx tsx
/**
 * NPM Publish - Publishes affected packages to NPM with version management.
 * 
 * This script handles all NPM publishing logic:
 * - Determines version and tag based on git ref
 * - Publishes affected packages using nx
 * 
 * Usage:
 *   npx tsx scripts/npm-publish.ts                     # Auto-detect from git ref
 *   npx tsx scripts/npm-publish.ts --version 1.0.0     # Override version
 *   npx tsx scripts/npm-publish.ts --tag next          # Override tag
 * 
 * Environment Variables:
 *   NODE_AUTH_TOKEN - npm authentication token (required for publish)
 *   GITHUB_REF_NAME - git ref name (branch or tag)
 *   GITHUB_RUN_NUMBER - CI run number (used in version)
 *   GITHUB_STEP_SUMMARY - GitHub Actions step summary file path
 */

import { execSync } from 'child_process';
import { appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

// CI detection
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const summaryFile = process.env.GITHUB_STEP_SUMMARY;

interface VersionInfo {
  version: string;
  tag: string;
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

function run(cmd: string, opts: { cwd?: string; allowFail?: boolean; env?: Record<string, string> } = {}): { success: boolean; output: string } {
  const cwd = opts.cwd || ROOT_DIR;
  try {
    const output = execSync(cmd, { 
      cwd, 
      stdio: 'pipe', 
      env: { ...process.env, ...opts.env, FORCE_COLOR: '0' } 
    });
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

function determineVersionAndTag(overrideVersion?: string, overrideTag?: string): VersionInfo {
  const ref = process.env.GITHUB_REF_NAME || getCurrentGitRef();
  const runNumber = process.env.GITHUB_RUN_NUMBER || Date.now().toString().slice(-6);
  
  let version: string;
  let tag: string;
  
  if (overrideVersion) {
    version = overrideVersion;
    tag = overrideTag || 'latest';
  } else if (ref === 'main') {
    // Push to main → @next with commit-based version
    version = `0.1.0-next.${runNumber}`;
    tag = overrideTag || 'next';
  } else {
    // Tag or release branch → @latest with version from ref
    version = ref.replace(/^v/, '').replace(/^release\//, '');
    version = `${version}.${runNumber}`;
    tag = overrideTag || 'latest';
  }
  
  return { version, tag };
}

function getCurrentGitRef(): string {
  // Try to get current branch or tag
  const branchResult = run('git rev-parse --abbrev-ref HEAD', { allowFail: true });
  if (branchResult.success && branchResult.output !== 'HEAD') {
    return branchResult.output;
  }
  
  // If detached HEAD, try to get tag
  const tagResult = run('git describe --tags --exact-match 2>/dev/null', { allowFail: true });
  if (tagResult.success) {
    return tagResult.output;
  }
  
  return 'main';
}

function publishAffectedPackages(version: string, tag: string): boolean {
  log(`\n📦 Publishing affected packages...`);
  log(`   Version: ${version}`);
  log(`   Tag: @${tag}`);
  
  const result = run(
    'pnpm nx affected --target=publish --base=origin/main~1 --head=HEAD',
    { 
      env: { 
        NPM_VERSION: version, 
        NPM_TAG: tag 
      } 
    }
  );
  
  return result.success;
}

function parseArgs(): { version?: string; tag?: string } {
  const args = process.argv.slice(2);
  let version: string | undefined;
  let tag: string | undefined;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--version' || args[i] === '-v') {
      version = args[i + 1];
      i++;
    } else if (args[i] === '--tag' || args[i] === '-t') {
      tag = args[i + 1];
      i++;
    }
  }
  
  return { version, tag };
}

async function main(): Promise<void> {
  log(`\n${'═'.repeat(60)}`);
  log(`  📦 NPM Publishing Script`);
  log(`${'═'.repeat(60)}\n`);
  
  const { version: overrideVersion, tag: overrideTag } = parseArgs();
  
  // Determine version and tag
  const { version, tag } = determineVersionAndTag(overrideVersion, overrideTag);
  
  log(`Git ref: ${process.env.GITHUB_REF_NAME || getCurrentGitRef()}`);
  log(`Computed version: ${version}`);
  log(`Computed tag: @${tag}`);
  
  // Publish affected packages
  const success = publishAffectedPackages(version, tag);
  
  if (success) {
    logSummary(`📦 Published affected packages with version ${version} and tag @${tag}`);
    log(`\n✅ Done!`);
  } else {
    logSummary(`❌ Failed to publish packages`);
    log(`\n❌ Publish failed`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
