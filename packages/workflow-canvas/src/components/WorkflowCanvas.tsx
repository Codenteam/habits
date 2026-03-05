import { useRef, useCallback, forwardRef, useImperativeHandle, useState, useEffect, useMemo } from 'react';
import ReactFlow, {
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  NodeTypes,
  ReactFlowInstance,
  Edge,
} from 'reactflow';
import { Focus, Maximize, Minimize, LayoutGrid, Code, Braces, X } from 'lucide-react';
import 'reactflow/dist/style.css';

import { BaseNode } from './BaseNode';
import type { WorkflowCanvasProps, WorkflowNode, ExportFormat, WorkflowEdge } from '../types';
import { exportElement, prepareForExport } from '../utils/exporter';
import { isTriggerNode } from '../nodeDefinitions';
import { applyDagreLayout } from '../utils/parser';

// Color mapping for minimap (dark mode colors)
const getMinimapNodeColor = (node: WorkflowNode): string => {
  const framework = node.data?.framework;
  const isTrigger = node.data?.type === 'trigger' || 
    (!node.data?.type && isTriggerNode(framework, node.data?.module || ''));
   
  if (isTrigger) {
    switch (framework) {
      case 'n8n': return '#166534'; // green-800
      case 'activepieces': return '#1e40af'; // blue-800
      case 'script': return '#9a3412'; // orange-800
      case 'bits': return '#115e59'; // teal-800
      default: return '#1f2937'; // gray-800
    }
  }
  
  // Action nodes
  switch (framework) {
    case 'n8n': return '#991b1b'; // red-800
    case 'activepieces': return '#6b21a8'; // purple-800
    case 'script': return '#155e75'; // cyan-800
    case 'bits': return '#065f46'; // emerald-800
    default: return '#1f2937'; // gray-800
  }
};

// Default node types using BaseNode
const defaultNodeTypes: NodeTypes = {
  custom: BaseNode,
  default: BaseNode,
};

// Map background variant string to enum
const backgroundVariantMap: Record<string, BackgroundVariant> = {
  dots: BackgroundVariant.Dots,
  lines: BackgroundVariant.Lines,
  cross: BackgroundVariant.Cross,
};

export interface WorkflowCanvasRef {
  /** Export the canvas to the specified format */
  exportTo: (format: ExportFormat) => Promise<string>;
  /** Get the ReactFlow instance */
  getInstance: () => ReactFlowInstance | null;
  /** Fit view to content */
  fitView: () => void;
}

/**
 * WorkflowCanvas - Reusable component for visualizing workflow diagrams
 * Can be used standalone for viewing or as the base for an editable editor
 */
