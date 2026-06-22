/** Entry point for the YAML UiSpec builder only (no GrapesJS / legacy HTML builder). */
export { UiSpecBuilderVanilla } from './UiSpecBuilder.vanilla';
export { UiSpecWizard } from './UiSpecWizard';
export type { UiSpecWizardProps } from './UiSpecWizard';
export { builderRoundTripYaml, parseYamlToSpecState } from './uiSpecYaml';
export {
  WIDGET_PRESETS,
  UI_SPEC_TEMPLATES,
} from './uiSpecPresets';
export type { WidgetPreset, UiSpecTemplate } from './uiSpecPresets';
export type { UiSpecBuilderProps } from './UiSpecBuilder.vanilla';
export { describeAppMemory, syncSpecWithInferredState } from './inferState';
export { describeDataFlow } from './dataFlow';
export type { DataFlowRoute } from './dataFlow';
export type { AppMemoryEntry } from './inferState';
export { WIZARD_STEPS, canAdvanceStep, initialWizardStep } from './wizardSteps';
export type { WizardStepId } from './wizardSteps';
import { initialWizardStep } from './wizardSteps';

/** True when YAML already has widgets and actions — reopen on Advanced step. */
export function isRichUiSpecYaml(yaml: string): boolean {
  return initialWizardStep(yaml) === 'advanced';
}
