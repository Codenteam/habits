/**
 * Pack Command Handler
 * 
 * Main entry point for the `habits pack` command.
 * Orchestrates packing into different formats:
 * - single-executable: Node.js SEA binary (server/desktop/serverless)
 * - desktop: Electron app (frontend-only with backend URL)
 * - desktop-full: Full Electron app with embedded backend (Early Access)
 * - mobile: Cordova app (frontend-only with backend URL)
 * - mobile-full: Full mobile app with embedded backend (Early Access)
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'yaml';
import {
  PackCommandOptions,
  PackFormat,
  HabitData,
  ParsedConfig,
  PackResult,
} from './types';
import { packSingleExecutable } from './single-executable';
import { packDesktop, packDesktopForWeb, getSupportedDesktopPlatforms, WebDesktopPackResult } from './desktop';
import { packMobile, packMobileForWeb, getSupportedMobileTargets, WebMobilePackResult } from './mobile';
import { generateBundle, BundleGeneratorOptions, BundleGeneratorResult } from './bundle-generator-wrapper';
import { getTauriFetchProxyScript } from './templates/tauri/tauri-fetch-proxy';
import { getTauriLib, getTauriMain } from './templates/tauri/tauri-main';
import { getTauriCargo } from './templates/tauri/tauri-cargo';
import { getTauriCapabilities } from './templates/tauri/tauri-config';
import JSZip from 'jszip';
import { addDirectoryToZip } from './utils';
import { processHtmlFile, InjectScript } from './html-asset-inliner';

// Re-export types and utilities
export * from './types';
export { getSupportedDesktopPlatforms } from './desktop';
export { getSupportedMobileTargets } from './mobile';
export { packSingleExecutable } from './single-executable';
export { packDesktop } from './desktop';
export { packMobile } from './mobile';
export { generateBundle, BundleGeneratorOptions, BundleGeneratorResult } from './bundle-generator-wrapper';

/**
 * Get supported pack formats
 */
export function getSupportedPackFormats(): PackFormat[] {
  return ['single-executable', 'bundle', 'habit', 'tauri', 'desktop', 'desktop-full', 'mobile', 'mobile-full'];
}

/**
 * Run the pack command with the given options
 */
export async function runPackCommand(options: PackCommandOptions): Promise<PackResult> {
  const { config: configFile, format } = options;

  // Resolve config path
  const configPath = path.resolve(configFile);
  const configDir = path.dirname(configPath);

  if (!fs.existsSync(configPath)) {
    return {
      success: false,
      error: `Config file not found: ${configPath}`,
      format,
    };
  }

  // Parse config file
  const configContent = fs.readFileSync(configPath, 'utf8');
  const config = yaml.parse(configContent) as ParsedConfig;

  // Load habits from config
  const habits = loadHabits(config, configDir);

  if (habits.length === 0) {
    return {
      success: false,
      error: 'No valid habits found in config file',
      format,
    };
  }

  // Load .env content only if includeEnv is true
  let envContent = '';
  const envPath = path.join(configDir, '.env');
  if (options.includeEnv && fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('   📋 Including .env values in bundle');
  } else if (fs.existsSync(envPath) && !options.includeEnv) {
    console.log('   🔒 Skipping .env (use --include-env to include)');
  }

  // Route to appropriate handler
  switch (format) {
    case 'bundle':
      return packBundle({
        configPath,
        configDir,
        config,
        habits,
        envContent,
        output: options.output,
      });

    case 'tauri':
      return packTauri({
        configPath,
        configDir,
        config,
        habits,
        envContent,
        output: options.output,
      });

    case 'single-executable':
      return packSingleExecutable({
        configPath,
        configDir,
        config,
        habits,
        envContent,
        platform: options.platform || 'current',
        output: options.output,
      });

    case 'desktop':
      if (!options.backendUrl) {
        return {
          success: false,
          error: 'Desktop format requires --backend-url option',
          format,
        };
      }
      return packDesktop({
        configPath,
        configDir,
        config,
        habits,
        backendUrl: options.backendUrl,
        desktopPlatform: options.desktopPlatform || 'all',
        output: options.output,
      });

    case 'desktop-full':
      return packDesktopFull({
        configPath,
        configDir,
        config,
        habits,
        envContent,
        desktopPlatform: options.desktopPlatform || 'all',
        output: options.output,
        appName: options.appName,
        appIcon: options.appIcon,
        debug: options.debug,
      });

    case 'mobile':
      if (!options.backendUrl) {
        return {
          success: false,
          error: 'Mobile format requires --backend-url option',
          format,
        };
      }
      return packMobile({
        configPath,
        configDir,
        config,
        habits,
        backendUrl: options.backendUrl,
        mobileTarget: options.mobileTarget || 'both',
        output: options.output,
      });

    case 'mobile-full':
      return packMobileFull({
        configPath,
        configDir,
        config,
        habits,
        envContent,
        mobileTarget: options.mobileTarget || 'both',
        output: options.output,
        appName: options.appName,
        appIcon: options.appIcon,
        debug: options.debug,
      });

    case 'habit':
      return packHabitFile({
        configPath,
        configDir,
        config,
        habits,
        envContent,
        output: options.output,
      });

    default:
      return {
        success: false,
        error: `Unknown format: ${format}. Supported: ${getSupportedPackFormats().join(', ')}`,
        format,
      };
  }
}

