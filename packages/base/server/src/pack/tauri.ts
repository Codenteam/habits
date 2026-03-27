/**
 * Tauri Pack Handler (Desktop & Mobile)
 * 
 * Shared Tauri logic for generating desktop and mobile applications
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { LoggerFactory } from '@ha-bits/core/logger';
import { getTauriConfig, getTauriCapabilities } from './templates/tauri/tauri-config';
import { getTauriMain, getTauriLib } from './templates/tauri/tauri-main';
import { getTauriCargo } from './templates/tauri/tauri-cargo';
import { getTauriBuildScript } from './templates/tauri/tauri-build';
import { getTauriFetchProxyScript, TauriFetchProxyMode } from './templates/tauri/tauri-fetch-proxy';
import { getTauriGradleProperties, getTauriProguardRules } from './templates/tauri/tauri-gradle';
import { getTauriReadme } from './templates/tauri/tauri-readme';
import { getTauriOAuthHandlerScript } from './templates/tauri/tauri-oauth-handler';
import { TauriPlugin } from './bundle-generator-wrapper';
import { addOAuthPlugins, TAURI_OAUTH_PLUGINS } from './tauri-oauth-plugins';
import { processHtmlFile, InjectScript } from './html-asset-inliner';
import JSZip from 'jszip';
import {
  sanitizeStackName,
  createTmpWorkDir,
  getOrCreateWorkDir,
  syncWorkDir,
  createCleanupHandler,
  getMimeTypeForExtension,
  addDirectoryToZip,
  buildErrorMessage,
  PLACEHOLDER_ICON_BASE64,
} from './utils';

const logger = LoggerFactory.getRoot();

export interface TauriPackOptions {
  habits: any[];
  serverConfig: any;
  frontendHtml: string;
  frontendPath?: string; // Path to frontend directory with all assets
  backendUrl: string;
  buildBinary?: boolean;
  debugBuild?: boolean;
  stackName?: string;
  stackId?: string; // Stack UUID for build caching
  platform: 'desktop' | 'mobile';
  // Desktop-specific options
  desktopPlatform?: string;
  // Mobile-specific options
  mobileTarget?: 'ios' | 'android' | 'both';
  // App customization
  appName?: string;
  appIcon?: string; // base64 encoded image
  // Execution mode: 'full' for direct function calls (no server), 'api' for backend proxy
  executionMode?: TauriFetchProxyMode;
  // Embedded cortex bundle for 'full' mode (generated JS that includes workflows + bit execution)
  cortexBundle?: string;
  // Tauri plugins required by bits
  tauriPlugins?: TauriPlugin[];
  // Custom URL scheme for OAuth deep links (e.g., "myapp" for myapp://oauth/callback)
  deepLinkScheme?: string;
  // Whether any workflow has OAuth bits (auto-detected if not provided)
  hasOAuthBits?: boolean;
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
    debugBuild = false,
    stackName,
    stackId,
    platform,
    desktopPlatform,
    mobileTarget,
    appName: customAppName,
    appIcon,
    tauriPlugins: inputPlugins = [],
    deepLinkScheme,
    hasOAuthBits,
  } = options;

  // Auto-add OAuth plugins if OAuth bits are present or deepLinkScheme is provided
  const needsOAuthPlugins = hasOAuthBits || !!deepLinkScheme;
  const tauriPlugins = needsOAuthPlugins ? addOAuthPlugins(inputPlugins) : inputPlugins;
  
  if (needsOAuthPlugins && tauriPlugins.length > inputPlugins.length) {
    logger.info(`🔐 OAuth detected - added opener and deep-link plugins${deepLinkScheme ? ` (scheme: ${deepLinkScheme})` : ''}`);
  }

  const sanitizedStackName = sanitizeStackName(stackName);
  const isMobile = platform === 'mobile';
  
  // Use stackId for build caching - defaults to 'main' for consistent directory (habits-tauri-main)
  const { workDir, existed: isCachedBuild } = getOrCreateWorkDir('tauri', stackId || 'main');
  
  const appName = customAppName || 'Habits App';
  const appId = `com.habits.${appName.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;

  const cleanup = createCleanupHandler(workDir);

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
              'build:android': 'tauri android build --split-per-abi -t aarch64 --apk',
              'build:android:debug': 'tauri android build --split-per-abi -t aarch64 --apk --debug',
              'build:ios': 'tauri ios build',
              'build:ios:debug': 'tauri ios build --debug',
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

    // Create Tauri config (with deep-link scheme if provided)
    const tauriConfigJson = getTauriConfig({
      appId,
      appName,
      backendUrl,
      windowTitle: appName,
      deepLinkScheme,
    });

    const tauriConfig = JSON.parse(tauriConfigJson);

    // Calculate package name (same logic as in getTauriCargo)
    const packageName = appName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Create Cargo.toml with plugin dependencies
    const cargoToml = getTauriCargo({ 
      appName,
      plugins: tauriPlugins.map(p => ({ name: p.name, cargo: p.cargo })),
    });

    // Create main.rs (calls lib::run())
    const mainRs = getTauriMain(packageName);

    // Create lib.rs with plugin initialization
    const libRs = getTauriLib(tauriPlugins.map(p => ({ name: p.name, init: p.init })));

    // Create build.rs
    const buildRs = getTauriBuildScript();

    // Collect all plugin permissions
    const pluginPermissions = tauriPlugins.flatMap(p => p.permissions || []);

    // Create config.json
    const configJson = {
      backendUrl,
      appName,
      habits: habits.map((h: any) => h.name),
      serverConfig,
      ...(isMobile && { target: mobileTarget, framework: 'tauri' }),
    };


    // Create src-tauri directory structure
    const srcTauriDir = path.join(workDir, 'src-tauri');
    const srcDir = path.join(srcTauriDir, 'src');

    fs.mkdirSync(srcTauriDir, { recursive: true });
    fs.mkdirSync(srcDir, { recursive: true });
    // Don't create icons directory - let tauri icon command create and populate it

    // Write project files
    fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(path.join(srcTauriDir, 'tauri.conf.json'), JSON.stringify(tauriConfig, null, 2));
    fs.writeFileSync(path.join(workDir, 'config.json'), JSON.stringify(configJson, null, 2));

    fs.writeFileSync(path.join(srcTauriDir, 'Cargo.toml'), cargoToml);
    fs.writeFileSync(path.join(srcTauriDir, 'build.rs'), buildRs);
    fs.writeFileSync(path.join(srcDir, 'main.rs'), mainRs);
    fs.writeFileSync(path.join(srcDir, 'lib.rs'), libRs);

    // Create capabilities directory and file for plugin permissions
    const capabilitiesDir = path.join(srcTauriDir, 'capabilities');
    fs.mkdirSync(capabilitiesDir, { recursive: true });
    const capabilitiesJson = getTauriCapabilities(appId, pluginPermissions);
    fs.writeFileSync(path.join(capabilitiesDir, 'default.json'), capabilitiesJson);
    if (tauriPlugins.length > 0) {
      logger.info(`Added ${tauriPlugins.length} Tauri plugin(s) with permissions: ${pluginPermissions.join(', ')}`);
    }

    // Create placeholder icon files or use custom icon
    let iconBuffer: Buffer;
    
    if (appIcon) {
      // Custom icon provided as base64
      // Remove data URL prefix if present (e.g., "data:image/png;base64,")
      const base64Data = appIcon.includes(',') ? appIcon.split(',')[1] : appIcon;
      iconBuffer = Buffer.from(base64Data, 'base64');
      logger.info('Using custom app icon');
    } else {
      // Try to find default habits logo in multiple possible locations
      const possibleLogoPaths = [
        // When running from compiled dist
        path.join(__dirname, 'assets', 'logo.png'),
        // When running from source via tsx - relative to pack folder
        path.resolve(__dirname, '../../../../assets/logo.png'),
        // Relative to workspace root (process.cwd())
        path.join(process.cwd(), 'assets', 'logo.png'),
      ];
      
      let foundLogoPath: string | null = null;
      for (const logoPath of possibleLogoPaths) {
        if (fs.existsSync(logoPath)) {
          foundLogoPath = logoPath;
          break;
        }
      }
      
      if (foundLogoPath) {
        iconBuffer = fs.readFileSync(foundLogoPath);
        logger.info('Using default Habits logo', { path: foundLogoPath });
      } else {
        // Fallback to a placeholder 1x1 transparent PNG
        iconBuffer = Buffer.from(PLACEHOLDER_ICON_BASE64, 'base64');
        logger.info('Using placeholder icon (default logo not found)', { searched: possibleLogoPaths });
      }
    }
    fs.writeFileSync(path.join(workDir, 'app-icon.png'), iconBuffer);
    
    // Don't write icons manually - let tauri icon command generate all sizes from app-icon.png

    // Create www directory with frontend
    const wwwDir = path.join(workDir, 'www');
    fs.mkdirSync(wwwDir);

    // Copy all frontend files if frontendPath is provided
    if (options.frontendPath && fs.existsSync(options.frontendPath)) {
      logger.info(`Copying frontend files from ${options.frontendPath}`);
      const copyRecursive = (src: string, dest: string) => {
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);
          if (entry.isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true });
            copyRecursive(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      };
      copyRecursive(options.frontendPath, wwwDir);
    }

    // Determine execution mode
    const executionMode = options.executionMode || 'api';
    
    // Build scripts to inject into index.html
    const injectScripts: InjectScript[] = [];
    
    // Cortex bundle must come first for 'full' mode (provides HabitsBundle)
    if (executionMode === 'full' && options.cortexBundle) {
      injectScripts.push({
        id: 'cortex-bundle',
        content: options.cortexBundle,
      });
      logger.info('Will inline cortex-bundle.js for direct execution mode');
    }

    // Fetch proxy script (uses HabitsBundle for 'full' mode, or proxies to backend for 'api' mode)
    const fetchProxyScript = getTauriFetchProxyScript({
      mode: executionMode,
      backendUrl: executionMode === 'api' ? backendUrl : undefined,
    });
    injectScripts.push({
      id: 'habits-fetch-proxy',
      content: fetchProxyScript,
    });

    // OAuth handler if configured
    if (deepLinkScheme) {
      const oauthHandlerScript = getTauriOAuthHandlerScript({
        scheme: deepLinkScheme,
        timeout: 300000, // 5 minutes
      });
      injectScripts.push({
        id: 'oauth-handler',
        content: oauthHandlerScript,
      });
      logger.info('Will inline oauth-handler.js for OAuth deep link support');
    }

    // Process index.html to inline scripts
    const indexHtmlPath = path.join(wwwDir, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
      const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
      const processed = await processHtmlFile(htmlContent, {
        baseDir: wwwDir,
        injectScripts,
      });
      fs.writeFileSync(indexHtmlPath, processed.html);
      logger.info('Inlined scripts into index.html', { scripts: injectScripts.length });
    }

    // Create README
    const readme = getTauriReadme({ platform, appName, backendUrl, desktopPlatform, mobileTarget });
    fs.writeFileSync(path.join(workDir, 'README.md'), readme);

    if (buildBinary) {
      return await buildTauriBinary({
        workDir,
        platform,
        mobileTarget,
        desktopPlatform,
        sanitizedStackName,
        debugBuild,
        cleanup,
        isCachedBuild,
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
  debugBuild?: boolean;
  cleanup: () => void;
  isCachedBuild?: boolean;
}): Promise<TauriPackResult> {
  const { workDir, platform, mobileTarget, sanitizedStackName, debugBuild = false, cleanup, isCachedBuild = false } = options;

  logger.info(`Building Tauri ${platform} binary...`, { isCachedBuild });

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

    // Install npm dependencies (skip if cached build with existing node_modules)
    const nodeModulesPath = path.join(workDir, 'node_modules');
    if (isCachedBuild && fs.existsSync(nodeModulesPath)) {
      logger.info('Using cached node_modules, skipping npm install');
    } else {
      logger.info('Installing Tauri CLI...');
      execSync('npm install', { cwd: workDir, stdio: 'inherit', timeout: 120000 });
    }
    logger.info('Generating app icons from app-icon.png...');
    execSync('npm run tauri icon app-icon.png', { cwd: workDir, stdio: 'inherit', timeout: 120000 });
    if (platform === 'mobile') {
      return await buildMobileBinary({
        workDir,
        mobileTarget: mobileTarget!,
        sanitizedStackName,
        debugBuild,
        cleanup,
      });
    } else {
      return await buildDesktopBinary({
        workDir,
        sanitizedStackName,
        debugBuild,
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
  debugBuild?: boolean;
  cleanup: () => void;
}): Promise<TauriPackResult> {
  const { workDir, sanitizedStackName, debugBuild = false, cleanup } = options;

  // Regenerate icons just before build to ensure they are up to date
  logger.info('Regenerating app icons for desktop...');
  execSync('npm run tauri icon app-icon.png', { cwd: workDir, stdio: 'inherit', timeout: 120000 });

  const buildCmd = debugBuild ? 'npm run build:debug' : 'npm run build';
  logger.info(`Building Tauri desktop ${debugBuild ? '(debug mode) ' : ''}(this may take several minutes on first build)...`);
  execSync(buildCmd, { cwd: workDir, stdio: 'inherit', timeout: 600000 });

  // Find the built binary - debug builds go to src-tauri/target/debug/bundle
  const bundleDir = path.join(workDir, 'src-tauri', 'target', debugBuild ? 'debug' : 'release', 'bundle');
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
      builtFiles.push(...files.filter((f) => (fs.statSync(f).isFile() && ['.dmg', '.exe', '.msi', '.AppImage', '.deb', '.rpm', '.app'].includes(path.extname(f)))));
    }
  }

  if (builtFiles.length === 0) {
    throw new Error('Build completed but no artifacts found in bundle/');
  }

  logger.info('Built files:', { builtFiles });

  // Return the single built file
  const binaryFile = builtFiles[0];
  const ext = path.extname(binaryFile);
  const mimeType = getMimeTypeForExtension(ext);

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
  debugBuild?: boolean;
  cleanup: () => void;
}): Promise<TauriPackResult> {
  const { workDir, mobileTarget, sanitizedStackName, debugBuild = false, cleanup } = options;

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
    logger.info('Using:', { javaHome, workDir});

    const androidExecOpts = {
      cwd: workDir,
      stdio: 'inherit' as const,
      env: javaHome ? { ...process.env, JAVA_HOME: javaHome } : process.env,
    };

    try {
      execSync('npx tauri android init', androidExecOpts);
    } catch (error: any) {
      const errorMsg = buildErrorMessage(error);
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

    // Apply Android size optimizations
    logger.info('Applying Android size optimizations...');
    try {
      // Add gradle.properties for R8 optimization
      const gradlePropsPath = path.join(androidProjectDir, 'gradle.properties');
      const existingProps = fs.existsSync(gradlePropsPath) 
        ? fs.readFileSync(gradlePropsPath, 'utf8') 
        : '';
      fs.writeFileSync(gradlePropsPath, existingProps + '\n' + getTauriGradleProperties());
      
      // Add ProGuard rules
      const appDir = path.join(androidProjectDir, 'app');
      if (fs.existsSync(appDir)) {
        fs.writeFileSync(path.join(appDir, 'proguard-rules.pro'), getTauriProguardRules());
      }
      

      logger.info('Android optimizations applied successfully');
    } catch (optimError: any) {
      logger.warn('Failed to apply some Android optimizations:', { error: optimError.message });
      // Continue with build even if optimizations fail
    }
    // Regenerate icons to ensure they are included in the Android project
    logger.info('Regenerating app icons for Android...');
    execSync('npm run tauri icon app-icon.png', { cwd: workDir, stdio: 'inherit', timeout: 120000 });

    logger.info(`Building Android APK ${debugBuild ? '(debug mode) ' : ''}(optimized for aarch64 only)...`);
    try {
      // Build with explicit target - use Gradle properties to ensure aarch64 only
      const buildEnv = {
        ...androidExecOpts.env,
        // Additional environment variables to force aarch64
        TAURI_ANDROID_TARGETS: 'aarch64',
      };
      
      const buildCmd = debugBuild ? 'npm run build:android:debug' : 'npm run build:android';
      execSync(buildCmd, { 
        ...androidExecOpts, 
        env: buildEnv,
        timeout: 600000 
      });
    } catch (error: any) {
      throw new Error(buildErrorMessage(error, 'Android build failed'));
      
    }

    // Find the APK file - With optimizations, look for aarch64 specific build first
    // Debug builds go to different paths
    const arm64ApkPath = debugBuild
      ? path.join(workDir, 'src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk')
      : path.join(workDir, 'src-tauri/gen/android/app/build/outputs/apk/arm64/release/app-arm64-release-unsigned.apk');
    const universalApkPath = debugBuild
      ? path.join(workDir, 'src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk')
      : path.join(workDir, 'src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk');
    const releaseApkPath = debugBuild
      ? path.join(workDir, 'src-tauri/gen/android/app/build/outputs/apk/debug/app-debug.apk')
      : path.join(workDir, 'src-tauri/gen/android/app/build/outputs/apk/release/app-release-unsigned.apk');
    const debugApkPath = path.join(
      workDir,
      'src-tauri/gen/android/app/build/outputs/apk/debug/app-debug.apk'
    );

    // Try aarch64 first (optimized), then universal, then release, then debug
    let finalApkPath = arm64ApkPath;
    if (!fs.existsSync(finalApkPath)) {
      finalApkPath = universalApkPath;
    }
    if (!fs.existsSync(finalApkPath)) {
      finalApkPath = releaseApkPath;
    }
    if (!fs.existsSync(finalApkPath)) {
      finalApkPath = debugApkPath;
    }

    if (fs.existsSync(finalApkPath)) {
      const apkSize = fs.statSync(finalApkPath).size;
      const apkSizeMB = (apkSize / 1024 / 1024).toFixed(2);
      logger.info(`APK built successfully: ${apkSizeMB} MB`, { path: finalApkPath });
      
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
      const errorMsg = buildErrorMessage(error);
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

    logger.info('Regenerating app icons for iOS...');
    execSync('npm run tauri icon app-icon.png', { cwd: workDir, stdio: 'inherit', timeout: 120000 });
    logger.info(`Building iOS app${debugBuild ? ' (debug mode)' : ''}...`);
    try {
      const buildCmd = debugBuild ? 'npm run build:ios:debug' : 'npm run build:ios';
      execSync(buildCmd, { cwd: workDir, stdio: 'inherit', timeout: 600000 });
    } catch (error: any) {
      throw new Error(buildErrorMessage(error, 'iOS build failed'));
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
  addDirectoryToZip(workDir, zip);

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  cleanup();

  const suffix = platform === 'mobile' ? `-tauri-${mobileTarget}` : '-tauri';

  return {
    success: true,
    zipBuffer,
    zipFilename: `${sanitizedStackName}.${platform}${suffix}.zip`,
  };
}
