/**
 * Script Workflow Converter
 * Converts between Script workflow format and Habits internal workflow format
 */

import type { FrontendWorkflow, WorkflowNode, WorkflowEdge, ScriptWorkflow, ScriptModule } from '../types';

/**
 * Script Workflow Converter
 * Converts between Script workflow format and our internal workflow format
 */
export class ScriptWorkflowConverter {
  /**
   * Convert a Script workflow to our internal format
   */
  static fromScript(scriptWorkflow: ScriptWorkflow): FrontendWorkflow {
    const nodes: WorkflowNode[] = [];
    const edges: WorkflowEdge[] = [];
    let yPosition = 100;

    // Process modules recursively
    const processModules = (
      modules: ScriptModule[],
      parentId?: string,
      xOffset = 0
    ): void => {
      modules.forEach((module, index) => {
        const nodeId = module.id || `script-${Date.now()}-${index}`;
        const xPosition = 200 * index + xOffset;

        // Create node based on module type
        let node: WorkflowNode;
        
        if (module.value.type === 'script' && module.value.content) {
          node = this.createInlineScriptNode(module, nodeId, { x: xPosition, y: yPosition });
        } else if (module.value.type === 'script') {
          node = this.createScriptNode(module, nodeId, { x: xPosition, y: yPosition });
        } else if (module.value.type === 'forloopflow') {
          node = this.createForLoopNode(module, nodeId, { x: xPosition, y: yPosition });
        } else if (module.value.type === 'branchone' || module.value.type === 'branchall') {
          node = this.createBranchNode(module, nodeId, { x: xPosition, y: yPosition });
        } else {
          // Default to script node
          node = this.createScriptNode(module, nodeId, { x: xPosition, y: yPosition });
        }

        nodes.push(node);

        // Create edge from previous node if exists
        if (index > 0 && modules[index - 1]) {
          const prevNodeId = modules[index - 1].id || `script-${Date.now()}-${index - 1}`;
          edges.push({
            id: `edge-${prevNodeId}-${nodeId}`,
            source: prevNodeId,
            target: nodeId,
            sourceHandle: 'main',
            targetHandle: 'main',
          });
        }

        // Create edge from parent if exists
        if (parentId) {
          edges.push({
            id: `edge-${parentId}-${nodeId}`,
            source: parentId,
            target: nodeId,
            sourceHandle: 'main',
            targetHandle: 'main',
          });
        }

        // Process nested modules (for flows)
        if (module.value.modules) {
          processModules(module.value.modules, nodeId, xPosition + 100);
          yPosition += 150; // Increase Y position for nested modules
        }

        // Process branches
        if (module.value.type === 'branchone' || module.value.type === 'branchall') {
          // Handle branch modules if they exist in the structure
          yPosition += 100; // Adjust for branch visualization
        }
      });
    };

    processModules(scriptWorkflow.value.modules);

    // Process failure module if exists
    if (scriptWorkflow.value.failureModule) {
      const failureNodeId = 'failure-module';
      const failureNode = this.createScriptNode(
        scriptWorkflow.value.failureModule,
        failureNodeId,
        { x: 0, y: yPosition + 200 }
      );
      nodes.push(failureNode);
    }

    return {
      id: `script-${Date.now()}`,
      name: scriptWorkflow.summary || 'Script Workflow',
      description: scriptWorkflow.description,
      version: '1.0.0',
      nodes,
      edges,
    };
  }

