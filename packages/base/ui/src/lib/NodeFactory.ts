import { NodeDTO } from './NodeDTO';

/**
 * Factory class for creating specific types of nodes
 */
export class NodeFactory {
  /**
   * Create an n8n trigger node
   */
  static createN8nTrigger(options: {
    module: string;
    label?: string;
    position?: { x: number; y: number };
    params?: Record<string, any>;
    credentials?: Record<string, any>;
  }): NodeDTO {
    return NodeDTO.createNew({
      framework: 'n8n',
      module: options.module,
      label: options.label || `${options.module.replace('n8n-nodes-', '')} Trigger`,
      position: options.position,
    }).update({
      params: options.params,
      credentials: options.credentials,
    });
  }

  /**
   * Create an n8n action node
   */
  static createN8nAction(options: {
    module: string;
    resource?: string;
    operation?: string;
    label?: string;
    position?: { x: number; y: number };
    params?: Record<string, any>;
    credentials?: Record<string, any>;
  }): NodeDTO {
    return NodeDTO.createNew({
      framework: 'n8n',
      module: options.module,
      label: options.label || options.module.replace('n8n-nodes-', ''),
      position: options.position,
      resource: options.resource,
      operation: options.operation,
    }).update({
      params: options.params,
      credentials: options.credentials,
    });
  }

  /**
   * Create an activepieces trigger node
   */
  static createActivepiecesTrigger(options: {
    module: string;
    label?: string;
    position?: { x: number; y: number };
    params?: Record<string, any>;
  }): NodeDTO {
    return NodeDTO.createNew({
      framework: 'activepieces',
      module: options.module,
      label: options.label || `${options.module.replace('piece-', '')} Trigger`,
      position: options.position,
    }).update({
      params: options.params,
    });
  }

  /**
   * Create an activepieces action node
   */
  static createActivepiecesAction(options: {
    module: string;
    label?: string;
    position?: { x: number; y: number };
    params?: Record<string, any>;
  }): NodeDTO {
    return NodeDTO.createNew({
      framework: 'activepieces',
      module: options.module,
      label: options.label || options.module.replace('piece-', ''),
      position: options.position,
    }).update({
      params: options.params,
    });
  }

  /**
   * Create a Chatwoot node (n8n)
   */
  static createChatwootNode(options: {
    resource: 'contact' | 'conversation' | 'message' | 'account';
    operation: string;
    label?: string;
    position?: { x: number; y: number };
    credentials?: {
      url: string;
      token: string;
    };
    params?: Record<string, any>;
  }): NodeDTO {
    return this.createN8nAction({
      module: 'n8n-nodes-chatwoot',
      resource: options.resource,
      operation: options.operation,
      label: options.label || `Chatwoot ${options.resource} ${options.operation}`,
      position: options.position,
      credentials: options.credentials,
      params: options.params,
    });
  }

