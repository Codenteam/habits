/**
 * Workflow Converter - Frontend Wrapper
 * Re-exports converters from @ha-bits/core for use in the UI
 */

// Re-export everything from the shared converter library
export {
  // Types
  type ExtractedConnection,
  type ConversionResult,
  type N8nNode,
  type N8nWorkflow,
  type ActivepiecesAction,
  type ActivepiecesTrigger,
  type ActivepiecesWorkflow,
  type WorkflowType,
  
  // n8n Converter
  convertN8nWorkflow,
  
  // Activepieces Converter
  convertActivepiecesWorkflow,
  extractConnectionsFromHabitsWorkflow,
  generateEnvContent,
  
  // Script Converter
  ScriptWorkflowConverter,
  
  // Main Workflow Converter
  detectWorkflowType,
  convertWorkflow,
  convertWorkflowWithConnections,
  getWorkflowTypeName,
} from '@ha-bits/core';
