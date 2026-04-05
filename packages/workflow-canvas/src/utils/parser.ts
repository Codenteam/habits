import * as yaml from 'js-yaml';
import dagre from 'dagre';
import type { 
  HabitYaml, 
  HabitYamlNode, 
  ParsedHabit, 
  WorkflowNode, 
  WorkflowEdge,
  WorkflowFramework,
} from '../types';
import { getNodeDefinition, isTriggerNode } from '../nodeDefinitions';

/**
 * Parse habit content from YAML or JSON string
 */
export function parseHabitContent(
  content: string, 
  format: 'yaml' | 'json' | 'auto' = 'auto'
): HabitYaml {
  const actualFormat = format === 'auto' ? detectFormat(content) : format;
  
  try {
    if (actualFormat === 'yaml') {
      return yaml.load(content) as HabitYaml;
    } else {
      return JSON.parse(content) as HabitYaml;
    }
  } catch (error) {
    throw new Error(
      `Failed to parse habit content as ${actualFormat}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Detect if content is YAML or JSON
 */
function detectFormat(content: string): 'yaml' | 'json' {
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json';
  }
  return 'yaml';
}

// Default node dimensions (fallback when actual dimensions not available)
const DEFAULT_NODE_WIDTH = 280;
const DEFAULT_NODE_HEIGHT = 120;
const LONG_VALUES_WIDTH = 400;
const LONG_VALUE_THRESHOLD = 10;

/**
 * Calculate estimated node dimensions based on node data content
 * This provides better estimates when actual DOM dimensions are not available
 */
function estimateNodeDimensions(node: WorkflowNode): { width: number; height: number } {
  // If node has actual dimensions from ReactFlow (after rendering), use them
  if (node.width && node.height) {
    return { width: node.width, height: node.height };
  }

  const data = node.data;
  const isCollapsed = data.collapsed ?? false;
  
  // Calculate if node has long values that would expand it
  const hasLongValues = (() => {
    if (data.params) {
      for (const value of Object.values(data.params)) {
        if (typeof value === 'string' && value.length > LONG_VALUE_THRESHOLD) {
          return true;
        }
      }
    }
    if (data.framework === 'script' && data.content && data.content.length > LONG_VALUE_THRESHOLD) {
      return true;
    }
    return false;
  })();

  // Width calculation
  let width = DEFAULT_NODE_WIDTH;
  if (!isCollapsed && hasLongValues) {
    width = LONG_VALUES_WIDTH;
  }

  // Height calculation - base height plus additional for content
  let height = DEFAULT_NODE_HEIGHT;
  
  if (!isCollapsed && hasLongValues) {
    // Count long values for height estimation
    let longValueCount = 0;
    if (data.params) {
      for (const value of Object.values(data.params)) {
        if (typeof value === 'string' && value.length > LONG_VALUE_THRESHOLD) {
          longValueCount++;
        }
      }
    }
    if (data.framework === 'script' && data.content && data.content.length > LONG_VALUE_THRESHOLD) {
      longValueCount++;
    }
    // Each long value adds approximately 100px (label + content area)
    height += longValueCount * 50;
  }

  return { width, height };
}

/**
 * Apply dagre layout algorithm to nodes (always applies, ignores existing positions)
 * This is the public API for re-arranging nodes on demand
 */
export function applyDagreLayout(nodes: WorkflowNode[], edges: WorkflowEdge[] = []): WorkflowNode[] {
  // Create a new dagre graph
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Configure the graph layout
  dagreGraph.setGraph({
    rankdir: 'TB', // Top to bottom layout
    nodesep: 100,  // Horizontal spacing between nodes at same rank
    ranksep: 100,  // Spacing between ranks (rows)
    marginx: 0,    // Remove horizontal margin to center nodes
    marginy: 50,
    align: 'UL',   // Center nodes horizontally (Upper-Left alignment)
  });

  // Store node dimensions for positioning calculation
  const nodeDimensions = new Map<string, { width: number; height: number }>();

  // Add nodes to dagre graph using their actual or estimated dimensions
  nodes.forEach((node) => {
    const dimensions = estimateNodeDimensions(node);
    nodeDimensions.set(node.id, dimensions);
    dagreGraph.setNode(node.id, { width: dimensions.width, height: dimensions.height });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Run the layout algorithm
  dagre.layout(dagreGraph);

  // Apply the calculated positions to nodes
  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const dimensions = nodeDimensions.get(node.id)!;
    return {
      ...node,
      position: {
        // Center the node on the calculated position
        x: nodeWithPosition.x - dimensions.width / 2,
        y: nodeWithPosition.y - dimensions.height / 2,
      },
    };
  });
}

/**
 * Convert HabitYaml node to WorkflowNode
 */
function convertHabitNode(node: HabitYamlNode, _index: number): WorkflowNode {
  const framework = (node.data.framework || node.type || 'bits') as WorkflowFramework;
  const module = node.data.module || '';
  const nodeType = isTriggerNode(framework, module) ? 'trigger' : 'action';
  const definition = getNodeDefinition(framework, module, nodeType);

  // Extract script content from various locations
  const scriptContent = 
    node.data.script?.content || 
    (typeof node.data.params?.script === 'string' ? node.data.params.script : undefined);
  const scriptLanguage = node.data.script?.language || node.data.params?.language;

  return {
    id: node.id,
    type: 'custom',
    position: node.position || { x: 0, y: 0 },
    data: {
      label: node.data.label || node.id,
      framework,
      module,
      type: nodeType,
      operation: node.data.operation,
      params: node.data.params,
      credentials: node.data.credentials,
      inputs: definition.inputs,
      outputs: definition.outputs,
      language: scriptLanguage,
      content: scriptContent,
    },
  };
}

/**
 * Convert HabitYaml edge to WorkflowEdge
 */
function convertHabitEdge(
  edge: { source: string; target: string; sourceHandle?: string; targetHandle?: string }, 
  index: number
): WorkflowEdge {
  return {
    id: `edge-${edge.source}-${edge.target}-${index}`,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
  };
}

/**
 * Convert parsed HabitYaml to ParsedHabit with ReactFlow nodes/edges
 */
export function convertToCanvasFormat(habitYaml: HabitYaml): ParsedHabit {
  if (!habitYaml || typeof habitYaml !== 'object') {
    throw new Error('Invalid habit content: expected an object');
  }
  
  if (!Array.isArray(habitYaml.nodes)) {
    throw new Error('Invalid habit content: missing or invalid "nodes" array');
  }
  
  if (!Array.isArray(habitYaml.edges)) {
    // Can still work without edges, one node workflow is valid
    console.log('Missing or invalid "edges" array, weird but can still work');
  }
  
  const nodes = habitYaml.nodes.map(convertHabitNode);
  const edges = habitYaml.edges.map(convertHabitEdge);
  
  return {
    id: habitYaml.id,
    name: habitYaml.name,
    description: habitYaml.description,
    nodes,
    edges,
  };
}

/**
 * Parse habit content string directly to canvas-ready format
 */
export function parseHabitToCanvasFormat(
  content: string,
  format: 'yaml' | 'json' | 'auto' = 'auto'
): ParsedHabit {
  const habitYaml = parseHabitContent(content, format);
  return convertToCanvasFormat(habitYaml);
}

/**
 * Validate habit content structure
 */
export function validateHabitContent(content: unknown): content is HabitYaml {
  if (!content || typeof content !== 'object') return false;
  
  const habit = content as HabitYaml;
  
  if (!habit.id || typeof habit.id !== 'string') return false;
  if (!habit.name || typeof habit.name !== 'string') return false;
  if (!Array.isArray(habit.nodes)) return false;
  if (!Array.isArray(habit.edges)) return false;
  
  return true;
}
