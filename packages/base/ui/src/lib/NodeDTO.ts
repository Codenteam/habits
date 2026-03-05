import type { WorkflowNode } from '../types/workflow';
import { getNodeDefinition } from '@ha-bits/workflow-canvas';

/**
 * Data Transfer Object for workflow nodes
 * Provides a unified interface for both n8n and activepieces nodes
 */
export class NodeDTO {
  public readonly id: string;
  public readonly type: 'n8n' | 'activepieces' | 'script' | 'trigger' | 'action' | 'bits';
  public readonly framework: 'n8n' | 'activepieces' | 'script' | 'bits';
  public readonly position: { x: number; y: number };
  public readonly label: string;
  public readonly module: string;
  public readonly resource: string;
  public readonly operation: string;
  public readonly inputs: string[];
  public readonly outputs: string[];
  public readonly params: Record<string, any>;
  public readonly credentials: Record<string, any>;
  // Script-specific properties
  public readonly scriptPath?: string;
  public readonly language?: 'deno' | 'python3' | 'go' | 'bash' | 'sql' | 'typescript' | 'javascript';
  public readonly content?: string;
  public readonly inputTransforms?: Record<string, any>;
  public readonly stopAfterIf?: { expr: string; skipIfStopped?: boolean };

  constructor(data: WorkflowNode | Partial<WorkflowNode>) {
    this.id = data.id || `node-${Date.now()}`;
    this.position = data.position || { x: 0, y: 0 };
    this.framework = data.data?.framework || 'n8n';
    this.type = data.type || this.framework;
    this.label = data.data?.label || 'Untitled Node';
    this.module = data.data?.module || '';
    this.resource = data.data?.resource || '';
    this.operation = data.data?.operation || '';
    this.params = data.data?.params || {};
    this.credentials = data.data?.credentials || {};
    
    // Script-specific properties
    this.scriptPath = data.data?.scriptPath;
    this.language = data.data?.language;
    this.content = data.data?.content;
    this.inputTransforms = data.data?.inputTransforms;
    this.stopAfterIf = data.data?.stopAfterIf;

    // Get inputs/outputs from data or determine from node definition
    if (data.data?.inputs && data.data?.outputs) {
      this.inputs = data.data.inputs;
      this.outputs = data.data.outputs;
    } else {
      // Map the type to NodeType for getNodeDefinition
      const nodeType = (this.type === 'trigger' || this.type === 'action') ? this.type : undefined;
      const nodeDefinition = getNodeDefinition(this.framework, this.module, nodeType as any);
      this.inputs = nodeDefinition.inputs;
      this.outputs = nodeDefinition.outputs;
    }
  }

  /**
   * Create a NodeDTO from a WorkflowNode
   */
  static fromWorkflowNode(workflowNode: WorkflowNode): NodeDTO {
    return new NodeDTO(workflowNode);
  }

  /**
   * Create a NodeDTO for a new node
   */
  static createNew(options: {
    framework: 'n8n' | 'activepieces' | 'script' | 'bits';
    module: string;
    label?: string;
    position?: { x: number; y: number };
    resource?: string;
    operation?: string;
    // Script-specific options
    scriptPath?: string;
    language?: 'deno' | 'python3' | 'go' | 'bash' | 'sql' | 'typescript';
    content?: string;
    inputTransforms?: Record<string, any>;
    stopAfterIf?: { expr: string; skipIfStopped?: boolean };
  }): NodeDTO {
    return new NodeDTO({
      data: {
        framework: options.framework,
        module: options.module,
        label: options.label || options.module.replace(/^(n8n-nodes-|piece-)/, ''),
        resource: options.resource || '',
        operation: options.operation || '',
        params: {},
        credentials: {},
        // Script-specific properties
        scriptPath: options.scriptPath,
        language: options.language,
        content: options.content,
        inputTransforms: options.inputTransforms,
        stopAfterIf: options.stopAfterIf,
      },
      position: options.position || { x: 0, y: 0 },
    });
  }

  /**
   * Convert back to WorkflowNode format
   */
  toWorkflowNode(): WorkflowNode {
    return {
      id: this.id,
      type: this.type,
      position: this.position,
      data: {
        label: this.label,
        framework: this.framework,
        module: this.module,
        resource: this.resource,
        operation: this.operation,
        params: this.params,
        credentials: this.credentials,
        inputs: this.inputs,
        outputs: this.outputs,
        // Script-specific properties
        scriptPath: this.scriptPath,
        language: this.language,
        content: this.content,
        inputTransforms: this.inputTransforms,
        stopAfterIf: this.stopAfterIf,
      },
    };
  }

  /**
   * Convert to ReactFlow Node format
   */
  toReactFlowNode(): any {
    return {
      id: this.id,
      type: 'custom',
      position: this.position,
      data: {
        label: this.label,
        framework: this.framework,
        module: this.module,
        resource: this.resource,
        operation: this.operation,
        params: this.params,
        credentials: this.credentials,
        inputs: this.inputs,
        outputs: this.outputs,
        // Script-specific properties
        scriptPath: this.scriptPath,
        language: this.language,
        content: this.content,
        inputTransforms: this.inputTransforms,
        stopAfterIf: this.stopAfterIf,
      },
    };
  }

