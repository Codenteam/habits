#!/usr/bin/env node
/**
 * Generate example zip files for documentation downloads.
 * Excludes .env files (keeps .env.example).
 * 
 * Usage: node scripts/generate-example-zips.js
 * 
 * Output: docs/public/downloads/<example-name>.zip
 */

import { existsSync, mkdirSync, readdirSync, statSync, readFileSync, createWriteStream } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');
const examplesDir = join(rootDir, 'examples');
const outputDir = join(rootDir, 'docs/public/downloads');

// Examples to generate zips for (map: example-folder -> output-name)
const exampleMap = {
  'mixed': 'mixed.zip',
  'email-classification': 'email-classification.zip',
  'business-intersect-standalone': 'intersect.zip',
  'minimal-blog': 'minimal-blog.zip',
};

function createZip(exampleName, outputName) {
  const examplePath = join(examplesDir, exampleName);
  const outputPath = join(outputDir, outputName);
  
  if (!existsSync(examplePath)) {
    console.error(`❌ Example not found: ${exampleName}`);
    return false;
  }
  
  try {
    // Use system zip command, excluding .env files
    execSync(
      `cd "${examplesDir}" && zip -r "${outputPath}" "${exampleName}" -x "*.env" -x "*/.env" -x "*.DS_Store" -x "*/node_modules/*" -x "*/results.json" -x "*/results.txt"`,
      { stdio: 'pipe' }
    );
    
    const stat = statSync(outputPath);
    console.log(`✅ Created ${outputName} (${stat.size} bytes)`);
    return true;
  } catch (err) {
    console.error(`❌ Error creating ${outputName}:`, err.message);
    return false;
  }
}

function main() {
  console.log('📦 Generating example zip files...\n');
  
  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  let succeeded = 0;
  const total = Object.keys(exampleMap).length;
  
  for (const [example, output] of Object.entries(exampleMap)) {
    if (createZip(example, output)) {
      succeeded++;
    }
  }
  
  console.log(`\n✨ Generated ${succeeded}/${total} zip files in ${relative(rootDir, outputDir)}`);
  
  if (succeeded < total) {
    process.exit(1);
  }
}

main();
