import * as fs from '@ha-bits/bindings/fs';
import * as path from '@ha-bits/bindings/path';
import { ensureModuleReady, getModuleMainFile, getModulePath } from './moduleCloner';
import { npmInstall, getLocalModulePath } from './utils';
import { LoggerFactory } from '@ha-bits/core';

const logger = LoggerFactory.getRoot();

// ============================================================================
// Bundled Modules Registry
// ============================================================================

/**
 * Registry for pre-bundled modules.
 * In browser/IIFE bundles, modules are bundled at build time and registered here
 * so ensureModuleInstalled can skip filesystem operations.
 */
const bundledModulesRegistry: Map<string, any> = new Map();

/**
 * Register a pre-bundled module.
 * Call this at bundle initialization to register modules that are already
 * included in the bundle and don't need to be installed.
 * 
 * @param moduleName The module name (e.g., '@ha-bits/bit-intersect')
 * @param moduleExports The module's exports object
 */
export function registerBundledModule(moduleName: string, moduleExports: any): void {
  bundledModulesRegistry.set(moduleName, moduleExports);
  console.log(`📦 Registered bundled module: ${moduleName}`);
}

/**
 * Check if a module is registered as bundled.
 * @param moduleName The module name to check
 * @returns The module exports if bundled, undefined otherwise
 */
export function getBundledModule(moduleName: string): any | undefined {
  return bundledModulesRegistry.get(moduleName);
}

/**
 * Check if a module is available as a bundled module.
 * @param moduleName The module name to check
 */
export function isBundledModule(moduleName: string): boolean {
  return bundledModulesRegistry.has(moduleName);
}

interface ModuleDefinition {
  framework: string;
  source: 'github' | 'npm' | 'local' | 'link';
  repository: string; // GitHub URL for 'github' source, package name for 'npm'/'link' source, module name for 'local' source
}

interface ModulesConfig {
  modules: ModuleDefinition[];
}

/**
 * Infers the module name from the repository URL or npm package name.
 * For GitHub: extracts the last part of the URL (e.g., https://github.com/user/repo.git -> repo)
 * For npm: uses the whole package name as the ID/Name
 */
export function getModuleName(moduleDefinition: ModuleDefinition): string {
  if (moduleDefinition.source === 'github') {
    // Extract repository name from GitHub URL
    // Handle formats like:
    // - https://github.com/user/repo.git
    // - https://github.com/user/repo
    // - git@github.com:user/repo.git
    const url = moduleDefinition.repository;
    
    // Remove .git suffix if present
    let repoName = url.replace(/\.git$/, '');
    
    // Extract the last part after the last slash
    const parts = repoName.split('/');
    repoName = parts[parts.length - 1];
    
    return repoName;
  } else if (moduleDefinition.source === 'npm' || moduleDefinition.source === 'link') {
    // For npm and link, use the whole package name as the ID/Name
    return moduleDefinition.repository;
  } else if (moduleDefinition.source === 'local') {
    // For local, use the module name as-is
    return moduleDefinition.repository;
  } else {
    throw new Error(`Unknown source type: ${moduleDefinition.source}`);
  }
}

const MODULES_CONFIG_PATH = path.join(process.cwd(), 'modules.json');

/**
 * Modules operation mode:
 * - 'restricted': Only allows using modules already defined in modules.json
 * - 'open': Allows adding any module and appends it to modules.json if it doesn't exist
 */
export type ModulesMode = 'restricted' | 'open';

/**
 * Get the current modules mode from environment variable.
 * Default is 'restricted' for security.
 * Set HABITS_MODULES_MODE=open to allow adding new modules.
 */
export function getModulesMode(): ModulesMode {
  const mode = process.env.HABITS_MODULES_MODE?.toLowerCase();
  if (mode === 'open') {
    return 'open';
  }
  return 'restricted';
}

/**
 * Check if a module exists in modules.json
 */
export function moduleExists(moduleDefinition: ModuleDefinition): boolean {
  const config = loadModulesConfig();
  const moduleName = getModuleName(moduleDefinition);
  
  return config.modules.some(
    m => m.framework === moduleDefinition.framework && getModuleName(m) === moduleName
  );
}

/**
 * Get a module from modules.json by framework and name
 */
export function getModuleFromConfig(framework: string, moduleName: string): ModuleDefinition | undefined {
  const config = loadModulesConfig();
  return config.modules.find(
    m => m.framework === framework && getModuleName(m) === moduleName
  );
}

