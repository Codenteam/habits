import type { NodeDefinition, WorkflowFramework, NodeType } from './types';

/**
 * Default node definitions by framework and module type
 */
export const nodeDefinitions: Record<string, NodeDefinition> = {
  // Script nodes
  'script-trigger': { inputs: [], outputs: ['main'] },
  'script-script': { inputs: ['main'], outputs: ['main'] },
  'script-forloop': { inputs: ['main'], outputs: ['main'] },
  'script-branch': { inputs: ['main'], outputs: ['main', 'branch1', 'branch2'] },
  'script-flow': { inputs: ['main'], outputs: ['main'] },
  'script-approval': { inputs: ['main'], outputs: ['main', 'approved', 'rejected'] },

  // Bits nodes
  'bits-trigger': { inputs: [], outputs: ['main'] },
  'bits-action': { inputs: ['main'], outputs: ['main'] },
  'bits-webhook': { inputs: [], outputs: ['main'] },
  'bits-schedule': { inputs: [], outputs: ['main'] },
  'bits-http': { inputs: ['main'], outputs: ['main'] },
  'bits-if': { inputs: ['main'], outputs: ['main', 'false'] },
  'bits-switch': { inputs: ['main'], outputs: ['0', '1', '2', '3'] },
  'bits-merge': { inputs: ['main', 'main'], outputs: ['main'] },
};

/**
 * Default fallback node definition
 */
export const DEFAULT_NODE_DEFINITION: NodeDefinition = {
  inputs: ['main'],
  outputs: ['main'],
};

/**
 * Get node definition (inputs/outputs) based on framework and module
 */
export function getNodeDefinition(
  framework: WorkflowFramework, 
  module: string, 
  nodeType?: NodeType
): NodeDefinition {
  // Try to match by framework and module
  const moduleKey = `${framework}-${module.replace(/^(bit-)/, '')}`;
  if (nodeDefinitions[moduleKey]) {
    return nodeDefinitions[moduleKey];
  }

  // Try to match by node type if provided
  if (nodeType) {
    const typeKey = `${framework}-${nodeType}`;
    if (nodeDefinitions[typeKey]) {
      return nodeDefinitions[typeKey];
    }
  }

  // Check for special node types based on module name
  const moduleName = module.toLowerCase();
  
  // Framework-specific logic
  if (framework === 'script') {
    if (moduleName.includes('forloop') || nodeType === 'forloopflow') {
      return { inputs: ['main'], outputs: ['main'] };
    }
    if (moduleName.includes('branch') || nodeType === 'branchone' || nodeType === 'branchall') {
      return { inputs: ['main'], outputs: ['main', 'branch1', 'branch2'] };
    }
    if (moduleName.includes('approval')) {
      return { inputs: ['main'], outputs: ['main', 'approved', 'rejected'] };
    }
    return { inputs: ['main'], outputs: ['main'] };
  }
  
  // Trigger detection
  if (moduleName.includes('trigger') || moduleName.includes('webhook') || moduleName.includes('schedule')) {
    return { inputs: [], outputs: ['main'] };
  }

  // Logic nodes
  if (moduleName.includes('if') || moduleName.includes('condition')) {
    return { inputs: ['main'], outputs: ['main', 'false'] };
  }
  if (moduleName.includes('switch') || moduleName.includes('router')) {
    return { inputs: ['main'], outputs: ['0', '1', '2', '3'] };
  }
  if (moduleName.includes('merge') || moduleName.includes('join')) {
    return { inputs: ['main', 'main'], outputs: ['main'] };
  }

  return DEFAULT_NODE_DEFINITION;
}

/**
 * Determine if a node is a trigger based on framework and module
 */
export function isTriggerNode(
  framework: WorkflowFramework, 
  module: string, 
  nodeType?: NodeType
): boolean {
  // Explicit type takes precedence
  if (nodeType === 'trigger') return true;
  if (nodeType === 'action') return false;

  const definition = getNodeDefinition(framework, module, nodeType);
  return definition.inputs.length === 0;
}

/**
 * Get node styling colors based on framework and type - Dark mode with high contrast
 */
export function getNodeColors(framework: WorkflowFramework, isTrigger: boolean): {
  bg: string;
  border: string;
  text: string;
} {
  if (isTrigger) {
    switch (framework) {
      case 'script':
        return { bg: 'bg-orange-900', border: 'border-orange-500', text: 'text-orange-200' };
      case 'bits':
        return { bg: 'bg-teal-900', border: 'border-teal-500', text: 'text-teal-200' };
      default:
        return { bg: 'bg-gray-800', border: 'border-gray-500', text: 'text-gray-200' };
    }
  }
  
  // Action nodes
  switch (framework) {
    case 'script':
      return { bg: 'bg-cyan-900', border: 'border-cyan-500', text: 'text-cyan-200' };
    case 'bits':
      return { bg: 'bg-blue-900', border: 'border-blue-500', text: 'text-blue-200' };
    default:
      return { bg: 'bg-gray-800', border: 'border-gray-500', text: 'text-gray-200' };
  }
}
