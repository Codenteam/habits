/**
 * Module execution helpers
 * 
 * Supports: bits, script frameworks
 */

import { executeBitsModule } from "@ha-bits/cortex-core";
import { ExecutionResult } from '../types';

// Store async execution results
export const executionResults = new Map<string, ExecutionResult>();

/**
 * Execute module based on framework
 * 
 * Supported frameworks: bits, script
 */
export async function executeModule(
  framework: string,
  moduleName: string,
  params: Record<string, any>,
): Promise<any> {
  if (framework === "bits") {
    return await executeBitsModule({
      source: "npm",
      framework,
      moduleName,
      params,
    });
  } else if (framework === "script") {
    throw new Error(`Script execution is not supported directly. Use workflow execution instead.`);
  } else {
    throw new Error(`Unknown framework: ${framework}. Supported frameworks: bits`);
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
