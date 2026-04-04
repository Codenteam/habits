/**
 * Habits CLI - Unified command line interface
 * 
 * Usage:
 *   npx habits init
 *   npx habits cortex --config ./config.json
 *   npx habits execute --config ./config.json --id <workflow-id>
 *   npx habits convert --input ./workflow.json --output ./habits.json
 *   npx habits edit [--port 3000]
 *   npx habits base [--port 3000]  (alias for edit)
 *   npx habits bundle [--config ./stack.yaml]
 *   npx habits pack --config ./stack.yaml --format bundle
 *   npx habits pack --config ./stack.yaml --format habit
 *   npx habits pack --config ./stack.yaml --format tauri
 *   npx habits pack --config ./stack.yaml --format single-executable
 * 
 * Commands:
 *   init     Initialize a new Habits project with .env and modules.json
 *   cortex   Start the Habits server (Cortex mode)
 *   execute  Execute a workflow from file or config
 *   convert  Convert a workflow from Script format to Habits format
 *   edit|base     Start the Base server for editing modules and workflows
 *   bundle   Generate cortex-bundle.js for browser/Tauri (shortcut for pack --format bundle)
 *   pack     Generate standalone bundle, Tauri app, binary (SEA), .habit file, or mobile app
 * 
 * Pack formats:
 *   habit    Self-contained .habit file (zip with index.html + cortex-bundle.js) for Cortex app
 */

import * as fs from 'fs';
import * as path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import dotenv from 'dotenv';
import { startHabitsServer, startBaseServer } from './server';
import { WorkflowExecutor } from '@ha-bits/cortex';
import { convertWorkflow, convertWorkflowWithConnections } from '@ha-bits/core';
import { defaultModules } from './modules';
import {
  getSupportedPlatforms,
  runPackCommand as executePackCommand,
  getSupportedPackFormats,
  getSupportedDesktopPlatforms,
  getSupportedMobileTargets,
  PackFormat,
} from '@ha-bits/base';

// Load environment variables
dotenv.config();

export interface HabitsCommandOptions {
  /** Port for server */
  port?: number;
  /** Host for server */
  host?: string;
  /** Path to config file */
  config?: string;
  /** Workflow file path */
  workflow?: string;
  /** Workflow ID */
  id?: string;
  /** Execute all workflows */
  all?: boolean;
  /** Input data */
  input?: string;
  /** Input file path for convert */
  inputFile?: string;
  /** Output file path for convert */
  output?: string;
  /** Pretty print */
  pretty?: boolean;
}

/**
 * Run the Habits CLI
 */
