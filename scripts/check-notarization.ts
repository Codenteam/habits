#!/usr/bin/env npx tsx
/**
 * Check Apple Notarization Status
 * 
 * This script checks the status of macOS app notarization submissions
 * and can staple the ticket to the DMG when complete.
 * 
 * Usage:
 *   npx tsx scripts/check-notarization.ts [options]
 * 
 * Options:
 *   --list, -l         List all notarization submissions
 *   --info, -i <id>    Get detailed info for a specific submission
 *   --log <id>         Get the log for a specific submission (if available)
 *   --staple <path>    Staple the notarization ticket to a DMG
 *   --help, -h         Show this help message
 * 
 * Environment Variables (loaded from .secrets):
 *   APPLE_API_KEY      - App Store Connect API Key ID
 *   APPLE_API_ISSUER   - App Store Connect API Issuer ID
 *   APPLE_API_KEY_BASE64 - Base64-encoded API key (.p8 file)
 * 
 * Examples:
 *   npx tsx scripts/check-notarization.ts --list
 *   npx tsx scripts/check-notarization.ts --info 81af3829-f257-4c87-9c90-66c479c85909
 *   npx tsx scripts/check-notarization.ts --staple habits-cortex/release/Cortex_1.0.6_universal.dmg
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

// Colors for terminal output
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(type: 'info' | 'success' | 'error' | 'warn' | 'header', message: string): void {
  const icons: Record<string, string> = {
    info: `${c.blue}ℹ${c.reset}`,
    success: `${c.green}✓${c.reset}`,
    error: `${c.red}✗${c.reset}`,
    warn: `${c.yellow}⚠${c.reset}`,
    header: `${c.cyan}▸${c.reset}`,
  };
  console.log(`${icons[type]} ${message}`);
}

function loadSecrets(): void {
  const secretsPath = join(ROOT_DIR, '.secrets');
  if (!existsSync(secretsPath)) {
    throw new Error('.secrets file not found in project root');
  }
  
  const content = readFileSync(secretsPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=["']?(.*)["']?$/);
    if (match) {
      let [, key, value] = match;
      // Remove trailing quote if present
      value = value.replace(/["']$/, '');
      process.env[key] = value;
    }
  }
}

function setupApiKey(): string {
  const apiKey = process.env.APPLE_API_KEY;
  const apiKeyBase64 = process.env.APPLE_API_KEY_BASE64;
  
  if (!apiKey || !apiKeyBase64) {
    throw new Error('APPLE_API_KEY and APPLE_API_KEY_BASE64 must be set');
  }
  
  const privateKeysDir = join(homedir(), 'private_keys');
  if (!existsSync(privateKeysDir)) {
    mkdirSync(privateKeysDir, { recursive: true });
  }
  
  const keyPath = join(privateKeysDir, `AuthKey_${apiKey}.p8`);
  const keyContent = Buffer.from(apiKeyBase64, 'base64').toString('utf-8');
  writeFileSync(keyPath, keyContent);
  
  return keyPath;
}

function runNotarytool(args: string, keyPath: string): string {
  const apiKey = process.env.APPLE_API_KEY!;
  const apiIssuer = process.env.APPLE_API_ISSUER!;
  
  const cmd = `xcrun notarytool ${args} --key "${keyPath}" --key-id "${apiKey}" --issuer "${apiIssuer}"`;
  
  try {
    const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return output;
  } catch (error: any) {
    if (error.stdout) return error.stdout;
    if (error.stderr) return error.stderr;
    throw error;
  }
}

function listSubmissions(keyPath: string): void {
  log('header', 'Listing all notarization submissions...\n');
  
  const output = runNotarytool('history', keyPath);
  
  // Parse and format the output nicely
  const lines = output.split('\n');
  let currentSubmission: Record<string, string> = {};
  const submissions: Record<string, string>[] = [];
  
  for (const line of lines) {
    if (line.includes('---')) {
      if (Object.keys(currentSubmission).length > 0) {
        submissions.push(currentSubmission);
        currentSubmission = {};
      }
      continue;
    }
    
    const match = line.match(/^\s*(\w+):\s*(.+)$/);
    if (match) {
      currentSubmission[match[1]] = match[2];
    }
  }
  
  if (Object.keys(currentSubmission).length > 0) {
    submissions.push(currentSubmission);
  }
  
  // Display formatted table
  console.log(`${c.bold}${'ID'.padEnd(40)} ${'Name'.padEnd(30)} ${'Status'.padEnd(15)} Date${c.reset}`);
  console.log(`${c.gray}${'─'.repeat(100)}${c.reset}`);
  
  for (const sub of submissions) {
    const id = sub.id || 'N/A';
    const name = (sub.name || 'N/A').substring(0, 28);
    const status = sub.status || 'N/A';
    const date = sub.createdDate ? new Date(sub.createdDate).toLocaleString() : 'N/A';
    
    let statusColor = c.gray;
    if (status === 'Accepted') statusColor = c.green;
    else if (status === 'Invalid') statusColor = c.red;
    else if (status === 'In Progress') statusColor = c.yellow;
    
    console.log(`${id.padEnd(40)} ${name.padEnd(30)} ${statusColor}${status.padEnd(15)}${c.reset} ${date}`);
  }
  
  console.log(`\n${c.gray}Total submissions: ${submissions.length}${c.reset}`);
}

function getInfo(submissionId: string, keyPath: string): void {
  log('header', `Getting info for submission: ${submissionId}\n`);
  
  const output = runNotarytool(`info ${submissionId}`, keyPath);
  console.log(output);
  
  // Check status and provide guidance
  if (output.includes('status: Accepted')) {
    log('success', 'Notarization ACCEPTED!');
    log('info', 'Run with --staple <path/to/dmg> to staple the ticket');
  } else if (output.includes('status: Invalid')) {
    log('error', 'Notarization FAILED');
    log('info', 'Run with --log <id> to see the error details');
  } else if (output.includes('status: In Progress')) {
    log('warn', 'Still in progress... check again later');
  }
}

function getLog(submissionId: string, keyPath: string): void {
  log('header', `Getting log for submission: ${submissionId}\n`);
  
  try {
    const output = runNotarytool(`log ${submissionId}`, keyPath);
    
    // Try to parse as JSON for pretty printing
    try {
      const json = JSON.parse(output);
      console.log(JSON.stringify(json, null, 2));
      
      if (json.issues && json.issues.length > 0) {
        console.log(`\n${c.red}${c.bold}Issues Found:${c.reset}`);
        for (const issue of json.issues) {
          console.log(`  ${c.red}•${c.reset} ${issue.message}`);
          if (issue.path) console.log(`    ${c.gray}Path: ${issue.path}${c.reset}`);
          if (issue.docUrl) console.log(`    ${c.gray}Docs: ${issue.docUrl}${c.reset}`);
        }
      }
    } catch {
      console.log(output);
    }
  } catch (error: any) {
    if (error.message?.includes('not yet available')) {
      log('warn', 'Log not yet available - submission may still be processing');
    } else {
      throw error;
    }
  }
}

function staple(dmgPath: string): void {
  const fullPath = dmgPath.startsWith('/') ? dmgPath : join(ROOT_DIR, dmgPath);
  
  if (!existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  
  log('header', `Stapling notarization ticket to: ${dmgPath}\n`);
  
  try {
    execSync(`xcrun stapler staple "${fullPath}"`, { stdio: 'inherit' });
    log('success', 'Successfully stapled notarization ticket!');
    
    // Verify
    log('info', 'Verifying...');
    execSync(`spctl --assess --type open --context context:primary-signature --verbose "${fullPath}"`, { stdio: 'inherit' });
    log('success', 'Verification passed!');
  } catch (error) {
    log('error', 'Failed to staple or verify');
    throw error;
  }
}

function showHelp(): void {
  console.log(`
${c.cyan}${c.bold}Apple Notarization Status Checker${c.reset}

${c.bold}Usage:${c.reset}
  npx tsx scripts/check-notarization.ts [options]

${c.bold}Options:${c.reset}
  --list, -l         List all notarization submissions
  --info, -i <id>    Get detailed info for a specific submission
  --log <id>         Get the log for a specific submission (if available)
  --staple <path>    Staple the notarization ticket to a DMG
  --help, -h         Show this help message

${c.bold}Examples:${c.reset}
  ${c.gray}# List all submissions${c.reset}
  npx tsx scripts/check-notarization.ts --list

  ${c.gray}# Check a specific submission${c.reset}
  npx tsx scripts/check-notarization.ts --info 81af3829-f257-4c87-9c90-66c479c85909

  ${c.gray}# Get error log for a failed submission${c.reset}
  npx tsx scripts/check-notarization.ts --log 75410bae-c903-4637-902b-3e4362afa67a

  ${c.gray}# Staple ticket to DMG after approval${c.reset}
  npx tsx scripts/check-notarization.ts --staple habits-cortex/release/Cortex_1.0.6_universal.dmg
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  // Load environment
  loadSecrets();
  const keyPath = setupApiKey();
  
  // Parse commands
  if (args.includes('--list') || args.includes('-l')) {
    listSubmissions(keyPath);
  } else if (args.includes('--info') || args.includes('-i')) {
    const idx = args.findIndex(a => a === '--info' || a === '-i');
    const submissionId = args[idx + 1];
    if (!submissionId) {
      throw new Error('--info requires a submission ID');
    }
    getInfo(submissionId, keyPath);
  } else if (args.includes('--log')) {
    const idx = args.indexOf('--log');
    const submissionId = args[idx + 1];
    if (!submissionId) {
      throw new Error('--log requires a submission ID');
    }
    getLog(submissionId, keyPath);
  } else if (args.includes('--staple')) {
    const idx = args.indexOf('--staple');
    const dmgPath = args[idx + 1];
    if (!dmgPath) {
      throw new Error('--staple requires a DMG file path');
    }
    staple(dmgPath);
  } else {
    showHelp();
  }
}

main().catch((error) => {
  log('error', error.message);
  process.exit(1);
});
