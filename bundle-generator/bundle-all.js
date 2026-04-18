/**
 * Bundle-All Generator
 * 
 * Generates a single cortex-bundle-all.js containing all bits from modules.json.
 * This is used by Tauri apps to pre-load all bits at startup instead of
 * loading individual bundles per-habit.
 * 
 * Usage: node bundle-all.js [--output path] [--modules modules.json]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import shared functionality from generator.js
const generator = require('./generator');

// Default paths
const DEFAULT_MODULES_PATH = path.join(__dirname, '..', 'modules.json');
const DEFAULT_OUTPUT_PATH = path.join(__dirname, 'dist', 'cortex-bundle-all.js');

/**
 * Load modules list from modules.json
 */
function loadModules(modulesPath) {
  const content = fs.readFileSync(modulesPath, 'utf8');
  const data = JSON.parse(content);
  return data.modules || [];
}

/**
 * Install all bits from modules.json
 */
function installBits(modules) {
  const bits = modules
    .filter(m => m.framework === 'bits' && m.source === 'npm')
    .map(m => m.repository);

  if (bits.length === 0) {
    console.log('No npm bits to install');
    return;
  }

  console.log(`📦 Ensuring ${bits.length} bits are installed...`);
  try {
    execSync(`npm install ${bits.join(' ')}`, {
      cwd: __dirname,
      stdio: 'inherit'
    });
  } catch (err) {
    console.error('Failed to install some bits:', err.message);
  }
}

/**
 * Generate bundle-all containing all bits
 */
