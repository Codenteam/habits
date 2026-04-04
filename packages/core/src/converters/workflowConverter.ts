/**
 * Workflow Converter
 * Main converter that detects workflow type and delegates to specific converters
 * 
 * Supported formats: Habits, Script
 */

import type { FrontendWorkflow, ScriptWorkflow } from '../types';
import type { ConversionResult, WorkflowType } from './types';
import { ScriptWorkflowConverter } from './scriptConverter';

/**
 * Detect the type of workflow from its structure
 */
export function detectWorkflowType(workflow: any): WorkflowType {
  // Handle null/undefined/non-object inputs
  if (!workflow || typeof workflow !== 'object') {
    return 'unknown';
  }

  // Check if it's already a Habits workflow
  if (workflow.nodes && Array.isArray(workflow.nodes) && workflow.nodes[0]?.data?.framework) {
    return 'habits';
  }

  // Check if it's a Script workflow
  if (workflow.summary && workflow.value && workflow.value.modules && workflow.schema) {
    return 'script';
  }

  return 'unknown';
}

/**
 * Convert any supported workflow format to Habits format
 */
export function convertWorkflow(workflow: any): FrontendWorkflow {
  const type = detectWorkflowType(workflow);

  switch (type) {
    case 'habits':
      return workflow as FrontendWorkflow;
    case 'script':
      return ScriptWorkflowConverter.fromScript(workflow as ScriptWorkflow);
    default:
      throw new Error('Unknown workflow format. Supported formats: Habits, Script');
  }
}

/**
 * Convert a workflow and return both the workflow and extracted connections
 */
export function convertWorkflowWithConnections(workflow: any): ConversionResult {
  const type = detectWorkflowType(workflow);

  switch (type) {
    case 'habits':
      return {
        workflow: workflow as FrontendWorkflow,
        connections: [],
      };
    case 'script':
      return {
        workflow: ScriptWorkflowConverter.fromScript(workflow as ScriptWorkflow),
        connections: [],
      };
    default:
      throw new Error('Unknown workflow format. Supported formats: Habits, Script');
  }
}

/**
 * Get a human-readable name for a workflow type
 */
export function getWorkflowTypeName(type: WorkflowType): string {
  switch (type) {
    case 'habits':
      return 'Habits';
    case 'script':
      return 'Script';
    default:
      return 'Unknown';
  }
}