  /**
   * Convert our internal workflow to Script format
   */
  static toScript(workflow: FrontendWorkflow): ScriptWorkflow {
    const scriptNodes = workflow.nodes.filter((node: WorkflowNode) => node.data.framework === 'script');
    
    const modules: ScriptModule[] = scriptNodes.map((node: WorkflowNode) => {
      const moduleId = node.id;
      
      // Determine module type based on node data
      let moduleType: 'script' | 'forloopflow' | 'branchone' | 'branchall' = 'script';
      
      if (node.data.module?.includes('forloop')) {
        moduleType = 'forloopflow';
      } else if (node.data.module?.includes('branch')) {
        moduleType = 'branchone';
      }

      const module: ScriptModule = {
        id: moduleId,
        summary: node.data.label,
        value: {
          type: moduleType,
          ...(node.data.scriptPath && { path: node.data.scriptPath }),
          ...(node.data.content && { content: node.data.content }),
          ...(node.data.language && { language: node.data.language }),
          ...(node.data.inputTransforms && { inputTransforms: node.data.inputTransforms }),
          lock: node.data.params?.lock || '',
        },
        ...(node.data.stopAfterIf && { stopAfterIf: node.data.stopAfterIf }),
      };

      return module;
    });

    // Generate schema from workflow parameters
    const schema = {
      type: 'object',
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      required: [] as string[],
      properties: {} as Record<string, any>,
    };

    // Add common workflow parameters
    const workflowParams = this.extractWorkflowParameters(scriptNodes);
    Object.entries(workflowParams).forEach(([key, param]) => {
      schema.properties[key] = param;
      if (param.required) {
        schema.required.push(key);
      }
    });

    return {
      summary: workflow.name,
      description: workflow.description,
      value: {
        modules,
        failureModule: undefined, // Could be enhanced to handle failure modules
      },
      schema,
    };
  }

  /**
   * Create an inline script node (with embedded content)
   */
  private static createInlineScriptNode(
    module: ScriptModule,
    nodeId: string,
    position: { x: number; y: number }
  ): WorkflowNode {
    return {
      id: nodeId,
      type: 'script',
      position,
      data: {
        label: module.summary || 'Script',
        framework: 'script',
        module: 'script-script',
        language: module.value.language || 'deno',
        content: module.value.content,
        inputTransforms: module.value.inputTransforms,
        stopAfterIf: module.stopAfterIf,
        inputs: ['main'],
        outputs: ['main'],
        params: {
          type: 'script',
          lock: module.value.lock,
        },
      },
    };
  }

  /**
   * Create a script node
   */
  private static createScriptNode(
    module: ScriptModule,
    nodeId: string,
    position: { x: number; y: number }
  ): WorkflowNode {
    return {
      id: nodeId,
      type: 'script',
      position,
      data: {
        label: module.summary || 'Script',
        framework: 'script',
        module: 'script-script',
        scriptPath: module.value.path,
        inputTransforms: module.value.inputTransforms,
        stopAfterIf: module.stopAfterIf,
        inputs: ['main'],
        outputs: ['main'],
        params: {
          type: 'script',
          path: module.value.path,
        },
      },
    };
  }

  /**
   * Create a for loop flow node
   */
  private static createForLoopNode(
    module: ScriptModule,
    nodeId: string,
    position: { x: number; y: number }
  ): WorkflowNode {
    return {
      id: nodeId,
      type: 'script',
      position,
      data: {
        label: module.summary || 'For Loop',
        framework: 'script',
        module: 'script-forloop',
        inputTransforms: module.value.inputTransforms,
        stopAfterIf: module.stopAfterIf,
        inputs: ['main'],
        outputs: ['main'],
        params: {
          type: 'forloopflow',
          iterator: module.value.iterator,
          parallel: module.value.parallel,
          skipFailures: module.value.skipFailures,
          modules: module.value.modules || [],
        },
      },
    };
  }

  /**
   * Create a branch node
   */
  private static createBranchNode(
    module: ScriptModule,
    nodeId: string,
    position: { x: number; y: number }
  ): WorkflowNode {
    const outputs = module.value.type === 'branchall' 
      ? ['main', 'branch1', 'branch2', 'branch3'] 
      : ['main', 'true', 'false'];

    return {
      id: nodeId,
      type: 'script',
      position,
      data: {
        label: module.summary || 'Branch',
        framework: 'script',
        module: `script-${module.value.type}`,
        inputTransforms: module.value.inputTransforms,
        stopAfterIf: module.stopAfterIf,
        inputs: ['main'],
        outputs,
        params: {
          type: module.value.type,
          branches: module.value.branches || [],
        },
      },
    };
  }

