import React, { useState, useRef, useEffect } from 'react';
import { Variable, ChevronRight, X, GitBranch } from 'lucide-react';
import { useAppSelector } from '../store/hooks';
import { selectNodes } from '../store/slices/workflowSlice';

// Variable category definition - easily extendible
export interface VariableOption {
  name: string;
  value: string;           // The actual value to insert, e.g., "{{habits.input.request}}"
  description: string;
}

export interface VariableCategory {
  id: string;
  label: string;
  description: string;
  icon?: React.ReactNode;
  variables: VariableOption[];
}

// Workflow node reference for node picker
export interface WorkflowNode {
  id: string;
  label?: string;
  type?: string;
  /** Available output fields from this node */
  outputFields?: string[];
}

// Default variable categories - can be extended or overridden
export const DEFAULT_VARIABLE_CATEGORIES: VariableCategory[] = [
  {
    id: 'input',
    label: 'Request Input',
    description: 'Data from CLI arguments or HTTP POST requests',
    variables: [
      // {
      //   name: 'Request Body',
      //   value: '{{habits.input}}',
      //   description: 'Full request body (CLI args or POST body as JSON)',
      // },
      {
        name: 'Request Field',
        value: '{{habits.input.fieldName}}',
        description: 'Access specific field from request body or query params',
      },
      {
        name: 'Header Value',
        value: '{{habits.header.headerName}}',
        description: 'HTTP request header value (case-insensitive)',
      }
    ],
  },
  {
    id: 'env',
    label: 'Environment',
    description: 'Environment variables and secrets',
    variables: [
      {
        name: 'Environment Variable',
        value: '{{habits.env.VAR_NAME}}',
        description: 'Access environment variable by name',
      }
    ],
  },
  {
    id: 'context',
    label: 'Workflow Context',
    description: 'Workflow execution context and metadata',
    variables: [
      {
        name: 'Workflow ID',
        value: '{{habits.context.workflowId}}',
        description: 'Current workflow unique identifier',
      },
      {
        name: 'Workflow Name',
        value: '{{habits.context.workflowName}}',
        description: 'Current workflow display name',
      },
      {
        name: 'Execution ID',
        value: '{{habits.context.executionId}}',
        description: 'Unique ID for this execution run',
      },
      {
        name: 'Timestamp',
        value: '{{habits.context.timestamp}}',
        description: 'Execution start time (ISO format)',
      },
      {
        name: 'Current Node ID',
        value: '{{habits.context.nodeId}}',
        description: 'ID of currently executing node',
      },
    ],
  },
  {
    id: 'function',
    label: 'Functions',
    description: 'Helper functions and utilities',
    variables: [
      {
        name: 'Current Date (ISO)',
        value: '{{habits.function.date()}}',
        description: 'Current date/time in ISO format',
      },
      {
        name: 'Unix Timestamp',
        value: '{{habits.function.timestamp()}}',
        description: 'Current time in milliseconds since epoch',
      },
      {
        name: 'UUID',
        value: '{{habits.function.uuid()}}',
        description: 'Generate a random UUID v4',
      },
      {
        name: 'Random Float',
        value: '{{habits.function.random(0, 1)}}',
        description: 'Random decimal number in range',
      },
      {
        name: 'Random Integer',
        value: '{{habits.function.randomInt(1, 100)}}',
        description: 'Random whole number in range',
      },
    ],
  },
];

interface VariablePickerProps {
  /** Callback when a variable is selected */
  onSelect: (variable: string) => void;
  /** Custom categories to show (defaults to DEFAULT_VARIABLE_CATEGORIES) */
  categories?: VariableCategory[];
  /** Additional categories to append to defaults */
  additionalCategories?: VariableCategory[];
  /** Current node ID to exclude from available nodes */
  currentNodeId?: string;
  /** Button size variant */
  size?: 'sm' | 'md';
  /** Custom button className */
  buttonClassName?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Embedded mode - renders content directly without trigger button */
  embedded?: boolean;
}

// Generate variables for a specific node
function generateNodeVariables(node: WorkflowNode): VariableOption[] {
  const nodeLabel = node.label || node.id;
  const variables: VariableOption[] = [
    {
      name: `${nodeLabel} → Output`,
      value: `{{${node.id}}}`,
      description: `Full output from "${nodeLabel}"`,
    }, 
    // Custom Output, shape {{node-name.something.something}}
    {
      name: `${nodeLabel} → Custom Output`,
      value: `{{${node.id}.fieldName}}`,
      description: `Access specific field from "${nodeLabel}" output (enter field name after selecting)`,
    }
  ];

  // Add specific output fields if available
  if (node.outputFields && node.outputFields.length > 0) {
    for (const field of node.outputFields) {
      variables.push({
        name: `${nodeLabel} → ${field}`,
        value: `{{${node.id}.${field}}}`,
        description: `"${field}" field from "${nodeLabel}"`,
      });
    }
  }

  return variables;
}

