// @ha-bits/cortex-core - Habits Workflow Executor Core
// The platform-agnostic execution engine for running habits (workflows)
// This package has no server dependencies (express, yargs, dotenv)

// Core workflow execution
export { WorkflowExecutor, InitFromDataOptions } from './WorkflowExecutor';

// ESM/Browser-compatible executor
export { HabitsExecutor, StartWorkflowOptions } from './esm';

// Webhook handler interface (implementation provided by server package)
export { IWebhookHandler } from './WebhookHandler';

// Module execution
export { executeN8nModule } from './n8n/n8nExecutor';
export { executeActivepiecesModule } from './activepieces/activepiecesExecutor';
export { triggerHelper, TriggerHookType } from './activepieces/activepiecesTrigger';
export { executeBitsModule } from './bits/bitsDoer';
export { bitsTriggerHelper } from './bits/bitsWatcher';
export { executeScriptModule } from './script/scriptExecutor';

// Module management utilities
export { ensureModuleInstalled, registerBundledModule, getBundledModule, isBundledModule } from './utils/moduleLoader';
export { customRequire, registerCortexModule } from './utils/customRequire';
export { getNodesBasePath, getNodesPath, getModuleFullPath, getLocalModulePath, clearNodesBasePathCache } from './utils/utils';
export { assertNotNullOrUndefined } from './utils';

// Security utilities
export { getSecurityConfig, scanInputForSecurity } from './security/inputScanner';

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

// Declarative node types - for creating declarative/routing-based bits
export type {
  IDeclarativeNodeType,
  DeclarativeNodeDescription,
} from './bits/declarativeExecutor';

// Re-export types from core
export * from '@habits/shared/types';
