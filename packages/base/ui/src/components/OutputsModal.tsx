import { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowRightLeft } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setHabitOutput, selectActiveHabitOutput, selectNodes } from '../store/slices/workflowSlice';

interface OutputsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OutputEntry {
  key: string;
  value: string;
}

export default function OutputsModal({ isOpen, onClose }: OutputsModalProps) {
  const dispatch = useAppDispatch();
  const habitOutput = useAppSelector(selectActiveHabitOutput);
  const nodes = useAppSelector(selectNodes);
  const [outputs, setOutputs] = useState<OutputEntry[]>([]);
  const [errors, setErrors] = useState<Record<number, string>>({});

  // Initialize outputs from Redux state when modal opens
  useEffect(() => {
    if (isOpen) {
      const entries = Object.entries(habitOutput).map(([key, value]) => ({
        key,
        value: String(value),
      }));
      setOutputs(entries.length > 0 ? entries : [{ key: '', value: '' }]);
      setErrors({});
    }
  }, [isOpen, habitOutput]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const handleAddOutput = () => {
    setOutputs([...outputs, { key: '', value: '' }]);
  };

  const handleRemoveOutput = (index: number) => {
    const newOutputs = outputs.filter((_, i) => i !== index);
    setOutputs(newOutputs.length > 0 ? newOutputs : [{ key: '', value: '' }]);
    // Clean up any errors for this index
    const newErrors = { ...errors };
    delete newErrors[index];
    setErrors(newErrors);
  };

  const handleUpdateOutput = (index: number, field: 'key' | 'value', newValue: string) => {
    const newOutputs = [...outputs];
    newOutputs[index] = { ...newOutputs[index], [field]: newValue };
    setOutputs(newOutputs);
    
    // Clear error when user starts typing
    if (errors[index]) {
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  const validateOutputs = (): boolean => {
    const newErrors: Record<number, string> = {};
    const seenKeys = new Set<string>();
    
    outputs.forEach((output, index) => {
      // Only validate non-empty entries
      if (output.key || output.value) {
        if (!output.key.trim()) {
          newErrors[index] = 'Output name is required';
        } else if (seenKeys.has(output.key.trim())) {
          newErrors[index] = 'Duplicate output name';
        } else if (!output.value.trim()) {
          newErrors[index] = 'Output value/expression is required';
        }
        seenKeys.add(output.key.trim());
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateOutputs()) return;
    
    // Convert to Record format, filtering out empty entries
    const outputRecord: Record<string, string> = {};
    outputs.forEach(output => {
      if (output.key.trim() && output.value.trim()) {
        outputRecord[output.key.trim()] = output.value.trim();
      }
    });
    
    dispatch(setHabitOutput(outputRecord));
    onClose();
  };

  // Get available node IDs for the variable picker suggestion
  const nodeIds = nodes.map(n => n.id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Habit Outputs</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Description */}
        <div className="px-4 py-3 bg-slate-700/30 border-b border-slate-700">
          <p className="text-sm text-slate-300">
            Define outputs for this habit. Use template expressions like{' '}
            <code className="px-1 py-0.5 bg-slate-700 rounded text-blue-300 text-xs">
              {'{{node-id.results}}'}
            </code>{' '}
            to reference node outputs.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {outputs.map((output, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={output.key}
                  onChange={(e) => handleUpdateOutput(index, 'key', e.target.value)}
                  placeholder="Output name (e.g., recipes)"
                  className={`w-full px-3 py-2 bg-slate-900 border rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 ${
                    errors[index] ? 'border-red-500' : 'border-slate-600'
                  }`}
                />
              </div>
              <span className="text-slate-500 py-2">=</span>
              <div className="flex-2 space-y-1">
                <input
                  type="text"
                  value={output.value}
                  onChange={(e) => handleUpdateOutput(index, 'value', e.target.value)}
                  placeholder="{{node-id.property}} or expression"
                  className={`w-full px-3 py-2 bg-slate-900 border rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-xs ${
                    errors[index] ? 'border-red-500' : 'border-slate-600'
                  }`}
                />
                {errors[index] && (
                  <p className="text-xs text-red-400">{errors[index]}</p>
                )}
              </div>
              <button
                onClick={() => handleRemoveOutput(index)}
                className="p-2 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-red-400"
                title="Remove output"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {/* Add button */}
          <button
            onClick={handleAddOutput}
            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-slate-700/50 rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Output
          </button>

          {/* Available nodes hint */}
          {nodeIds.length > 0 && (
            <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
              <p className="text-xs text-slate-400 mb-2">Available nodes:</p>
              <div className="flex flex-wrap gap-1">
                {nodeIds.map(id => (
                  <code
                    key={id}
                    className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300 cursor-pointer hover:bg-slate-600"
                    onClick={() => {
                      // Find the first empty or last output and add a template
                      const lastIndex = outputs.length - 1;
                      if (!outputs[lastIndex]?.value) {
                        handleUpdateOutput(lastIndex, 'value', `{{${id}}}`);
                      }
                    }}
                    title={`Click to insert {{${id}}}`}
                  >
                    {id}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors"
          >
            Save Outputs
          </button>
        </div>
      </div>
    </div>
  );
}
