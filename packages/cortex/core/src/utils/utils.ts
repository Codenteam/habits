import * as fs from '@ha-bits/bindings/fs';
import * as path from '@ha-bits/bindings/path';
import { exec as execAsync } from '@ha-bits/bindings/shell';
import { LoggerFactory } from '@ha-bits/core';

const logger = LoggerFactory.getRoot();

// ============================================================================
// npm Install Utilities
// ============================================================================

/**
 * Options for npm install commands
 */
export interface NpmInstallOptions {
  cwd?: string;
  timeout?: number;
  legacyPeerDeps?: boolean;
  includePeer?: boolean;
  production?: boolean;
  noSave?: boolean;
  prefix?: string;
  saveOptional?: boolean;
  global?: boolean;
  /** Custom npm registry URL */
  registry?: string;
}

/**
 * Builds the npm install command with the given options
 */
function buildNpmInstallCommand(packageSpec?: string, options: NpmInstallOptions = {}): string {
  const parts = ['npm', 'install'];
  
  // Always ignore engine requirements to allow n8n modules that require newer Node versions
  parts.push('--engine-strict=false');
  // Ignore scripts to reduce memory usage and speed up installs
  parts.push('--ignore-scripts');

  if (packageSpec) {
    parts.push(packageSpec);
  }
  
  if (options.global) {
    parts.push('-g');
  }
  if (options.legacyPeerDeps) {
    parts.push('--legacy-peer-deps');
  }
  if (options.includePeer) {
    parts.push('--include=peer');
  }
  if (options.production) {
    parts.push('--omit=dev');
  }
  if (options.noSave) {
    // parts.push('--no-save');
  }
  if (options.prefix) {
    parts.push(`--prefix ${options.prefix}`);
  }
  if (options.saveOptional) {
    parts.push('--save-optional');
  }
  if (options.registry) {
    parts.push(`--registry ${options.registry}`);
  }
  
  return parts.join(' ');
}

/**
 * Run package install asynchronously with the given options
 * Uses npm with increased memory for heavy packages
 */
export async function npmInstall(packageSpec?: string, options: NpmInstallOptions = {}): Promise<{ stdout: string; stderr: string }> {
  const command = buildNpmInstallCommand(packageSpec, options);
  
  const execOptions: { cwd?: string; timeout?: number; env?: NodeJS.ProcessEnv; maxBuffer?: number } = {
    // Increase max buffer for large outputs
    maxBuffer: 500 * 1024 * 1024, // 500MB
    // Set NODE_OPTIONS to increase heap memory and optimize GC for heavy installs
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=16384',
    },
  };
  if (options.cwd) {
    execOptions.cwd = options.cwd;
  }
  if (options.timeout) {
    execOptions.timeout = options.timeout;
  }

  // Check if package is already installed, skip if yes
  if (packageSpec) {
    // Parse package name (handle @scope/name@version format)
    const packageName = packageSpec.replace(/@[\d.]+(-[\w.]+)?$/, ''); // Remove version suffix
    const nodeModulesBase = options.prefix || options.cwd || process.cwd();
    const packagePath = path.join(nodeModulesBase, 'node_modules', packageName);
    
    if (fs.existsSync(packagePath)) {
      logger.log(`Package ${packageName} already installed at ${packagePath}, skipping install`);
      return { stdout: `Skipped: ${packageName} already installed`, stderr: '' };
    }
  }

  logger.log(`Executing npm install command: ${command}`);
  return execAsync(command, execOptions);
}

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Environment variable name for the nodes base path without the /nodes suffix
 */
const NODES_BASE_PATH_ENV = 'HABITS_NODES_PATH';

/**
 * Environment variable name for local nodes directory in the workspace
 */
const LOCAL_NODES_PATH_ENV = 'HABITS_LOCAL_NODES_PATH';

/**
 * Default base path for nodes when not specified in environment
 */
const DEFAULT_NODES_BASE_PATH = '/tmp/habits-nodes';

/**
 * Cache the base path to avoid repeated file reads
 */
let cachedNodesBasePath: string | null = null;

/**
 * Get the base path for nodes from environment variable or .env file.
 * Falls back to /tmp/habits-nodes if not specified.
 * 
 * Priority:
 * 1. Environment variable HABITS_NODES_PATH
 * 2. .env file in current working directory
 * 3. Default: /tmp/habits-nodes
 * 
 * @returns The base path for nodes
 */
