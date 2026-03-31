#!/usr/bin/env -S npx tsx
import { execSync } from 'child_process';
import * as path from 'path';

const screenshotsDir = __dirname;

console.log('='.repeat(50));
console.log('Step 1: Capturing screenshots...');
console.log('='.repeat(50));

try {
  execSync(`npx tsx "${path.join(screenshotsDir, 'automate-screenshots.ts')}"`, {
    stdio: 'inherit',
    cwd: screenshotsDir,
  });
} catch (error) {
  console.error('Screenshot capture failed!');
  process.exit(1);
}

console.log('\n' + '='.repeat(50));
console.log('Step 2: Processing screenshots into device frames...');
console.log('='.repeat(50) + '\n');

try {
  execSync(`npx tsx "${path.join(screenshotsDir, 'process.cts')}"`, {
    stdio: 'inherit',
    cwd: screenshotsDir,
  });
} catch (error) {
  console.error('Screenshot processing failed!');
  process.exit(1);
}

console.log('\n' + '='.repeat(50));
console.log('All done! Screenshots captured and processed.');
console.log('='.repeat(50));
