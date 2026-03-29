// Node.js version check - must be before any imports
const nodeVersion = parseInt(process.version.slice(1).split('.')[0], 10);
if (nodeVersion < 24) {
  console.error(`\n❌ Error: Node.js 24 or higher is required.`);
  console.error(`   Current version: ${process.version}`);
  console.error(`   Please upgrade Node.js: https://nodejs.org/\n`);
  process.exit(1);
}


import { runCLI } from './cli';

runCLI().catch((error) => {
  console.error('❌ CLI failed:', error);
  process.exit(1);
});
