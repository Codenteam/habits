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
import { packDesktop, getSupportedDesktopPlatforms } from './desktop';
import { packMobile, getSupportedMobileTargets } from './mobile';
import { generateBundle, BundleGeneratorOptions, BundleGeneratorResult } from './bundle-generator-wrapper';
import { getTauriFetchProxyScript } from './templates/tauri/tauri-fetch-proxy';

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
  return ['single-executable', 'bundle', 'tauri', 'desktop', 'desktop-full', 'mobile', 'mobile-full'];
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

  // Load .env content
  let envContent = '';
  const envPath = path.join(configDir, '.env');
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
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
      console.log('\n🚧 Desktop Full Mode - Early Access!\n');
      console.log('   This mode will create a complete Electron app with the');
      console.log('   backend embedded, so it can run entirely offline.\n');
      console.log('   For now, use --format desktop with --backend-url to create');
      console.log('   a frontend-only app that connects to your backend.\n');
      console.log('   Example:');
      console.log('   npx habits pack --config stack.yaml --format desktop --backend-url https://api.example.com\n');
      return {
        success: false,
        error: 'Desktop-full format is Early Access',
        format,
      };

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
      console.log('\n🚧 Mobile Full Mode - Early Access!\n');
      console.log('   This mode will create a complete mobile app with the');
      console.log('   backend embedded, so it can run entirely offline.\n');
      console.log('   For now, use --format mobile with --backend-url to create');
      console.log('   a frontend-only app that connects to your backend.\n');
      console.log('   Example:');
      console.log('   npx habits pack --config stack.yaml --format mobile --backend-url https://api.example.com --target android\n');
      return {
        success: false,
        error: 'Mobile-full format is Early Access',
        format,
      };

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
  const workflows = habits.map(h => ({
    id: h.slug,
    name: h.name,
    nodes: h.nodes,
    edges: h.edges,
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
  const workflows = habits.map(h => ({
    id: h.slug,
    name: h.name,
    nodes: h.nodes,
    edges: h.edges,
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

  // Cargo.toml
  const safeAppName = appName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const cargoToml = `[package]
name = "${safeAppName}"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[lib]
name = "${safeAppName}_lib"
crate-type = ["staticlib", "cdylib", "rlib"]
`;
  fs.writeFileSync(path.join(srcTauriDir, 'Cargo.toml'), cargoToml);

  // build.rs
  fs.writeFileSync(path.join(srcTauriDir, 'build.rs'), 'fn main() { tauri_build::build() }');

  // main.rs
  fs.writeFileSync(
    path.join(srcTauriDir, 'src', 'main.rs'),
    `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
fn main() { ${safeAppName}_lib::run(); }`
  );

  // lib.rs
  fs.writeFileSync(
    path.join(srcTauriDir, 'src', 'lib.rs'),
    `#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error running tauri app");
}`
  );

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
  <script src="cortex-bundle.js"></script>
  <script src="habits-fetch-proxy.js"></script>
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
      const habit = yaml.parse(habitContent) as {
        id?: string;
        name?: string;
        slug?: string;
        nodes?: any[];
        edges?: any[];
      };

      const habitName = habit.name || habit.id || ref.id || path.basename(habitPath, '.yaml');
      console.log(`   📄 Loading: ${habitName}`);

      habits.push({
        name: habitName,
        slug: habit.slug || habit.id || habitName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        nodes: habit.nodes || [],
        edges: habit.edges || [],
      });
    } catch (error: any) {
      console.error(`   ❌ Failed to parse habit file ${habitPath}: ${error.message}`);
    }
  }

  return habits;
}
