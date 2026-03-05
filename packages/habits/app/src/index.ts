/**
 * habits
 * 
 * Unified automation workflow platform combining Cortex workflow executor
 * with module management capabilities.
 */

export { startHabitsServer, WorkflowExecutorServer, type HabitsServerOptions } from './server';
export { runCLI, type HabitsCommandOptions } from './cli';

// Re-export key components from cortex
export { WorkflowExecutor } from '@ha-bits/cortex';
export { convertWorkflow, convertWorkflowWithConnections, generateEnvContent } from '@ha-bits/core';
