/**
 * Cortex CLI - Command line interface for workflow execution
 * 
 * Provides commands:
 * - server: Start the workflow execution server
 * - execute: Execute a workflow from file or config
 * - convert: Convert workflows from n8n/Activepieces to Habits format
 */

import * as fs from '@ha-bits/bindings/fs';
import * as path from '@ha-bits/bindings/path';
import * as yaml from 'yaml';
import yargs, { Argv } from 'yargs';
import { hideBin } from 'yargs/helpers';
import dotenv from 'dotenv';
import {
  detectWorkflowType,
  convertWorkflowWithConnections,
  generateEnvContent,
  getWorkflowTypeName,
} from '@ha-bits/core';
import { WorkflowExecutor } from '@ha-bits/cortex/WorkflowExecutor';
import { WorkflowExecutorServer, ServerOptions } from './server';

// Load environment variables
dotenv.config();

export interface CortexCommandOptions {
  /** Override server port */
  port?: number;
  /** Server host */
  host?: string;
  /** Path to config file */
  config?: string;
  /** Workflow ID to execute */
  id?: string;
  /** Execute all workflows */
  all?: boolean;
  /** Input data as JSON string or file path */
  input?: string;
  /** Workflow file path for direct execution */
  workflow?: string;
  /** Output path for convert command */
  output?: string;
  /** Generate .env file for convert command */
  env?: boolean;
  /** Pretty print output */
  pretty?: boolean;
  /** Server options */
  serverOptions?: ServerOptions;
}

/**
 * Add cortex commands to a yargs instance
 */
export function createCortexCLI(yargsInstance: Argv): Argv {
  return yargsInstance
    .command('server', 'Start the workflow execution server', {
      port: {
        alias: 'p',
        describe: 'Server port (priority: args > .env > config.json > 3000)',
        type: 'number'
      },
      host: {
        alias: 'h',
        describe: 'Server host',
        type: 'string'
      },
      config: {
        alias: 'c',
        describe: 'Path to config.json file (default: looks for config.json in current directory)',
        type: 'string'
      }
    })
    .command('execute [workflow]', 'Execute a workflow from file or config', {
      workflow: {
        describe: 'Path to workflow JSON file (optional if using --config)',
        type: 'string'
      },
      config: {
        alias: 'c',
        describe: 'Path to config.json file',
        type: 'string'
      },
      id: {
        describe: 'Workflow ID to execute (when using --config)',
        type: 'string'
      },
      all: {
        describe: 'Execute all workflows from config',
        type: 'boolean',
        default: false
      },
      input: {
        alias: 'i',
        describe: 'Input data as JSON string or path to JSON file',
        type: 'string'
      }
    })
    .command('convert', 'Convert a workflow from n8n, Activepieces, or Script format to Habits format', {
      input: {
        alias: 'i',
        describe: 'Path to input workflow JSON file',
        type: 'string',
        demandOption: true
      },
      output: {
        alias: 'o',
        describe: 'Path to output Habits workflow JSON file (defaults to stdout)',
        type: 'string'
      },
      env: {
        alias: 'e',
        describe: 'Also generate a .env file for extracted connections/credentials',
        type: 'boolean',
        default: false
      },
      pretty: {
        alias: 'p',
        describe: 'Pretty print the output JSON',
        type: 'boolean',
        default: true
      }
    })
    .command('prepare', 'Install all bits dependencies for a habit configuration', {
      config: {
        alias: 'c',
        describe: 'Path to stack.yaml or config.json file',
        type: 'string',
        demandOption: true
      },
      registry: {
        alias: 'r',
        describe: 'Custom npm registry URL',
        type: 'string'
      }
    });
}

/**
 * Run a cortex command based on the command name and options
 */
