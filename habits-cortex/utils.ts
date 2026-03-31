/**
 * Utility functions for build-release.ts
 * Contains logging, CLI parsing, environment validation, temp file management,
 * command execution, and artifact collection utilities.
 */

import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & TYPES
// ═══════════════════════════════════════════════════════════════════════════════

// Get the directory of the current script, handling both Unix and Windows paths
function getScriptDir(): string {
  const url = new URL(import.meta.url);
  let dir = path.dirname(url.pathname);
  // On Windows, pathname may be like "/C:/path" - remove leading slash
  if (process.platform === 'win32' && dir.startsWith('/') && dir[2] === ':') {
    dir = dir.slice(1);
  }
  return dir;
}

const SCRIPT_DIR = getScriptDir();
export const TAURI_DIR = path.join(SCRIPT_DIR, 'src-tauri');
export const TEMP_DIR = path.join(os.tmpdir(), 'build-release-' + crypto.randomBytes(4).toString('hex'));

export type Platform = 'macos' | 'ios' | 'android' | 'windows' | 'linux';
export type LogLevel = 'info' | 'success' | 'error' | 'warn' | 'debug' | 'header' | 'step';

export interface CLIOptions {
  platforms: Platform[];
  output: string;
  debug: boolean;
  skipNotarize: boolean;
  dryRun: boolean;
  verbose: boolean;
  help: boolean;
  uploadIos: boolean;
  uploadMacos: boolean;
  uploadAndroid: boolean;
}

export interface EnvVarSpec {
  name: string;
  description: string;
  required: boolean;
  platforms: Platform[];
  isBase64?: boolean;
  example?: string;
}

export interface EnvValidationResult {
  valid: boolean;
  missing: EnvVarSpec[];
  present: EnvVarSpec[];
  warnings: string[];
}

export interface ExecOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  silent?: boolean;
  ignoreError?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD CONTEXT - Shared state between setup/build/sign/notarize functions
// ═══════════════════════════════════════════════════════════════════════════════

export interface MacOSContext {
  keychainPath: string;
  keychainPassword: string;
  isTemporaryKeychain: boolean; // false if using login keychain
  signingIdentity: string;
  developerIdIdentity?: string;
  appStoreIdentity?: string;
  installerIdentity?: string;
  hasDevIdCert: boolean;
  hasAppStoreCert: boolean;
  hasInstallerCert: boolean;
  targetDir: string;
  buildArgs: string;
  target: string;
}

export interface IOSContext {
  keychainPath: string;
  keychainPassword: string;
  signingIdentity: string;
  profileUUID: string;
  installedProfilePath: string;
  exportMethod: string;
  targetDir: string;
  buildArgs: string;
  builtAppPath?: string;
}

export interface AndroidContext {
  keystorePath: string | null;
  hasSigningCreds: boolean;
  buildArgs: string;
  apkDir: string;
  aabDir: string;
}

export interface WindowsContext {
  certPath: string | null;
  certPassword: string | null;
  timestampUrl: string;
  buildArgs: string;
  isWindows: boolean;
  targetDir: string;
}

