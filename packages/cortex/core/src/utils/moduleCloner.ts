import * as fs from '@ha-bits/bindings/fs';
import * as path from '@ha-bits/bindings/path';
import { exec as execAsync } from '@ha-bits/bindings/shell';
import { getModuleName } from './moduleLoader';
import { getNodesPath, getModuleFullPath, getNodesBasePath, getLocalModulePath, npmInstall } from './utils';
import { registerCortexModule } from './customRequire';

// ============================================================================
// Bits Dependency Resolution
// ============================================================================

/**
 * Ensure @ha-bits/cortex is resolvable by bits modules.
 * 
 * Instead of creating symlinks, this uses Node's module resolution hook
 * to intercept requests for '@ha-bits/cortex' and resolve them to the
 * currently running cortex package. This is cleaner because:
 * - No filesystem operations needed
 * - Works immediately without race conditions
 * - No cleanup required
 * - Works regardless of where modules are installed
 * 
 * @param modulePath - Path to the module (for logging only)
 * @param moduleName - Name of the module (for logging)
 */
async function linkBitsDeps(modulePath: string, moduleName: string): Promise<void> {
  // Register the cortex module resolution hook (idempotent - safe to call multiple times)
  registerCortexModule();
  console.log(`✓ Bits module ${moduleName} can now resolve @ha-bits/cortex`);
}

// Bits
async function ensureBitsDepsLinked(modulePath: string, moduleName: string): Promise<void> {
  await linkBitsDeps(modulePath, moduleName);
}


export interface ModuleDefinition {
  framework: string;
  source: 'github' | 'npm';
  repository: string; // GitHub URL for 'github' source, package name for 'npm' source
  /** 
   * Optional custom npm registry URL for 'npm' source.
   * If not provided, uses HABITS_NPM_REGISTRY_URL environment variable,
   * or falls back to https://registry.npmjs.org
   */
  registry?: string;
}

export async function cloneModule(
  moduleDefinition: ModuleDefinition,
  targetDir: string
): Promise<string> {
  const { repository, source } = moduleDefinition;
  const name = getModuleName(moduleDefinition);

  if (source !== 'github') {
    throw new Error(`cloneModule only supports GitHub sources, got: ${source}`);
  }

  if (!repository) {
    throw new Error(`Module ${name} has no repository URL`);
  }

  const modulePath = path.join(targetDir, name);

  // Check if already cloned
  if (fs.existsSync(modulePath)) {
    console.log(`✓ Module ${name} already cloned at ${modulePath}`);
    return modulePath;
  }

  console.log(`📦 Cloning ${name} from ${repository}...`);

  try {
    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Clone the repository
    const { stdout, stderr } = await execAsync(
      `git clone ${repository} ${modulePath}`,
      { cwd: targetDir }
    );

    if (stderr && !stderr.includes('Cloning into')) {
      console.warn(`Clone warnings: ${stderr}`);
    }

    console.log(`✓ Successfully cloned ${name}`);

    // Install dependencies if package.json exists
    if (fs.existsSync(path.join(modulePath, 'package.json'))) {
      console.log(`📦 Installing dependencies for ${name}...`);
      try {
        // Use legacy peer deps to avoid version conflicts
        await npmInstall(undefined, { cwd: modulePath, legacyPeerDeps: true, includePeer: true, timeout: 180000 });
        console.log(`✓ Dependencies installed for ${name}`);
        
        // Link bits module dependencies
        if(moduleDefinition.framework === 'bits') {
          await ensureBitsDepsLinked(modulePath, name);
        }
      } catch (error: any) {
        console.warn(`⚠️  Warning: Failed to install dependencies for ${name}: ${error.message}`);
        // Don't fail the entire process, module might still work
      }
    }

    // Auto-detect subPath if needed (for bits modules)
    const subPath = await detectSubPath(modulePath, moduleDefinition.framework);
    const workingDir = subPath ? path.join(modulePath, subPath) : modulePath;

    return workingDir;
  } catch (error: any) {
    throw new Error(`Failed to clone ${name}: ${error.message}`);
  }
}

