/**
 * Converters Module
 * Exports all converter functions and types for n8n, Activepieces, and Script workflows
 * Also includes schema converters for dynamic form generation
 */

// Types
export type {
  ExtractedConnection,
  ConversionResult,
  N8nNode,
  N8nWorkflow,
  ActivepiecesAction,
  ActivepiecesTrigger,
  ActivepiecesWorkflow,
  WorkflowType,
  // Schema converter types
  FormFieldType,
  FormField,
  PieceSchema,
  ActionDefinition,
  AuthConfig,
  N8NResponse,
  N8NNodeDefinition,
  N8NCredential,
  N8NProperty,
  ActivePiecesResponse,
  ActivePiecesData,
  ActivePiecesPieceConfig,
  ActivePiecesActionConfig,
  ActivePiecesPropertyConfig,
  ActivePiecesAuthConfig,
  PlatformConverter,
} from './types';

// n8n Converter
export { convertN8nWorkflow } from './n8nConverter';

// Activepieces Converter
export {
  convertActivepiecesWorkflow,
  extractConnectionsFromHabitsWorkflow,
  generateEnvContent,
} from './activepiecesConverter';

// Script Converter
export { ScriptWorkflowConverter } from './scriptConverter';

// Main Workflow Converter
export {
  detectWorkflowType,
  convertWorkflow,
  convertWorkflowWithConnections,
  getWorkflowTypeName,
} from './workflowConverter';

// Schema Converters (for dynamic form generation)
export { 
  N8NConverter, 
  createN8NConverter, 
  convertN8NResponse 
} from './n8nSchemaConverter';

export { 
  ActivePiecesConverter, 
  createActivePiecesConverter, 
  convertActivePiecesResponse 
} from './activePiecesSchemaConverter';