// ============================================================================
// Bundle Pack Handler
// ============================================================================

interface PackBundleOptions {
  configPath: string;
  configDir: string;
  config: ParsedConfig;
  habits: HabitData[];
  envContent: string;
  output?: string;
}

/**
 * Parse .env content into key-value object
 */
function parseEnvContent(envContent: string): Record<string, string> {
  const envVars: Record<string, string> = {};
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim();
    }
  }
  return envVars;
}

/**
 * Pack habits into a standalone JavaScript bundle
 */
async function packBundle(options: PackBundleOptions): Promise<PackResult> {
  const { config, habits, envContent, output, configDir } = options;

  console.log('\n📦 Generating JavaScript bundle...\n');

  // Parse env content
  const envVars = parseEnvContent(envContent);

  // Convert HabitData[] to workflow format expected by generateBundle
  // Spread all habit properties to preserve output, input, description, etc.
  const workflows = habits.map(h => ({
    ...h,
    id: h.slug,
  }));

  // Generate bundle via npx @ha-bits/bundle-generator
  const bundleResult = await generateBundle({
    habits: workflows,
    appName: config.name || 'HabitsApp',
    envVars,
  });

  if (!bundleResult.success) {
    return {
      success: false,
      error: bundleResult.error || 'Bundle generation failed',
      format: 'bundle',
    };
  }

  // Determine output path
  const outputPath = output || path.join(configDir, 'dist', 'cortex-bundle.js');
  const outputDir = path.dirname(outputPath);

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Write bundle
  fs.writeFileSync(outputPath, bundleResult.code!);

  console.log(`   ✅ Bundle created: ${outputPath}`);
  console.log(`   📦 Size: ${((bundleResult.size || 0) / 1024).toFixed(2)} KB`);
  console.log(`   🧩 Bundled bits: ${bundleResult.bundledBits?.join(', ') || 'none'}`);

  return {
    success: true,
    outputPath,
    format: 'bundle',
    size: bundleResult.size,
  };
}

// ============================================================================
// Habit File Pack Handler (.habit zip archive)
// ============================================================================

interface PackHabitFileOptions {
  configPath: string;
  configDir: string;
  config: ParsedConfig;
  habits: HabitData[];
  envContent: string;
  output?: string;
}

/**
 * Pack habits into a .habit file (zip archive containing index.html, cortex-bundle.js, and frontend assets)
 * 
 * The .habit file is a self-contained package that can be opened by the Cortex app.
 * It requires a frontend path to be specified in the stack.yaml (server.frontend).
 * 
 * HTML files are processed to:
 * - Remove Tailwind CDN and generate CSS via Tailwind CLI
 * - Inline all external CSS/JS files
 * - Inline all images as base64 data URLs
 */
