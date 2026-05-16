import { useState, useMemo } from 'react';
import { X, Key, Eye, EyeOff } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectHabits, selectActiveEnvVariables, updateEnvVariable } from '../store/slices/workflowSlice';
import { extractEnvVariables } from '../lib/exportUtils';

interface EnvSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EnvSetupModal({ isOpen, onClose }: EnvSetupModalProps) {
  const dispatch = useAppDispatch();
  const habits = useAppSelector(selectHabits);
  const activeEnvVariables = useAppSelector(selectActiveEnvVariables);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  // Extract all env keys referenced across all habits
  const extractedKeys = useMemo(() => extractEnvVariables(habits as any), [habits]);

  if (!isOpen) return null;

  const toggleReveal = (key: string) => {
    setRevealedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleValueChange = (key: string, value: string) => {
    dispatch(updateEnvVariable({ key, value }));
  };

  const missingCount = extractedKeys.filter(({ key }) => !activeEnvVariables[key]?.value).length;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-yellow-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Environment Setup</h3>
              {extractedKeys.length > 0 && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {extractedKeys.length} key{extractedKeys.length !== 1 ? 's' : ''} found
                  {missingCount > 0 && (
                    <span className="text-yellow-400 ml-1">• {missingCount} missing</span>
                  )}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {extractedKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Key className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm font-medium">No environment variables found</p>
              <p className="text-slate-500 text-xs mt-1">
                Use <code className="bg-slate-700 px-1 rounded">{'{{habits.env.VAR_NAME}}'}</code> in your habit nodes to reference env vars.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {extractedKeys.map(({ key, description, nodeLabel }) => {
                const currentValue = activeEnvVariables[key]?.value ?? '';
                const isRevealed = revealedKeys.has(key);
                const isFilled = !!currentValue;

                return (
                  <div
                    key={key}
                    className={`rounded-lg border p-3 transition-colors ${
                      isFilled ? 'border-slate-600 bg-slate-900/40' : 'border-yellow-700/40 bg-yellow-900/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-medium text-cyan-400">{key}</span>
                        {isFilled && (
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" title="Value set" />
                        )}
                      </div>
                      <span className="text-xs text-slate-500 truncate max-w-40" title={nodeLabel}>
                        {nodeLabel}
                      </span>
                    </div>
                    {description && (
                      <p className="text-xs text-slate-500 mb-2">{description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type={isRevealed ? 'text' : 'password'}
                        value={currentValue}
                        onChange={(e) => handleValueChange(key, e.target.value)}
                        placeholder={`Enter value for ${key}`}
                        className="flex-1 px-3 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-md text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-600 transition-colors"
                      />
                      <button
                        onClick={() => toggleReveal(key)}
                        className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                        title={isRevealed ? 'Hide value' : 'Show value'}
                      >
                        {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {extractedKeys.length > 0 && (
          <div className="p-4 border-t border-slate-700 bg-slate-900/50">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Values are saved automatically as you type</span>
              <span>
                {extractedKeys.length - missingCount}/{extractedKeys.length} filled
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
