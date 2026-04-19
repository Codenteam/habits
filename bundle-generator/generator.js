
// Read template from template.js as string
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const filePath = path.join(__dirname, 'template.js'); 
const template = fs.readFileSync(filePath, 'utf8');

/**
 * Discover stubs from bits' package.json files.
 * Bits can declare stubs in their package.json under habits.stubs:
 * 
 * Simple format (no extra dependencies):
 * {
 *   "habits": {
 *     "stubs": {
 *       "dep": "./dist/stubs/dep.js"
 *     }
 *   }
 * }
 * 
 * Format with dependencies (installed in bundle-generator only):
 * {
 *   "habits": {
 *     "stubs": {
 *       "dep": {
 *         "path": "./dist/stubs/dep.js",
 *         "dependencies": {
 *           "dependency-of-dep": "^1.0.0"
 *         }
 *       }
 *     }
 *   }
 * }
 * 
 * This allows bits to provide browser-compatible replacements for Node.js packages.
 * 
 * @param {Array} bits - Array of bit objects with module property
 * @returns {Object} - { aliases: { packageName: stubPath }, dependencies: { packageName: version } }
 */
function discoverBitStubs(bits) {
    const aliases = {};
    const dependencies = {};
    const searchPaths = [
        path.join(__dirname, 'node_modules'),
        path.join(__dirname, '../node_modules'),
        process.cwd(),
        path.join(process.cwd(), 'node_modules'),
    ];
    
    for (const bit of bits) {
        try {
            const localPackagePaths = [
                path.join(__dirname, '../nodes/bits', bit.module, 'package.json'),
                path.join(process.cwd(), '../nodes/bits', bit.module, 'package.json'),
                path.join(process.cwd(), 'nodes/bits', bit.module, 'package.json'),
            ];

            let bitPackagePath = localPackagePaths.find((candidate) => fs.existsSync(candidate));

            // Fall back to installed package resolution
            if (!bitPackagePath) {
                bitPackagePath = require.resolve(`${bit.module}/package.json`, {
                    paths: searchPaths
                });
            }

            const bitPackage = JSON.parse(fs.readFileSync(bitPackagePath, 'utf8'));
            const bitDir = path.dirname(bitPackagePath);
            
            // Check for stubs declaration
            if (bitPackage.habits?.stubs) {
                for (const [packageName, stubConfig] of Object.entries(bitPackage.habits.stubs)) {
                    // Support both string (simple) and object (with dependencies) formats
                    const stubPath = typeof stubConfig === 'string' ? stubConfig : stubConfig.path;
                    const stubDeps = typeof stubConfig === 'object' ? stubConfig.dependencies : null;
                    
                    const fullStubPath = path.resolve(bitDir, stubPath);
                    if (fs.existsSync(fullStubPath)) {
                        aliases[packageName] = fullStubPath;
                        console.log(`🔀 Stub discovered: ${packageName} → ${fullStubPath}`);
                        
                        // Collect stub dependencies
                        if (stubDeps) {
                            Object.assign(dependencies, stubDeps);
                        }
                    } else {
                        console.warn(`⚠️ Stub not found: ${fullStubPath} (declared in ${bit.module})`);
                    }
                }
            }
        } catch (err) {
            // Bit package.json not found or not installed, skip
            console.log(`ℹ️ Could not read stubs from ${bit.module}: ${err.message}`);
        }
    }
    
    return { aliases, dependencies };
}

/**
 * Install stub dependencies into bundle-generator's node_modules.
 * These are only needed during bundling, not at runtime.
 * 
 * @param {Object} dependencies - { packageName: version }
 */
function installStubDependencies(dependencies) {
    if (!dependencies || Object.keys(dependencies).length === 0) {
        return;
    }
    
    const packagesToInstall = Object.entries(dependencies)
        .map(([name, version]) => `${name}@${version}`)
        .join(' ');
    
    console.log(`📦 Installing stub dependencies: ${packagesToInstall}`);
    
    try {
        execSync(`npm install --no-save ${packagesToInstall}`, {
            cwd: __dirname,
            stdio: 'inherit'
        });
        console.log(`✅ Stub dependencies installed`);
    } catch (err) {
        console.error(`❌ Failed to install stub dependencies: ${err.message}`);
        throw err;
    }
}


