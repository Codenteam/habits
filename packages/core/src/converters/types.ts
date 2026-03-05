/**
 * Converter Types
 * Types used by workflow converters for n8n, Activepieces, and Script workflows
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

// n8n workflow types
export interface N8nNode {
  id?: string;
  name: string;
  type: string;
  position: [number, number];
  parameters?: Record<string, any>;
  credentials?: Record<string, any>;
  typeVersion?: number;
}

export interface N8nWorkflow {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, any>;
  settings?: Record<string, any>;
}

// Activepieces workflow types
export interface ActivepiecesAction {
  name: string;
  type: string;
  settings: {
    actionName?: string;
    input?: Record<string, any>;
    pieceName?: string;
    pieceVersion?: string;
  };
  nextAction?: ActivepiecesAction;
  displayName?: string;
}

export interface ActivepiecesTrigger {
  name: string;
  type: string;
  settings: {
    triggerName?: string;
    input?: Record<string, any>;
    pieceName?: string;
    pieceVersion?: string;
  };
  nextAction?: ActivepiecesAction;
  displayName?: string;
}

export interface ActivepiecesWorkflow {
  displayName: string;
  trigger: ActivepiecesTrigger;
  version?: string;
}

// Workflow type detection result
export type WorkflowType = 'n8n' | 'activepieces' | 'activepieces-template' | 'script' | 'habits' | 'unknown';

// ============================================================
// Schema Converter Types
// Types for converting n8n and ActivePieces node schemas to Habits PieceSchema format.
// Used for generating dynamic forms from node definitions.
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

export interface PlatformConverter<T> {
  convertToPieceSchema(data: T): PieceSchema;
  validateSchema(schema: PieceSchema): boolean;
}

// N8N Schema Types (Input Format for schema conversion)
export interface N8NCredentialField {
  displayName: string;
  name: string;
  type: string;
  default?: any;
  required?: boolean;
  description?: string;
  options?: Array<{ name: string; value: string }>;
}

export interface N8NCredential {
  name: string;
  displayName: string;
  properties: N8NCredentialField[];
  documentationUrl?: string;
  description?: string;
}

export interface N8NProperty {
  displayName: string;
  name: string;
  type: string;
  default?: any;
  required?: boolean;
  description?: string;
  options?: Array<{ name: string; value: string }>;
  typeOptions?: {
    rows?: number;
    password?: boolean;
    multipleValues?: boolean;
    multipleValueButtonText?: string;
  };
  displayOptions?: {
    show?: Record<string, any[]>;
    hide?: Record<string, any[]>;
  };
}

export interface N8NNodeDefinition {
  displayName: string;
  name: string;
  group: string[];
  version: number;
  description?: string;
  defaults?: { name: string; color?: string };
  inputs: string[];
  outputs: string[];
  properties: N8NProperty[];
  credentials?: Array<{ name: string; required?: boolean }>;
}

export interface N8NResponse {
  success: boolean;
  data: { schema: N8NNodeDefinition };
  timestamp: string;
}

// ActivePieces Schema Types (Input Format for schema conversion)
export interface ActivePiecesAuthConfig {
  description?: string;
  displayName: string;
  required: boolean;
  type: string;
}

export interface ActivePiecesPropertyConfig {
  displayName: string;
  required?: boolean;
  description?: string;
  refreshers?: string[];
  defaultValue?: any;
  type: string;
  options?: {
    disabled?: boolean;
    options: Array<{ label: string; value: string }>;
  };
  properties?: Record<string, ActivePiecesPropertyConfig>;
}

export interface ActivePiecesActionConfig {
  name: string;
  displayName: string;
  description?: string;
  props: Record<string, ActivePiecesPropertyConfig>;
  requireAuth?: boolean;
  errorHandlingOptions?: {
    continueOnFailure?: { defaultValue: boolean };
    retryOnFailure?: { defaultValue: boolean };
  };
}

export interface ActivePiecesPieceConfig {
  displayName: string;
  logoUrl?: string;
  authors?: string[];
  categories?: string[];
  auth?: ActivePiecesAuthConfig;
  description?: string;
  _actions: Record<string, ActivePiecesActionConfig>;
  _triggers?: Record<string, ActivePiecesActionConfig>;
}

export interface ActivePiecesData {
  schema: {
    displayName: string;
    name: string;
    version: string;
    pieces: ActivePiecesPieceConfig;
    auth?: ActivePiecesAuthConfig;
  };
}

export interface ActivePiecesResponse {
  success: boolean;
  data: ActivePiecesData;
  timestamp: string;
}