export function getNodesBasePath(): string {
  if (cachedNodesBasePath !== null) {
    return cachedNodesBasePath;
  }

  // First, check environment variable
  if (process.env[NODES_BASE_PATH_ENV]) {
    cachedNodesBasePath = process.env[NODES_BASE_PATH_ENV];
    return cachedNodesBasePath;
  }

  // Default to /tmp/habits-nodes
  cachedNodesBasePath = DEFAULT_NODES_BASE_PATH;
  return cachedNodesBasePath;
}

/**
 * Get the full path to the nodes directory for a specific framework.
 * 
 * @param framework - The framework name (e.g., 'activepieces', 'n8n', 'script')
 * @returns The full path to the framework's nodes directory
 */
export function getNodesPath(framework: string): string {
  return path.join(getNodesBasePath(), 'node_modules');
}

/**
 * Get the full path to a specific module within a framework.
 * 
 * @param framework - The framework name (e.g., 'activepieces', 'n8n', 'script')
 * @param moduleName - The module name (e.g., '@ha-bits/piece-intersect')
 * @returns The full path to the module
 */
export function getModuleFullPath(framework: string, moduleName: string): string {
  return path.join(getNodesBasePath(), 'node_modules', moduleName);
}

/**
 * Get the local nodes path from the workspace for local module sources.
 * This is where modules in the 'nodes/' directory of the workspace are located.
 * 
 * Priority:
 * 1. Environment variable HABITS_LOCAL_NODES_PATH
 * 2. 'nodes' directory relative to process.cwd()
 * 3. Search up from __dirname for a 'nodes' directory
 * 
 * @param framework - The framework name (e.g., 'activepieces', 'n8n')
 * @returns The path to local nodes, or null if not found
 */
export function getLocalModulePath(framework: string, moduleName: string): string | null {
  // For bits modules, strip @ha-bits/ prefix for path construction when path already includes @ha-bits
  const strippedModuleName = moduleName.startsWith('@ha-bits/') ? moduleName.slice('@ha-bits/'.length) : moduleName;
  const pathModuleName = moduleName;
    
  // Check environment variable first
  if (process.env[LOCAL_NODES_PATH_ENV]) {
    const localPath = path.join(process.env[LOCAL_NODES_PATH_ENV], framework, pathModuleName);
    if (fs.existsSync(localPath)) {
      return localPath;
    }
    // Also check @ha-bits subdirectory for bits framework
    if (framework === 'bits') {
      const haBitsPath = path.join(process.env[LOCAL_NODES_PATH_ENV], framework, '@ha-bits', strippedModuleName);
      if (fs.existsSync(haBitsPath)) {
        return haBitsPath;
      }
    }
  }
  
  // Try relative to cwd()
  const cwdNodesPath = path.join(process.cwd(), 'nodes', framework, pathModuleName);
  if (fs.existsSync(cwdNodesPath)) {
    return cwdNodesPath;
  }
  
  // For bits framework, also check nodes/bits/@ha-bits/ path
  if (framework === 'bits') {    // Try relative to cwd()
    const bitsCreatorPath = path.join(process.cwd(), 'nodes', 'bits', '@ha-bits', strippedModuleName);
    
    if (fs.existsSync(bitsCreatorPath)) {
      return bitsCreatorPath;
    }
    // Search up from __dirname path
    let currentDir = __dirname;
    for (let i = 0; i < 10; i++) {   
      const bitsPath = path.join(currentDir, 'nodes', 'bits', '@ha-bits', strippedModuleName);
      if (fs.existsSync(bitsPath)) {
        return bitsPath;
      }
      const parent = path.dirname(currentDir);
      if (parent === currentDir) break;
      currentDir = parent;
    }
  }
  
  // Search up from __dirname
  let currentDir = __dirname;
  for (let i = 0; i < 10; i++) {
    const nodesPath = path.join(currentDir, 'nodes', framework, pathModuleName);
    if (fs.existsSync(nodesPath)) {
      return nodesPath;
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }
  
  return null;
}

/**
 * Clear the cached nodes base path.
 * Useful for testing or when the environment changes.
 */
export function clearNodesBasePathCache(): void {
  cachedNodesBasePath = null;
}
