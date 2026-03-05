// Node definitions for determining inputs and outputs
export interface NodeDefinition {
  inputs: string[];
  outputs: string[];
  allowsMultiple?: boolean;
}

// Default node definitions by framework and module type
export const nodeDefinitions: Record<string, NodeDefinition> = {
  // n8n core nodes
  'n8n-trigger': {
    inputs: [],
    outputs: ['main'],
  },
  'n8n-webhook': {
    inputs: [],
    outputs: ['main'],
  },
  'n8n-schedule': {
    inputs: [],
    outputs: ['main'],
  },
  'n8n-http': {
    inputs: ['main'],
    outputs: ['main'],
  },
  'n8n-if': {
    inputs: ['main'],
    outputs: ['main', 'false'],
  },
  'n8n-switch': {
    inputs: ['main'],
    outputs: ['0', '1', '2', '3'],
  },
  'n8n-merge': {
    inputs: ['main', 'main'],
    outputs: ['main'],
  },
  'n8n-set': {
    inputs: ['main'],
    outputs: ['main'],
  },
  'n8n-function': {
    inputs: ['main'],
    outputs: ['main'],
  },
  'n8n-code': {
    inputs: ['main'],
    outputs: ['main'],
  },

  // n8n integrations (standard behavior)
  'n8n-chatwoot': {
    inputs: ['main'],
    outputs: ['main'],
  },
  'n8n-gmail': {
    inputs: ['main'],
    outputs: ['main'],
  },
  'n8n-slack': {
    inputs: ['main'],
    outputs: ['main'],
  },
  'n8n-googlesheets': {
    inputs: ['main'],
    outputs: ['main'],
  },
  'n8n-notion': {
    inputs: ['main'],
    outputs: ['main'],
  },

  // Activepieces nodes (typically single input/output)
  'activepieces-trigger': {
    inputs: [],
    outputs: ['main'],
  },
  'activepieces-action': {
    inputs: ['main'],
    outputs: ['main'],
  },
  'activepieces-webhook': {
    inputs: [],
    outputs: ['main'],
  },
  'activepieces-schedule': {
    inputs: [],
    outputs: ['main'],
  },

  // Script nodes
  'script-trigger': {
    inputs: [],
    outputs: ['main'],
  },
  'script-script': {
    inputs: ['main'],
    outputs: ['main'],
  },
  'script-forloop': {
    inputs: ['main'],
    outputs: ['main'],
  },
  'script-branch': {
    inputs: ['main'],
    outputs: ['main', 'branch1', 'branch2'],
  },
  'script-flow': {
    inputs: ['main'],
    outputs: ['main'],
  },
  'script-approval': {
    inputs: ['main'],
    outputs: ['main', 'approved', 'rejected'],
  },
};

// Default fallback
export const DEFAULT_NODE_DEFINITION: NodeDefinition = {
  inputs: ['main'],
  outputs: ['main'],
};

export function getNodeDefinition(framework: 'n8n' | 'activepieces' | 'script' | 'bits', module: string, nodeType?: string): NodeDefinition {
  // Try to match by framework and module
  const moduleKey = `${framework}-${module.replace(/^(n8n-nodes-|piece-)/, '')}`;
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
    // Script-specific node type detection
    if (moduleName.includes('forloop') || nodeType === 'forloopflow') {
      return {
        inputs: ['main'],
        outputs: ['main'],
      };
    }
    
    if (moduleName.includes('branch') || nodeType === 'branchone' || nodeType === 'branchall') {
      return {
        inputs: ['main'],
        outputs: ['main', 'branch1', 'branch2'],
      };
    }
    
    if (moduleName.includes('approval')) {
      return {
        inputs: ['main'],
        outputs: ['main', 'approved', 'rejected'],
      };
    }
    
    // Default Script behavior
    return {
      inputs: ['main'],
      outputs: ['main'],
    };
  }
  
  // Trigger nodes typically have no inputs
  if (moduleName.includes('trigger') || moduleName.includes('webhook') || moduleName.includes('schedule')) {
    return {
      inputs: [],
      outputs: ['main'],
    };
  }

  // Logic nodes might have multiple outputs
  if (moduleName.includes('if') || moduleName.includes('condition')) {
    return {
      inputs: ['main'],
      outputs: ['main', 'false'],
    };
  }

  if (moduleName.includes('switch') || moduleName.includes('router')) {
    return {
      inputs: ['main'],
      outputs: ['0', '1', '2', '3'],
    };
  }

  if (moduleName.includes('merge') || moduleName.includes('join')) {
    return {
      inputs: ['main', 'main'],
      outputs: ['main'],
    };
  }

  // Default to single input/output for standard action nodes
  return DEFAULT_NODE_DEFINITION;
}

// Helper to determine if a node is a trigger
export function isTriggerNode(framework: 'n8n' | 'activepieces' | 'script' | 'bits', module: string, nodeType?: string): boolean {
  const definition = getNodeDefinition(framework, module, nodeType);
  return definition.inputs.length === 0;
}

// Helper to determine node color based on type
export function getNodeColor(framework: 'n8n' | 'activepieces' | 'script' | 'bits', module: string, nodeType?: string): string {
  if (isTriggerNode(framework, module, nodeType)) {
    if (framework === 'n8n') return 'bg-green-50 border-green-300';
    if (framework === 'activepieces') return 'bg-blue-50 border-blue-300';
    if (framework === 'script') return 'bg-orange-50 border-orange-300';
  }
  
  if (framework === 'n8n') return 'bg-red-50 border-red-300';
  if (framework === 'activepieces') return 'bg-purple-50 border-purple-300';
  if (framework === 'script') return 'bg-cyan-50 border-cyan-300';
  
  return 'bg-gray-50 border-gray-300';
}