export async function buildModule(
  moduleDefinition: ModuleDefinition,
  modulePath: string
): Promise<void> {
  const name = getModuleName(moduleDefinition);

  // Run npm install --production
  console.log(`📦 Installing production dependencies for ${name}...`)
  try {
    await npmInstall(undefined, { cwd: modulePath, legacyPeerDeps: true, includePeer: true, production: true, timeout: 120000 });
    
    // Link peer dependencies based on framework
    if (moduleDefinition.framework === 'bits') {
      await ensureBitsDepsLinked(modulePath, name);
    }
  } catch (error: any) {
    console.warn(`⚠️  Warning: Failed to install production dependencies for ${name}: ${error.message}`);
    // Don't fail the entire process, module might still work
  }
  // Auto-detect build command
  const buildCommand = await detectBuildCommand(modulePath);
  
  if (!buildCommand) {
    console.log(`⚠️  No build command detected for ${name}, skipping build`);
    return;
  }

  // Check if already built by looking for common build outputs
  if (await isAlreadyBuilt(modulePath)) {
    console.log(`✓ Module ${name} already built`);
    return;
  }

  console.log(`🔨 Building ${name} with command: ${buildCommand}`);

  try {
    const { stdout, stderr } = await execAsync(buildCommand, {
      cwd: modulePath,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    });

    if (stderr && !stderr.includes('npm warn')) {
      console.warn(`Build warnings for ${name}:`, stderr.substring(0, 500));
    }

    console.log(`✓ Successfully built ${name}`);
  } catch (error: any) {
    throw new Error(`Failed to build ${name}: ${error.message}`);
  }
}

export async function ensureModuleReady(
  moduleDefinition: ModuleDefinition
): Promise<string> {
  const moduleName = getModuleName(moduleDefinition);
  
  console.log(`\n🔍 ensureModuleReady called:`);
  console.log(`   Module: ${moduleName}`);
  console.log(`   Source: ${moduleDefinition.source}`);
  console.log(`   Repository: ${moduleDefinition.repository}`);
  console.log(`   Framework: ${moduleDefinition.framework}`);
  
  if (moduleDefinition.source === 'github') {
    console.log(`\n📂 Processing GitHub module: ${moduleName}`);
    // Clone the module from GitHub to framework directory
    const baseDir = getNodesPath(moduleDefinition.framework);
    const modulePath = path.join(baseDir, moduleName);
    console.log(`   Base directory: ${baseDir}`);
    console.log(`   Module path: ${modulePath}`);
    
    // Check if already exists
    if (fs.existsSync(modulePath)) {
      console.log(`✓ GitHub module ${moduleName} already exists at ${modulePath}`);
      // Still check if built
      if (!await isAlreadyBuilt(modulePath)) {
        await buildModule(moduleDefinition, modulePath);
      }
      return modulePath;
    }
    
    const clonedPath = await cloneModule(moduleDefinition, baseDir);
    
    // Build the module
    await buildModule(moduleDefinition, clonedPath);
    
    return clonedPath;
  } else if (moduleDefinition.source === 'npm') {
    console.log(`\n📦 Processing npm module: ${moduleName}`);
    // Install the module from npm to nodes/{framework} directory
    const baseDir = getNodesPath(moduleDefinition.framework);
    const modulePath = path.join(baseDir, moduleName);
    console.log(`   Base directory: ${baseDir}`);
    console.log(`   Module path: ${modulePath}`);
    
    // Check if already exists
    if (fs.existsSync(modulePath)) {
      console.log(`✓ npm module ${moduleName} already exists at ${modulePath}`);
      // Ensure peer dependencies are linked even for existing modules
      if (moduleDefinition.framework === 'bits') {
        await ensureBitsDepsLinked(modulePath, moduleName);
      }
      return modulePath;
    }
    
    const installedPath = await installNpmModule(moduleDefinition, baseDir);
    
    return installedPath;
  } else {
    throw new Error(`Unknown source type: ${moduleDefinition.source}`);
  }
}

// Helper function to detect subPath for frameworks like bits
async function detectSubPath(modulePath: string, framework: string): Promise<string | null> {
  if (framework === 'bits') {
    // Check for common bits module structure
    const possibleSubPaths = [
      'packages/pieces/community',
      'packages/pieces',
      'pieces/community',
      'pieces'
    ];
    
    for (const subPath of possibleSubPaths) {
      const fullPath = path.join(modulePath, subPath);
      if (fs.existsSync(fullPath)) {
        // Check if there are piece folders in this path
        try {
          const items = fs.readdirSync(fullPath);
          if (items.length > 0) {
            return subPath;
          }
        } catch (error) {
          continue;
        }
      }
    }
  }
  return null;
}

// Helper function to detect build command from package.json
async function detectBuildCommand(modulePath: string): Promise<string | null> {
  const packageJsonPath = path.join(modulePath, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const scripts = packageJson.scripts || {};

    // Try common build script names in order of preference
    const buildScriptNames = ['build', 'compile', 'tsc', 'webpack', 'rollup'];
    
    for (const scriptName of buildScriptNames) {
      if (scripts[scriptName]) {
        return `npm run ${scriptName}`;
      }
    }

    // Fallback: if no build script, run install only
    return 'npm install';
  } catch (error) {
    return 'npm install';
  }
}

