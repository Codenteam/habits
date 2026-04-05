import { memo, useState, useCallback, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Activity, Zap, Play, Code, Pencil, Check, MessageSquare } from 'lucide-react';
import { isTriggerNode } from '@ha-bits/workflow-canvas';
import { useAppDispatch } from '../store/hooks';
import { updateNode, updateNodeId } from '../store/slices/workflowSlice';
import ScriptNodeEditor from './ScriptNodeEditor';
import ModuleIcon from './ModuleIcon';
import RichTextArea from './RichTextArea';

const LONG_VALUE_THRESHOLD = 10;

// Keys to exclude from long values display (auth-related fields)
const EXCLUDED_KEYS = ['auth', 'apiKey', 'api_key', 'token', 'secret', 'password', 'credential', 'credentials'];

// Helper to check if a key is auth-related
const isAuthRelatedKey = (key: string): boolean => {
  const lowerKey = key.toLowerCase();
  return EXCLUDED_KEYS.some(excluded => lowerKey.includes(excluded.toLowerCase()));
};

// Helper to find long values in an object
const findLongValues = (obj: Record<string, any> | undefined): Array<{ key: string; value: string }> => {
  if (!obj) return [];
  const longValues: Array<{ key: string; value: string }> = [];
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip auth-related fields
    if (isAuthRelatedKey(key)) continue;
    if (typeof value === 'string' && value.length > LONG_VALUE_THRESHOLD) {
      longValues.push({ key, value });
    }
  }
  // Sort by value length descending (longest first)
  longValues.sort((a, b) => b.value.length - a.value.length);
  
  return longValues;
};

// Helper to extract long values from formState.fields structure
const findLongValuesFromFields = (fields: Record<string, { value?: any }> | undefined): Array<{ key: string; value: string }> => {
  if (!fields) return [];
  const longValues: Array<{ key: string; value: string }> = [];
  
  for (const [key, fieldData] of Object.entries(fields)) {
    // Skip auth-related fields
    if (isAuthRelatedKey(key)) continue;
    const value = fieldData?.value;
    if (typeof value === 'string' && value.length > LONG_VALUE_THRESHOLD) {
      longValues.push({ key, value });
    }
  }
  // Sort by value length descending (longest first)
  longValues.sort((a, b) => b.value.length - a.value.length);
  return longValues;
};

/**
 * CustomNode - Full-featured editable node component for the Workflow Editor
 * 
 * WHERE USED:
 * - packages/base/ui - The main Workflow Editor application (WorkflowEditor.tsx)
 * 
 * WHY:
 * - Provides full editing capabilities: inline text editing, script editing, node ID renaming
 * - Integrates with Redux store for state management (requires Redux Provider)
 * - Uses RichTextArea for variable token editing with syntax highlighting
 * - Uses Monaco editor (via ScriptNodeEditor) for script editing
 * 
 * WHEN TO USE:
 * - When you need an interactive, editable workflow canvas
 * - When the component is inside a Redux Provider (always the case in base-ui)
 * 
 * For read-only viewing, use BaseNode from @ha-bits/workflow-canvas instead.
 */