async function packHabitFile(options: PackHabitFileOptions): Promise<PackResult> {
  const { config, habits, envContent, output, configDir, configPath } = options;

  console.log('\n📦 Generating .habit file...\n');

  // Validate that frontend is specified
  if (!config.server?.frontend) {
    return {
      success: false,
      error: 'Habit format requires server.frontend to be specified in stack.yaml',
      format: 'habit',
    };
  }

  // Resolve frontend path
  const frontendPath = path.isAbsolute(config.server.frontend)
    ? config.server.frontend
    : path.resolve(configDir, config.server.frontend);

  if (!fs.existsSync(frontendPath)) {
    return {
      success: false,
      error: `Frontend directory not found: ${frontendPath}`,
      format: 'habit',
    };
  }

  const indexPath = path.join(frontendPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return {
      success: false,
      error: `index.html not found in frontend directory: ${frontendPath}`,
      format: 'habit',
    };
  }

  // Parse env content
  const envVars = parseEnvContent(envContent);

  // Convert HabitData[] to workflow format expected by generateBundle
  const workflows = habits.map(h => ({
    ...h,
    id: h.slug,
  }));

  // Generate bundle via @ha-bits/bundle-generator
  const bundleResult = await generateBundle({
    habits: workflows,
    appName: config.name || 'HabitsApp',
    envVars,
  });

  if (!bundleResult.success) {
    return {
      success: false,
      error: bundleResult.error || 'Bundle generation failed',
      format: 'habit',
    };
  }

  // Note: We do NOT inject cortex-bundle.js into HTML for .habit format
  // When running via cortex server (Node.js), the server handles workflow execution
  // via normal /api/* endpoints. The cortex-bundle.js is only used by Tauri apps
  // which inject it at runtime.

  // Create zip archive
  const zip = new JSZip();

  // Track which files are inlined (so we don't add them separately)
  const inlinedFiles = new Set<string>();

  // Compute frontend directory name from config (e.g., "frontend" from "./frontend")
  const frontendDirName = config.server!.frontend!.replace(/^\.[\/\\]/, '');

  // Generate fetch proxy script for intercepting /api/* calls (executes via HabitsBundle)
  const fetchProxyScript = getTauriFetchProxyScript({ mode: 'full' });

  // Scripts to inject into HTML files (only fetch-proxy, NOT cortex-bundle)
  // cortex-bundle.js is kept as a separate file and injected at runtime by Tauri apps
  // Node.js server handles /api/* natively without needing the bundle
  const injectScripts: InjectScript[] = [
    { id: 'habits-fetch-proxy', content: fetchProxyScript },
  ];

  // Process all HTML files in the frontend directory
  console.log('   🔧 Processing HTML files for offline use...');
  const processedHtmlFiles = await processHtmlFilesInDirectory(frontendPath, inlinedFiles, injectScripts);

  // Process each HTML file (inline CSS/JS/images but don't inject bundle scripts)
  for (const [relativePath, processedResult] of processedHtmlFiles) {
    const processedHtml = processedResult.html;

    // Log processing results
    if (processedResult.tailwindProcessed) {
      console.log(`   ✨ ${relativePath}: Tailwind CSS generated`);
    }
    if (processedResult.cssFilesInlined > 0) {
      console.log(`   📝 ${relativePath}: ${processedResult.cssFilesInlined} CSS file(s) inlined`);
    }
    if (processedResult.jsFilesInlined > 0) {
      console.log(`   📝 ${relativePath}: ${processedResult.jsFilesInlined} JS file(s) inlined`);
    }
    if (processedResult.imagesInlined > 0) {
      console.log(`   🖼️  ${relativePath}: ${processedResult.imagesInlined} image(s) inlined`);
    }

    // Add processed (inlined) HTML files under the frontend directory for offline use
    // Scripts (cortex-bundle, fetch-proxy) are already inlined by processHtmlFile
    const htmlZipPath = path.join(frontendDirName, relativePath);
    zip.file(htmlZipPath, processedHtml);

    // Also add original HTML files under frontend-src/ for base server to use if needed
    const originalHtmlPath = path.join(frontendPath, relativePath);
    const originalHtml = fs.readFileSync(originalHtmlPath, 'utf8');
    const srcHtmlZipPath = path.join(`${frontendDirName}-src`, relativePath);
    zip.file(srcHtmlZipPath, originalHtml);
  }

  // Add remaining frontend files (excluding already processed HTML and inlined assets)
  // Store under the original frontend directory name to preserve structure
  addFrontendFilesToZip(frontendPath, zip, inlinedFiles, processedHtmlFiles, undefined, frontendDirName);
  
  // Also add original frontend files under frontend-src/ (including CSS, JS that were inlined)
  addOriginalFrontendFilesToZip(frontendPath, zip, `${frontendDirName}-src`);

  // Add cortex-bundle.js as a separate file (Tauri apps inject it at runtime)
  zip.file('cortex-bundle.js', bundleResult.code!);

  // Add habit YAML files using their relative paths to preserve directory structure
  // (e.g., "habits/generate-recipe.yaml" instead of just "generate-recipe.yaml")
  for (const habit of habits) {
    const habitPath = habit.relativePath || habit.filename;
    zip.file(habitPath, habit.content);
  }

  // Add stack.yaml to preserve the original configuration
  const stackYamlContent = fs.readFileSync(configPath, 'utf8');
  zip.file('stack.yaml', stackYamlContent);

  // Generate zip buffer
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

  // Determine output path
  const stackName = config.name || path.basename(configDir);
  const sanitizedName = stackName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  const outputPath = output || path.join(configDir, 'dist', `${sanitizedName}.habit`);
  const outputDir = path.dirname(outputPath);

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Write .habit file
  fs.writeFileSync(outputPath, zipBuffer);

  const habitSize = zipBuffer.length;
  console.log(`   ✅ Habit file created: ${outputPath}`);
  console.log(`   📦 Size: ${(habitSize / 1024).toFixed(2)} KB`);
  console.log(`   🧩 Bundled bits: ${bundleResult.bundledBits?.join(', ') || 'none'}`);
  console.log(`   📄 Frontend: ${frontendPath}`);
  console.log(`   🌐 Offline ready: All assets inlined`);

  return {
    success: true,
    outputPath,
    format: 'habit',
    size: habitSize,
  };
}

/**
 * Process all HTML files in a directory to inline assets
 */
