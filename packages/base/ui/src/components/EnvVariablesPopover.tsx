/**
 * EnvVariablesPopover Component
 * 
 * A modal/popover for managing environment variables.
 * Features:
 * - View all environment variables
 * - Reveal/hide secret values
 * - Add, edit, and delete variables
 * - Environment variables persist in local state (loaded from .env when opening a folder)
 */

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Plus, Trash2, Save, Key, Edit2, Check, Search, Info } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { 
  selectActiveEnvVariables, 
  toggleEnvVariableReveal,
  addEnvVariable,
  updateEnvVariable,
  removeEnvVariable,
  selectHabits,
} from '../store/slices/workflowSlice';
import { extractEnvFields } from '@habits/shared/variableUtils';
import Dialog from './Dialog';

interface EnvVariablesPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EnvVariablesPopover({
  isOpen,
  onClose,
}: EnvVariablesPopoverProps) {
  const dispatch = useAppDispatch();
  const envVariables = useAppSelector(selectActiveEnvVariables);
  const habits = useAppSelector(selectHabits);
  
  // Local state for new variable form
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarValue, setNewVarValue] = useState('');
  const [newVarComment, setNewVarComment] = useState('');
  const [showNewVarForm, setShowNewVarForm] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingComment, setEditingComment] = useState('');
  
  // Extracted variables state
  const [extractedVars, setExtractedVars] = useState<string[]>([]);
  const [showExtracted, setShowExtracted] = useState(false);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    message: string;
    type: 'confirm' | 'alert' | 'success' | 'error';
    onConfirm?: () => void;
  }>({ message: '', type: 'alert' });
  
  // Unsaved changes indicator
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Track changes
  useEffect(() => {
    setHasUnsavedChanges(false);
    setShowExtracted(false);
    setExtractedVars([]);
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  const envEntries = Object.entries(envVariables);
  
  // Extract {{habits.env.*}} patterns from all habits using shared utility
  const extractEnvVarsFromHabits = () => {
    const foundVars = extractEnvFields(habits);
    
    // Filter to only show missing variables
    const missingVars = foundVars.filter(v => !envVariables[v]);
    setExtractedVars(missingVars);
    setShowExtracted(true);
  };
  
  // Add an extracted variable
  const handleAddExtractedVar = (varName: string) => {
    dispatch(addEnvVariable({ key: varName, value: '' }));
    setExtractedVars(prev => prev.filter(v => v !== varName));
    setHasUnsavedChanges(true);
  };
  
  // Add all extracted variables
  const handleAddAllExtracted = () => {
    for (const varName of extractedVars) {
      dispatch(addEnvVariable({ key: varName, value: '' }));
    }
    setExtractedVars([]);
    setHasUnsavedChanges(true);
  };
  
  // Handle adding a new variable
  const handleAddVariable = () => {
    if (!newVarKey.trim()) return;
    
    // Sanitize key: uppercase, replace spaces with underscores
    const sanitizedKey = newVarKey.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    
    dispatch(addEnvVariable({ key: sanitizedKey, value: newVarValue, comment: newVarComment || undefined }));
    setNewVarKey('');
    setNewVarValue('');
    setNewVarComment('');
    setShowNewVarForm(false);
    setHasUnsavedChanges(true);
  };
  
  // Handle editing a variable
  const handleStartEdit = (key: string, currentValue: string, currentComment?: string) => {
    setEditingKey(key);
    setEditingValue(currentValue);
    setEditingComment(currentComment || '');
  };
  
  const handleSaveEdit = () => {
    if (editingKey) {
      dispatch(updateEnvVariable({ key: editingKey, value: editingValue, comment: editingComment || undefined }));
      setEditingKey(null);
      setEditingValue('');
      setEditingComment('');
      setHasUnsavedChanges(true);
    }
  };
  
  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditingValue('');
    setEditingComment('');
  };
  
  // Handle deleting a variable
  const handleDeleteVariable = (key: string) => {
    setDialogConfig({
      message: `Are you sure you want to delete "${key}"?`,
      type: 'confirm',
      onConfirm: () => {
        dispatch(removeEnvVariable(key));
        setHasUnsavedChanges(true);
      }
    });
    setDialogOpen(true);
  };
  
  // Handle reveal toggle
  const handleRevealToggle = (key: string) => {
    dispatch(toggleEnvVariableReveal(key));
  };
  
  // Handle "save" - just clears unsaved state since we persist to local storage
  const handleMarkAsSaved = () => {
    setHasUnsavedChanges(false);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-white">Environment Variables</h3>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-xs text-amber-400">Unsaved changes</span>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Info banner */}
          <div className="mb-4 p-3 bg-slate-900 border border-slate-700 rounded-md">
            <p className="text-xs text-slate-400">
              Environment variables are stored in your <code className="bg-slate-700 px-1 rounded">.env</code> file. 
              Use them in credentials with <code className="bg-slate-700 px-1 rounded text-amber-300">{"{{habits.env.VAR_NAME}}"}</code>.
            </p>
            <div className="mt-2 p-2 bg-blue-900/30 border border-blue-800/50 rounded text-xs text-blue-300 flex gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Why use environment variables?</span>
                <p className="text-blue-200/70 mt-1">
                  Using <code className="bg-blue-900/50 px-1 rounded">{'{{habits.env.VAR}}'}</code> instead of hardcoded values keeps secrets out of your workflow files. 
                  When you export or share your habits, the .env file stays separate, so API keys and passwords are never embedded in your YAML files.
                </p>
              </div>
            </div>
          </div>
          
          {/* Variables list */}
          {envEntries.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Key className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No environment variables defined</p>
              <p className="text-sm mt-1">Add variables to store API keys and secrets</p>
            </div>
          ) : (
            <div className="space-y-2">
              {envEntries.map(([key, data]) => (
                <div
                  key={key}
                  className="bg-slate-900 border border-slate-700 rounded-md p-3 group"
                >
                  {editingKey === key ? (
                    // Edit mode
                    <div className="space-y-2">
                      <div className="font-mono text-sm text-amber-300">{key}</div>
                      <textarea
                        value={editingComment}
                        onChange={(e) => setEditingComment(e.target.value)}
                        placeholder="Comment (optional)"
                        rows={2}
                        className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-400 text-xs focus:border-blue-500 focus:outline-none resize-none"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="flex-1 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="p-1 text-green-400 hover:text-green-300"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 text-slate-400 hover:text-slate-300"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {data.comment && (
                          <div className="text-xs text-slate-500 mb-1 italic">
                            {data.comment.split('\n').map((line, i) => (
                              <div key={i}># {line}</div>
                            ))}
                          </div>
                        )}
                        <div className="font-mono text-sm text-amber-300">{key}</div>
                        <div className="text-sm text-slate-400 mt-1 font-mono truncate">
                          {data.revealed ? data.value : '••••••••••••'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleRevealToggle(key)}
                          className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                          title={data.revealed ? 'Hide value' : 'Reveal value'}
                        >
                          {data.revealed ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleStartEdit(key, data.value, data.comment)}
                          className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVariable(key)}
                          className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Add new variable form */}
          {showNewVarForm ? (
            <div className="mt-4 bg-slate-900 border border-blue-600 rounded-md p-3 space-y-3">
              <div className="text-sm font-medium text-slate-200">Add New Variable</div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newVarKey}
                  onChange={(e) => setNewVarKey(e.target.value)}
                  placeholder="VARIABLE_NAME"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none font-mono"
                  autoFocus
                />
                <textarea
                  value={newVarComment}
                  onChange={(e) => setNewVarComment(e.target.value)}
                  placeholder="Comment (optional) - describe what this variable is for"
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-400 placeholder-slate-600 text-xs focus:border-blue-500 focus:outline-none resize-none"
                />
                <input
                  type="text"
                  value={newVarValue}
                  onChange={(e) => setNewVarValue(e.target.value)}
                  placeholder="Variable value"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowNewVarForm(false);
                    setNewVarKey('');
                    setNewVarValue('');
                    setNewVarComment('');
                  }}
                  className="px-3 py-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddVariable}
                  disabled={!newVarKey.trim()}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewVarForm(true)}
              className="mt-4 w-full py-2 border border-dashed border-slate-600 rounded-md text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Variable
            </button>
          )}
          
          {/* Extract from habits button */}
          <button
            onClick={extractEnvVarsFromHabits}
            className="mt-2 w-full py-2 border border-slate-600 rounded-md text-slate-400 hover:text-cyan-300 hover:border-cyan-600 transition-colors flex items-center justify-center gap-2 bg-slate-900/50"
          >
            <Search className="w-4 h-4" />
            Extract from Habits
          </button>
          
          {/* Extracted variables section */}
          {showExtracted && (
            <div className="mt-4 bg-cyan-900/20 border border-cyan-800 rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-cyan-300">Missing Variables Found</span>
                {extractedVars.length > 0 && (
                  <button
                    onClick={handleAddAllExtracted}
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    Add All
                  </button>
                )}
              </div>
              {extractedVars.length === 0 ? (
                <p className="text-xs text-slate-400">
                  All referenced variables are already defined.
                </p>
              ) : (
                <div className="space-y-1">
                  {extractedVars.map(varName => (
                    <div key={varName} className="flex items-center justify-between py-1 px-2 bg-slate-800/50 rounded">
                      <span className="font-mono text-sm text-amber-300">{varName}</span>
                      <button
                        onClick={() => handleAddExtractedVar(varName)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-700 bg-slate-900">
          <div className="text-xs text-slate-500">
            {envEntries.length} variable{envEntries.length !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleMarkAsSaved}
              disabled={!hasUnsavedChanges}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Mark as Saved
            </button>
          </div>
        </div>
      </div>

      {/* Dialog */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        message={dialogConfig.message}
        type={dialogConfig.type}
        onConfirm={dialogConfig.onConfirm}
      />
    </div>
  );
}
