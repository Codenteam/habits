/**
 * Converter Types
 * Types used by workflow converters for Script workflows
 * 
 * Supported formats: Habits, Script
 */

import type { FrontendWorkflow, WorkflowNode, WorkflowEdge, ScriptModule, ScriptWorkflow } from '../types';

// Re-export for convenience
export type { FrontendWorkflow as Workflow, WorkflowNode, WorkflowEdge, ScriptModule, ScriptWorkflow };

// Connection/Auth extraction types
export interface ExtractedConnection {
  originalId: string;
  envVarName: string;
  nodeId: string;
  nodeLabel: string;
  paramName: string;
  originalValue: string;
}

export interface ConversionResult {
  workflow: FrontendWorkflow;
  connections: ExtractedConnection[];
}

// Workflow type detection result
export type WorkflowType = 'script' | 'habits' | 'unknown';

// ============================================================
// Schema Types
// Types for generating dynamic forms from node definitions.
// ============================================================

export type FormFieldType = 
  | 'SHORT_TEXT' 
  | 'LONG_TEXT' 
  | 'NUMBER' 
  | 'CHECKBOX' 
  | 'DROPDOWN' 
  | 'STATIC_DROPDOWN'
  | 'DYNAMIC'
  | 'FILE' 
  | 'JSON' 
  | 'OBJECT' 
  | 'ARRAY'
  | 'SECRET_TEXT'
  | 'DATE'
  | 'TIME'
  | 'DATE_TIME'
  | 'BRANCH_CONDITIONS';

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldOptions {
  disabled?: boolean;
  options: FormFieldOption[];
}

export interface BaseFormField {
  displayName: string;
  id: string;
  type: FormFieldType;
  required?: boolean;
  description?: string;
  defaultValue?: any;
  placeholder?: string;
}

export interface FormField extends BaseFormField {
  id: string;
  options?: FormFieldOptions;
  resolvedOptions?: FormFieldOptions;
  refreshers?: string[];
  forceRefresh?: boolean;
  properties?: Record<string, BaseFormField>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface AuthConfig {
  displayName: string;
  description?: string;
  required: boolean;
  type: FormFieldType;
  fields?: FormField[];
  authUrl?: string;
  scopes?: string[];
}

export interface ActionDefinition {
  name: string;
  displayName: string;
  description?: string;
  props: Record<string, FormField>;
  requireAuth?: boolean;
  errorHandlingOptions?: {
    continueOnFailure?: { defaultValue: boolean };
    retryOnFailure?: { defaultValue: boolean };
  };
}

export interface PieceSchema {
  name: string;
  displayName: string;
  version?: string;
  description?: string;
  logoUrl?: string;
  authors?: string[];
  categories?: string[];
  auth?: AuthConfig;
  actions: Record<string, ActionDefinition>;
  triggers?: Record<string, ActionDefinition>;
}
