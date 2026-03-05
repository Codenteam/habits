/**
 * Tauri Pack Handler (Desktop & Mobile)
 * 
 * Shared Tauri logic for generating desktop and mobile applications
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { getTmpDir, LoggerFactory } from '@ha-bits/core';
import { getTauriConfig } from './templates/tauri-config';
import { getTauriMain, getTauriLib } from './templates/tauri-main';
import { getTauriCargo } from './templates/tauri-cargo';
import { getTauriBuildScript } from './templates/tauri-build';
import { getApiProxyScript } from './templates/api-proxy';
import JSZip from 'jszip';

const logger = LoggerFactory.getRoot();

/**
 * Sanitize stack name for use in filenames
 */
function sanitizeStackName(name: string | undefined): string {
  if (!name || name.trim() === '' || name === 'Stack Name') {
    return 'habits';
  }
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface TauriPackOptions {
  habits: any[];
  serverConfig: any;
  frontendHtml: string;
  backendUrl: string;
  buildBinary?: boolean;
  stackName?: string;
  platform: 'desktop' | 'mobile';
  // Desktop-specific options
  desktopPlatform?: string;
  // Mobile-specific options
  mobileTarget?: 'ios' | 'android' | 'both';
}

export interface TauriPackResult {
  success: boolean;
  error?: string;
  zipBuffer?: Buffer;
  zipFilename?: string;
  binaryPath?: string;
  binaryFilename?: string;
  binaryMimeType?: string;
  cleanup?: () => void;
}

/**
 * Pack Tauri application (desktop or mobile)
 */
export async function packTauri(options: TauriPackOptions): Promise<TauriPackResult> {
  const {
    habits,
    serverConfig,
    frontendHtml,
    backendUrl,
    buildBinary = false,
    stackName,
    platform,
    desktopPlatform,
    mobileTarget,
  } = options;

  const sanitizedStackName = sanitizeStackName(stackName);
  const isMobile = platform === 'mobile';
  const workDir = fs.mkdtempSync(path.join(getTmpDir(), `habits-tauri-${platform}-`));
  const appName = 'Habits App';
  const appId = `com.habits.${appName.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;

  const cleanup = () => {
    try {
      if (process.env.DEBUG) {
        logger.info(`Debug mode - skipping cleanup of ${workDir}`);
        return;
      }
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  };

  try {
    logger.info(`📦 Generating Tauri ${platform} app in ${workDir}`);

    // Create package.json
    const packageJson = isMobile
      ? {
          name: appId,
          displayName: appName,
          version: '1.0.0',
          description: `Habits ${platform === 'mobile' ? 'Mobile' : 'Desktop'} App`,
          scripts: {
            tauri: 'tauri',
            dev: 'tauri dev',
            build: 'tauri build',
            'build:debug': 'tauri build --debug',
            ...(platform === 'mobile' && {
              android: 'tauri android init && tauri android dev',
              ios: 'tauri ios init && tauri ios dev',
              'build:android': 'tauri android build',
              'build:ios': 'tauri ios build',
            }),
          },
          devDependencies: {
            '@tauri-apps/cli': '^2',
            "@tauri-apps/api": "^2",
          },
        }
      : {
          name: appId,
          version: '1.0.0',
          description: `${appName} - Habits Desktop App`,
          scripts: {
            tauri: 'tauri',
            dev: 'tauri dev',
            build: 'tauri build',
            'build:debug': 'tauri build --debug',
          },
          devDependencies: {
            '@tauri-apps/cli': '^2',
            "@tauri-apps/api": "^2",
          },
        };

    // Create Tauri config
    const tauriConfigJson = getTauriConfig({
      appId,
      appName,
      backendUrl,
      windowTitle: appName,
    });

    const tauriConfig = JSON.parse(tauriConfigJson);

    // Calculate package name (same logic as in getTauriCargo)
    const packageName = appName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Create Cargo.toml
    const cargoToml = getTauriCargo({ appName });

    // Create main.rs (calls lib::run())
    const mainRs = getTauriMain(packageName);

    // Create lib.rs (required for mobile)
    const libRs = getTauriLib();

    // Create build.rs
    const buildRs = getTauriBuildScript();

    // Create config.json
    const configJson = {
      backendUrl,
      appName,
      habits: habits.map((h: any) => h.name),
      serverConfig,
      ...(isMobile && { target: mobileTarget, framework: 'tauri' }),
    };

    // Create root Cargo.toml workspace (required for Tauri v2)
    const rootCargoToml = `[workspace]
members = ["src-tauri"]
resolver = "2"
`;
    fs.writeFileSync(path.join(workDir, 'Cargo.toml'), rootCargoToml);

    // Create src-tauri directory structure
    const srcTauriDir = path.join(workDir, 'src-tauri');
    const srcDir = path.join(srcTauriDir, 'src');
    const iconsDir = path.join(srcTauriDir, 'icons');

    fs.mkdirSync(srcTauriDir, { recursive: true });
    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(iconsDir, { recursive: true });

    // Write project files
    fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(path.join(srcTauriDir, 'tauri.conf.json'), JSON.stringify(tauriConfig, null, 2));
    fs.writeFileSync(path.join(workDir, 'config.json'), JSON.stringify(configJson, null, 2));

    fs.writeFileSync(path.join(srcTauriDir, 'Cargo.toml'), cargoToml);
    fs.writeFileSync(path.join(srcTauriDir, 'build.rs'), buildRs);
    fs.writeFileSync(path.join(srcDir, 'main.rs'), mainRs);
    fs.writeFileSync(path.join(srcDir, 'lib.rs'), libRs);

    // Create placeholder icon files
    const placeholderIcon = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(path.join(iconsDir, '32x32.png'), placeholderIcon);
    fs.writeFileSync(path.join(iconsDir, '128x128.png'), placeholderIcon);
    fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), placeholderIcon);
    fs.writeFileSync(path.join(iconsDir, 'icon.png'), placeholderIcon);
    fs.writeFileSync(path.join(iconsDir, 'icon.icns'), '');
    fs.writeFileSync(path.join(iconsDir, 'icon.ico'), '');

    // Create www directory with frontend
    const wwwDir = path.join(workDir, 'www');
    fs.mkdirSync(wwwDir);

    // Inject API proxy script
    const apiProxyScript = `<script>\n${getApiProxyScript(backendUrl)}\n</script>`;
    const modifiedHtml = frontendHtml.includes('</head>')
      ? frontendHtml.replace('</head>', apiProxyScript + '\n</head>')
      : frontendHtml.includes('<body>')
        ? frontendHtml.replace('<body>', '<body>\n' + apiProxyScript)
        : apiProxyScript + '\n' + frontendHtml;

    fs.writeFileSync(path.join(wwwDir, 'index.html'), modifiedHtml);

    // Create README
    const readme = createReadme(platform, appName, backendUrl, desktopPlatform, mobileTarget);
    fs.writeFileSync(path.join(workDir, 'README.md'), readme);

    if (buildBinary) {
      return await buildTauriBinary({
        workDir,
        platform,
        mobileTarget,
        desktopPlatform,
        sanitizedStackName,
        cleanup,
      });
    } else {
      // Return project files as zip
      return await createProjectZip(workDir, sanitizedStackName, platform, mobileTarget, cleanup);
    }
  } catch (error: any) {
    cleanup();
    return {
      success: false,
      error: `Tauri ${platform} pack failed: ${error.message}`,
    };
  }
}

/**
 * Build Tauri binary
 */
async function buildTauriBinary(options: {
  workDir: string;
  platform: 'desktop' | 'mobile';
  mobileTarget?: 'ios' | 'android' | 'both';
  desktopPlatform?: string;
  sanitizedStackName: string;
  cleanup: () => void;
}): Promise<TauriPackResult> {
  const { workDir, platform, mobileTarget, sanitizedStackName, cleanup } = options;

  logger.info(`Building Tauri ${platform} binary...`);

  try {
    // Check Rust installation
    try {
      execSync('rustc --version', { stdio: 'pipe' });
    } catch {
      throw new Error('Rust toolchain not found. Install from https://rustup.rs/');
    }

    try {
      execSync('cargo --version', { stdio: 'pipe' });
    } catch {
      throw new Error('Cargo not found. Install from https://rustup.rs/');
    }

    // Install npm dependencies
    logger.info('Installing Tauri CLI...');
    execSync('npm install', { cwd: workDir, stdio: 'inherit', timeout: 120000 });

    if (platform === 'mobile') {
      return await buildMobileBinary({
        workDir,
        mobileTarget: mobileTarget!,
        sanitizedStackName,
        cleanup,
      });
    } else {
      return await buildDesktopBinary({
        workDir,
        sanitizedStackName,
        cleanup,
      });
    }
  } catch (buildError: any) {
    cleanup();

    let errorMessage = buildError.message || 'Build failed';

    if (errorMessage.includes('rustc')) {
      errorMessage += '\n\nRust toolchain not found or outdated. Install/update from https://rustup.rs/';
    } else if (errorMessage.includes('webkit2gtk')) {
      errorMessage += '\n\nWebKit2GTK not found. Install with: sudo apt install libwebkit2gtk-4.0-dev';
    } else if (errorMessage.includes('ANDROID_HOME')) {
      errorMessage += '\n\nANDROID_HOME environment variable not set. Install Android SDK.';
    } else if (errorMessage.includes('Xcode')) {
      errorMessage += '\n\nXcode required for iOS builds (macOS only).';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Build desktop binary
 */
async function buildDesktopBinary(options: {
  workDir: string;
  sanitizedStackName: string;
  cleanup: () => void;
}): Promise<TauriPackResult> {
  const { workDir, sanitizedStackName, cleanup } = options;

  logger.info('Building Tauri desktop (this may take several minutes on first build)...');
  execSync('npm run build', { cwd: workDir, stdio: 'inherit', timeout: 600000 });

  // Find the built binary
  const bundleDir = path.join(workDir, 'src-tauri', 'target', 'release', 'bundle');
  if (!fs.existsSync(bundleDir)) {
    throw new Error('Build completed but bundle directory not found');
  }

  // Look for built artifacts
  const builtFiles: string[] = [];
  const possibleDirs = ['dmg', 'msi', 'nsis', 'appimage', 'deb', 'rpm'];

  for (const dir of possibleDirs) {
    const dirPath = path.join(bundleDir, dir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath).map((f) => path.join(dirPath, f));
      builtFiles.push(...files.filter((f) => fs.statSync(f).isFile()));
    }
  }

  if (builtFiles.length === 0) {
    throw new Error('Build completed but no artifacts found in bundle/');
  }

  // If multiple files, create a zip
  if (builtFiles.length > 1) {
    const zip = new JSZip();
    for (const file of builtFiles) {
      const relativePath = path.relative(bundleDir, file);
      zip.file(relativePath, fs.readFileSync(file));
    }
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipPath = path.join(workDir, `${sanitizedStackName}.tauri-all.zip`);
    fs.writeFileSync(zipPath, zipBuffer);

    return {
      success: true,
      binaryPath: zipPath,
      binaryFilename: `${sanitizedStackName}.tauri-all.zip`,
      binaryMimeType: 'application/zip',
      cleanup,
    };
  }

  // Return the single built file
  const binaryFile = builtFiles[0];
  const ext = path.extname(binaryFile);

  let mimeType = 'application/octet-stream';
  if (ext === '.dmg') mimeType = 'application/x-apple-diskimage';
  else if (ext === '.exe') mimeType = 'application/x-msdownload';
  else if (ext === '.msi') mimeType = 'application/x-msi';
  else if (ext === '.AppImage') mimeType = 'application/x-executable';
  else if (ext === '.deb') mimeType = 'application/x-debian-package';
  else if (ext === '.rpm') mimeType = 'application/x-rpm';

  return {
    success: true,
    binaryPath: binaryFile,
    binaryFilename: `${sanitizedStackName}.tauri${ext}`,
    binaryMimeType: mimeType,
    cleanup,
  };
}

/**
 * Build mobile binary
 */
async function buildMobileBinary(options: {
  workDir: string;
  mobileTarget: 'ios' | 'android' | 'both';
  sanitizedStackName: string;
  cleanup: () => void;
}): Promise<TauriPackResult> {
  const { workDir, mobileTarget, sanitizedStackName, cleanup } = options;

  if (mobileTarget === 'android' || mobileTarget === 'both') {
    logger.info('Initializing Tauri for Android...');

    // Detect Java 21 or compatible version for Gradle (Java 25 is incompatible with Gradle's Groovy)
    let javaHome = process.env.JAVA_HOME;
    try {
      // On macOS, use java_home utility to find Java 21 (preferred) or 17
      if (process.platform === 'darwin') {
        try {
          javaHome = execSync('/usr/libexec/java_home -v 21', { encoding: 'utf8' }).trim();
          logger.info('Using Java 21 for Android build', { javaHome });
        } catch {
          try {
            javaHome = execSync('/usr/libexec/java_home -v 17', { encoding: 'utf8' }).trim();
            logger.info('Using Java 17 for Android build', { javaHome });
          } catch {
            logger.warn('Java 17 or 21 not found, using default JAVA_HOME');
          }
        }
      }
    } catch {
      logger.warn('Could not detect Java version, using default');
    }

    const androidExecOpts = {
      cwd: workDir,
      stdio: 'inherit' as const,
      env: javaHome ? { ...process.env, JAVA_HOME: javaHome } : process.env,
    };

    try {
      execSync('npx tauri android init', androidExecOpts);
    } catch (error: any) {
      const errorMsg = error.stderr?.toString() || error.stdout?.toString() || error.message || '';
      logger.error('Error initializing Android:', { error });
      
      // Check for common Android environment issues
      if (errorMsg.includes('NDK') || errorMsg.includes('ndk')) {
        throw new Error('Android NDK not properly configured. Install NDK via Android Studio > SDK Manager > SDK Tools > NDK (Side by side), then set ANDROID_NDK_HOME environment variable.');
      } else if (errorMsg.includes('ANDROID_HOME') || errorMsg.includes('SDK')) {
        throw new Error('Android SDK not found. Set ANDROID_HOME environment variable to your Android SDK path.');
      } else if (errorMsg.includes('JAVA_HOME') || errorMsg.includes('java')) {
        throw new Error('Java not found. Install Java 17+ and set JAVA_HOME environment variable.');
      }
      
      throw new Error(`Android initialization failed: ${errorMsg}`);
    }

    // Verify android project was created
    const androidProjectDir = path.join(workDir, 'src-tauri/gen/android');
    if (!fs.existsSync(androidProjectDir)) {
      throw new Error('Android project was not created. Check Android SDK/NDK configuration.');
    }

    logger.info('Building Android APK...');
    try {
      execSync('npx tauri android build', { ...androidExecOpts, timeout: 600000 });
    } catch (error: any) {
      const stderr = error.stderr?.toString() || error.stdout?.toString() || error.message || '';
      throw new Error(`Android build failed: ${stderr}`);
    }

    // Find the APK file - Tauri v2 creates universal APKs by default
    const universalApkPath = path.join(
      workDir,
      'src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk'
    );
    const releaseApkPath = path.join(
      workDir,
      'src-tauri/gen/android/app/build/outputs/apk/release/app-release-unsigned.apk'
    );
    const debugApkPath = path.join(
      workDir,
      'src-tauri/gen/android/app/build/outputs/apk/debug/app-debug.apk'
    );

    // Try universal first, then release, then debug
    let finalApkPath = universalApkPath;
    if (!fs.existsSync(finalApkPath)) {
      finalApkPath = releaseApkPath;
    }
    if (!fs.existsSync(finalApkPath)) {
      finalApkPath = debugApkPath;
    }

    if (fs.existsSync(finalApkPath)) {
      return {
        success: true,
        binaryPath: finalApkPath,
        binaryFilename: `${sanitizedStackName}.tauri.apk`,
        binaryMimeType: 'application/vnd.android.package-archive',
        cleanup,
      };
    } else {
      throw new Error('APK file not found after build');
    }
  }

  if (mobileTarget === 'ios') {
    logger.info('Initializing Tauri for iOS...');
    try {
      execSync('npx tauri ios init', { cwd: workDir, stdio: 'inherit' });
    } catch (error: any) {
      const errorMsg = error.stderr?.toString() || error.stdout?.toString() || error.message || '';
      if (!errorMsg.includes('already exists')) {
        if (errorMsg.includes('Xcode') || errorMsg.includes('xcode')) {
          throw new Error('Xcode not found. Install Xcode from the App Store (macOS only).');
        } else if (errorMsg.includes('CocoaPods') || errorMsg.includes('pod')) {
          throw new Error('CocoaPods not found. Install with: sudo gem install cocoapods');
        }
        throw new Error(`iOS initialization failed: ${errorMsg}`);
      }
      logger.info('iOS platform already initialized, skipping...');
    }

    // Verify iOS project was created
    const iosProjectDir = path.join(workDir, 'src-tauri/gen/apple');
    if (!fs.existsSync(iosProjectDir)) {
      throw new Error('iOS project was not created. Make sure Xcode is installed (macOS only).');
    }

    logger.info('Building iOS app...');
    try {
      execSync('npx tauri ios build', { cwd: workDir, stdio: 'inherit', timeout: 600000 });
    } catch (error: any) {
      const stderr = error.stderr?.toString() || error.stdout?.toString() || error.message || '';
      throw new Error(`iOS build failed: ${stderr}`);
    }

    // Find the built app
    const iosPath = path.join(workDir, 'src-tauri/gen/apple');

    if (fs.existsSync(iosPath)) {
      // Create zip of the iOS project
      const zipPath = path.join(workDir, `${sanitizedStackName}.tauri-ios.zip`);
      execSync(`cd "${iosPath}" && zip -r "${zipPath}" . 2>/dev/null || true`, {
        stdio: 'inherit',
      });

      return {
        success: true,
        binaryPath: zipPath,
        binaryFilename: `${sanitizedStackName}.tauri-ios.zip`,
        binaryMimeType: 'application/zip',
        cleanup,
      };
    } else {
      throw new Error('iOS build output not found');
    }
  }

  throw new Error('No build target matched');
}

/**
 * Create project zip
 */
async function createProjectZip(
  workDir: string,
  sanitizedStackName: string,
  platform: 'desktop' | 'mobile',
  mobileTarget: 'ios' | 'android' | 'both' | undefined,
  cleanup: () => void
): Promise<TauriPackResult> {
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
  cleanup();

  const suffix = platform === 'mobile' ? `-tauri-${mobileTarget}` : '-tauri';

  return {
    success: true,
    zipBuffer,
    zipFilename: `${sanitizedStackName}.${platform}${suffix}.zip`,
  };
}

/**
 * Create README content
 */
function createReadme(
  platform: 'desktop' | 'mobile',
  appName: string,
  backendUrl: string,
  desktopPlatform?: string,
  mobileTarget?: 'ios' | 'android' | 'both'
): string {
  if (platform === 'mobile') {
    return `# ${appName} - Tauri Mobile App

Generated by Habits for ${mobileTarget === 'both' ? 'iOS and Android' : mobileTarget}.

## Prerequisites

- Node.js 18+
- Rust toolchain (install from https://rustup.rs/)
${
  mobileTarget === 'ios' || mobileTarget === 'both'
    ? `- Xcode 14+ (for iOS, macOS only)
- CocoaPods: \`sudo gem install cocoapods\``
    : ''
}
${
  mobileTarget === 'android' || mobileTarget === 'both'
    ? `- Java 17+ (for Android)
  - Install: \`brew install openjdk@17\` (macOS) or download from Oracle
  - Set JAVA_HOME: \`export JAVA_HOME=$(/usr/libexec/java_home -v 17)\` (macOS)
- Android SDK & NDK
  - Install Android Studio or Android Command Line Tools
  - Set ANDROID_HOME: \`export ANDROID_HOME=$HOME/Library/Android/sdk\` (macOS)
  - Install NDK: In Android Studio > SDK Manager > SDK Tools > NDK`
    : ''
}

## Setup

\`\`\`bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI & dependencies
npm install

# Initialize mobile platforms
${mobileTarget === 'ios' || mobileTarget === 'both' ? 'npx tauri ios init' : ''}
${mobileTarget === 'android' || mobileTarget === 'both' ? 'npx tauri android init' : ''}
\`\`\`

## Development

\`\`\`bash
${mobileTarget === 'ios' || mobileTarget === 'both' ? '# Run on iOS simulator\nnpm run ios' : ''}
${mobileTarget === 'android' || mobileTarget === 'both' ? '# Run on Android emulator\nnpm run android' : ''}
\`\`\`

## Build

\`\`\`bash
${mobileTarget === 'ios' || mobileTarget === 'both' ? '# Build for iOS\nnpm run build:ios' : ''}
${mobileTarget === 'android' || mobileTarget === 'both' ? '# Build for Android\nnpm run build:android' : ''}
\`\`\`

## Output Locations

${mobileTarget === 'ios' || mobileTarget === 'both' ? '- iOS: \`src-tauri/gen/apple/\`' : ''}
${mobileTarget === 'android' || mobileTarget === 'both' ? '- Android APK: \`src-tauri/gen/android/app/build/outputs/apk/\`' : ''}

## Backend URL

This app connects to: ${backendUrl}

To change the backend URL, edit \`tauri.conf.json\` and update the \`plugins.http.scope\` array.
`;
  } else {
    return `# ${appName} - Tauri Desktop App

This is a Tauri desktop application generated by Habits.

## Prerequisites

- Rust toolchain (install from https://rustup.rs/)
- Node.js 18+
${process.platform === 'darwin' ? '- Xcode Command Line Tools (macOS)' : ''}
${process.platform === 'win32' ? '- Microsoft Visual Studio C++ Build Tools (Windows)' : ''}
${
  process.platform === 'linux'
    ? '- System dependencies: `sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`'
    : ''
}

## Setup

\`\`\`bash
# Install dependencies
npm install

# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
# Build release binary
npm run build

# Build debug binary (faster)
npm run build:debug
\`\`\`

## Output Locations

After building, the application will be in:
- macOS: \`src-tauri/target/release/bundle/dmg/\`
- Windows: \`src-tauri/target/release/bundle/msi/\` or \`src-tauri/target/release/bundle/nsis/\`
- Linux: \`src-tauri/target/release/bundle/appimage/\`, \`deb/\`, or \`rpm/\`

## Backend URL

This app connects to: ${backendUrl}

To change the backend URL, edit \`tauri.conf.json\` and update the \`plugins.http.scope\` array.
`;
  }
}
