#!/usr/bin/env npx tsx

/**
 * IOS automatically sign when correct env are there.
 * 
 */
/**
 * Cross-Platform Build, Sign & Notarize Script for Tauri v2
 * 
 * Builds, signs, and notarizes apps for: iOS, macOS, Android, Windows, Linux (AppImage)
 * All secrets are loaded from environment variables (no static certificate files).
 * Base64-encoded secrets are decoded to temporary files at runtime.
 * 
 * Usage:
 *   npx tsx build-release.ts --platform <platform> [options]
 * 
 * Platforms: macos, ios, android, windows, linux, all
 * 
 * Options:
 *   --platform <p>    Target platform(s): macos, ios, android, windows, linux, all
 *   --output <dir>    Output directory for artifacts (default: ./release)
 *   --debug           Build in debug mode (faster, no optimization)
 *   --skip-notarize   Skip macOS notarization step
 *   --dry-run         Validate environment only, don't build
 *   --verbose         Show all command output
 *   --help            Show this help message
 * 
 * Environment Variables (see --help for full list per platform)
 */


/** NOTE TO HUMANS AND BOTS
 * 
 * Utility functions are in utils.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';

import {
  Platform,
  CLIOptions,
  MacOSContext,
  AndroidContext,
  WindowsContext,
  LinuxContext,
  TAURI_DIR,
  TEMP_DIR,
  c,
  logHeader,
  logSection,
  logBox,
  parseArgs,
  validateEnvironment,
  printValidationSummary,
  setupTempDir,
  cleanupTempDir,
  decodeBase64ToFile,
  hasBase64EnvVar,
  setupBase64EnvVars,
  exec,
  execCapture,
  commandExists,
  collectArtifacts,
  printSummary,
} from './utils.js';



// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const options = parseArgs();
  
  logHeader('Habits Cortex Build & Release');
  
  console.log('info', `Platforms: ${c.cyan}${options.platforms.join(', ')}${c.reset}`);
  console.log('info', `Output: ${c.cyan}${options.output}${c.reset}`);
  console.log('info', `Debug: ${options.debug ? 'yes' : 'no'}`);
  console.log('info', `Dry run: ${options.dryRun ? 'yes' : 'no'}`);
  if (options.skipNotarize) {
    console.log('info', 'Notarization: skipped');
  }
  
  // Validate environment
  const validation = validateEnvironment(options.platforms);
  printValidationSummary(validation, options.platforms);
  
  if (!validation.valid) {
    process.exit(1);
  }
  
  if (options.dryRun) {
    console.log('success', 'Dry run complete. Environment is valid.');
    process.exit(0);
  }
  
  // Setup
  setupTempDir();
  
  // Register cleanup handler
  const cleanup = () => {
    console.log('info', 'Cleaning up...');
    cleanupTempDir();
  };
  
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(130); });
  process.on('SIGTERM', () => { cleanup(); process.exit(143); });
  
  const allArtifacts: string[] = [];
  setupBase64EnvVars();
  try {
    // Generate bundle-all.js with all bits
    logSection('Generating cortex-bundle-all.js');
    const bundleAllScript = path.resolve(__dirname, '..', 'bundle-generator', 'bundle-all.js');
    const bundleAllOutput = path.resolve(__dirname, 'www', 'cortex-bundle-all.js');
    
    if (fs.existsSync(bundleAllScript)) {
      exec(`node "${bundleAllScript}" --output "${bundleAllOutput}"`, {
        cwd: path.resolve(__dirname, '..', 'bundle-generator'),
      });
      console.log('success', 'Bundle-all generated at www/cortex-bundle-all.js');
    } else {
      console.log('warn', 'bundle-all.js not found, skipping bundle generation');
    }
    
    // Generate icons before building any platform
    logSection('Generating icons');
    exec('npm run tauri -- icon');
    console.log('success', 'Icons generated');
    
    // Build each platform
    for (const platform of options.platforms) {
      let artifacts: string[] = [];
      
      switch (platform) {
        case 'macos':
          artifacts = await prepareMacOS(options);
          break;
        case 'ios':
          artifacts = await buildIOS();
          break;
        case 'android':
          artifacts = await buildAndroid(options);
          break;
        case 'windows':
          artifacts = await buildWindows(options);
          break;
        case 'linux':
          artifacts = await buildLinux(options);
          break;
      }
      
      allArtifacts.push(...artifacts);
      
      // Upload to App Store if requested
      if (platform === 'ios' && options.uploadIos) {
        // Find the IPA to upload
        const ipaArtifacts = artifacts.filter(a => a.endsWith('.ipa'));
        if (ipaArtifacts.length === 0) {
          console.log('warn', 'No IPA files found to upload');
        } else {
          // Upload the first IPA (or could upload all)
          await uploadToAppStore(ipaArtifacts[0], 'ios');
        }
      }
      
      if (platform === 'macos' && options.uploadMacos) {
        // Find the PKG to upload (note: .dmg cannot be uploaded to App Store)
        const pkgArtifacts = artifacts.filter(a => a.endsWith('.pkg'));
        if (pkgArtifacts.length === 0) {
          console.log('warn', 'No .pkg files found to upload');
          console.log('info', 'Note: .dmg files cannot be uploaded to the Mac App Store.');
          console.log('info', 'You need to build a .pkg using --bundles pkg in the Tauri build command.');
        } else {
          await uploadToAppStore(pkgArtifacts[0], 'macos');
        }
      }
      
      if (platform === 'android' && options.uploadAndroid) {
        // Find AAB to upload (preferred), fallback to APK
        const aabArtifacts = artifacts.filter(a => a.endsWith('.aab'));
        const apkArtifacts = artifacts.filter(a => a.endsWith('.apk') && !a.includes('unsigned'));
        
        if (aabArtifacts.length > 0) {
          // Upload AAB (preferred format for Google Play)
          await uploadToGooglePlay(aabArtifacts[0]);
        } else if (apkArtifacts.length > 0) {
          // Fallback to signed APK
          console.log('info', 'No AAB found, uploading APK instead.');
          console.log('warn', 'Google Play prefers AAB format. Consider building with AAB.');
          await uploadToGooglePlay(apkArtifacts[0]);
        } else {
          console.log('warn', 'No signed AAB or APK files found to upload');
          console.log('info', 'Make sure you have configured ANDROID_KEYSTORE_* environment variables for signing.');
        }
      }
    }
    
    // Collect artifacts
    collectArtifacts(allArtifacts, options.output);
    
    // Summary
    printSummary(allArtifacts, options.output, options.platforms);
    
  } catch (error: any) {
    logBox('Build Failed', [
      (error.message || 'Unknown error'),
      '',
      'Check the logs above for details.',
    ], 'error');
    
    process.exit(1);
  }
}



/**
 * Main orchestrator for macOS build
 */
async function prepareMacOS(options: CLIOptions): Promise<string[]> {
  logHeader('Building macOS Application');
  
  // Setup
  const ctx = await setupMacOS(options);
  
  console.log('info', `Distribution paths enabled:`);
  console.log('info', `  Direct (DMG, notarized): ${ctx.hasDevIdCert ? 'Yes' : 'No (missing Developer ID cert)'}`);
  console.log('info', `  App Store (PKG): ${ctx.hasAppStoreCert && ctx.hasInstallerCert ? 'Yes' : 'No (missing certs)'}`);
  
  try {
    // Build
    let artifacts = await buildMacOSApp(ctx, options);
    
    // Sign
    artifacts = await signMacOS(ctx, artifacts, options);
    
    // Notarize
    await notarizeMacOS(ctx, artifacts, options);
    
    console.log('success', `Built ${artifacts.length} artifact(s)`);
    
    return artifacts;
  } finally {
    // Always cleanup
    cleanupMacOS(ctx);
  }
}