function generate(stack, workflows, env){
    // Replace placeholders in template with actual data using regex to match entire block
    const templateVarsRegex = /\/\/\/\/<template_variables>[\s\S]*?\/\/\/\/<\/template_variables>/;
    const newTemplateVars = `////<template_variables>
workflowConfig = ${JSON.stringify(stack.config, null, 2)};
workflowsMap = ${JSON.stringify(workflows, null, 2)};
envVars = ${JSON.stringify(env, null, 2)};
////</template_variables>`;
    
    let generatedCode = template.replace(templateVarsRegex, newTemplateVars);

    // Loop on bits and replace their placeholders
    let bitsImports = '';
    let bitsRegistration = '';
    stack.bits.forEach(bit => {
        const bitVar = `bit_${bit.id}`;
        const bitImport = `const ${bitVar} = require('${bit.module}');`;
        bitsImports += bitImport + '\n';
        
        // Add to local registry for getBitsRegistry()
        bitsRegistration += `bitsRegistry['${bit.module}'] = ${bitVar};\n`;
        // Register with cortex-core so ensureModuleInstalled knows it's bundled
        bitsRegistration += `registerBundledModule('${bit.module}', ${bitVar});\n`;
    });
    generatedCode = generatedCode.replace('////<bits_imports/>', bitsImports);
    generatedCode = generatedCode.replace('////<bits_registration/>', bitsRegistration);

    return generatedCode;
}