async function processHtmlFilesInDirectory(
  dir: string,
  inlinedFiles: Set<string>,
  injectScripts?: InjectScript[]
): Promise<Map<string, { html: string; tailwindProcessed: boolean; cssFilesInlined: number; jsFilesInlined: number; imagesInlined: number }>> {
  const results = new Map<string, { html: string; tailwindProcessed: boolean; cssFilesInlined: number; jsFilesInlined: number; imagesInlined: number }>();

  const processDir = async (currentDir: string) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await processDir(fullPath);
      } else if (entry.name.endsWith('.html') || entry.name.endsWith('.htm')) {
        const htmlContent = fs.readFileSync(fullPath, 'utf8');
        const relativePath = path.relative(dir, fullPath);
        const htmlDir = path.dirname(fullPath);

        // Track files that get inlined
        const beforeInline = (callback: (relativePath: string) => void) => {
          // Track CSS files
          const cssMatches = htmlContent.matchAll(/<link[^>]*href=["']([^"']+\.css)["'][^>]*>/gi);
          for (const match of cssMatches) {
            const href = match[1];
            if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('//')) {
              const cssRelative = path.relative(dir, path.resolve(htmlDir, href));
              inlinedFiles.add(cssRelative);
            }
          }

          // Track JS files
          const jsMatches = htmlContent.matchAll(/<script[^>]*src=["']([^"']+\.js)["'][^>]*>/gi);
          for (const match of jsMatches) {
            const src = match[1];
            if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('//') && !src.includes('cortex-bundle')) {
              const jsRelative = path.relative(dir, path.resolve(htmlDir, src));
              inlinedFiles.add(jsRelative);
            }
          }

          // Track image files
          const imgMatches = htmlContent.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi);
          for (const match of imgMatches) {
            const src = match[1];
            if (!src.startsWith('data:') && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('//')) {
              const imgRelative = path.relative(dir, path.resolve(htmlDir, src));
              inlinedFiles.add(imgRelative);
            }
          }
        };

        beforeInline(() => {});

        // Process the HTML file
        const processed = await processHtmlFile(htmlContent, {
          baseDir: htmlDir,
          injectScripts,
        });

        results.set(relativePath, processed);
      }
    }
  };

  await processDir(dir);
  return results;
}

/**
 * Add frontend files to zip, excluding already processed HTML and inlined files
 * @param prefix - Optional prefix to prepend to all paths (e.g., "frontend" to store as "frontend/file.js")
 */
function addFrontendFilesToZip(
  dir: string,
  zip: JSZip,
  inlinedFiles: Set<string>,
  processedHtmlFiles: Map<string, any>,
  baseDir?: string,
  prefix?: string
): void {
  const base = baseDir || dir;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    const relativePath = path.relative(base, filePath);

    if (stat.isDirectory()) {
      addFrontendFilesToZip(filePath, zip, inlinedFiles, processedHtmlFiles, base, prefix);
    } else {
      // Skip HTML files (already processed)
      if (file.endsWith('.html') || file.endsWith('.htm')) {
        continue;
      }

      // Skip files that were inlined into HTML
      if (inlinedFiles.has(relativePath)) {
        continue;
      }

      // Add other files, with optional prefix to preserve directory structure
      const zipPath = prefix ? path.join(prefix, relativePath) : relativePath;
      zip.file(zipPath, fs.readFileSync(filePath));
    }
  }
}

/**
 * Add all original frontend files to zip (including HTML, CSS, JS - nothing inlined/processed)
 * Used to preserve original source files for base server to serve with external assets
 */
function addOriginalFrontendFilesToZip(
  dir: string,
  zip: JSZip,
  prefix: string,
  baseDir?: string
): void {
  const base = baseDir || dir;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    const relativePath = path.relative(base, filePath);

    if (stat.isDirectory()) {
      addOriginalFrontendFilesToZip(filePath, zip, prefix, base);
    } else {
      // Skip HTML files (already added separately with original content)
      if (file.endsWith('.html') || file.endsWith('.htm')) {
        continue;
      }

      // Add all other files (CSS, JS, images, etc.) without any processing
      const zipPath = path.join(prefix, relativePath);
      zip.file(zipPath, fs.readFileSync(filePath));
    }
  }
}

// ============================================================================
// Desktop Full Pack Handler
// ============================================================================

interface PackDesktopFullOptions {
  configPath: string;
  configDir: string;
  config: ParsedConfig;
  habits: HabitData[];
  envContent: string;
  desktopPlatform: 'dmg' | 'exe' | 'appimage' | 'deb' | 'rpm' | 'msi' | 'all';
  output?: string;
  appName?: string;
  appIcon?: string;
  debug?: boolean;
}

/**
 * Pack habits into a full desktop app with embedded backend (Tauri-based)
 */
