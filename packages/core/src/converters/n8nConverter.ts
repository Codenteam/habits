/**
 * n8n Workflow Converter
 * Converts n8n workflow format to Habits workflow format
 */

import type { FrontendWorkflow, WorkflowNode, WorkflowEdge } from '../types';
import type { N8nWorkflow } from './types';

/**
 * Convert an n8n workflow to Habits format
 */
export function convertN8nWorkflow(n8nWorkflow: N8nWorkflow): FrontendWorkflow {
  const nodes: WorkflowNode[] = n8nWorkflow.nodes.map((node, index) => {
    // Extract module name from node type
    let moduleName = 'unknown';
    let resource = '';
    let operation = '';
    
    // Common n8n node type patterns
    if (node.type.startsWith('n8n-nodes-')) {
      moduleName = node.type;
    } else if (node.type.includes('.')) {
      // Community nodes like @package/n8n-nodes-name
      moduleName = node.type;
    } else {
      // Built-in n8n nodes
      moduleName = `n8n-nodes-${node.type.toLowerCase()}`;
    }

    // Extract resource and operation from parameters
    if (node.parameters) {
      resource = node.parameters.resource as string || '';
      operation = node.parameters.operation as string || '';
    }

    return {
      id: node.id || `node-${Date.now()}-${index}`,
      type: 'n8n' as const,
      position: {
        x: node.position[0],
        y: node.position[1],
      },
      data: {
        label: node.name,
        framework: 'n8n' as const,
        module: moduleName,
        resource,
        operation,
        params: node.parameters || {},
        credentials: node.credentials || {},
      },
    };
  });

  // Convert n8n connections to edges
  const edges: WorkflowEdge[] = [];
  let edgeId = 0;

  for (const [sourceNodeName, connections] of Object.entries(n8nWorkflow.connections)) {
    const sourceNode = nodes.find((n) => n.data.label === sourceNodeName);
    if (!sourceNode) continue;

    // n8n connections structure: { nodeName: { main: [[{ node: 'targetNode', type: 'main', index: 0 }]] } }
    const mainConnections = (connections as any).main || [];
    
    for (const outputConnections of mainConnections) {
      if (!Array.isArray(outputConnections)) continue;
      
      for (const connection of outputConnections) {
        const targetNode = nodes.find((n) => n.data.label === connection.node);
        if (targetNode) {
          edges.push({
            id: `edge-${edgeId++}`,
            source: sourceNode.id,
            target: targetNode.id,
          });
        }
      }
    }
  }

  return {
    id: `imported-n8n-${Date.now()}`,
    name: n8nWorkflow.name || 'Imported n8n Workflow',
    description: 'Converted from n8n workflow',
    version: '1.0.0',
    nodes,
    edges,
  };
}
