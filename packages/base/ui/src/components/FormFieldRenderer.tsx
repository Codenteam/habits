import React, { useMemo } from 'react';
import { FormField } from '../lib/formBuilder/types';
import { FormBuilderAPI } from '../lib/formBuilderAPI';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setNodeFieldValue, setNodeFieldLoading, setNodeFieldOptions, setNodeCachedOptions, setNodeFieldRefreshing, selectSelectedNode, selectNodeFormState } from '../store/slices/workflowSlice';

interface FormFieldRendererProps {
  field: FormField;
  nodeId?: string;
  className?: string;
}

export const FormFieldRenderer: React.FC<FormFieldRendererProps> = ({
  field,
  nodeId: propNodeId,
  className = '',
}) => {
  const dispatch = useAppDispatch();
  const selectedNode = useAppSelector(selectSelectedNode);
  const nodeId = propNodeId || selectedNode?.id || '';
  
  // Create a memoized selector for this node's form state
  const nodeFormStateSelector = useMemo(() => selectNodeFormState(nodeId), [nodeId]);
  const nodeFormState = useAppSelector(nodeFormStateSelector);
  
  const fields = nodeFormState?.fields || {};
  const selectedAction = nodeFormState?.selectedAction || null;
  const refreshingFields = nodeFormState?.refreshingFields || [];
  
  // Get module info from the selected node's data
  const module = selectedNode?.data ? {
    framework: selectedNode.data.framework,
    name: selectedNode.data.module
  } : null;
  
  // Helper functions
  const getFormValues = () => {
    const values: Record<string, any> = {};
    Object.entries(fields).forEach(([fieldId, fieldState]) => {
      values[fieldId] = fieldState.value;
    });
    return values;
  };
  
  const isFieldRefreshing = (fieldId: string) => refreshingFields.includes(fieldId);

  const fieldState = fields[field.id] || { value: '', error: undefined, isDirty: false, isLoading: false, options: [] };
  const { value, error, isLoading } = fieldState;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_options, _setOptions] = React.useState(field.resolvedOptions?.options || fieldState.options || []);

  const onChange = (newValue: any) => {
    if (nodeId) {
      dispatch(setNodeFieldValue({ nodeId, fieldId: field.id, value: newValue }));
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (!module || !selectedAction || !nodeId) {
      return;
    }

    const formValues = getFormValues();

    try {
      dispatch(setNodeFieldRefreshing({ nodeId, fieldId: field.id, refreshing: true }));
      dispatch(setNodeFieldLoading({ nodeId, fieldId: field.id, loading: true }));
      
      // Skip cache for manual refresh to get fresh data
      const newOptions = await FormBuilderAPI.populateOptions(
        module.framework,
        module.name,
        selectedAction,
        field.id!,
        formValues
      );

      // Update cache with fresh options
      const cacheKey = `${module.framework}:${module.name}:${selectedAction}:${field.id}:${JSON.stringify(formValues)}`;
      dispatch(setNodeCachedOptions({ nodeId, key: cacheKey, options: newOptions }));
      
      // Update the field's resolved options
      _setOptions(newOptions);
      dispatch(setNodeFieldOptions({ nodeId, fieldId: field.id, options: newOptions }));
      
      if (field.resolvedOptions) {
        field.resolvedOptions.options = newOptions;
      } else {
        field.resolvedOptions = { options: newOptions };
      }
    } catch (error) {
      console.error('Error manually refreshing options for field:', field.id, error);
    } finally {
      dispatch(setNodeFieldRefreshing({ nodeId, fieldId: field.id, refreshing: false }));
      dispatch(setNodeFieldLoading({ nodeId, fieldId: field.id, loading: false }));
    }
  };


  const renderField = () => {
    switch (field.type) {
      case 'SHORT_TEXT':
        return (
          <input
            type="text"
            name={field.id}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Enter ${field.displayName.toLowerCase()}`}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case 'LONG_TEXT':
        return (
          <textarea
            value={value || ''}
            name={field.id}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Enter ${field.displayName.toLowerCase()}`}
            rows={4}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case 'NUMBER':
        return (
          <input
            type="number"
            name={field.id}
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case 'CHECKBOX':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name={field.id}
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-slate-300">{field.displayName}</span>
          </label>
        );

      case 'DROPDOWN':
      case 'STATIC_DROPDOWN':
        const dropdownOptions = field?.options?.options?.length ? field?.options.options : (field.resolvedOptions?.options || []);
        const canRefresh = true;
        
        return (
          <div className="flex items-center space-x-2">
            <select
              value={value || ''}
              name={field.id}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={field.options?.disabled || isLoading || isRefreshing}
            >
              <option value="">
                {(isLoading || isRefreshing) ? 'Loading options...' : `Select ${field.displayName.toLowerCase()}...`}
              </option>
              {dropdownOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {canRefresh && (
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isLoading || isRefreshing}
                className="px-3 py-2 text-slate-400 hover:text-slate-200 bg-slate-700 border border-slate-600 hover:border-slate-500 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                title="Refresh options"
              >
                <svg 
                  className={`w-4 h-4 ${(isLoading || isRefreshing) ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
        );

      case 'SECRET_TEXT':
        return (
          <input
            type="password"
            name={field.id}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Enter ${field.displayName.toLowerCase()}`}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case 'FILE':
        return (
          <input
            type="file"
            name={field.id}
            onChange={(e) => onChange(e.target.files?.[0])}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-200 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-slate-600 file:text-slate-200 hover:file:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case 'JSON':
        return (
          <textarea
          name={field.id}
            value={value ? JSON.stringify(value, null, 2) : ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(parsed);
              } catch {
                // Keep raw value if invalid JSON
                onChange(e.target.value);
              }
            }}
            placeholder={field.placeholder || 'Enter valid JSON'}
            rows={6}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
        );

      case 'OBJECT':
        return (
          <ObjectFieldRenderer
            properties={field.properties || {}}
          />
        );

      case 'ARRAY':
        return (
          <ArrayFieldRenderer
            field={field}
            value={value || []}
            onChange={onChange}
          />
        );

      case 'DATE':
        return (
          <input
            type="date"
            name={field.id}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case 'TIME':
        return (
          <input
            type="time"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case 'DATE_TIME':
        return (
          <input
            type="datetime-local"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case 'DYNAMIC':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Dynamic ${field.displayName.toLowerCase()}`}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case 'BRANCH_CONDITIONS':
        return (
          <BranchConditionsRenderer
            value={value || []}
            onChange={onChange}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );
    }
  };

  const errorText = Array.isArray(error) ? error.join(', ') : error;
  const isRefreshing = isFieldRefreshing(field.id);

  // Don't render label for checkbox as it's handled internally
  if (field.type === 'CHECKBOX') {
    return (
      <div className={`form-field ${className}`}>
        <div className="relative">
          {renderField()}
          {(isLoading || isRefreshing) && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          )}
        </div>
        {field.description && (
          <p className="mt-1 text-xs text-slate-400">{field.description}</p>
        )}
        {errorText && (
          <p className="mt-1 text-sm text-red-400">{errorText}</p>
        )}
        {/* Show refresher note for checkbox dropdown fields that have refreshers but no options */}
        {field.refreshers && field.refreshers.length > 0 &&  
         (!field.resolvedOptions?.options || field.resolvedOptions.options.length === 0) && 
         getFormValues() && !isRefreshing && (
          <p className="mt-1 text-xs text-amber-400 bg-amber-900/30 px-2 py-1 rounded border border-amber-700">
            💡 This field's options will populate when you fill in: {field.refreshers.map(refresher => {
              const refresherValue = getFormValues()[refresher];
              const isEmpty = refresherValue === undefined || refresherValue === null || refresherValue === '';
              return isEmpty ? `"${refresher}"` : null;
            }).filter(Boolean).join(', ')}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`form-field ${className}`}>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        {field.displayName}
        {field.required && <span className="text-red-400 ml-1">*</span>}
        {(isLoading || isRefreshing) && (
          <span className="ml-2 inline-flex items-center">
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent"></div>
            <span className="ml-1 text-xs text-blue-600">Loading...</span>
          </span>
        )}
      </label>
      <div className="relative">
        {renderField()}
        {(isLoading || isRefreshing) && !(field.type === 'DROPDOWN' || field.type === 'STATIC_DROPDOWN') && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        )}
      </div>
      {field.description && (
        <p className="mt-1 text-xs text-slate-400">{field.description}</p>
      )}
      {errorText && (
        <p className="mt-1 text-sm text-red-400">{errorText}</p>
      )}
      {/* Show refresher note for dropdown fields that have refreshers but no options */}
      {field.refreshers && field.refreshers.length > 0 && 
       (field.type === 'DROPDOWN' || field.type === 'STATIC_DROPDOWN') && 
       (!field.resolvedOptions?.options || field.resolvedOptions.options.length === 0) && 
       getFormValues() && !isRefreshing && (
        <p className="mt-1 text-xs text-amber-400 bg-amber-900/30 px-2 py-1 rounded border border-amber-700">
          💡 This field's options will populate when you fill in: {field.refreshers.map(refresher => {
            const refresherValue = getFormValues()[refresher];
            const isEmpty = refresherValue === undefined || refresherValue === null || refresherValue === '';
            return isEmpty ? `"${refresher}"` : null;
          }).filter(Boolean).join(', ')}
        </p>
      )}
    </div>
  );
};

// Object field renderer for nested properties
const ObjectFieldRenderer: React.FC<{
  properties: Record<string, FormField>;
}> = ({ properties }) => {


  return (
    <div className="border border-slate-600 rounded-md p-4 space-y-4 bg-slate-800/50">
      {Object.entries(properties).map(([key, field]) => (
        <FormFieldRenderer
          key={key}
          field={field}
        />
      ))}
    </div>
  );
};

// Branch Conditions renderer for If/Conditional bit
interface BranchCondition {
  label?: string;
  value1: string;
  operator: string;
  value2: string;
  output?: string;
}

const BRANCH_OPERATORS = [
  { label: 'Equals (==)', value: 'equals' },
  { label: 'Not Equals (!=)', value: 'notEquals' },
  { label: 'Greater Than (>)', value: 'greaterThan' },
  { label: 'Greater Than or Equal (>=)', value: 'greaterThanOrEqual' },
  { label: 'Less Than (<)', value: 'lessThan' },
  { label: 'Less Than or Equal (<=)', value: 'lessThanOrEqual' },
  { label: 'Contains', value: 'contains' },
  { label: 'Does Not Contain', value: 'notContains' },
  { label: 'Starts With', value: 'startsWith' },
  { label: 'Ends With', value: 'endsWith' },
  { label: 'Is Empty', value: 'isEmpty' },
  { label: 'Is Not Empty', value: 'isNotEmpty' },
  { label: 'Is Null/Undefined', value: 'isNull' },
  { label: 'Is Not Null/Undefined', value: 'isNotNull' },
  { label: 'Regex Match', value: 'regex' },
];

const BranchConditionsRenderer: React.FC<{
  value: BranchCondition[];
  onChange: (value: BranchCondition[]) => void;
}> = ({ value, onChange }) => {
  const conditions = Array.isArray(value) ? value : [];

  const addCondition = () => {
    onChange([...conditions, { value1: '', operator: 'equals', value2: '', output: '' }]);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, field: keyof BranchCondition, fieldValue: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: fieldValue };
    onChange(newConditions);
  };

  const getConditionLabel = (index: number) => {
    if (index === 0) return 'If';
    return 'Else If';
  };

  // Check if operator needs value2
  const needsValue2 = (operator: string) => {
    return !['isEmpty', 'isNotEmpty', 'isNull', 'isNotNull'].includes(operator);
  };

  return (
    <div className="space-y-4">
      {/* Condition count header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">
          {conditions.length} condition{conditions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {conditions.map((condition, index) => (
        <div key={index} className="border border-slate-600 rounded-md p-3 bg-slate-800/50 space-y-3">
          {/* Condition header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-400">
              {getConditionLabel(index)}
            </span>
            {conditions.length > 1 && (
              <button
                type="button"
                onClick={() => removeCondition(index)}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                Remove
              </button>
            )}
          </div>

          {/* Value 1, Operator, Value 2 - inline */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">Value 1</label>
              <input
                type="text"
                value={condition.value1 || ''}
                onChange={(e) => updateCondition(index, 'value1', e.target.value)}
                placeholder="First value"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div className="w-40">
              <label className="block text-xs text-slate-400 mb-1">Operator</label>
              <select
                value={condition.operator || 'equals'}
                onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                className="w-full px-2 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {BRANCH_OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>
            {needsValue2(condition.operator) && (
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Value 2</label>
                <input
                  type="text"
                  value={condition.value2 || ''}
                  onChange={(e) => updateCondition(index, 'value2', e.target.value)}
                  placeholder="Second value"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            )}
          </div>

          {/* Output and Branch Label - inline */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">Output (optional)</label>
              <input
                type="text"
                value={condition.output || ''}
                onChange={(e) => updateCondition(index, 'output', e.target.value)}
                placeholder="Value to return when matched"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div className="w-36">
              <label className="block text-xs text-slate-400 mb-1">Branch Label</label>
              <input
                type="text"
                value={condition.label || ''}
                onChange={(e) => updateCondition(index, 'label', e.target.value)}
                placeholder={`branch_${index}`}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        </div>
      ))}

      {/* Add condition button */}
      <button
        type="button"
        onClick={addCondition}
        className="w-full px-4 py-2 text-blue-400 hover:text-blue-300 bg-slate-700 border border-blue-700 hover:border-blue-500 rounded-md text-sm flex items-center justify-center gap-2"
      >
        <span>+</span> Add Condition
      </button>
    </div>
  );
};

// Array field renderer for repeatable items
const ArrayFieldRenderer: React.FC<{
  field: FormField;
  value: any[];
  onChange: (value: any[]) => void;
}> = ({ value, onChange }) => {
  const addItem = () => {
    onChange([...value, '']);
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, itemValue: any) => {
    const newValue = [...value];
    newValue[index] = itemValue;
    onChange(newValue);
  };

  return (
    <div className="space-y-3">
      {value.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <div className="flex-1">
            <input
              type="text"
              value={item || ''}
              onChange={(e) => updateItem(index, e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={`Item ${index + 1}`}
            />
          </div>
          <button
            type="button"
            onClick={() => removeItem(index)}
            className="px-3 py-2 text-red-400 hover:text-red-300 bg-slate-700 border border-red-700 hover:border-red-500 rounded-md"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="px-4 py-2 text-blue-400 hover:text-blue-300 bg-slate-700 border border-blue-700 hover:border-blue-500 rounded-md"
      >
        Add Item
      </button>
    </div>
  );
};