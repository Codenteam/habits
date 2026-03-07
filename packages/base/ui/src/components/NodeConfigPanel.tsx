import React, { useEffect, useState } from 'react';
import { X, Trash2, AlertCircle, Loader, Info, PlayCircle, Zap, ChevronLeft, Key } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { 
  updateNode, deleteNode, updateNodeConfig, setModuleSchema, setModuleAvailability, 
  setLoadingState, setError, clearError, setSelectedNode, selectNodeConfig,
  setNodeSchema, setNodeLoadingSchema, resetNodeFormState, initializeNodeFormState,
  selectSelectedNodeFormState
} from '../store/slices/workflowSlice';
import { setNodeConfigPanelOpen, setShowDownloadPrompt } from '../store/slices/uiSlice';
import { api } from '../lib/api';
import DynamicForm from './DynamicForm';
import ModuleDownloadPrompt from './ModuleDownloadPrompt';
import ScriptNodeEditor from './ScriptNodeEditor';
import ScriptParamsEditor from './ScriptParamsEditor';
import AuthField from './AuthField';
import EnvVariablesPopover from './EnvVariablesPopover';
import RichTextArea from './RichTextArea';
import type { CanvasNode } from '@ha-bits/core';
import { FormBuilder } from './FormBuilder';

interface NodeConfigPanelProps {
  node: CanvasNode;
}

// Branch condition type (must be defined before generateBranchOutputs)
interface BranchCondition {
  label?: string;
  value1: string;
  operator: string;
  value2: string;
  output?: string;
}

// Helper function to generate output handles from branch conditions
// Defined outside component to avoid recreation on each render
function generateBranchOutputs(branches: BranchCondition[], includeElse: boolean = true): string[] {
  if (!Array.isArray(branches) || branches.length === 0) {
    // Default outputs for if/switch nodes
    return includeElse ? ['branch_0', 'else'] : ['branch_0'];
  }
  
  // Generate outputs for all configured branches regardless of mode
  // The mode only affects runtime behavior, not the available output handles
  const outputs: string[] = [];
  
  for (let i = 0; i < branches.length; i++) {
    // Use custom label if provided, otherwise branch_N
    const branch = branches[i];
    const label = branch?.label || `branch_${i}`;
    outputs.push(label);
  }
  
  // Add else branch if enabled
  if (includeElse) {
    outputs.push('else');
  }
  
  return outputs;
}


