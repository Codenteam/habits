#!/usr/bin/env node

/**
 * CLI for @ha-bits/bundle-generator
 * 
 * Usage:
 *   npx @ha-bits/bundle-generator --input config.json --output bundle.js
 *   npx @ha-bits/bundle-generator < config.json > bundle.js
 * 
 * Input JSON format:
 * {
 *   "stack": { "config": {...}, "bits": [...] },
 *   "workflows": { "workflowId": {...}, ... },
 *   "env": { "VAR1": "value1", ... },
 *   "outputDir": "/path/to/output" // optional, defaults to tmp dir
 * }
 */

const fs = require('fs');
const path = require('path');
const { run } = require('./generator');

// Parse command line arguments
const args = process.argv.slice(2);
let inputPath = null;
let outputPath = null;
let outputDir = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input' || args[i] === '-i') {
    inputPath = args[++i];
  } else if (args[i] === '--output' || args[i] === '-o') {
    outputPath = args[++i];
  } else if (args[i] === '--output-dir' || args[i] === '-d') {
    outputDir = args[++i];
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
@ha-bits/bundle-generator - Generate IIFE bundles for habits workflows

Usage:
  npx @ha-bits/bundle-generator --input config.json [--output bundle.js] [--output-dir /path/to/dir]

Options:
  -i, --input       Path to input JSON configuration file (required)
  -o, --output      Path to output bundle.js file (optional, defaults to stdout)
  -d, --output-dir  Directory for intermediate files (optional)
  -h, --help        Show this help message

Input JSON format:
{
  "stack": { 
    "config": { /* stack.yaml content */ }, 
    "bits": [{ "id": "bitName", "module": "@ha-bits/bit-name" }] 
  },
  "workflows": { 
    "workflowId": { /* workflow object */ } 
  },
  "env": { 
    "API_KEY": "value" 
  }
}
`);
    process.exit(0);
  }
}

// Read input
let inputJson;
try {
  if (inputPath) {
    inputJson = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } else {
    // Read from stdin
    let inputData = '';
    const stdin = fs.readFileSync(0, 'utf8');
    inputJson = JSON.parse(stdin);
  }
} catch (err) {
  console.error('Error reading input:', err.message);
  process.exit(1);
}

// Validate input
if (!inputJson.stack || !inputJson.workflows) {
  console.error('Error: Input JSON must contain "stack" and "workflows" properties');
  process.exit(1);
}

const { stack, workflows, env = {} } = inputJson;

// Set output directory if provided
if (outputDir || inputJson.outputDir) {
  const targetDir = outputDir || inputJson.outputDir;
  // Create the directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
}

// Run the generator
async function main() {
  try {
    const bundlePath = await run(stack, workflows, env);
    
    // Read the generated bundle
    const bundleContent = fs.readFileSync(bundlePath, 'utf8');
    
    if (outputPath) {
      // Write to specified output file
      fs.writeFileSync(outputPath, bundleContent);
      console.error(`Bundle written to: ${outputPath}`);
    } else {
      // Write to stdout
      process.stdout.write(bundleContent);
    }
  } catch (err) {
    console.error('Error generating bundle:', err.message);
    process.exit(1);
  }
}

main();
