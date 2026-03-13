const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { generate, run } = require('./generator');

// Load marketing-campaign showcase files
const showcasePath = path.join(__dirname, '../showcase/marketing-campaign');

// Load stack.yaml (config)
const stackPath = path.join(showcasePath, 'stack.yaml');
const stackContent = fs.readFileSync(stackPath, 'utf8');
const stack = yaml.load(stackContent);

// Build workflows map by iterating through workflows in stack.yaml
const workflows = {};
const usedBitsSet = new Set();

if (stack.workflows && Array.isArray(stack.workflows)) {
  for (const workflowEntry of stack.workflows) {
    if (!workflowEntry.enabled) continue;
    
    // Resolve workflow path relative to stack.yaml
    const workflowPath = path.resolve(showcasePath, workflowEntry.path);
    
    if (!fs.existsSync(workflowPath)) {
      console.warn(`Warning: Workflow file not found: ${workflowPath}`);
      continue;
    }
    
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    const workflow = yaml.load(workflowContent);
    
    // Add to workflows map using the id from stack.yaml
    workflows[workflowEntry.id] = workflow;
    
    // Extract bits from workflow nodes
    if (workflow.nodes && Array.isArray(workflow.nodes)) {
      for (const node of workflow.nodes) {
        if (node.type === 'bits' && node.data?.module) {
          usedBitsSet.add(JSON.stringify({
            module: node.data.module,
            source: node.data.source || 'npm',
          }));
        }
      }
    }
  }
}

// Convert bits set to array with unique ids
const bits = Array.from(usedBitsSet).map((bitJson, index) => {
  const bitData = JSON.parse(bitJson);
  // Generate id from module name (e.g., @ha-bits/bit-intersect -> bitIntersect)
  const idFromModule = bitData.module
    .replace('@ha-bits/', '')
    .replace(/^bit-/, '')
    .replace(/-([a-z])/g, (_, char) => char.toUpperCase());
  
  return {
    id: idFromModule,
    ...bitData,
  };
});

// Load environment variables from .env file beside stack.yaml
const envPath = path.join(showcasePath, '.env');
const env = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  }
} else {
  console.warn(`Warning: .env file not found at ${envPath}`);
}

// Build stack object with config and bits
const stackObject = {
  config: stack,
  bits: bits,
};

console.log('=== Testing Bundle Generator ===\n');

console.log('1. Stack Config:', JSON.stringify(stackObject.config, null, 2));
console.log('\n2. Workflows discovered:', Object.keys(workflows));
console.log('\n3. Bits extracted from workflows:', bits);
console.log('\n4. Environment Variables:', Object.keys(env));

(async () => {
  try {
    // Test generate function
    console.log('\n5. Generating bundle...');
    const generatedCode = generate(stackObject, workflows, env);
  
  console.log('\n6. Generated code length:', generatedCode.length, 'characters');
  
  // Check that placeholders were replaced
  const hasWorkflowConfig = generatedCode.includes('workflowConfig = {');
  const hasWorkflowsMap = generatedCode.includes('workflowsMap = {');
  const hasEnvVars = generatedCode.includes('envVars = {');
  const hasBitsImports = bits.length === 0 || bits.some(bit => generatedCode.includes(`const ${bit.id}`));
  
  console.log('\n7. Validation:');
  console.log('   - workflowConfig replaced:', hasWorkflowConfig);
  console.log('   - workflowsMap replaced:', hasWorkflowsMap);
  console.log('   - envVars replaced:', hasEnvVars);
  console.log('   - bits imports added:', hasBitsImports);
  
  // Run the full generation (writes to file and bundles with esbuild)
  console.log('\n8. Running full generation (writes to generatedBundle.js)...');
  await run(stackObject, workflows, env);
  
  // Verify output file exists
  const outputPath = path.join(__dirname, 'dist/generatedBundle.js');
  const outputExists = fs.existsSync(outputPath);
  console.log('   - Output file created:', outputExists);
  
  if (outputExists) {
    const outputStats = fs.statSync(outputPath);
    console.log('   - Output file size:', outputStats.size, 'bytes');
  }
  
  // Verify bundled output file exists
  const bundlePath = path.join(__dirname, 'dist/bundle.js');
  const bundleExists = fs.existsSync(bundlePath);
  console.log('   - Final bundle created:', bundleExists);
  
  if (bundleExists) {
    const bundleStats = fs.statSync(bundlePath);
    console.log('   - Final bundle size:', bundleStats.size, 'bytes');
  }
  
  console.log('\n=== Test Complete ===');
  
  } catch (error) {
    console.error('\nError during generation:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
