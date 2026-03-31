/**
 * Test script for the new tailwind-inliner
 */

import * as fs from 'fs';
import * as path from 'path';
import { processHtmlFile } from './packages/base/server/src/pack/html-asset-inliner';

async function main() {
  const inputFile = process.argv[2] || './showcase/hello-world/frontend/index.html';
  const outputFile = process.argv[3] || './inlined-hello-world-output.html';

  console.log('Reading HTML file:', inputFile);
  const htmlContent = fs.readFileSync(inputFile, 'utf8');

  console.log('Processing HTML with Tailwind inliner...');
  const result = await processHtmlFile(htmlContent, {
    baseDir: path.dirname(inputFile),
  });

  console.log('Writing output to:', outputFile);
  fs.writeFileSync(outputFile, result.html, 'utf8');

  console.log('✅ Done!');
  console.log('  - Tailwind processed:', result.tailwindProcessed);
  console.log('  - Output file size:', Math.round(result.html.length / 1024), 'KB');
}

main().catch(console.error);
