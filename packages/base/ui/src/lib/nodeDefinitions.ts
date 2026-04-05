// Node definitions for determining inputs and outputs
// Supports: bits, script frameworks
export interface NodeDefinition {
  inputs: string[];
  outputs: string[];
  allowsMultiple?: boolean;
}

// Default node definitions by framework and module type
export const nodeDefinitions: Record<string, NodeDefinition> = {
  // Bits nodes
  'bits-trigger': {
    inputs: [],
    outputs: ['main'],
  },
  'bits-action': {
    inputs: ['main'],
    outputs: ['main'],
  },
  'bits-webhook': {
    inputs: [],
    outputs: ['main'],
  },
  'bits-schedule': {
    inputs: [],
    outputs: ['main'],
  },
  'bits-http': {
    inputs: ['main'],
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

export function getNodeDefinition(framework: 'script' | 'bits', module: string, nodeType?: string): NodeDefinition {
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

  // Default to standard input/output
  return DEFAULT_NODE_DEFINITION;
}
