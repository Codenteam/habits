/**
 * Mobile (Cordova/Capacitor/Tauri) Pack Handler
 * 
 * Generates mobile applications using Cordova, Capacitor, or Tauri frameworks
 * that wrap the frontend and proxy API calls to a remote backend.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { PackResult, MobileTarget, MobileFramework, ParsedConfig, HabitData } from './types';
import { getApiProxyScript } from './templates/deprecated/api-proxy';
import { getCordovaConfig } from './templates/deprecated/cordova-config';
import { packTauri } from './tauri';
import { checkCordovaCompatibility, parseJavaVersion, parseGradleVersion } from './gradle-java-compatibility';
import { generateBundle } from './bundle-generator-wrapper';
import JSZip from 'jszip';
import { LoggerFactory } from '@ha-bits/core';
import { sanitizeStackName, createTmpWorkDir, createCleanupHandler, addDirectoryToZip } from './utils';
const logger = LoggerFactory.getRoot();

export interface MobilePackOptions {
  configPath: string;
  configDir: string;
  config: ParsedConfig;
  habits: HabitData[];
  backendUrl: string;
  mobileTarget: MobileTarget;
  output?: string;
}

/**
 * Supported mobile targets
 */
export function getSupportedMobileTargets(): MobileTarget[] {
  return ['ios', 'android', 'both'];
}

/**
 * Generate a Cordova mobile app from habits config
 */
