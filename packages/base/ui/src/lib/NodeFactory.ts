import { NodeDTO } from './NodeDTO';

/**
 * Factory class for creating specific types of nodes
 * Supports 'bits' and 'script' frameworks
 */
export class NodeFactory {
  /**
   * Create a bits trigger node
   */
  static createBitsTrigger(options: {
    module: string;
    label?: string;
    position?: { x: number; y: number };
    params?: Record<string, any>;
    credentials?: Record<string, any>;
  }): NodeDTO {
    return NodeDTO.createNew({
      framework: 'bits',
      module: options.module,
      label: options.label || `${options.module.replace('@ha-bits/', '')} Trigger`,
      position: options.position,
    }).update({
      params: options.params,
      credentials: options.credentials,
    });
  }

  /**
   * Create a bits action node
   */
  static createBitsAction(options: {
    module: string;
    resource?: string;
    operation?: string;
    label?: string;
    position?: { x: number; y: number };
    params?: Record<string, any>;
    credentials?: Record<string, any>;
  }): NodeDTO {
    return NodeDTO.createNew({
      framework: 'bits',
      module: options.module,
      label: options.label || options.module.replace('@ha-bits/', ''),
      position: options.position,
      resource: options.resource,
      operation: options.operation,
    }).update({
      params: options.params,
      credentials: options.credentials,
    });
  }

  /**
   * Create an HTTP Request node (bits)
   */
  static createHttpRequestNode(options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url?: string;
    label?: string;
    position?: { x: number; y: number };
    headers?: Record<string, string>;
    body?: any;
  }): NodeDTO {
    return this.createBitsAction({
      module: '@ha-bits/bit-http',
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
   * Create a Schedule Trigger node (bits)
   */
  static createScheduleTriggerNode(options: {
    interval?: string;
    label?: string;
    position?: { x: number; y: number };
  }): NodeDTO {
    return this.createBitsTrigger({
      module: '@ha-bits/bit-schedule',
      label: options.label || 'Schedule Trigger',
      position: options.position,
      params: {
        interval: options.interval || 'daily',
      },
    });
  }

  /**
   * Create a Webhook Trigger node (bits)
   */
  static createWebhookTriggerNode(options: {
    path?: string;
    method?: string;
    label?: string;
    position?: { x: number; y: number };
  }): NodeDTO {
    return this.createBitsTrigger({
      module: '@ha-bits/bit-webhook',
      label: options.label || 'Webhook Trigger',
      position: options.position,
      params: {
        path: options.path || 'webhook',
        httpMethod: options.method || 'POST',
      },
    });
  }

  /**
   * Create an IF node (bits)
   */
  static createIfNode(options: {
    condition?: string;
    label?: string;
    position?: { x: number; y: number };
  }): NodeDTO {
    return this.createBitsAction({
      module: '@ha-bits/bit-logic',
      resource: 'logic',
      operation: 'if',
      label: options.label || 'IF Condition',
      position: options.position,
      params: {
        condition: options.condition || '',
      },
    });
  }

  /**
   * Create a Set node (bits) for data transformation
   */
  static createSetNode(options: {
    values?: Record<string, any>;
    label?: string;
    position?: { x: number; y: number };
  }): NodeDTO {
    return this.createBitsAction({
      module: '@ha-bits/bit-data',
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
   * Create multiple connected nodes in a chain
   */
  static createNodeChain(nodeConfigs: Array<{
    type: 'trigger' | 'action';
    framework: 'script' | 'bits';
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
      if (config.framework === 'bits') {
        if (config.type === 'trigger') {
          node = this.createBitsTrigger({
            module: config.module,
            label: config.label,
            position,
            params: config.params,
            credentials: config.credentials,
          });
        } else {
          node = this.createBitsAction({
            module: config.module,
            resource: config.resource,
            operation: config.operation,
            label: config.label,
            position,
            params: config.params,
            credentials: config.credentials,
          });
        }
      } else if (config.framework === 'script') {
        node = this.createScript({
          language: config.language || 'deno',
          label: config.label,
          position,
          content: config.content,
        });
      } else {
        // Default fallback - create a basic bits node
        node = NodeDTO.createNew({
          framework: 'bits',
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
   * Create a node from a template
   */
  static fromTemplate(template: {
    framework: 'script' | 'bits';
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
