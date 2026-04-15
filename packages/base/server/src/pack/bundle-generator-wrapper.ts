/**
 * Bundle Generator CLI Wrapper
 * 
 * Calls @ha-bits/bundle-generator via npx to generate IIFE bundles
 * for habits workflows that can run in environments without a server.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { LoggerFactory } from '@ha-bits/core/logger';

const logger = LoggerFactory.getRoot();

/**
 * Find the local bundle-generator CLI if available
 */
function findLocalBundleGenerator(): string | null {
  // Try multiple possible locations
  const possiblePaths = [
    // From workspace root (when running via npx or node from workspace)
    path.join(process.cwd(), 'bundle-generator', 'cli.js'),
    // From dist/packages/habits (when installed via npm)
    path.join(__dirname, '..', '..', '..', '..', '..', 'bundle-generator', 'cli.js'),
    // From packages/base/server/src/pack (when running from source)
    path.join(__dirname, '..', '..', '..', '..', '..', '..', 'bundle-generator', 'cli.js'),
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Options for generating a bundle via npx
 */
export interface BundleGeneratorOptions {
  /** Array of workflow objects to embed in the bundle */
  habits: any[];
  /** Application name for bundle identification */
  appName?: string;
  /** Environment variables to embed (from .env file) */
  envVars?: Record<string, string>;
}

/**
 * Tauri plugin configuration discovered from bits
 */
export interface TauriPlugin {
  /** Plugin identifier (e.g., 'sql') */
  name: string;
  /** Cargo dependency line */
  cargo: string;
  /** Rust init code for tauri::Builder */
  init: string;
  /** Tauri permissions/capabilities */
  permissions: string[];
}

/**
 * Result of bundle generation
 */
export interface BundleGeneratorResult {
  success: boolean;
  /** The generated JavaScript code */
  code?: string;
  /** List of bits modules that were bundled */
  bundledBits?: string[];
  /** Tauri plugins required by bundled bits */
  tauriPlugins?: TauriPlugin[];
  /** Any errors that occurred */
  error?: string;
  /** Bundle size in bytes */
  size?: number;
}

/**
 * Extract bits modules from workflows
 */
function extractBitsFromWorkflows(workflows: any[]): Array<{ id: string; module: string }> {
  const bitsSet = new Set<string>();

  for (const workflow of workflows) {
    for (const node of workflow.nodes || []) {
      if (node.type === 'bits' || node.data?.framework === 'bits') {
        const moduleName = node.data?.module;
        if (moduleName) {
          logger.debug(`Found bits module in workflow ${workflow.name || workflow.id}: ${moduleName}`);
          bitsSet.add(moduleName);
        }
      }
    }
  }

  // Convert to array with IDs
  return Array.from(bitsSet).map((moduleName) => {
    // Generate id from module name (e.g., @ha-bits/bit-intersect -> intersect)
    const id = moduleName
      .replace('@ha-bits/', '')
      .replace(/^bit-/, '')
      .replace(/-([a-z])/g, (_: string, char: string) => char.toUpperCase());
    
    return { id, module: moduleName };
  });
}

/**
 * Discover Tauri plugins required by bits.
 * Bits can declare plugins in their package.json under habits.tauriPlugins.
 */
function discoverTauriPlugins(bits: Array<{ id: string; module: string }>): TauriPlugin[] {
  const plugins: Map<string, TauriPlugin> = new Map();
  
  // Find bundle-generator's node_modules where bits are installed
  const localBundleGenerator = findLocalBundleGenerator();
  const bundleGenDir = localBundleGenerator ? path.dirname(localBundleGenerator) : null;
  
  // Build search paths - include bundle-generator's node_modules
  const searchPaths = [
    process.cwd(),
    path.join(process.cwd(), 'node_modules'),
    ...(bundleGenDir ? [bundleGenDir, path.join(bundleGenDir, 'node_modules')] : []),
  ];
  
  logger.debug(`Searching for bit packages in: ${searchPaths.join(', ')}`);
  
  for (const bit of bits) {
    try {
      // Try to resolve the bit's package.json
      const bitPackagePath = require.resolve(`${bit.module}/package.json`, {
        paths: searchPaths
      });
      const bitPackage = JSON.parse(fs.readFileSync(bitPackagePath, 'utf8'));
      
      // Check for tauriPlugins declaration
      if (bitPackage.habits?.tauriPlugins) {
        for (const [pluginName, pluginConfig] of Object.entries(bitPackage.habits.tauriPlugins)) {
          const config = pluginConfig as { cargo: string; init: string; permissions: string[] };
          if (config.cargo && config.init && !plugins.has(pluginName)) {
            plugins.set(pluginName, {
              name: pluginName,
              cargo: config.cargo,
              init: config.init,
              permissions: config.permissions || [],
            });
            logger.info(`🔌 Tauri plugin discovered: ${pluginName} (from ${bit.module})`);
          }
        }
      }
    } catch (err) {
      // Bit package.json not found, skip
      logger.debug(`Could not read tauriPlugins from ${bit.module}: ${(err as Error).message}`);
    }
  }
  
  return Array.from(plugins.values());
}

/**
 * Generate a bundle using @ha-bits/bundle-generator via npx
 */
export async function generateBundle(options: BundleGeneratorOptions): Promise<BundleGeneratorResult> {
  const totalStart = Date.now();
  const {
    habits,
    appName = 'HabitsApp',
    envVars = {},
  } = options;

  if (!habits || habits.length === 0) {
    return {
      success: false,
      error: 'No habits (workflows) provided',
    };
  }

  logger.info(`Generating bundle via for ${habits.length} workflow(s), which are : ${habits.map(h => h.name || h.id).join(', ')}`);

  // Extract bits modules from workflows
  const bits = extractBitsFromWorkflows(habits);
  logger.info(`Found ${bits.length} bits module(s): ${bits.map(b => b.module).join(', ') || 'none'}`);

  // Create workflows map
  const workflowsMap: Record<string, any> = {};
  for (const workflow of habits) {
    const id = workflow.id || `workflow-${habits.indexOf(workflow)}`;
    workflowsMap[id] = workflow;
  }

  // Build stack config
  const stackConfig = {
    name: appName,
    version: '1.0',
    workflows: habits.map((w, i) => ({
      id: w.id || `workflow-${i}`,
      path: `inline:${w.id || `workflow-${i}`}`,
      enabled: true,
    })),
  };

  // Build input JSON for CLI
  const inputJson = {
    stack: {
      config: stackConfig,
      bits: bits,
    },
    workflows: workflowsMap,
    env: envVars,
  };

  // Create temp directory for input/output
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bundle-gen-'));
  const inputPath = path.join(tmpDir, 'input.json');
  const outputPath = path.join(tmpDir, 'bundle.js');

  try {
    // Write input JSON
    fs.writeFileSync(inputPath, JSON.stringify(inputJson, null, 2));
    logger.debug(`Written input file: ${inputPath}`);

    // Try to find local bundle-generator first (for development), then fall back to npx
    const localBundleGenerator = findLocalBundleGenerator();
    
    const command = localBundleGenerator
      ? `node "${localBundleGenerator}" --input "${inputPath}" --output "${outputPath}"`
      : `npx @ha-bits/bundle-generator --input "${inputPath}" --output "${outputPath}"`;
    
    logger.info(`Running bundle-generator${localBundleGenerator ? ' (local)' : ' (npx)'}...`);
    
    try {
      const commandStart = Date.now();
      logger.info(`Bundle generator command start: ${new Date(commandStart).toISOString()}`);
      execSync(command, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000, // 2 minutes timeout
        env: { ...process.env, NODE_ENV: 'production' },
        cwd: localBundleGenerator ? path.dirname(localBundleGenerator) : process.cwd(),
      });
      logger.info(`Bundle generator command completed in ${Date.now() - commandStart}ms`);
    } catch (execError: any) {
      const stderr = execError.stderr?.toString() || '';
      const stdout = execError.stdout?.toString() || '';
      logger.error(`Bundle generator failed: ${stderr || stdout || execError.message}`);
      logger.error(`Bundle generation failed after ${Date.now() - totalStart}ms`);
      return {
        success: false,
        error: `Bundle generation failed: ${stderr || stdout || execError.message}`,
      };
    }

    // Read the generated bundle
    if (!fs.existsSync(outputPath)) {
      return {
        success: false,
        error: 'Bundle generator completed but output file not found',
      };
    }

    const code = fs.readFileSync(outputPath, 'utf8');
    logger.info(`Bundle generated: ${(code.length / 1024).toFixed(2)} KB in ${Date.now() - totalStart}ms`);

    // Discover Tauri plugins from bits
    const tauriPlugins = discoverTauriPlugins(bits);
    if (tauriPlugins.length > 0) {
      logger.info(`Found ${tauriPlugins.length} Tauri plugin(s): ${tauriPlugins.map(p => p.name).join(', ')}`);
    }

    // Cleanup
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    return {
      success: true,
      code,
      bundledBits: bits.map(b => b.module),
      tauriPlugins,
      size: code.length,
    };
  } catch (error: any) {
    logger.error(`Bundle generation failed: ${error.message}`);
    logger.error(`Bundle generation failed after ${Date.now() - totalStart}ms`);

    // Cleanup on error
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

export default generateBundle;
