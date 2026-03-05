import React, { useEffect, useMemo, useState } from 'react';
import {
  FormValue,
  FormErrors,
  FormValidationResult,
  FormField
} from '../lib/formBuilder/types';
import { FormFieldRenderer } from './FormFieldRenderer';
import { AuthSection } from './AuthSection';
import { DebugPanel } from './DebugPanel';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  setNodeSelectedAction,
  setNodeFormValues,
  setNodeFormErrors,
  selectNodeFormState,
  selectSelectedNode
} from '../store/slices/workflowSlice';

interface Module {
  framework: string;
  name: string;
  displayName?: string;
  source: string;
  repository: string;
}

interface FormBuilderProps {
  module: Module;
  nodeId?: string; // Optional nodeId, will use selected node if not provided
  onSubmit: (data: FormValue) => Promise<void>;
  onValidate?: (data: FormValue) => Promise<FormValidationResult>;
  initialValues?: FormValue;
  showAuth?: boolean;
  showDebug?: boolean;
  className?: string;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({
  module,
  nodeId: propNodeId,
  onSubmit,
  onValidate,
  initialValues = {},
  showAuth = true,
  showDebug = false,
  className = ''
}) => {
  const dispatch = useAppDispatch();
  const selectedNode = useAppSelector(selectSelectedNode);
  const nodeId = propNodeId || selectedNode?.id || '';
  
  // Create a memoized selector for this specific node's form state
  const nodeFormStateSelector = useMemo(() => selectNodeFormState(nodeId), [nodeId]);
  const nodeFormState = useAppSelector(nodeFormStateSelector);
  
  // Schema from node's form state (fetched and set by NodeConfigPanel)
  const schema = nodeFormState?.schema || null;
  
  // Transient UI states - keep in local component state, not Redux
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  // User-entered data from node form state (only what users have input)
  const formValues = nodeFormState?.formValues || {};
  const fields = nodeFormState?.fields || {};
  const formErrors = nodeFormState?.formErrors || {};
  const selectedAction = nodeFormState?.selectedAction || null;
  
  const [itemType, setItemType] = React.useState<'action' | 'trigger'>('action');
  
  // Memoize initial values to prevent infinite loops
  const initialValuesRef = React.useRef(initialValues);
  const initialValuesKey = React.useMemo(() => JSON.stringify(initialValues), [initialValues]);
  
  // Initialize form values with initial values (only when they actually change)
  useEffect(() => {
    if (nodeId && Object.keys(initialValuesRef.current).length > 0) {
      dispatch(setNodeFormValues({ nodeId, formValues: { ...initialValuesRef.current } }));
    }
  }, [nodeId, initialValuesKey, dispatch]);
  
  // Keep ref in sync
  useEffect(() => {
    initialValuesRef.current = initialValues;
  }, [initialValuesKey]);
  
  // Set item type when module changes
  useEffect(() => {
    setItemType('action');
  }, [module]);

  // Initialize with first action when schema loads
  useEffect(() => {
    if (nodeId && schema && !selectedAction) {
      const items = itemType === 'action' ? schema.actions : schema.triggers;
      if (items && Object.keys(items).length > 0) {
        const firstItemKey = Object.keys(items)[0];
        if (firstItemKey) {
          dispatch(setNodeSelectedAction({ nodeId, selectedAction: firstItemKey }));
        }
      }
    }
  }, [nodeId, schema, selectedAction, itemType, dispatch]);

  const validateForm = async (valuesToValidate?: FormValue): Promise<FormValidationResult> => {
    const errors: FormErrors = {};
    let isValid = true;
    
    const values = valuesToValidate || formValues;


    if(!schema) return { isValid: false, errors };
    // Validate auth fields if required
    if (showAuth && schema?.auth?.required) {
      const authValue = values.auth;
      if (!authValue || (typeof authValue === 'string' && !authValue.trim())) {
        errors.auth = 'Authentication is required';
        isValid = false;
      }
    }

    // Validate selected action
    if (!selectedAction) {
      errors._action = `Please select ${itemType === 'action' ? 'an action' : 'a trigger'}`;
      isValid = false;
    }

    

    // Validate action properties
if (selectedAction && schema) {
      const items = itemType === 'action' ? schema.actions : schema.triggers;
      const item = items?.[selectedAction];
      if (item) {
        for (const [propKey, propConfig] of Object.entries(item.props)) {
          const fieldError = validateField(propConfig, values[propKey]);
          if (fieldError) {
            errors[propKey] = fieldError;
            isValid = false;
          }
        }
      }
    }

    // Custom validation if provided
    if (onValidate && isValid) {
      try {
        setIsValidating(true);
        // Add module and piece context to form values for validation
        const formDataWithContext = {
          ...values,
          _module: `${module.framework}/${module.name}`,
          _type: itemType
        };
        const customResult = await onValidate(formDataWithContext);
        setIsValidating(false);
        
        if (!customResult.isValid) {
          Object.assign(errors, customResult.errors);
          isValid = false;
        }
      } catch (error) {
        setIsValidating(false);
        errors._form = 'Validation failed. Please try again.';
        isValid = false;
      }
    }

    const result: FormValidationResult = {
      isValid,
      errors,
      data: isValid ? values : undefined
    };

    if (nodeId) dispatch(setNodeFormErrors({ nodeId, formErrors: errors }));
    return result;
  };

  const validateField = (field: FormField, value: any): string | undefined => {
    // Required field validation
    if (field.required && (value === undefined || value === null || value === '')) {
      return `${field.displayName} is required`;
    }

    // Type-specific validation
    if (value !== undefined && value !== null && value !== '') {
      if (field.type === 'NUMBER') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return `${field.displayName} must be a valid number`;
        }
        if (field.validation?.min !== undefined && numValue < field.validation.min) {
          return `${field.displayName} must be at least ${field.validation.min}`;
        }
        if (field.validation?.max !== undefined && numValue > field.validation.max) {
          return `${field.displayName} must be at most ${field.validation.max}`;
        }
      }

      if ((field.type === 'SHORT_TEXT' || field.type === 'LONG_TEXT') && typeof value === 'string') {
        if (field.validation?.minLength && value.length < field.validation.minLength) {
          return `${field.displayName} must be at least ${field.validation.minLength} characters`;
        }
        if (field.validation?.maxLength && value.length > field.validation.maxLength) {
          return `${field.displayName} must be at most ${field.validation.maxLength} characters`;
        }
      }
    }

