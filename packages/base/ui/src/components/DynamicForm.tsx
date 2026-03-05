import React from 'react';
import VariablePicker, { VariableCategory } from './VariablePicker';

interface FormField {
  name: string;
  displayName: string;
  type: string;
  required?: boolean;
  default?: any;
  options?: Array<{ name: string; value: any }>;
  description?: string;
  placeholder?: string;
  /** Disable variable picker for this field */
  disableVariables?: boolean;
}

interface DynamicFormProps {
  fields: FormField[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  className?: string;
  /** Show variable picker buttons for text fields (default: true) */
  showVariablePicker?: boolean;
  /** Custom variable categories to display in the picker */
  variableCategories?: VariableCategory[];
  /** Additional variable categories to append to defaults */
  additionalVariableCategories?: VariableCategory[];
  /** Current node ID to exclude from available nodes */
  currentNodeId?: string;
}

export default function DynamicForm({ 
  fields, 
  values, 
  onChange, 
  className = '',
  showVariablePicker = true,
  variableCategories,
  additionalVariableCategories,
  currentNodeId,
}: DynamicFormProps) {
  // Guard against undefined or non-array fields
  if (!fields || !Array.isArray(fields)) {
    return null;
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    const newValues = { ...values, [fieldName]: value };
    onChange(newValues);
  };

  // Insert variable at the end of current value (or replace if empty)
  const handleVariableInsert = (fieldName: string, currentValue: any, variable: string) => {
    const strValue = currentValue?.toString() || '';
    const newValue = strValue ? `${strValue}${variable}` : variable;
    handleFieldChange(fieldName, newValue);
  };

  // Check if field type supports variable insertion
  const supportsVariables = (fieldType: string): boolean => {
    return ['string', 'text', 'number', 'textarea', 'password', 'email', 'url', 'json'].includes(fieldType);
  };

  // Wrapper component to add variable picker to a field
  const FieldWithPicker = ({ 
    field, 
    children, 
    fieldValue 
  }: { 
    field: FormField; 
    children: React.ReactNode;
    fieldValue: any;
  }) => {
    const showPicker = showVariablePicker && 
                       supportsVariables(field.type) && 
                       !field.disableVariables;

    if (!showPicker) {
      return <>{children}</>;
    }

    // For textarea/json, position picker at top-right
    const isMultiline = field.type === 'textarea' || field.type === 'json';

    return (
      <div className={`relative flex ${isMultiline ? 'flex-col' : 'items-center gap-1'}`}>
        {isMultiline && (
          <div className="absolute top-1 right-1 z-10">
            <VariablePicker
              onSelect={(variable) => handleVariableInsert(field.name, fieldValue, variable)}
              categories={variableCategories}
              additionalCategories={additionalVariableCategories}
              currentNodeId={currentNodeId}
              size="sm"
            />
          </div>
        )}
        <div className="flex-1">
          {children}
        </div>
        {!isMultiline && (
          <VariablePicker
            onSelect={(variable) => handleVariableInsert(field.name, fieldValue, variable)}
            categories={variableCategories}
            additionalCategories={additionalVariableCategories}
            currentNodeId={currentNodeId}
            size="sm"
          />
        )}
      </div>
    );
  };

  const renderField = (field: FormField) => {
    const fieldValue = values[field.name] ?? field.default ?? '';

    switch (field.type) {
      case 'string':
      case 'text':
        return (
          <FieldWithPicker field={field} fieldValue={fieldValue}>
            <input
              type="text"
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder || field.displayName}
              className="w-full px-3 py-2 border border-slate-600 rounded-md bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </FieldWithPicker>
        );

      case 'number':
        return (
          <FieldWithPicker field={field} fieldValue={fieldValue}>
            <input
              type="number"
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.name, e.target.value ? Number(e.target.value) : '')}
              placeholder={field.placeholder || field.displayName}
              className="w-full px-3 py-2 border border-slate-600 rounded-md bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </FieldWithPicker>
        );

      case 'boolean':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={Boolean(fieldValue)}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-600 rounded focus:ring-blue-500 bg-slate-900"
            />
            <span className="ml-2 text-sm text-slate-300">{field.displayName}</span>
          </label>
        );

      case 'select':
      case 'options':
        return (
          <select
            value={fieldValue}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full px-3 py-2 border border-slate-600 rounded-md bg-slate-900 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select {field.displayName}...</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.name}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <FieldWithPicker field={field} fieldValue={fieldValue}>
            <textarea
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder || field.displayName}
              rows={3}
              className="w-full px-3 py-2 pr-8 border border-slate-600 rounded-md bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </FieldWithPicker>
        );

      case 'password':
        return (
          <FieldWithPicker field={field} fieldValue={fieldValue}>
            <input
              type="password"
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder || field.displayName}
              className="w-full px-3 py-2 border border-slate-600 rounded-md bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </FieldWithPicker>
        );

      case 'email':
        return (
          <FieldWithPicker field={field} fieldValue={fieldValue}>
            <input
              type="email"
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder || field.displayName}
              className="w-full px-3 py-2 border border-slate-600 rounded-md bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </FieldWithPicker>
        );

      case 'url':
        return (
          <FieldWithPicker field={field} fieldValue={fieldValue}>
            <input
              type="url"
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder || field.displayName}
              className="w-full px-3 py-2 border border-slate-600 rounded-md bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </FieldWithPicker>
        );

      case 'json':
        return (
          <FieldWithPicker field={field} fieldValue={fieldValue}>
            <textarea
              value={typeof fieldValue === 'string' ? fieldValue : JSON.stringify(fieldValue, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleFieldChange(field.name, parsed);
                } catch {
                  handleFieldChange(field.name, e.target.value);
                }
              }}
              placeholder={field.placeholder || 'Enter JSON...'}
              rows={4}
              className="w-full px-3 py-2 pr-8 border border-slate-600 rounded-md bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </FieldWithPicker>
        );

      default:
        return (
          <FieldWithPicker field={field} fieldValue={fieldValue}>
            <input
              type="text"
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder || field.displayName}
              className="w-full px-3 py-2 border border-slate-600 rounded-md bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </FieldWithPicker>
        );
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {fields.map((field) => (
        <div key={field.name}>
          <label className="flex items-center justify-between text-sm font-medium text-slate-300 mb-1">
            <span>
              {field.displayName}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </span>
            {field.description && (
              <span className="text-xs text-slate-500 italic" dangerouslySetInnerHTML={{ __html: field.description }} />
            )}
          </label>
          {renderField(field)}
        </div>
      ))}
    </div>
  );
}