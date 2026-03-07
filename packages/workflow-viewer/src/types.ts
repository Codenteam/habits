import type { CanvasNode, CanvasEdge } from '@ha-bits/core';

/**
 * Framework types supported by the workflow viewer
 */
export type WorkflowFramework = 'n8n' | 'activepieces' | 'script' | 'bits';

/**
 * Node type classification
 */
export type NodeType = 'trigger' | 'action' | 'custom';

/**
 * Data structure for workflow viewer nodes
 */
export interface ViewerNodeData {
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
}

/**
 * Canvas node with viewer-specific data
 */
export type ViewerNode = CanvasNode<ViewerNodeData>;

/**
 * Canvas edge type
 */
export type ViewerEdge = CanvasEdge;

/**
 * Parsed habit structure
 */
export interface ParsedHabit {
  id: string;
  name: string;
  description?: string;
  nodes: ViewerNode[];
  edges: ViewerEdge[];
  frontendHtml?: string;
}

/**
 * Habit YAML node format
 */
export interface HabitYamlNode {
  id: string;
  type: string;
  data: {
    framework?: WorkflowFramework;
    source?: string;
    module?: string;
    operation?: string;
    params?: Record<string, any>;
    credentials?: Record<string, any>;
    label?: string;
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
  quality?: number; // For PNG (0-1)
}

/**
 * WorkflowViewer component props
 */
export interface WorkflowViewerProps {
  /** Nodes to display */
  nodes: ViewerNode[];
  /** Edges connecting nodes */
  edges: ViewerEdge[];
  /** Height of the viewer (default: 100%) */
  height?: string | number;
  /** Width of the viewer (default: 100%) */
  width?: string | number;
  /** Show controls panel */
  showControls?: boolean;
  /** Show minimap */
  showMinimap?: boolean;
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
  onNodeClick?: (node: ViewerNode) => void;
}

/**
 * HabitViewer component props
 */
export interface HabitViewerProps {
  /** Habit content as YAML or JSON string */
  habitContent: string;
  /** Content format */
  format?: 'yaml' | 'json' | 'auto';
  /** Export format for rendering (svg, png, html) */
  renderFormat?: ExportFormat;
  /** Height of the viewer */
  height?: string | number;
  /** Width of the viewer */
  width?: string | number;
  /** Show controls */
  showControls?: boolean;
  /** Callback when export is ready */
  onExportReady?: (dataUrl: string) => void;
  /** Error callback */
  onError?: (error: Error) => void;
  /** Custom class name */
  className?: string;
}
