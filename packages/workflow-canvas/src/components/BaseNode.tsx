import { memo, useMemo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Activity, Zap, Play, Code, Box, ChevronDown, ChevronRight } from 'lucide-react';
import type { BaseNodeData, WorkflowFramework } from '../types';
import { isTriggerNode, getNodeColors, getNodeDefinition } from '../nodeDefinitions';

const LONG_VALUE_THRESHOLD = 10;

// Keys to exclude from display (auth-related fields)
const EXCLUDED_KEYS = ['auth', 'apiKey', 'api_key', 'token', 'secret', 'password', 'credential', 'credentials'];

const isAuthRelatedKey = (key: string): boolean => {
  const lowerKey = key.toLowerCase();
  return EXCLUDED_KEYS.some(excluded => lowerKey.includes(excluded.toLowerCase()));
};

const findLongValues = (obj: Record<string, any> | undefined): Array<{ key: string; value: string }> => {
  if (!obj) return [];
  const longValues: Array<{ key: string; value: string }> = [];
  
  for (const [key, value] of Object.entries(obj)) {
    if (isAuthRelatedKey(key)) continue;
    if (typeof value === 'string' && value.length > LONG_VALUE_THRESHOLD) {
      longValues.push({ key, value });
    }
  }
  longValues.sort((a, b) => b.value.length - a.value.length);
  return longValues;
};

/**
 * Get icon component based on framework and node type
 */
function getNodeIcon(framework: WorkflowFramework, isTrigger: boolean) {
  if (isTrigger) return Play;
  
  switch (framework) {
    case 'n8n': return Activity;
    case 'activepieces': return Zap;
    case 'script': return Code;
    case 'bits': return Box;
    default: return Activity;
  }
}

/**
 * Calculate handle position for multiple handles
 */
function getHandleStyle(index: number, total: number, isTop: boolean = true) {
  if (total === 1) {
    return { left: '50%', transform: 'translateX(-50%)' };
  }
  
  const spacing = 80 / (total - 1);
  const leftOffset = 10 + spacing * index;
  
  return {
    left: `${leftOffset}%`,
    transform: 'translateX(-50%)',
    position: 'absolute' as const,
    [isTop ? 'top' : 'bottom']: '-6px',
  };
}

/**
 * BaseNode - Read-only node component for workflow visualization
 * This is the foundation component used by both the editor (with editing extensions)
 * and the viewer (read-only mode)
 */
function BaseNodeComponent({ data, selected, id }: NodeProps<BaseNodeData>) {
  const isScript = data.framework === 'script';
  
  // Local collapsed state - initialized from data.collapsed prop
  const [isCollapsed, setIsCollapsed] = useState(data.collapsed ?? false);
  
  // Determine if trigger
  const isTrigger = data.type === 'trigger' || 
                    (!data.type && isTriggerNode(data.framework, data.module || ''));
  
  // Get colors and icon
  const colors = getNodeColors(data.framework, isTrigger);
  const IconComponent = getNodeIcon(data.framework, isTrigger);
  
  // Get inputs/outputs
  const definition = getNodeDefinition(data.framework, data.module || '', data.type);
  const inputs = data.inputs || definition.inputs;
  const outputs = data.outputs || definition.outputs;

  const selectedBorder = selected ? 'ring-2 ring-blue-500' : '';

  // Find long values for display
  const longValues = useMemo(() => {
    const paramsLongValues = findLongValues(data.params);
    if (isScript && data.content && data.content.length > LONG_VALUE_THRESHOLD) {
      paramsLongValues.push({ key: 'script', value: data.content });
    }
    return paramsLongValues;
  }, [data.params, data.content, isScript]);

  const hasLongValues = longValues.length > 0;
  
  // When collapsed, use smaller min-width
  const nodeWidth = isCollapsed ? 'min-w-[250px]' : (hasLongValues ? 'min-w-[400px]' : 'min-w-[250px]');

  return (
    <div className={`px-5 py-4 shadow-lg shadow-black/30 rounded-xl border-2 ${colors.bg} ${colors.border} ${selectedBorder} ${nodeWidth} relative transition-all duration-200`}>
      {/* Input handles - only for non-trigger nodes */}
      {!isTrigger && inputs.map((input: string, index: number) => (
        <Handle
          key={`input-${input}-${index}`}
          type="target"
          position={Position.Top}
          id={input}
          className="w-4 h-4"
          style={getHandleStyle(index, inputs.length, true)}
        />
      ))}

      {/* Node ID */}
      <div className="text-sm font-mono text-gray-300 truncate mb-2" title={id}>
        {id}
      </div>

      {/* Node content */}
      <div className="flex items-center gap-3 mt-2">
        <IconComponent className={`w-7 h-7 ${colors.text}`} />
        <div className="flex-1 min-w-0">
          <div className={`text-base font-bold ${colors.text} truncate`}>
            {data.framework} - {data.label}
          </div>
          {data.resource && data.operation && (
            <div className="text-sm text-gray-300 truncate">
              {data.resource} → {data.operation}
            </div>
          )}
        </div>
      </div>

      {/* Module name */}
      {data.module && (
        <div className="mt-2 text-sm text-gray-100 truncate">
          {data.module}
        </div>
      )}

      {/* Script language indicator */}
      {isScript && data.language && (
        <div className="mt-1 text-sm text-gray-100">
          {data.language}
        </div>
      )}

      {/* Long values display (read-only) with collapse toggle */}
      {hasLongValues && (
        <div className="mt-3 border-t border-gray-200 pt-3 long-values">
          {/* Collapse toggle button */}
          <button
            className="flex items-center gap-1 text-sm text-gray-100 hover:text-gray-200 transition-colors mb-2 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
          >
            {isCollapsed ? (
              <>
                <ChevronRight className="w-4 h-4" />
                <span>Show details ({longValues.length})</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>Hide details</span>
              </>
            )}
          </button>
          
          {/* Collapsible content */}
          {!isCollapsed && (
            <div className="space-y-2 max-w-full">
              {longValues.map(({ key, value }) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-semibold text-gray-300 block">
                    {key}
                  </label>
                  <div className="w-full min-h-[60px] max-h-[150px] p-2 text-sm font-mono bg-gray-800 text-gray-100 border border-gray-600 rounded overflow-auto whitespace-pre-wrap break-words">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Multiple inputs/outputs indicator */}
      {(inputs.length > 1 || outputs.length > 1) && (
        <div className="mt-2 text-sm text-gray-300 flex justify-between">
          {inputs.length > 1 && <span>↓ {inputs.length} inputs</span>}
          {outputs.length > 1 && <span>↑ {outputs.length} outputs</span>}
        </div>
      )}

      {/* Output handles */}
      {outputs.map((output: string, index: number) => (
        <Handle
          key={`output-${output}-${index}`}
          type="source"
          position={Position.Bottom}
          id={output}
          className="w-4 h-4"
          style={getHandleStyle(index, outputs.length, false)}
        />
      ))}
    </div>
  );
}

export const BaseNode = memo(BaseNodeComponent);
export default BaseNode;
