import React, { useRef, useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Code, Trash2, X } from 'lucide-react';
import VariablePicker, { VariableCategory } from './VariablePicker';
import { 
  parseVariableSegments, 
  VARIABLE_TOKEN_STYLES, 
  type VariableSegment,
} from '@ha-bits/core';

export interface RichTextAreaProps {
  /** Controlled value (takes precedence over defaultValue) */
  value?: string;
  /** Default value for uncontrolled mode */
  defaultValue?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  maxHeight?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** For ReactFlow compatibility */
  stopPropagation?: boolean;
  /** Categories for variable picker */
  variableCategories?: VariableCategory[];
  /** Current node ID to exclude from node list */
  currentNodeId?: string;
  /** Show variable picker button */
  showVariablePicker?: boolean;
}

// Use VariableSegment as Segment for internal use
type Segment = VariableSegment;

// Use shared parser from core (aliased for backwards compatibility)
const parseTextToSegments = parseVariableSegments;

// Extract raw text from contentEditable element
function extractRawText(element: HTMLElement): string {
  const segments: string[] = [];
  
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      segments.push(node.textContent || '');
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      // Check if it's a variable token
      if (el.hasAttribute('data-variable')) {
        segments.push(el.getAttribute('data-variable') || '');
      } else {
        // Recursively walk children
        node.childNodes.forEach(walk);
      }
    }
  };
  
  walk(element);
  return segments.join('');
}