export async function packMobile(options: MobilePackOptions): Promise<PackResult> {
  const { configPath, configDir, config, backendUrl, mobileTarget, output } = options;

  console.log('📱 Packing habits into Cordova mobile app...\n');
  console.log(`   Config: ${configPath}`);
  console.log(`   Backend URL: ${backendUrl}`);
  console.log(`   Target: ${mobileTarget}`);

  // Validate frontend exists
  const frontendPath = config.server?.frontend
    ? path.isAbsolute(config.server.frontend)
      ? config.server.frontend
      : path.resolve(configDir, config.server.frontend)
    : path.join(configDir, 'frontend');

  if (!fs.existsSync(frontendPath)) {
    return {
      success: false,
      error: `Frontend directory not found: ${frontendPath}. Mobile pack requires a frontend folder.`,
      format: 'mobile',
    };
  }

  const indexPath = path.join(frontendPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return {
      success: false,
      error: `index.html not found in frontend directory: ${frontendPath}`,
      format: 'mobile',
    };
  }

  // Check cordova is installed
  try {
    execSync('cordova --version', { stdio: 'pipe' });
  } catch (e) {
    return {
      success: false,
      error: 'Cordova CLI not found. Install it globally with: npm install -g cordova',
      format: 'mobile',
    };
  }

  // Create temp working directory
  const workDir = createTmpWorkDir('cordova');
  const appName = config.name || 'Habits App';
  const appId = `com.habits.${appName.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;

  // Log workDir
  logger.info(`Working directory: ${workDir}`);

  try {
    console.log('\n⏳ Creating Cordova project...\n');
    console.log(workDir);

    // Create Cordova project
    execSync(`cordova create app ${appId} "${appName}"`, {
      cwd: workDir,
      stdio: 'pipe',
      timeout: 60000,
    });

    const appDir = path.join(workDir, 'app');

    // Add platforms
    console.log('   📦 Adding platforms...');
    if (mobileTarget === 'ios' || mobileTarget === 'both') {
      try {
        execSync('cordova platform add ios', {
          cwd: appDir,
          stdio: 'pipe',
          timeout: 120000,
        });
        console.log('   ✅ iOS platform added');
      } catch (e: any) {
        if (mobileTarget === 'ios') {
          throw new Error(`Failed to add iOS platform: ${e.message}`);
        }
        console.log('   ⚠️  iOS platform skipped (requires macOS with Xcode)');
      }
    }

    if (mobileTarget === 'android' || mobileTarget === 'both') {
      try {
        execSync('cordova platform add android', {
          cwd: appDir,
          stdio: 'pipe',
          timeout: 120000,
        });
        console.log('   ✅ Android platform added');
      } catch (e: any) {
        if (mobileTarget === 'android') {
          throw new Error(`Failed to add Android platform: ${e.message}`);
        }
        console.log('   ⚠️  Android platform skipped (requires Android SDK)');
      }
    }

    // Replace www directory with our frontend
    const wwwDir = path.join(appDir, 'www');
    fs.rmSync(wwwDir, { recursive: true, force: true });
    copyDirRecursive(frontendPath, wwwDir);

    // Create config.json for runtime configuration
    const runtimeConfig = {
      backendUrl,
      appName,
    };
    fs.writeFileSync(
      path.join(wwwDir, 'config.json'),
      JSON.stringify(runtimeConfig, null, 2)
    );

    // Inject API proxy script and Cordova.js loader
    injectMobileScripts(path.join(wwwDir, 'index.html'), backendUrl);

    // Update config.xml with custom settings
    const configXmlPath = path.join(appDir, 'config.xml');
    fs.writeFileSync(configXmlPath, getCordovaConfig({
      appId,
      appName,
      description: `${appName} - Habits Mobile App`,
      backendUrl,
    }));

    // Add required plugins
    console.log('   🔌 Adding plugins...');
    const plugins = [
      'cordova-plugin-whitelist',
      'cordova-plugin-network-information',
    ];

    for (const plugin of plugins) {
      try {
        execSync(`cordova plugin add ${plugin}`, {
          cwd: appDir,
          stdio: 'pipe',
          timeout: 60000,
        });
      } catch (e) {
        // Non-fatal - some plugins may not be needed
      }
    }

    // Build the app
    console.log('   🔨 Building mobile app...');

    const builds: string[] = [];
    if (mobileTarget === 'ios' || mobileTarget === 'both') {
      try {
        execSync('cordova build ios', {
          cwd: appDir,
          stdio: 'pipe',
          timeout: 300000,
        });
        builds.push('ios');
      } catch (e) {
        console.log('   ⚠️  iOS build skipped');
      }
    }

    if (mobileTarget === 'android' || mobileTarget === 'both') {
      try {
        execSync('cordova build android', {
          cwd: appDir,
          stdio: 'pipe',
          timeout: 600000,
        });
        builds.push('android');
      } catch (e: any) {
        console.log('   ⚠️  Android build skipped:', e.message);
        if (e.stderr) console.log('   stderr:', e.stderr.toString().substring(0, 500));
      }
    }

    if (builds.length === 0) {
      return {
        success: false,
        error: 'No platforms could be built. Ensure iOS (macOS + Xcode) or Android SDK is available.',
        format: 'mobile',
      };
    }

    // Copy build outputs
    const outputDir = output ? path.resolve(output) : path.join(configDir, 'dist-mobile');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let totalSize = 0;

    // Copy iOS build
    if (builds.includes('ios')) {
      const iosOutputDir = path.join(appDir, 'platforms/ios/build');
      if (fs.existsSync(iosOutputDir)) {
        const ipaFiles = findFiles(iosOutputDir, ['.ipa', '.app']);
        for (const file of ipaFiles) {
          const destPath = path.join(outputDir, path.basename(file));
          fs.cpSync(file, destPath, { recursive: true });
          const stat = fs.statSync(destPath);
          totalSize += stat.isDirectory() ? getDirSize(destPath) : stat.size;
          console.log(`   ✅ ${path.basename(file)}`);
        }
      }
    }

    // Copy Android build
    if (builds.includes('android')) {
      const apkDir = path.join(appDir, 'platforms/android/app/build/outputs/apk/release');
      if (fs.existsSync(apkDir)) {
        const apkFiles = findFiles(apkDir, ['.apk']);
        for (const file of apkFiles) {
          const destPath = path.join(outputDir, path.basename(file));
          fs.copyFileSync(file, destPath);
          totalSize += fs.statSync(destPath).size;
          console.log(`   ✅ ${path.basename(file)}`);
        }
      }
    }

    // Copy www (for reference/debugging)
    const wwwDest = path.join(outputDir, 'www');
    copyDirRecursive(wwwDir, wwwDest);

    // Cleanup
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }

    console.log('\n✅ Mobile app generated successfully!\n');
    console.log(`   Output: ${outputDir}`);
    console.log(`   Total size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   Platforms: ${builds.join(', ')}`);
    console.log('\n💡 The app will connect to:', backendUrl);
    console.log('   To change the backend URL, edit www/config.json and rebuild.');

    return {
      success: true,
      outputPath: outputDir,
      format: 'mobile',
      size: totalSize,
      platform: builds.join(', '),
    };
  } catch (error: any) {
    // Cleanup on error
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch (e) {}

    return {
      success: false,
      error: `Mobile build failed: ${error.message}`,
      format: 'mobile',
    };
  }
}

/**
 * Recursively copy a directory
 */
function copyDirRecursive(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Inject API proxy and Cordova scripts into HTML
 */
function injectMobileScripts(htmlPath: string, backendUrl: string): void {
  let html = fs.readFileSync(htmlPath, 'utf8');

  const scripts = `
<script src="cordova.js"></script>
<script>
${getApiProxyScript(backendUrl)}

// Wait for Cordova to be ready
document.addEventListener('deviceready', function() {
  console.log('Cordova ready');
}, false);
</script>`;

  // Inject before </head> or at start of <body>
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${scripts}\n</head>`);
  } else if (html.includes('<body>')) {
    html = html.replace('<body>', `<body>\n${scripts}`);
  } else {
    html = scripts + '\n' + html;
  }

  fs.writeFileSync(htmlPath, html);
}

