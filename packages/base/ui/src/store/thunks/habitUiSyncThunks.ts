import type { AppDispatch, RootState } from '../store';
import { removeHabit, updateHabit } from '../slices/workflowSlice';
import { setFrontendYaml } from '../slices/uiSlice';
import {
  pruneFrontendYamlForRemovedHabits,
  renameHabitInFrontendYaml,
} from '@ha-bits/frontend-builder/ui-spec';

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

/** Rename a habit in Logic and retarget matching action endpoints in the frontend YAML. */
export function updateHabitAndRenameInUi(
  habitId: string,
  updates: { name: string; id: string },
) {
  return (dispatch: AppDispatch, getState: () => RootState) => {
    const { frontendYaml } = getState().ui;
    const oldId = habitId;
    const newId = updates.id;

    dispatch(updateHabit({ habitId, updates }));

    if (!frontendYaml.trim() || oldId === newId) return;

    const nextYaml = renameHabitInFrontendYaml(frontendYaml, oldId, newId);
    if (nextYaml !== frontendYaml) {
      dispatch(setFrontendYaml(nextYaml));
    }
  };
}