export interface LinuxContext {
  buildArgs: string;
  isLinux: boolean;
  targetDir: string;
  hasGpgKey: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLORS & LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

export const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

export function logHeader(title: string): void {
  const line = '═'.repeat(70);
  console.log(`\n${c.cyan}${line}${c.reset}`);
  console.log(`${c.cyan}  ${(title)}${c.reset}`);
  console.log(`${c.cyan}${line}${c.reset}\n`);
}

export function logSection(title: string): void {
  console.log(`${c.gray}${'─'.repeat(50)}${c.reset}`);
  console.log(`${c.gray}${'─'.repeat(50)}${c.reset}`);
  console.log(`\n${c.magenta}▸ ${(title)}${c.reset}`);
  console.log(`${c.gray}${'─'.repeat(50)}${c.reset}`);
  console.log(`${c.gray}${'─'.repeat(50)}${c.reset}`);
}

export function logKeyValue(key: string, value: string, status?: 'ok' | 'missing' | 'warn'): void {
  const statusIcon = status === 'ok' ? `${c.green}✓${c.reset}` : 
                     status === 'missing' ? `${c.red}✗${c.reset}` : 
                     status === 'warn' ? `${c.yellow}⚠${c.reset}` : ' ';
  console.log(`  ${statusIcon} ${c.gray}${(key).padEnd(35)}${c.reset} ${(value)}`);
}

export function logBox(title: string, content: string[], type: 'error' | 'success' | 'info' = 'info'): void {
  const bgColor = type === 'error' ? c.bgRed : type === 'success' ? c.bgGreen : c.bgBlue;
  const width = 72;
  const border = '─'.repeat(width);
  
  console.log(`\n${c.gray}┌${border}┐${c.reset}`);
  console.log(`${c.gray}│${bgColor}${c.white}${c.bold} ${(title).padEnd(width - 1)}${c.reset}${c.gray}│${c.reset}`);
  console.log(`${c.gray}├${border}┤${c.reset}`);
  
  for (const line of content) {
    const truncated = (line).slice(0, width - 2);
    console.log(`${c.gray}│${c.reset} ${truncated.padEnd(width - 2)} ${c.gray}│${c.reset}`);
  }
  
  console.log(`${c.gray}└${border}┘${c.reset}\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENVIRONMENT VARIABLE SPECIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const ENV_VAR_SPECS: EnvVarSpec[] = [
  // ─── Apple (macOS & iOS shared) ───
  {
    name: 'APPLE_SIGNING_IDENTITY',
    description: 'Code signing identity for App Store ("Apple Distribution: ..." for macOS App Store)',
    required: true,
    platforms: ['macos'],
    example: 'Apple Distribution: Company Name (ABC123XYZ)',
  },
  {
    name: 'MAC_DEVELOPER_ID_IDENTITY',
    description: 'Developer ID identity for direct macOS distribution (required for notarization)',
    required: false,
    platforms: ['macos'],
    example: 'Developer ID Application: Company Name (ABC123XYZ)',
  },
  {
    name: 'MAC_DEVELOPER_ID_CERTIFICATE_BASE64',
    description: 'Base64-encoded .p12 Developer ID certificate for direct distribution notarization',
    required: false,
    platforms: ['macos'],
    isBase64: true,
    example: 'base64 -i developer-id.p12 | tr -d "\\n"',
  },
  {
    name: 'MAC_DEVELOPER_ID_CERTIFICATE_PASSWORD',
    description: 'Password for Developer ID .p12 certificate (defaults to IOS_MAC_APPLE_CERTIFICATE_PASSWORD)',
    required: false,
    platforms: ['macos'],
    example: 'your-developer-id-password',
  },
  {
    name: 'APPLE_INSTALLER_IDENTITY',
    description: 'Mac installer signing identity for Mac App Store (3rd Party Mac Developer Installer)',
    required: false,
    platforms: ['macos'],
    example: '3rd Party Mac Developer Installer: Company Name (ABC123XYZ)',
  },
  {
    name: 'IOS_MAC_APPLE_CERTIFICATE_BASE64',
    description: 'Base64-encoded .p12 certificate file for code signing (Apple Distribution)',
    required: true,
    platforms: ['macos'],
    isBase64: true,
    example: 'base64 -i certificate.p12 | tr -d "\\n"',
  },
  {
    name: 'IOS_MAC_APPLE_CERTIFICATE_PASSWORD',
    description: 'Password for the .p12 certificate',
    required: true,
    platforms: ['macos'],
    example: 'your-certificate-password',
  },
  {
    name: 'APPLE_INSTALLER_CERTIFICATE_BASE64',
    description: 'Base64-encoded .p12 installer certificate for Mac App Store (3rd Party Mac Developer Installer)',
    required: false,
    platforms: ['macos'],
    isBase64: true,
    example: 'base64 -i installer-certificate.p12 | tr -d "\\n"',
  },
  {
    name: 'APPLE_INSTALLER_CERTIFICATE_PASSWORD',
    description: 'Password for the installer .p12 certificate (defaults to IOS_MAC_APPLE_CERTIFICATE_PASSWORD)',
    required: false,
    platforms: ['macos'],
    example: 'your-installer-certificate-password',
  },
  {
    name: 'APPLE_TEAM_ID',
    description: 'Apple Developer Team ID (required for macOS notarization)',
    required: true,
    platforms: ['macos'],
    example: 'ABC123XYZ',
  },
  {
    name: 'APPLE_ID',
    description: 'Apple ID email for notarization (macOS only)',
    required: false,
    platforms: ['macos'],
    example: 'developer@company.com',
  },
  {
    name: 'APPLE_APP_SPECIFIC_PASSWORD',
    description: 'App-specific password for notarization (macOS only, generate at appleid.apple.com)',
    required: false,
    platforms: ['macos'],
    example: 'xxxx-xxxx-xxxx-xxxx',
  },

  // ─── iOS specific (uses automatic signing via App Store Connect API) ───
  // iOS requires APP_STORE_CONNECT_* variables defined below

  // ─── Android ───
  {
    name: 'ANDROID_KEYSTORE_BASE64',
    description: 'Base64-encoded .jks or .keystore file (optional - unsigned APK kept if not set)',
    required: false,
    platforms: ['android'],
    isBase64: true,
    example: 'base64 -i release.keystore | tr -d "\\n"',
  },
  {
    name: 'ANDROID_KEYSTORE_PASSWORD',
    description: 'Password for the Android keystore',
    required: false,
    platforms: ['android'],
    example: 'your-keystore-password',
  },
  {
    name: 'ANDROID_KEY_ALIAS',
    description: 'Key alias within the keystore',
    required: false,
    platforms: ['android'],
    example: 'release-key',
  },
  {
    name: 'ANDROID_KEY_PASSWORD',
    description: 'Password for the key (often same as keystore password)',
    required: false,
    platforms: ['android'],
    example: 'your-key-password',
  },

  // ─── Google Play (for uploading Android to Play Store) ───
  {
    name: 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64',
    description: 'Base64-encoded Google Play Service Account JSON key file',
    required: false,
    platforms: ['android'],
    isBase64: true,
    example: 'base64 -i service-account.json | tr -d "\\n"',
  },
  {
    name: 'GOOGLE_PLAY_PACKAGE_NAME',
    description: 'Android package name (e.g., com.company.app)',
    required: false,
    platforms: ['android'],
    example: 'com.codenteam-oss.habits',
  },
  {
    name: 'GOOGLE_PLAY_TRACK',
    description: 'Release track: internal, alpha, beta, or production',
    required: false,
    platforms: ['android'],
    example: 'internal',
  },

  // ─── Windows ───
  {
    name: 'WINDOWS_CERTIFICATE_BASE64',
    description: 'Base64-encoded .pfx certificate file for Windows signing (optional - unsigned kept if not set)',
    required: false,
    platforms: ['windows'],
    isBase64: true,
    example: 'base64 -i certificate.pfx | tr -d "\\n"',
  },
  {
    name: 'WINDOWS_CERTIFICATE_PASSWORD',
    description: 'Password for the .pfx certificate',
    required: false,
    platforms: ['windows'],
    example: 'your-pfx-password',
  },
  {
    name: 'WINDOWS_TIMESTAMP_URL',
    description: 'Timestamp server URL (default: http://timestamp.digicert.com)',
    required: false,
    platforms: ['windows'],
    example: 'http://timestamp.digicert.com',
  },

  // ─── Linux ───
  {
    name: 'APPIMAGE_GPG_PRIVATE_KEY_BASE64',
    description: 'Base64-encoded GPG private key for AppImage signing (optional)',
    required: false,
    platforms: ['linux'],
    isBase64: true,
    example: 'gpg --export-secret-keys --armor KEY_ID | base64 | tr -d "\\n"',
  },
  {
    name: 'APPIMAGE_GPG_PASSPHRASE',
    description: 'Passphrase for the GPG key',
    required: false,
    platforms: ['linux'],
    example: 'your-gpg-passphrase',
  },

  // ─── App Store Connect (required for iOS automatic signing, optional for macOS/iOS uploads) ───
  {
    name: 'APP_STORE_CONNECT_API_KEY_ID',
    description: 'App Store Connect API Key ID - REQUIRED for iOS builds (automatic signing)',
    required: true,
    platforms: ['ios'],
    example: 'ABC123DEF4',
  },
  {
    name: 'APP_STORE_CONNECT_API_KEY_ID',
    description: 'App Store Connect API Key ID - optional for macOS (only needed for --upload-macos)',
    required: false,
    platforms: ['macos'],
    example: 'ABC123DEF4',
  },
  {
    name: 'APP_STORE_CONNECT_API_ISSUER_ID',
    description: 'App Store Connect API Issuer ID - REQUIRED for iOS builds (automatic signing)',
    required: true,
    platforms: ['ios'],
    example: '12345678-1234-1234-1234-123456789012',
  },
  {
    name: 'APP_STORE_CONNECT_API_ISSUER_ID',
    description: 'App Store Connect API Issuer ID - optional for macOS (only needed for --upload-macos)',
    required: false,
    platforms: ['macos'],
    example: '12345678-1234-1234-1234-123456789012',
  },
  {
    name: 'APP_STORE_CONNECT_API_KEY_BASE64',
    description: 'Base64-encoded App Store Connect API Key (.p8) - REQUIRED for iOS builds',
    required: true,
    platforms: ['ios'],
    isBase64: true,
    example: 'base64 -i AuthKey_ABC123DEF4.p8 | tr -d "\\n"',
  },
  {
    name: 'APP_STORE_CONNECT_API_KEY_BASE64',
    description: 'Base64-encoded App Store Connect API Key (.p8) - optional for macOS uploads',
    required: false,
    platforms: ['macos'],
    isBase64: true,
    example: 'base64 -i AuthKey_ABC123DEF4.p8 | tr -d "\\n"',
  },
];

export const VALID_PLATFORMS: Platform[] = ['macos', 'ios', 'android', 'windows', 'linux'];

// ═══════════════════════════════════════════════════════════════════════════════
// CLI ARGUMENT PARSING
// ═══════════════════════════════════════════════════════════════════════════════

export function printEnvVarsHelp(): void {
  console.log(`\n${c.bold}ENVIRONMENT VARIABLES${c.reset}\n`);
  
  const platformGroups: Record<Platform, EnvVarSpec[]> = {
    macos: [],
    ios: [],
    android: [],
    windows: [],
    linux: [],
  };
  
  for (const spec of ENV_VAR_SPECS) {
    for (const platform of spec.platforms) {
      platformGroups[platform].push(spec);
    }
  }
  
  for (const [platform, specs] of Object.entries(platformGroups)) {
    console.log(`  ${c.cyan}${platform.toUpperCase()}${c.reset}`);
    for (const spec of specs) {
      const req = spec.required ? `${c.red}*${c.reset}` : ' ';
      const b64 = spec.isBase64 ? `${c.yellow}[base64]${c.reset}` : '';
      console.log(`    ${req} ${c.bold}${spec.name}${c.reset} ${b64}`);
      console.log(`      ${c.gray}${spec.description}${c.reset}`);
      if (spec.example) {
        console.log(`      ${c.dim}Example: ${spec.example}${c.reset}`);
      }
    }
    console.log();
  }
  
  console.log(`${c.red}*${c.reset} = required\n`);
}

export function parseArgs(): CLIOptions {
  // Check for --env-help early to bypass platform requirement
  if (process.argv.includes('--env-help')) {
    printEnvVarsHelp();
    process.exit(0);
  }

  const argv = yargs(hideBin(process.argv))
    .scriptName('build-release')
    .usage('$0 --platform <platform> [options]')
    .option('platform', {
      alias: 'p',
      describe: 'Target platform(s) to build',
      type: 'string',
      choices: [...VALID_PLATFORMS, 'all'] as const,
      demandOption: true,
      coerce: (arg: string): Platform[] => {
        const lower = arg.toLowerCase();
        if (lower === 'all') {
          return [...VALID_PLATFORMS];
        }
        const platforms = lower.split(',') as Platform[];
        for (const p of platforms) {
          if (!VALID_PLATFORMS.includes(p)) {
            throw new Error(`Invalid platform: ${p}. Valid: ${VALID_PLATFORMS.join(', ')}`);
          }
        }
        return platforms;
      },
    })
    .option('output', {
      alias: 'o',
      describe: 'Output directory for artifacts',
      type: 'string',
      default: path.join(SCRIPT_DIR, 'release'),
    })
    .option('debug', {
      describe: 'Build in debug mode (faster, no optimization)',
      type: 'boolean',
      default: false,
    })
    .option('skip-notarize', {
      describe: 'Skip macOS notarization step',
      type: 'boolean',
      default: false,
    })
    .option('upload-ios', {
      describe: 'Upload iOS build to App Store Connect',
      type: 'boolean',
      default: false,
    })
    .option('upload-macos', {
      describe: 'Upload macOS build to App Store Connect',
      type: 'boolean',
      default: false,
    })
    .option('upload-android', {
      describe: 'Upload Android build to Google Play Console',
      type: 'boolean',
      default: false,
    })
    .option('dry-run', {
      describe: 'Validate environment only, don\'t build',
      type: 'boolean',
      default: false,
    })
    .option('verbose', {
      alias: 'v',
      describe: 'Show all command output',
      type: 'boolean',
      default: false,
    })
    .example('$0 --platform macos', 'Build macOS with notarization')
    .example('$0 --platform android -o ./dist', 'Build Android APK')
    .example('$0 --platform ios --dry-run', 'Validate iOS environment')
    .example('$0 --platform ios --upload-ios', 'Build and upload iOS to App Store')
    .example('$0 --platform macos --upload-macos', 'Build and upload macOS to App Store')
    .example('$0 --platform android --upload-android', 'Build and upload Android to Google Play')
    .epilogue('Run with --env-help to see required environment variables per platform.')
    .wrap(100)
    .strict()
    .help()
    .version(false)
    .parseSync();

  return {
    platforms: argv.platform as Platform[],
    output: argv.output,
    debug: argv.debug,
    skipNotarize: argv['skip-notarize'],
    dryRun: argv['dry-run'],
    verbose: argv.verbose,
    help: false, // Yargs handles --help automatically
    uploadIos: argv['upload-ios'],
    uploadMacos: argv['upload-macos'],
    uploadAndroid: argv['upload-android'],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENVIRONMENT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export function validateEnvironment(platforms: Platform[]): EnvValidationResult {
  const result: EnvValidationResult = {
    valid: true,
    missing: [],
    present: [],
    warnings: [],
  };

  const relevantSpecs = ENV_VAR_SPECS.filter(spec => 
    spec.platforms.some(p => platforms.includes(p))
  );

  logSection('Environment Variable Validation');
  
  for (const spec of relevantSpecs) {
    const value = process.env[spec.name];
    const isSet = value !== undefined && value !== '';
    
    if (isSet) {
      result.present.push(spec);
      const displayValue = spec.isBase64 
        ? `${c.dim}[${value!.length} chars base64]${c.reset}`
        : spec.name.includes('PASSWORD') || spec.name.includes('SECRET')
          ? `${c.dim}****${c.reset}`
          : `${c.green}${value!.substring(0, 40)}${value!.length > 40 ? '...' : ''}${c.reset}`;
      logKeyValue(spec.name, displayValue, 'ok');
    } else if (spec.required) {
      result.missing.push(spec);
      result.valid = false;
      logKeyValue(spec.name, `${c.red}NOT SET (required)${c.reset}`, 'missing');
    } else {
      logKeyValue(spec.name, `${c.yellow}not set (optional)${c.reset}`, 'warn');
    }
  }

  // Platform-specific warnings
  if (platforms.includes('macos')) {
    const hasNotarizeCreds = process.env.APPLE_ID && 
                             process.env.APPLE_TEAM_ID && 
                             process.env.APPLE_APP_SPECIFIC_PASSWORD;
    if (!hasNotarizeCreds) {
      result.warnings.push('macOS: Notarization credentials not fully configured. Use --skip-notarize or set APPLE_ID, APPLE_TEAM_ID, APPLE_APP_SPECIFIC_PASSWORD');
    }
  }

  console.log();
  
  return result;
}

export function printValidationSummary(result: EnvValidationResult, platforms: Platform[]): void {
  if (result.valid) {
    logBox('Environment Validation Passed', [
      `Platforms: ${platforms.join(', ')}`,
      `Required variables: ${result.present.filter(s => s.required).length} set`,
      `Optional variables: ${result.present.filter(s => !s.required).length} set`,
      ...result.warnings.map(w => `⚠ ${w}`),
    ], 'success');
  } else {
    const missingLines = result.missing.map(spec => {
      return `• ${spec.name}`;
    });
    
    logBox('Environment Validation Failed', [
      `Missing ${result.missing.length} required variable(s):`,
      '',
      ...missingLines,
      '',
      'Set these environment variables and try again.',
      'Run with --help to see descriptions and examples.',
    ], 'error');

    // Print detailed help for missing variables
    console.log(`\n${c.bold}How to set missing variables:${c.reset}\n`);
    for (const spec of result.missing) {
      console.log(`${c.cyan}${spec.name}${c.reset}`);
      console.log(`  ${spec.description}`);
      if (spec.example) {
        console.log(`  ${c.dim}Example: ${spec.example}${c.reset}`);
      }
      if (spec.isBase64) {
        console.log(`  ${c.yellow}Note: This must be base64-encoded${c.reset}`);
      }
      console.log();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMP FILE MANAGEMENT & BASE64 DECODING
// ═══════════════════════════════════════════════════════════════════════════════

export const tempFiles: string[] = [];

export function setupTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    console.log('debug', `Created temp directory: ${TEMP_DIR}`);
  }
}

export function cleanupTempDir(): void {
  if (fs.existsSync(TEMP_DIR)) {
    console.log('debug', `Cleaning up temp directory: ${TEMP_DIR}`);
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
  for (const file of tempFiles) {
    if (fs.existsSync(file)) {
      fs.rmSync(file, { force: true });
    }
  }
}

export function decodeBase64ToFile(envVarName: string, filename: string): string {
  const base64Content = process.env[envVarName];
  // Check for empty, whitespace-only, or undefined values (common in CI when secrets aren't configured)
  if (!base64Content || base64Content.trim() === '') {
    throw new Error(`Environment variable ${envVarName} is not set or is empty`);
  }

  const outputPath = path.join(TEMP_DIR, filename);
  const buffer = Buffer.from(base64Content.trim(), 'base64');
  
  fs.writeFileSync(outputPath, buffer);
  fs.chmodSync(outputPath, 0o600); // Restrict permissions
  
  tempFiles.push(outputPath);
  console.log('debug', `Decoded ${envVarName} to ${outputPath} (${buffer.length} bytes)`);
  
  return outputPath;
}

/**
 * Helper to check if a base64 env var has actual content (not empty/whitespace)
 */
export function hasBase64EnvVar(envVarName: string): boolean {
  const value = process.env[envVarName];
  return !!value && value.trim().length > 0;
}

/**
 * Serialize Base64, any env var ending with _BASE64, decode and write to a temp file 
 * and add the path to the same env name replacing _BASE64 with _PATH.
 * Skips env vars that are empty or not set (common in CI when secrets are not configured).
 */
export function setupBase64EnvVars(): void {
  const base64EnvVars = Object.keys(process.env).filter(key => key.endsWith('_BASE64'));
  
  for (const envVar of base64EnvVars) {
    const value = process.env[envVar];
    // Skip empty values - common in CI when secrets are not configured
    if (!value || value.trim() === '') {
      console.log('debug', `Skipping ${envVar} (not set or empty)`);
      continue;
    }
    const fileName = envVar.replace('_BASE64', '.p12');
    const filePath = decodeBase64ToFile(envVar, fileName);
    const pathEnvVar = envVar.replace('_BASE64', '_PATH');
    process.env[pathEnvVar] = filePath;
    console.log('debug', `Decoded ${envVar} to ${pathEnvVar} (${filePath})`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

export function exec(command: string, options: ExecOptions = {}): { success: boolean; output: string } {
  const cwd = options.cwd || SCRIPT_DIR;
  const env = { ...process.env, ...options.env, FORCE_COLOR: '1' } as NodeJS.ProcessEnv;
  
  // Remove keys that were explicitly set to undefined in options.env
  if (options.env) {
    for (const key of Object.keys(options.env)) {
      if (options.env[key] === undefined) {
        delete env[key];
      }
    }
  }
  
  try {
    const output = execSync(command, {
      cwd,
      env,
      stdio: options.silent ? 'pipe' : 'inherit',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });
    return { success: true, output: output?.toString() || '' };
  } catch (error: any) {
    if (options.ignoreError) {
      return { success: false, output: error.stdout?.toString() || (error.message) };
    }
    // Re-throw with sanitized message to avoid leaking secrets
    const sanitized = new Error((error.message));
    sanitized.stack = error.stack;
    throw sanitized;
  }
}

export function execCapture(command: string, options: ExecOptions = {}): string {
  const cwd = options.cwd || SCRIPT_DIR;
  const env = { ...process.env, ...options.env } as NodeJS.ProcessEnv;
  
  try {
    const result = execSync(command, {
      cwd,
      env,
      stdio: 'pipe',
      maxBuffer: 50 * 1024 * 1024,
    });
    return result?.toString() || '';
  } catch (error: any) {
    return error.stdout?.toString() || '';
  }
}

export function commandExists(command: string): boolean {
  const isWindows = process.platform === 'win32';
  const checkCmd = isWindows ? `where ${command}` : `which ${command}`;
  try {
    execSync(checkCmd, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIFACT COLLECTION & CHECKSUMS
// ═══════════════════════════════════════════════════════════════════════════════

export function collectArtifacts(artifacts: string[], outputDir: string): void {
  logSection('Collecting Artifacts');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const checksums: string[] = [];
  
  for (const artifact of artifacts) {
    if (!fs.existsSync(artifact)) {
      console.log('warn', `Artifact not found: ${artifact}`);
      continue;
    }
    
    const filename = path.basename(artifact);
    const destPath = path.join(outputDir, filename);
    
    // Copy artifact
    if (fs.statSync(artifact).isDirectory()) {
      exec(`cp -R "${artifact}" "${destPath}"`);
    } else {
      fs.copyFileSync(artifact, destPath);
    }
    
    // Calculate checksum
    if (!fs.statSync(destPath).isDirectory()) {
      const content = fs.readFileSync(destPath);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      checksums.push(`${hash}  ${filename}`);
      console.log('success', `${filename} (${(content.length / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      console.log('success', `${filename} (directory)`);
    }
  }
  
  // Write checksums file
  if (checksums.length > 0) {
    const checksumPath = path.join(outputDir, 'SHA256SUMS.txt');
    fs.writeFileSync(checksumPath, checksums.join('\n') + '\n');
    console.log('info', `Checksums written to: SHA256SUMS.txt`);
  }
}

export function printSummary(artifacts: string[], outputDir: string, platforms: Platform[]): void {
  const lines = [
    `Platforms built: ${platforms.join(', ')}`,
    `Total artifacts: ${artifacts.length}`,
    `Output directory: ${outputDir}`,
    '',
    'Artifacts:',
    ...artifacts.map(a => `  • ${path.basename(a)}`),
  ];
  
  logBox('Build Complete', lines, 'success');
}