// Helper function to check if module is already built
async function isAlreadyBuilt(modulePath: string): Promise<boolean> {
  const commonBuildDirs = ['dist', 'build', 'lib', 'out'];
  const commonMainFiles = [
    'dist/index.js',
    'dist/main.js', 
    'dist/nodes',
    'build/index.js',
    'lib/index.js',
    'out/index.js'
  ];

  // Check for build directories with content
  for (const buildDir of commonBuildDirs) {
    const buildDirPath = path.join(modulePath, buildDir);
    if (fs.existsSync(buildDirPath)) {
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

/**
 * Fix package.json main entry if it points to .ts but .js exists.
 * This handles packages that were incorrectly published with TypeScript as main entry.
 */
async function fixPackageJsonMainEntry(modulePath: string): Promise<void> {
  const packageJsonPath = path.join(modulePath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const mainEntry = packageJson.main;
    
    if (mainEntry && mainEntry.endsWith('.ts')) {
      const tsPath = path.join(modulePath, mainEntry);
      const jsPath = tsPath.replace(/\.ts$/, '.js');
      
      // If .ts doesn't exist but .js does, fix the main entry
      if (!fs.existsSync(tsPath) && fs.existsSync(jsPath)) {
        const newMain = mainEntry.replace(/\.ts$/, '.js');
        packageJson.main = newMain;
        if (packageJson.types && packageJson.types.endsWith('.ts')) {
          packageJson.types = packageJson.types.replace(/\.ts$/, '.d.ts');
        }
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log(`🔧 Fixed package.json main entry: ${mainEntry} -> ${newMain}`);
      }
    }
  } catch (error: any) {
    console.warn(`⚠️  Failed to fix package.json main entry: ${error.message}`);
  }
}

// Install npm module to local directory
async function installNpmModule(
  moduleDefinition: ModuleDefinition,
  targetDir: string
): Promise<string> {
  const { repository: packageName, registry: definedRegistry } = moduleDefinition;
  const name = getModuleName(moduleDefinition);
  
  // Determine registry URL: module definition > environment variable > default (npmjs)
  const registry = definedRegistry || process.env.HABITS_NPM_REGISTRY_URL || undefined;
  
  console.log(`\n📦 installNpmModule called:`);
  console.log(`   Package name: ${packageName}`);
  console.log(`   Module name: ${name}`);
  console.log(`   Target dir: ${targetDir}`);
  console.log(`   Registry: ${registry || 'https://registry.npmjs.org (default)'}`);
  
  if (!packageName) {
    throw new Error(`Module ${name} has no package name`);
  }
  
  // Validate that this is not a GitHub URL being passed as npm package
  if (packageName.includes('github.com') || packageName.startsWith('git@') || packageName.startsWith('https://')) {
    throw new Error(`Invalid npm package name: ${packageName}. This looks like a GitHub URL. Use source: 'github' instead.`);
  }

  const modulePath = path.join(targetDir, name);
  console.log(`   Full module path: ${modulePath}`);

  // Check if already installed
  if (fs.existsSync(modulePath)) {
    console.log(`✓ Module ${name} already installed at ${modulePath}`);
    return modulePath;
  }
  const prefix = getNodesBasePath();
  console.log(`📦 Installing ${name} from npm registry (${packageName}) to ${prefix}...`);

  try {
    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Ensure prefix directory has a package.json (required for npm install)
    const prefixPackageJson = path.join(prefix, 'package.json');
    if (!fs.existsSync(prefixPackageJson)) {
      fs.mkdirSync(prefix, { recursive: true });
      fs.writeFileSync(prefixPackageJson, JSON.stringify({ 
        name: 'habits-nodes', 
        version: '1.0.0', 
        private: true
      }, null, 2));
    }

    // Install directly to prefix with legacyPeerDeps and production mode to minimize dependencies
    const { stdout, stderr } = await npmInstall(packageName, { 
      prefix, 
      legacyPeerDeps: true, 
      production: true,
      timeout: 300000, // 5 minute timeout
      registry // Use custom registry if provided
    });

    if (stderr && !stderr.includes('npm warn')) {
      console.warn(`Install warnings: ${stderr}`);
    }

    // Package is now installed directly at prefix/node_modules/package-name
    // Verify installation
    if (!fs.existsSync(modulePath)) {
      throw new Error(`Package ${packageName} was not installed correctly at ${modulePath}`);
    }

    // Fix package.json if main entry points to .ts but .js exists
    await fixPackageJsonMainEntry(modulePath);

    // Link peer dependencies based on framework
    if (moduleDefinition.framework === 'bits') {
      await ensureBitsDepsLinked(modulePath, name);
    }

    console.log(`✓ Successfully installed ${name} from npm at ${modulePath}`);
    return modulePath;
  } catch (error: any) {
    throw new Error(`Failed to install ${name}: ${error.message}`);
  }
}

export function getModulePath(moduleDefinition: ModuleDefinition): string {
  // Return the correct path based on source type
  const moduleName = getModuleName(moduleDefinition);
  
  // Get the target path (where modules are installed)
  const targetPath = getModuleFullPath(moduleDefinition.framework, moduleName);
  
  // Check if package.json exists at the target path
  // If not, this might be a content-addressable store structure where the actual package
  // is in a hidden directory like .piece-name-hash
  const packageJsonPath = path.join(targetPath, 'package.json');
  if (!fs.existsSync(packageJsonPath) && fs.existsSync(targetPath)) {
    const pnpmStorePath = findPnpmStorePath(targetPath, moduleName);
    if (pnpmStorePath) {
      return pnpmStorePath;
    }
  }
  
  return targetPath;
}

/**
 * Find the actual module path in a content-addressable store.
 * Some package managers create hidden directories like `.piece-name-hash` that contain the actual package.
 * 
 * @param expectedPath - The expected module path (e.g., /tmp/habits-nodes/node_modules/@ha-bits/bit-openai)
 * @param moduleName - The module name (e.g., @ha-bits/bit-openai)
 * @returns The actual path with package.json, or null if not found
 */
function findPnpmStorePath(expectedPath: string, moduleName: string): string | null {
  const parentDir = path.dirname(expectedPath);
  
  if (!fs.existsSync(parentDir)) {
    return null;
  }
  
  // Extract the base package name without scope
  // e.g., "@ha-bits/bit-openai" -> "bit-openai"
  const baseName = moduleName.includes('/') ? moduleName.split('/').pop()! : moduleName;
  
  try {
    const entries = fs.readdirSync(parentDir, { withFileTypes: true });
    
    // Look for hidden directories that start with the package name
    // Some package managers create directories like ".piece-openai-kB47Gs6C"
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith(`.${baseName}`)) {
        const candidatePath = path.join(parentDir, entry.name);
        const candidatePackageJson = path.join(candidatePath, 'package.json');
        
        if (fs.existsSync(candidatePackageJson)) {
          console.log(`📦 Found store path for ${moduleName}: ${candidatePath}`);
          return candidatePath;
        }
      }
    }
  } catch (error) {
    // Ignore errors reading directory
  }
  
  return null;
}

export function getModuleMainFile(
  moduleDefinition: ModuleDefinition
): string | null {
  const modulePath = getModulePath(moduleDefinition);

  // First, try to read the main entry from package.json
  const packageJsonPath = path.join(modulePath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // Try "main" field first, then "module", then "exports"
      let mainEntry = packageJson.main || packageJson.module;
      
      // Handle exports field (common in modern packages)
      if (!mainEntry && packageJson.exports) {
        if (typeof packageJson.exports === 'string') {
          mainEntry = packageJson.exports;
        } else if (packageJson.exports['.']) {
          const dotExport = packageJson.exports['.'];
          if (typeof dotExport === 'string') {
            mainEntry = dotExport;
          } else if (dotExport.require) {
            mainEntry = dotExport.require;
          } else if (dotExport.import) {
            mainEntry = dotExport.import;
          } else if (dotExport.default) {
            mainEntry = dotExport.default;
          }
        }
      }
      
      if (mainEntry) {
        // Remove leading ./ if present
        mainEntry = mainEntry.replace(/^\.\//, '');
        let mainPath = path.join(modulePath, mainEntry);
        
        // If main entry is a .ts file but .js exists, use .js instead
        // (handles packages with incorrect main entry pointing to TypeScript)
        if (mainEntry.endsWith('.ts') && !fs.existsSync(mainPath)) {
          const jsPath = mainPath.replace(/\.ts$/, '.js');
          if (fs.existsSync(jsPath)) {
            console.log(`⚠️  Package.json main points to .ts but .js exists, using .js: ${jsPath}`);
            mainPath = jsPath;
          }
        }
        
        if (fs.existsSync(mainPath)) {
          console.log(`✓ Found main file from package.json for module: ${moduleDefinition.repository} at path: ${mainPath}`);
          return mainPath;
        }
      }
    } catch (error) {
      console.warn(`⚠️  Failed to parse package.json for ${moduleDefinition.repository}`);
    }
  }

  // Fallback: Try common patterns (including TypeScript sources for ts-node/tsx execution)
  const commonPaths = [
    'dist/index.js',
    'dist/main.js',
    'dist/nodes',
    'build/index.js',
    'lib/index.js',
    'out/index.js',
    // Source folder (for modules that don't have a build step)
    'src/index.js',
    'index.js',
    'main.js',
  ];

  for (const commonPath of commonPaths) {
    const fullPath = path.join(modulePath, commonPath);
    if (fs.existsSync(fullPath)) {
      console.log(`✓ Detected main file for module: ${moduleDefinition.repository} at path: ${fullPath}`);
      return fullPath;
    }
  }
  console.log(`⚠️  Could not determine main file for module: ${moduleDefinition.repository} at path: ${modulePath}`);
  return null;
}