export default memo(({ data, selected, id }: NodeProps) => {
  const dispatch = useAppDispatch();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingId, setIsEditingId] = useState(false);
  const [editedId, setEditedId] = useState(id);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(data.description || '');
  const isBits = data.framework === 'bits';
  const isScript = data.framework === 'script';
  
  // Use type from data if available, otherwise fallback to old method
  const isTrigger = data.type === 'trigger' || 
                    (!data.type && isTriggerNode(data.framework, data.module || ''));
  
  const selectedBorder = selected ? 'ring-2 ring-blue-500' : '';


  // Get colors based on node type and framework - Dark mode with high contrast
  let bgColor, borderColor, textColor;
  let IconComponent: typeof Activity = Activity;
  
  if (isTrigger) {
    if (isBits) {
      bgColor = 'bg-teal-900';
      borderColor = 'border-teal-500';
      textColor = 'text-teal-200';
    } else if (isScript) {
      bgColor = 'bg-orange-900';
      borderColor = 'border-orange-500';
      textColor = 'text-orange-200';
    } else {
      bgColor = 'bg-gray-800';
      borderColor = 'border-gray-500';
      textColor = 'text-gray-200';
    }
    IconComponent = Play;
  } else {
    if (isBits) {
      bgColor = 'bg-blue-900';
      borderColor = 'border-blue-500';
      textColor = 'text-blue-200';
      IconComponent = Zap;
    } else if (isScript) {
      bgColor = 'bg-cyan-900';
      borderColor = 'border-cyan-500';
      textColor = 'text-cyan-200';
      IconComponent = Code;
    } else {
      // Fallback
      bgColor = 'bg-gray-800';
      borderColor = 'border-gray-500';
      textColor = 'text-gray-200';
      IconComponent = Zap;
    }
  }

  // Get inputs and outputs from data, fallback to default ['main'] if not specified
  const inputs = data.inputs || ['main'];
  const outputs = data.outputs || ['main'];

  // Find long values in params, formState.formValues, or formState.fields
  // TODO: This needs to change, instead of finding in multiple places, a formfield value needs to always represent the source of truth
  const longValues = useMemo(() => {
    const paramsLongValues = findLongValues(data.params);

    // In case of script type, add script content as a long value if applicable
    const scriptContent = data.content;
    if (isScript && typeof scriptContent === 'string' && scriptContent.length > LONG_VALUE_THRESHOLD) {
      paramsLongValues.push({ key: 'script', value: scriptContent });
    }
    
    const formLongValues = findLongValues(data.formState?.formValues);
    const fieldsLongValues = findLongValuesFromFields(data.formState?.fields);
    
    // Merge and deduplicate by key (params take precedence, then formValues, then fields)
    const allValues = [...paramsLongValues];
    formLongValues.forEach(fv => {
      if (!allValues.find(v => v.key === fv.key)) {
        allValues.push(fv);
      }
    });
    fieldsLongValues.forEach(fv => {
      if (!allValues.find(v => v.key === fv.key)) {
        allValues.push(fv);
      }
    });
    
    // Final safeguard: ensure all values are strings
    return allValues.filter(v => typeof v.value === 'string');
  }, [data.params, data.formState?.formValues, data.formState?.fields, data.content, isScript]);

  const hasLongValues = longValues.length > 0;
  const hasScript = longValues.some(v => v.key === 'script');

  // Handle node ID change
  const handleIdEdit = useCallback(() => {
    if (isEditingId && editedId !== id && editedId.trim()) {
      dispatch(updateNodeId({ oldId: id, newId: editedId.trim() }));
    }
    setIsEditingId(!isEditingId);
  }, [dispatch, id, editedId, isEditingId]);

  const handleIdKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleIdEdit();
    } else if (e.key === 'Escape') {
      setEditedId(id);
      setIsEditingId(false);
    }
  }, [handleIdEdit, id]);

  // Handle description edit
  const handleDescriptionSave = useCallback(() => {
    dispatch(updateNode({ 
      nodeId: id, 
      data: { description: editedDescription.trim() } 
    }));
    setIsEditingDescription(false);
  }, [dispatch, id, editedDescription]);

  // Handle value change from inline editing
  const handleValueChange = useCallback((key: string, newValue: string) => {
    // Update params
    const updatedParams = { ...data.params, [key]: newValue };
    
    // Also update formState.fields if it exists
    const updatedFormState = data.formState ? {
      ...data.formState,
      fields: {
        ...data.formState.fields,
        [key]: {
          ...(data.formState.fields?.[key] || {}),
          value: newValue,
          isDirty: true,
        }
      },
      formValues: {
        ...data.formState.formValues,
        [key]: newValue,
      }
    } : undefined;
    
    dispatch(updateNode({ 
      nodeId: id, 
      data: { 
        params: updatedParams,
        ...(updatedFormState && { formState: updatedFormState })
      } 
    }));
  }, [dispatch, id, data.params, data.formState]);

  // Handle language change for script nodes
  const handleLanguageChange = useCallback((newLanguage: string) => {
    dispatch(updateNode({ 
      nodeId: id, 
      data: { 
        language: newLanguage,
        params: { ...data.params, language: newLanguage }
      } 
    }));
  }, [dispatch, id, data.params]);

  // Calculate handle positions for multiple inputs/outputs
  const getHandleStyle = (index: number, total: number, isTop: boolean = true) => {
    if (total === 1) {
      return { left: '50%', transform: 'translateX(-50%)' };
    }
    
    const spacing = 80 / (total - 1); // Distribute across 80% of node width
    const leftOffset = 10 + (spacing * index); // Start at 10% from left
    
    return { 
      left: `${leftOffset}%`, 
      transform: 'translateX(-50%)',
      position: 'absolute' as const,
      [isTop ? 'top' : 'bottom']: '-6px'
    };
  };

  return (
    <div className={`px-4 py-3 shadow-lg shadow-black/30 rounded-lg border-2 ${bgColor} ${borderColor} ${selectedBorder} ${hasScript ? 'min-w-150' : hasLongValues ? 'w-100' : 'w-75'} relative transition-all duration-200`}>
      {/* Description above the node */}
      {(isEditingDescription || data.description) && (
        <div 
          className="absolute left-0 right-0 bottom-full -mt-5 pb-2"
        >
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-2 shadow-lg">
            {isEditingDescription ? (
              <div className="space-y-2">
                <RichTextArea
                  defaultValue={editedDescription}
                  onChange={setEditedDescription}
                  placeholder="Add a description..."
                  minHeight="64px"
                  maxHeight="200px"
                  autoFocus
                  stopPropagation
                  currentNodeId={id}
                  showVariablePicker
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditedDescription(data.description || '');
                      setIsEditingDescription(false);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 transition-colors nodrag"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDescriptionSave();
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors nodrag"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className="text-sm text-gray-300 cursor-pointer hover:text-gray-100 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingDescription(true);
                }}
              >
                {data.description}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input handles */}
      {data.type !== "trigger" && inputs.map((input: string, index: number) => (
        <Handle
          key={`input-${input}-${index}`}
          type="target"
          position={Position.Top}
          id={input}
          className="w-3 h-3"
          style={getHandleStyle(index, inputs.length, true)}
        />
      ))}

      {/* Editable Node ID */}
      <div className="flex items-center gap-1 mb-1">
        {isEditingId ? (
          <input
            type="text"
            value={editedId}
            onChange={(e) => setEditedId(e.target.value)}
            onKeyDown={handleIdKeyDown}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex-1 px-1 py-0.5 text-lg font-mono bg-gray-800 text-gray-100 border border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 nodrag"
            autoFocus
          />
        ) : (
          <span className="flex-1 text-lg font-mono text-gray-300 truncate" title={id}>
            {id}
          </span>
        )}
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleIdEdit();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="p-0.5 text-gray-300 hover:text-gray-100 transition-colors nodrag"
          title={isEditingId ? 'Save ID' : 'Edit ID'}
        >
          {isEditingId ? <Check className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditedDescription(data.description || '');
            setIsEditingDescription(true);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={`p-0.5 transition-colors nodrag ${data.description ? 'text-blue-400 hover:text-blue-300' : 'text-gray-300 hover:text-gray-100'}`}
          title={data.description ? 'Edit description' : 'Add description'}
        >
          <MessageSquare className="w-3 h-3" />
        </button>
      </div>
            {data.module && (
        <div className="mt-2 text-lg text-gray-400 truncate">
          {data.module}
        </div>
      )}
      <div className="flex items-center gap-2 mt-2">
        {data.logoUrl ? (
          <ModuleIcon logoUrl={data.logoUrl} className={`w-5 h-5 ${textColor}`} />
        ) : (
          <IconComponent className={`w-5 h-5 ${textColor}`} />
        )}
        <div className="flex-1">
          <div className={`text-lg font-semibold ${textColor}`}>
            {data.framework} - {data.label}
          </div>
          {data.resource && (
            <div className="text-lg text-gray-300">
              {data.resource} → {data.operation}
            </div>
          )}
        </div>
      </div>



      {/* Show language for Script nodes */}
      {isScript && data.language && !hasScript && (
        <div className="mt-1 text-lg text-gray-400">
          {data.language}
        </div>
      )}

      {/* Expandable long values section */}
      {hasLongValues && (
        <div className="mt-2 border-t border-gray-600 pt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className={`flex items-center gap-1 text-lg ${textColor} hover:opacity-80 transition-opacity w-full justify-between`}
          >
          </button>
          
            <div className="mt-2 space-y-2 w-full">
              {longValues.map(({ key, value }) => (
                <div key={key} className="space-y-1">
                  {key !== 'script' && (
                    <label className="text-lg font-medium text-gray-300 block">
                      {key}
                    </label>
                  )}
                  {key === 'script' ? (
                    <ScriptNodeEditor
                      script={value}
                      language={data.language || data.params?.language || 'deno'}
                      onScriptChange={(newValue) => handleValueChange(key, newValue)}
                      onLanguageChange={handleLanguageChange}
                      height="200px"
                      showLabel={false}
                    />
                  ) : (
                    <RichTextArea
                      defaultValue={value}
                      onChange={(newValue) => handleValueChange(key, newValue)}
                      placeholder={`Enter ${key}...`}
                      minHeight="80px"
                      maxHeight="200px"
                      stopPropagation
                      currentNodeId={id}
                      showVariablePicker
                    />
                  )}
                </div>
              ))}
            </div>
        </div>
      )}

      {/* Show input/output counts if multiple */}
      {(inputs.length > 1 || outputs.length > 1) && (
        <div className="mt-2 text-lg text-gray-300 flex justify-between">
          {inputs.length > 1 && <span>↓ {inputs.length} inputs</span>}
          {outputs.length > 1 && <span>↑ {outputs.length} outputs</span>}
        </div>
      )}

      {/* Output handles with labels for branch nodes */}
      {outputs.length > 1 && (
        <div className="mt-2 flex justify-around text-xs text-gray-400 px-2">
          {outputs.map((output: string, index: number) => (
            <span 
              key={`label-${output}-${index}`} 
              className={`truncate max-w-[60px] text-center ${output === 'else' ? 'text-yellow-400' : ''}`}
              title={output}
            >
              {output}
            </span>
          ))}
        </div>
      )}

      {/* Output handles */}
      {outputs.map((output: string, index: number) => (
        <Handle
          key={`output-${output}-${index}`}
          type="source"
          position={Position.Bottom}
          id={output}
          className={`w-3 h-3 ${output === 'else' ? '!bg-yellow-500' : ''}`}
          style={getHandleStyle(index, outputs.length, false)}
        />
      ))}
    </div>
  );
});