/**
 * Get the login keychain path if it exists
 */
function getLoginKeychainPath(): string | null {
  const loginKeychainPath = path.join(os.homedir(), 'Library', 'Keychains', 'login.keychain-db');
  if (fs.existsSync(loginKeychainPath)) {
    return loginKeychainPath;
  }
  // Fallback to older naming convention
  const loginKeychainPathOld = path.join(os.homedir(), 'Library', 'Keychains', 'login.keychain');
  if (fs.existsSync(loginKeychainPathOld)) {
    return loginKeychainPathOld;
  }
  return null;
}

/**
 * Setup macOS keychain and import certificates
 * Uses login keychain if available, otherwise creates a temporary one
 */
async function setupMacOS(options: CLIOptions): Promise<MacOSContext> {
  logSection('Setting up Keychain');
  
  let keychainPath: string;
  let keychainPassword: string;
  let isTemporaryKeychain = true;
  
  // Try to use login keychain if it exists
  const loginKeychainPath = getLoginKeychainPath();
  if (loginKeychainPath) {
    console.log('step', 'Using existing login keychain...');
    keychainPath = loginKeychainPath;
    keychainPassword = ''; // Login keychain should already be unlocked
    isTemporaryKeychain = false;
    
    // Ensure login keychain is unlocked (user may be prompted)
    exec(`security unlock-keychain "${keychainPath}"`, { ignoreError: true });
    
    // Make sure login keychain is in the search list
    const existingKeychains = execCapture('security list-keychains -d user').trim().split('\n').map(k => k.trim().replace(/"/g, ''));
    if (!existingKeychains.includes(keychainPath)) {
      exec(`security list-keychains -d user -s "${keychainPath}" ${existingKeychains.join(' ')}`);
    }
    
    console.log('success', `Using login keychain: ${keychainPath}`);
  } else {
    // Fall back to creating temporary keychain
    const keychainName = `habits-cortex-build-macos.keychain.db`;
    keychainPath = path.join(TEMP_DIR, keychainName);
    keychainPassword = crypto.randomBytes(16).toString('hex');
    
    console.log('step', 'Creating temporary keychain...');
    exec(`security create-keychain -p "${keychainPassword}" "${keychainPath}"`);
    exec(`security set-keychain-settings -lut 21600 "${keychainPath}"`);
    exec(`security unlock-keychain -p "${keychainPassword}" "${keychainPath}"`);
    
    const existingKeychains = execCapture('security list-keychains -d user').trim().split('\n').map(k => k.trim().replace(/"/g, ''));
    exec(`security list-keychains -d user -s "${keychainPath}" ${existingKeychains.join(' ')}`);
    
    console.log('success', `Created temporary keychain: ${keychainName}`);
  }
  
  // Import certificates
  logSection('Importing Certificates');
  
  const certPassword = process.env.IOS_MAC_APPLE_CERTIFICATE_PASSWORD;
  
  // Import Apple Distribution certificate (for App Store)
  if (hasBase64EnvVar('IOS_MAC_APPLE_CERTIFICATE_BASE64')) {
    console.log('step', 'Importing Apple Distribution certificate...');
    const certPath = decodeBase64ToFile('IOS_MAC_APPLE_CERTIFICATE_BASE64', 'apple-distribution.p12');
    exec(`security import "${certPath}" -k "${keychainPath}" -P "${certPassword}" -T /usr/bin/codesign -T /usr/bin/security`);
    console.log('success', 'Apple Distribution certificate imported');
  }
  
  // Import Developer ID certificate (for direct distribution)
  if (hasBase64EnvVar('MAC_DEVELOPER_ID_CERTIFICATE_BASE64')) {
    console.log('step', 'Importing Developer ID certificate...');
    const devIdCertPath = decodeBase64ToFile('MAC_DEVELOPER_ID_CERTIFICATE_BASE64', 'developer-id.p12');
    const devIdPassword = process.env.MAC_DEVELOPER_ID_CERTIFICATE_PASSWORD || certPassword;
    exec(`security import "${devIdCertPath}" -k "${keychainPath}" -P "${devIdPassword}" -T /usr/bin/codesign -T /usr/bin/security`);
    console.log('success', 'Developer ID certificate imported');
  }
  
  // Import installer certificate (for Mac App Store .pkg signing)
  if (hasBase64EnvVar('APPLE_INSTALLER_CERTIFICATE_BASE64')) {
    console.log('step', 'Importing installer certificate...');
    const installerCertPath = decodeBase64ToFile('APPLE_INSTALLER_CERTIFICATE_BASE64', 'installer.p12');
    const installerCertPassword = process.env.APPLE_INSTALLER_CERTIFICATE_PASSWORD || certPassword;
    exec(`security import "${installerCertPath}" -k "${keychainPath}" -P "${installerCertPassword}" -T /usr/bin/productbuild -T /usr/bin/security`);
    console.log('success', 'Installer certificate imported');
  }
  
  exec(`security set-key-partition-list -S apple-tool:,apple:,codesign:,productbuild: -s -k "${keychainPassword}" "${keychainPath}"`, { silent: true, ignoreError: true });
  
  const identities = execCapture(`security find-identity -v "${keychainPath}"`);
  console.log('info', 'Available signing identities:\n' + identities);
  
  const hasDevIdCert = !!process.env.MAC_DEVELOPER_ID_IDENTITY || hasBase64EnvVar('MAC_DEVELOPER_ID_CERTIFICATE_BASE64');
  const hasAppStoreCert = !!process.env.APPLE_SIGNING_IDENTITY;
  const hasInstallerCert = !!process.env.APPLE_INSTALLER_IDENTITY || hasBase64EnvVar('APPLE_INSTALLER_CERTIFICATE_BASE64');
  


  // If there is no certs/Habits_Mac.provisionprofile and there is MAC_PROVISIONING_PROFILE_BASE64 in env
  const profileTargetPath = path.join('certs', 'Habits_Mac.provisionprofile');
  if (!fs.existsSync(profileTargetPath) &&hasBase64EnvVar('MAC_PROVISIONING_PROFILE_BASE64')) {
  const profileDir = path.dirname(profileTargetPath);
  
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }
  
  // Decode directly to the expected location (not temp dir)
  const base64Data = process.env.MAC_PROVISIONING_PROFILE_BASE64!;
  fs.writeFileSync(profileTargetPath, Buffer.from(base64Data, 'base64'));
  console.log('success', `Provisioning profile written to ${profileTargetPath}`);
}

  return {
    keychainPath,
    keychainPassword,
    isTemporaryKeychain,
    signingIdentity: process.env.APPLE_SIGNING_IDENTITY || '',
    developerIdIdentity: process.env.MAC_DEVELOPER_ID_IDENTITY,
    appStoreIdentity: process.env.APPLE_SIGNING_IDENTITY,
    installerIdentity: process.env.APPLE_INSTALLER_IDENTITY,
    hasDevIdCert,
    hasAppStoreCert,
    hasInstallerCert,
    targetDir: path.join(TAURI_DIR, 'target', 'universal-apple-darwin', options.debug ? 'debug' : 'release', 'bundle'),
    buildArgs: options.debug ? '--debug' : '',
    target: 'universal-apple-darwin',
  };
}

/**
 * Build macOS application with Tauri
 */
async function buildMacOSApp(ctx: MacOSContext, options: CLIOptions): Promise<string[]> {
  logSection('Building Application');
  
  const artifacts: string[] = [];
  const dmgDir = path.join(ctx.targetDir, 'dmg');
  const appDir = path.join(ctx.targetDir, 'macos');
  
  // Determine which certificate to use for the build
  // Use Apple Distribution for App Store uploads, Developer ID for direct distribution
  const signingIdentity = options.uploadMacos 
    ? ctx.appStoreIdentity 
    : (ctx.developerIdIdentity || ctx.appStoreIdentity);
  
  const buildEnv: Record<string, string | undefined> = {
    APPLE_SIGNING_IDENTITY: signingIdentity,
  };
  
  // Disable notarization at build time (we handle it separately)
  if (options.skipNotarize || !ctx.hasDevIdCert) {
    buildEnv.APPLE_ID = undefined;
    buildEnv.APPLE_PASSWORD = undefined;
    buildEnv.APPLE_API_KEY = undefined;
    buildEnv.APPLE_API_ISSUER = undefined;
    buildEnv.APPLE_API_KEY_PATH = undefined;
  } else {
    // Setup notarization credentials for Tauri
    if (process.env.APPLE_API_KEY && process.env.APPLE_API_ISSUER && hasBase64EnvVar('APPLE_API_KEY_BASE64')) {
      const apiKeyPath = decodeBase64ToFile('APPLE_API_KEY_BASE64', 'AuthKey_notarize.p8');
      buildEnv.APPLE_API_KEY = process.env.APPLE_API_KEY;
      buildEnv.APPLE_API_ISSUER = process.env.APPLE_API_ISSUER;
      buildEnv.APPLE_API_KEY_PATH = apiKeyPath;
    }
  }
  
  console.log('step', `Building with: ${signingIdentity?.substring(0, 50) || 'default identity'}...`);
  exec(`npm run tauri -- build ${ctx.buildArgs} --target ${ctx.target} --bundles app,dmg`, { env: buildEnv });
  
  // Collect DMG artifacts
  if (fs.existsSync(dmgDir)) {
    const dmgs = fs.readdirSync(dmgDir).filter(f => f.endsWith('.dmg'));
    for (const dmg of dmgs) {
      artifacts.push(path.join(dmgDir, dmg));
      console.log('success', `Built DMG: ${dmg}`);
    }
  }
  
  return artifacts;
}

/**
 * Sign macOS artifacts and create PKG for App Store
 */
async function signMacOS(ctx: MacOSContext, artifacts: string[], options: CLIOptions): Promise<string[]> {
  logSection('Verifying Signatures');
  
  for (const artifact of artifacts) {
    console.log('step', `Verifying: ${path.basename(artifact)}`);
    const result = exec(`codesign -vvv --deep --strict "${artifact}"`, { ignoreError: true });
    if (result.success) {
      console.log('success', 'Signature verified');
    } else {
      console.log('warn', 'Signature verification had warnings');
    }
  }
  
  // Create .pkg for Mac App Store if uploading
  if (options.uploadMacos) {
    const appDir = path.join(ctx.targetDir, 'macos');
    
    if (fs.existsSync(appDir)) {
      logSection('Creating Mac App Store Package');
      
      const apps = fs.readdirSync(appDir).filter(f => f.endsWith('.app'));
      if (apps.length > 0) {
        const appPath = path.join(appDir, apps[0]);
        const appName = apps[0].replace('.app', '');
        const version = require(path.join(TAURI_DIR, 'tauri.conf.json')).version;
        const pkgName = `${appName}_${version}_universal.pkg`;
        const pkgPath = path.join(appDir, pkgName);
        
        // Re-sign with Apple Distribution and entitlements for App Store
        // This is required to embed the application-identifier in the signature
        const entitlementsPath = path.join(TAURI_DIR, 'Entitlements.plist');
        if (ctx.appStoreIdentity) {
          console.log('step', `Re-signing app for App Store with entitlements...`);
          exec(`codesign --force --deep --options runtime --sign "${ctx.appStoreIdentity}" --entitlements "${entitlementsPath}" "${appPath}"`);
          console.log('success', 'App re-signed for App Store with entitlements');
        }
        
        console.log('step', `Creating .pkg from ${apps[0]}...`);
        
        // Use APPLE_INSTALLER_IDENTITY from env - stateless, no keychain searching
        const installerIdentity = ctx.installerIdentity;
        
        if (!installerIdentity) {
          console.log('error', 'APPLE_INSTALLER_IDENTITY not set');
          console.log('error', 'Required for App Store uploads. Set to:');
          console.log('error', '  "3rd Party Mac Developer Installer: Your Company (TEAMID)"');
          console.log('error', 'Also set APPLE_INSTALLER_CERTIFICATE_BASE64 with the .p12 file');
          throw new Error('Missing APPLE_INSTALLER_IDENTITY for App Store upload');
        }
        
        console.log('info', `Signing pkg with: ${installerIdentity.substring(0, 50)}...`);
        exec(`productbuild --component "${appPath}" /Applications --sign "${installerIdentity}" "${pkgPath}"`);
        console.log('success', `Created: ${pkgName}`);
        
        if (fs.existsSync(pkgPath)) {
          artifacts.push(pkgPath);
        }
      }
    }
  }
  
  return artifacts;
}

/**
 * Notarize macOS artifacts
 */
async function notarizeMacOS(ctx: MacOSContext, artifacts: string[], options: CLIOptions): Promise<void> {
  if (options.skipNotarize) {
    console.log('info', 'Notarization skipped by user');
    return;
  }
  
  // Check if manual notarization requested
  if (process.env.MANUAL_NOTARIZE === 'true' && process.env.APPLE_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD) {
    logSection('Manual Notarization');
    
    for (const artifact of artifacts) {
      if (!artifact.endsWith('.dmg') && !artifact.endsWith('.app')) continue;
      
      console.log('step', `Submitting for notarization: ${path.basename(artifact)}`);
      
      const notarizeCmd = `xcrun notarytool submit "${artifact}" ` +
        `--apple-id "${process.env.APPLE_ID}" ` +
        `--team-id "${process.env.APPLE_TEAM_ID}" ` +
        `--password "${process.env.APPLE_APP_SPECIFIC_PASSWORD}" ` +
        `--wait`;
      
      try {
        exec(notarizeCmd);
        console.log('success', 'Notarization successful');
        
        if (artifact.endsWith('.dmg') || artifact.endsWith('.app')) {
          console.log('step', 'Stapling ticket...');
          exec(`xcrun stapler staple "${artifact}"`);
          console.log('success', 'Ticket stapled');
        }
      } catch (error) {
        console.log('error', `Notarization failed for ${path.basename(artifact)}`);
        throw error;
      }
    }
  }
}

/**
 * Cleanup macOS keychain (only deletes temporary keychains, not login keychain)
 */
function cleanupMacOS(ctx: MacOSContext): void {
  if (ctx.isTemporaryKeychain) {
    console.log('step', 'Removing temporary keychain...');
    exec(`security delete-keychain "${ctx.keychainPath}"`, { ignoreError: true });
  } else {
    console.log('info', 'Using login keychain - skipping cleanup');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// iOS BUILD & SIGN (Automatic Signing)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Setup iOS keychain with Apple Distribution certificate.
 * Uses login keychain if available, otherwise creates a temporary one.
 * Needed for code signing even with automatic signing (API key handles profile management).
 */
async function setupIOSKeychain(): Promise<{ keychainPath: string; keychainPassword: string; isTemporaryKeychain: boolean }> {
  logSection('Setting up iOS Keychain');
  
  let keychainPath: string;
  let keychainPassword: string;
  let isTemporaryKeychain = true;
  
  // Try to use login keychain if it exists
  const loginKeychainPath = getLoginKeychainPath();
  if (loginKeychainPath) {
    console.log('step', 'Using existing login keychain...');
    keychainPath = loginKeychainPath;
    keychainPassword = ''; // Login keychain should already be unlocked
    isTemporaryKeychain = false;
    
    // Ensure login keychain is unlocked (user may be prompted)
    exec(`security unlock-keychain "${keychainPath}"`, { ignoreError: true });
    
    // Make sure login keychain is in the search list and is the default
    const existingKeychains = execCapture('security list-keychains -d user').trim().split('\n').map(k => k.trim().replace(/"/g, ''));
    if (!existingKeychains.includes(keychainPath)) {
      exec(`security list-keychains -d user -s "${keychainPath}" ${existingKeychains.join(' ')}`);
    }
    
    // Set as default keychain for this session
    exec(`security default-keychain -s "${keychainPath}"`);
    
    console.log('success', `Using login keychain: ${keychainPath}`);
  } else {
    // Fall back to creating temporary keychain
    const keychainName = `habits-cortex-build-ios.keychain.db`;
    keychainPath = path.join(TEMP_DIR, keychainName);
    keychainPassword = crypto.randomBytes(16).toString('hex');
    
    console.log('step', 'Creating temporary keychain...');
    exec(`security create-keychain -p "${keychainPassword}" "${keychainPath}"`);
    exec(`security set-keychain-settings -lut 21600 "${keychainPath}"`);
    exec(`security unlock-keychain -p "${keychainPassword}" "${keychainPath}"`);
    
    // Add to keychain search list (FIRST so it's preferred)
    const existingKeychains = execCapture('security list-keychains -d user').trim().split('\n').map(k => k.trim().replace(/"/g, ''));
    exec(`security list-keychains -d user -s "${keychainPath}" ${existingKeychains.join(' ')}`);
    
    // Set as default keychain for this session
    exec(`security default-keychain -s "${keychainPath}"`);
    
    console.log('success', `Created temporary keychain: ${keychainName}`);
  }
  
  // Import Apple Distribution certificate
  if (hasBase64EnvVar('IOS_MAC_APPLE_CERTIFICATE_BASE64')) {
    console.log('step', 'Importing Apple Distribution certificate...');
    const certPath = decodeBase64ToFile('IOS_MAC_APPLE_CERTIFICATE_BASE64', 'apple-distribution.p12');
    const certPassword = process.env.IOS_MAC_APPLE_CERTIFICATE_PASSWORD || '';
    exec(`security import "${certPath}" -k "${keychainPath}" -P "${certPassword}" -T /usr/bin/codesign -T /usr/bin/security -T /usr/bin/productbuild`);
    
    // Allow codesign to access the key without prompting (only works for temporary keychains with known password)
    if (isTemporaryKeychain && keychainPassword) {
      exec(`security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "${keychainPassword}" "${keychainPath}"`, { silent: true, ignoreError: true });
    }
    
    console.log('success', 'Apple Distribution certificate imported');
    
    // Show available identities
    const identities = execCapture(`security find-identity -v -p codesigning "${keychainPath}"`);
    console.log('info', 'Available signing identities:\n' + identities);
  } else {
    console.log('warn', 'No IOS_MAC_APPLE_CERTIFICATE_BASE64 found - relying on cloud-managed signing');
  }
  
  return { keychainPath, keychainPassword, isTemporaryKeychain };
}

/**
 * Patch iOS project.yml to fix common App Store validation issues.
 * This function should be called after `tauri ios init` and before building.
 * 
 * Fixes:
 * - ITMS-90171: Prevents libapp.a from being added to Resources
 * - ITMS-90683: Adds required privacy usage descriptions
 */
function patchIOSProject(): void {
  const projectYmlPath = path.join(TAURI_DIR, 'gen', 'apple', 'project.yml');
  
  if (!fs.existsSync(projectYmlPath)) {
    console.log('warn', 'project.yml not found - skipping iOS project patching');
    return;
  }
  
  logSection('Patching iOS project.yml');
  
  let content = fs.readFileSync(projectYmlPath, 'utf8');
  let patched = false;
  
  // Fix ITMS-90171: Prevent libapp.a from being added to Resources
  // Add buildPhase: none to Externals source entry
  if (!content.includes('buildPhase: none')) {
    const externalsPattern = /(\s+- path: Externals\n)(\s+- path:)/;
    if (externalsPattern.test(content)) {
      content = content.replace(
        externalsPattern,
        '$1        buildPhase: none\n$2'
      );
      console.log('success', 'Added buildPhase: none to Externals (ITMS-90171 fix)');
      patched = true;
    }
  }
  
  // Fix ITMS-90683: Add required privacy usage descriptions
  if (!content.includes('NSLocationWhenInUseUsageDescription')) {
    const requirementsPattern = /(UIRequiredDeviceCapabilities: \[arm64, metal\])/;
    if (requirementsPattern.test(content)) {
      content = content.replace(
        requirementsPattern,
        '$1\n        NSLocationWhenInUseUsageDescription: "This app uses your location to provide location-based automation and services."'
      );
      console.log('success', 'Added NSLocationWhenInUseUsageDescription (ITMS-90683 fix)');
      patched = true;
    }
  }
  
  if (patched) {
    fs.writeFileSync(projectYmlPath, content);
    console.log('success', 'project.yml patched successfully');
    
    // Regenerate Xcode project if xcodegen is available
    try {
      exec('which xcodegen', { silent: true });
      console.log('step', 'Regenerating Xcode project with xcodegen...');
      exec(`cd "${path.join(TAURI_DIR, 'gen', 'apple')}" && xcodegen generate --spec project.yml`);
      console.log('success', 'Xcode project regenerated');
    } catch {
      console.log('warn', 'xcodegen not found - Xcode project not regenerated');
      console.log('info', 'Install with: brew install xcodegen');
    }
  } else {
    console.log('info', 'project.yml already patched');
  }
}

/**
 * Build iOS with automatic signing using App Store Connect API.
 * Xcode handles certificate/profile selection automatically.
 * 
 * Required environment variables:
 * - APP_STORE_CONNECT_API_KEY_ID
 * - APP_STORE_CONNECT_API_ISSUER_ID
 * - APP_STORE_CONNECT_API_KEY_BASE64
 * - IOS_MAC_APPLE_CERTIFICATE_BASE64 (Apple Distribution certificate for signing)
 * - IOS_MAC_APPLE_CERTIFICATE_PASSWORD
 */
async function buildIOS(): Promise<string[]> {
  logHeader('Building iOS Application');
  
  const artifacts: string[] = [];
  
  // Check for required API key credentials
  const hasApiKey = process.env.APP_STORE_CONNECT_API_KEY_ID && 
                    process.env.APP_STORE_CONNECT_API_ISSUER_ID && 
                    hasBase64EnvVar('APP_STORE_CONNECT_API_KEY_BASE64');
  
  if (!hasApiKey) {
    throw new Error('iOS build requires APP_STORE_CONNECT_API_KEY_ID, APP_STORE_CONNECT_API_ISSUER_ID, and APP_STORE_CONNECT_API_KEY_BASE64');
  }
  
  // Setup keychain with Apple Distribution certificate
  await setupIOSKeychain();
  
  // Decode API key to file
  logSection('Setting up App Store Connect API Key');
  const apiKeyPath = decodeBase64ToFile('APP_STORE_CONNECT_API_KEY_BASE64', 'AuthKey.p8');
  
  console.log('success', `API Key ID: ${process.env.APP_STORE_CONNECT_API_KEY_ID}`);
  console.log('success', `API Issuer ID: ${process.env.APP_STORE_CONNECT_API_ISSUER_ID}`);
  
  // Set environment variables for Tauri's automatic signing
  const buildEnv: Record<string, string> = {
    APPLE_API_ISSUER: process.env.APP_STORE_CONNECT_API_ISSUER_ID!,
    APPLE_API_KEY: process.env.APP_STORE_CONNECT_API_KEY_ID!,
    APPLE_API_KEY_PATH: apiKeyPath,
  };
  
  logSection('Building iOS Application');
  
  const tauriConfig = JSON.parse(fs.readFileSync(path.join(TAURI_DIR, 'tauri.conf.json'), 'utf8'));
  console.log('info', `Bundle ID: ${tauriConfig.identifier}`);
  console.log('info', `Version: ${tauriConfig.version}`);
  console.log('info', 'Signing: automatic (App Store Connect API)');
  
  // Patch project.yml to fix common App Store validation issues
  patchIOSProject();
  
  console.log('step', 'Building iOS app...');
  exec(`npm run tauri -- ios build --target aarch64 --export-method app-store-connect`, { env: buildEnv });
  
  console.log('success', 'iOS build completed');
  
  // Find the built IPA
  const ipaDir = path.join(TAURI_DIR, 'gen', 'apple', 'build', 'arm64');
  if (fs.existsSync(ipaDir)) {
    const ipas = fs.readdirSync(ipaDir).filter(f => f.endsWith('.ipa'));
    for (const ipa of ipas) {
      const ipaPath = path.join(ipaDir, ipa);
      artifacts.push(ipaPath);
      console.log('success', `Found IPA: ${ipa}`);
    }
  }
  
  // Also check the archive for .app
  const archiveDir = path.join(TAURI_DIR, 'gen', 'apple', 'build');
  const xcarchive = path.join(archiveDir, 'habits-cortex_iOS.xcarchive');
  const appPath = path.join(xcarchive, 'Products', 'Applications', 'Cortex.app');
  if (fs.existsSync(appPath)) {
    artifacts.push(appPath);
    console.log('success', 'Found Cortex.app in archive');
  }
  
  console.log('success', `Built ${artifacts.length} iOS artifact(s)`);
  
  return artifacts;
}


// ═══════════════════════════════════════════════════════════════════════════════
// APP STORE UPLOAD (iOS & macOS)
// ═══════════════════════════════════════════════════════════════════════════════

async function uploadToAppStore(ipaOrPkgPath: string, platform: 'ios' | 'macos'): Promise<void> {
  logHeader(`Uploading ${platform.toUpperCase()} to App Store Connect`);
  
  // Check if App Store Connect credentials are configured
  const hasApiKey = process.env.APP_STORE_CONNECT_API_KEY_ID && 
                    process.env.APP_STORE_CONNECT_API_ISSUER_ID && 
                    hasBase64EnvVar('APP_STORE_CONNECT_API_KEY_BASE64');
  
  if (!hasApiKey) {
    console.log('error', 'App Store Connect credentials not configured');
    console.log('info', 'Required environment variables:');
    console.log('info', '  - APP_STORE_CONNECT_API_KEY_ID');
    console.log('info', '  - APP_STORE_CONNECT_API_ISSUER_ID');
    console.log('info', '  - APP_STORE_CONNECT_API_KEY_BASE64');
    console.log('info', '');
    console.log('info', 'Get these from: https://appstoreconnect.apple.com/access/api');
    throw new Error('App Store Connect credentials not configured');
  }
  
  // Decode API key
  logSection('Setting up App Store Connect API Key');
  
  const apiKeyId = process.env.APP_STORE_CONNECT_API_KEY_ID!;
  const issuerId = process.env.APP_STORE_CONNECT_API_ISSUER_ID!;
  
  // altool expects the key file in ~/private_keys/AuthKey_<KEY_ID>.p8
  const privateKeysDir = path.join(os.homedir(), 'private_keys');
  if (!fs.existsSync(privateKeysDir)) {
    fs.mkdirSync(privateKeysDir, { recursive: true });
  }
  
  const apiKeyFileName = `AuthKey_${apiKeyId}.p8`;
  const apiKeyPath = path.join(privateKeysDir, apiKeyFileName);
  
  // Decode the base64 key to the expected location
  const keyBase64 = process.env.APP_STORE_CONNECT_API_KEY_BASE64!;
  const keyBuffer = Buffer.from(keyBase64, 'base64');
  fs.writeFileSync(apiKeyPath, keyBuffer);
  
  console.log('success', `API Key ID: ${apiKeyId}`);
  console.log('success', `Issuer ID: ${issuerId}`);
  console.log('debug', `API Key Path: ${apiKeyPath}`);
  
  // Check if xcrun is available (macOS only)
  if (!commandExists('xcrun')) {
    console.log('error', 'xcrun not found. App Store uploads require Xcode Command Line Tools on macOS.');
    throw new Error('xcrun not available');
  }
  
  // Validate the artifact exists
  if (!fs.existsSync(ipaOrPkgPath)) {
    console.log('error', `Artifact not found: ${ipaOrPkgPath}`);
    throw new Error('Artifact not found');
  }
  
  const fileName = path.basename(ipaOrPkgPath);
  const fileExt = path.extname(ipaOrPkgPath);
  
  // Validate file type
  if (platform === 'ios' && fileExt !== '.ipa') {
    console.log('error', `Expected .ipa file for iOS, got: ${fileExt}`);
    throw new Error('Invalid file type for iOS upload');
  }
  
  if (platform === 'macos' && fileExt !== '.pkg') {
    console.log('error', `Expected .pkg file for macOS App Store, got: ${fileExt}`);
    console.log('info', 'Note: .dmg files are for direct distribution, not App Store.');
    console.log('info', 'You need to build a .pkg specifically for the Mac App Store.');
    throw new Error('Invalid file type for macOS App Store upload');
  }
  
  // Upload using altool (works with API key authentication)
  logSection(`Uploading ${fileName}`);
  
  console.log('step', 'Validating with App Store Connect...');
  console.log('info', 'This may take several minutes.');
  
  // First validate the package
  const validateCmd = `xcrun altool --validate-app \
    --type ${platform} \
    --file "${ipaOrPkgPath}" \
    --apiKey "${apiKeyId}" \
    --apiIssuer "${issuerId}"`;
  
  try {
    exec(validateCmd, { silent: false });
    console.log('success', 'Validation passed');
  } catch (error: any) {
    console.log('error', 'Validation failed');
    console.log('info', 'Common issues:');
    console.log('info', '  - Bundle ID not registered in App Store Connect');
    console.log('info', '  - Missing required capabilities or entitlements');
    console.log('info', '  - Version/build number already exists');
    console.log('info', '  - Certificate/provisioning profile issues');
    throw error;
  }
  
  // Upload the package
  console.log('step', 'Uploading to App Store Connect...');
  console.log('info', 'This may take 10-30 minutes depending on file size and network speed.');
  
  const uploadCmd = `xcrun altool --upload-app \
    --type ${platform} \
    --file "${ipaOrPkgPath}" \
    --apiKey "${apiKeyId}" \
    --apiIssuer "${issuerId}"`;
  
  try {
    exec(uploadCmd, { silent: false });
    
    logBox('Upload Successful', [
      `${platform.toUpperCase()} app uploaded to App Store Connect`,
      '',
      'Next steps:',
      '  1. Go to https://appstoreconnect.apple.com',
      '  2. Wait for processing to complete (10-60 minutes)',
      '  3. Submit for review or TestFlight',
      '',
      `File: ${fileName}`,
    ], 'success');
  } catch (error: any) {
    console.log('error', 'Upload failed');
    console.log('info', 'Check the error message above for details.');
    console.log('info', 'You may need to:');
    console.log('info', '  - Verify your API key has correct permissions');
    console.log('info', '  - Ensure the app version/build is not already uploaded');
    console.log('info', '  - Check your internet connection');
    throw error;
  } finally {
    // Clean up the API key file
    if (fs.existsSync(apiKeyPath)) {
      fs.unlinkSync(apiKeyPath);
      console.log('debug', `Removed API key file: ${apiKeyPath}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE PLAY UPLOAD (Android)
// ═══════════════════════════════════════════════════════════════════════════════

async function uploadToGooglePlay(aabPath: string): Promise<void> {
  logHeader('Uploading Android to Google Play Console');
  
  // Check if Google Play credentials are configured
  const hasCredentials = hasBase64EnvVar('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64') &&
                         process.env.GOOGLE_PLAY_PACKAGE_NAME;
  
  if (!hasCredentials) {
    console.log('error', 'Google Play credentials not configured');
    console.log('info', 'Required environment variables:');
    console.log('info', '  - GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64');
    console.log('info', '  - GOOGLE_PLAY_PACKAGE_NAME');
    console.log('info', '  - GOOGLE_PLAY_TRACK (optional, defaults to "internal")');
    console.log('info', '');
    console.log('info', 'Get these from: https://play.google.com/console');
    console.log('info', 'See build-release.md for setup instructions.');
    throw new Error('Google Play credentials not configured');
  }
  
  // Decode service account JSON
  logSection('Setting up Google Play Credentials');
  
  const serviceAccountPath = decodeBase64ToFile('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64', 'service-account.json');
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME!;
  const track = process.env.GOOGLE_PLAY_TRACK || 'internal';
  
  console.log('success', `Package: ${packageName}`);
  console.log('success', `Track: ${track}`);
  
  // Validate the artifact exists
  if (!fs.existsSync(aabPath)) {
    console.log('error', `Artifact not found: ${aabPath}`);
    throw new Error('Artifact not found');
  }
  
  const fileName = path.basename(aabPath);
  const fileExt = path.extname(aabPath);
  
  // Google Play strongly prefers AAB over APK
  if (fileExt !== '.aab') {
    console.log('warn', `Expected .aab file, got: ${fileExt}`);
    console.log('info', 'Google Play prefers Android App Bundles (.aab) over APKs.');
    console.log('info', 'APK uploads may still work but AAB is recommended.');
  }
  
  // Check for required tools
  // We'll use a simple HTTP approach with the Google Play Developer API v3
  // This requires Node.js built-in https module or fetch
  
  logSection(`Uploading ${fileName}`);
  
  console.log('step', 'Authenticating with Google Play...');
  
  // Read service account credentials
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  // Create JWT for authentication
  const jwt = await createGoogleJWT(serviceAccount);
  
  // Exchange JWT for access token
  const accessToken = await getGoogleAccessToken(jwt);
  
  console.log('success', 'Authentication successful');
  
  // Upload the AAB/APK
  console.log('step', 'Creating new edit...');
  const editId = await createPlayEdit(accessToken, packageName);
  console.log('success', `Edit created: ${editId}`);
  
  console.log('step', `Uploading ${fileName}...`);
  console.log('info', 'This may take several minutes depending on file size.');
  
  const versionCode = await uploadBundle(accessToken, packageName, editId, aabPath, fileExt === '.aab' ? 'bundle' : 'apk');
  console.log('success', `Upload complete. Version code: ${versionCode}`);
  
  console.log('step', `Assigning to ${track} track...`);
  await assignToTrack(accessToken, packageName, editId, track, versionCode);
  console.log('success', `Assigned to ${track} track`);
  
  console.log('step', 'Committing edit...');
  await commitEdit(accessToken, packageName, editId);
  
  logBox('Upload Successful', [
    'Android app uploaded to Google Play Console',
    '',
    'Next steps:',
    '  1. Go to https://play.google.com/console',
    '  2. Navigate to your app → Release → Testing',
    `  3. Review the ${track} release`,
    '  4. Roll out or promote to next track',
    '',
    `File: ${fileName}`,
    `Track: ${track}`,
    `Version code: ${versionCode}`,
  ], 'success');
}

// Helper functions for Google Play API
async function createGoogleJWT(serviceAccount: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${base64Header}.${base64Payload}`;
  
  // Sign with the private key
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(serviceAccount.private_key, 'base64url');
  
  return `${signatureInput}.${signature}`;
}

async function getGoogleAccessToken(jwt: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }
  
  const data = await response.json() as { access_token: string };
  return data.access_token;
}

async function createPlayEdit(accessToken: string, packageName: string): Promise<string> {
  const response = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create edit: ${error}`);
  }
  
  const data = await response.json() as { id: string };
  return data.id;
}

async function uploadBundle(
  accessToken: string, 
  packageName: string, 
  editId: string, 
  filePath: string,
  type: 'bundle' | 'apk'
): Promise<number> {
  const endpoint = type === 'bundle' ? 'bundles' : 'apks';
  const url = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${packageName}/edits/${editId}/${endpoint}?uploadType=media`;
  
  // Use curl for more reliable large file uploads
  const curlCmd = `curl -s -X POST "${url}" -H "Authorization: Bearer ${accessToken}" -H "Content-Type: application/octet-stream" --data-binary "@${filePath}" --max-time 600`;
  
  // Use execCapture to properly capture stdout
  const stdout = execCapture(curlCmd, { silent: true });
  
  try {
    const data = JSON.parse(stdout) as { versionCode?: number; error?: { message: string; code: number } };
    if (data.error) {
      console.error(`\n[UPLOAD ERROR] API error: ${JSON.stringify(data.error, null, 2)}`);
      throw new Error(`Failed to upload ${type}: ${data.error.message}`);
    }
    if (!data.versionCode) {
      console.error(`\n[UPLOAD ERROR] Unexpected response: ${stdout}`);
      throw new Error(`Failed to upload ${type}: no versionCode in response`);
    }
    return data.versionCode;
  } catch (parseError) {
    if (parseError instanceof SyntaxError) {
      console.error(`\n[UPLOAD ERROR] Failed to parse response: ${stdout}`);
      throw new Error(`Failed to upload ${type}: invalid JSON response`);
    }
    throw parseError;
  }
}

async function assignToTrack(
  accessToken: string, 
  packageName: string, 
  editId: string, 
  track: string, 
  versionCode: number
): Promise<void> {
  const response = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits/${editId}/tracks/${track}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        track,
        releases: [{
          versionCodes: [versionCode.toString()],
          status: 'draft', // Use 'draft' for apps not yet published, 'completed' for published apps
        }],
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to assign to track: ${error}`);
  }
}

async function commitEdit(accessToken: string, packageName: string, editId: string): Promise<void> {
  const response = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits/${editId}:commit`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`\n[COMMIT ERROR] Status: ${response.status}\n${error}\n`);
    throw new Error(`Failed to commit edit: ${error}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANDROID BUILD & SIGN
// ═══════════════════════════════════════════════════════════════════════════════

async function buildAndroid(options: CLIOptions): Promise<string[]> {
  logHeader('Building Android Application');
  const artifacts: string[] = [];
  
  // Check if signing credentials are available
  const hasSigningCreds = hasBase64EnvVar('ANDROID_KEYSTORE_BASE64') && 
                          process.env.ANDROID_KEYSTORE_PASSWORD && 
                          process.env.ANDROID_KEY_ALIAS && 
                          process.env.ANDROID_KEY_PASSWORD;
  
  let keystorePath: string | null = null;
  
  if (hasSigningCreds) {
    // Step 1: Decode keystore
    logSection('Setting up Keystore');
    
    keystorePath = decodeBase64ToFile('ANDROID_KEYSTORE_BASE64', 'release.keystore');
    
    // Verify keystore
    console.log('step', 'Verifying keystore...');
    const keystoreCheck = exec(
      `keytool -list -keystore "${keystorePath}" -storepass "${process.env.ANDROID_KEYSTORE_PASSWORD}" -alias "${process.env.ANDROID_KEY_ALIAS}"`,
      { silent: true, ignoreError: true }
    );
    
    if (keystoreCheck.success) {
      console.log('success', 'Keystore verified');
    } else {
      console.log('warn', 'Keystore verification failed. Will build unsigned APK.');
      keystorePath = null;
    }
  } else {
    console.log('info', 'Signing credentials not configured. Building unsigned APK.');
    console.log('info', 'Set ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD to enable signing.');
  }
  
  // Step 2: Build with Tauri
  logSection('Building Android Application');
  
  const buildArgs = options.debug ? '--debug' : '';
  
  console.log('step', 'Building Android APK...');
  
  // Only pass signing env vars if we have valid credentials
  const buildEnv: Record<string, string | undefined> = {};
  if (keystorePath) {
    process.env.TAURI_SIGNING_STORE_PATH = keystorePath;
    process.env.TAURI_SIGNING_STORE_PASSWORD = process.env.ANDROID_KEYSTORE_PASSWORD;
    process.env.TAURI_SIGNING_KEY_ALIAS = process.env.ANDROID_KEY_ALIAS;
    process.env.TAURI_SIGNING_KEY_PASSWORD = process.env.ANDROID_KEY_PASSWORD;
  }
  
  // Build both APK and AAB (Android App Bundle for Google Play)
  console.log('step', 'Building APKs...');
  exec(`npm run tauri -- android build ${buildArgs} --apk --split-per-abi -t aarch64 -t armv7 -t x86_64`, {
    env: buildEnv,
  });
  
  console.log('step', 'Building AAB (Android App Bundle) for Google Play...');
  exec(`npm run tauri -- android build ${buildArgs} --aab -t aarch64 -t armv7 -t x86_64`, {
    env: buildEnv,
  });
  
  // Find ALL built APKs (including unsigned)
  const apkDir = path.join(TAURI_DIR, 'gen', 'android', 'app', 'build', 'outputs', 'apk');
  const aabDir = path.join(TAURI_DIR, 'gen', 'android', 'app', 'build', 'outputs', 'bundle');
  
  const findFiles = (dir: string, ext: string): string[] => {
    const found: string[] = [];
    if (!fs.existsSync(dir)) return found;
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        found.push(...findFiles(fullPath, ext));
      } else if (item.name.endsWith(ext)) {
        found.push(fullPath);
      }
    }
    return found;
  };
  
  const builtApks = findFiles(apkDir, '.apk');
  const builtAabs = findFiles(aabDir, '.aab');
  
  console.log('info', `Found ${builtApks.length} APK(s) and ${builtAabs.length} AAB(s)`);
  
  // Always add all APKs to artifacts first (keeps unsigned)
  for (const apk of builtApks) {
    artifacts.push(apk);
    console.log('info', `Added: ${path.basename(apk)}`);
  }
  
  // Add AABs to artifacts
  for (const aab of builtAabs) {
    artifacts.push(aab);
    console.log('info', `Added: ${path.basename(aab)}`);
  }
  
  // Step 3: Attempt to sign unsigned APKs if we have credentials
  if (keystorePath) {
    logSection('Signing APKs');
    
    for (const apk of builtApks) {
      const apkName = path.basename(apk);
      
      // Check if already signed
      const verifyResult = exec(`apksigner verify --verbose "${apk}"`, { silent: true, ignoreError: true });
      
      if (verifyResult.success && verifyResult.output.includes('Verified')) {
        console.log('success', `${apkName} is already signed`);
        continue;
      }
      
      // Sign unsigned APK (create a separate signed copy)
      if (apkName.includes('unsigned')) {
        const signedApk = apk.replace('unsigned', 'signed');
        
        console.log('step', `Signing: ${apkName}`);
        const signResult = exec(
          `apksigner sign ` +
          `--ks "${keystorePath}" ` +
          `--ks-pass env:ANDROID_KEYSTORE_PASSWORD ` +
          `--key-pass env:ANDROID_KEY_PASSWORD ` +
          `--ks-key-alias "${process.env.ANDROID_KEY_ALIAS}" ` +
          `--out "${signedApk}" ` +
          `"${apk}"`,
          {
            env: {
              ANDROID_KEYSTORE_PASSWORD: process.env.ANDROID_KEYSTORE_PASSWORD,
              ANDROID_KEY_PASSWORD: process.env.ANDROID_KEY_PASSWORD,
            },
            ignoreError: true,
          }
        );
        
        if (signResult.success && fs.existsSync(signedApk)) {
          artifacts.push(signedApk);
          console.log('success', `Signed: ${path.basename(signedApk)}`);
        } else {
          console.log('warn', `Failed to sign: ${apkName}`);
        }
      }
    }
    
    // Step 4: Verify signatures
    logSection('Verifying Signatures');
    
    for (const apk of artifacts) {
      if (path.basename(apk).includes('unsigned')) continue;
      if (!apk.endsWith('.apk')) continue;  // Only verify APKs
      
      console.log('step', `Verifying: ${path.basename(apk)}`);
      const result = exec(`apksigner verify --verbose --print-certs "${apk}"`, { silent: true, ignoreError: true });
      
      if (result.success) {
        console.log('success', 'Signature verified');
      } else {
        console.log('warn', 'Signature verification had issues');
      }
    }
    
    // Step 5: Sign AAB files with jarsigner
    // Note: AABs from Tauri are named without "unsigned" suffix but are actually unsigned
    logSection('Signing AABs for Google Play');
    
    for (const aab of builtAabs) {
      const aabName = path.basename(aab);
      
      // Check if already signed
      const verifyResult = exec(`jarsigner -verify "${aab}"`, { silent: true, ignoreError: true });
      const isUnsigned = !verifyResult.success || verifyResult.output?.includes('jar is unsigned');
      
      if (isUnsigned) {
        console.log('step', `Signing: ${aabName}`);
        
        // Sign in place (jarsigner modifies the file directly when -signedjar is not used)
        // Or we can create a new signed copy
        const signResult = exec(
          `jarsigner -sigalg SHA256withRSA -digestalg SHA-256 ` +
          `-keystore "${keystorePath}" ` +
          `-storepass "${process.env.ANDROID_KEYSTORE_PASSWORD}" ` +
          `-keypass "${process.env.ANDROID_KEY_PASSWORD}" ` +
          `"${aab}" "${process.env.ANDROID_KEY_ALIAS}"`,
          {
            ignoreError: true,
          }
        );
        
        if (signResult.success) {
          console.log('success', `Signed: ${aabName}`);
        } else {
          console.log('warn', `Failed to sign AAB: ${aabName}`);
        }
      } else {
        console.log('info', `${aabName} is already signed`);
      }
    }
  } else {
    console.log('info', 'Skipping signing step (no credentials)');
  }
  
  return artifacts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WINDOWS BUILD & SIGN
// ═══════════════════════════════════════════════════════════════════════════════

async function buildWindows(options: CLIOptions): Promise<string[]> {
  logHeader('Building Windows Application');
  const artifacts: string[] = [];
  
  // Check if we're on Windows
  const isWindows = process.platform === 'win32';
  
  if (!isWindows) {

    // npm run tauri build -- --runner cargo-xwin --target x86_64-pc-windows-msvc
    console.log('warn', 'Windows builds should be done on Windows for best results');
    console.log('info', 'Cross-compilation may work but signing with signtool will not be available');
    console.log('info', 'Use osslsigncode for cross-platform signing if needed');

      exec(`npm run tauri -- build  --runner cargo-xwin --target x86_64-pc-windows-msvc`);


  }
  
  // Check if signing credentials are available
  const hasSigningCreds = hasBase64EnvVar('WINDOWS_CERTIFICATE_BASE64') && 
                          process.env.WINDOWS_CERTIFICATE_PASSWORD;
  
  let certPath: string | null = null;
  let certPassword: string | null = null;
  const timestampUrl = process.env.WINDOWS_TIMESTAMP_URL || 'http://timestamp.digicert.com';
  
  if (hasSigningCreds) {
    // Step 1: Decode certificate
    logSection('Setting up Certificate');
    
    certPath = decodeBase64ToFile('WINDOWS_CERTIFICATE_BASE64', 'certificate.pfx');
    certPassword = process.env.WINDOWS_CERTIFICATE_PASSWORD!;
    
    console.log('success', 'Certificate decoded');
  } else {
    console.log('info', 'Signing credentials not configured. Building unsigned executables.');
    console.log('info', 'Set WINDOWS_CERTIFICATE_BASE64 and WINDOWS_CERTIFICATE_PASSWORD to enable signing.');
  }
  
  // Step 2: Build with Tauri
  logSection('Building Windows Application');
  
  const buildArgs = options.debug ? '--debug' : '';
  const windowsTarget = 'x86_64-pc-windows-msvc';
  
  console.log('step', `Building Windows app for ${windowsTarget}...`);
  
  // Only pass signing env vars if we have credentials
  const buildEnv: Record<string, string | undefined> = {};
  if (certPath && certPassword) {
    process.env.TAURI_SIGNING_PRIVATE_KEY_PATH = certPath;
    process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = certPassword;
  }
  
  exec(`npm run tauri -- build ${buildArgs} --target ${windowsTarget}`, {
    env: buildEnv,
  });
  
  // Find built artifacts (these are the unsigned artifacts)
  // Cross-compilation outputs to target/<target>/<debug|release>/bundle
  const targetDir = path.join(TAURI_DIR, 'target', windowsTarget, options.debug ? 'debug' : 'release', 'bundle');
  const msiDir = path.join(targetDir, 'msi');
  const nsiDir = path.join(targetDir, 'nsis');
  
  const collectArtifacts = (dir: string, ext: string): string[] => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith(ext))
      .map(f => path.join(dir, f));
  };
  
  const unsignedArtifacts = [
    ...collectArtifacts(msiDir, '.msi'),
    ...collectArtifacts(nsiDir, '.exe'),
  ];
  
  // Always keep unsigned artifacts
  for (const artifact of unsignedArtifacts) {
    // Copy to .unsigned version to preserve
    const ext = path.extname(artifact);
    const base = path.basename(artifact, ext);
    const dir = path.dirname(artifact);
    const unsignedCopy = path.join(dir, `${base}-unsigned${ext}`);
    
    fs.copyFileSync(artifact, unsignedCopy);
    artifacts.push(unsignedCopy);
    console.log('info', `Preserved unsigned: ${path.basename(unsignedCopy)}`);
  }
  
  // Step 3: Sign with signtool (Windows only, if credentials available)
  if (certPath && certPassword && isWindows && commandExists('signtool')) {
    logSection('Signing with SignTool');
    
    for (const artifact of unsignedArtifacts) {
      console.log('step', `Signing: ${path.basename(artifact)}`);
      
      const signResult = exec(
        `signtool sign /f "${certPath}" /p "${certPassword}" /tr "${timestampUrl}" /td sha256 /fd sha256 "${artifact}"`,
        { silent: true, ignoreError: true }
      );
      
      if (signResult.success) {
        // Verify
        const verify = exec(`signtool verify /pa "${artifact}"`, { silent: true, ignoreError: true });
        if (verify.success) {
          console.log('success', 'Signature verified');
          artifacts.push(artifact); // Add signed version
        } else {
          console.log('warn', 'Signature verification had warnings');
          artifacts.push(artifact); // Still add it
        }
      } else {
        console.log('warn', `Failed to sign: ${path.basename(artifact)}`);
      }
    }
  } else if (!hasSigningCreds) {
    console.log('info', 'Skipping signing (no credentials configured)');
    // Add original unsignedArtifacts paths to artifacts (they're the same as unsigned)
    artifacts.push(...unsignedArtifacts);
  } else if (!isWindows) {
    console.log('info', 'Skipping signtool signing (not on Windows)');
    console.log('info', 'Use osslsigncode for cross-platform signing if needed');
    // Add original unsignedArtifacts paths to artifacts
    artifacts.push(...unsignedArtifacts);
  }
  
  return artifacts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINUX APPIMAGE BUILD
// ═══════════════════════════════════════════════════════════════════════════════

async function buildLinux(options: CLIOptions): Promise<string[]> {
  logHeader('Building Linux Application');
  const artifacts: string[] = [];
  
  // Check if we're on Linux
  const isLinux = process.platform === 'linux';
  
  if (!isLinux) {
    console.log('warn', 'Linux AppImage builds should be done on Linux');
    console.log('info', 'Attempting build anyway (may fail or produce incompatible binary)');
  }
  
  // Step 1: Build with Tauri
  logSection('Building Linux Application');
  
  const buildArgs = options.debug ? '--debug' : '';
  
  console.log('step', 'Building AppImage...');
  exec(`npm run tauri -- build ${buildArgs}`);
  
  // Find built artifacts
  const targetDir = path.join(TAURI_DIR, 'target', options.debug ? 'debug' : 'release', 'bundle');
  const appimageDir = path.join(targetDir, 'appimage');
  const debDir = path.join(targetDir, 'deb');
  
  if (fs.existsSync(appimageDir)) {
    const appimages = fs.readdirSync(appimageDir).filter(f => f.endsWith('.AppImage'));
    for (const img of appimages) {
      artifacts.push(path.join(appimageDir, img));
    }
  }
  
  if (fs.existsSync(debDir)) {
    const debs = fs.readdirSync(debDir).filter(f => f.endsWith('.deb'));
    for (const deb of debs) {
      artifacts.push(path.join(debDir, deb));
    }
  }
  
  console.log('success', `Built ${artifacts.length} artifact(s)`);
  
  // Step 2: GPG Sign (optional)
  if (hasBase64EnvVar('APPIMAGE_GPG_PRIVATE_KEY_BASE64')) {
    logSection('GPG Signing AppImage');
    
    const gpgKeyPath = decodeBase64ToFile('APPIMAGE_GPG_PRIVATE_KEY_BASE64', 'gpg-key.asc');
    const gpgPassphrase = process.env.APPIMAGE_GPG_PASSPHRASE || '';
    
    // Import GPG key
    console.log('step', 'Importing GPG key...');
    exec(`gpg --batch --import "${gpgKeyPath}"`, { ignoreError: true });
    
    for (const artifact of artifacts) {
      if (!artifact.endsWith('.AppImage')) continue;
      
      console.log('step', `Signing: ${path.basename(artifact)}`);
      
      const signCmd = gpgPassphrase
        ? `echo "${gpgPassphrase}" | gpg --batch --yes --passphrase-fd 0 --detach-sign --armor "${artifact}"`
        : `gpg --batch --yes --detach-sign --armor "${artifact}"`;
      
      exec(signCmd, { silent: true });
      
      const sigPath = `${artifact}.asc`;
      if (fs.existsSync(sigPath)) {
        artifacts.push(sigPath);
        console.log('success', `Created signature: ${path.basename(sigPath)}`);
      }
    }
  } else {
    console.log('info', 'GPG signing skipped (APPIMAGE_GPG_PRIVATE_KEY_BASE64 not set)');
  }
  
  return artifacts;
}

// Run
main().catch(error => {
  console.log('error', `Unhandled error: ${(error.message)}`);
  process.exit(1);
});
