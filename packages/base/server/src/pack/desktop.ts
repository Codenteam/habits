/**
 * Desktop (Electron) Pack Handler
 * 
 * Generates an Electron desktop application that wraps the frontend
 * and proxies API calls to a remote backend.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { getTmpDir, LoggerFactory } from '@ha-bits/core';
import { PackResult, DesktopPlatform, DesktopFramework, ParsedConfig, HabitData } from './types';
import { getApiProxyScript } from './templates/api-proxy';
import { getElectronMain } from './templates/electron-main';
import { getElectronPreload } from './templates/electron-preload';
import { packTauri } from './tauri';
import JSZip from 'jszip';

const logger = LoggerFactory.getRoot();

/**
 * Sanitize stack name for use in filenames
 */
function sanitizeStackName(name: string | undefined): string {
  if (!name || name.trim() === '' || name === 'Stack Name') {
    return 'habits';
  }
  // Convert to lowercase, replace spaces and special chars with hyphens
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

export interface DesktopPackOptions {
  configPath: string;
  configDir: string;
  config: ParsedConfig;
  habits: HabitData[];
  backendUrl: string;
  desktopPlatform: DesktopPlatform;
  framework?: DesktopFramework;
  output?: string;
}

/**
 * Web API Desktop Pack Options
 */
export interface WebDesktopPackOptions {
  habits: any[];
  serverConfig: any;
  frontendHtml: string;
  backendUrl: string;
  desktopPlatform: DesktopPlatform;
  framework?: DesktopFramework;
  buildBinary?: boolean;
  stackName?: string;
}

/**
 * Web API Desktop Pack Result
 */
export interface WebDesktopPackResult {
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
 * Supported desktop platforms for output
 */
export function getSupportedDesktopPlatforms(): DesktopPlatform[] {
  return ['dmg', 'exe', 'appimage', 'deb', 'rpm', 'msi', 'all'];
}

/**
 * Generate an Electron desktop app from habits config
 */
export async function packDesktop(options: DesktopPackOptions): Promise<PackResult> {
  const { configPath, configDir, config, backendUrl, desktopPlatform, output } = options;

  console.log('🖥️  Packing habits into Electron desktop app...\n');
  console.log(`   Config: ${configPath}`);
  console.log(`   Backend URL: ${backendUrl}`);
  console.log(`   Platform: ${desktopPlatform}`);

  // Validate frontend exists
  const frontendPath = config.server?.frontend
    ? path.isAbsolute(config.server.frontend)
      ? config.server.frontend
      : path.resolve(configDir, config.server.frontend)
    : path.join(configDir, 'frontend');

  if (!fs.existsSync(frontendPath)) {
    return {
      success: false,
      error: `Frontend directory not found: ${frontendPath}. Desktop pack requires a frontend folder.`,
      format: 'desktop',
    };
  }

  const indexPath = path.join(frontendPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return {
      success: false,
      error: `index.html not found in frontend directory: ${frontendPath}`,
      format: 'desktop',
    };
  }

  // Create temp working directory
  const workDir = fs.mkdtempSync(path.join(getTmpDir(), 'habits-electron-'));
  const appName = config.name || 'Habits App';
  const appSlug = appName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  try {
    console.log('\n⏳ Setting up Electron project...\n');

    // Create package.json for Electron app
    const packageJson = {
      name: appSlug,
      version: '1.0.0',
      description: `${appName} - Habits Desktop App`,
      main: 'main.js',
      scripts: {
        start: 'electron .',
        'pack:mac': 'electron-builder --mac',
        'pack:win': 'electron-builder --win',
        'pack:linux': 'electron-builder --linux',
        'pack:all': 'electron-builder --mac --win --linux',
      },
      build: {
        appId: `com.habits.${appSlug}`,
        productName: appName,
        directories: {
          output: 'dist',
        },
        files: ['main.js', 'preload.js', 'frontend/**/*', 'config.json'],
        mac: {
          target: ['dmg', 'zip'],
          category: 'public.app-category.productivity',
        },
        win: {
          target: ['nsis', 'portable'],
        },
        linux: {
          target: ['AppImage', 'deb', 'rpm'],
          category: 'Utility',
        },
      },
      devDependencies: {
        electron: '^28.0.0',
        'electron-builder': '^24.0.0',
      },
    };

    fs.writeFileSync(
      path.join(workDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create main.js (Electron main process)
    fs.writeFileSync(path.join(workDir, 'main.js'), getElectronMain(appName));

    // Create preload.js (context bridge for API proxy)
    fs.writeFileSync(path.join(workDir, 'preload.js'), getElectronPreload());

    // Create config.json for runtime configuration
    const runtimeConfig = {
      backendUrl,
      appName,
    };
    fs.writeFileSync(
      path.join(workDir, 'config.json'),
      JSON.stringify(runtimeConfig, null, 2)
    );

    // Copy frontend directory
    const destFrontendPath = path.join(workDir, 'frontend');
    copyDirRecursive(frontendPath, destFrontendPath);

    // Inject API proxy script into index.html
    injectApiProxy(path.join(destFrontendPath, 'index.html'), backendUrl);

    console.log('   📦 Installing dependencies...');

    // Install dependencies
    execSync('npm install', {
      cwd: workDir,
      stdio: 'pipe',
      timeout: 120000,
    });

    console.log('   🔨 Building Electron app...');

    // Build based on platform
    let buildCmd: string;
    switch (desktopPlatform) {
      case 'dmg':
        buildCmd = 'npm run pack:mac';
        break;
      case 'exe':
      case 'msi':
        buildCmd = 'npm run pack:win';
        break;
      case 'appimage':
      case 'deb':
      case 'rpm':
        buildCmd = 'npm run pack:linux';
        break;
      case 'all':
      default:
        buildCmd = 'npm run pack:all';
    }

    execSync(buildCmd, {
      cwd: workDir,
      stdio: 'pipe',
      timeout: 300000, // 5 minutes for build
    });

    // Find the output file(s)
    const distDir = path.join(workDir, 'dist');
    const outputFiles = findBuildOutputs(distDir);

    if (outputFiles.length === 0) {
      return {
        success: false,
        error: 'Build completed but no output files found',
        format: 'desktop',
      };
    }

    // Copy to final output location
    const outputDir = output ? path.resolve(output) : path.join(configDir, 'dist-desktop');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let totalSize = 0;
    for (const file of outputFiles) {
      const destPath = path.join(outputDir, path.basename(file));
      fs.copyFileSync(file, destPath);
      totalSize += fs.statSync(destPath).size;
      console.log(`   ✅ ${path.basename(file)}`);
    }

    // Cleanup
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }

    console.log('\n✅ Desktop app generated successfully!\n');
    console.log(`   Output: ${outputDir}`);
    console.log(`   Total size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   Files: ${outputFiles.length}`);
    console.log('\n💡 The app will connect to:', backendUrl);
    console.log('   To change the backend URL, edit config.json next to the app.');

    return {
      success: true,
      outputPath: outputDir,
      format: 'desktop',
      size: totalSize,
      platform: desktopPlatform,
    };
  } catch (error: any) {
    // Cleanup on error
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch (e) {}

    return {
      success: false,
      error: `Desktop build failed: ${error.message}`,
      format: 'desktop',
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
 * Inject API proxy script into HTML file
 */
function injectApiProxy(htmlPath: string, backendUrl: string): void {
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  const proxyScript = `<script>
${getApiProxyScript(backendUrl)}
</script>`;

  // Inject before </head> or at start of <body>
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${proxyScript}\n</head>`);
  } else if (html.includes('<body>')) {
    html = html.replace('<body>', `<body>\n${proxyScript}`);
  } else {
    // Prepend if no head/body found
    html = proxyScript + '\n' + html;
  }

  fs.writeFileSync(htmlPath, html);
}

/**
 * Find build output files in dist directory
 */
function findBuildOutputs(distDir: string): string[] {
  if (!fs.existsSync(distDir)) return [];

  const outputs: string[] = [];
  const extensions = ['.dmg', '.exe', '.msi', '.AppImage', '.deb', '.rpm', '.zip'];

  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        outputs.push(fullPath);
      }
    }
  }

  scanDir(distDir);
  return outputs;
}

/**
 * Generate a desktop app for Web API (routes to Electron or Tauri)
 * Returns either a zip buffer (project files) or a binary file path (DMG/EXE/AppImage/etc.)
 */
export async function packDesktopForWeb(options: WebDesktopPackOptions): Promise<WebDesktopPackResult> {
  const { framework = 'electron', habits, serverConfig, frontendHtml, backendUrl, desktopPlatform = 'all', buildBinary = false, stackName } = options;
  
  // Route to the appropriate framework handler
  if (framework === 'tauri') {
    return packTauri({
      habits,
      serverConfig,
      frontendHtml,
      backendUrl,
      buildBinary,
      stackName,
      platform: 'desktop',
      desktopPlatform,
    });
  } else {
    return packElectronDesktopForWeb(options);
  }
}

/**
 * Generate an Electron desktop app for Web API
 * Returns either a zip buffer (project files) or a binary file path (DMG/EXE/AppImage/etc.)
 */
async function packElectronDesktopForWeb(options: WebDesktopPackOptions): Promise<WebDesktopPackResult> {
  const { habits, serverConfig, frontendHtml, backendUrl, desktopPlatform = 'all', buildBinary = false, stackName } = options;

  // Validate platform
  const validPlatforms = ['dmg', 'exe', 'appimage', 'deb', 'rpm', 'msi', 'all'];
  if (!validPlatforms.includes(desktopPlatform)) {
    return {
      success: false,
      error: `Invalid desktop platform: ${desktopPlatform}. Valid: ${validPlatforms.join(', ')}`,
    };
  }

  // Sanitize stack name for filename
  const sanitizedStackName = sanitizeStackName(stackName);

  // Create temp directory for the project
  const workDir = fs.mkdtempSync(path.join(getTmpDir(), 'habits-desktop-'));

  logger.info(`🖥️  Generating Electron desktop app for Web API in ${workDir}`);
  const appName = 'Habits App';
  const appSlug = appName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

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
    // Create Electron project structure
    const packageJson = {
      name: appSlug,
      version: '1.0.0',
      description: `${appName} - Habits Desktop App`,
      main: 'main.js',
      scripts: {
        start: 'electron .',
        'pack:mac': 'electron-builder --mac',
        'pack:win': 'electron-builder --win',
        'pack:linux': 'electron-builder --linux',
        'pack:all': 'electron-builder --mac --win --linux',
      },
      build: {
        appId: `com.habits.${appSlug}`,
        productName: appName,
        directories: { output: 'dist' },
        files: ['main.js', 'preload.js', 'frontend/**/*', 'config.json'],
        mac: { target: ['dmg', 'zip'], category: 'public.app-category.productivity' },
        // mac: { target: ['dmg', 'zip'], category: 'public.app-category.productivity', identity: null },
        win: { target: ['nsis', 'msi'] },
        linux: { target: ['AppImage', 'deb', 'rpm'], category: 'Utility' },
      },
      devDependencies: {
        electron: '^28.0.0',
        'electron-builder': '^24.9.1',
      },
    };

    // Main.js for Electron (using shared template)
    const mainJs = getElectronMain(appName);

    // Preload.js (using shared template)
    const preloadJs = getElectronPreload();

    // Config
    const configJson = {
      backendUrl,
      appName,
      habits: habits.map((h: any) => h.name),
      serverConfig,
    };

    // Write files
    fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(path.join(workDir, 'main.js'), mainJs);
    fs.writeFileSync(path.join(workDir, 'preload.js'), preloadJs);
    fs.writeFileSync(path.join(workDir, 'config.json'), JSON.stringify(configJson, null, 2));

    // Create frontend directory with API proxy injected
    fs.mkdirSync(path.join(workDir, 'frontend'));

    // Inject API proxy script into the frontend HTML
    const apiProxyScript = `<script>\n${getApiProxyScript(backendUrl)}\n</script>`;
    const modifiedFrontendHtml = frontendHtml.includes('</head>')
      ? frontendHtml.replace('</head>', `${apiProxyScript}\n</head>`)
      : frontendHtml.includes('<body>')
        ? frontendHtml.replace('<body>', `<body>\n${apiProxyScript}`)
        : apiProxyScript + '\n' + frontendHtml;

    fs.writeFileSync(path.join(workDir, 'frontend', 'index.html'), modifiedFrontendHtml);

    // Create README
    const readme = `# ${appName}

This is an Electron desktop application generated by Habits.

## Setup

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm start
\`\`\`

## Build

\`\`\`bash
# Build for current platform
npm run pack:${desktopPlatform === 'all' ? 'all' : desktopPlatform === 'dmg' ? 'mac' : desktopPlatform === 'exe' || desktopPlatform === 'msi' ? 'win' : 'linux'}

# Or build for all platforms
npm run pack:all
\`\`\`

## Backend URL

This app connects to: ${backendUrl}

To change the backend URL, edit \`config.json\`.
`;
    fs.writeFileSync(path.join(workDir, 'README.md'), readme);

    if (buildBinary) {
      // Build the actual binary
      logger.info(`Working directory: ${workDir}`);
      logger.info(`Building Electron desktop binary for ${desktopPlatform}...`);

      try {
        // Install dependencies
        logger.info('Installing Electron dependencies...');
        execSync('npm install', { cwd: workDir, stdio: 'inherit', timeout: 120000 });

        // Build based on platform
        let buildCmd: string;
        let expectedExtensions: string[];
        let mimeType: string;

        switch (desktopPlatform) {
          case 'dmg':
            buildCmd = 'npm run pack:mac';
            expectedExtensions = ['.dmg'];
            mimeType = 'application/x-apple-diskimage';
            break;
          case 'exe':
            buildCmd = 'npm run pack:win';
            expectedExtensions = ['.exe'];
            mimeType = 'application/x-msdownload';
            break;
          case 'msi':
            buildCmd = 'npm run pack:win';
            expectedExtensions = ['.msi'];
            mimeType = 'application/x-msi';
            break;
          case 'appimage':
            buildCmd = 'npm run pack:linux';
            expectedExtensions = ['.AppImage'];
            mimeType = 'application/x-executable';
            break;
          case 'deb':
            buildCmd = 'npm run pack:linux';
            expectedExtensions = ['.deb'];
            mimeType = 'application/x-debian-package';
            break;
          case 'rpm':
            buildCmd = 'npm run pack:linux';
            expectedExtensions = ['.rpm'];
            mimeType = 'application/x-rpm';
            break;
          case 'all':
          default:
            buildCmd = 'npm run pack:all';
            expectedExtensions = ['.dmg', '.exe', '.msi', '.AppImage', '.deb', '.rpm'];
            mimeType = 'application/zip';
        }

        logger.info(`Running build command: ${buildCmd}`);
        execSync(buildCmd, { cwd: workDir, stdio: 'inherit', timeout: 300000 });

        // Find the built binary
        const distDir = path.join(workDir, 'dist');
        if (!fs.existsSync(distDir)) {
          throw new Error('Build completed but dist directory not found');
        }

        const builtFiles = findBuildOutputs(distDir);
        if (builtFiles.length === 0) {
          throw new Error('Build completed but no output files found in dist/');
        }

        // For 'all' platform, create a zip of all outputs
        if (desktopPlatform === 'all') {
          const zip = new JSZip();
          for (const file of builtFiles) {
            zip.file(path.basename(file), fs.readFileSync(file));
          }
          const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
          const zipPath = path.join(workDir, `${sanitizedStackName}.desktop-all.zip`);
          fs.writeFileSync(zipPath, zipBuffer);

          return {
            success: true,
            binaryPath: zipPath,
            binaryFilename: `${sanitizedStackName}.desktop-all.zip`,
            binaryMimeType: 'application/zip',
            cleanup,
          };
        }

        // For specific platform, return the first matching file
        const binaryFile = builtFiles.find(f => 
          expectedExtensions.some(ext => f.endsWith(ext))
        ) || builtFiles[0];

        const binaryFilename = `${sanitizedStackName}.desktop${path.extname(binaryFile)}`;

        return {
          success: true,
          binaryPath: binaryFile,
          binaryFilename,
          binaryMimeType: mimeType,
          cleanup,
        };
      } catch (buildError: any) {
        cleanup();
        
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
        zipFilename: `${sanitizedStackName}.desktop-electron.zip`,
      };
    }
  } catch (error: any) {
    cleanup();

    return {
      success: false,
      error: `Desktop pack failed: ${error.message}`,
    };
  }
}
