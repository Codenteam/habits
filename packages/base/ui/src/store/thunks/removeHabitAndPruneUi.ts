import type { AppDispatch, RootState } from '../store';
import { removeHabit } from '../slices/workflowSlice';
import { setFrontendYaml } from '../slices/uiSlice';
import { pruneFrontendYamlForRemovedHabits } from '@ha-bits/frontend-builder/ui-spec';

/** Remove a habit from Logic and prune only its UI actions/refs from the frontend YAML. */
export function removeHabitAndPruneUi(habitId: string) {
  return (dispatch: AppDispatch, getState: () => RootState) => {
    const { frontendYaml } = getState().ui;

    dispatch(removeHabit(habitId));

    if (!frontendYaml.trim()) return;

    const nextYaml = pruneFrontendYamlForRemovedHabits(frontendYaml, [habitId]);
    if (nextYaml !== frontendYaml) {
      dispatch(setFrontendYaml(nextYaml));
    }
  };
}
