// Components
export { BaseNode } from './components/BaseNode';
export { WorkflowCanvas } from './components/WorkflowCanvas';
export type { WorkflowCanvasRef } from './components/WorkflowCanvas';

// Re-export ReactFlow Panel for use with WorkflowCanvas
export { Panel } from 'reactflow';

// Utilities
export { parseHabitContent, convertToCanvasFormat, applyDagreLayout } from './utils/parser';
export { exportElement, downloadExport, prepareForExport } from './utils/exporter';

// Node definitions
export { nodeDefinitions, getNodeDefinition, isCueNode, isTriggerNode, getNodeColors } from './nodeDefinitions';

// Types
export type {
  NodeDefinition,
  NodeFieldDefinition,
  CanvasNode,
  CanvasEdge,
  CanvasData,
  WorkflowNode,
  WorkflowEdge,
  ExportFormat,
  ExportOptions,
  BaseNodeProps,
  BaseNodeData,
  WorkflowCanvasProps,
  WorkflowFramework,
  NodeType,
  ParsedHabit,
  HabitYaml,
  HabitYamlNode,
  HabitYamlEdge,
  NodeChange,
  EdgeChange,
  Connection,
} from './types';

// Re-export applyNodeChanges and applyEdgeChanges helpers from reactflow
export { applyNodeChanges, applyEdgeChanges } from 'reactflow';

// Styles (for consumers to import)
import './styles.css';
