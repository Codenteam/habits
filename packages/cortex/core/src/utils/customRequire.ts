import Module, { createRequire } from 'module';
import path from 'path';
import * as fs from 'fs';

// ============================================================================
// Cortex Module Registration
// ============================================================================

/**
 * Path to the cortex package root (where package.json is).
 * This is determined at module load time.
 */
let cortexPackagePath: string | null = null;

/**
 * Flag to track if the cortex module hook is already installed.
 */
let cortexModuleHookInstalled = false;

/**
 * Get the path to the cortex package root.
 * Searches up from the current file to find the package.json with name "@ha-bits/cortex".
 */
function getCortexPackagePath(): string {
  if (cortexPackagePath) {
    return cortexPackagePath;
  }
  
  // Start from this file's directory and search up for package.json
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.name === '@ha-bits/cortex') {
          cortexPackagePath = dir;
          return dir;
        }
      } catch (e) {
        // Continue searching
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  
  // Fallback: assume we're 2 levels deep in src/utils
  cortexPackagePath = path.resolve(__dirname, '..', '..');
  return cortexPackagePath;
}

/**
 * Register @ha-bits/cortex in Node's module resolution system.
 * This allows bits modules to `require('@ha-bits/cortex')` without needing
 * symlinks or the package to be installed in node_modules.
 * 
 * The hook intercepts resolution requests for '@ha-bits/cortex' and redirects
 * them to the current cortex package.
 */
export function registerCortexModule(): void {
  if (cortexModuleHookInstalled) {
    return; // Already installed
  }
  
  const cortexPath = getCortexPackagePath();
  console.log(`🔗 Registering @ha-bits/cortex module resolution hook (path: ${cortexPath})`);
  
  // IMPORTANT: Capture the current _resolveFilename NOW, not at module load time.
  // This ensures we wrap around tsx's version (or any other loader's version) 
  // rather than the original Node.js version.
  const currentResolveFilename = (Module as any)._resolveFilename;
  
  // Patch Module._resolveFilename to intercept @ha-bits/cortex requests
  (Module as any)._resolveFilename = function(request: string, parent: NodeModule, isMain: boolean, options?: any) {
    // Intercept requests for @ha-bits/cortex
    if (request === '@ha-bits/cortex' || request.startsWith('@ha-bits/cortex/')) {
      // For the main package, resolve to the package's main entry
      if (request === '@ha-bits/cortex') {
        const mainPath = path.join(cortexPath, 'src', 'index.ts');
        // When running from dist/pack, use the compiled entry
        if (fs.existsSync(mainPath)) {
          return mainPath;
        }
        const distPath = path.join(cortexPath, 'pack', 'index.cjs');
        if (fs.existsSync(distPath)) {
          return distPath;
        }
        // Fallback to index.js
        const jsPath = path.join(cortexPath, 'index.js');
        if (fs.existsSync(jsPath)) {
          return jsPath;
        }
      }
      
      // For subpath imports like '@ha-bits/cortex/bits/framework'
      const subPath = request.replace('@ha-bits/cortex/', '');
      const possiblePaths = [
        path.join(cortexPath, 'src', subPath + '.ts'),
        path.join(cortexPath, 'src', subPath, 'index.ts'),
        path.join(cortexPath, 'pack', subPath + '.cjs'),
        path.join(cortexPath, subPath + '.js'),
        path.join(cortexPath, subPath, 'index.js'),
      ];
      
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          return p;
        }
      }
    }
    
    // Fall through to the previous resolver (could be tsx's or Node's original)
    return currentResolveFilename.call(this, request, parent, isMain, options);
  };
  
  cortexModuleHookInstalled = true;
  console.log(`✓ @ha-bits/cortex module resolution hook installed`);
}

// ============================================================================
// Patched Require Functions
// ============================================================================

/**
 * Creates a patched require function that includes additional search paths for module resolution.
 * This is used to load n8n/activepieces modules with their actual runtime dependencies.
 */
