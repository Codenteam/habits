
// Read template from template.js as string
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'template.js'); 
const template = fs.readFileSync(filePath, 'utf8');


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
        const bitImport = `const ${bit.id} = require('${bit.module}');`;
        bitsImports += bitImport + '\n';
        
        // Add to local registry for getBitsRegistry()
        bitsRegistration += `bitsRegistry['${bit.module}'] = ${bit.id};\n`;
        // Register with cortex-core so ensureModuleInstalled knows it's bundled
        bitsRegistration += `registerBundledModule('${bit.module}', ${bit.id});\n`;
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
        'perf_hooks', 'async_hooks', 'timers', 'punycode', 'constants', 'cluster'
    ];
    
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
            
            // Handle bare Node.js module imports
            build.onResolve({ filter: new RegExp(`^(${nodeBuiltins.join('|')})$`) }, (args) => {
                return {
                    path: `polyfill:${args.path}`,
                    namespace: 'node-polyfill',
                    pluginData: { moduleName: args.path }
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
    stdout: { write: function(s) { if (typeof print !== 'undefined') print(s); return true; }, isTTY: false },
    stderr: { write: function(s) { if (typeof print !== 'undefined') print(s); return true; }, isTTY: false },
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
        platform: 'neutral',
        format: 'iife',
        mainFields: ['main', 'module'],
        minify: false,
        sourcemap: false,
        metafile: true,
        banner: { js: globalProcessShim },
        plugins: [nodePolyfillPlugin],
        // Alias @ha-bits packages to local node_modules
        alias: {
            '@ha-bits/bit-intersect': path.join(__dirname, 'node_modules/@ha-bits/bit-intersect/dist/index.js'),
            '@ha-bits/cortex-core': path.join(__dirname, 'node_modules/@ha-bits/cortex-core/index.cjs'),
            // @ha-bits/cortex (full package) should resolve to cortex-core for bundling
            '@ha-bits/cortex': path.join(__dirname, 'node_modules/@ha-bits/cortex-core/index.cjs'),
            // Stub native packages that can't run in browser
            'tiktoken': path.join(__dirname, 'stubs/tiktoken.js'),
        },
        // External packages that can't be bundled
        external: [
            '@activepieces/*',
            '@ha-bits/bindings',
            '@ha-bits/core',
            '@habits/shared',
            'inherits',
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
};