  /**
   * Check if this is a trigger node (no inputs)
   */
  isTrigger(): boolean {
    return this.inputs.length === 0;
  }

  /**
   * Check if this is an n8n node
   */
  isN8n(): boolean {
    return this.framework === 'n8n';
  }

  /**
   * Check if this is an activepieces node
   */
  isActivepieces(): boolean {
    return this.framework === 'activepieces';
  }

  /**
   * Check if this is a script node
   */
  isScript(): boolean {
    return this.framework === 'script';
  }

  /**
   * Check if node has multiple inputs
   */
  hasMultipleInputs(): boolean {
    return this.inputs.length > 1;
  }

  /**
   * Check if node has multiple outputs
   */
  hasMultipleOutputs(): boolean {
    return this.outputs.length > 1;
  }

  /**
   * Get the display name for the node
   */
  getDisplayName(): string {
    if (this.resource && this.operation) {
      return `${this.label} (${this.resource}.${this.operation})`;
    }
    return this.label;
  }

  /**
   * Get node color class based on framework and type
   */
  getColorClass(): string {
    if (this.isTrigger()) {
      return this.isN8n() ? 'bg-green-50 border-green-300 text-green-700' : 'bg-blue-50 border-blue-300 text-blue-700';
    }
    return this.isN8n() ? 'bg-red-50 border-red-300 text-red-700' : 'bg-purple-50 border-purple-300 text-purple-700';
  }

  /**
   * Get icon name based on framework and type
   */
  getIcon(): string {
    if (this.isTrigger()) {
      return 'Play';
    }
    return this.isN8n() ? 'Activity' : 'Zap';
  }

  /**
   * Clone the node with optional overrides
   */
  clone(overrides?: Partial<WorkflowNode>): NodeDTO {
    const cloned = {
      ...this.toWorkflowNode(),
      id: `${this.id}-copy-${Date.now()}`,
      ...overrides,
    };
    return new NodeDTO(cloned);
  }

  /**
   * Update node data
   */
  update(updates: {
    label?: string;
    resource?: string;
    operation?: string;
    params?: Record<string, any>;
    credentials?: Record<string, any>;
    position?: { x: number; y: number };
  }): NodeDTO {
    const updatedNode = this.toWorkflowNode();
    
    if (updates.label) updatedNode.data.label = updates.label;
    if (updates.resource) updatedNode.data.resource = updates.resource;
    if (updates.operation) updatedNode.data.operation = updates.operation;
    if (updates.params) updatedNode.data.params = { ...updatedNode.data.params, ...updates.params };
    if (updates.credentials) updatedNode.data.credentials = { ...updatedNode.data.credentials, ...updates.credentials };
    if (updates.position) updatedNode.position = updates.position;

    return new NodeDTO(updatedNode);
  }

  /**
   * Validate node configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.id) {
      errors.push('Node ID is required');
    }

    if (!this.framework || !['n8n', 'activepieces', 'script'].includes(this.framework)) {
      errors.push('Valid framework (n8n, activepieces, or script) is required');
    }

    if (!this.module) {
      errors.push('Module is required');
    }

    if (!this.label) {
      errors.push('Label is required');
    }

    // Framework-specific validation
    if (this.isN8n()) {
      if (this.resource && !this.operation) {
        errors.push('Operation is required when resource is specified for n8n nodes');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get execution configuration for the node
   */
  getExecutionConfig(): {
    framework: string;
    module: string;
    resource?: string;
    operation?: string;
    params: Record<string, any>;
    credentials: Record<string, any>;
  } {
    return {
      framework: this.framework,
      module: this.module,
      resource: this.resource || undefined,
      operation: this.operation || undefined,
      params: this.params,
      credentials: this.credentials,
    };
  }

  /**
   * Check if node can connect to another node
   */
  canConnectTo(targetNode: NodeDTO, sourceHandle?: string, targetHandle?: string): boolean {
    // Can't connect to self
    if (this.id === targetNode.id) {
      return false;
    }

    // Check if source has the specified output handle
    if (sourceHandle && !this.outputs.includes(sourceHandle)) {
      return false;
    }

    // Check if target has the specified input handle
    if (targetHandle && !targetNode.inputs.includes(targetHandle)) {
      return false;
    }

    // Trigger nodes can't have inputs connected to them
    if (targetNode.isTrigger()) {
      return false;
    }

    return true;
  }

  /**
   * Get a summary of the node for debugging/logging
   */
  getSummary(): string {
    return `${this.framework.toUpperCase()} Node: ${this.getDisplayName()} (${this.inputs.length} inputs, ${this.outputs.length} outputs)`;
  }
}