  /**
   * Create an HTTP Request node (n8n)
   */
  static createHttpRequestNode(options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url?: string;
    label?: string;
    position?: { x: number; y: number };
    headers?: Record<string, string>;
    body?: any;
  }): NodeDTO {
    return this.createN8nAction({
      module: 'n8n-nodes-base.httpRequest',
      resource: 'http',
      operation: 'request',
      label: options.label || 'HTTP Request',
      position: options.position,
      params: {
        method: options.method || 'GET',
        url: options.url || '',
        headers: options.headers || {},
        body: options.body,
      },
    });
  }

  /**
   * Create a Schedule Trigger node (n8n)
   */
  static createScheduleTriggerNode(options: {
    interval?: string;
    label?: string;
    position?: { x: number; y: number };
  }): NodeDTO {
    return this.createN8nTrigger({
      module: 'n8n-nodes-base.scheduleTrigger',
      label: options.label || 'Schedule Trigger',
      position: options.position,
      params: {
        interval: options.interval || 'daily',
      },
    });
  }

  /**
   * Create a Webhook Trigger node (n8n)
   */
  static createWebhookTriggerNode(options: {
    path?: string;
    method?: string;
    label?: string;
    position?: { x: number; y: number };
  }): NodeDTO {
    return this.createN8nTrigger({
      module: 'n8n-nodes-base.webhook',
      label: options.label || 'Webhook Trigger',
      position: options.position,
      params: {
        path: options.path || 'webhook',
        httpMethod: options.method || 'POST',
      },
    });
  }

  /**
   * Create an IF node (n8n)
   */
  static createIfNode(options: {
    condition?: string;
    label?: string;
    position?: { x: number; y: number };
  }): NodeDTO {
    return this.createN8nAction({
      module: 'n8n-nodes-base.if',
      resource: 'logic',
      operation: 'if',
      label: options.label || 'IF Condition',
      position: options.position,
      params: {
        conditions: {
          string: [
            {
              value1: '{{ $json.value }}',
              operation: 'contains',
              value2: options.condition || '',
            },
          ],
        },
      },
    });
  }

  /**
   * Create a Set node (n8n) for data transformation
   */
  static createSetNode(options: {
    values?: Record<string, any>;
    label?: string;
    position?: { x: number; y: number };
  }): NodeDTO {
    return this.createN8nAction({
      module: 'n8n-nodes-base.set',
      resource: 'data',
      operation: 'set',
      label: options.label || 'Set Values',
      position: options.position,
      params: {
        values: options.values || {},
      },
    });
  }

  /**
   * Create a Function node (n8n) for custom code
   */
  static createFunctionNode(options: {
    functionCode?: string;
    label?: string;
    position?: { x: number; y: number };
  }): NodeDTO {
    return this.createN8nAction({
      module: 'n8n-nodes-base.function',
      resource: 'code',
      operation: 'function',
      label: options.label || 'Function',
      position: options.position,
      params: {
        functionCode: options.functionCode || 'return items;',
      },
    });
  }

  /**
   * Create multiple connected nodes in a chain
   */
  static createNodeChain(nodeConfigs: Array<{
    type: 'trigger' | 'action';
    framework: 'n8n' | 'activepieces' | 'script' | 'bits';
    module: string;
    label?: string;
    resource?: string;
    operation?: string;
    params?: Record<string, any>;
    credentials?: Record<string, any>;
    // Script-specific properties
    language?: 'deno' | 'python3' | 'go' | 'bash' | 'sql' | 'typescript';
    content?: string;
  }>): NodeDTO[] {
    const nodes: NodeDTO[] = [];
    const spacing = 200;

    nodeConfigs.forEach((config, index) => {
      const position = { x: index * spacing, y: 100 };
      
      let node: NodeDTO;
      if (config.framework === 'n8n') {
        if (config.type === 'trigger') {
          node = this.createN8nTrigger({
            module: config.module,
            label: config.label,
            position,
            params: config.params,
            credentials: config.credentials,
          });
        } else {
          node = this.createN8nAction({
            module: config.module,
            resource: config.resource,
            operation: config.operation,
            label: config.label,
            position,
            params: config.params,
            credentials: config.credentials,
          });
        }
      } else if (config.framework === 'activepieces') {
        if (config.type === 'trigger') {
          node = this.createActivepiecesTrigger({
            module: config.module,
            label: config.label,
            position,
            params: config.params,
          });
        } else {
          node = this.createActivepiecesAction({
            module: config.module,
            label: config.label,
            position,
            params: config.params,
          });
        }
      } else if (config.framework === 'script') {
        if (config.type === 'trigger') {
          // Script doesn't have traditional triggers, but we can create a script that acts as a trigger
          node = this.createScript({
            language: config.language || 'deno',
            label: config.label,
            position,
            content: config.content,
          });
        } else {
          node = this.createScript({
            language: config.language || 'deno',
            label: config.label,
            position,
            content: config.content,
          });
        }
      } else {
        // Default fallback - create a basic node
        node = NodeDTO.createNew({
          framework: config.framework,
          module: config.module,
          label: config.label || 'Unknown Node',
          position,
        });
      }

      nodes.push(node);
    });

    return nodes;
  }

  /**
   * Create a Script node
   */
  static createScript(options: {
    scriptPath?: string;
    language: 'deno' | 'python3' | 'go' | 'bash' | 'sql' | 'typescript';
    content?: string;
    label?: string;
    position?: { x: number; y: number };
    inputTransforms?: Record<string, any>;
    stopAfterIf?: { expr: string; skipIfStopped?: boolean };
  }): NodeDTO {
    return NodeDTO.createNew({
      framework: 'script',
      module: options.scriptPath || `script-${options.language}-script`,
      label: options.label || `${options.language} Script`,
      position: options.position,
      scriptPath: options.scriptPath,
      language: options.language,
      content: options.content,
      inputTransforms: options.inputTransforms,
      stopAfterIf: options.stopAfterIf,
    });
  }

  /**
   * Create a Script flow node
   */
  static createScriptFlow(options: {
    flowType: 'forloopflow' | 'branchone' | 'branchall';
    label?: string;
    position?: { x: number; y: number };
    iterator?: { expr: string; type: string };
    parallel?: boolean;
    skipFailures?: boolean;
  }): NodeDTO {
    return NodeDTO.createNew({
      framework: 'script',
      module: `script-${options.flowType}`,
      label: options.label || `${options.flowType} Flow`,
      position: options.position,
    }).update({
      params: {
        flowType: options.flowType,
        iterator: options.iterator,
        parallel: options.parallel,
        skipFailures: options.skipFailures,
      },
    });
  }

  /**
   * Create a Matrix message node (Script)
   */
  static createMatrixMessageNode(options: {
    label?: string;
    position?: { x: number; y: number };
    matrixCredentials?: {
      baseUrl: string;
      token: string;
    };
    room?: string;
    message?: string;
  }): NodeDTO {
    return this.createScript({
      language: 'deno',
      label: options.label || 'Matrix Message',
      position: options.position,
      content: `// Matrix Message Script
type Matrix = {
  baseUrl: string;
  token: string;
};

export async function main(matrix_res: Matrix, room: string, body: string) {
  // Matrix message implementation
  return "Message sent successfully";
}`,
      inputTransforms: {
        matrix_res: { expr: 'flow_input.matrix_res', type: 'javascript' },
        room: { expr: 'flow_input.room', type: 'javascript' },
        body: { expr: 'flow_input.body', type: 'javascript' },
      },
    }).update({
      credentials: options.matrixCredentials,
      params: {
        room: options.room,
        message: options.message,
      },
    });
  }

  /**
   * Create a node from a template
   */
  static fromTemplate(template: {
    framework: 'n8n' | 'activepieces' | 'script' | 'bits';
    module: string;
    label: string;
    position?: { x: number; y: number };
    // Script-specific template properties
    scriptType?: 'script' | 'flow';
    language?: 'deno' | 'python3' | 'go' | 'bash' | 'sql' | 'typescript';
  }): NodeDTO {
    if (template.framework === 'script') {
      if (template.scriptType === 'flow') {
        return this.createScriptFlow({
          flowType: 'forloopflow', // Default
          label: template.label,
          position: template.position,
        });
      } else {
        return this.createScript({
          language: template.language || 'deno',
          label: template.label,
          position: template.position,
        });
      }
    }
    
    return NodeDTO.createNew({
      framework: template.framework,
      module: template.module,
      label: template.label,
      position: template.position || { x: 0, y: 0 },
    });
  }
}