export function loadModulesConfig(): ModulesConfig {
  try {
    const configData = fs.readFileSync(MODULES_CONFIG_PATH, 'utf-8');
    return JSON.parse(configData);
  } catch (error: any) {
    throw new Error(`Failed to load modules.json: ${error.message}`);
  }
}

export function saveModulesConfig(config: ModulesConfig): void {
  try {
    const configData = JSON.stringify(config, null, 2);
    fs.writeFileSync(MODULES_CONFIG_PATH, configData, 'utf-8');
  } catch (error: any) {
    throw new Error(`Failed to save modules.json: ${error.message}`);
  }
}

export interface AddModuleOptions {
  /** Override the mode check - allows forcing addition even in restricted mode */
  force?: boolean;
  /** Skip saving to modules.json (useful for temporary modules) */
  skipSave?: boolean;
}

/**
 * Add a module to modules.json.
 * 
 * Behavior depends on the modules mode (HABITS_MODULES_MODE env var):
 * - 'restricted' (default): Will throw an error. Modules must be pre-defined in modules.json.
 * - 'open': Will add the module to modules.json if it doesn't exist.
 * 
 * @param moduleDefinition - The module definition to add
 * @param options - Optional settings for the add operation
 * @throws Error if in restricted mode and force is not set
 * @throws Error if module already exists
 */
export function addModule(moduleDefinition: ModuleDefinition, options: AddModuleOptions = {}): void {
  const mode = getModulesMode();
  const moduleName = getModuleName(moduleDefinition);
  
  // Check mode restrictions
  if (mode === 'restricted' && !options.force) {
    throw new Error(
      `Cannot add module '${moduleName}' in restricted mode. ` +
      `Either add it manually to modules.json or set HABITS_MODULES_MODE=open`
    );
  }
  
  const config = loadModulesConfig();
  
  // Check if module already exists (by repository to prevent duplicates)
  const existingModule = config.modules.find(
    m => m.repository === moduleDefinition.repository
  );
  
  if (existingModule) {
    logger.log(`⏭️ Module '${moduleName}' already exists in modules.json, skipping`);
    return;
  }
  
  // Validate source type
  if (!['github', 'npm', 'local'].includes(moduleDefinition.source)) {
    throw new Error(`Invalid source type: ${moduleDefinition.source}. Must be 'github', 'npm', or 'local'`);
  }
  
  if (!options.skipSave) {
    config.modules.push(moduleDefinition);
    saveModulesConfig(config);
    logger.log(`✅ Module '${moduleName}' added to modules.json`);
  }
}

/**
 * Ensure a module is available for use.
 * In restricted mode: module must already exist in modules.json
 * In open mode: adds the module to modules.json if it doesn't exist
 * 
 * @param moduleDefinition - The module definition to ensure
 * @returns The module definition (either existing or newly added)
 */
export function ensureModuleInConfig(moduleDefinition: ModuleDefinition): ModuleDefinition {
  const mode = getModulesMode();
  const moduleName = getModuleName(moduleDefinition);
  
  // Check if module exists
  const existingModule = getModuleFromConfig(moduleDefinition.framework, moduleName);
  
  if (existingModule) {
    return existingModule;
  }
  
  // Module doesn't exist
  if (mode === 'restricted') {
    throw new Error(
      `Module '${moduleName}' not found in modules.json. ` +
      `In restricted mode, only pre-defined modules can be used. ` +
      `Add it to modules.json or set HABITS_MODULES_MODE=open`
    );
  }
  
  // Open mode: add the module
  addModule(moduleDefinition);
  return moduleDefinition;
}

export function getModuleByPath(modulePath: string): ModuleDefinition | undefined {
  const config = loadModulesConfig();
  const [framework, ...nameParts] = modulePath.split('/');
  const name = nameParts.join('/');

  return config.modules.find(
    (m) => m.framework === framework && getModuleName(m) === name
  );
}

export function isModuleCloned(moduleDefinition: ModuleDefinition): boolean {
  const modulePath = getModulePath(moduleDefinition);
  
  // Check if installed in target location
  if (fs.existsSync(modulePath)) {
    return true;
  }
  
  // For local or link source, also check if it exists at the source location
  if (moduleDefinition.source === 'local' || moduleDefinition.source === 'link') {
    const moduleName = getModuleName(moduleDefinition);
    const localPath = getLocalModulePath(moduleDefinition.framework, moduleName);
    if (localPath && fs.existsSync(localPath)) {
      return true;
    }
  }
  
  return false;
}

