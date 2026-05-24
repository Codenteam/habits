export { buildHabitGraph, declaredInputFields, extractHabitsInputFields } from './buildGraph';
export { analyzeUiSpec } from './analyzeUiSpec';
export type { UiSpecAnalysis, UiActionBinding, UiFormField } from './analyzeUiSpec';
export { validateHabitGraph, buildAndValidateHabitGraph } from './validateGraph';
export {
  buildEditorGraphInput,
  habitsToGraphInput,
  parseEnvKeysFromContent,
} from './buildEditorGraphInput';
export type { EditorHabitLike } from './buildEditorGraphInput';
export {
  buildPropagationSteps,
  describePropagationStep,
} from './buildPropagation';
export type {
  PropagationDisplayNode,
  PropagationDisplayEdge,
  PropagationStep,
} from './buildPropagation';
export * from './types';
export * from './templateUtils';