export async function runCLI(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('habits')
    .usage('$0 <command> [options]')
    .command(['cortex', 'start', 'serve', 'server'], 'Start the Habits server (Cortex mode)', {
      port: {
        alias: 'p',
        describe: 'Server port',
        type: 'number',
      },
      config: {
        alias: 'c',
        describe: 'Path to config.json file for workflows',
        type: 'string',
        demandOption: true,
      },
    })
    .command('execute [workflow]', 'Execute a workflow from file or config', {
      workflow: {
        describe: 'Path to workflow JSON file',
        type: 'string',
      },
      config: {
        alias: 'c',
        describe: 'Path to config.json file',
        type: 'string',
      },
      id: {
        describe: 'Workflow ID to execute (when using --config)',
        type: 'string',
      },
      all: {
        describe: 'Execute all workflows from config',
        type: 'boolean',
        default: false,
      },
      input: {
        alias: 'i',
        describe: 'Input data as JSON string or path to JSON file',
        type: 'string',
      },
    })
    .command('convert', 'Convert a workflow from Script format to Habits format', {
      input: {
        alias: 'i',
        describe: 'Path to input workflow JSON file',
        type: 'string',
        demandOption: true,
      },
      output: {
        alias: 'o',
        describe: 'Path to output file',
        type: 'string',
      },
      pretty: {
        describe: 'Pretty print output',
        type: 'boolean',
        default: true,
      },
    })
    .command(['base', 'edit', 'create'], 'Start the Base server for editing modules and workflows (Alias: edit)', {
      port: {
        alias: 'p',
        describe: 'Server port',
        type: 'number',
      },
    })
    .command('edit', false, {
      port: {
        alias: 'p',
        describe: 'Server port',
        type: 'number',
      },
    })
    .command('init', 'Initialize a new Habits project with .env and modules.json', {
      force: {
        alias: 'f',
        describe: 'Overwrite existing files',
        type: 'boolean',
        default: false,
      },
    })
    .command('bundle', 'Generate a cortex-bundle.js for browser/Tauri execution (shortcut for pack --format bundle)', {
      config: {
        alias: 'c',
        describe: 'Path to stack.yaml config file (defaults to ./stack.yaml)',
        type: 'string',
        default: './stack.yaml',
      },
      output: {
        alias: 'o',
        describe: 'Output path for the bundle (defaults to ./dist/cortex-bundle.js)',
        type: 'string',
      },
    })
    .command(['pack', 'bundle'], 'Package habits into executable, bundle, Tauri app, desktop app, or mobile app', {
      config: {
        alias: 'c',
        describe: 'Path to stack.yaml config file',
        type: 'string',
        demandOption: true,
      },
      output: {
        alias: 'o',
        describe: 'Output path for the generated artifact',
        type: 'string',
      },
      format: {
        alias: 'f',
        describe: 'Output format: single-executable, bundle, habit, tauri, desktop, desktop-full, mobile, mobile-full',
        type: 'string',
        default: 'single-executable',
        choices: getSupportedPackFormats(),
      },
      platform: {
        describe: 'Target platform for single-executable (darwin-arm64, darwin-x64, linux-x64, win32-x64, current)',
        type: 'string',
        default: 'current',
        choices: getSupportedPlatforms(),
      },
      'backend-url': {
        describe: 'Backend API URL for desktop/mobile apps (required for frontend-only modes)',
        type: 'string',
      },
      'desktop-platform': {
        describe: 'Desktop output format: dmg, exe, appimage, deb, rpm, msi, all',
        type: 'string',
        default: 'all',
        choices: getSupportedDesktopPlatforms(),
      },
      'mobile-target': {
        describe: 'Mobile target: ios, android, both',
        type: 'string',
        default: 'both',
        choices: getSupportedMobileTargets(),
      },
      'app-name': {
        describe: 'Custom app name (overrides stack.yaml name)',
        type: 'string',
      },
      'app-icon': {
        describe: 'Path to app icon (PNG file)',
        type: 'string',
      },
      'debug': {
        describe: 'Build in debug mode',
        type: 'boolean',
        default: false,
      },
      'include-env': {
        describe: 'Include .env values in bundle (default: false for security)',
        type: 'boolean',
        default: false,
      },
    })
    .demandCommand(1, 'You need to specify a command')
    .help()
    .version()
    .argv;

  const command = argv._[0] as string;

  try {
    switch (command) {
      case 'cortex':
        await runServerCommand(argv);
        break;
      case 'execute':
        await runExecuteCommand(argv);
        break;
      case 'convert':
        await runConvertCommand(argv);
        break;
      case 'edit':
      case 'base':
        await runEditCommand(argv);
        break;
      case 'init':
        await runInitCommand(argv);
        break;
      case 'bundle':
        await runPackCommand(argv);
        break;
      case 'pack':
        await runPackCommand(argv);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Run the server command
 */
async function runServerCommand(argv: any): Promise<void> {
  const configPath = path.resolve(argv.config);
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  
  console.log('🚀 Starting Habits server...\n');
  
  const server = await startHabitsServer({
    configPath,
    port: argv.port,
  });
  
  // Keep the process running
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down...');
    await server.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });
}

/**
 * Run the edit command (Base server mode)
 */
async function runEditCommand(argv: any): Promise<void> {
  console.log('🚀 Starting Base server (edit mode)...\n');
  
  const server = await startBaseServer({
    port: argv.port,
  });
  
  // Keep the process running
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down...');
    await server.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });
}

/**
 * Run the execute command
 */