/**
 * Find files with specific extensions
 */
function findFiles(dir: string, extensions: string[]): string[] {
  if (!fs.existsSync(dir)) return [];

  const files: string[] = [];

  function scanDir(d: string) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) {
        // Check if this is an .app bundle (treat as file)
        if (entry.name.endsWith('.app')) {
          files.push(fullPath);
        } else {
          scanDir(fullPath);
        }
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }

  scanDir(dir);
  return files;
}

/**
 * Get directory size recursively
 */
function getDirSize(dir: string): number {
  let size = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      size += getDirSize(fullPath);
    } else {
      size += fs.statSync(fullPath).size;
    }
  }
  return size;
}

/**
 * Web API Mobile Pack Options
 */
export interface WebMobilePackOptions {
  habits: any[];
  serverConfig: any;
  frontendHtml: string;
  backendUrl: string;
  mobileTarget: MobileTarget;
  buildBinary?: boolean;
  debugBuild?: boolean;
  framework?: MobileFramework;
  stackName?: string;
  stackId?: string; // Stack UUID for build caching
  appName?: string;
  appIcon?: string; // base64 encoded image
  /** Execution mode: 'client' proxies to backend, 'full' embeds workflow execution */
  executionMode?: 'client' | 'full';
  /** Environment variables to embed (for 'full' mode) */
  envVars?: Record<string, string>;
}

/**
 * Web API Mobile Pack Result
 */
export interface WebMobilePackResult {
  success: boolean;
  error?: string;
  // For project files (when buildBinary is false)
  zipBuffer?: Buffer;
  zipFilename?: string;
  // For binary files (when buildBinary is true)
  binaryPath?: string;
  binaryFilename?: string;
  binaryMimeType?: string;
  // Cleanup function to call after sending response
  cleanup?: () => void;
}

/**
 * Generate a mobile app for Web API
 * Returns either a zip buffer (project files) or a binary file path (APK/IPA)
 */
export async function packMobileForWeb(options: WebMobilePackOptions): Promise<WebMobilePackResult> {
  const { framework = 'tauri', habits, serverConfig, frontendHtml, backendUrl, mobileTarget, buildBinary = false, debugBuild = false, stackName, stackId, appName, appIcon, executionMode = 'client', envVars } = options;
  
  // Generate bundle for 'full' mode using npx @ha-bits/bundle-generator
  let cortexBundle: string | undefined;
  if (executionMode === 'full') {
    logger.info('Generating bundle for full execution mode via npx @ha-bits/bundle-generator');
    const bundleResult = await generateBundle({
      habits,
      appName,
      envVars,
    });
    if (!bundleResult.success) {
      throw new Error(`Failed to generate bundle: ${bundleResult.error}`);
    }
    cortexBundle = bundleResult.code;
  }
  
  // Route to the appropriate framework handler
  if (framework === 'capacitor') {
    return packCapacitorForWeb(options);
  } else if (framework === 'tauri') {
    return packTauri({
      habits,
      serverConfig,
      frontendHtml,
      backendUrl,
      buildBinary,
      debugBuild,
      stackName,
      stackId,
      platform: 'mobile',
      mobileTarget,
      appName,
      appIcon,
      executionMode: executionMode === 'full' ? 'full' : 'api',
      cortexBundle,
    });
  } else {
    return packCordovaForWeb(options);
  }
}

