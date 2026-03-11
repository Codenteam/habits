#!/usr/bin/env node

const esbuild = require('esbuild');
const path = require('path');

async function bundle() {
  const outfile = path.join(__dirname, '../dist/cortex-intersect-bundle.js');

  try {
    const result = await esbuild.build({entryPoints: [path.join(__dirname, 'bundle-entry.js')],
      bundle: true,
      outfile,
      platform: 'node',
      format: 'esm',
      sourcemap: true,
      minify: true,
      metafile: true,
      logLevel: 'info'

    });

    console.log(`\nBundle created: ${outfile}`);
    
    // Print bundle size info
    const outputs = result.metafile.outputs;
    for (const [file, info] of Object.entries(outputs)) {
      if (file.endsWith('.js')) {
        console.log(`Size: ${(info.bytes / 1024 / 1024).toFixed(2)} MB`);
      }
    }
  } catch (error) {
    console.error('Bundle failed:', error);
    process.exit(1);
  }
}

bundle();
