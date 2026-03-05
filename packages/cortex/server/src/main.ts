/**
 * @ha-bits/cortex CLI
 * 
 * Usage:
 *   npx @ha-bits/cortex server --config ./config.json
 *   npx @ha-bits/cortex execute --config ./config.json --id <workflow-id> --input '{"key": "value"}'
 * 
 * Commands:
 *   server   Start the workflow execution server
 *   execute  Execute a workflow from file or config
 * 
 * Server Options:
 *   --config, -c  Path to config.json file
 *   --port, -p    Override server port
 * 
 * Execute Options:
 *   --config, -c  Path to config.json file
 *   --id          Workflow ID to execute (when using --config)
 *   --input, -i   Input data as JSON string or path to JSON file
 *   --all         Execute all workflows from config
 * 
 * Environment variables (loaded from .env file near config.json):
 *   HABITS_OPENAPI_ENABLED  Enable/disable OpenAPI docs (default: false)
 *   HABITS_MANAGE_ENABLED   Enable/disable management UI (default: false)
 *   HABITS_DEBUG            Enable debug mode with verbose output (default: false)
 */

// Re-export all library exports so bits modules can import from @ha-bits/cortex
export * from './index';

// Import and run the CLI from server module
import { runCLI } from './server';

runCLI().catch((error) => {
  console.error('❌ CLI failed:', error);
  process.exit(1);
});