/**
 * Generate a Capacitor mobile app for Web API
 */
async function packCapacitorForWeb(options: WebMobilePackOptions): Promise<WebMobilePackResult> {
  const { habits, serverConfig, frontendHtml, backendUrl, mobileTarget, buildBinary = false, stackName, appName: customAppName, appIcon } = options;

  // Sanitize stack name for filename
  const sanitizedStackName = sanitizeStackName(stackName);
  const logger = LoggerFactory.getRoot();

  // Create temp directory for the project
  const workDir = createTmpWorkDir('mobile');
  const appName = customAppName || 'Habits App';
  const appId = `com.habits.${appName.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;

  const cleanup = createCleanupHandler(workDir);

  try {
    // Package.json for Capacitor (dependencies will be installed via npm)
    const packageJson = {
      name: appId,
      displayName: appName,
      version: '1.0.0',
      description: 'Habits Mobile App',
      main: 'index.js',
      scripts: {
        'build': 'echo "Build complete"',
        'cap:add:android': 'npx cap add android',
        'cap:add:ios': 'npx cap add ios',
        'cap:sync': 'npx cap sync',
        'build:android': 'cd android && ./gradlew assembleDebug',
        'build:android:release': 'cd android && ./gradlew assembleRelease',
        'build:ios': 'cd ios/App && xcodebuild -scheme App -configuration Debug -destination generic/platform=iOS build',
      },
    };

    // Capacitor config
    const capacitorConfig = {
      appId,
      appName,
      webDir: 'www',
      server: {
        androidScheme: 'https',
        allowNavigation: [backendUrl.replace(/^https?:\/\//, '').split('/')[0]],
      },
    };

    // Inject API proxy script for Capacitor
    const mobileScripts = `
<script>
${getApiProxyScript(backendUrl)}

// Capacitor ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('Capacitor app ready');
});
</script>`;

    // Inject scripts into HTML
    const modifiedHtml = frontendHtml.includes('</head>')
      ? frontendHtml.replace('</head>', mobileScripts + '\n</head>')
      : frontendHtml.includes('<body>')
        ? frontendHtml.replace('<body>', '<body>\n' + mobileScripts)
        : mobileScripts + '\n' + frontendHtml;

    // Write files
    fs.mkdirSync(path.join(workDir, 'www'));
    fs.writeFileSync(path.join(workDir, 'capacitor.config.json'), JSON.stringify(capacitorConfig, null, 2));
    fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(path.join(workDir, 'www', 'index.html'), modifiedHtml);

    // Create README
    const readme = `# ${appName} - Capacitor Mobile App

Generated by Habits for ${mobileTarget === 'both' ? 'iOS and Android' : mobileTarget}.

## Prerequisites

- Node.js 18+
${mobileTarget === 'ios' || mobileTarget === 'both' ? '- Xcode 14+ (for iOS, macOS only)' : ''}
${mobileTarget === 'android' || mobileTarget === 'both' ? `- Java 17 (for Android)
  - Install: \`brew install openjdk@17\` (macOS) or download from Oracle
  - Set JAVA_HOME: \`export JAVA_HOME=$(/usr/libexec/java_home -v 17)\` (macOS)
- Android SDK (for Android)
  - Install Android Studio or Android Command Line Tools
  - Set ANDROID_HOME: \`export ANDROID_HOME=$HOME/Library/Android/sdk\` (macOS)
  - Set PATH: \`export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools\`` : ''}

## Setup

\`\`\`bash
# Install Capacitor dependencies
npm install --save @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios

# Add platforms
${mobileTarget === 'ios' || mobileTarget === 'both' ? 'npx cap add ios' : ''}
${mobileTarget === 'android' || mobileTarget === 'both' ? 'npx cap add android' : ''}

# Sync web assets
npx cap sync
\`\`\`

## Build

\`\`\`bash
${mobileTarget === 'ios' || mobileTarget === 'both' ? '# Build for iOS\\nnpm run build:ios' : ''}
${mobileTarget === 'android' || mobileTarget === 'both' ? '# Build for Android (debug)\\nnpm run build:android\\n\\n# Build for Android (release)\\nnpm run build:android:release' : ''}
\`\`\`

${mobileTarget === 'android' || mobileTarget === 'both' ? `## Android APK Location

