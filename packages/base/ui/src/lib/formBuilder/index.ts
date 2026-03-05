// Main FormBuilder components

// Schema Converters - Re-export from @ha-bits/core
export {
  // N8N Schema Converter
  N8NConverter,
  createN8NConverter,
  convertN8NResponse,
  // ActivePieces Schema Converter
  ActivePiecesConverter,
  createActivePiecesConverter,
  convertActivePiecesResponse,
  // Types
  type FormFieldType,
  type FormField,
  type PieceSchema,
  type ActionDefinition,
  type AuthConfig,
  type N8NResponse,
  type ActivePiecesResponse,
  type PlatformConverter
} from '@ha-bits/core';

// API utilities
export { FormBuilderAPI, validateForm, checkModule, installModule, executeForm } from '../formBuilderAPI';

// Additional UI-specific types (not in core)
export type {
  FormValue,
  FormErrors,
  FormValidationResult,
  FormBuilderConfig,
  FormState,
  ActivePiecesData
} from './types';