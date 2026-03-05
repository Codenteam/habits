/**
 * habits CLI
 * 
 * Unified automation workflow platform combining:
 * - Cortex: Workflow executor (cortex, execute, convert)
 * - Base: Module manager (module browser, builder UI)
 * 
 * Usage:
 *   npx habits cortex --config ./config.json
 *   npx habits execute --config ./config.json --id <workflow-id>
 *   npx habits convert --input ./workflow.json --output ./habits.json
 *   npx habits edit     # Base server (edit mode)
 *   npx habits base     # Same as edit
 * 
 * Environment variables:
 *   PORT                    Server port (default: 3000)
 *   HOST                    Server host (default: 0.0.0.0)
 *   HABITS_OPENAPI_ENABLED  Enable OpenAPI docs (default: false)
 *   HABITS_MANAGE_ENABLED   Enable management UI (default: false)
 *   HABITS_DEBUG            Enable debug mode (default: false)
 */

import { runCLI } from './cli';

runCLI().catch((error) => {
  console.error('❌ CLI failed:', error);
  process.exit(1);
});