export default function VariablePicker({
  onSelect,
  categories,
  additionalCategories = [],
  currentNodeId,
  size = 'sm',
  buttonClassName = '',
  disabled = false,
  embedded = false,
}: VariablePickerProps) {
  const [isOpen, setIsOpen] = useState(embedded); // Auto-open in embedded mode
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingVariable, setPendingVariable] = useState<VariableOption | null>(null);
  const [fieldNameInput, setFieldNameInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldInputRef = useRef<HTMLInputElement>(null);

  // Get nodes from Redux state
  const nodesFromState = useAppSelector(selectNodes);
  
  // Convert nodes to WorkflowNode format and filter out current node
  const previousNodes: WorkflowNode[] = nodesFromState
    .filter(n => n.id !== currentNodeId)
    .map(n => ({
      id: n.id,
      label: n.data?.label || n.id,
      type: n.type,
      outputFields: n.data?.outputFields,
    }));

  // Generate nodes category dynamically if nodes are provided
  const nodesCategory: VariableCategory | null = previousNodes.length > 0 ? {
    id: 'nodes',
    label: 'Previous Nodes',
    description: 'Select a node to reference its output',
    icon: <GitBranch className="w-4 h-4" />,
    variables: [], // We'll show nodes as sub-menu instead
  } : null;

  // Merge categories
  const baseCategories = categories || DEFAULT_VARIABLE_CATEGORIES;
  const allCategories = nodesCategory 
    ? [nodesCategory, ...baseCategories, ...additionalCategories]
    : [...baseCategories, ...additionalCategories];

  // Close on outside click (skip in embedded mode)
  useEffect(() => {
    if (embedded) return; // Don't close on outside click in embedded mode
    
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedCategory(null);
        setSelectedNodeId(null);
        setSearchQuery('');
        setPendingVariable(null);
        setFieldNameInput('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, embedded]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && inputRef.current && !pendingVariable) {
      inputRef.current.focus();
    }
  }, [isOpen, pendingVariable]);

  // Focus field input when showing field prompt
  useEffect(() => {
    if (pendingVariable && fieldInputRef.current) {
      fieldInputRef.current.focus();
    }
  }, [pendingVariable]);

  // Placeholder patterns that need user input
  const PLACEHOLDER_PATTERNS = ['fieldName', 'headerName', 'VAR_NAME'];
  
  // Check if a variable value has a placeholder that needs user input
  const hasPlaceholder = (value: string): string | null => {
    for (const placeholder of PLACEHOLDER_PATTERNS) {
      if (value.includes(placeholder)) {
        return placeholder;
      }
    }
    return null;
  };

  const handleVariableSelect = (variable: VariableOption) => {
    const placeholder = hasPlaceholder(variable.value);
    
    if (placeholder) {
      // Show field name input dialog
      setPendingVariable(variable);
      setFieldNameInput('');
    } else {
      // Insert directly
      onSelect(variable.value);
      setIsOpen(false);
      setSelectedCategory(null);
      setSelectedNodeId(null);
      setSearchQuery('');
    }
  };

  const handleFieldNameSubmit = () => {
    if (!pendingVariable || !fieldNameInput.trim()) return;
    
    const placeholder = hasPlaceholder(pendingVariable.value);
    if (placeholder) {
      const finalValue = pendingVariable.value.replace(placeholder, fieldNameInput.trim());
      onSelect(finalValue);
    }
    
    setIsOpen(false);
    setSelectedCategory(null);
    setSelectedNodeId(null);
    setSearchQuery('');
    setPendingVariable(null);
    setFieldNameInput('');
  };

  const handleFieldNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFieldNameSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setPendingVariable(null);
      setFieldNameInput('');
    }
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (isOpen) {
        setSelectedCategory(null);
        setSelectedNodeId(null);
        setSearchQuery('');
        setPendingVariable(null);
        setFieldNameInput('');
      }
    }
  };

  const handleBack = () => {
    if (pendingVariable) {
      setPendingVariable(null);
      setFieldNameInput('');
    } else if (selectedNodeId) {
      setSelectedNodeId(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    }
  };

  // Filter variables based on search (including node variables)
  const getFilteredVariables = () => {
    if (!searchQuery.trim()) return null;
    
    const results: Array<{ category: VariableCategory; variable: VariableOption; nodeLabel?: string }> = [];
    const query = searchQuery.toLowerCase();
    
    // Search in regular categories
    for (const category of allCategories) {
      if (category.id === 'nodes') continue; // Handle nodes separately
      for (const variable of category.variables) {
        if (
          variable.name.toLowerCase().includes(query) ||
          variable.value.toLowerCase().includes(query) ||
          variable.description.toLowerCase().includes(query)
        ) {
          results.push({ category, variable });
        }
      }
    }

    // Search in node variables
    for (const node of previousNodes) {
      const nodeLabel = node.label || node.id;
      const nodeVars = generateNodeVariables(node);
      for (const variable of nodeVars) {
        if (
          variable.name.toLowerCase().includes(query) ||
          variable.value.toLowerCase().includes(query) ||
          variable.description.toLowerCase().includes(query) ||
          nodeLabel.toLowerCase().includes(query) ||
          node.id.toLowerCase().includes(query)
        ) {
          results.push({ 
            category: nodesCategory!, 
            variable,
            nodeLabel 
          });
        }
      }
    }

    return results;
  };

  const filteredResults = getFilteredVariables();
  const currentCategory = selectedCategory 
    ? allCategories.find(c => c.id === selectedCategory) 
    : null;
  const currentNode = selectedNodeId
    ? previousNodes.find(n => n.id === selectedNodeId)
    : null;
  const currentNodeVariables = currentNode ? generateNodeVariables(currentNode) : [];

  const sizeClasses = size === 'sm' 
    ? 'w-6 h-6 p-1' 
    : 'w-8 h-8 p-1.5';

  // Shared content render function
  const renderContent = () => (
    <>
      {/* Header */}
      <div className="p-2 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-2">
          {(selectedCategory || selectedNodeId || pendingVariable) && (
            <button
              type="button"
              onClick={handleBack}
              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          )}
          {!pendingVariable && (
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search variables..."
              className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          )}
          {pendingVariable && (
            <span className="flex-1 text-sm text-white font-medium truncate">
              Enter field name
            </span>
          )}
          {!embedded && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-h-72 overflow-y-auto">
        {/* Field Name Input Dialog */}
        {pendingVariable && (
          <div className="p-4 space-y-3">
            <div>
              <div className="text-sm text-white font-medium mb-1">{pendingVariable.name}</div>
              <code className="text-xs text-blue-400 block mb-2">{pendingVariable.value}</code>
              <div className="text-xs text-slate-500">{pendingVariable.description}</div>
            </div>
            
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Field name <span className="text-red-400">*</span>
              </label>
              <input
                ref={fieldInputRef}
                type="text"
                value={fieldNameInput}
                onChange={(e) => setFieldNameInput(e.target.value)}
                onKeyDown={handleFieldNameKeyDown}
                placeholder="e.g., email, userId, Authorization"
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                autoComplete="off"
              />
            </div>

            <div className="flex items-center justify-between">
              <code className="text-xs text-slate-500 truncate flex-1">
                {fieldNameInput 
                  ? pendingVariable.value.replace(hasPlaceholder(pendingVariable.value) || '', fieldNameInput)
                  : pendingVariable.value
                }
              </code>
              <button
                type="button"
                onClick={handleFieldNameSubmit}
                disabled={!fieldNameInput.trim()}
                className="ml-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs rounded transition-colors"
              >
                Insert
              </button>
            </div>
          </div>
        )}

        {/* Search Results */}
        {!pendingVariable && filteredResults && filteredResults.length > 0 && (
          <div className="p-2 space-y-1">
            <div className="text-xs text-slate-500 px-2 py-1">
              {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
            </div>
            {filteredResults.map(({ category, variable, nodeLabel }, idx) => (
              <button
                key={`${category.id}-${variable.value}-${idx}`}
                type="button"
                onClick={() => handleVariableSelect(variable)}
                className="w-full text-left p-2 rounded hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white font-medium">{variable.name}</span>
                  <span className="text-xs text-slate-500">{nodeLabel || category.label}</span>
                </div>
                <code className="text-xs text-blue-400 mt-0.5 block truncate">
                  {variable.value}
                </code>
                <div className="text-xs text-slate-500 mt-0.5">{variable.description}</div>
              </button>
            ))}
          </div>
        )}

        {/* No search results */}
        {!pendingVariable && filteredResults && filteredResults.length === 0 && (
          <div className="p-4 text-center text-slate-500 text-sm">
            No variables found matching "{searchQuery}"
          </div>
        )}

        {/* Category List */}
        {!pendingVariable && !filteredResults && !selectedCategory && !selectedNodeId && (
          <div className="p-2 space-y-1">
            {allCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className="w-full text-left p-2 rounded hover:bg-slate-800 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  {category.icon && (
                    <span className="text-slate-400">{category.icon}</span>
                  )}
                  <div>
                    <div className="text-sm text-white font-medium">{category.label}</div>
                    <div className="text-xs text-slate-500">{category.description}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
              </button>
            ))}
          </div>
        )}

        {/* Node List for "nodes" category */}
        {!pendingVariable && !filteredResults && selectedCategory === 'nodes' && !selectedNodeId && (
          <div className="p-2 space-y-1">
            <div className="px-2 py-1 mb-2">
              <div className="text-sm font-semibold text-white">Select a Node</div>
              <div className="text-xs text-slate-500">Choose a previous node to reference its output</div>
            </div>
            {previousNodes.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => setSelectedNodeId(node.id)}
                className="w-full text-left p-2 rounded hover:bg-slate-800 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-sm text-white font-medium">{node.label || node.id}</div>
                    {node.type && (
                      <div className="text-xs text-slate-500">{node.type}</div>
                    )}
                    <code className="text-xs text-slate-600">{node.id}</code>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
              </button>
            ))}
            {previousNodes.length === 0 && (
              <div className="p-4 text-center text-slate-500 text-sm">
                No previous nodes available
              </div>
            )}
          </div>
        )}

        {/* Variables for Selected Node */}
        {!pendingVariable && !filteredResults && selectedNodeId && currentNode && (
          <div className="p-2 space-y-1">
            <div className="px-2 py-1 mb-2">
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-emerald-400" />
                {currentNode.label || currentNode.id}
              </div>
              <code className="text-xs text-slate-500">{currentNode.id}</code>
            </div>
            {currentNodeVariables.map((variable, idx) => (
              <button
                key={`${variable.value}-${idx}`}
                type="button"
                onClick={() => handleVariableSelect(variable)}
                className="w-full text-left p-2 rounded hover:bg-slate-800 transition-colors"
              >
                <div className="text-sm text-white font-medium">{variable.name}</div>
                <code className="text-xs text-blue-400 mt-0.5 block truncate">
                  {variable.value}
                </code>
                <div className="text-xs text-slate-500 mt-0.5">{variable.description}</div>
              </button>
            ))}
          </div>
        )}

        {/* Variable List for Other Categories */}
        {!pendingVariable && !filteredResults && currentCategory && selectedCategory !== 'nodes' && (
          <div className="p-2 space-y-1">
            <div className="px-2 py-1 mb-2">
              <div className="text-sm font-semibold text-white">{currentCategory.label}</div>
              <div className="text-xs text-slate-500">{currentCategory.description}</div>
            </div>
            {currentCategory.variables.map((variable, idx) => (
              <button
                key={`${variable.value}-${idx}`}
                type="button"
                onClick={() => handleVariableSelect(variable)}
                className="w-full text-left p-2 rounded hover:bg-slate-800 transition-colors"
              >
                <div className="text-sm text-white font-medium">{variable.name}</div>
                <code className="text-xs text-blue-400 mt-0.5 block truncate">
                  {variable.value}
                </code>
                <div className="text-xs text-slate-500 mt-0.5">{variable.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Help */}
      <div className="p-2 border-t border-slate-700 bg-slate-800">
        <div className="text-xs text-slate-500">
          Variables use <code className="text-blue-400">{'{{...}}'}</code> syntax. Node refs: <code className="text-emerald-400">{'{{node-id.output}}'}</code>
        </div>
      </div>
    </>
  );

  // Embedded mode - render content directly
  if (embedded) {
    return (
      <div className="w-full bg-slate-900 rounded-lg overflow-hidden" ref={containerRef}>
        {renderContent()}
      </div>
    );
  }

  // Normal mode with trigger button
  return (
    <div className="relative inline-flex" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          ${sizeClasses}
          flex items-center justify-center
          text-slate-400 hover:text-blue-400 
          bg-slate-800 hover:bg-slate-700 
          border border-slate-600 hover:border-blue-500
          rounded transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          ${buttonClassName}
        `}
        title="Insert variable"
      >
        <Variable className="w-full h-full" />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 w-80 bg-slate-900 border border-slate-600 rounded-lg shadow-xl overflow-hidden">
          {renderContent()}
        </div>
      )}
    </div>
  );
}

// Export types for extensibility
export type { VariablePickerProps };