export async function runCortexCommand(
  command: string, 
  options: CortexCommandOptions = {}
): Promise<void> {
  switch (command) {
    case 'server':
      await runServerCommand(options);
      break;
    case 'execute':
      await runExecuteCommand(options);
      break;
    case 'convert':
      await runConvertCommand(options);
      break;
    case 'prepare':
      await runPrepareCommand(options);
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

async function runServerCommand(options: CortexCommandOptions): Promise<void> {
  const server = new WorkflowExecutorServer(options.serverOptions);
  
  // Try to load config.json
  const configPath = options.config || path.resolve(process.cwd(), 'config.json');
  let configServerPort: number | undefined;
  let configServerHost: string | undefined;
  
  if (fs.existsSync(configPath)) {
    try {
      await server.loadConfig(configPath);
      const config = server.getConfig();
      configServerPort = config?.server?.port;
      configServerHost = config?.server?.host;
    } catch (error: any) {
      console.error(`⚠️  Failed to load config: ${error.message}`);
    }
  } else if (options.config) {
    console.error(`❌ Config file not found: ${configPath}`);
    process.exit(1);
  } else {
    console.log('ℹ️  No config.json found, server will accept workflow submissions via API');
  }
  
  // Port priority: 1. args, 2. config.json, 3. .env, 4. default 3000
  let port: number;
  let portSource: string;
  
  if (options.port !== undefined) {
    port = options.port;
    portSource = 'command line argument';
  } else if (configServerPort !== undefined) {
    port = configServerPort;
    portSource = 'config.json';
  } else if (process.env.PORT) {
    port = parseInt(process.env.PORT, 10);
    portSource = 'environment variable (PORT)';
  } else {
    port = 3000;
    portSource = 'default';
  }
  
  console.log(`📌 Port ${port} loaded from: ${portSource}`);
  
  const host = options.host ?? process.env.HOST ?? configServerHost ?? '0.0.0.0';
  
  // Graceful shutdown



  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    // Kill the process if it hasn't exited after 3000ms (watchdog)
    setTimeout(() => {
      console.error('⏰ Server did not exit after 3000ms, force killing process.');
      process.exit(1);
    }, 3000);
    await server.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    // Kill the process if it hasn't exited after 3000ms (watchdog)
    setTimeout(() => {
      console.error('⏰ Server did not exit after 3000ms, force killing process.');
      process.exit(1);
    }, 3000);
    await server.stop();
    process.exit(0);
  });

  await server.start(port, host);
}

