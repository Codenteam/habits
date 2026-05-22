// Main component
export { FrontendBuilderVanilla } from './FrontendBuilder.vanilla';

// New: declarative UiSpec YAML builder (WYSIWYG drag-and-drop)
export { UiSpecBuilderVanilla } from './UiSpecBuilder.vanilla';
export { builderRoundTripYaml } from './uiSpecYaml';
export type { UiSpecBuilderProps } from './UiSpecBuilder.vanilla';

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
