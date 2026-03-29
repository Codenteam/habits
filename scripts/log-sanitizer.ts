#!/usr/bin/env npx tsx
/**
 * Log Sanitizer Script
 * 
 * Filters sensitive environment variable values from log output.
 * Replaces:
 * 1. Raw env var values with [ENV_VAR_NAME]
 * 2. Base64-encoded env var values with [ENV_VAR_NAME:base64]
 * 3. Env var values that ARE base64-encoded (decoded form) with [ENV_VAR_NAME:decoded]
 * 
 * Usage: npx tsx scripts/deploy-docs.ts 2>&1 | npx tsx scripts/log-sanitizer.ts
 */

import * as readline from 'readline';

interface SensitivePattern {
  pattern: RegExp;
  replacement: string;
}

/**
 * Build list of sensitive patterns to replace
 */
function buildSensitivePatterns(): SensitivePattern[] {
  const patterns: SensitivePattern[] = [];
  
  // Environment variables that commonly contain secrets
  const sensitiveEnvPrefixes = [
    'SECRET', 'TOKEN', 'KEY', 'PASSWORD', 'PASS', 'CREDENTIAL',
    'AUTH', 'API', 'PRIVATE', 'SCP_', 'AWS_', 'GITHUB_', 'NPM_',
    'SSH_', 'DEPLOY_', 'DB_', 'DATABASE_', 'CERT', 'SIGN'
  ];
  
  for (const [name, value] of Object.entries(process.env)) {
    if (!value || value.length < 4) continue; // Skip empty or very short values
    
    // Check if this looks like a sensitive env var
    const isSensitive = sensitiveEnvPrefixes.some(prefix => 
      name.toUpperCase().includes(prefix)
    );
    
    // Also treat any value that looks like a secret (long random strings, base64, etc.)
    const looksLikeSecret = value.length > 20 && (
      /^[A-Za-z0-9+/=]+$/.test(value) || // Base64-ish
      /^[a-f0-9]{32,}$/i.test(value) ||   // Hex string
      /^ghp_|^gho_|^ghu_/.test(value) ||  // GitHub tokens
      /-----BEGIN/.test(value)             // PEM format
    );
    
    // For now skip any env var (really dumb, but need to)
    if (false && !isSensitive && !looksLikeSecret) continue;
    
    // 1. Replace raw value
    if (value.length >= 4) {
      const escaped = escapeRegExp(value);
      try {
        patterns.push({
          pattern: new RegExp(escaped, 'g'),
          replacement: `[${name}]`
        });
      } catch {
        // Invalid regex, skip
      }
    }
    
    // 2. Replace base64-encoded version of value
    try {
      const base64Encoded = Buffer.from(value).toString('base64');
      if (base64Encoded.length >= 4) {
        const escapedBase64 = escapeRegExp(base64Encoded);
        patterns.push({
          pattern: new RegExp(escapedBase64, 'g'),
          replacement: `[${name}:base64]`
        });
      }
    } catch {
      // Encoding failed, skip
    }
    
    // 3. If the value itself IS base64, also match the decoded form
    if (/^[A-Za-z0-9+/]+=*$/.test(value) && value.length > 10) {
      try {
        const decoded = Buffer.from(value, 'base64').toString('utf-8');
        // Only add if decoded looks like valid text (not binary garbage)
        if (decoded.length >= 4 && /^[\x20-\x7E\n\r\t]+$/.test(decoded)) {
          const escapedDecoded = escapeRegExp(decoded);
          patterns.push({
            pattern: new RegExp(escapedDecoded, 'g'),
            replacement: `[${name}:decoded]`
          });
        }
      } catch {
        // Decoding failed, skip
      }
    }
  }
  
  // Sort by pattern length (longest first) to avoid partial replacements
  patterns.sort((a, b) => b.replacement.length - a.replacement.length);
  
  return patterns;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitize a single line of log output
 */
function sanitizeLine(line: string, patterns: SensitivePattern[]): string {
  let result = line;
  
  for (const { pattern, replacement } of patterns) {
    result = result.replace(pattern, replacement);
  }
  
  return result;
}

/**
 * Main function - read from stdin and write sanitized output to stdout
 */
async function main(): Promise<void> {
  const patterns = buildSensitivePatterns();
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });
  
  rl.on('line', (line) => {
    const sanitized = sanitizeLine(line, patterns);
    console.log(sanitized);
  });
  
  rl.on('close', () => {
    process.exit(0);
  });
  
  // Handle errors gracefully
  process.stdin.on('error', () => {
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Log sanitizer error:', err.message);
  process.exit(1);
});
