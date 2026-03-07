// @ha-bits/cortex - Habits Workflow Executor
// The execution engine for running habits (workflows)

// Core workflow execution
export { WorkflowExecutor, InitFromDataOptions } from './WorkflowExecutor';
export { WorkflowExecutorServer, startServer } from './server';

// ESM/Browser-compatible executor (no Express dependencies)
export { HabitsExecutor, StartWorkflowOptions } from './esm';

// Webhook handling (Node.js server only)
export { IWebhookHandler, WebhookTriggerServer, WebhookServerOptions } from './WebhookTriggerServer';

// Server utilities
export { ManageModule, setupManageRoutes } from './manage';
export { setupOpenAPIRoutes, generateOpenAPISpec } from './openapi';
export { customRequire, registerCortexModule } from './utils/customRequire';

// Bits framework exports - for creating bits modules without activepieces dependencies
export {
  // HTTP Client
  httpClient,
  HttpMethod,
  HttpRequest,
  HttpResponse,
  AuthenticationType,
  
  // Property builders
  Property,
  PropertyDefinition,
  DropdownOption,
  DropdownState,
  StoreScope,
  FilePropertyValue,
  
  // Auth builders
  BitAuth,
  PieceAuth,
  AuthValidationResult,
  
  // Action builders
  createAction,
  createBitAction,
  BitAction,
  BitActionContext,
  
  // Trigger builders
  createTrigger,
  createBitTrigger,
  BitTrigger,
  BitTriggerContext,
  TriggerStrategy,
  
  // Piece/Bit builders
  createBit,
  createPiece,
  Bit,
  BitCategory,
  PieceCategory,
  
  // Utilities
  createCustomApiCallAction,
} from './bits/framework';

// Re-export types from core
export * from '@habits/shared/types';
