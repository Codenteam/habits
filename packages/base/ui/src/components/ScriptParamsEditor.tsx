import { memo, useState, useCallback } from 'react';
import { Plus, Trash2, Variable } from 'lucide-react';

export interface ScriptParamsEditorProps {
  /** Current params (key-value pairs) */
  params: Record<string, any>;
  /** Keys to exclude from display (internal params like script, language) */
  excludeKeys?: string[];
  /** Callback when params change */
  onChange: (params: Record<string, any>) => void;
  /** Additional class names */
  className?: string;
}

// Reserved keys that should not be editable as custom params
const DEFAULT_EXCLUDED_KEYS = ['script', 'language', 'type'];

/**
 * Component for managing custom parameters in script nodes.
 * Allows users to add, edit, and remove key-value pairs that 
 * can be referenced in the script code.
 */
const ScriptParamsEditor = memo(({
  params,
  excludeKeys = DEFAULT_EXCLUDED_KEYS,
  onChange,
  className = '',
}: ScriptParamsEditorProps) => {
  const [newParamKey, setNewParamKey] = useState('');
  const [newParamValue, setNewParamValue] = useState('');

  // Get custom params (exclude reserved keys)
  const customParams = Object.entries(params).filter(
    ([key]) => !excludeKeys.includes(key)
  );

  const handleAddParam = useCallback(() => {
    if (!newParamKey.trim()) return;
    
    // Don't allow adding reserved keys
    if (excludeKeys.includes(newParamKey.trim())) {
      return;
    }

    const updatedParams = {
      ...params,
      [newParamKey.trim()]: newParamValue,
    };
    onChange(updatedParams);
    setNewParamKey('');
    setNewParamValue('');
  }, [newParamKey, newParamValue, params, onChange, excludeKeys]);

  const handleRemoveParam = useCallback((key: string) => {
    const { [key]: removed, ...rest } = params;
    onChange(rest);
  }, [params, onChange]);

  const handleUpdateParamValue = useCallback((key: string, value: string) => {
    onChange({
      ...params,
      [key]: value,
    });
  }, [params, onChange]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddParam();
    }
  }, [handleAddParam]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Variable className="w-4 h-4 text-slate-400" />
        <label className="block text-sm font-medium text-slate-300">
          Script Parameters
        </label>
      </div>
      
      <p className="text-xs text-slate-500">
        Add custom parameters that can be used in your script. Reference previous nodes using {'{{node-id}}'} syntax.
      </p>

      {/* Existing Parameters */}
      {customParams.length > 0 && (
        <div className="space-y-2">
          {customParams.map(([key, value]) => (
            <div
              key={key}
              className="flex items-center gap-2 p-2 bg-slate-900/50 rounded border border-slate-700"
            >
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div className="text-sm font-mono text-cyan-400 px-2 py-1 bg-slate-900 rounded truncate">
                  {key}
                </div>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleUpdateParamValue(key, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="px-2 py-1 text-sm border border-slate-600 rounded bg-slate-900 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none nodrag"
                  placeholder="Value or {{node-id}}"
                />
              </div>
              <button
                onClick={() => handleRemoveParam(key)}
                className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors"
                title="Remove parameter"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Parameter */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-xs text-slate-500 mb-1">Param Name</label>
          <input
            type="text"
            value={newParamKey}
            onChange={(e) => setNewParamKey(e.target.value)}
            onKeyPress={handleKeyPress}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full px-3 py-2 text-sm border border-slate-600 rounded-md bg-slate-900 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none nodrag"
            placeholder="e.g., text"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-slate-500 mb-1">Value</label>
          <input
            type="text"
            value={newParamValue}
            onChange={(e) => setNewParamValue(e.target.value)}
            onKeyPress={handleKeyPress}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full px-3 py-2 text-sm border border-slate-600 rounded-md bg-slate-900 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none nodrag"
            placeholder="{{node-id}} or static"
          />
        </div>
        <button
          onClick={handleAddParam}
          disabled={!newParamKey.trim()}
          className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
          title="Add parameter"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Usage hint */}
      {customParams.length > 0 && (
        <div className="text-xs text-slate-500 bg-slate-900/50 p-2 rounded border border-slate-700">
          <strong className="text-slate-400">Usage in script:</strong>{' '}
          Parameters are passed to your <code className="text-cyan-400">main()</code> function.
          <div className="mt-1 font-mono text-cyan-400/80">
            export async function main({customParams.map(([key]) => key).join(', ')}) {'{ ... }'}
          </div>
        </div>
      )}
    </div>
  );
});

ScriptParamsEditor.displayName = 'ScriptParamsEditor';

export default ScriptParamsEditor;
