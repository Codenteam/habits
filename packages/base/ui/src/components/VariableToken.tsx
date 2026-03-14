import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
  Download, 
  FileText, 
  Mail, 
  Key, 
  Package, 
  Zap, 
  Link,
  Variable,
  Trash2,
  X
} from 'lucide-react';
import VariablePicker, { VariableCategory } from './VariablePicker';
import { VariableTokenType } from '@ha-bits/core';

// Re-export for backwards compatibility
export type TokenType = VariableTokenType;

export interface VariableTokenProps {
  type: TokenType;
  category: string;
  name: string;
  fullValue: string;
  onDelete?: () => void;
  onUpdate?: (newFullValue: string, newType: TokenType, newName: string) => void;
  editable?: boolean;
  /** Categories for variable picker */
  variableCategories?: VariableCategory[];
  /** Current node ID to exclude from node list */
  currentNodeId?: string;
}

const TOKEN_CONFIG: Record<TokenType, { icon: React.ComponentType<any>; colorClass: string; bgClass: string; borderClass: string; label: string }> = {
  input: { 
    icon: Download, 
    colorClass: 'text-blue-400', 
    bgClass: 'bg-blue-900/30', 
    borderClass: 'border-blue-700/50',
    label: 'Input'
  },
  headers: { 
    icon: FileText, 
    colorClass: 'text-purple-400', 
    bgClass: 'bg-purple-900/30', 
    borderClass: 'border-purple-700/50',
    label: 'Headers'
  },
  request: { 
    icon: Mail, 
    colorClass: 'text-blue-400', 
    bgClass: 'bg-blue-900/30', 
    borderClass: 'border-blue-700/50',
    label: 'Request'
  },
  env: { 
    icon: Key, 
    colorClass: 'text-amber-400', 
    bgClass: 'bg-amber-900/30', 
    borderClass: 'border-amber-700/50',
    label: 'Environment'
  },
  context: { 
    icon: Package, 
    colorClass: 'text-cyan-400', 
    bgClass: 'bg-cyan-900/30', 
    borderClass: 'border-cyan-700/50',
    label: 'Context'
  },
  function: { 
    icon: Zap, 
    colorClass: 'text-cyan-400', 
    bgClass: 'bg-cyan-900/30', 
    borderClass: 'border-cyan-700/50',
    label: 'Function'
  },
  cookies: { 
    icon: Package, 
    colorClass: 'text-orange-400', 
    bgClass: 'bg-orange-900/30', 
    borderClass: 'border-orange-700/50',
    label: 'Cookies'
  },
  node: { 
    icon: Link, 
    colorClass: 'text-green-400', 
    bgClass: 'bg-green-900/30', 
    borderClass: 'border-green-700/50',
    label: 'Node Reference'
  },
  unknown: { 
    icon: Variable, 
    colorClass: 'text-gray-400', 
    bgClass: 'bg-gray-800/30', 
    borderClass: 'border-gray-700/50',
    label: 'Unknown'
  },
};

export default function VariableToken({ 
  type, 
  category, 
  name, 
  fullValue, 
  onDelete,
  onUpdate,
  editable = true,
  variableCategories,
  currentNodeId,
}: VariableTokenProps) {
  const config = TOKEN_CONFIG[type] || TOKEN_CONFIG.unknown;
  const Icon = config.icon;
  
  const [showPicker, setShowPicker] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const tokenRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Calculate popup position when showing
  useEffect(() => {
    if (showPicker && tokenRef.current) {
      const rect = tokenRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const popupHeight = 400; // Approximate height
      const popupWidth = 320;
      
      let top = rect.bottom + 4;
      let left = rect.left;
      
      // Flip to top if not enough space below
      if (top + popupHeight > viewportHeight - 20) {
        top = rect.top - popupHeight - 4;
      }
      
      // Keep within viewport bounds
      if (top < 20) top = 20;
      if (left + popupWidth > viewportWidth - 20) {
        left = viewportWidth - popupWidth - 20;
      }
      if (left < 20) left = 20;
      
      setPopupPosition({ top, left });
    }
  }, [showPicker]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
          tokenRef.current && !tokenRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (editable) {
      setShowPicker(true);
    }
  };

  const handleVariableSelect = (newValue: string) => {
    if (onUpdate) {
      // Parse the new value to extract type and name
      const habitsMatch = newValue.match(/\{\{habits\.(input|headers|request|env|context|function|cookies)\.([^}]+)\}\}/);
      const nodeMatch = newValue.match(/\{\{([a-zA-Z0-9_-]+)\.([^}]+)\}\}/);
      
      if (habitsMatch) {
        onUpdate(newValue, habitsMatch[1] as TokenType, habitsMatch[2]);
      } else if (nodeMatch) {
        onUpdate(newValue, 'node', nodeMatch[2]);
      } else {
        onUpdate(newValue, 'unknown', newValue);
      }
    }
    setShowPicker(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
    setShowPicker(false);
  };

  return (
    <>
      <span
        ref={tokenRef}
        contentEditable={false}
        data-variable={fullValue}
        data-type={type}
        onClick={handleClick}
        className={`
          inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5
          rounded border ${config.bgClass} ${config.borderClass}
          text-xs font-mono
          ${editable ? 'cursor-pointer hover:ring-1 hover:ring-white/30' : 'cursor-default'}
          select-none
          transition-all
        `}
        title={editable ? 'Click to change' : fullValue}
        suppressContentEditableWarning
      >
        <Icon className={`w-3 h-3 ${config.colorClass} shrink-0`} />
        <span className={config.colorClass}>
          {category}:
        </span>
        <span className="text-white font-medium">
          {name}
        </span>
      </span>

      {/* Variable Picker Popup - rendered via portal */}
      {showPicker && ReactDOM.createPortal(
        <div 
          ref={popoverRef}
          className="fixed z-9999 bg-slate-900 border border-slate-600 rounded-lg shadow-2xl overflow-hidden"
          style={{ top: popupPosition.top, left: popupPosition.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with current value and delete */}
          <div className="p-2 border-b border-slate-700 bg-slate-800">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-400">Current:</div>
                <code className="text-xs text-blue-400 truncate block">{fullValue}</code>
              </div>
              <button
                onClick={handleDelete}
                className="p-1.5 text-red-400 hover:bg-red-900/30 rounded transition-colors shrink-0"
                title="Delete variable"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowPicker(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-700 rounded transition-colors shrink-0"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Inline Variable Picker */}
          <div className="w-80">
            <VariablePicker
              onSelect={handleVariableSelect}
              categories={variableCategories}
              currentNodeId={currentNodeId}
              embedded
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
