/**
 * FormBuilder UI Types
 * 
 * UI-specific types for form building. Core schema types are imported from @ha-bits/core.
 */

// Re-export core schema types for convenience
export type {
  FormFieldType,
  FormField,
  PieceSchema,
  ActionDefinition,
  AuthConfig,
} from '@ha-bits/core';

// UI-specific types

// Form data structures
export interface FormValue {
  [key: string]: any;
}

export interface FormErrors {
  [key: string]: string | string[];
}

export interface FormValidationResult {
  isValid: boolean;
  errors: FormErrors;
  data?: FormValue;
}

// Form builder configuration (UI-specific)
import type { PieceSchema } from '@ha-bits/core';

export interface FormBuilderConfig {
  piece: PieceSchema;
  onSubmit: (data: FormValue) => Promise<void>;
  onValidate?: (data: FormValue) => Promise<FormValidationResult>;
  initialValues?: FormValue;
  showAuth?: boolean;
  showActions?: boolean;
}

// Form state (UI-specific)
export interface FormState {
  values: FormValue;
  errors: FormErrors;
  isSubmitting: boolean;
  isValidating: boolean;
  selectedAction?: string;
  lastRefresh?: number;
}