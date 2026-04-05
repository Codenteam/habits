/**
 * Bits Module Index
 * 
 * Exports all bits-related functionality for executing bits modules -
 * the native Habits module system.
 */

export { 
  executeBitsModule, 
  // New primary exports
  getBitsModuleRoutines,
  getBitsModuleCues,
  pieceFromModule,
  extractBitsPieceFromModule,
  // New primary types
  type BitsRoutine,
  type BitsRoutineContext,
  type BitsCue,
  type BitsCueContext,
  BitsCueType,
  type BitsStore,
  type BitsListener,
  type BitsScheduleOptions,
  type BitsPiece,
  type BitsExecutionParams,
  type BitsExecutionResult,
  // Deprecated aliases
  getBitsModuleActions, 
  getBitsModuleTriggers,
  type BitsAction,
  type BitsActionContext,
  type BitsTrigger,
  type BitsTriggerContext,
  BitsTriggerType,
} from './bitsRoutine';

export {
  // New primary exports
  bitsCueHelper,
  CueHookType,
  tryCatch,
  type CueExecutionParams,
  type CueExecutionResult,
  // Deprecated aliases
  bitsTriggerHelper,
  TriggerHookType,
  type TriggerExecutionParams,
  type TriggerExecutionResult,
} from './bitsCue';

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
  PieceCategory,
  BitCategory,
  
  // Utilities
  createCustomApiCallRoutine,
  createCustomApiCallAction,
} from './framework';

// Declarative API executor (declarative routing-based nodes)
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
