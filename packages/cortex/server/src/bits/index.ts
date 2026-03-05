/**
 * Bits Module Index
 * 
 * Exports all bits-related functionality for executing bits modules
 * without activepieces dependencies.
 */

export { 
  executeBitsModule, 
  getBitsModuleActions, 
  getBitsModuleTriggers,
  pieceFromModule,
  extractBitsPieceFromModule,
  type BitsAction,
  type BitsActionContext,
  type BitsTrigger,
  type BitsTriggerContext,
  BitsTriggerType,
  type BitsStore,
  type BitsListener,
  type BitsScheduleOptions,
  type BitsPiece,
  type BitsExecutionParams,
  type BitsExecutionResult,
} from './bitsDoer';

export {
  bitsTriggerHelper,
  TriggerHookType,
  tryCatch,
  type TriggerExecutionParams,
  type TriggerExecutionResult,
} from './bitsWatcher';

// Framework exports for creating bits modules
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
  PieceCategory,
  BitCategory,
  
  // Utilities
  createCustomApiCallAction,
} from './framework';

// Declarative API executor (n8n-style declarative nodes without n8n deps)
export {
  executeDeclarativeNode,
  execute,
  buildRequest,
  resolveExpression,
  processResponse,
  isDeclarativeNode,
  extractDeclarativeNode,
  declarativeNodeToBitsAction,
  // Types
  type IDeclarativeNodeType,
  type DeclarativeNodeDescription,
  type DeclarativeProperty,
  type PropertyOption,
  type RoutingConfig,
  type RoutingRequest,
  type RoutingSend,
  type RoutingOutput,
  type PostReceiveAction,
  type PreSendAction,
  type RequestDefaults,
  type DeclarativeExecutionContext,
  type DeclarativeExecutionResult,
  type DisplayOptions,
  type CredentialDefinition,
  type DeclarativeHttpMethod,
  type ExpressionContext,
} from './declarativeExecutor';
