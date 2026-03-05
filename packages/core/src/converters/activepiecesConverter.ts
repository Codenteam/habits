/**
 * Activepieces Workflow Converter
 * Converts Activepieces workflow format to Habits workflow format
 */

import type { FrontendWorkflow, WorkflowNode, WorkflowEdge } from '../types';
import type { ActivepiecesWorkflow, ExtractedConnection, ConversionResult } from './types';

/**
 * Convert an Activepieces workflow to Habits format
 * Returns both the converted workflow and extracted connection references
 */
export function convertActivepiecesWorkflow(apWorkflow: ActivepiecesWorkflow): ConversionResult {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  const connections: ExtractedConnection[] = [];
  let yPosition = 100;
  let edgeId = 0;

  // Helper to get the module name - keep the original @activepieces/ format
  const getModuleName = (pieceName?: string) => {
    if (!pieceName) return 'piece-unknown';
    // Keep the full module name as-is (e.g., @activepieces/piece-intersect)
    return pieceName;
  };

  // Helper to extract connection references and convert to habits.env format
  const extractConnections = (
    params: Record<string, any>,
    nodeId: string,
    nodeLabel: string
  ): Record<string, any> => {
    const connectionPattern = /\{\{connections\['([^']+)'\]\}\}/g;
    const convertedParams: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        const matches = value.matchAll(connectionPattern);
        let convertedValue = value;

        for (const match of matches) {
          const originalId = match[1];
          // Create env var name: NODE_LABEL_PARAM_NAME (sanitized)
          const sanitizedNodeLabel = nodeLabel.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
          const sanitizedParamName = key.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
          const envVarName = `${sanitizedNodeLabel}_${sanitizedParamName}`;

          // Track the connection
          connections.push({
            originalId,
            envVarName,
            nodeId,
            nodeLabel,
            paramName: key,
            originalValue: match[0],
          });

          // Replace with habits.env reference
          convertedValue = convertedValue.replace(match[0], `{{habits.env.${envVarName}}}`);
        }

        convertedParams[key] = convertedValue;
      } else if (value && typeof value === 'object') {
        // Recursively process nested objects
        convertedParams[key] = extractConnections(value, nodeId, nodeLabel);
      } else {
        convertedParams[key] = value;
      }
    }

    return convertedParams;
  };

  // Convert trigger
  const triggerId = `node-${Date.now()}-0`;
  const triggerLabel = apWorkflow.trigger.displayName || apWorkflow.trigger.name || 'Trigger';
  const triggerParams = extractConnections(
    apWorkflow.trigger.settings.input || {},
    triggerId,
    triggerLabel
  );
  
  nodes.push({
    id: triggerId,
    type: 'activepieces' as const,
    position: { x: 250, y: yPosition },
    data: {
      label: triggerLabel,
      framework: 'activepieces' as const,
      module: getModuleName(apWorkflow.trigger.settings.pieceName),
      operation: apWorkflow.trigger.settings.triggerName || 'trigger',
      params: triggerParams,
      credentials: {},
    },
  });

  let previousNodeId = triggerId;
  let currentAction = apWorkflow.trigger.nextAction;
  let actionIndex = 1;

  // Convert actions in sequence
  while (currentAction) {
    yPosition += 150;
    const actionId = `node-${Date.now()}-${actionIndex}`;
    const actionLabel = currentAction.displayName || currentAction.name || `Action ${actionIndex}`;
    const actionParams = extractConnections(
      currentAction.settings.input || {},
      actionId,
      actionLabel
    );

    nodes.push({
      id: actionId,
      type: 'activepieces' as const,
      position: { x: 250, y: yPosition },
      data: {
        label: actionLabel,
        framework: 'activepieces' as const,
        module: getModuleName(currentAction.settings.pieceName),
        operation: currentAction.settings.actionName || 'action',
        params: actionParams,
        credentials: {},
      },
    });

    // Create edge from previous node
    edges.push({
      id: `edge-${edgeId++}`,
      source: previousNodeId,
      target: actionId,
    });

    previousNodeId = actionId;
    currentAction = currentAction.nextAction;
    actionIndex++;
  }

  return {
    workflow: {
      id: `imported-ap-${Date.now()}`,
      name: apWorkflow.displayName || 'Imported Activepieces Workflow',
      description: 'Converted from Activepieces workflow',
      version: '1.0.0',
      nodes,
      edges,
    },
    connections,
  };
}

/**
 * Extract connection references from an existing Habits workflow
 */
export function extractConnectionsFromHabitsWorkflow(workflow: FrontendWorkflow): ExtractedConnection[] {
  const connections: ExtractedConnection[] = [];
  const connectionPattern = /\{\{connections\['([^']+)'\]\}\}/g;
  const habitsEnvPattern = /\{\{habits\.env\.([^}]+)\}\}/g;

  for (const node of workflow.nodes) {
    const params = node.data?.params || {};
    extractFromParams(params, node.id, node.data?.label || node.id);
  }

  function extractFromParams(params: Record<string, any>, nodeId: string, nodeLabel: string) {
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // Check for activepieces connection format
        let matches = value.matchAll(connectionPattern);
        for (const match of matches) {
          const sanitizedNodeLabel = nodeLabel.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
          const sanitizedParamName = key.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
          const envVarName = `${sanitizedNodeLabel}_${sanitizedParamName}`;
          
          connections.push({
            originalId: match[1],
            envVarName,
            nodeId,
            nodeLabel,
            paramName: key,
            originalValue: match[0],
          });
        }

        // Also check for already converted habits.env format
        matches = value.matchAll(habitsEnvPattern);
        for (const match of matches) {
          connections.push({
            originalId: '',
            envVarName: match[1],
            nodeId,
            nodeLabel,
            paramName: key,
            originalValue: match[0],
          });
        }
      } else if (value && typeof value === 'object') {
        extractFromParams(value, nodeId, nodeLabel);
      }
    }
  }

  return connections;
}

/**
 * Generate .env content from extracted connections
 */
export function generateEnvContent(workflowName: string, connections: ExtractedConnection[]): string {
  const lines: string[] = [
    `# Environment variables for ${workflowName}`,
    `# Generated on ${new Date().toISOString()}`,
    `#`,
    `# Fill in the actual values for each connection/credential below`,
    '',
  ];

  // Group by node for better organization
  const byNode = new Map<string, ExtractedConnection[]>();
  for (const conn of connections) {
    const existing = byNode.get(conn.nodeLabel) || [];
    existing.push(conn);
    byNode.set(conn.nodeLabel, existing);
  }

  for (const [nodeLabel, conns] of byNode) {
    lines.push(`# ${nodeLabel}`);
    for (const conn of conns) {
      lines.push(`${conn.envVarName}=<your-${conn.paramName}-here>`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