export function isModuleBuilt(moduleDefinition: ModuleDefinition): boolean {
  // Determine which path to check
  let modulePath = getModulePath(moduleDefinition);
  
  // For local or link source, check source location if target doesn't exist
  if ((moduleDefinition.source === 'local' || moduleDefinition.source === 'link') && !fs.existsSync(modulePath)) {
    const moduleName = getModuleName(moduleDefinition);
    const localPath = getLocalModulePath(moduleDefinition.framework, moduleName);
    if (localPath) {
      modulePath = localPath;
    }
  }
  
  if (!fs.existsSync(modulePath)) {
    return false;
  }

  // Check for common build outputs
  const commonBuildDirs = ['dist', 'build', 'lib', 'out'];
  const commonMainFiles = [
    'dist/index.js',
    'dist/main.js', 
    'dist/nodes',
    'build/index.js',
    'lib/index.js',
    'out/index.js',
    'src/index.js',
  ];

  // Check for build directories with content
  for (const buildDir of commonBuildDirs) {
    const buildDirPath = path.join(modulePath, buildDir);
    const exists = fs.existsSync(buildDirPath);
    if (exists) {
      try {
        const items = fs.readdirSync(buildDirPath);
        if (items.length > 0) {
          return true;
        }
      } catch (error) {
        continue;
      }
    }
  }

  // Check for main files
  for (const mainFile of commonMainFiles) {
    const mainFilePath = path.join(modulePath, mainFile);
    if (fs.existsSync(mainFilePath)) {
      return true;
    }
  }

  return false;
}

export async function ensureModuleInstalled(
  moduleDefinition: ModuleDefinition
): Promise<string> {
  const moduleName = getModuleName(moduleDefinition);
  
  // Check bundled modules registry first (for browser/IIFE bundles)
  if (isBundledModule(moduleDefinition.repository)) {
    console.log(`✓ Module ${moduleName} is pre-bundled, skipping installation\n`);
    return moduleDefinition.repository; // Return module name as "path" for bundled modules
  }
  
  // In Node.js environments, try require as fallback
  if (typeof require !== 'undefined') {
    try {
      require(moduleDefinition.repository);
      console.log(`✓ Module ${moduleName} already available via require\n`);
      return moduleDefinition.repository;
    } catch {
      // Module not available via require, continue with installation
    }
  }

  console.log(`\n🔍 ensureModuleInstalled called:`);
  console.log(`   Module name: ${moduleName}`);
  console.log(`   Source: ${moduleDefinition.source}`);
  console.log(`   Repository: ${moduleDefinition.repository}`);
  console.log(`   Framework: ${moduleDefinition.framework}`);

  try {
    // Use the cloner to ensure module is ready
    const modulePath = await ensureModuleReady(moduleDefinition);
    console.log(`✓ Module ${moduleName} is ready at: ${modulePath}\n`);
    return modulePath;
  } catch (error: any) {
    console.error(`✗ Failed to prepare module ${moduleName}: ${error.message}\n`);
    throw error;
  }
}

export async function installModule(packageName: string, version: string = 'latest'): Promise<void> {
  const packageSpec = version === 'latest' ? packageName : `${packageName}@${version}`;

  try {
    console.log(`Installing ${packageSpec} via npm...`);
    const { stdout, stderr } = await npmInstall(packageSpec, { saveOptional: true });

    if (stderr && !stderr.includes('npm warn')) {
      console.error(`Installation warnings: ${stderr}`);
    }

    console.log(`Successfully installed ${packageSpec}`);
  } catch (error: any) {
    throw new Error(`Failed to install ${packageSpec}: ${error.message}`);
  }
}

export async function listAvailableModules(framework?: string): Promise<any[]> {
  const config = loadModulesConfig();
  let modules = config.modules;

  if (framework) {
    modules = modules.filter((m) => m.framework === framework);
  }

  return modules.map((m) => {
    const moduleName = getModuleName(m);
    return {
      framework: m.framework,
      name: moduleName,
      source: m.source,
      path: `${m.framework}/${moduleName}`,
      repository: m.repository,
      cloned: isModuleCloned(m),
      built: isModuleBuilt(m),
      installed: isModuleCloned(m) && isModuleBuilt(m),
    };
  });
}