  /**
   * Extract workflow parameters from nodes
   */
  private static extractWorkflowParameters(nodes: WorkflowNode[]): Record<string, any> {
    const params: Record<string, any> = {};

    // Common parameters for automation workflows
    params.environment = {
      type: 'string',
      description: 'Environment (dev, staging, prod)',
      default: 'dev',
    };

    // Extract parameters from input transforms
    nodes.forEach(node => {
      if (node.data.inputTransforms) {
        Object.keys(node.data.inputTransforms).forEach(key => {
          if (!params[key] && key !== 'previous_result' && key !== 'flow_input') {
            params[key] = {
              type: 'string',
              description: `Parameter extracted from ${node.data.label}`,
            };
          }
        });
      }
    });

    return params;
  }

  /**
   * Create a sample Script workflow from Matrix message example
   */
  static createMatrixWorkflowExample(): ScriptWorkflow {
    return {
      summary: 'Matrix Message Workflow',
      description: 'Send a message to a Matrix room',
      value: {
        modules: [
          {
            id: 'matrix-script',
            summary: 'Send Matrix Message',
            value: {
              type: 'script',
              content: `
type Matrix = {
  baseUrl: string;
  token: string;
};

export async function main(matrix_res: Matrix, room: string, body: string) {
  if (!matrix_res.token) {
    throw Error("Sending a message requires an access token.");
  }
  
  const roomId = await resolveRoomAlias(matrix_res, room);
  const txnId = \`\${Math.random()}\`;
  
  const resp = await fetch(
    \`\${matrix_res.baseUrl}/_matrix/client/v3/rooms/\${encodeURIComponent(
      roomId,
    )}/send/m.room.message/\${txnId}\`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        Authorization: \`Bearer \${matrix_res.token}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body,
        msgtype: "m.text",
      }),
    },
  );
  
  if (!resp.ok) {
    throw Error(\`Failed to send message: Error HTTP\${resp.status}\`);
  }
  
  const eventId = (await resp.json())["event_id"];
  return eventId;
}

async function resolveRoomAlias(matrix_res: Matrix, room: string): Promise<string> {
  if (room.startsWith("!")) {
    return room;
  }
  
  const resp = await fetch(
    \`\${matrix_res.baseUrl}/_matrix/client/v3/directory/room/\${encodeURIComponent(room)}\`,
    {
      headers: {
        Accept: "application/json",
        ...(matrix_res.token && {
          Authorization: \`Bearer \${matrix_res.token}\`,
        }),
      },
    },
  );
  
  if (!resp.ok) {
    throw Error(\`Failed to resolve room alias: Error HTTP\${resp.status}\`);
  }
  
  const roomId = (await resp.json())["room_id"];
  return roomId;
}
              `,
              language: 'deno',
              lock: '',
              inputTransforms: {
                matrix_res: {
                  expr: 'flow_input.matrix_res',
                  type: 'javascript',
                },
                room: {
                  expr: 'flow_input.room',
                  type: 'javascript',
                },
                body: {
                  expr: 'flow_input.body',
                  type: 'javascript',
                },
              },
            },
          },
        ],
        failureModule: undefined,
      },
      schema: {
        type: 'object',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        required: ['matrix_res', 'room', 'body'],
        properties: {
          matrix_res: {
            type: 'object',
            description: 'Matrix server credentials',
            properties: {
              baseUrl: { type: 'string' },
              token: { type: 'string' },
            },
          },
          room: {
            type: 'string',
            description: 'Matrix room ID or alias',
          },
          body: {
            type: 'string',
            description: 'Message content',
          },
        },
      },
    };
  }
}
