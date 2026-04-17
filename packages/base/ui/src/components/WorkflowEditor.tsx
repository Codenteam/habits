import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Node,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  Panel,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import yaml from 'js-yaml';

import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setNodes, setEdges, addNode, setSelectedNode, selectNodes, selectEdges, selectSelectedNode, selectExportedWorkflow, selectAllExportedHabits, selectActiveHabitDescription, setHabitDescription } from '../store/slices/workflowSlice';
import { setFrontendHtml } from '../store/slices/uiSlice';
import CustomNode from './CustomNode';
import LeftSidebar from './LeftSidebar';
import NodeConfigPanel from './NodeConfigPanel';
import Toolbar from './Toolbar';
import { NodeFactory } from '../lib/NodeFactory';
import { FrontendBuilderVanilla } from '@ha-bits/frontend-builder';
import { WorkflowCanvas, applyDagreLayout, WorkflowCanvasRef, WorkflowNode } from '@ha-bits/workflow-canvas';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

export default function WorkflowEditor() {
  const dispatch = useAppDispatch();
  const storeNodes = useAppSelector(selectNodes);
  const storeEdges = useAppSelector(selectEdges);
  const selectedNode = useAppSelector(selectSelectedNode);
  const viewMode = useAppSelector(state => state.ui.viewMode);
  const frontendHtml = useAppSelector(state => state.ui.frontendHtml);
  const habitDescription = useAppSelector(selectActiveHabitDescription);
  const [nodes, setNodesState, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdgesState, onEdgesChange] = useEdgesState(storeEdges);
  const canvasRef = useRef<WorkflowCanvasRef>(null);
  
  // Description editing state
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(habitDescription);
  
  // Sync edited description when habit changes
  useEffect(() => {
    setEditedDescription(habitDescription);
  }, [habitDescription]);
  
  // Get habit JSON for WorkflowCanvas code view (active habit only)
  const habitJson = useAppSelector(selectExportedWorkflow);
  
  // Get all habits for FrontendBuilder AI generation
  const allHabits = useAppSelector(selectAllExportedHabits);

  // Handle saving frontend HTML
  const handleSaveFrontendHtml = useCallback((html: string) => {
    dispatch(setFrontendHtml(html));
  }, [dispatch]);
  
  // Handle saving habit description
  const handleSaveDescription = useCallback(() => {
    dispatch(setHabitDescription(editedDescription));
    setIsEditingDescription(false);
  }, [dispatch, editedDescription]);
  
  const handleCancelEditDescription = useCallback(() => {
    setEditedDescription(habitDescription);
    setIsEditingDescription(false);
  }, [habitDescription]);

  // Sync store changes to React Flow
  useEffect(() => {
    setNodesState(storeNodes);
  }, [storeNodes, setNodesState]);

  useEffect(() => {
    setEdgesState(storeEdges);
  }, [storeEdges, setEdgesState]);

  // Sync with store
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      // Only update store for position changes, not for selection or drag
      const positionChanges = changes.filter((c: any) => c.type === 'position' && c.dragging === false);
      if (positionChanges.length > 0) {
        const currentNodes = nodes.map((node) => {
          const change = positionChanges.find((c: any) => c.id === node.id);
          if (change && change.position) {
            return { ...node, position: change.position };
          }
          return node;
        });
        dispatch(setNodes(currentNodes));
      }
    },
    [nodes, onNodesChange, dispatch]
  );

  const handleEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      const deletedIds = new Set(deletedEdges.map(e => e.id));
      const updatedEdges = storeEdges.filter((edge) => !deletedIds.has(edge.id));
      dispatch(setEdges(updatedEdges));
    },
    [storeEdges, dispatch]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
      // Don't handle removes here - let onEdgesDelete handle it
      const hasRemoveChanges = changes.some((c: any) => c.type === 'remove');
      if (!hasRemoveChanges) {
        // Only dispatch for non-remove changes if needed
      }
    },
    [onEdgesChange]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      // Create edge with custom ID format: sourceId-targetId
      const edgeWithId: Edge = {
        id: `${connection.source}__${connection.target}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      };
      const newEdges = addEdge(edgeWithId, edges);
      dispatch(setEdges(newEdges));
    },
    [edges, dispatch]
  );

  const onNodeClick = useCallback(
    (node: Node) => {
      dispatch(setSelectedNode(node));
    },
    [dispatch]
  );

  // Handle auto-layout (re-arrange nodes using dagre with actual dimensions)
  const handleAutoLayout = useCallback(() => {
    // Get nodes with actual dimensions from ReactFlow instance if available
    const instance = canvasRef.current?.getInstance();
    const nodesWithDimensions = instance?.getNodes() as WorkflowNode[] | undefined;
    
    // Merge actual dimensions into nodes
    const mergedNodes = nodes.map(node => {
      const nodeWithDims = nodesWithDimensions?.find(n => n.id === node.id);
      if (nodeWithDims?.width && nodeWithDims?.height) {
        return { ...node, width: nodeWithDims.width, height: nodeWithDims.height };
      }
      return node;
    });
    
    const layoutedNodes = applyDagreLayout(mergedNodes, edges);
    setNodesState(layoutedNodes);
    dispatch(setNodes(layoutedNodes));
  }, [nodes, edges, setNodesState, dispatch]);

  const handleAddNode = useCallback(
    (template: { framework: 'script' | 'bits'; module: string; label: string }) => {
      const instance = canvasRef.current?.getInstance();
      const position = instance
        ? instance.screenToFlowPosition({
            x: window.innerWidth / 2 - 100,
            y: window.innerHeight / 2 - 50,
          })
        : { x: 250, y: 100 };

      // Create node using NodeFactory for better type safety and consistency
      const nodeDTO = NodeFactory.fromTemplate({
        framework: template.framework,
        module: template.module,
        label: template.label,
        position,
      });

      // Convert to ReactFlow format
      const newNode = nodeDTO.toReactFlowNode();
      dispatch(addNode(newNode));
      dispatch(setSelectedNode(null));
    },
    [dispatch]
  );

  return (
    <div className="flex flex-col h-screen">
      <Toolbar />
      
      {viewMode === 'backend' ? (
        /* Backend Mode - Workflow Editor */
        <div className="flex flex-1 overflow-hidden">
          <LeftSidebar onAddNode={handleAddNode} />
          
          <div className="flex-1 relative bg-slate-900 workflow-canvas">
            <WorkflowCanvas
              ref={canvasRef}
              nodes={nodes}
              edges={edges}
              editable={true}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onEdgesDelete={handleEdgesDelete}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onAutoLayout={handleAutoLayout}
              nodeTypes={nodeTypes}
              showControls={true}
              showActionButtons={true}
              fitView={true}
              interactive={true}
              habitCode={yaml.dump(habitJson, { indent: 2, lineWidth: -1 })}
            >
              <Panel position="top-right" className="bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-700">
                <div className="text-xs text-slate-400 space-y-1">
                  <div>💡 Drag nodes from the palette</div>
                  <div>🔗 Connect nodes by dragging handles</div>
                  <div>⚙️ Click a node to configure it</div>
                </div>
              </Panel>
              <Panel position="top-left" className="bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-700 max-w-lg">
                {isEditingDescription ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="w-full bg-slate-700 text-slate-200 text-xs rounded p-2 border border-slate-600 focus:border-blue-500 focus:outline-none resize-none"
                      rows={3}
                      placeholder="Enter habit description..."
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={handleCancelEditDescription}
                        className="text-xs px-2 py-1 rounded bg-slate-600 text-slate-300 hover:bg-slate-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveDescription}
                        className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : habitDescription ? (
                  <div className="flex items-start gap-2">
                    <p className="text-xs text-slate-300 flex-1">{habitDescription}</p>
                    <button
                      onClick={() => setIsEditingDescription(true)}
                      className="text-slate-400 hover:text-slate-200 shrink-0"
                      title="Edit description"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingDescription(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Habit Description
                  </button>
                )}
              </Panel>
            </WorkflowCanvas>
          </div>

          {selectedNode && (
            <NodeConfigPanel
              key={selectedNode.id}
              node={selectedNode}
            />
          )}
        </div>
      ) : (
        /* Frontend Mode - FrontendBuilder with toggle */
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
          {/* FrontendBuilder */}
          <div className="flex-1 overflow-hidden">
            <FrontendBuilderVanilla
              initialHtml={frontendHtml}
              onChange={handleSaveFrontendHtml}
              height="100%"
              habitData={allHabits}
            />
          </div>
        </div>
      )}
    </div>
  );
}
