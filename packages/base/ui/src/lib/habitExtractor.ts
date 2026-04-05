/**
 * Habit Extractor - Extracts clean habit data adhering to habits.schema.yaml
 * This ensures only schema-compliant fields are exported, removing internal state.
 */

import type { CanvasNode, CanvasEdge } from '@ha-bits/core';
import { normalizePathsInObject } from '@ha-bits/core';

/** Schema-compliant workflow node data */
export interface SchemaNodeData {
  label?: string;
  framework?: 'script' | 'bits';
  module?: string;
  operation?: string;
  resource?: string;
  source?: string;
  isTrigger?: boolean;
  inputs?: string[];
  outputs?: string[];
  inputTransforms?: Record<string, any>;
  credentials?: Record<string, any>;
  params?: {
    type?: string;
    language?: 'bash' | 'deno' | 'go' | 'python3' | 'sql' | 'typescript';
    script?: string;
    [key: string]: any;
  };
  stopAfterIf?: {
    expr?: string;
    skipIfStopped?: boolean;
  };
  // bits-specific
  action?: string;
  trigger?: string;
  piece?: string;
  type?: string;
}

/** Schema-compliant workflow node */
export interface SchemaNode {
  id: string;
  type: 'action' | 'trigger' | 'script' | 'bit';
  position: { x: number; y: number };
  data: SchemaNodeData;
}

/** Schema-compliant workflow edge */
export interface SchemaEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/** Schema-compliant workflow/habit */
export interface SchemaHabit {
  id?: string;
  name?: string;
  description?: string;
  version?: string;
  nodes: SchemaNode[];
  edges: SchemaEdge[];
  output?: Record<string, string>;
}

/**
 * Extract clean node data according to schema
 */
function extractNodeData(data: any): SchemaNodeData {
  const cleanData: SchemaNodeData = {};
  
  // Core fields
  if (data.label) cleanData.label = data.label;
  if (data.framework) cleanData.framework = data.framework;
  if (data.module) cleanData.module = data.module;
  if (data.operation) cleanData.operation = data.operation;
  if (data.resource) cleanData.resource = data.resource;
  if (data.source) cleanData.source = data.source;
  if (typeof data.isTrigger === 'boolean') cleanData.isTrigger = data.isTrigger;
  
  // Arrays (normalize bracket to dot notation in string values)
  if (Array.isArray(data.inputs) && data.inputs.length > 0) {
    cleanData.inputs = normalizePathsInObject(data.inputs);
  }
  if (Array.isArray(data.outputs) && data.outputs.length > 0) {
    cleanData.outputs = normalizePathsInObject(data.outputs);
  }
  
  // Objects (normalize bracket to dot notation in string values)
  if (data.inputTransforms && Object.keys(data.inputTransforms).length > 0) {
    cleanData.inputTransforms = normalizePathsInObject(data.inputTransforms);
  }
  if (data.credentials && Object.keys(data.credentials).length > 0) {
    cleanData.credentials = normalizePathsInObject(data.credentials);
  }
  
  // Params - extract only relevant params for the framework (normalize bracket to dot notation)
  if (data.params && Object.keys(data.params).length > 0) {
    const cleanParams: Record<string, any> = {};
    const excludeKeys = ['_type', '_action', '_piece', '_module']; // Internal keys
    
    for (const [key, value] of Object.entries(data.params)) {
      if (!excludeKeys.includes(key) && value !== undefined && value !== null && value !== '') {
        cleanParams[key] = normalizePathsInObject(value);
      }
    }
    
    if (Object.keys(cleanParams).length > 0) {
      cleanData.params = cleanParams;
    }
  }
  
  // StopAfterIf (normalize expressions)
  if (data.stopAfterIf?.expr) {
    cleanData.stopAfterIf = {
      expr: normalizePathsInObject(data.stopAfterIf.expr),
      ...(typeof data.stopAfterIf.skipIfStopped === 'boolean' && { skipIfStopped: data.stopAfterIf.skipIfStopped })
    };
  }
  
  // Bits-specific fields
  if (data.action) cleanData.action = data.action;
  if (data.trigger) cleanData.trigger = data.trigger;
  if (data.piece) cleanData.piece = data.piece;
  if (data.type) cleanData.type = data.type;
  
  return cleanData;
}

/**
 * Map node type based on framework and data
 */
function mapNodeType(node: CanvasNode): SchemaNode['type'] {
  const framework = node.data?.framework;
  const isTrigger = node.data?.isTrigger;
  
  if (framework === 'script') return 'script';
  if (framework === 'bits') return 'bit';
  
  return isTrigger ? 'trigger' : 'action';
}

/**
 * Extract a clean schema-compliant habit from internal state
 */
export function extractSchemaHabit(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  metadata?: { id?: string; name?: string; description?: string; version?: string; output?: Record<string, string> }
): SchemaHabit {
  const schemaNodes: SchemaNode[] = nodes.map(node => ({
    id: node.id,
    type: mapNodeType(node),
    position: { x: node.position.x, y: node.position.y },
    data: extractNodeData(node.data || {}),
  }));
  
  const schemaEdges: SchemaEdge[] = edges.map(edge => {
    const schemaEdge: SchemaEdge = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
    };
    if (edge.sourceHandle) schemaEdge.sourceHandle = edge.sourceHandle;
    if (edge.targetHandle) schemaEdge.targetHandle = edge.targetHandle;
    return schemaEdge;
  });
  
  const habit: SchemaHabit = {
    nodes: schemaNodes,
    edges: schemaEdges,
  };
  
  // Add metadata if provided
  if (metadata?.id) habit.id = metadata.id;
  if (metadata?.name) habit.name = metadata.name;
  if (metadata?.description) habit.description = metadata.description;
  if (metadata?.version) habit.version = metadata.version;
  if (metadata?.output && Object.keys(metadata.output).length > 0) habit.output = metadata.output;
  
  return habit;
}

/**
 * Export workflow state to clean schema-compliant format
 */
export function createSchemaCompliantExport(state: {
  workflow: { id?: string; name?: string; description?: string; version?: string };
  habits: Array<{ id: string; name?: string; description?: string; nodes: CanvasNode[]; edges: CanvasEdge[] }>;
  activeHabitId?: string;
}): SchemaHabit {
  const activeHabit = state.habits.find(h => h.id === state.activeHabitId);
  
  if (!activeHabit) {
    return {
      ...state.workflow,
      nodes: [],
      edges: [],
    };
  }
  
  return extractSchemaHabit(
    activeHabit.nodes,
    activeHabit.edges,
    {
      id: state.workflow.id,
      name: activeHabit.name || state.workflow.name,
      description: activeHabit.description || state.workflow.description,
      version: state.workflow.version,
    }
  );
}
