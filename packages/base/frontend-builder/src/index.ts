// Legacy HTML/GrapesJS builder — import directly from './FrontendBuilder.vanilla' if needed.
// Not re-exported here so Vite does not bundle grapesjs into the Base UI.

// Declarative UiSpec YAML builder (WYSIWYG drag-and-drop)
export { UiSpecBuilderVanilla } from './UiSpecBuilder.vanilla';
export { builderRoundTripYaml } from './uiSpecYaml';
export {
  WIDGET_PRESETS,
  UI_SPEC_TEMPLATES,
} from './uiSpecPresets';
export type { WidgetPreset, UiSpecTemplate } from './uiSpecPresets';
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