async function packDesktopFull(options: PackDesktopFullOptions): Promise<PackResult> {
  const { config, habits, envContent, desktopPlatform, output, configDir, appName: customAppName, appIcon: customAppIcon } = options;

  console.log('\n🖥️  Generating full desktop app with embedded backend...\n');

  // Parse env content
  const envVars = parseEnvContent(envContent);

  // Read frontend HTML
  const frontendPath = config.server?.frontend
    ? path.isAbsolute(config.server.frontend)
      ? config.server.frontend
      : path.resolve(configDir, config.server.frontend)
    : path.join(configDir, 'frontend');

  if (!fs.existsSync(frontendPath)) {
    return {
      success: false,
      error: `Frontend directory not found: ${frontendPath}. Desktop pack requires a frontend folder.`,
      format: 'desktop-full',
    };
  }

  const indexPath = path.join(frontendPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return {
      success: false,
      error: `index.html not found in frontend directory: ${frontendPath}`,
      format: 'desktop-full',
    };
  }

  const frontendHtml = fs.readFileSync(indexPath, 'utf8');

  // Read app icon - prefer CLI option, then look in standard locations
  let appIcon: string | undefined;
  if (customAppIcon) {
    // Resolve from CWD first (CLI passes paths relative to CWD), then from configDir
    const iconPathFromCwd = path.resolve(process.cwd(), customAppIcon);
    const iconPathFromConfig = path.resolve(configDir, customAppIcon);
    const iconPath = fs.existsSync(iconPathFromCwd) ? iconPathFromCwd 
      : fs.existsSync(iconPathFromConfig) ? iconPathFromConfig 
      : null;
    if (iconPath) {
      appIcon = fs.readFileSync(iconPath).toString('base64');
      console.log(`   🎨 Using app icon: ${iconPath}`);
    } else {
      console.log(`   ⚠️  Icon not found: ${customAppIcon}`);
    }
  }

  // Determine app name - prefer CLI option, then stack.yaml name
  const appName = customAppName || config.name || 'Habits App';
  console.log(`   🖥️  App name: ${appName}`);

  // Convert habits to the format expected by packDesktopForWeb
  // Spread all habit properties to preserve output, input, description, etc.
  const workflowsForPack = habits.map(h => ({
    ...h,
    id: h.slug,
  }));

  // Call packDesktopForWeb with full execution mode
  const result: WebDesktopPackResult = await packDesktopForWeb({
    habits: workflowsForPack,
    serverConfig: config.server || {},
    frontendHtml,
    backendUrl: '', // Not needed for full mode
    desktopPlatform,
    buildBinary: true,
    debugBuild: options.debug || false,
    framework: 'tauri',
    stackName: appName,
    appName,
    appIcon,
    executionMode: 'full',
    envVars,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'Desktop full pack failed',
      format: 'desktop-full',
    };
  }

  // Handle binary output
  if (result.binaryPath) {
    const outputPath = output || path.join(configDir, 'dist', result.binaryFilename || 'app.dmg');
    const outputDir = path.dirname(outputPath);
    fs.mkdirSync(outputDir, { recursive: true });
    
    fs.copyFileSync(result.binaryPath, outputPath);
    const stat = fs.statSync(outputPath);
    
    console.log(`\n✅ Desktop app created successfully!`);
    console.log(`   🖥️  Output: ${outputPath}`);
    console.log(`   📦 Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   🔌 Mode: Standalone (no backend required)`);

    // Cleanup temp files
    if (result.cleanup) {
      result.cleanup();
    }

    return {
      success: true,
      outputPath,
      format: 'desktop-full',
      size: stat.size,
    };
  }

  // Handle zip output (project files)
  if (result.zipBuffer) {
    const outputPath = output || path.join(configDir, 'dist', result.zipFilename || 'desktop-project.zip');
    const outputDir = path.dirname(outputPath);
    fs.mkdirSync(outputDir, { recursive: true });
    
    fs.writeFileSync(outputPath, result.zipBuffer);
    
    console.log(`\n✅ Desktop project created successfully!`);
    console.log(`   📦 Output: ${outputPath}`);
    console.log(`   📋 Extract and follow the README to build`);

    if (result.cleanup) {
      result.cleanup();
    }

    return {
      success: true,
      outputPath,
      format: 'desktop-full',
      size: result.zipBuffer.length,
    };
  }

  return {
    success: false,
    error: 'Unexpected result from desktop pack',
    format: 'desktop-full',
  };
}

// ============================================================================
// Mobile Full Pack Handler
// ============================================================================

interface PackMobileFullOptions {
  configPath: string;
  configDir: string;
  config: ParsedConfig;
  habits: HabitData[];
  envContent: string;
  mobileTarget: 'ios' | 'android' | 'both';
  output?: string;
  appName?: string;
  appIcon?: string;
  debug?: boolean;
}

/**
 * Pack habits into a full mobile app with embedded backend (Tauri-based)
 */