export const WorkflowCanvas = forwardRef<WorkflowCanvasRef, WorkflowCanvasProps>(
  (
    {
      nodes,
      edges,
      height = '100%',
      width = '100%',
      showControls = true,
      showMinimap = false,
      showActionButtons = true,
      backgroundVariant = 'dots',
      backgroundColor = '#0f172a',
      fitView = true,
      interactive = true,
      className = '',
      onNodeClick,
      onNodesChange,
      onAutoLayout,
      nodeTypes: customNodeTypes,
      rawYaml,
      editable = false,
      onEdgesChange,
      onConnect,
      onEdgesDelete,
      children,
      habitCode,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showYamlModal, setShowYamlModal] = useState(false);
    const [showCodeModal, setShowCodeModal] = useState(false);

    // Listen for fullscreen changes
    useEffect(() => {
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      };
    }, []);

    // Auto-layout nodes after timeout if they have no positions
    // This allows nodes to render first so we can get their real dimensions
    const autoLayoutAppliedRef = useRef(false);
    useEffect(() => {
      // Only run once and only if onNodesChange is provided (to apply layout)
      if (!onNodesChange || autoLayoutAppliedRef.current) return;
      
      // Check if nodes need auto-layout:
      // - Any node is missing position entirely
      // - Any node has undefined/null x or y
      // - All nodes are at origin (0,0)
      const needsLayout = nodes.length > 0 && (
        nodes.some(n => !n.position || n.position.x === undefined || n.position.y === undefined) ||
        nodes.every(n => n.position && n.position.x === 0 && n.position.y === 0)
      );
      if (!needsLayout) {
        autoLayoutAppliedRef.current = true;
        return;
      }

      // Wait for nodes to render and get measured, then apply auto-layout
      const timeoutId = setTimeout(() => {
        if (!autoLayoutAppliedRef.current && reactFlowInstance.current) {
          autoLayoutAppliedRef.current = true;
          
          // Get nodes with actual dimensions from ReactFlow
          const nodesWithDimensions = reactFlowInstance.current.getNodes() as WorkflowNode[];
          const layoutedNodes = applyDagreLayout(nodesWithDimensions, edges);
          
          // Create position change events for each node
          const changes = layoutedNodes.map(node => ({
            id: node.id,
            type: 'position' as const,
            position: node.position,
          }));
          
          onNodesChange(changes);
          
          // Fit view after layout
          setTimeout(() => reactFlowInstance.current?.fitView(), 50);
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }, [nodes, edges, onNodesChange]);

    // Toggle fullscreen
    const toggleFullscreen = useCallback(() => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.error('Failed to enter fullscreen:', err);
        });
      } else {
        document.exitFullscreen().catch((err) => {
          console.error('Failed to exit fullscreen:', err);
        });
      }
    }, []);

    // Fit view handler
    const handleFitView = useCallback(() => {
      if (reactFlowInstance.current) {
        reactFlowInstance.current.fitView();
      }
    }, []);
    const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

    // Merge custom node types with defaults - memoized to prevent re-renders
    const nodeTypes = useMemo(() => {
      return customNodeTypes 
        ? { ...defaultNodeTypes, ...customNodeTypes }
        : defaultNodeTypes;
    }, [customNodeTypes]);

    // Handle node click
    const handleNodeClick = useCallback(
      (_event: React.MouseEvent, node: WorkflowNode) => {
        if (onNodeClick) {
          onNodeClick(node);
        }
      },
      [onNodeClick]
    );

    // Export functionality
    const exportTo = useCallback(
      async (format: ExportFormat): Promise<string> => {
        if (!containerRef.current) {
          throw new Error('Container not available for export');
        }

        const flowElement = containerRef.current.querySelector('.react-flow');
        if (!(flowElement instanceof HTMLElement)) {
          throw new Error('ReactFlow element not found');
        }

        const cleanup = prepareForExport(flowElement);

        try {
          const result = await exportElement(flowElement, {
            format,
            backgroundColor,
          });
          return result;
        } finally {
          cleanup();
        }
      },
      [backgroundColor]
    );

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        exportTo,
        getInstance: () => reactFlowInstance.current,
        fitView: () => {
          if (reactFlowInstance.current) {
            reactFlowInstance.current.fitView();
          }
        },
      }),
      [exportTo]
    );

    const containerStyle = {
      height: typeof height === 'number' ? `${height}px` : height,
      width: typeof width === 'number' ? `${width}px` : width,
      backgroundColor,
    };

    // Handle edge deletion
    const handleEdgesDelete = useCallback(
      (deletedEdges: Edge[]) => {
        if (onEdgesDelete) {
          onEdgesDelete(deletedEdges as WorkflowEdge[]);
        }
      },
      [onEdgesDelete]
    );

    return (
      <div
        ref={containerRef}
        className={`workflow-canvas relative ${className}`}
        style={containerStyle}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          onNodesChange={onNodesChange}
          onEdgesChange={editable ? onEdgesChange : undefined}
          onConnect={editable ? onConnect : undefined}
          onEdgesDelete={editable ? handleEdgesDelete : undefined}
          onInit={(instance) => {
            reactFlowInstance.current = instance;
          }}
          fitView={fitView}
          minZoom={0.1}
          maxZoom={2}
          nodesDraggable={interactive}
          nodesConnectable={editable}
          elementsSelectable={interactive}
          panOnDrag={interactive}
          zoomOnScroll={interactive}
          zoomOnPinch={interactive}
          zoomOnDoubleClick={interactive}
          proOptions={{ hideAttribution: true }}
          style={{ background: backgroundColor }}
        >
          {backgroundVariant !== 'none' && (
            <Background
              variant={backgroundVariantMap[backgroundVariant] || BackgroundVariant.Dots}
              gap={12}
              size={1}
              color="#334155"
            />
          )}
          
          {showControls && (
            <Controls 
              className="!bg-slate-800 !border-slate-700 !shadow-lg [&>button]:!bg-slate-700 [&>button]:!border-slate-600 [&>button]:!text-slate-300 [&>button:hover]:!bg-slate-600" 
            />
          )}
          
          {showMinimap && (
            <MiniMap
              nodeStrokeColor="#000000"
              nodeColor={(node) => getMinimapNodeColor(node as WorkflowNode)}
              nodeBorderRadius={4}
              maskColor="rgba(0, 0, 0, 0.8)"
            />
          )}
          
          {/* Custom children (e.g., Panel components) */}
          {children}
        </ReactFlow>
        
        {/* Action buttons - bottom right */}
        {showActionButtons && (
          <div className="absolute right-3 z-50 flex gap-2 code-button" style={{bottom: "20px"}}>
            {rawYaml && (
              <button
                onClick={() => setShowYamlModal(true)}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors shadow-lg"
                title="View YAML code"
              >
                <Code size={20} />
              </button>
            )}
            {habitCode && (
              <button
                onClick={() => setShowCodeModal(true)}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors shadow-lg"
                title="View habit as code"
              >
                <Braces size={20} />
              </button>
            )}
            {onAutoLayout && (
              <button
                onClick={onAutoLayout}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors shadow-lg"
                title="Auto-arrange nodes"
              >
                <LayoutGrid size={20} />
              </button>
            )}
            <button
              onClick={handleFitView}
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors shadow-lg"
              title="Fit to view"
            >
              <Focus size={20} />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors shadow-lg"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        )}

        {/* YAML Code Modal */}
        {showYamlModal && rawYaml && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowYamlModal(false)}
          >
            <div 
              className="relative w-full max-w-3xl max-h-[80vh] m-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
                <h3 className="text-sm font-medium text-slate-200">Habit YAML</h3>
                <button
                  onClick={() => setShowYamlModal(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-auto max-h-[calc(80vh-52px)]">
                <pre className="p-4 text-sm text-slate-300 font-mono whitespace-pre overflow-x-auto">
                  <code>{rawYaml}</code>
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Habit Code Modal */}
        {showCodeModal && habitCode && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCodeModal(false)}
          >
            <div 
              className="relative w-full max-w-3xl max-h-[80vh] m-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
                <h3 className="text-sm font-medium text-slate-200">Habit YAML</h3>
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-auto max-h-[calc(80vh-52px)]">
                <pre className="p-4 text-sm text-slate-300 font-mono whitespace-pre overflow-x-auto">
                  <code>{habitCode}</code>
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

WorkflowCanvas.displayName = 'WorkflowCanvas';
export default WorkflowCanvas;
