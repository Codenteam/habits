/**
 * Module execution helpers
 */

import { executeN8nModule } from "@ha-bits/cortex/n8n/n8nExecutor";
import { executeActivepiecesModule } from "@ha-bits/cortex/activepieces/activepiecesExecutor";
import { ExecutionResult } from '../types';

// Store async execution results
export const executionResults = new Map<string, ExecutionResult>();

/**
 * Execute module based on framework
 */
export async function executeModule(
  framework: string,
  moduleName: string,
  params: Record<string, any>,
): Promise<any> {
  if (framework === "n8n") {
    // Pass the full npm package name (e.g., 'n8n-nodes-chatwoot')
    return await executeN8nModule(moduleName, params);
  } else if (framework === "activepieces") {
    // Pass the full npm package name (e.g., '@activepieces/piece-google-sheets')
    return await executeActivepiecesModule({
      source: "npm",
      framework,
      moduleName,
      params,
    });
  } else {
    throw new Error(`Unknown framework: ${framework}`);
  }
}

/**
 * Execute module asynchronously and store result
 */
export async function executeModuleAsync(
  executionId: string,
  framework: string,
  module: string,
  params: Record<string, any>,
): Promise<void> {
  try {
    const result = await executeModule(framework, module, params);
    executionResults.set(executionId, {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    executionResults.set(executionId, {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