async function packMobileFull(options: PackMobileFullOptions): Promise<PackResult> {
  const { config, habits, envContent, mobileTarget, output, configDir, appName: customAppName, appIcon: customAppIcon } = options;

  console.log('\n📱 Generating full mobile app with embedded backend...\n');

  // Parse env content
  const envVars = parseEnvContent(envContent);

  // Read frontend HTML
  const frontendPath = config.server?.frontend
    ? path.isAbsolute(config.server.frontend)
      ? config.server.frontend
      : path.resolve(configDir, config.server.frontend)
    : path.join(configDir, 'frontend');

  if (!fs.existsSync(frontendPath)) {
    return {
      success: false,
      error: `Frontend directory not found: ${frontendPath}. Mobile pack requires a frontend folder.`,
      format: 'mobile-full',
    };
  }

  const indexPath = path.join(frontendPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return {
      success: false,
      error: `index.html not found in frontend directory: ${frontendPath}`,
      format: 'mobile-full',
    };
  }

  const frontendHtml = fs.readFileSync(indexPath, 'utf8');

  // Read app icon - prefer CLI option, then look in standard locations
  let appIcon: string | undefined;
  if (customAppIcon) {
    // Resolve from CWD first (CLI passes paths relative to CWD), then from configDir
    const iconPathFromCwd = path.resolve(process.cwd(), customAppIcon);
    const iconPathFromConfig = path.resolve(configDir, customAppIcon);
    const iconPath = fs.existsSync(iconPathFromCwd) ? iconPathFromCwd 
      : fs.existsSync(iconPathFromConfig) ? iconPathFromConfig 
      : null;
    if (iconPath) {
      appIcon = fs.readFileSync(iconPath).toString('base64');
      console.log(`   🎨 Using app icon: ${iconPath}`);
    } else {
      console.log(`   ⚠️  Icon not found: ${customAppIcon}`);
    }
  } else {
    const iconPaths = [
      path.join(frontendPath, 'Icon.png'),
      path.join(frontendPath, 'icon.png'),
      path.join(configDir, 'Icon.png'),
      path.join(configDir, 'icon.png'),
    ];
    for (const iconPath of iconPaths) {
      if (fs.existsSync(iconPath)) {
        appIcon = fs.readFileSync(iconPath).toString('base64');
        console.log(`   🎨 Using app icon: ${iconPath}`);
        break;
      }
    }
  }

  // Determine app name - prefer CLI option, then stack.yaml name
  const appName = customAppName || config.name || 'Habits App';
  console.log(`   📱 App name: ${appName}`);

  // Convert habits to the format expected by packMobileForWeb
  // Spread all habit properties to preserve output, input, description, etc.
  const workflowsForPack = habits.map(h => ({
    ...h,
    id: h.slug,
  }));

  // Call packMobileForWeb with full execution mode
  const result: WebMobilePackResult = await packMobileForWeb({
    habits: workflowsForPack,
    serverConfig: config.server || {},
    frontendHtml,
    frontendPath,
    backendUrl: '', // Not needed for full mode
    mobileTarget,
    buildBinary: true,
    debugBuild: options.debug || false,
    framework: 'tauri',
    stackName: appName,
    appName,
    appIcon,
    executionMode: 'full',
    envVars,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'Mobile full pack failed',
      format: 'mobile-full',
    };
  }

  // Handle binary output
  if (result.binaryPath) {
    const outputPath = output || path.join(configDir, 'dist', result.binaryFilename || 'app.apk');
    const outputDir = path.dirname(outputPath);
    fs.mkdirSync(outputDir, { recursive: true });
    
    fs.copyFileSync(result.binaryPath, outputPath);
    const stat = fs.statSync(outputPath);
    
    console.log(`\n✅ Mobile app created successfully!`);
    console.log(`   📱 Output: ${outputPath}`);
    console.log(`   📦 Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   🔌 Mode: Standalone (no backend required)`);

    // Cleanup temp files
    if (result.cleanup) {
      result.cleanup();
    }

    return {
      success: true,
      outputPath,
      format: 'mobile-full',
      size: stat.size,
    };
  }

  // Handle zip output (project files)
  if (result.zipBuffer) {
    const outputPath = output || path.join(configDir, 'dist', result.zipFilename || 'mobile-project.zip');
    const outputDir = path.dirname(outputPath);
    fs.mkdirSync(outputDir, { recursive: true });
    
    fs.writeFileSync(outputPath, result.zipBuffer);
    
    console.log(`\n✅ Mobile project created successfully!`);
    console.log(`   📦 Output: ${outputPath}`);
    console.log(`   📋 Extract and follow the README to build`);

    if (result.cleanup) {
      result.cleanup();
    }

    return {
      success: true,
      outputPath,
      format: 'mobile-full',
      size: result.zipBuffer.length,
    };
  }

  return {
    success: false,
    error: 'Unexpected result from mobile pack',
    format: 'mobile-full',
  };
}

// ============================================================================
// Tauri Pack Handler
// ============================================================================

interface PackTauriOptions {
  configPath: string;
  configDir: string;
  config: ParsedConfig;
  habits: HabitData[];
  envContent: string;
  output?: string;
}

/**
 * Pack habits into a Tauri project
 */