After building, the APK will be at:
- Debug: \`android/app/build/outputs/apk/debug/app-debug.apk\`
- Release: \`android/app/build/outputs/apk/release/app-release-unsigned.apk\`

## Android Build Troubleshooting

If you encounter Gradle errors:
1. Ensure Java 17 is installed and JAVA_HOME is set
2. Verify ANDROID_HOME points to your Android SDK
3. Try: \`cd android && ./gradlew clean\`
4. Check Java version: \`java -version\` (should be 17.x)

` : ''}## Run on Device/Emulator

\`\`\`bash
${mobileTarget === 'ios' || mobileTarget === 'both' ? '# Open in Xcode\\nnpx cap open ios' : ''}
${mobileTarget === 'android' || mobileTarget === 'both' ? '# Open in Android Studio\\nnpx cap open android' : ''}
\`\`\`

## Backend URL

This app connects to: ${backendUrl}

To change the backend URL, edit the BACKEND_URL in \`www/index.html\`.
`;
    fs.writeFileSync(path.join(workDir, 'README.md'), readme);

    // Create config.json with app info
    const configJson = {
      backendUrl,
      habits: habits.map((h: any) => h.name),
      serverConfig,
      target: mobileTarget,
      framework: 'capacitor',
    };
    fs.writeFileSync(path.join(workDir, 'config.json'), JSON.stringify(configJson, null, 2));

    if (buildBinary) {
      // Build the actual binary
      logger.info(`Working directory: ${workDir}`);
      logger.info(`Building Capacitor mobile binary for ${mobileTarget}...`);

      try {
        // Install Capacitor dependencies
        logger.info('Installing Capacitor dependencies...');
        execSync('npm install --save @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios', { cwd: workDir, stdio: 'inherit' });

        // Add Capacitor platforms
        if (mobileTarget === 'android' || mobileTarget === 'both') {
          logger.info('Adding Android platform...');
          try {
            execSync('npx cap add android', { cwd: workDir, stdio: 'inherit' });
          } catch (error: any) {
              logger.error('Error adding Android platform:', { error });
          }
          // Sync web assets
          logger.info('Syncing Capacitor assets...');
          execSync('npx cap sync android', { cwd: workDir, stdio: 'inherit' });

          logger.info('Building Android APK...');
          const androidDir = path.join(workDir, 'android');
          try {
            execSync('./gradlew assembleDebug', { cwd: androidDir, stdio: 'inherit' });
          } catch (error: any) {
            // Capture stderr for better error reporting
            const stderr = error.stderr?.toString() || error.stdout?.toString() || error.message || '';
            throw new Error(`Android build failed: ${stderr}`);
          }

          // Find the APK file
          const apkPath = path.join(workDir, 'android/app/build/outputs/apk/debug/app-debug.apk');

          if (fs.existsSync(apkPath)) {
            return {
              success: true,
              binaryPath: apkPath,
              binaryFilename: 'habits.apk',
              binaryMimeType: 'application/vnd.android.package-archive',
              cleanup,
            };
          } else {
            throw new Error('APK file not found after build at: ' + apkPath);
          }
        }

        if (mobileTarget === 'ios') {
          logger.info('Adding iOS platform...');
          try {
            execSync('npx cap add ios', { cwd: workDir, stdio: 'inherit' });
          } catch (error: any) {
            if (!error.message?.includes('already exists')) {
              logger.error('Error adding iOS platform:', { error });
            }
            logger.info('iOS platform already added, skipping...');
          }
          
          // Sync web assets
          logger.info('Syncing Capacitor assets...');
          execSync('npx cap sync ios', { cwd: workDir, stdio: 'inherit' });

          logger.info('Building iOS app...');
          const iosAppDir = path.join(workDir, 'ios/App');
          try {
            execSync('xcodebuild -scheme App -configuration Debug -destination generic/platform=iOS build', 
              { cwd: iosAppDir, stdio: 'pipe' });
          } catch (error: any) {
            const stderr = error.stderr?.toString() || error.stdout?.toString() || error.message || '';
            throw new Error(`iOS build failed: ${stderr}`);
          }

          // Find the built app
          const iosPath = path.join(workDir, 'ios/App/build');

          if (fs.existsSync(iosPath)) {
            // Create zip of the built app
            const zipPath = path.join(workDir, `${sanitizedStackName}.ios.zip`);
            execSync(`cd "${iosPath}" && zip -r "${zipPath}" . 2>/dev/null || true`, { stdio: 'inherit' });

            return {
              success: true,
              binaryPath: zipPath,
              binaryFilename: `${sanitizedStackName}.ios.zip`,
              binaryMimeType: 'application/zip',
              cleanup,
            };
          } else {
            throw new Error('iOS build output not found');
          }
        }
      } catch (buildError: any) {
        cleanup();
        
        // Provide more specific error messages for common issues
        let errorMessage = buildError.message || 'Build failed';
        
        return {
          success: false,
          error: errorMessage,
        };
      }
    } else {
      // Just return the project files as zip
      const zip = new JSZip();

      const addFilesToZip = (dir: string, zipFolder: any) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            addFilesToZip(filePath, zipFolder.folder(file));
          } else {
            zipFolder.file(file, fs.readFileSync(filePath));
          }
        }
      };

      addFilesToZip(workDir, zip);

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

      // Clean up immediately since we have the buffer
      cleanup();

      return {
        success: true,
        zipBuffer,
        zipFilename: `${sanitizedStackName}.mobile-capacitor-${mobileTarget}.zip`,
      };
    }

    // Should not reach here
    cleanup();
    return {
      success: false,
      error: 'No build target matched',
    };
  } catch (error: any) {
    cleanup();
    return {
      success: false,
      error: `Capacitor build failed: ${error.message}`,
    };
  }
}

