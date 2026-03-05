/**
 * SEA (Single Executable Application) Generator
 * 
 * Generates standalone executables using Node.js SEA feature.
 * Bundles user's habits, stack.yaml, and env into a self-contained binary.
 * 
 * @see https://nodejs.org/api/single-executable-applications.html
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, execSync } from 'child_process';
import { LoggerFactory, getTmpDir } from '@ha-bits/core';

const logger = LoggerFactory.getRoot();

export interface SeaConfig {
  /** User's habits array */
  habits: Array<{
    name: string;
    nodes: any[];
    edges?: any[];
    slug?: string;
  }>;
  /** Server configuration */
  serverConfig: {
    port: number;
    openapi?: boolean;
    webhookTimeout?: number;
    security?: any;
  };
  /** Environment variables content */
  envContent: string;
  /** Optional frontend HTML */
  frontendHtml?: string;
  /** Target platform */
  platform: 'darwin-arm64' | 'darwin-x64' | 'linux-x64' | 'win32-x64' | 'current';
}

export interface SeaGenerationResult {
  success: boolean;
  binaryPath?: string;
  error?: string;
  platform?: string;
  size?: number;
}

/**
 * Get the current platform identifier
 */
export function getCurrentPlatform(): string {
  const platform = process.platform;
  const arch = process.arch;
  return `${platform}-${arch}`;
}

/**
 * Generate stack.yaml content from habits and server config
 */
function generateStackYaml(habits: SeaConfig['habits'], serverConfig: SeaConfig['serverConfig'], hasFrontend: boolean): string {
  const workflowRefs = habits.map((h) => {
    const slug = h.slug || h.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `  - id: ${slug}
    path: ./${slug}.yaml
    enabled: true`;
  });

  return `# Auto-generated stack.yaml for SEA binary
version: "1.0"
server:
  port: ${serverConfig.port}
  host: "0.0.0.0"
  openapi: ${serverConfig.openapi || false}
  webhookTimeout: ${serverConfig.webhookTimeout || 30000}
  ${hasFrontend ? 'frontend: ./frontend' : ''}

workflows:
${workflowRefs.join('\n')}

`;
}

/**
 * Generate habit YAML content
 */
function generateHabitYaml(habit: SeaConfig['habits'][0]): string {
  const yaml = require('yaml');
  
  const habitData = {
    name: habit.name,
    slug: habit.slug || habit.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    nodes: habit.nodes.map(node => ({
      id: node.id,
      type: node.type,
      data: node.data,
      position: node.position,
    })),
    edges: habit.edges || [],
  };

  return yaml.stringify(habitData);
}

/** Path to the SEA entry template file */
const SEA_ENTRY_TEMPLATE_PATH = path.join(__dirname, 'sea-entry-template.js');

/**
 * Generate the SEA entry point that embeds all workflow data
 * The cortex server will be copied to ./cortex-server.cjs in the work directory
 */
function generateSeaEntryPoint(config: SeaConfig): string {
  const habits = config.habits.map(h => ({
    slug: h.slug || h.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    content: generateHabitYaml(h),
  }));

  const stackYaml = generateStackYaml(config.habits, config.serverConfig, !!config.frontendHtml);
  
  // Encode all embedded data as base64
  const embeddedData = {
    stackYaml: Buffer.from(stackYaml).toString('base64'),
    habits: habits.map(h => ({
      slug: h.slug,
      content: Buffer.from(h.content).toString('base64'),
    })),
    envContent: Buffer.from(config.envContent || '').toString('base64'),
    frontendHtml: config.frontendHtml ? Buffer.from(config.frontendHtml).toString('base64') : null,
  };

  // Read template and replace placeholders
  // The cortex server is referenced as ./cortex-server.cjs (will be copied to work dir)
  const template = fs.readFileSync(SEA_ENTRY_TEMPLATE_PATH, 'utf-8');
  
  return template
    .replace('{{GENERATED_AT}}', new Date().toISOString())
    .replace('{{EMBEDDED_DATA}}', JSON.stringify(embeddedData, null, 2))
    .replace('{{DEFAULT_PORT}}', String(config.serverConfig.port));
}

