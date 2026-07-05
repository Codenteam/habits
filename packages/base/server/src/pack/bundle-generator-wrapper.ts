/**
 * Bundle Generator CLI Wrapper
 *
 * Calls @ha-bits/bundle-generator via npx to generate IIFE bundles
 * embedded inside .habit archives.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { LoggerFactory } from '@ha-bits/core/logger';

const logger = LoggerFactory.getRoot();

/**
 * Find the local bundle-generator CLI if available
 */
function findLocalBundleGenerator(): string | null {
  const possiblePaths = [
    path.join(process.cwd(), 'bundle-generator', 'cli.js'),
    path.join(__dirname, '..', '..', '..', '..', '..', 'bundle-generator', 'cli.js'),
    path.join(__dirname, '..', '..', '..', '..', '..', '..', 'bundle-generator', 'cli.js'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Options for generating a bundle via npx
 */
export interface BundleGeneratorOptions {
  /** Array of workflow objects to embed in the bundle */
  habits: any[];
  /** Application name for bundle identification */
  appName?: string;
  /** Environment variables to embed (from .env file) */
  envVars?: Record<string, string>;
}

/**
 * Result of bundle generation
 */
export interface BundleGeneratorResult {
  success: boolean;
  /** The generated JavaScript code */
  code?: string;
  /** List of bits modules that were bundled */
  bundledBits?: string[];
  /** Any errors that occurred */
  error?: string;
  /** Bundle size in bytes */
  size?: number;
}

/**
 * Extract bits modules from workflows
 */
function extractBitsFromWorkflows(workflows: any[]): Array<{ id: string; module: string }> {
  const bitsSet = new Set<string>();

  for (const workflow of workflows) {
    for (const node of workflow.nodes || []) {
      if (node.type === 'bits' || node.data?.framework === 'bits') {
        const moduleName = node.data?.module;
        if (moduleName) {
          logger.debug(`Found bits module in workflow ${workflow.name || workflow.id}: ${moduleName}`);
          bitsSet.add(moduleName);
        }
      }
    }
  }

  return Array.from(bitsSet).map((moduleName) => {
    const id = moduleName
      .replace('@ha-bits/', '')
      .replace(/^bit-/, '')
      .replace(/-([a-z])/g, (_: string, char: string) => char.toUpperCase());

    return { id, module: moduleName };
  });
}

/**
 * Generate a bundle using @ha-bits/bundle-generator via npx
 */
export async function generateBundle(options: BundleGeneratorOptions): Promise<BundleGeneratorResult> {
  const totalStart = Date.now();
  const {
    habits,
    appName = 'HabitsApp',
    envVars = {},
  } = options;

  if (!habits || habits.length === 0) {
    return {
      success: false,
      error: 'No habits (workflows) provided',
    };
  }

  logger.info(`Generating bundle via for ${habits.length} workflow(s), which are : ${habits.map(h => h.name || h.id).join(', ')}`);

  const bits = extractBitsFromWorkflows(habits);
  logger.info(`Found ${bits.length} bits module(s): ${bits.map(b => b.module).join(', ') || 'none'}`);

  const workflowsMap: Record<string, any> = {};
  for (const workflow of habits) {
    const id = workflow.id || `workflow-${habits.indexOf(workflow)}`;
    workflowsMap[id] = workflow;
  }

  const stackConfig = {
    name: appName,
    version: '1.0',
    workflows: habits.map((w, i) => ({
      id: w.id || `workflow-${i}`,
      path: `inline:${w.id || `workflow-${i}`}`,
      enabled: true,
    })),
  };

  const inputJson = {
    stack: {
      config: stackConfig,
      bits: bits,
    },
    workflows: workflowsMap,
    env: envVars,
  };

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bundle-gen-'));
  const inputPath = path.join(tmpDir, 'input.json');
  const outputPath = path.join(tmpDir, 'bundle.js');

  try {
    fs.writeFileSync(inputPath, JSON.stringify(inputJson, null, 2));
    logger.debug(`Written input file: ${inputPath}`);

    const localBundleGenerator = findLocalBundleGenerator();

    const command = localBundleGenerator
      ? `node "${localBundleGenerator}" --input "${inputPath}" --output "${outputPath}"`
      : `npx @ha-bits/bundle-generator --input "${inputPath}" --output "${outputPath}"`;

    logger.info(`Running bundle-generator${localBundleGenerator ? ' (local)' : ' (npx)'}...`);

    try {
      const commandStart = Date.now();
      logger.info(`Bundle generator command start: ${new Date(commandStart).toISOString()}`);
      execSync(command, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000,
        env: { ...process.env, NODE_ENV: 'production' },
        cwd: localBundleGenerator ? path.dirname(localBundleGenerator) : process.cwd(),
      });
      logger.info(`Bundle generator command completed in ${Date.now() - commandStart}ms`);
    } catch (execError: any) {
      const stderr = execError.stderr?.toString() || '';
      const stdout = execError.stdout?.toString() || '';
      logger.error(`Bundle generator failed: ${stderr || stdout || execError.message}`);
      logger.error(`Bundle generation failed after ${Date.now() - totalStart}ms`);
      return {
        success: false,
        error: `Bundle generation failed: ${stderr || stdout || execError.message}`,
      };
    }

    if (!fs.existsSync(outputPath)) {
      return {
        success: false,
        error: 'Bundle generator completed but output file not found',
      };
    }

    const code = fs.readFileSync(outputPath, 'utf8');
    logger.info(`Bundle generated: ${(code.length / 1024).toFixed(2)} KB in ${Date.now() - totalStart}ms`);

    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    return {
      success: true,
      code,
      bundledBits: bits.map(b => b.module),
      size: code.length,
    };
  } catch (error: any) {
    logger.error(`Bundle generation failed: ${error.message}`);
    logger.error(`Bundle generation failed after ${Date.now() - totalStart}ms`);

    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

export default generateBundle;