async function runExecuteCommand(options: CortexCommandOptions): Promise<void> {
  const executor = new WorkflowExecutor();
  const { config: configPath, workflow: workflowPath, id: workflowId, all: executeAll, input: inputArg } = options;
  
  // Parse input data if provided
  let inputData: Record<string, any> = {};
  if (inputArg) {
    try {
      if (fs.existsSync(inputArg)) {
        const fileContent = fs.readFileSync(inputArg, 'utf8');
        inputData = JSON.parse(fileContent);
        console.log(`📥 Loaded input from file: ${inputArg}`);
      } else {
        inputData = JSON.parse(inputArg);
        console.log(`📥 Using inline JSON input`);
      }
    } catch (error: any) {
      console.error(`❌ Failed to parse input: ${error.message}`);
      console.error(`   Input should be valid JSON string or path to JSON file`);
      process.exit(1);
    }
  }
  
  const habitsContext = {
    habits: {
      input: inputData,
      headers: {},
      cookies: {},
    }
  };
  
  if (configPath) {
    if (!fs.existsSync(configPath)) {
      console.error(`❌ Config file not found: ${configPath}`);
      process.exit(1);
    }
    
    try {
      await executor.loadConfig(configPath);
      
      if (executeAll) {
        const workflows = executor.getAllWorkflows();
        console.log(`\n🚀 Executing ${workflows.length} workflow(s)...\n`);
        
        let failedCount = 0;
        for (const loadedWorkflow of workflows) {
          if (loadedWorkflow.reference.enabled === false) {
            console.log(`⏭️  Skipping disabled workflow: ${loadedWorkflow.reference.id}`);
            continue;
          }
          
          const execution = await executor.executeWorkflow(loadedWorkflow.workflow, {
            webhookTimeout: loadedWorkflow.reference.webhookTimeout,
            initialContext: habitsContext
          });
          
          if (execution.status === 'failed') {
            failedCount++;
          }
        }
        
        if (failedCount > 0) {
          console.error(`\n❌ ${failedCount} workflow(s) failed`);
          process.exit(1);
        }
        
      } else if (workflowId) {
        const loadedWorkflow = executor.getWorkflow(workflowId);
        if (!loadedWorkflow) {
          console.error(`❌ Workflow not found: ${workflowId}`);
          console.log('Available workflows:', executor.getAllWorkflows().map(w => w.reference.id).join(', '));
          process.exit(1);
        }
        
        const execution = await executor.executeWorkflow(loadedWorkflow.workflow, {
          webhookTimeout: loadedWorkflow.reference.webhookTimeout,
          initialContext: habitsContext
        });
        
        console.log('\n📊 Execution Summary:');
        console.log(`Workflow: ${loadedWorkflow.workflow.name} (${workflowId})`);
        console.log(`Status: ${execution.status}`);
        console.log(`Duration: ${execution.endTime ? 
          (execution.endTime.getTime() - execution.startTime.getTime()) : 'N/A'}ms`);
        console.log(`Steps: ${execution.results.length}`);
        
        if (execution.output !== undefined) {
          console.log(`\n📤 Workflow Output:`);
          console.log(JSON.stringify(execution.output, null, 2));
        }
        
        if (execution.status === 'failed') {
          process.exit(1);
        }
      } else {
        console.error('❌ When using --config, you must specify either --id <workflowId> or --all');
        process.exit(1);
      }
      
    } catch (error: any) {
      console.error(`❌ Execution failed: ${error.message}`);
      process.exit(1);
    }
    
  } else if (workflowPath) {
    if (!fs.existsSync(workflowPath)) {
      console.error(`❌ Workflow file not found: ${workflowPath}`);
      process.exit(1);
    }

    try {
      const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
      const execution = await executor.executeWorkflow(workflowData, {
        initialContext: habitsContext
      });
      
      console.log('\n📊 Execution Summary:');
      console.log(`Status: ${execution.status}`);
      console.log(`Duration: ${execution.endTime ? 
        (execution.endTime.getTime() - execution.startTime.getTime()) : 'N/A'}ms`);
      console.log(`Steps: ${execution.results.length}`);
      
      if (execution.output !== undefined) {
        console.log(`\n📤 Workflow Output:`);
        console.log(JSON.stringify(execution.output, null, 2));
      }
      
      if (execution.status === 'failed') {
        process.exit(1);
      }
      
    } catch (error: any) {
      console.error(`❌ Execution failed: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.error('❌ You must specify either a workflow file or --config with --id or --all');
    process.exit(1);
  }
}

async function runConvertCommand(options: CortexCommandOptions): Promise<void> {
  const inputPath = options.input!;
  const outputPath = options.output;
  const generateEnv = options.env ?? false;
  const prettyPrint = options.pretty ?? true;
  
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    process.exit(1);
  }
  
  try {
    let inputContent = fs.readFileSync(inputPath, 'utf8');
    // Remove BOM if present
    if (inputContent.charCodeAt(0) === 0xFEFF) {
      inputContent = inputContent.slice(1);
    }
    const inputWorkflow = JSON.parse(inputContent);
    
    const workflowType = detectWorkflowType(inputWorkflow);
    
    if (workflowType === 'unknown') {
      console.error('❌ Unknown workflow format. Supported formats: n8n, Activepieces, Script, Habits');
      process.exit(1);
    }
    
    if (workflowType === 'habits') {
      console.log('ℹ️  Input is already a Habits workflow, no conversion needed.');
      if (outputPath) {
        fs.writeFileSync(outputPath, inputContent);
        console.log(`📄 Copied to: ${outputPath}`);
      } else {
        console.log(inputContent);
      }
      process.exit(0);
    }
    
    console.log(`🔍 Detected workflow type: ${getWorkflowTypeName(workflowType)}`);
    
    const { workflow, connections } = convertWorkflowWithConnections(inputWorkflow);
    
    const outputJson = prettyPrint 
      ? JSON.stringify(workflow, null, 2)
      : JSON.stringify(workflow);
    
    if (outputPath) {
      fs.writeFileSync(outputPath, outputJson);
      console.log(`✅ Converted workflow saved to: ${outputPath}`);
      console.log(`   Workflow name: ${workflow.name}`);
      console.log(`   Nodes: ${workflow.nodes.length}`);
      console.log(`   Edges: ${workflow.edges.length}`);
    } else {
      console.log(outputJson);
    }
    
    if (generateEnv && connections.length > 0) {
      const envContent = generateEnvContent(workflow.name, connections);
      const envPath = outputPath 
        ? outputPath.replace(/\.json$/, '.env')
        : path.join(process.cwd(), `${workflow.name.replace(/[^a-zA-Z0-9]/g, '_')}.env`);
      
      fs.writeFileSync(envPath, envContent);
      console.log(`🔐 Environment file saved to: ${envPath}`);
      console.log(`   Extracted ${connections.length} connection reference(s)`);
    } else if (connections.length > 0 && !generateEnv) {
      console.log(`ℹ️  Found ${connections.length} connection reference(s). Use --env to generate a .env template file.`);
    }
    
  } catch (error: any) {
    console.error(`❌ Conversion failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Extract all @ha-bits/* packages from a workflow's nodes
 */
function extractBitsPackages(workflow: any): string[] {
  const packages = new Set<string>();
  
  if (!workflow.nodes) return [];
  
  for (const node of workflow.nodes) {
    // Check for bits nodes
    if (node.type === 'bits' || node.data?.framework === 'bits') {
      const moduleName = node.data?.module;
      if (moduleName && moduleName.startsWith('@ha-bits/')) {
        packages.add(moduleName);
      }
    }
  }
  
  return Array.from(packages);
}

/**
 * Run the prepare command - installs all bits dependencies
 */
async function runPrepareCommand(options: CortexCommandOptions): Promise<void> {
  const configPath = options.config;
  const registry = (options as any).registry;
  
  if (!configPath) {
    console.error('❌ Config file path is required');
    process.exit(1);
  }
  
  if (!fs.existsSync(configPath)) {
    console.error(`❌ Config file not found: ${configPath}`);
    process.exit(1);
  }
  
  try {
    const configDir = path.dirname(path.resolve(configPath));
    const configContent = fs.readFileSync(configPath, 'utf-8');
    
    // Parse config (YAML or JSON)
    let config: any;
    if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
      config = yaml.parse(configContent);
    } else {
      config = JSON.parse(configContent);
    }
    
    console.log('📦 Preparing habit dependencies...');
    console.log(`   Config: ${configPath}`);
    
    // Collect all bits packages
    const allPackages = new Set<string>();
    
    // Process workflows
    const workflows = config.workflows || [];
    for (const workflowRef of workflows) {
      const workflowPath = path.join(configDir, workflowRef.path);
      
      if (!fs.existsSync(workflowPath)) {
        console.warn(`⚠️  Workflow file not found: ${workflowPath}`);
        continue;
      }
      
      const workflowContent = fs.readFileSync(workflowPath, 'utf-8');
      let workflow: any;
      
      if (workflowPath.endsWith('.yaml') || workflowPath.endsWith('.yml')) {
        workflow = yaml.parse(workflowContent);
      } else {
        workflow = JSON.parse(workflowContent);
      }
      
      const packages = extractBitsPackages(workflow);
      packages.forEach(pkg => allPackages.add(pkg));
      
      console.log(`   📋 ${workflowRef.id}: ${packages.length} bit(s)`);
    }
    
    if (allPackages.size === 0) {
      console.log('\n✅ No bits packages to install');
      return;
    }
    
    console.log(`\n📥 Installing ${allPackages.size} package(s)...`);
    
    // Install packages
    const { exec } = await import('@ha-bits/bindings/shell');
    
    for (const pkg of allPackages) {
      console.log(`   📦 ${pkg}`);
      
      let command = `npm install ${pkg} --save-optional --engine-strict=false --ignore-scripts`;
      if (registry) {
        command += ` --registry ${registry}`;
      }
      
      try {
        const result = await exec(command, { cwd: configDir });
        if (result.code !== 0) {
          console.error(`   ❌ Failed to install ${pkg}: ${result.stderr}`);
        }
      } catch (err: any) {
        console.error(`   ❌ Failed to install ${pkg}: ${err.message}`);
      }
    }
    
    console.log('\n✅ Preparation complete!');
    
  } catch (error: any) {
    console.error(`❌ Prepare failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Run the full cortex CLI (standalone mode)
 */
export async function runCLI(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .command('server', 'Start the workflow execution server', {
      port: {
        alias: 'p',
        describe: 'Server port',
        type: 'number'
      },
      host: {
        alias: 'h',
        describe: 'Server host',
        type: 'string'
      },
      config: {
        alias: 'c',
        describe: 'Path to config.json file',
        type: 'string'
      }
    })
    .command('execute [workflow]', 'Execute a workflow from file or config', {
      workflow: {
        describe: 'Path to workflow JSON file',
        type: 'string'
      },
      config: {
        alias: 'c',
        describe: 'Path to config.json file',
        type: 'string'
      },
      id: {
        describe: 'Workflow ID to execute',
        type: 'string'
      },
      all: {
        describe: 'Execute all workflows',
        type: 'boolean',
        default: false
      },
      input: {
        alias: 'i',
        describe: 'Input data as JSON string or file path',
        type: 'string'
      }
    })
    .command('convert', 'Convert a workflow to Habits format', {
      input: {
        alias: 'i',
        describe: 'Path to input workflow JSON file',
        type: 'string',
        demandOption: true
      },
      output: {
        alias: 'o',
        describe: 'Path to output file',
        type: 'string'
      },
      env: {
        alias: 'e',
        describe: 'Generate .env file',
        type: 'boolean',
        default: false
      },
      pretty: {
        alias: 'p',
        describe: 'Pretty print output',
        type: 'boolean',
        default: true
      }
    })
    .command('prepare', 'Install all bits dependencies for a habit', {
      config: {
        alias: 'c',
        describe: 'Path to stack.yaml or config.json file',
        type: 'string',
        demandOption: true
      },
      registry: {
        alias: 'r',
        describe: 'Custom npm registry URL',
        type: 'string'
      }
    })
    .demandCommand(1, 'You need to specify a command')
    .help()
    .argv;

  const command = argv._[0] as string;
  
  await runCortexCommand(command, {
    port: argv.port as number | undefined,
    host: argv.host as string | undefined,
    config: argv.config as string | undefined,
    id: argv.id as string | undefined,
    all: argv.all as boolean | undefined,
    input: argv.input as string | undefined,
    workflow: argv.workflow as string | undefined,
    output: argv.output as string | undefined,
    env: argv.env as boolean | undefined,
    pretty: argv.pretty as boolean | undefined,
    registry: (argv as any).registry as string | undefined,
  } as any);
}