async function runExecuteCommand(argv: any): Promise<void> {
  let workflows: any[] = [];
  
  // Load workflows from config or individual file
  if (argv.config) {
    const configPath = path.resolve(argv.config);
    const configDir = path.dirname(configPath);
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    let workflowRefs = config.workflows || [];
    
    // Filter by ID if specified
    if (argv.id) {
      workflowRefs = workflowRefs.filter((w: any) => w.id === argv.id);
      if (workflowRefs.length === 0) {
        throw new Error(`Workflow with ID '${argv.id}' not found in config`);
      }
    }
    
    // If not --all and no ID, just take the first one
    if (!argv.all && !argv.id) {
      workflowRefs = workflowRefs.slice(0, 1);
    }

    // Load actual workflow files from references
    for (const ref of workflowRefs) {
      const workflowPath = path.isAbsolute(ref.path) 
        ? ref.path 
        : path.resolve(configDir, ref.path);
      
      if (!fs.existsSync(workflowPath)) {
        console.error(`⚠️ Workflow file not found: ${workflowPath}`);
        continue;
      }
      
      const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));
      // Use config id if provided, otherwise workflow's own id
      workflow.id = ref.id || workflow.id;
      workflows.push(workflow);
    }
  } else if (argv.workflow) {
    const workflowPath = path.resolve(argv.workflow);
    if (!fs.existsSync(workflowPath)) {
      throw new Error(`Workflow file not found: ${workflowPath}`);
    }
    
    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));
    workflows = [workflow];
  } else {
    throw new Error('Either --config or a workflow file path is required');
  }

  // Parse input if provided
  let input: any = {};
  if (argv.input) {
    if (fs.existsSync(argv.input)) {
      input = JSON.parse(fs.readFileSync(argv.input, 'utf-8'));
    } else {
      try {
        input = JSON.parse(argv.input);
      } catch {
        input = { value: argv.input };
      }
    }
  }

  console.log(`\n📋 Executing ${workflows.length} workflow(s)...\n`);

  const executor = new WorkflowExecutor();

  for (const workflow of workflows) {
    console.log(`\n▶️  Executing: ${workflow.id || workflow.name || 'unnamed'}\n`);
    
    const result = await executor.executeWorkflow(workflow, { initialContext: input });
    
    console.log('\n✅ Result:');
    console.log(JSON.stringify(result, null, 2));
  }
}

/**
 * Run the convert command
 */
async function runConvertCommand(argv: any): Promise<void> {
  const inputPath = path.resolve(argv.input);
  
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }
  
  const inputWorkflow = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  
  console.log(`📄 Converting: ${inputPath}\n`);
  
  const result = convertWorkflow(inputWorkflow);
  
  const output = argv.pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result);
  
  if (argv.output) {
    const outputPath = path.resolve(argv.output);
    fs.writeFileSync(outputPath, output);
    console.log(`✅ Saved to: ${outputPath}`);
  } else {
    console.log(output);
  }
}
/**
 * Run the init command - initialize a new Habits project
 */
async function runInitCommand(argv: any): Promise<void> {
  const cwd = process.cwd();
  const envPath = path.join(cwd, '.env');
  const modulesPath = path.join(cwd, 'modules.json');
  
  console.log('🚀 Initializing Habits project...\n');
  
  // Default .env content
  const envContent = `HABITS_MODULES_MODE=open
HABITS_ALLOW_SERVE=true
`;

  // Default modules.json content
  const modulesContent = defaultModules;

  // Create .env file
  if (fs.existsSync(envPath) && !argv.force) {
    console.log(`⚠️  .env already exists (use --force to overwrite)`);
  } else {
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Created .env`);
  }

  // Create modules.json file
  if (fs.existsSync(modulesPath) && !argv.force) {
    console.log(`⚠️  modules.json already exists (use --force to overwrite)`);
  } else {
    fs.writeFileSync(modulesPath, JSON.stringify(modulesContent, null, 2));
    console.log(`✅ Created modules.json`);
  }

  console.log('\n📦 Project initialized! Next steps:');
  console.log('   1. Run: npx habits base');
  console.log('   2. Open: http://localhost:3000/habits/base');
}

/**
 * Run the pack command - package habits into executable, desktop app, or mobile app
 */
async function runPackCommand(argv: any): Promise<void> {
  const result = await executePackCommand({
    config: argv.config,
    output: argv.output,
    format: argv.format as PackFormat,
    platform: argv.platform,
    backendUrl: argv['backend-url'],
    desktopPlatform: argv['desktop-platform'],
    mobileTarget: argv['mobile-target'],
    appName: argv['app-name'],
    appIcon: argv['app-icon'],
    debug: argv.debug,
    includeEnv: argv['include-env'],
  });

  if (!result.success) {
    throw new Error(result.error || 'Pack command failed');
  }
}