export function createPatchedRequire(basePath: string, additionalPaths: string[]): NodeRequire {
  const baseRequire = createRequire(path.join(basePath, 'package.json'));
  
  const originalResolvePaths = (Module as any)._resolveLookupPaths;

  console.log(`[customRequire] Creating patched require with paths:`, additionalPaths);
  
  return function patchedRequire(id: string): any {
    (Module as any)._resolveLookupPaths = function(request: string, parent: NodeModule) {
      const result = originalResolvePaths.call(this, request, parent);
      if (result && Array.isArray(result)) {
        for (const p of [...additionalPaths].reverse()) {
          if (!result.includes(p)) result.unshift(p);
        }
      }
      return result;
    };
    
    try {
      delete baseRequire.cache[id];
      return baseRequire(id);
    } finally {
      (Module as any)._resolveLookupPaths = originalResolvePaths;
    }
  } as NodeRequire;
}


/**
 * Require code from `pathToCode` while resolving dependencies from `searchPaths`.
 * Uses the actual n8n/activepieces runtime dependencies from node_modules.
 */
export function patchedRequire(pathToCode: string, searchPaths: string[]): unknown {
  const originalResolvePaths = (Module as any)._resolveLookupPaths;
  
  // Patch to inject our search paths
  (Module as any)._resolveLookupPaths = function(request: string, parent: NodeModule) {
    const result = originalResolvePaths.call(this, request, parent);
    if (result && Array.isArray(result)) {
      for (const p of [...searchPaths].reverse()) {
        if (!result.includes(p)) result.unshift(p);
      }
    }
    return result;
  };

  try {
    // Create require from the first search path
    const customRequire = createRequire(path.join(searchPaths[0], 'package.json'));
    delete customRequire.cache[pathToCode];
    return customRequire(pathToCode);
  } finally {
    // Restore
    (Module as any)._resolveLookupPaths = originalResolvePaths;
  }
}


/**
 * Simple require using createRequire from a specific search path.
 * Creates require from the module's directory so it can resolve its dependencies.
 */
export function simpleRequire(pathToCode: string, searchPath: string) {
  const dynamicRequire = createRequire(path.join(searchPath, "package.json"));
  delete dynamicRequire.cache[pathToCode];
  const nodeModule = dynamicRequire(pathToCode);
  return nodeModule;
}

/**
 * Custom require that loads modules from a specific search path.
 * Uses createRequire to create a require function rooted at the module's directory,
 * ensuring all dependencies resolve consistently from a single location.
 * 
 * This avoids patching global Module._resolveLookupPaths which can cause issues
 * when the same dependency (e.g., semver) gets required from different paths
 * during the module loading chain.
 */
export function customRequire(pathToCode: string, searchPath: string) {
  console.log(`Custom requiring ${pathToCode} with search path ${searchPath}`);
  const flatMethod = true;
  // Use createRequire rooted at the search path - this ensures all dependencies
  // resolve relative to the module's location without patching global resolution
  if(flatMethod){
  const dynamicRequire = createRequire(path.join(searchPath, 'package.json'));
  
  // Clear cache to ensure fresh load
  delete dynamicRequire.cache[pathToCode];
  
  // Also clear any cached versions of the module by full path
  const resolvedPath = dynamicRequire.resolve(pathToCode);
  delete dynamicRequire.cache[resolvedPath];
  
  return dynamicRequire(pathToCode);
  }

 else {
  // Build list of search paths:
  // 1. The provided searchPath (e.g., module's src directory)
  // 2. The parent node_modules directory for resolving peer dependencies
  const searchPaths = [searchPath];
  
  // Find node_modules in the path hierarchy
  let currentPath = searchPath;
  while (currentPath && currentPath !== path.dirname(currentPath)) {
    const nodeModulesPath = path.join(currentPath, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      searchPaths.push(nodeModulesPath);
    }
    // Also check if currentPath itself is within node_modules
    if (path.basename(path.dirname(currentPath)) === 'node_modules' || 
        path.basename(path.dirname(path.dirname(currentPath))) === 'node_modules') {
      // Find the root node_modules
      let nmPath = currentPath;
      while (nmPath && !nmPath.endsWith('/node_modules') && !nmPath.endsWith('\\node_modules')) {
        nmPath = path.dirname(nmPath);
      }
      if (nmPath && nmPath.endsWith('node_modules')) {
        if (!searchPaths.includes(nmPath)) {
          searchPaths.push(nmPath);
        }
      }
    }
    currentPath = path.dirname(currentPath);
  }
  
  const patchedReq = createPatchedRequire(pathToCode, searchPaths);
  return patchedReq(pathToCode);
}
}
