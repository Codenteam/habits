import type { Node, Edge, NodeChange, EdgeChange, Connection } from 'reactflow';

/**
 * Framework types supported by the workflow canvas
 */
export type WorkflowFramework = 'script' | 'bits';

/**
 * Node type classification
 * 'cue' is the primary term for entry points, 'trigger' is kept for backward compatibility
 * 'routine' is the primary term for actions, 'action' is kept for backward compatibility
 */
export type NodeType = 'cue' | 'routine' | 'forloopflow' | 'branchone' | 'branchall' | 'trigger' | 'action';

/**
 * Base data structure for workflow nodes
 */
export interface BaseNodeData {
  label: string;
  framework: WorkflowFramework;
  module: string;
  type?: NodeType;
  resource?: string;
  operation?: string;
  params?: Record<string, any>;
  credentials?: Record<string, any>;
  inputs?: string[];
  outputs?: string[];
  // Script-specific
  language?: string;
  content?: string;
  scriptPath?: string;
  // Display options
  collapsed?: boolean;
}

/**
 * ReactFlow node with workflow-specific data
 */
export type WorkflowNode = Node<BaseNodeData>;

/**
 * Alias for WorkflowNode - for compatibility
 */
export type CanvasNode = WorkflowNode;

/**
 * ReactFlow edge type
 */
export type WorkflowEdge = Edge;

/**
 * Alias for WorkflowEdge - for compatibility
 */
export type CanvasEdge = WorkflowEdge;

/**
 * Canvas data structure containing nodes and edges
 */
export interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

/**
 * Parsed habit structure
 */
export interface ParsedHabit {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

/**
 * Habit YAML node format
 */
export interface HabitYamlNode {
  id: string;
  type?: string;
  position?: { x: number; y: number };
  data: {
    framework?: WorkflowFramework;
    source?: string;
    module?: string;
    operation?: string;
    params?: Record<string, any>;
    credentials?: Record<string, any>;
    label?: string;
    type?: NodeType;
    script?: {
      type?: string;
      language?: string;
      content?: string;
    };
  };
}

/**
 * Habit YAML edge format
 */
export interface HabitYamlEdge {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/**
 * Habit YAML structure
 */
export interface HabitYaml {
  id: string;
  name: string;
  description?: string;
  nodes: HabitYamlNode[];
  edges: HabitYamlEdge[];
}

/**
 * Export format options
 */
export type ExportFormat = 'svg' | 'png' | 'html';

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  width?: number;
  height?: number;
  backgroundColor?: string;
  padding?: number;
  quality?: number;
}

/**
 * Node definition for inputs/outputs
 */
export interface NodeDefinition {
  inputs: string[];
  outputs: string[];
  allowsMultiple?: boolean;
}

/**
 * Node field definition (for form generation)
 */
export interface NodeFieldDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'text';
  label: string;
  required?: boolean;
  options?: string[];
  default?: any;
}

/**
 * WorkflowCanvas component props
 */
export interface WorkflowCanvasProps {
  /** Nodes to display */
  nodes: WorkflowNode[];
  /** Edges connecting nodes */
  edges: WorkflowEdge[];
  /** Height of the canvas */
  height?: string | number;
  /** Width of the canvas */
  width?: string | number;
  /** Show controls panel */
  showControls?: boolean;
  /** Show minimap */
  showMinimap?: boolean;
  /** Show action buttons (fit view, fullscreen) */
  showActionButtons?: boolean;
  /** Background variant */
  backgroundVariant?: 'dots' | 'lines' | 'cross' | 'none';
  /** Background color */
  backgroundColor?: string;
  /** Fit view on initial render */
  fitView?: boolean;
  /** Allow pan/zoom interaction */
  interactive?: boolean;
  /** Custom class name */
  className?: string;
  /** Node click handler */
  onNodeClick?: (node: WorkflowNode) => void;
  /** Node changes handler (for dragging, selecting, etc.) */
  onNodesChange?: (changes: NodeChange[]) => void;
  /** Auto-layout callback (called when user clicks arrange button) */
  onAutoLayout?: () => void;

  /** Force ELK even if x,y exist*/
  forceAutoLayout?: boolean;
  /** Custom node types to override BaseNode */
  nodeTypes?: Record<string, React.ComponentType<any>>;
  /** Raw YAML content of the habit (for code view modal) */
  rawYaml?: string;
  /** Habit code content (JSON format) for code view modal */
  habitCode?: string;
  /** Enable editing mode (allows connecting nodes, deleting edges) */
  editable?: boolean;
  /** Edge changes handler (for editing mode) */
  onEdgesChange?: (changes: EdgeChange[]) => void;
  /** Connection handler (for editing mode) */
  onConnect?: (connection: Connection) => void;
  /** Edges delete handler (for editing mode) */
  onEdgesDelete?: (edges: WorkflowEdge[]) => void;
  /** Children to render inside ReactFlow (e.g., Panel components) */
  children?: React.ReactNode;
}

/** Re-export NodeChange for consumers */
export type { NodeChange, EdgeChange, Connection } from 'reactflow';

/**
 * BaseNode component props (extends ReactFlow NodeProps)
 */
export interface BaseNodeProps {
  id: string;
  data: BaseNodeData;
  selected?: boolean;
  /** Whether the node is read-only (no editing) */
  readOnly?: boolean;
}