async function packTauri(options: PackTauriOptions): Promise<PackResult> {
  const { config, habits, envContent, output, configDir } = options;

  console.log('\n🖥️  Generating Tauri project...\n');

  // First generate the bundle via npx @ha-bits/bundle-generator
  const envVars = parseEnvContent(envContent);
  // Spread all habit properties to preserve output, input, description, etc.
  const workflows = habits.map(h => ({
    ...h,
    id: h.slug,
  }));

  const bundleResult = await generateBundle({
    habits: workflows,
    appName: config.name || 'HabitsApp',
    envVars,
  });

  if (!bundleResult.success) {
    return {
      success: false,
      error: bundleResult.error || 'Bundle generation failed',
      format: 'tauri',
    };
  }

  // Create Tauri project structure
  const appName = config.name || 'habits-app';
  const tauriDir = output || path.join(configDir, 'dist', 'tauri-app');
  
  console.log(`   📁 Creating Tauri project: ${tauriDir}`);

  // Clean and create directory
  fs.rmSync(tauriDir, { recursive: true, force: true });
  fs.mkdirSync(tauriDir, { recursive: true });

  // Create package.json
  const packageJson = {
    name: appName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    version: '1.0.0',
    description: `${appName} - Habits Tauri App`,
    scripts: {
      tauri: 'tauri',
      dev: 'tauri dev',
      build: 'tauri build',
    },
    devDependencies: {
      '@tauri-apps/cli': '^2',
      '@tauri-apps/api': '^2',
    },
  };
  fs.writeFileSync(
    path.join(tauriDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create www directory
  const wwwDir = path.join(tauriDir, 'www');
  fs.mkdirSync(wwwDir, { recursive: true });

  // Copy frontend from config or generate default
  const frontendPath = config.server?.frontend;
  if (frontendPath) {
    const frontendDir = path.isAbsolute(frontendPath)
      ? frontendPath
      : path.resolve(configDir, frontendPath);
    
    if (fs.existsSync(frontendDir)) {
      // Copy all frontend files
      copyDirRecursive(frontendDir, wwwDir);
      console.log(`   📁 Copied frontend from: ${frontendDir}`);
    } else {
      console.warn(`   ⚠️  Frontend path not found: ${frontendDir}, using default`);
      fs.writeFileSync(path.join(wwwDir, 'index.html'), generateDefaultHtml(appName));
    }
  } else {
    fs.writeFileSync(path.join(wwwDir, 'index.html'), generateDefaultHtml(appName));
  }

  // Copy bundle
  fs.writeFileSync(path.join(wwwDir, 'cortex-bundle.js'), bundleResult.code!);

  // Create fetch proxy script for intercepting /api/* calls (full mode = direct execution)
  const fetchProxyScript = getTauriFetchProxyScript({ mode: 'full' });
  fs.writeFileSync(path.join(wwwDir, 'habits-fetch-proxy.js'), fetchProxyScript);

  // Inject scripts into index.html if it exists
  const indexHtmlPath = path.join(wwwDir, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    let html = fs.readFileSync(indexHtmlPath, 'utf8');
    const scriptsToInject = `<script src="cortex-bundle.js"></script>\n<script src="habits-fetch-proxy.js"></script>\n`;
    
    // Inject before </head> or at start of <body>
    if (html.includes('</head>')) {
      html = html.replace('</head>', scriptsToInject + '</head>');
    } else if (html.includes('<body>')) {
      html = html.replace('<body>', '<body>\n' + scriptsToInject);
    } else {
      html = scriptsToInject + html;
    }
    fs.writeFileSync(indexHtmlPath, html);
  }

  // Create src-tauri structure
  const srcTauriDir = path.join(tauriDir, 'src-tauri');
  const iconsDir = path.join(srcTauriDir, 'icons');
  fs.mkdirSync(path.join(srcTauriDir, 'src'), { recursive: true });
  fs.mkdirSync(iconsDir, { recursive: true });

  // Create placeholder icons (1x1 transparent PNG) - Tauri requires these
  const PLACEHOLDER_ICON = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(path.join(iconsDir, 'icon.png'), PLACEHOLDER_ICON);
  fs.writeFileSync(path.join(iconsDir, '32x32.png'), PLACEHOLDER_ICON);
  fs.writeFileSync(path.join(iconsDir, '128x128.png'), PLACEHOLDER_ICON);
  fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), PLACEHOLDER_ICON);
  fs.writeFileSync(path.join(iconsDir, 'icon.icns'), PLACEHOLDER_ICON);
  fs.writeFileSync(path.join(iconsDir, 'icon.ico'), PLACEHOLDER_ICON);

  // Tauri config
  const tauriConfig = {
    productName: appName,
    version: '0.1.0',
    identifier: `com.habits.${appName.toLowerCase().replace(/[^a-z0-9]+/g, '')}`,
    build: {
      frontendDist: '../www',
    },
    bundle: {
      active: true,
      icon: [
        'icons/32x32.png',
        'icons/128x128.png',
        'icons/128x128@2x.png',
        'icons/icon.icns',
        'icons/icon.ico',
      ],
    },
    app: {
      withGlobalTauri: true,
      windows: [{
        title: appName,
        width: 1000,
        height: 700,
      }],
    },
  };
  fs.writeFileSync(
    path.join(srcTauriDir, 'tauri.conf.json'),
    JSON.stringify(tauriConfig, null, 2)
  );

  // Get Tauri plugins from bundle result
  const tauriPlugins = bundleResult.tauriPlugins || [];
  if (tauriPlugins.length > 0) {
    console.log(`   🔌 Found ${tauriPlugins.length} Tauri plugin(s): ${tauriPlugins.map(p => p.name).join(', ')}`);
  }

  // Cargo.toml with plugins
  const safeAppName = appName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const cargoToml = getTauriCargo({
    appName: safeAppName,
    plugins: tauriPlugins.map(p => ({ name: p.name, cargo: p.cargo })),
  });
  fs.writeFileSync(path.join(srcTauriDir, 'Cargo.toml'), cargoToml);

  // build.rs
  fs.writeFileSync(path.join(srcTauriDir, 'build.rs'), 'fn main() { tauri_build::build() }');

  // main.rs
  const mainRs = getTauriMain(safeAppName);
  fs.writeFileSync(path.join(srcTauriDir, 'src', 'main.rs'), mainRs);

  // lib.rs with plugins initialized
  const libRs = getTauriLib(tauriPlugins.map(p => ({ name: p.name, init: p.init })));
  fs.writeFileSync(path.join(srcTauriDir, 'src', 'lib.rs'), libRs);

  // Create capabilities/default.json for plugin permissions
  const pluginPermissions = tauriPlugins.flatMap(p => p.permissions || []);
  if (pluginPermissions.length > 0) {
    const capabilitiesDir = path.join(srcTauriDir, 'capabilities');
    fs.mkdirSync(capabilitiesDir, { recursive: true });
    const capabilities = getTauriCapabilities(`com.habits.${safeAppName}`, pluginPermissions);
    fs.writeFileSync(path.join(capabilitiesDir, 'default.json'), capabilities);
  }

  console.log(`   ✅ Tauri project created: ${tauriDir}`);
  console.log(`\n   To run the Tauri app:`);
  console.log(`     cd ${tauriDir}`);
  console.log(`     npm install`);
  console.log(`     npm run tauri dev`);

  return {
    success: true,
    outputPath: tauriDir,
    format: 'tauri',
  };
}