export default function NodeConfigPanel({ node }: NodeConfigPanelProps) {
  const dispatch = useAppDispatch();
  const nodeConfig = useAppSelector(selectNodeConfig);
  const nodeFormState = useAppSelector(selectSelectedNodeFormState);
  const moduleSchemas = useAppSelector(state => state.workflow.moduleSchemas);
  const moduleAvailability = useAppSelector(state => state.workflow.moduleAvailability);
  const loadingStates = useAppSelector(state => state.workflow.loadingStates);
  const errors = useAppSelector(state => state.workflow.errors);
  const showDownloadPrompt = useAppSelector(state => state.ui.showDownloadPrompt);

  const moduleKey = `${node.data.framework}:${nodeConfig?.module || ''}`;
  const moduleAvailable = moduleAvailability[moduleKey] ?? null;
  const moduleSchema = moduleSchemas[moduleKey] ?? null;
  const isLoadingSchema = nodeFormState?.loadingSchema ?? loadingStates[moduleKey] ?? false;
  const error = errors[moduleKey] ?? '';

  // Check if this is a script node (doesn't need module availability checks)
  const isScriptNode = node.data.framework === 'script';
  const isBitsNode = node.data.framework === 'bits';
  
  // State for info popover
  const [showInfoPopover, setShowInfoPopover] = useState(false);
  
  // State for env variables popover
  const [showEnvPopover, setShowEnvPopover] = useState(false);
  
  // Get current action/trigger name for bits nodes
  const currentAction = node.data.operation || node.data.action || node.data.trigger || '';
  const currentActionConfig = (moduleSchema as any)?.actions?.[currentAction] || (moduleSchema as any)?.triggers?.[currentAction];
  const actionDisplayName = currentActionConfig?.displayName || currentAction;

  // Track previous node and module to detect actual changes
  const prevNodeIdRef = React.useRef<string | null>(null);
  const prevModuleRef = React.useRef<string | null>(null);
  const currentModule = nodeConfig?.module || null;

  // Check if current module is a branching module (bit-if or similar)
  const isBranchingModule = currentModule?.includes('bit-if') || 
                            currentModule?.includes('bit-switch') ||
                            currentAction === 'branch';

  // Sync outputs when node is a branching module and has conditions
  useEffect(() => {
    if (!isBranchingModule) return;
    
    const branches = nodeConfig?.params?.branches || node.data.params?.branches || [];
    const includeElse = nodeConfig?.params?.includeElse !== false && node.data.params?.includeElse !== false;
    
    const newOutputs = generateBranchOutputs(branches, includeElse);
    const currentOutputs = node.data.outputs || ['main'];
    
    // Only update if outputs actually changed
    if (JSON.stringify(newOutputs) !== JSON.stringify(currentOutputs)) {
      dispatch(updateNode({
        nodeId: node.id,
        data: { outputs: newOutputs }
      }));
    }
  }, [isBranchingModule, nodeConfig?.params?.branches, nodeConfig?.params?.includeElse, node.id, node.data.params, node.data.outputs, dispatch]);
  
  useEffect(() => {
    const nodeChanged = prevNodeIdRef.current !== node.id;
    const moduleChanged = prevModuleRef.current !== currentModule;
    
    // Update refs
    prevNodeIdRef.current = node.id;
    prevModuleRef.current = currentModule;
    
    // Always initialize form state for this node (won't overwrite existing state)
    dispatch(initializeNodeFormState(node.id));
    
    // Only reset form state if the MODULE changed on the same node (not just node reselection)
    // This preserves user-entered values when deselecting and reselecting a node
    if (!nodeChanged && moduleChanged && currentModule) {
      dispatch(resetNodeFormState(node.id));
    }
    
    // Check module availability when node or module changes
    // Skip for script nodes - they don't need availability checks
    // Bits nodes DO need schema loading to get available actions/triggers
    if ((nodeChanged || moduleChanged) && !isScriptNode) {
      checkModuleAvailability();
    }
  }, [node.id, node.data.framework, currentModule, dispatch, isScriptNode]);

  const checkModuleAvailability = async () => {
    if (!nodeConfig?.module || !node.data.framework) return;

    try {
      dispatch(clearError(moduleKey));
      dispatch(setLoadingState({ key: moduleKey, loading: true }));
      
      const result = await api.checkModuleAvailability(node.data.framework, nodeConfig.module);
      dispatch(setModuleAvailability({ moduleKey, available: result.available }));

      if (result.available) {
        await loadModuleSchema();
      }
    } catch (err: any) {
      dispatch(setError({ key: moduleKey, error: 'Failed to check module availability' }));
      dispatch(setModuleAvailability({ moduleKey, available: false }));
    } finally {
      dispatch(setLoadingState({ key: moduleKey, loading: false }));
    }
  };

  const loadModuleSchema = async () => {
    if (!nodeConfig?.module || !node.data.framework) return;

    try {
      dispatch(setNodeLoadingSchema({ nodeId: node.id, loading: true }));
      const result = await api.getModuleSchema(node.data.framework, nodeConfig.module);
      if (result.schema) {
        dispatch(setModuleSchema({ moduleKey, schema: result.schema }));
        // Also set schema on the node's form state
        dispatch(setNodeSchema({ nodeId: node.id, schema: result.schema }));
      } else {
        dispatch(setError({ key: moduleKey, error: result.error || 'Failed to load module schema' }));
      }
    } catch (err: any) {
      dispatch(setError({ key: moduleKey, error: 'Failed to load module schema' }));
    } finally {
      dispatch(setNodeLoadingSchema({ nodeId: node.id, loading: false }));
    }
  };

  const handleModuleInstalled = () => {
    dispatch(setShowDownloadPrompt(false));
    checkModuleAvailability();
  };

  const handleClose = () => {
    dispatch(setNodeConfigPanelOpen(false));
    dispatch(setSelectedNode(null));
  };

  const handleDelete = () => {
    dispatch(deleteNode(node.id));
    handleClose();
  };

  const handleParamsChange = (newParams: Record<string, any>) => {
    dispatch(updateNodeConfig({ params: newParams }));
    
    // Auto-save: immediately update the node with new params
    const updateData: Record<string, any> = { params: newParams };
    
    // If this is a branching module, also update the node's outputs
    if (isBranchingModule) {
      const branches = newParams.branches || [];
      const includeElse = newParams.includeElse !== false; // Default true
      updateData.outputs = generateBranchOutputs(branches, includeElse);
    }
    
    dispatch(updateNode({
      nodeId: node.id,
      data: updateData
    }));
  };

  const handleCredentialsChange = (newCredentials: Record<string, any>) => {
    dispatch(updateNodeConfig({ credentials: newCredentials }));
    
    // Auto-save: immediately update the node with new credentials
    dispatch(updateNode({
      nodeId: node.id,
      data: { credentials: newCredentials }
    }));
  };

  const handleShowDownloadPrompt = () => {
    dispatch(setShowDownloadPrompt(true));
  }

  const handleFormSubmit = async (formData: any) => {
  console.log('Submitted:', formData);

  const { _type, _action, _piece, _module, ...data } = formData;

  if (!nodeConfig) return;

  const nodeData: any = {
    ...nodeConfig,
    type: _type,
    piece: _piece,
    params: data,
  };

  if (_type === 'trigger') {
    nodeData.trigger = _action;
  } else {
    nodeData.action = _action;
  }

  dispatch(
    updateNode({
      nodeId: node.id,
      data: nodeData,
    })
  );

  dispatch(setNodeConfigPanelOpen(false));
  dispatch(setSelectedNode(null));
};

  // Handle action/trigger change for bits nodes - reset params on change
  const handleActionOperationChange = (newOperation: string) => {
    dispatch(updateNode({ 
      nodeId: node.id, 
      data: { 
        ...node.data, 
        operation: newOperation,
        params: {} // Reset params when changing action
      } 
    }));
    dispatch(updateNodeConfig({ 
      ...nodeConfig,
      params: {} // Reset local params too
    }));
  };

  return (
    <>
      <div className="fixed right-0 top-0 h-full w-96 bg-slate-800 shadow-2xl border-l border-slate-700 z-50 overflow-y-auto">
        {/* Header with Module Name -> Action and Info Icon */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Module Name -> Action Title */}
              <h3 className="text-lg font-semibold text-white truncate">
                {isBitsNode && moduleSchema ? (
                  <span>
                    {moduleSchema.displayName || nodeConfig?.module}
                    {actionDisplayName && (
                      <span className="text-slate-400 font-normal"> → {actionDisplayName}</span>
                    )}
                  </span>
                ) : (
                  nodeConfig?.label || 'Node Configuration'
                )}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              {/* Info Icon */}
              <div className="relative">
                <button 
                  onClick={() => setShowInfoPopover(!showInfoPopover)} 
                  className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                  title="Node Information"
                >
                  <Info className="w-5 h-5" />
                </button>
                
                {/* Info Popover */}
                {showInfoPopover && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-600 rounded-lg shadow-xl z-20 p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-semibold text-slate-200">Node Details</h4>
                      <button 
                        onClick={() => setShowInfoPopover(false)}
                        className="p-0.5 hover:bg-slate-700 rounded text-slate-500 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Node Label */}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Node Label</label>
                      <div className="text-sm text-slate-200">{nodeConfig?.label || 'Unnamed'}</div>
                    </div>
                    
                    {/* Framework */}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Framework</label>
                      <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        node.data.framework === 'n8n' ? 'bg-red-900/50 text-red-400 border border-red-800' : 
                        node.data.framework === 'activepieces' ? 'bg-purple-900/50 text-purple-400 border border-purple-800' :
                        node.data.framework === 'bits' ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-800' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {node.data.framework}
                      </div>
                    </div>
                    
                    {/* Module */}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Module</label>
                      <div className="text-sm text-slate-200">
                        {moduleSchema?.displayName || nodeConfig?.module || 'N/A'}
                      </div>
                    </div>
                    
                    {/* Description */}
                    {moduleSchema?.description && (
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Description</label>
                        <div className="text-sm text-slate-400">{moduleSchema.description}</div>
                      </div>
                    )}
                    
                  </div>
                )}
              </div>
                          <button
              onClick={handleDelete}
              className=" transition-colors p-1 hover:bg-slate-700"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
              {/* Close Button */}
              <button onClick={handleClose} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Back to action selection for Bits Nodes that have an action selected */}
          {isBitsNode && !isLoadingSchema && moduleSchema && currentAction && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <button
                onClick={() => handleActionOperationChange('')}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Change action/trigger
              </button>
            </div>
          )}
        </div>

        {/* Action/Trigger Selection Screen for Bits Nodes without selected action */}
        {isBitsNode && !isLoadingSchema && moduleSchema && !currentAction && (
          <div className="p-4 space-y-6">
            <div className="text-center py-4">
              <p className="text-slate-400">Select an action or trigger to configure this node</p>
            </div>
            
            {/* Triggers Section */}
            {(moduleSchema as any).triggers && Object.keys((moduleSchema as any).triggers).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  Triggers
                </h4>
                <div className="space-y-2">
                  {Object.entries((moduleSchema as any).triggers).map(([key, trigger]: [string, any]) => (
                    <button
                      key={key}
                      onClick={() => handleActionOperationChange(key)}
                      className="w-full text-left p-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-yellow-500/50 hover:bg-slate-800 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-yellow-500/10 text-yellow-400 group-hover:bg-yellow-500/20">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate">
                            {trigger.displayName || key}
                          </div>
                          {trigger.description && (
                            <div className="text-xs text-slate-500 truncate">
                              {trigger.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Actions Section */}
            {moduleSchema.actions && Object.keys(moduleSchema.actions).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-blue-400" />
                  Actions
                </h4>
                <div className="space-y-2">
                  {Object.entries(moduleSchema.actions).map(([key, action]: [string, any]) => (
                    <button
                      key={key}
                      onClick={() => handleActionOperationChange(key)}
                      className="w-full text-left p-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20">
                          <PlayCircle className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate">
                            {action.displayName || key}
                          </div>
                          {action.description && (
                            <div className="text-xs text-slate-500 truncate">
                              {action.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main config panel - only show when NOT a bits node without action, or when bits node has action selected */}
        {(!isBitsNode || isLoadingSchema || !moduleSchema || currentAction) && (
        <>
        <div className="p-4 space-y-4">
              {/* Auth Section for bits nodes with auth */}
              {currentAction && (moduleSchema as any)?.auth && (moduleSchema as any).auth.props && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3 pb-1 border-b border-slate-700">
                    <h4 className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Authentication
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowEnvPopover(true)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Manage Variables
                    </button>
                  </div>
                  {(moduleSchema as any).auth.description && (
                    <p className="text-xs text-slate-500 mb-3">{(moduleSchema as any).auth.description}</p>
                  )}
                  <div className="mb-3 p-2 bg-blue-900/30 border border-blue-800/50 rounded text-xs text-blue-300 flex gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Tip:</span> Use <code className="bg-blue-900/50 px-1 rounded">{'{{habits.env.VAR}}'}</code> to reference environment variables. 
                      This keeps secrets out of your workflow files when exporting or sharing. Also, allows to set different values in different envionrments in case you want to have separate setups (local environment, testing environment, production environment)
                    </div>
                  </div>
                  <div className="space-y-3">
                    {Object.entries((moduleSchema as any).auth.props).map(([propKey, prop]: [string, any]) => {
                      // Derive auth key from module name (e.g., @ha-bits/bit-intersect -> intersect)
                      const moduleName = nodeConfig?.module || '';
                      const authKey = moduleName.replace('@ha-bits/bit-', '').replace('@ha-bits/', '').replace('bit-', '');
                      
                      // Get current value from node credentials
                      const currentValue = nodeConfig?.credentials?.[authKey]?.[propKey] || 
                                           node.data.credentials?.[authKey]?.[propKey] || '';
                      
                      return (
                        <AuthField
                          key={propKey}
                          propKey={propKey}
                          displayName={prop.displayName || propKey}
                          description={prop.description}
                          required={prop.required}
                          type={prop.type}
                          value={currentValue}
                          onChange={(value) => {
                            const newCredentials = {
                              ...nodeConfig?.credentials,
                              [authKey]: {
                                ...(nodeConfig?.credentials?.[authKey] || {}),
                                [propKey]: value,
                              },
                            };
                            handleCredentialsChange(newCredentials);
                          }}
                          placeholder={prop.description || propKey}
                          onManageEnvClick={() => setShowEnvPopover(true)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
          {/* Script Node Configuration */}
          {isScriptNode && (
            <>
              <ScriptNodeEditor
                script={nodeConfig?.params?.script || node.data.content || ''}
                language={nodeConfig?.params?.language || node.data.language || 'deno'}
                onScriptChange={(newValue) => handleParamsChange({
                  ...nodeConfig?.params,
                  script: newValue
                })}
                onLanguageChange={(newLanguage) => handleParamsChange({
                  ...nodeConfig?.params,
                  language: newLanguage
                })}
                height="300px"
              />
              
              <ScriptParamsEditor
                params={nodeConfig?.params || {}}
                onChange={handleParamsChange}
              />
            </>
          )}

          {/* Bits Node Loading State */}
          {isBitsNode && isLoadingSchema && (
            <div className="flex items-center gap-2 p-3 bg-blue-900/30 border border-blue-800 rounded-md">
              <Loader className="w-4 h-4 animate-spin text-blue-400" />
              <span className="text-sm text-blue-300">Loading bits module schema...</span>
            </div>
          )}

          {/* Bits Node Configuration - with schema loaded */}
          {isBitsNode && !isLoadingSchema && moduleSchema && (
            <div className="space-y-4">
              {/* Show selected action props */}
              {currentAction && moduleSchema.actions?.[currentAction]?.props && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-200 mb-3 border-b border-slate-700 pb-1">
                    Action Parameters
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(moduleSchema.actions[currentAction].props).map(([propKey, prop]: [string, any]) => (
                      <div key={propKey}>
                        <label className="block text-sm font-medium mb-1 text-slate-300">
                          {prop.displayName || propKey}
                          {prop.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        {prop.description && (
                          <p className="text-xs text-slate-500 mb-1">{prop.description}</p>
                        )}
                        {(prop.type === 'DROPDOWN' || prop.type === 'STATIC_DROPDOWN') && (prop.options?.options || prop.options) ? (
                          <select
                            value={nodeConfig?.params?.[propKey] || prop.defaultValue || ''}
                            onChange={(e) => handleParamsChange({
                              ...nodeConfig?.params,
                              [propKey]: e.target.value
                            })}
                            className="w-full border p-2 border-slate-600 rounded-md bg-slate-900 text-white focus:border-blue-500 focus:outline-none text-sm"
                          >
                            <option value="">Select...</option>
                            {(prop.options?.options || (Array.isArray(prop.options) ? prop.options : [])).map((opt: any) => (
                              <option key={opt.value || opt} value={opt.value || opt}>
                                {opt.label || opt}
                              </option>
                            ))}
                          </select>
                        ) : prop.type === 'BRANCH_CONDITIONS' ? (
                          <BranchConditionsEditor
                            value={nodeConfig?.params?.[propKey] || prop.defaultValue || []}
                            onChange={(value) => handleParamsChange({
                              ...nodeConfig?.params,
                              [propKey]: value
                            })}
                          />
                        ) : prop.type === 'LONG_TEXT' || prop.type === 'CODE' ? (
                          <RichTextArea
                            defaultValue={nodeConfig?.params?.[propKey] || prop.defaultValue || ''}
                            onChange={(newValue) => handleParamsChange({
                              ...nodeConfig?.params,
                              [propKey]: newValue
                            })}
                            placeholder={prop.description || propKey}
                            minHeight="80px"
                            maxHeight="300px"
                            currentNodeId={node.id}
                            showVariablePicker
                          />
                        ) : prop.type === 'CHECKBOX' ? (
                          <input
                            type="checkbox"
                            checked={nodeConfig?.params?.[propKey] ?? prop.defaultValue ?? false}
                            onChange={(e) => handleParamsChange({
                              ...nodeConfig?.params,
                              [propKey]: e.target.checked
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-600 rounded bg-slate-900"
                          />
                        ) : prop.type === 'NUMBER' ? (
                          <input
                            type="number"
                            value={nodeConfig?.params?.[propKey] || prop.defaultValue || ''}
                            onChange={(e) => handleParamsChange({
                              ...nodeConfig?.params,
                              [propKey]: e.target.value
                            })}
                            className="w-full border p-2 border-slate-600 rounded-md bg-slate-900 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none text-sm"
                            placeholder={prop.description || propKey}
                          />
                        ) : (
                          <RichTextArea
                            defaultValue={nodeConfig?.params?.[propKey] || prop.defaultValue || ''}
                            onChange={(newValue) => handleParamsChange({
                              ...nodeConfig?.params,
                              [propKey]: newValue
                            })}
                            className="w-full border border-slate-600 rounded-md bg-slate-900 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none text-sm"
                            placeholder={prop.description || propKey}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              

            </div>
          )}

          {/* Bits Node Error State */}
          {isBitsNode && !isLoadingSchema && error && (
            <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-800 rounded-md text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Module status - only show for non-script and non-bits nodes */}
          {!isScriptNode && !isBitsNode && isLoadingSchema && (
            <div className="flex items-center gap-2 p-3 bg-blue-900/30 border border-blue-800 rounded-md">
              <Loader className="w-4 h-4 animate-spin text-blue-400" />
              <span className="text-sm text-blue-300">Checking module availability...</span>
            </div>
          )}

          {!isScriptNode && !isBitsNode && error && (
            <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-800 rounded-md text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {!isScriptNode && !isBitsNode && moduleAvailable === false && !isLoadingSchema && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-orange-900/30 border border-orange-800 rounded-md">
                <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm text-orange-300 font-medium">Module not installed</div>
                  <div className="text-sm text-orange-400">
                    Module "{nodeConfig?.module}" is not available locally
                  </div>
                </div>
              </div>
              
              <button
                onClick={() =>{handleShowDownloadPrompt()}}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                <AlertCircle className="w-4 h-4" />
                Install Module
              </button>
            </div>
          )}

          {!isScriptNode && !isBitsNode && moduleAvailable === true && moduleSchema && (
            <div className="space-y-4">
              {/* <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <div className="flex-1">
                  <div className="text-sm text-green-700 font-medium">
                    {moduleSchema.displayName || moduleSchema.name}
                  </div>
                  {moduleSchema.description && (
                    <div className="text-sm text-green-600">
                      {moduleSchema.description}
                    </div>
                  )}
                </div>
              </div> */}

              {/* Dynamic form for module properties */}
              {moduleSchema?.properties && Array.isArray(moduleSchema.properties) && moduleSchema.properties.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-200 mb-3 border-b border-slate-700 pb-1">
                    Module Configuration
                  </h4>
                  <DynamicForm
                    fields={moduleSchema.properties}
                    values={nodeConfig?.params || {}}
                    onChange={handleParamsChange}
                  />
                </div>
              )}

              {/* Dynamic form for credentials */}
              {moduleSchema.credentials && moduleSchema.credentials.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-200 mb-3 border-b border-slate-700 pb-1">
                    Credentials
                  </h4>
                  {moduleSchema.credentials.map((cred) => (
                    <div key={cred.name} className="mb-4">
                      <h5 className="text-sm font-medium text-slate-300 mb-2">{cred.displayName}</h5>
                      {cred.properties && Array.isArray(cred.properties) && cred.properties.length > 0 && (
                        <DynamicForm
                          fields={cred.properties}
                          values={nodeConfig?.credentials?.[cred.name] || {}}
                          onChange={(values) => handleCredentialsChange({
                            ...nodeConfig?.credentials,
                            [cred.name]: values
                          })}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Resources and operations for modules that support them */}
              {moduleSchema.resources && Object.keys(moduleSchema.resources).length > 0 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-300">Resource</label>
                    <select
                      value={nodeConfig?.params.resource || ''}
                      onChange={(e) => handleParamsChange({
                        ...nodeConfig?.params,
                        resource: e.target.value,
                        operation: ''
                      })}
                      className="w-full border p-2 border-slate-600 rounded-md bg-slate-900 text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select resource...</option>
                      {Object.keys(moduleSchema.resources).map((resource) => (
                        <option key={resource} value={resource}>
                          {resource}
                        </option>
                      ))}
                    </select>
                  </div>

                  {nodeConfig?.params.resource && (
                    <div>
                      <label className="block text-sm font-medium mb-1 text-slate-300">Operation</label>
                      <select
                        value={nodeConfig?.params.operation || ''}
                        onChange={(e) => handleParamsChange({
                          ...nodeConfig?.params,
                          operation: e.target.value
                        })}
                        className="w-full border p-2 border-slate-600 rounded-md bg-slate-900 text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Select operation...</option>
                        {moduleSchema.resources[nodeConfig?.params.resource]?.map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
        {/* FormBuilder for non-bits nodes only - bits nodes use manual property rendering above */}
        { moduleSchema && !isBitsNode && (
          <FormBuilder
            module={moduleSchema as any}
            onSubmit={handleFormSubmit}
            initialValues={{
              auth: (moduleSchema as any).auth,
            }}
            showAuth={true}
          />
        )}
        </>
        )}
      </div>

      {/* Module download prompt */}
      
      {showDownloadPrompt  && (
        <ModuleDownloadPrompt
          framework={node.data.framework}
          moduleName={nodeConfig?.module || ''}
          onModuleInstalled={handleModuleInstalled}
          onClose={() => dispatch(setShowDownloadPrompt(false))}
        />
      )}

      {/* Environment variables popover */}
      <EnvVariablesPopover
        isOpen={showEnvPopover}
        onClose={() => setShowEnvPopover(false)}
      />

    </>
  );
}

// Branch Conditions Editor for If/Conditional bit
// Note: BranchCondition interface is defined at the top of the file

const BRANCH_OPERATORS = [
  { label: 'Equals (==)', value: 'equals' },
  { label: 'Not Equals (!=)', value: 'notEquals' },
  { label: 'Greater Than (>)', value: 'greaterThan' },
  { label: 'Greater Than or Equal (>=)', value: 'greaterThanOrEqual' },
  { label: 'Less Than (<)', value: 'lessThan' },
  { label: 'Less Than or Equal (<=)', value: 'lessThanOrEqual' },
  { label: 'Contains', value: 'contains' },
  { label: 'Does Not Contain', value: 'notContains' },
  { label: 'Starts With', value: 'startsWith' },
  { label: 'Ends With', value: 'endsWith' },
  { label: 'Is Empty', value: 'isEmpty' },
  { label: 'Is Not Empty', value: 'isNotEmpty' },
  { label: 'Is Null/Undefined', value: 'isNull' },
  { label: 'Is Not Null/Undefined', value: 'isNotNull' },
  { label: 'Regex Match', value: 'regex' },
];

function BranchConditionsEditor({ value, onChange }: { value: BranchCondition[]; onChange: (value: BranchCondition[]) => void }) {
  const conditions = Array.isArray(value) ? value : [];

  const addCondition = () => {
    onChange([...conditions, { value1: '', operator: 'equals', value2: '', output: '' }]);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, field: keyof BranchCondition, fieldValue: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: fieldValue };
    onChange(newConditions);
  };

  const getConditionLabel = (index: number) => {
    if (index === 0) return 'If';
    return 'Else If';
  };

  const needsValue2 = (operator: string) => {
    return !['isEmpty', 'isNotEmpty', 'isNull', 'isNotNull'].includes(operator);
  };

  return (
    <div className="space-y-3">
      {/* Condition count */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">
          {conditions.length} condition{conditions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {conditions.map((condition, index) => (
        <div key={index} className="border border-slate-600 rounded-md p-3 bg-slate-800/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-400">{getConditionLabel(index)}</span>
            {conditions.length > 1 && (
              <button
                type="button"
                onClick={() => removeCondition(index)}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                Remove
              </button>
            )}
          </div>

          {/* Value 1, Operator, Value 2 - inline */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">Value 1</label>
              <input
                type="text"
                value={condition.value1 || ''}
                onChange={(e) => updateCondition(index, 'value1', e.target.value)}
                placeholder="First value"
                className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-slate-200 placeholder-slate-500 text-sm"
              />
            </div>
            <div className="w-32">
              <label className="block text-xs text-slate-400 mb-1">Operator</label>
              <select
                value={condition.operator || 'equals'}
                onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                className="w-full px-1 py-1 bg-slate-900 border border-slate-600 rounded text-slate-200 text-sm"
              >
                {BRANCH_OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </div>
            {needsValue2(condition.operator) && (
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Value 2</label>
                <input
                  type="text"
                  value={condition.value2 || ''}
                  onChange={(e) => updateCondition(index, 'value2', e.target.value)}
                  placeholder="Second value"
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-slate-200 placeholder-slate-500 text-sm"
                />
              </div>
            )}
          </div>

          {/* Output and Branch Label - inline */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">Output (optional)</label>
              <input
                type="text"
                value={condition.output || ''}
                onChange={(e) => updateCondition(index, 'output', e.target.value)}
                placeholder="Return value when matched"
                className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-slate-200 placeholder-slate-500 text-sm"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs text-slate-400 mb-1">Branch Label</label>
              <input
                type="text"
                value={condition.label || ''}
                onChange={(e) => updateCondition(index, 'label', e.target.value)}
                placeholder={`branch_${index}`}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-slate-200 placeholder-slate-500 text-sm"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addCondition}
        className="w-full px-3 py-2 text-blue-400 hover:text-blue-300 bg-slate-800 border border-blue-700 hover:border-blue-500 rounded text-sm flex items-center justify-center gap-2"
      >
        <span>+</span> Add Condition
      </button>
    </div>
  );
}
