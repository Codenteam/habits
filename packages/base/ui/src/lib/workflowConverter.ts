/**
 * Workflow Converter - Frontend Wrapper
 * Re-exports converters from @ha-bits/core for use in the UI
 * 
 * Supported formats: Habits, Script
 */

// Re-export everything from the shared converter library
export {
  // Types
  type ExtractedConnection,
  type ConversionResult,
  type WorkflowType,
  
  // Script Converter
  ScriptWorkflowConverter,
  
  // Main Workflow Converter
  detectWorkflowType,
  convertWorkflow,
  convertWorkflowWithConnections,
  getWorkflowTypeName,
} from '@ha-bits/core';