/**
 * Generate a Cordova mobile app for Web API
 * Returns either a zip buffer (project files) or a binary file path (APK/IPA)
 */
async function packCordovaForWeb(options: WebMobilePackOptions): Promise<WebMobilePackResult> {
  const { habits, serverConfig, frontendHtml, backendUrl, mobileTarget, buildBinary = false, stackName, appName: customAppName, appIcon } = options;
  const logger = LoggerFactory.getRoot();

  // Sanitize stack name for filename
  const sanitizedStackName = sanitizeStackName(stackName);

  // Create temp directory for the project
  const workDir = createTmpWorkDir('mobile');
  const appName = customAppName || 'Habits App';
  const appId = `com.habits.${appName.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;

  const cleanup = createCleanupHandler(workDir);

  try {
    // Create Cordova project structure
    const configXml = getCordovaConfig({
      appId,
      appName,
      description: `${appName} - Habits Mobile App`,
      backendUrl,
    });

    // Package.json for Cordova (dependencies will be installed via npm)
    const packageJson = {
      name: appId,
      displayName: appName,
      version: '1.0.0',
      description: 'Habits Mobile App',
      main: 'index.js',
      scripts: {
        'prepare': 'cordova prepare',
        'build:ios': 'cordova build ios',
        'build:android': 'cordova build android',
        'run:ios': 'cordova run ios',
        'run:android': 'cordova run android',
      },
    };

    // Inject API proxy script and Cordova scripts into HTML
    const mobileScripts = `
<script src="cordova.js"></script>
<script>
${getApiProxyScript(backendUrl)}

// Wait for Cordova to be ready
document.addEventListener('deviceready', function() {
  console.log('Cordova ready');
}, false);
</script>`;

    // Inject scripts into HTML
    const modifiedHtml = frontendHtml.includes('</head>')
      ? frontendHtml.replace('</head>', mobileScripts + '\n</head>')
      : frontendHtml.includes('<body>')
        ? frontendHtml.replace('<body>', '<body>\n' + mobileScripts)
        : mobileScripts + '\n' + frontendHtml;

    // Write files
    fs.mkdirSync(path.join(workDir, 'www'));
    fs.writeFileSync(path.join(workDir, 'config.xml'), configXml);
    fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(path.join(workDir, 'www', 'index.html'), modifiedHtml);

    // Create README
    const readme = `# ${appName} - Cordova Mobile App

Generated by Habits for ${mobileTarget === 'both' ? 'iOS and Android' : mobileTarget}.

## Prerequisites

- Node.js 18+
${mobileTarget === 'ios' || mobileTarget === 'both' ? '- Xcode 14+ (for iOS, macOS only)' : ''}
${mobileTarget === 'android' || mobileTarget === 'both' ? `- Java 17 (for Android)
  - Install: \`brew install openjdk@17\` (macOS) or download from Oracle
  - Set JAVA_HOME: \`export JAVA_HOME=$(/usr/libexec/java_home -v 17)\` (macOS)
- Android SDK (for Android)
  - Install Android Studio or Android Command Line Tools
  - Set ANDROID_HOME: \`export ANDROID_HOME=$HOME/Library/Android/sdk\` (macOS)
  - Set PATH: \`export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools\`` : ''}

## Setup

\`\`\`bash
# Install Cordova dependencies
npm install --save cordova cordova-android cordova-ios

# Add platforms
${mobileTarget === 'ios' || mobileTarget === 'both' ? 'npx cordova platform add ios' : ''}
${mobileTarget === 'android' || mobileTarget === 'both' ? 'npx cordova platform add android' : ''}
\`\`\`

## Build

\`\`\`bash
${mobileTarget === 'ios' || mobileTarget === 'both' ? '# Build for iOS\\nnpm run build:ios' : ''}
${mobileTarget === 'android' || mobileTarget === 'both' ? '# Build for Android\\nnpm run build:android' : ''}
\`\`\`

${mobileTarget === 'android' || mobileTarget === 'both' ? `## Android Build Troubleshooting

If you encounter Gradle errors:
1. Ensure Java 17 is installed and JAVA_HOME is set
2. Verify ANDROID_HOME points to your Android SDK
3. Try: \`cd platforms/android && ./gradlew clean\`
4. Check Java version: \`java -version\` (should be 17.x)

` : ''}## Run on Device/Emulator

