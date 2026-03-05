// Main component
export { FrontendBuilderVanilla } from './FrontendBuilder.vanilla';

// Types
export type {
  FrontendBuilderProps,
  WebCanvasConfig,
  HostingDetectionResult,
  AIGenerationRequest,
  AIGenerationResponse,
  EditorConfig,
  HabitContext,
  HabitDefinition,
} from './types';

// Utilities
export {
  detectHostingEnvironment,
  generateWithAI,
  buildWebCanvasUrl,
  validateTenantUrl,
} from './webcanvas-client';