async function generateBundleAll(modules, outputPath) {
  // Filter to npm bits only
  const npmBits = modules.filter(m => m.framework === 'bits' && m.source === 'npm');
  
  // Create bit objects with id and module
  const bits = npmBits.map((m, index) => ({
    id: m.repository.replace('@ha-bits/', '').replace(/[^a-zA-Z0-9]/g, '_'),
    module: m.repository,
  }));

  console.log(`\n🔧 Generating bundle with ${bits.length} bits...`);
  bits.forEach(b => console.log(`   - ${b.module}`));

  // Create a minimal stack object for the generator
  const stack = {
    bits,
    config: {
      // Empty config - bundle-all doesn't include workflow configs
      bundleAllMode: true,
    },
  };

  // Empty workflows and env - these are loaded at runtime
  const workflows = {};
  const env = {};

  // Use the existing generator to create the base bundle
  const code = generator.generate(stack, workflows, env);

  // Write temp file
  const tempPath = path.join(__dirname, '_temp_bundle_all.js');
  fs.writeFileSync(tempPath, code, 'utf8');

  // Discover stubs from bits
  const { aliases: bitStubs, dependencies: stubDeps } = generator.discoverBitStubs ? 
    generator.discoverBitStubs(bits) : { aliases: {}, dependencies: {} };

  // Install stub dependencies
  if (stubDeps && Object.keys(stubDeps).length > 0) {
    console.log(`📦 Installing stub dependencies...`);
    try {
      const packagesToInstall = Object.entries(stubDeps)
        .map(([name, version]) => `${name}@${version}`)
        .join(' ');
      execSync(`npm install --no-save ${packagesToInstall}`, {
        cwd: __dirname,
        stdio: 'inherit'
      });
    } catch (err) {
      console.warn('Warning: Could not install some stub dependencies:', err.message);
    }
  }

  // Use esbuild to bundle
  console.log('\n📦 Bundling with esbuild...');
  
  const esbuild = require('esbuild');
  
  // Node.js built-in modules that need polyfills
  const nodeBuiltins = [
    'events', 'util', 'stream', 'path', 'fs', 'http', 'https', 'os',
    'crypto', 'url', 'querystring', 'buffer', 'assert', 'zlib', 'net',
    'tls', 'dns', 'child_process', 'readline', 'vm', 'module', 'inspector',
    'process', 'string_decoder', 'tty', 'http2', 'worker_threads',
    'perf_hooks', 'async_hooks', 'timers', 'punycode', 'constants', 'cluster'
  ];


  // Create stub redirect plugin
  const stubRedirectPlugin = {
    name: 'stub-redirect',
    setup(build) {
      // Match relative imports like ./driver, ./diffusion-driver, ../stubs, ./lib/stubs
      build.onResolve({ filter: /^\.\.?\/[a-z-]+(\/[a-z-]+)?$/ }, (args) => {
        const importer = args.importer;
        if (!importer) return null;
        
        const haBitsMatch = importer.match(/(?:node_modules|nodes\/bits)\/(@ha-bits\/[^/]+)/);
        if (!haBitsMatch) return null;
        
        const packageName = haBitsMatch[1];
        
        // Extract the module name from relative path
        // ./driver -> driver
        // ../stubs -> stubs  
        // ./lib/stubs -> lib/stubs
        let moduleName = args.path;
        if (moduleName.startsWith('../')) {
          moduleName = moduleName.replace('../', '');
        } else if (moduleName.startsWith('./')) {
          moduleName = moduleName.replace('./', '');
        }
        
        const stubKey = `${packageName}/${moduleName}`;
        
        if (bitStubs[stubKey]) {
          console.log(`🔀 Redirecting ${args.path} from ${packageName} → ${bitStubs[stubKey]}`);
          return { path: bitStubs[stubKey] };
        }
        
        return null;
      });
    }
  };

  // Node polyfill plugin
  const nodePolyfillPlugin = {
    name: 'node-polyfill',
    setup(build) {
      const stubPackages = ['typescript', 'dotenv', 'winston', 'yaml', 'yargs', 'express', 'debug', 'form-data', '@tauri-apps/plugin-shell', '@tauri-apps/api'];
      
      build.onResolve({ filter: new RegExp(`^(${stubPackages.join('|')})$`) }, (args) => {
        return {
          path: `stub:${args.path}`,
          namespace: 'stub-package',
          pluginData: { packageName: args.path }
        };
      });
      
      build.onLoad({ filter: /.*/, namespace: 'stub-package' }, (args) => {
        const pkg = args.pluginData.packageName;
        return {
          contents: `
            function notAvailable() { throw new Error('${pkg} is not available in browser bundle'); }
            const stub = function() { notAvailable(); };
            stub.prototype = {};
            export default stub;
            export { stub };
          `,
          loader: 'js'
        };
      });

      build.onResolve({ filter: /^node:/ }, (args) => {
        const moduleName = args.path.replace('node:', '');
        return {
          path: `polyfill:${moduleName}`,
          namespace: 'node-polyfill',
          pluginData: { moduleName }
        };
      });

      for (const builtin of nodeBuiltins) {
        build.onResolve({ filter: new RegExp(`^${builtin}$`) }, () => {
          return {
            path: `polyfill:${builtin}`,
            namespace: 'node-polyfill',
            pluginData: { moduleName: builtin }
          };
        });
      }


    }
  };

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Bundle
  try {
    await esbuild.build({
      entryPoints: [tempPath],
      bundle: true,
      format: 'iife',
      globalName: 'HabitsBundle',
      outfile: outputPath,
      platform: 'browser',
      target: ['es2020'],
      minify: true,
      sourcemap: false,
      mainFields: ['main', 'module'],
      nodePaths: [
        path.join(__dirname, 'node_modules'),
        path.join(__dirname, '..', 'node_modules'),
      ],
      alias: {
        ...bitStubs,
        '@ha-bits/cortex': path.join(__dirname, 'stubs', 'cortex-stub.js'),
        'tiktoken': path.join(__dirname, 'stubs', 'tiktoken.js'),
      },
      external: [
        '@ha-bits/bindings',
        '@ha-bits/bindings/*',
        '@ha-bits/core',
        '@ha-bits/core/*',
        '@habits/shared',
        '@habits/shared/*',
        'tauri-plugin-sms-api',
        'tauri-plugin-wifi-api',
        'tauri-plugin-matter-api',
        'tauri-plugin-system-settings-api',
        '@tauri-apps/plugin-geolocation',
      ],
      loader: { '.wasm': 'file' },
      plugins: [stubRedirectPlugin, nodePolyfillPlugin],
      logLevel: 'warning',
      define: {
        'process.env.NODE_ENV': '"production"',
        'global': 'globalThis',
      },
    });

    // Cleanup temp file
    fs.unlinkSync(tempPath);

    // Report size
    const stats = fs.statSync(outputPath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log(`\n✅ Bundle generated: ${outputPath}`);
    console.log(`   Size: ${sizeKB} KB (${sizeMB} MB)`);
    console.log(`   Bits: ${bits.length}`);

    return { success: true, path: outputPath, size: stats.size, bitsCount: bits.length };

  } catch (err) {
    console.error('❌ Bundle generation failed:', err.message);
    
    // Cleanup temp file on error
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    
    return { success: false, error: err.message };
  }
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let modulesPath = DEFAULT_MODULES_PATH;
  let outputPath = DEFAULT_OUTPUT_PATH;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--modules' && args[i + 1]) {
      modulesPath = path.resolve(args[++i]);
    } else if (args[i] === '--output' && args[i + 1]) {
      outputPath = path.resolve(args[++i]);
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Bundle-All Generator - Creates cortex-bundle-all.js with all bits

Usage: node bundle-all.js [options]

Options:
  --modules <path>   Path to modules.json (default: ../modules.json)
  --output <path>    Output path for bundle (default: dist/cortex-bundle-all.js)
  --help, -h         Show this help
      `);
      process.exit(0);
    }
  }

  console.log('🚀 Bundle-All Generator');
  console.log(`   Modules: ${modulesPath}`);
  console.log(`   Output:  ${outputPath}`);
  console.log('');

  // Load modules
  if (!fs.existsSync(modulesPath)) {
    console.error(`❌ modules.json not found: ${modulesPath}`);
    process.exit(1);
  }

  const modules = loadModules(modulesPath);
  console.log(`📋 Found ${modules.length} modules in modules.json`);

  // Install bits
  installBits(modules);

  // Generate bundle
  const result = await generateBundleAll(modules, outputPath);
  
  if (!result.success) {
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = {
  loadModules,
  installBits,
  generateBundleAll,
};

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