    return undefined;
  };


  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    
    const values: Record<string, any> = {};
    Object.entries(fields).forEach(([fieldId, fieldState]) => {
      values[fieldId] = fieldState.value;
    });
    values.auth = formValues.auth;
    if (nodeId) dispatch(setNodeFormValues({ nodeId, formValues: values }));
    
    try {
      const validation = await validateForm(values);
      if (validation.isValid && validation.data) {
        // Add module and piece context to the submitted data
        const submitData = {
          ...validation.data,
          _module: `${module.framework}/${module.name}`,
          _action: selectedAction,
          _type: itemType
        };
        await onSubmit(submitData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      if (nodeId) dispatch(setNodeFormErrors({ nodeId, formErrors: { _form: 'Submission failed. Please try again.' } }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const items = itemType === 'action' 
    ? schema?.actions 
    : schema?.triggers;
  
  const selectedItemConfig = (selectedAction && items) ? items[selectedAction] : undefined;

  // The selected piece comes from the module prop
  const selectedPiece = module.name;

  return (
    <div className={`form-builder ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Global Form Error */}
        {formErrors._form && (
          <div className="bg-red-900/30 border border-red-700 rounded-md p-4">
            <p className="text-red-400 text-sm">{formErrors._form}</p>
          </div>
        )}



        {/* Authentication Section */}
        {showAuth && schema?.auth && (
          <div className="p-4">
          <AuthSection
            authConfig={schema.auth}
            value={formValues.auth}
            module={module}
          />
          </div>
        )}

        {/* Debug Panel */}
        <DebugPanel showDebug={showDebug} />

        


        {/* Action/Trigger Properties */}
        {selectedItemConfig && (
          <div className="form-section p-4">
            <h3 className="text-lg font-medium text-slate-200 mb-4">
              Configure {selectedItemConfig.displayName}
            </h3>
            <div className="space-y-4">
              {Object.entries(selectedItemConfig.props).map(([propKey, propConfig]) => (
                <FormFieldRenderer
                  key={propKey}
                  field={{...propConfig as any, id: propKey} as any}
                />
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        {schema && (
          <div className="form-actions pt-6 border-t border-slate-700">
            <button
              type="submit"
              disabled={isSubmitting || isValidating || !selectedAction || !selectedPiece}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 
               isValidating ? 'Validating...' : 
               'Submit'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};