\`\`\`bash
${mobileTarget === 'ios' || mobileTarget === 'both' ? '# Run on iOS\\nnpm run run:ios' : ''}
${mobileTarget === 'android' || mobileTarget === 'both' ? '# Run on Android\\nnpm run run:android' : ''}
\`\`\`

## Backend URL

This app connects to: ${backendUrl}

To change the backend URL, edit the BACKEND_URL in \`www/index.html\`.
`;
    fs.writeFileSync(path.join(workDir, 'README.md'), readme);

    // Create config.json with app info
    const configJson = {
      backendUrl,
      habits: habits.map((h: any) => h.name),
      serverConfig,
      target: mobileTarget,
    };
    fs.writeFileSync(path.join(workDir, 'config.json'), JSON.stringify(configJson, null, 2));

    if (buildBinary) {
      // Build the actual binary
      logger.info(`Working directory: ${workDir}`);
      logger.info(`Building mobile binary for ${mobileTarget}...`);

      try {
        // Check Java-Gradle compatibility before building Android
        if (mobileTarget === 'android' || mobileTarget === 'both') {
          logger.info('Checking Java-Gradle compatibility...');
          try {
            const javaVersionOutput = execSync('java -version 2>&1', { encoding: 'utf8' });
            const javaMatch = javaVersionOutput.match(/version "([\\d._]+)"/);
            const currentJavaVersion = javaMatch ? javaMatch[1] : null;
            
            const gradleVersionOutput = execSync('gradle --version 2>&1', { encoding: 'utf8', stdio: 'pipe' }).toString();
            const gradleMatch = gradleVersionOutput.match(/Gradle ([\\d.]+)/);
            const currentGradleVersion = gradleMatch ? gradleMatch[1] : null;
            
            if (currentJavaVersion && currentGradleVersion) {
              const javaMajor = parseJavaVersion(currentJavaVersion);
              const cordovaAndroidVersion = '13.0'; // From package.json cordova-android version
              
              if (javaMajor) {
                const compatReport = checkCordovaCompatibility(javaMajor, currentGradleVersion, cordovaAndroidVersion);
                logger.info('Compatibility check:', { report: compatReport });
                
                if (!compatReport.compatible) {
                  logger.warn('⚠️ WARNING: Java-Gradle compatibility issue detected!');
                  logger.warn(compatReport.recommendation);
                } else {
                  logger.info(`✓ Java ${javaMajor} is compatible with Gradle ${currentGradleVersion}`);
                }
              }
            } else {
              logger.warn('Could not detect Java/Gradle versions. Attempting to continue...');
            }
          } catch (e: any) {
            logger.warn('Could not check Java-Gradle compatibility:', { error: String(e) });
          }
        }

        // Install Cordova dependencies
        logger.info('Installing Cordova dependencies...');
        execSync('npm install --save cordova cordova-android cordova-ios', { cwd: workDir, stdio: 'inherit' });

        // Add Cordova platforms (ignore if already exists)
        if (mobileTarget === 'ios' || mobileTarget === 'both') {
          logger.info('Adding iOS platform...');
          try {
            execSync('npx cordova platform add ios', { cwd: workDir, stdio: 'inherit' });
          } catch (error: any) {
              logger.error('Error adding iOS platform:', { error });
          }
        }
        if (mobileTarget === 'android' || mobileTarget === 'both') {
          logger.info('Adding Android platform...');
          try {
            execSync('npx cordova platform add android', { cwd: workDir, stdio: 'inherit' });
          } catch (error: any) {
            if (!error.message?.includes('already added')) {
              logger.error('Error adding Android platform:', { error });
            }
            logger.info('Android platform already added, skipping...');
          }
        }

        if (mobileTarget === 'android' || mobileTarget === 'both') {
          logger.info('Building Android APK...');
          try {
            execSync('npx cordova build android --release', { cwd: workDir, stdio: 'pipe' });
          } catch (error: any) {
            // Capture stderr for better error reporting
            const stderr = error.stderr?.toString() || error.stdout?.toString() || error.message || '';
            throw new Error(`Android build failed: ${stderr}`);
          }

          // Find the APK file
          const apkPath = path.join(workDir, 'platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk');

          if (fs.existsSync(apkPath)) {
            return {
              success: true,
              binaryPath: apkPath,
              binaryFilename: 'habits.apk',
              binaryMimeType: 'application/vnd.android.package-archive',
              cleanup,
            };
          } else {
            throw new Error('APK file not found after build');
          }
        }

        if (mobileTarget === 'ios') {
          logger.info('Building iOS IPA...');
          try {
            execSync('cordova build ios --release', { cwd: workDir, stdio: 'pipe' });
          } catch (error: any) {
            const stderr = error.stderr?.toString() || error.stdout?.toString() || error.message || '';
            throw new Error(`iOS build failed: ${stderr}`);
          }

          // Find the IPA or app bundle
          const iosPath = path.join(workDir, 'platforms/ios/build/device');

          if (fs.existsSync(iosPath)) {
            // Create zip of the built app
            const zipPath = path.join(workDir, `${sanitizedStackName}.ios.zip`);
            execSync(`cd "${iosPath}" && zip -r "${zipPath}" *.app *.ipa 2>/dev/null || zip -r "${zipPath}" *.app`, { stdio: 'inherit' });

            return {
              success: true,
              binaryPath: zipPath,
              binaryFilename: `${sanitizedStackName}.ios.zip`,
              binaryMimeType: 'application/zip',
              cleanup,
            };
          } else {
            throw new Error('iOS build output not found');
          }
        }
      } catch (buildError: any) {
        cleanup();
        
        // Provide more specific error messages for common issues
        let errorMessage = buildError.message || 'Build failed';
        
        
        return {
          success: false,
          error: errorMessage,
        };
      }
    } else {
      // Just return the project files as zip
      const zip = new JSZip();

      const addFilesToZip = (dir: string, zipFolder: any) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            addFilesToZip(filePath, zipFolder.folder(file));
          } else {
            zipFolder.file(file, fs.readFileSync(filePath));
          }
        }
      };

      addFilesToZip(workDir, zip);

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

      // Clean up immediately since we have the buffer
      cleanup();

      return {
        success: true,
        zipBuffer,
        zipFilename: `${sanitizedStackName}.mobile-cordova-${mobileTarget}.zip`,
      };
    }

    // Should not reach here
    cleanup();
    return {
      success: false,
      error: 'No build target matched',
    };
  } catch (error: any) {
    cleanup();
    return {
      success: false,
      error: `Mobile build failed: ${error.message}`,
    };
  }
}
