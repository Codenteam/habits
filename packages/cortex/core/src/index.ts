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
export { 
  executeBitsModule, 
  extractBitsPieceFromModule, 
  pieceFromModule, 
  BitsPiece,
  // New primary exports
  getBitsModuleRoutines,
  getBitsModuleCues,
  BitsRoutine,
  BitsRoutineContext,
  BitsCue,
  BitsCueContext,
  BitsCueType,
  // Deprecated aliases
  getBitsModuleActions,
  getBitsModuleTriggers,
  BitsAction,
  BitsActionContext,
  BitsTrigger,
  BitsTriggerContext,
  BitsTriggerType,
} from './bits/bitsRoutine';
export { 
  // New primary exports
  bitsCueHelper, 
  CueHookType,
  // Deprecated aliases
  bitsTriggerHelper, 
  TriggerHookType 
} from './bits/bitsCue';
export { executeScriptModule } from './script/scriptExecutor';

// Polling store for trigger deduplication
export { PollingStore, createPollingStore, DedupStrategy, PollingItemContext, SeenItemRecord, PollingStoreOptions } from './store';
export { BitsPollingStore } from './bits/bitsRoutine';

// Module management utilities
export { ensureModuleInstalled, registerBundledModule, getBundledModule, isBundledModule } from './utils/moduleLoader';
export { customRequire, registerCortexModule } from './utils/customRequire';
export { getNodesBasePath, getNodesPath, getModuleFullPath, getLocalModulePath, clearNodesBasePathCache } from './utils/utils';
export { assertNotNullOrUndefined } from './utils';

// Security utilities
export { getSecurityConfig, scanInputForSecurity } from './security/inputScanner';

// Bits framework exports - for creating custom bits modules
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
  
  // New primary routine builders
  createRoutine,
  createBitRoutine,
  BitRoutine,
  BitRoutineContext,
  
  // New primary cue builders
  createCue,
  createBitCue,
  BitCue,
  BitCueContext,
  CueStrategy,
  WebhookFilterPayload,
  
  // Deprecated action/trigger aliases
  createAction,
  createBitAction,
  BitAction,
  BitActionContext,
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
  createCustomApiCallRoutine,
  createCustomApiCallAction,
} from './bits/framework';

// Declarative node types - for creating declarative/routing-based bits
export type {
  IDeclarativeNodeType,
  DeclarativeNodeDescription,
} from './bits/declarativeExecutor';

// OAuth2 PKCE support
export * from './bits/oauth2Types';
export { oauthTokenStore } from './bits/oauthTokenStore';
export { discoverOAuthRequirements, printOAuthRequirements, type OAuthRequirement } from './bits/oauthDiscovery';
export { 
  OAuthFlowManager,
  type OAuthFlowManagerOptions,
  type OAuthCallbackParams,
  type InitiateFlowResult,
  type ExchangeResult,
  type IOAuthHandler,
  type WorkflowOAuthRequirement,
} from './bits/OAuthFlowManager';

// Re-export types from core
export * from '@habits/shared/types';

// Re-export logger from core/logger
export { LoggerFactory } from '@ha-bits/core/logger';
