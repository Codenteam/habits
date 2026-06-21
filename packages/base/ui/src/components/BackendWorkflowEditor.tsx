import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
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
import {
  setNodes,
  setEdges,
  addNode,
  deleteNode,
  setSelectedNode,
  selectNodes,
  selectEdges,
  selectSelectedNode,
  selectExportedWorkflow,
  selectActiveHabitDescription,
  setHabitDescription,
} from '../store/slices/workflowSlice';
import CustomNode from './CustomNode';
import LeftSidebar from './LeftSidebar';
import { NodeFactory } from '../lib/NodeFactory';
import { WorkflowCanvas, applyDagreLayout, WorkflowCanvasRef, WorkflowNode } from '@ha-bits/workflow-canvas';

const NodeConfigPanel = lazy(() => import('./NodeConfigPanel'));

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

export default function BackendWorkflowEditor() {
  const dispatch = useAppDispatch();
  const storeNodes = useAppSelector(selectNodes);
  const storeEdges = useAppSelector(selectEdges);
  const selectedNode = useAppSelector(selectSelectedNode);
  const habitDescription = useAppSelector(selectActiveHabitDescription);
  const [nodes, setNodesState, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdgesState, onEdgesChange] = useEdgesState(storeEdges);
  const canvasRef = useRef<WorkflowCanvasRef>(null);

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(habitDescription);

  useEffect(() => {
    setEditedDescription(habitDescription);
  }, [habitDescription]);

  const habitJson = useAppSelector(selectExportedWorkflow);

  const handleSaveDescription = useCallback(() => {
    dispatch(setHabitDescription(editedDescription));
    setIsEditingDescription(false);
  }, [dispatch, editedDescription]);

  const handleCancelEditDescription = useCallback(() => {
    setEditedDescription(habitDescription);
    setIsEditingDescription(false);
  }, [habitDescription]);

  useEffect(() => {
    setNodesState(storeNodes);
  }, [storeNodes, setNodesState]);

  useEffect(() => {
    setEdgesState((prev) =>
      storeEdges.map((se) => ({ ...se, selected: prev.find((e) => e.id === se.id)?.selected ?? false }))
    );
  }, [storeEdges, setEdgesState]);

  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      const removeChanges = changes.filter((c: any) => c.type === 'remove');
      removeChanges.forEach((c: any) => dispatch(deleteNode(c.id)));
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
      const updatedEdges = storeEdges.filter(
        (edge) =>
          !deletedEdges.some((deleted) => {
            if (deleted.id && edge.id) {
              return deleted.id === edge.id;
            }
            return (
              deleted.source === edge.source &&
              deleted.target === edge.target &&
              deleted.sourceHandle === edge.sourceHandle &&
              deleted.targetHandle === edge.targetHandle
            );
          })
      );
      dispatch(setEdges(updatedEdges));
    },
    [storeEdges, dispatch]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
      const removeChanges = changes.filter((c: any) => c.type === 'remove');
      if (removeChanges.length > 0) {
        const removedIds = new Set(removeChanges.map((c: any) => c.id).filter(Boolean));
        if (removedIds.size > 0) {
          dispatch(setEdges(storeEdges.filter((e) => (e.id ? !removedIds.has(e.id) : true))));
        }
      }
    },
    [onEdgesChange, dispatch, storeEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const src = connection.source!;
      const tgt = connection.target!;
      const sh = connection.sourceHandle;
      const th = connection.targetHandle;
      const id = `${src}-_-${tgt}-_-${sh ?? 'main'}-_-${th ?? 'main'}`;
      const edgeWithId: Edge = {
        id,
        source: src,
        target: tgt,
        sourceHandle: sh,
        targetHandle: th,
      };
      const newEdges = addEdge(edgeWithId, edges);
      dispatch(setEdges(newEdges));
    },
    [edges, dispatch]
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, clickedEdge: Edge) => {
      setEdgesState((prev) => prev.map((e) => ({ ...e, selected: e.id === clickedEdge.id })));
    },
    [setEdgesState]
  );

  const onNodeClick = useCallback(
    (node: Node) => {
      dispatch(setSelectedNode(node));
    },
    [dispatch]
  );

  const handleAutoLayout = useCallback(() => {
    const instance = canvasRef.current?.getInstance();
    const nodesWithDimensions = instance?.getNodes() as WorkflowNode[] | undefined;
    const mergedNodes = nodes.map((node) => {
      const nodeWithDims = nodesWithDimensions?.find((n) => n.id === node.id);
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
      const staggerOffset = nodes.length * 50;
      const position = instance
        ? instance.screenToFlowPosition({
            x: window.innerWidth / 2 - 100 + staggerOffset,
            y: window.innerHeight / 2 - 50 + staggerOffset,
          })
        : { x: 250 + staggerOffset, y: 100 + staggerOffset };

      const nodeDTO = NodeFactory.fromTemplate({
        framework: template.framework,
        module: template.module,
        label: template.label,
        position,
      });

      const nodeType =
        template.module
          .replace(/^@[^/]+\/bit-/, '')
          .replace(/^@[^/]+\//, '')
          .replace(/^bit-/, '')
          .replace(/^script-/, '') || 'node';

      const existingCount = nodes.filter((n) => n.id.startsWith(`${nodeType}-`)).length;
      const nodeId = `${nodeType}-${existingCount + 1}`;
      const newNode = { ...nodeDTO.toReactFlowNode(), id: nodeId };
      dispatch(addNode(newNode));
      dispatch(setSelectedNode(null));
    },
    [dispatch, nodes]
  );

  return (
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
          onEdgeClick={onEdgeClick}
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
        <Suspense
          fallback={
            <div className="w-80 shrink-0 border-l border-slate-700 bg-slate-900 flex items-center justify-center text-slate-400 text-sm">
              Loading panel…
            </div>
          }
        >
          <NodeConfigPanel key={selectedNode.id} node={selectedNode} />
        </Suspense>
      )}
    </div>
  );
}