export default function RichTextArea({
  value,
  defaultValue,
  onChange,
  placeholder = 'Enter text...',
  className = '',
  minHeight = '80px',
  maxHeight = '400px',
  disabled = false,
  autoFocus = false,
  stopPropagation = false,
  variableCategories,
  currentNodeId,
  showVariablePicker = true,
}: RichTextAreaProps) {
  // Use value if provided (controlled), otherwise use defaultValue (uncontrolled)
  const initialValue = value !== undefined ? value : (defaultValue || '');
  const stringValue = typeof initialValue === 'string' ? initialValue : String(initialValue || '');
  
  const editorRef = useRef<HTMLDivElement>(null);
  const floatingPickerRef = useRef<HTMLDivElement>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<{ top: number; left: number } | null>(null);
  const [segments, setSegments] = useState<Segment[]>(() => parseTextToSegments(stringValue));
  const [renderKey, setRenderKey] = useState(0); // Force re-render key to avoid React/ContentEditable conflicts
  const [isFocused, setIsFocused] = useState(false);
  const [codeMode, setCodeMode] = useState(false); // Toggle between rich editor and raw textarea
  const [rawText, setRawText] = useState(stringValue); // For code mode textarea
  const lastValueRef = useRef(stringValue);
  const lastDefaultValueRef = useRef(defaultValue);
  const isInternalChange = useRef(false);
  const savedCursorPosition = useRef<number | null>(null);
  
  // Token editing state (for event delegation approach)
  const [editingToken, setEditingToken] = useState<{ fullValue: string; position: { top: number; left: number } } | null>(null);
  const tokenPopoverRef = useRef<HTMLDivElement>(null);

  // Helper to get current cursor position as offset in raw text
  const getCurrentCursorOffset = useCallback((): number | null => {
    if (!editorRef.current) return null;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.startContainer)) return null;
    
    // Walk the DOM to calculate offset
    let offset = 0;
    let found = false;
    
    const walk = (node: Node): boolean => {
      if (found) return true;
      
      if (node === range.startContainer) {
        if (node.nodeType === Node.TEXT_NODE) {
          offset += range.startOffset;
        }
        found = true;
        return true;
      }
      
      if (node.nodeType === Node.TEXT_NODE) {
        offset += node.textContent?.length || 0;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.hasAttribute('data-variable')) {
          offset += el.getAttribute('data-variable')?.length || 0;
        } else {
          for (const child of Array.from(node.childNodes)) {
            if (walk(child)) return true;
          }
        }
      }
      return false;
    };
    
    walk(editorRef.current);
    return found ? offset : null;
  }, []);

  // Save cursor position on selection change
  useEffect(() => { 
    const handleSelectionChange = () => {
      if (!editorRef.current) return;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
        const pos = getCurrentCursorOffset();
        if (pos !== null) {
          savedCursorPosition.current = pos;
        }
      }
    };
    
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [getCurrentCursorOffset]);

  // Close floating picker on outside click
  useEffect(() => { 
    if (!showPicker) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (floatingPickerRef.current && !floatingPickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
        setPickerPosition(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  // Update segments when value/defaultValue changes externally
  useEffect(() => { 
    // Skip if this is a result of our own onChange
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    
    // For controlled mode: sync with value
    if (value !== undefined) {
      const newStringValue = typeof value === 'string' ? value : String(value || '');
      if (newStringValue !== lastValueRef.current) {
        setSegments(parseTextToSegments(newStringValue));
        setRenderKey(k => k + 1);
        setRawText(newStringValue);
        lastValueRef.current = newStringValue;
      }
    } 
    // For uncontrolled mode: sync when defaultValue actually changes from parent
    else if (defaultValue !== lastDefaultValueRef.current) {
      const newStringValue = typeof defaultValue === 'string' ? defaultValue : String(defaultValue || '');
      setSegments(parseTextToSegments(newStringValue));
      setRenderKey(k => k + 1);
      setRawText(newStringValue);
      lastValueRef.current = newStringValue;
      lastDefaultValueRef.current = defaultValue;
    }
  }, [value, defaultValue]);

  // Handle input changes
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    
    const extractedText = extractRawText(editorRef.current);
    
    // Don't re-render segments on input - let contentEditable manage DOM naturally
    // Just update the ref and call onChange
    lastValueRef.current = extractedText;
    setRawText(extractedText);
    isInternalChange.current = true; // Mark as internal change to prevent useEffect from re-rendering
    onChange(extractedText);

  }, [onChange]);

  // Handle variable selection from picker
  const handleVariableSelect = useCallback((variable: string) => {
    if (!editorRef.current) return;
    
    // Use the maintained value ref instead of extracting from DOM
    // This ensures we don't accidentally include placeholder text
    const currentText = lastValueRef.current;
    
    // Helper function to insert at a specific position
    const insertAt = (position: number) => {
      let insertPos = position;
      let textBefore = currentText.slice(0, insertPos);
    
      
      const textAfter = currentText.slice(position);
      const newText = textBefore + variable + textAfter;
      
      isInternalChange.current = true;
      onChange(newText);
      setSegments(parseTextToSegments(newText));
      setRenderKey(k => k + 1);
      setRawText(newText);
      lastValueRef.current = newText;
    };
    
    // Try to get current cursor position first
    let cursorOffset = getCurrentCursorOffset();
    
    // If no current selection in editor, use saved position
    if (cursorOffset === null && savedCursorPosition.current !== null) {
      cursorOffset = savedCursorPosition.current;
    }
    
    // If we have a valid position, insert there; otherwise append to end
    if (cursorOffset !== null && cursorOffset >= 0 && cursorOffset <= currentText.length) {
      insertAt(cursorOffset);
    } else {
      // Append to end as fallback
      const newText = currentText + variable;
      isInternalChange.current = true;
      onChange(newText);
      setSegments(parseTextToSegments(newText));
      setRenderKey(k => k + 1);
      setRawText(newText);
      lastValueRef.current = newText;
    }
    
    setShowPicker(false);
    setPickerPosition(null);
    
    // Refocus editor
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
    }, 0);
  }, [onChange, getCurrentCursorOffset]);

  // Handle paste - strip formatting
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  // Handle keydown for special keys
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Close picker on Escape
    if (e.key === 'Escape' && showPicker) {
      e.preventDefault();
      setShowPicker(false);
      setPickerPosition(null);
      return;
    }
    
    // Open picker on CMD/CTRL + Space
    if (e.key === ' ' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      
      if (!editorRef.current) return;
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const editorRect = editorRef.current.getBoundingClientRect();
        
        setPickerPosition({
          top: rect.bottom - editorRect.top + 5,
          left: rect.left - editorRect.left,
        });
        setShowPicker(true);
      }
    }
  }, [showPicker]);

  // Handle token update (name or type change)
  const handleTokenUpdate = useCallback((oldFullValue: string, newFullValue: string) => {
    const currentText = lastValueRef.current;
    const newText = currentText.replace(oldFullValue, newFullValue);
    
    isInternalChange.current = true;
    onChange(newText);
    setSegments(parseTextToSegments(newText));
    setRenderKey(k => k + 1);
    setRawText(newText);
    lastValueRef.current = newText;
  }, [onChange]);

  // Handle token delete
  const handleTokenDelete = useCallback((fullValue: string) => {
    const currentText = lastValueRef.current;
    const newText = currentText.replace(fullValue, '');
    
    isInternalChange.current = true;
    onChange(newText);
    setSegments(parseTextToSegments(newText));
    setRenderKey(k => k + 1);
    setRawText(newText);
    lastValueRef.current = newText;
    setEditingToken(null);
  }, [onChange]);

  // For debugging purposes
  useEffect(()=>{
  }, [renderKey])
  // Auto-focus
  useEffect(() => { 
    if (autoFocus && editorRef.current) {
      editorRef.current.focus();
    }
  }, [autoFocus]);

  // Close token popover when clicking outside
  useEffect(() => {
    if (!editingToken) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (tokenPopoverRef.current && !tokenPopoverRef.current.contains(e.target as Node)) {
        setEditingToken(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingToken]);

  // Use shared token styles from core (aliased for local use)
  const TOKEN_STYLES = VARIABLE_TOKEN_STYLES;

  // Convert segments to HTML string (avoids React reconciliation issues with contentEditable)
  const segmentsToHtml = useCallback(() => {
    return segments.map((segment) => {
      if (segment.type === 'text') {
        const textContent = typeof segment.content === 'string' ? segment.content : String(segment.content || '');
        // Escape HTML entities
        const escaped = textContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return escaped;
      } else {
        const style = TOKEN_STYLES[segment.tokenType] || TOKEN_STYLES.unknown;
        // Return HTML string for token - NO React reconciliation needed
        return `<span contenteditable="false" data-variable="${segment.fullValue}" data-type="${segment.tokenType}" class="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded border ${style.bgClass} ${style.borderClass} text-xs font-mono cursor-pointer hover:ring-1 hover:ring-white/30 select-none transition-all"><span class="${style.colorClass}">${segment.category}:</span><span class="text-white font-medium">${segment.name}</span></span>`;
      }
    }).join('');
  }, [segments]);

  const isEmpty = rawText.length === 0;

  // Handle click on contentEditable - detect token clicks
  const handleEditorClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (stopPropagation) e.stopPropagation();
    
    const target = e.target as HTMLElement;
    // Check if clicked on a token or its child
    const tokenEl = target.closest('[data-variable]') as HTMLElement;
    if (tokenEl && !disabled) {
      e.preventDefault();
      const fullValue = tokenEl.getAttribute('data-variable') || '';
      const rect = tokenEl.getBoundingClientRect();
      
      // Calculate position for popup
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const popupHeight = 400;
      const popupWidth = 320;
      
      let top = rect.bottom + 4;
      let left = rect.left;
      
      if (top + popupHeight > viewportHeight - 20) {
        top = rect.top - popupHeight - 4;
      }
      if (top < 20) top = 20;
      if (left + popupWidth > viewportWidth - 20) {
        left = viewportWidth - popupWidth - 20;
      }
      if (left < 20) left = 20;
      
      setEditingToken({ fullValue, position: { top, left } });
    }
  }, [disabled, stopPropagation]);

  // Handle variable select from token edit popup
  const handleTokenVariableSelect = useCallback((newValue: string) => {
    if (editingToken) {
      handleTokenUpdate(editingToken.fullValue, newValue);
      setEditingToken(null);
    }
  }, [editingToken, handleTokenUpdate]);

  // Handle raw textarea change in code mode
  const handleCodeModeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    isInternalChange.current = true;
    onChange(newText);
    setSegments(parseTextToSegments(newText));
    setRawText(newText);
    lastValueRef.current = newText;
  }, [onChange]);

  return (
    <div className={`relative ${className}`}>
      {/* Top right controls */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        {/* Code mode toggle */}
        <button
          type="button"
          onClick={() => setCodeMode(!codeMode)}
          disabled={disabled}
          className={`
            p-1.5 rounded transition-colors
            ${codeMode 
              ? 'bg-blue-600 text-white' 
              : 'bg-slate-700 text-slate-400 hover:text-white hover:bg-slate-600'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          title={codeMode ? 'Switch to rich editor' : 'Switch to code view'}
        >
          {codeMode ? <Code size={14} /> : <Code size={14} />}
        </button>
        
        {/* Variable picker button - only show in rich mode */}
        {showVariablePicker && !codeMode && (
          <VariablePicker
            onSelect={handleVariableSelect}
            categories={variableCategories}
            currentNodeId={currentNodeId}
            size="sm"
            disabled={disabled}
          />
        )}
      </div>

      {/* Code mode: plain textarea */}
      {codeMode ? (
        <textarea
          value={rawText}
          onChange={handleCodeModeChange}
          placeholder={placeholder}
          disabled={disabled}
          onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
          onMouseDown={stopPropagation ? (e) => e.stopPropagation() : undefined}
          className={`
            w-full px-3 py-2 pr-16 block
            bg-slate-950 text-green-400 font-mono
            border border-slate-600 rounded-md
            focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
            overflow-y-auto resize-y
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${stopPropagation ? 'nodrag nowheel' : ''}
            text-sm leading-relaxed
          `}
          style={{ 
            minHeight, 
            maxHeight,
          }}
        />
      ) : (
        /* Rich text editor - using dangerouslySetInnerHTML to avoid React/contentEditable conflicts */
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onClick={handleEditorClick}
          onMouseDown={stopPropagation ? (e) => e.stopPropagation() : undefined}
          className={`
            w-full px-3 py-2 pr-16
            bg-slate-900 text-white
            border border-slate-600 rounded-md
            focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
            overflow-y-auto resize-y
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
            ${stopPropagation ? 'nodrag nowheel' : ''}
            text-sm leading-relaxed
          `}
          style={{ 
            minHeight, 
            maxHeight,
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
          }}
          suppressContentEditableWarning
          dangerouslySetInnerHTML={{
            __html: isEmpty && !isFocused 
              ? `<span class="text-slate-500 pointer-events-none select-none">${placeholder}</span>`
              : segmentsToHtml()
          }}
        />
      )}

      {/* Token edit popup - rendered via portal */}
      {editingToken && ReactDOM.createPortal(
        <div
          ref={tokenPopoverRef}
          className="fixed z-[9999] bg-slate-900 border border-slate-600 rounded-lg shadow-2xl overflow-hidden"
          style={{ top: editingToken.position.top, left: editingToken.position.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with current value and delete */}
          <div className="p-2 border-b border-slate-700 bg-slate-800">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-400">Current:</div>
                <code className="text-xs text-blue-400 truncate block">{editingToken.fullValue}</code>
              </div>
              <button
                onClick={() => { handleTokenDelete(editingToken.fullValue); }}
                className="p-1.5 text-red-400 hover:bg-red-900/30 rounded transition-colors shrink-0"
                title="Delete variable"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditingToken(null)}
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
              onSelect={handleTokenVariableSelect}
              categories={variableCategories}
              currentNodeId={currentNodeId}
              embedded
            />
          </div>
        </div>,
        document.body
      )}

      {/* Floating variable picker dropdown (when triggered by {{ in rich mode) */}
      {!codeMode && showPicker && pickerPosition && (
        <div
          ref={floatingPickerRef}
          className="absolute z-50"
          style={{
            top: `${pickerPosition.top}px`,
            left: `${pickerPosition.left}px`,
          }}
        >
          <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-2 max-w-xs">
            <VariablePicker
              onSelect={handleVariableSelect}
              categories={variableCategories}
              currentNodeId={currentNodeId}
              size="sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
