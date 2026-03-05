#!/usr/bin/env node
/**
 * CLI for running bit tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { runYamlTestFile, runTsTestFileAuto } from './runner';
import { TestSuiteResult } from './types';

// ANSI color codes (chalk-like but simpler)
const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

interface CliOptions {
  file?: string;
  action?: string;
  verbose?: boolean;
  help?: boolean;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--file' || arg === '-f') {
      options.file = args[++i];
    } else if (arg === '--action' || arg === '-a') {
      options.action = args[++i];
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }
  
  return options;
}

function printHelp(): void {
  console.log(`
${colors.bold('bits-test')} - Dead simple bit testing

${colors.cyan('Usage:')}
  bits-test -f <path> [options]

${colors.cyan('Options:')}
  -f, --file <path>      Path to test file (required)
  -a, --action <name>    Only run tests for specific action
  -v, --verbose          Show detailed output
  -h, --help             Show this help

${colors.cyan('Examples:')}
  bits-test -f ./path/to/test.yaml
  bits-test -f /full/path/to/test.yaml -v
`);
}

function printResult(result: TestSuiteResult, verbose: boolean): void {
  const relativePath = path.relative(process.cwd(), result.bitPath);
  console.log(`\n${colors.bold(relativePath)}`);
  
  for (const test of result.results) {
    const icon = test.passed ? colors.green('✓') : colors.red('✗');
    const duration = colors.gray(`(${test.duration}ms)`);
    console.log(`  ${icon} ${test.name} ${duration}`);
    
    if (!test.passed && (verbose || test.error)) {
      if (test.error) {
        console.log(colors.red(`    Error: ${test.error}`));
      }
      if (test.expected !== undefined) {
        console.log(colors.gray(`    Expected: ${JSON.stringify(test.expected)}`));
      }
      if (test.actual !== undefined) {
        console.log(colors.gray(`    Actual: ${JSON.stringify(test.actual)}`));
      }
    }
  }
}

function printSummary(results: TestSuiteResult[]): void {
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log('\n' + colors.bold('─'.repeat(50)));
  
  if (totalFailed === 0) {
    console.log(colors.green(`\n✓ ${totalPassed} tests passed`) + colors.gray(` (${totalDuration}ms)`));
  } else {
    console.log(
      colors.red(`\n✗ ${totalFailed} failed`) +
      colors.gray(', ') +
      colors.green(`${totalPassed} passed`) +
      colors.gray(` (${totalDuration}ms)`)
    );
  }
}

function resolveTestFile(filePath: string): string | null {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    return fullPath;
  }
  return null;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  
  if (options.help) {
    printHelp();
    process.exit(0);
  }
  
  console.log(colors.bold('\n🧪 Bit Testing\n'));
  
  if (!options.file) {
    console.log(colors.yellow('No test file specified. Use -f <path> to specify a test file.'));
    printHelp();
    process.exit(1);
  }

  const testFile = resolveTestFile(options.file);
  
  if (!testFile) {
    console.log(colors.red(`Test file not found: ${options.file}`));
    process.exit(1);
  }
  
  const testFiles = [testFile];
  
  // Run tests
  const results: TestSuiteResult[] = [];
  
  for (const file of testFiles) {
    try {
      let result: TestSuiteResult;
      
      if (file.endsWith('.yaml')) {
        result = await runYamlTestFile(file);
      } else if (file.endsWith('.ts')) {
        result = await runTsTestFileAuto(file);
      } else {
        console.log(colors.yellow(`Skipping unsupported file format: ${file}`));
        continue;
      }
      
      results.push(result);
      printResult(result, options.verbose || false);
    } catch (e) {
      console.log(colors.red(`\nError running ${file}:`));
      console.log(colors.red((e as Error).message));
      results.push({
        bitPath: file,
        results: [{
          name: 'File load error',
          passed: false,
          duration: 0,
          error: (e as Error).message,
        }],
        passed: 0,
        failed: 1,
        duration: 0,
      });
    }
  }
  
  // Print summary
  printSummary(results);
  
  // Exit with error code if any tests failed
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error(colors.red('Fatal error:'), e);
  process.exit(1);
});
