/**
 * Workflow Converter
 * Main converter that detects workflow type and delegates to specific converters
 */

import type { FrontendWorkflow, ScriptWorkflow } from '../types';
import type { N8nWorkflow, ActivepiecesWorkflow, ConversionResult, WorkflowType } from './types';
import { convertN8nWorkflow } from './n8nConverter';
import { convertActivepiecesWorkflow, extractConnectionsFromHabitsWorkflow } from './activepiecesConverter';
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

  // Check if it's an n8n workflow
  if (workflow.nodes && Array.isArray(workflow.nodes) && workflow.connections) {
    return 'n8n';
  }

  // Check if it's an Activepieces workflow
  if ((workflow.trigger) && workflow.displayName !== undefined) {
    return 'activepieces';
  }
  
  // Check if it's an Activepieces template workflow
  if ((workflow?.template?.trigger) && workflow?.template?.displayName !== undefined) {
    return 'activepieces-template';
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
    case 'n8n':
      return convertN8nWorkflow(workflow as N8nWorkflow);
    case 'activepieces-template':
      return convertActivepiecesWorkflow((workflow as any).template as ActivepiecesWorkflow).workflow;
    case 'activepieces':
      return convertActivepiecesWorkflow(workflow as ActivepiecesWorkflow).workflow;
    case 'script':
      return ScriptWorkflowConverter.fromScript(workflow as ScriptWorkflow);
    default:
      throw new Error('Unknown workflow format. Supported formats: Habits, n8n, Activepieces, Script');
  }
}

/**
 * Convert a workflow and return both the workflow and extracted connections
 */
export function convertWorkflowWithConnections(workflow: any): ConversionResult {
  const type = detectWorkflowType(workflow);

  switch (type) {
    case 'habits':
      // For habits workflows, extract connections from existing params
      return {
        workflow: workflow as FrontendWorkflow,
        connections: extractConnectionsFromHabitsWorkflow(workflow as FrontendWorkflow),
      };
    case 'n8n':
      return {
        workflow: convertN8nWorkflow(workflow as N8nWorkflow),
        connections: [],
      };
    case 'activepieces-template':
      return convertActivepiecesWorkflow((workflow as any).template as ActivepiecesWorkflow);
    case 'activepieces':
      return convertActivepiecesWorkflow(workflow as ActivepiecesWorkflow);
    case 'script':
      return {
        workflow: ScriptWorkflowConverter.fromScript(workflow as ScriptWorkflow),
        connections: [],
      };
    default:
      throw new Error('Unknown workflow format. Supported formats: Habits, n8n, Activepieces, Script');
  }
}

/**
 * Get a human-readable name for a workflow type
 */
export function getWorkflowTypeName(type: WorkflowType): string {
  switch (type) {
    case 'habits':
      return 'Habits';
    case 'n8n':
      return 'n8n';
    case 'activepieces':
      return 'Activepieces';
    case 'activepieces-template':
      return 'Activepieces Template';
    case 'script':
      return 'Script';
    default:
      return 'Unknown';
  }
}