/**
 * Generate a SEA binary from the provided configuration
 */
export async function generateSeaBinary(config: SeaConfig): Promise<SeaGenerationResult> {
  const platform = config.platform === 'current' ? getCurrentPlatform() : config.platform;
  
  logger.info('Starting SEA binary generation', { platform });
  
  // Create temp working directory
  const workDir = fs.mkdtempSync(path.join(getTmpDir(), 'habits-sea-build-'));
  
  // Workspace root for resolving dependencies
  // From dist/packages/habits/app or dist/packages/base/server, go 4 levels up to workspace root
  const workspaceRoot = path.resolve(__dirname, '../../../..');
  
  try {
    // Step 1: Copy cortex server lib-pack to work directory (library without CLI)
    // TODO: IMPORTANT: Once base is merged into habits/app, import stuff from cortex directly instead of copying files - this is a temporary workaround to allow bundling with ncc without including dev dependencies or source files
    const cortexPackPath = path.join(workspaceRoot, 'dist/packages/cortex/lib-pack/index.cjs');
    const cortexDestPath = path.join(workDir, 'cortex-server.cjs');
    
    if (!fs.existsSync(cortexPackPath)) {
      // throw new Error(`Cortex server lib-pack not found at: ${cortexPackPath}. Run 'pnpm nx lib-pack @ha-bits/cortex' first.`);
      logger.error('Cortex server lib-pack not found, skipping copy (expected if not built)', { path: cortexPackPath });
    } else {
    fs.copyFileSync(cortexPackPath, cortexDestPath);
    logger.info('Copied cortex server pack', { from: cortexPackPath, to: cortexDestPath });
    }
    

    
    // Step 2: Generate entry point
    const entryContent = generateSeaEntryPoint(config);
    const entryPath = path.join(workDir, 'sea-entry.js');
    fs.writeFileSync(entryPath, entryContent);
    logger.info('Generated SEA entry point', { path: entryPath });

    
    // Step 3: Bundle with ncc (includes all dependencies)
    logger.info('Bundling with ncc...');
    const bundlePath = path.join(workDir, 'bundle');
    
    // Use local ncc from workspace root - run from workspace to resolve dependencies
    const nodeModulesPath = path.join(workspaceRoot, 'node_modules');
    
    // Environment to override npm registry and help ncc find modules
    const npmEnv = {
      ...process.env,
      NPM_CONFIG_REGISTRY: 'https://registry.npmjs.org',
      NODE_PATH: nodeModulesPath,
    };
    
    // Create symlink to node_modules in temp dir so ncc can resolve dependencies
    const symlinkPath = path.join(workDir, 'node_modules');
    if (!fs.existsSync(symlinkPath)) {
      fs.symlinkSync(nodeModulesPath, symlinkPath, 'dir');
    }
    
    try {
      // ncc must run from workspace root to resolve @ha-bits/* dependencies
      const nccCommand = `npx @vercel/ncc build "${entryPath}" -o "${bundlePath}" -m`;
      
      execSync(nccCommand, {
        cwd: workDir,  // Run from temp dir with symlinked node_modules
        stdio: 'pipe',
        timeout: 120000,
        env: npmEnv,
      });
    } catch (e: any) {
      logger.error('ncc bundling failed', { error: e.message });
      throw new Error(`Failed to bundle: ${e.message}`);
    }
    
    const bundledEntry = path.join(bundlePath, 'index.js');
    if (!fs.existsSync(bundledEntry)) {
      throw new Error('Bundle generation failed - no output file');
    }
    
    // Step 4: Create sea-config.json
    const seaConfigPath = path.join(workDir, 'sea-config.json');
    const blobPath = path.join(workDir, 'sea-prep.blob');
    
    const seaConfig = {
      main: bundledEntry,
      output: blobPath,
      disableExperimentalSEAWarning: true,
      useSnapshot: false,
      useCodeCache: true,
    };
    fs.writeFileSync(seaConfigPath, JSON.stringify(seaConfig, null, 2));
    logger.info('Created sea-config.json', { config: seaConfig });
    
    // Step 5: Generate SEA blob
    logger.info('Generating SEA blob...');
    try {
      execSync(`node --experimental-sea-config "${seaConfigPath}"`, {
        cwd: workDir,
        stdio: 'pipe',
        timeout: 60000,
      });
    } catch (e: any) {
      logger.error('SEA blob generation failed', { error: e.message });
      throw new Error(`Failed to generate SEA blob: ${e.message}`);
    }
    
    if (!fs.existsSync(blobPath)) {
      throw new Error('SEA blob generation failed - no blob file');
    }
    
    // Step 6: Copy Node binary
    const nodePath = process.execPath;
    const binaryName = platform.startsWith('win') ? 'habits.exe' : 'habits';
    const outputBinaryPath = path.join(workDir, binaryName);
    
    fs.copyFileSync(nodePath, outputBinaryPath);
    fs.chmodSync(outputBinaryPath, 0o755);
    logger.info('Copied Node binary', { from: nodePath, to: outputBinaryPath });
    
    // Step 7: Inject blob with postject
    logger.info('Injecting SEA blob into binary...');
    const sentinelFuse = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';
    
    // Use local postject from workspace root
    const localPostject = path.join(workspaceRoot, 'node_modules', '.bin', 'postject');
    const postjectBin = fs.existsSync(localPostject) ? `"${localPostject}"` : 'npx postject';
    
    try {
      // postject requires different approach per platform
      const postjectCmd = platform.startsWith('darwin')
        ? `${postjectBin} "${outputBinaryPath}" NODE_SEA_BLOB "${blobPath}" --sentinel-fuse ${sentinelFuse} --macho-segment-name NODE_SEA`
        : `${postjectBin} "${outputBinaryPath}" NODE_SEA_BLOB "${blobPath}" --sentinel-fuse ${sentinelFuse}`;
      
      execSync(postjectCmd, {
        cwd: workDir,
        stdio: 'pipe',
        timeout: 60000,
        env: npmEnv,
      });
    } catch (e: any) {
      logger.error('Postject injection failed', { error: e.message });
      throw new Error(`Failed to inject blob: ${e.message}`);
    }
    
    // Step 8: Code sign on macOS
    if (platform.startsWith('darwin')) {
      logger.info('Code signing binary for macOS...');
      try {
        execSync(`codesign --sign - --force --preserve-metadata=entitlements,requirements,flags,runtime "${outputBinaryPath}"`, {
          cwd: workDir,
          stdio: 'pipe',
          timeout: 30000,
        });
      } catch (e: any) {
        logger.warn('Code signing failed (binary may still work)', { error: e.message });
        // Non-fatal - binary may still work without signature
      }
    }
    
    // Get final binary size
    const stats = fs.statSync(outputBinaryPath);
    
    logger.info('SEA binary generation complete', {
      path: outputBinaryPath,
      size: stats.size,
      platform,
    });
    
    return {
      success: true,
      binaryPath: outputBinaryPath,
      platform,
      size: stats.size,
    };
    
  } catch (error: any) {
    logger.error('SEA generation failed', { error: error.message });
    
    // Cleanup on error
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch (e) {}
    
    return {
      success: false,
      error: error.message,
      platform,
    };
  }
}

/**
 * Get supported platforms for SEA generation
 */
export function getSupportedPlatforms(): string[] {
  return ['darwin-arm64', 'darwin-x64', 'linux-x64', 'win32-x64', 'current'];
}

/**
 * Check if current Node.js version supports SEA
 */
export function checkSeaSupport(): { supported: boolean; version: string; message?: string } {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);
  
  if (major < 20) {
    return {
      supported: false,
      version,
      message: 'Node.js 20+ required for SEA support',
    };
  }
  
  return {
    supported: true,
    version,
  };
}
