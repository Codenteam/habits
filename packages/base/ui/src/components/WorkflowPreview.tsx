import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { WorkflowCanvas, type WorkflowCanvasRef, type ExportFormat, type WorkflowNode } from '@ha-bits/workflow-canvas';
import type { Node, Edge } from 'reactflow';

export interface WorkflowPreviewProps {
  /** Nodes to display */
  nodes: Node[];
  /** Edges connecting nodes */
  edges: Edge[];
  /** Height of the preview */
  height?: string | number;
  /** Width of the preview */
  width?: string | number;
  /** Show controls */
  showControls?: boolean;
  /** Show minimap */
  showMinimap?: boolean;
  /** Custom class name */
  className?: string;
  /** Node click handler */
  onNodeClick?: (node: Node) => void;
}

export interface WorkflowPreviewRef {
  /** Export the workflow to specified format */
  exportTo: (format: ExportFormat) => Promise<string>;
  /** Download the workflow as a file */
  download: (filename: string, format: ExportFormat) => Promise<void>;
  /** Fit view to content */
  fitView: () => void;
}

/**
 * WorkflowPreview - Read-only workflow preview component for base-ui
 * Uses the shared workflow-canvas library for rendering
 */
export const WorkflowPreview = forwardRef<WorkflowPreviewRef, WorkflowPreviewProps>(
  (
    {
      nodes,
      edges,
      height = '100%',
      width = '100%',
      className = '',
      onNodeClick,
    },
    ref
  ) => {
    const canvasRef = useRef<WorkflowCanvasRef>(null);

    // Export functionality
    const exportTo = useCallback(async (format: ExportFormat): Promise<string> => {
      if (!canvasRef.current) {
        throw new Error('Canvas not initialized');
      }
      return canvasRef.current.exportTo(format);
    }, []);

    // Download functionality
    const download = useCallback(async (filename: string, format: ExportFormat): Promise<void> => {
      const dataUrl = await exportTo(format);
      const link = document.createElement('a');
      link.download = `${filename}.${format}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, [exportTo]);

    // Fit view
    const fitView = useCallback(() => {
      if (canvasRef.current) {
        canvasRef.current.fitView();
      }
    }, []);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      exportTo,
      download,
      fitView,
    }), [exportTo, download, fitView]);

    // Convert nodes to canvas format (using custom type for BaseNode)
    const canvasNodes = nodes.map(node => ({
      ...node,
      type: 'custom',
    })) as WorkflowNode[];

    return (
      <WorkflowCanvas
        ref={canvasRef}
        nodes={canvasNodes}
        edges={edges}
        height={height}
        width={width}
        showControls={true}
        showMinimap={true}
        interactive={false}
        className={className}
        onNodeClick={onNodeClick}
        showActionButtons={true}
      />
    );
  }
);

WorkflowPreview.displayName = 'WorkflowPreview';
export default WorkflowPreview;
