/**
 * Converters Module
 * Exports all converter functions and types for Script workflows
 * Also includes schema types for dynamic form generation
 * 
 * Supported formats: Habits, Script
 */

// Types
export type {
  ExtractedConnection,
  ConversionResult,
  WorkflowType,
  // Schema converter types
  FormFieldType,
  FormField,
  PieceSchema,
  ActionDefinition,
  AuthConfig,
} from './types';

// Script Converter
export { ScriptWorkflowConverter } from './scriptConverter';

// Main Workflow Converter
export {
  detectWorkflowType,
  convertWorkflow,
  convertWorkflowWithConnections,
  getWorkflowTypeName,
} from './workflowConverter';