/**
 * Copy directory recursively
 */
function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
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
 * Generate default HTML when no frontend is provided
 */
function generateDefaultHtml(appName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${appName}</title>
</head>
<body>
  <h1>${appName}</h1>
  <p>HabitsBundle loaded. Check console for available workflows.</p>
  <script>console.log('Workflows:', window.HabitsBundle?.getWorkflows());</script>
</body>
</html>`;
}

/**
 * Load habits from config file
 */
export function loadHabits(config: ParsedConfig, configDir: string): HabitData[] {
  const habits: HabitData[] = [];

  // Get habit references from config
  const habitRefs: Array<{ id?: string; path: string; enabled?: boolean }> = [];

  // Support 'workflows' key
  if (config.workflows && Array.isArray(config.workflows)) {
    habitRefs.push(...config.workflows);
  }

  // Support 'habits' key (string paths)
  if (config.habits && Array.isArray(config.habits)) {
    for (const h of config.habits) {
      if (typeof h === 'string') {
        habitRefs.push({ path: h });
      }
    }
  }

  // Load each habit file
  for (const ref of habitRefs) {
    if (ref.enabled === false) continue;

    const habitPath = path.isAbsolute(ref.path)
      ? ref.path
      : path.resolve(configDir, ref.path);

    if (!fs.existsSync(habitPath)) {
      console.error(`   ⚠️  Habit file not found: ${habitPath}`);
      continue;
    }

    try {
      const habitContent = fs.readFileSync(habitPath, 'utf8');
      const habit = yaml.parse(habitContent) as Record<string, any>;

      const habitName = habit.name || habit.id || ref.id || path.basename(habitPath, '.yaml');
      const habitFilename = path.basename(habitPath);
      // Compute relative path from config directory (preserves directory structure like "habits/generate-recipe.yaml")
      const habitRelativePath = path.relative(configDir, habitPath);
      console.log(`   📄 Loading: ${habitName}`);

      // Preserve all habit properties, ensuring required fields have defaults
      habits.push({
        ...habit,
        name: habitName,
        slug: habit.slug || habit.id || habitName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        nodes: habit.nodes || [],
        edges: habit.edges || [],
        // Add filename, relativePath, and content for .habit file packaging
        filename: habitFilename,
        relativePath: habitRelativePath,
        content: habitContent,
      });
    } catch (error: any) {
      console.error(`   ❌ Failed to parse habit file ${habitPath}: ${error.message}`);
    }
  }

  return habits;
}
