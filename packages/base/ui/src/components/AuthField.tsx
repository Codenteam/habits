/**
 * AuthField Component
 * 
 * A form field for authentication credentials that supports:
 * - Secret masking with reveal toggle
 * - Environment variable template insertion ({{habits.env.VAR_NAME}})
 * - Integration with the VariablePicker for inserting env variables
 */

import { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Variable, ChevronDown, Plus, Key } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { 
  selectActiveEnvVariables, 
  toggleEnvVariableReveal,
} from '../store/slices/workflowSlice';

interface AuthFieldProps {
  /** Property key name (e.g., 'apiKey', 'host') */
  propKey: string;
  /** Display name for the field */
  displayName: string;
  /** Description/help text */
  description?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Field type from bits schema (SECRET_TEXT, SHORT_TEXT, etc.) */
  type: string;
  /** Current value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to open env variables manager when clicking the button */
  onManageEnvClick?: () => void;
}

export default function AuthField({
  propKey,
  displayName,
  description,
  required = false,
  type,
  value,
  onChange,
  placeholder: _placeholder,
  onManageEnvClick,
}: AuthFieldProps) {
  const dispatch = useAppDispatch();
  const envVariables = useAppSelector(selectActiveEnvVariables);
  
  // Local state for reveal toggle and dropdown
  const [isRevealed, setIsRevealed] = useState(false);
  const [showEnvPicker, setShowEnvPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Determine if this is a secret field
  const isSecret = type === 'SECRET_TEXT' || propKey.toLowerCase().includes('key') || 
                   propKey.toLowerCase().includes('secret') || propKey.toLowerCase().includes('password');
  
  // Check if value is a template variable
  const isTemplateValue = value?.startsWith ? value.startsWith('{{habits.env.'): '';
  const templateVarName = isTemplateValue 
    ? value.replace('{{habits.env.', '').replace('}}', '') 
    : null;
  
  // Get resolved value if it's a template
  const resolvedEnvValue = templateVarName ? envVariables[templateVarName]?.value : null;
  const isEnvRevealed = templateVarName ? envVariables[templateVarName]?.revealed : false;
  
  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowEnvPicker(false);
      }
    };
    
    if (showEnvPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEnvPicker]);
  
  // Handle inserting an env variable template
  const handleInsertEnvVar = (varName: string) => {
    onChange(`{{habits.env.${varName}}}`);
    setShowEnvPicker(false);
  };
  
  // Handle reveal toggle
  const handleRevealToggle = () => {
    if (templateVarName) {
      // Toggle reveal in Redux for env variables
      dispatch(toggleEnvVariableReveal(templateVarName));
    } else {
      // Toggle local reveal for raw values
      setIsRevealed(!isRevealed);
    }
  };
  
  // Determine what to show in the input
  const getDisplayValue = () => {
    if (isTemplateValue) {
      // Show template reference
      return value;
    }
    if (isSecret && !isRevealed) {
      // Mask raw secret values
      return value ? '••••••••••••' : '';
    }
    return value || '';
  };
  
  // Get env variable list
  const envVarEntries = Object.entries(envVariables);
  
  return (
    <div className="space-y-1">
      {/* Label */}
      <label className="block text-sm font-medium text-slate-300">
        {displayName}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      
      {/* Description */}
      {description && (
        <p className="text-xs text-slate-500">{description}</p>
      )}
      
      {/* Input with actions */}
      <div className="relative flex gap-1">
        {/* Main input */}
        <div className="relative flex-1">
          <input
            type={isSecret && !isRevealed && !isTemplateValue ? 'password' : 'text'}
            value={isSecret && !isRevealed && !isTemplateValue ? value : getDisplayValue()}
            onChange={(e) => onChange(e.target.value)}
            placeholder={displayName}
            className={`w-full px-3 py-2 pr-10 border border-slate-600 rounded-md bg-slate-900 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none text-sm ${
              isTemplateValue ? 'text-amber-300 font-mono text-xs' : ''
            }`}
          />
          
          {/* Reveal toggle button (inside input) */}
          {(isSecret || isTemplateValue) && value && (
            <button
              type="button"
              onClick={handleRevealToggle}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
              title={isRevealed || isEnvRevealed ? 'Hide value' : 'Reveal value'}
            >
              {isRevealed || isEnvRevealed ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        
        {/* Env variable picker button */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowEnvPicker(!showEnvPicker)}
            className="px-2 py-2 border border-slate-600 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1"
            title="Insert environment variable"
          >
            <Variable className="w-4 h-4" />
            <ChevronDown className="w-3 h-3" />
          </button>
          
          {/* Env picker dropdown */}
          {showEnvPicker && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-slate-800 border border-slate-600 rounded-md shadow-xl z-50 overflow-hidden">
              {/* Header */}
              <div className="px-3 py-2 bg-slate-900 border-b border-slate-700 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Environment Variables</span>
                {onManageEnvClick && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowEnvPicker(false);
                      onManageEnvClick();
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Key className="w-3 h-3" />
                    Manage
                  </button>
                )}
              </div>
              
              {/* Variable list */}
              <div className="max-h-48 overflow-y-auto">
                {envVarEntries.length === 0 ? (
                  <div className="px-3 py-4 text-center text-slate-500 text-sm">
                    <p className="mb-2">No environment variables</p>
                    {onManageEnvClick && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowEnvPicker(false);
                          onManageEnvClick();
                        }}
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 mx-auto"
                      >
                        <Plus className="w-3 h-3" />
                        Add variables
                      </button>
                    )}
                  </div>
                ) : (
                  envVarEntries.map(([varName, varData]) => (
                    <button
                      key={varName}
                      type="button"
                      onClick={() => handleInsertEnvVar(varName)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0"
                    >
                      <div className="text-sm text-slate-200 font-mono">{varName}</div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {varData.revealed ? varData.value : '••••••••'}
                      </div>
                    </button>
                  ))
                )}
              </div>
              
              {/* Quick add section */}
              {envVarEntries.length > 0 && onManageEnvClick && (
                <div className="px-3 py-2 bg-slate-900 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEnvPicker(false);
                      onManageEnvClick();
                    }}
                    className="text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add new variable
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Show resolved value hint for templates */}
      {isTemplateValue && resolvedEnvValue !== null && (
        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
          <span>Resolves to:</span>
          <span className="font-mono text-slate-400">
            {isEnvRevealed ? resolvedEnvValue : '••••••••'}
          </span>
        </div>
      )}
      
      {/* Warning if template value not found */}
      {isTemplateValue && templateVarName && !envVariables[templateVarName] && (
        <div className="text-xs text-amber-400 mt-1 flex items-center gap-1">
          <span>⚠️ Variable "{templateVarName}" not found in environment</span>
        </div>
      )}
    </div>
  );
}
