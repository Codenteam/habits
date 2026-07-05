/** Entry point for the YAML UiSpec builder only (no GrapesJS / legacy HTML builder). */
export { UiSpecBuilderVanilla } from './UiSpecBuilder.vanilla';
export { UiSpecWizard } from './UiSpecWizard';
export type { UiSpecWizardProps } from './UiSpecWizard';
export { builderRoundTripYaml, parseYamlToSpecState } from './uiSpecYaml';
export {
  pruneSpecForRemovedHabits,
  pruneFrontendYamlForRemovedHabits,
  renameHabitEndpointsInSpec,
  renameHabitInFrontendYaml,
  shouldResetStaleFrontendYaml,
} from './pruneHabitUi';
export {
  WIDGET_PRESETS,
  UI_SPEC_TEMPLATES,
} from './uiSpecPresets';
export type { WidgetPreset, UiSpecTemplate } from './uiSpecPresets';
export type { UiSpecBuilderProps } from './UiSpecBuilder.vanilla';
export { describeAppMemory, syncSpecWithInferredState } from './inferState';
export { describeDataFlow } from './dataFlow';
export { buildStateProfiles, stateKeysForAction } from './stateConnections';
export type { StateKeyProfile } from './stateConnections';
export type { DataFlowRoute } from './dataFlow';
export type { AppMemoryEntry } from './inferState';
export { WIZARD_STEPS, canAdvanceStep, initialWizardStep, validateLayoutStep, validatePagesContentStep } from './wizardSteps';
export type { WizardStepId } from './wizardSteps';
import { initialWizardStep } from './wizardSteps';

/** True when YAML already has widgets and actions — reopen on Overview step. */
export function isRichUiSpecYaml(yaml: string): boolean {
  return initialWizardStep(yaml) === 'overview';
}