function run(stack, workflows, env){
    const code = generate(stack, workflows, env);
    // Write the generated code to a temp file in the main directory (where node_modules is)
    // so esbuild can resolve dependencies correctly
    const distDir = path.join(__dirname, 'dist');
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }
    const tempPath = path.join(__dirname, '_temp_generatedBundle.js');
    const outputPath = path.join(distDir, 'generatedBundle.js');
    fs.writeFileSync(tempPath, code, 'utf8');
    fs.writeFileSync(outputPath, code, 'utf8');
    console.log('Bundle generated at:', outputPath);

    // Discover stubs from bits' package.json files
    const { aliases: bitStubs, dependencies: stubDeps } = discoverBitStubs(stack.bits || []);
    
    // Install stub dependencies (browser packages needed only during bundling)
    installStubDependencies(stubDeps);

    // Esbuild the generated code to bundle all dependencies into a single file
    const esbuild = require('esbuild');
    const bundledOutputPath = path.join(distDir, 'bundle.js');

    // Path to our Node.js polyfills
    const polyfillsPath = path.join(__dirname, 'node-polyfills.js');
    

    // Node.js built-in modules that need polyfills
    const nodeBuiltins = [
        'events', 'util', 'stream', 'path', 'fs', 'http', 'https', 'os',
        'crypto', 'url', 'querystring', 'buffer', 'assert', 'zlib', 'net',
        'tls', 'dns', 'child_process', 'readline', 'vm', 'module', 'inspector',
        'process', 'string_decoder', 'tty', 'http2', 'worker_threads',
        'perf_hooks', 'async_hooks', 'timers', 'punycode', 'constants', 'cluster',
        // Common subpaths
        'fs/promises', 'util/types', 'path/posix', 'path/win32', 'stream/promises'
    ];

    // Create plugin to redirect relative driver imports to stubs
    const createStubRedirectPlugin = (stubAliases) => ({
        name: 'stub-redirect',
        setup(build) {
            // Match relative imports like ./driver, ./diffusion-driver, ../stubs, ./lib/stubs
            build.onResolve({ filter: /^\.\.?\/[a-z-]+(\/[a-z-]+)?$/ }, (args) => {
                // Find which package this import is coming from
                const importer = args.importer;
                if (!importer) return null;
                
                // Check if the importer is within a @ha-bits package
                // Handle both node_modules and local repo paths:
                // - node_modules/@ha-bits/bit-foo/...
                // - nodes/bits/@ha-bits/bit-foo/...
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
                
                // Check if we have a stub for this package's module
                if (stubAliases[stubKey]) {
                    console.log(`🔀 Redirecting ${args.path} from ${packageName} → ${stubAliases[stubKey]}`);
                    return { path: stubAliases[stubKey] };
                }
                
                return null; // Let esbuild resolve normally
            });
        }
    });
    
    // Plugin to redirect Node.js imports to polyfills
    const nodePolyfillPlugin = {
        name: 'node-polyfill',
        setup(build) {
            // Stub packages that can't work in browser/QuickJS (tiktoken and @ha-bits/cortex handled via alias)
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
                // Return a lazy stub that only throws when methods are actually called
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

            // Handle node: protocol imports
            build.onResolve({ filter: /^node:/ }, (args) => {
                const moduleName = args.path.replace('node:', '');
                return {
                    path: `polyfill:${moduleName}`,
                    namespace: 'node-polyfill',
                    pluginData: { moduleName }
                };
            });
            
            // Handle bare Node.js module imports (including subpaths like fs/promises)
            build.onResolve({ filter: /^(events|util|stream|path|fs|http|https|os|crypto|url|querystring|buffer|assert|zlib|net|tls|dns|child_process|readline|vm|module|inspector|process|string_decoder|tty|http2|worker_threads|perf_hooks|async_hooks|timers|punycode|constants|cluster)(\/.*)?$/ }, (args) => {
                // Extract base module name and subpath for polyfill lookup
                const moduleName = args.path;
                return {
                    path: `polyfill:${moduleName}`,
                    namespace: 'node-polyfill',
                    pluginData: { moduleName }
                };
            });

            // Load the polyfill and extract the right module - use unique path per module
            build.onLoad({ filter: /^polyfill:/, namespace: 'node-polyfill' }, (args) => {
                const moduleName = args.pluginData.moduleName;
                return {
                    contents: `
                        const polyfills = require(${JSON.stringify(polyfillsPath)});
                        module.exports = polyfills['${moduleName}'] || polyfills.events;
                    `,
                    loader: 'js',
                    resolveDir: __dirname
                };
            });

        }
    };
    
    // Global process shim for QuickJS (must run before any code that accesses process directly)
    const globalProcessShim = `
if (typeof globalThis.process === 'undefined') {
  globalThis.process = {
    env: {},
    cwd: function() { return '/'; },
    platform: 'quickjs',
    version: 'v0.0.0',
    versions: {},
    arch: 'unknown',
    pid: 1,
    stdout: { write: function(s) { if (typeof print !== 'undefined') console.log(s); return true; }, isTTY: false },
    stderr: { write: function(s) { if (typeof print !== 'undefined') console.error(s); return true; }, isTTY: false },
    stdin: { read: function() { return null; }, isTTY: false },
    exit: function() {},
    nextTick: function(cb) { setTimeout(cb, 0); },
    hrtime: function() { return [0, 0]; },
    memoryUsage: function() { return { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 }; },
    on: function() { return this; },
    once: function() { return this; },
    emit: function() { return false; },
    removeListener: function() { return this; }
  };
}
`;

    const esbuildOutput = esbuild.build({
        entryPoints: [tempPath],  // Use temp file in root directory
        bundle: true,
        outfile: bundledOutputPath,
        platform: 'browser',
        format: 'iife',
        mainFields: ['main', 'module'],
        minify: false,
        sourcemap: false,
        metafile: true,
        banner: { js: globalProcessShim },
        plugins: [createStubRedirectPlugin(bitStubs), nodePolyfillPlugin],
        // Add nodePaths to resolve @ha-bits packages from workspace locations
        nodePaths: [
            path.join(__dirname, 'node_modules'),
            path.join(__dirname, '../node_modules'),
            path.join(__dirname, '../nodes/bits'),
        ],
        // Alias @ha-bits packages to local node_modules
        // Bit stubs are discovered from package.json habits.stubs field
        alias: {
            '@ha-bits/cortex-core': path.join(__dirname, '../dist/packages/cortex/core/index.cjs'),
            // @ha-bits/cortex (full package) should resolve to cortex-core for bundling
            '@ha-bits/cortex': path.join(__dirname, '../dist/packages/cortex/core/index.cjs'),
            // Include @ha-bits/core for LoggerFactory etc. used by cortex-core
            '@ha-bits/core': path.join(__dirname, '../dist/packages/core/src/index.js'),
            // Stub native packages that can't run in browser
            'tiktoken': path.join(__dirname, 'stubs/tiktoken.js'),
            // Always include bit-database-sql driver stub for polling store deduplication
            // This is required by cortex-core's store.ts for polling triggers
            '@ha-bits/bit-database-sql/driver': path.join(__dirname, 'node_modules/@ha-bits/bit-database-sql/src/stubs/tauri-driver.js'),
            // Spread bit-declared stubs (e.g., dep → dep browser stub)
            ...bitStubs,
        },
        // External packages that can't be bundled (resolved at runtime in Tauri app)
        external: [
            '@ha-bits/bindings',
            '@habits/shared',
            // Tauri plugin APIs - only available at runtime in Tauri app
            'tauri-plugin-sms-api',
            'tauri-plugin-wifi-api',
            'tauri-plugin-matter-api',
            'tauri-plugin-system-settings-api',
            '@tauri-apps/plugin-geolocation',
        ],
        logLevel: 'info',
    }).then((result) => {
        fs.writeFileSync(path.join(distDir, 'meta.json'), JSON.stringify(result.metafile));

        // Clean up temp file
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
        console.log('Final bundle created at:', bundledOutputPath);
        return bundledOutputPath;
    }).catch((err) => {
        // Clean up temp file even on error
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
        console.error('Esbuild bundling failed:', err);
        throw err;
    });
    
    return esbuildOutput;
}

// Example usage
// run(yourStackObject, yourWorkflowsObject, yourEnvObject);

module.exports = {
    generate,
    run,
    discoverBitStubs,
    installStubDependencies,
};