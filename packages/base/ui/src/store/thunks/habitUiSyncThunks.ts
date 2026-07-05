import type { AppDispatch, RootState } from '../store';
import { removeHabit, updateHabit } from '../slices/workflowSlice';
import {
  bumpFrontendYamlRevision,
  clearFrontendHtml,
  clearFrontendYaml,
  setFrontendYaml,
} from '../slices/uiSlice';
import {
  pruneFrontendYamlForRemovedHabits,
  renameHabitInFrontendYaml,
  shouldResetStaleFrontendYaml,
} from '@ha-bits/frontend-builder/ui-spec';

function reconcileFrontendAfterLogicChange(
  dispatch: AppDispatch,
  getState: () => RootState,
) {
  const { frontendYaml } = getState().ui;
  const habitIds = getState().workflow.habits.map((h) => h.id);

  if (!frontendYaml.trim()) return;

  if (shouldResetStaleFrontendYaml(frontendYaml, habitIds)) {
    dispatch(clearFrontendYaml());
    dispatch(clearFrontendHtml());
    return;
  }
}

/** Remove a habit from Logic and prune only its UI actions/refs from the frontend YAML. */
export function removeHabitAndPruneUi(habitId: string) {
  return (dispatch: AppDispatch, getState: () => RootState) => {
    const { frontendYaml } = getState().ui;

    dispatch(removeHabit(habitId));

    if (frontendYaml.trim()) {
      const nextYaml = pruneFrontendYamlForRemovedHabits(frontendYaml, [habitId]);
      if (nextYaml !== frontendYaml) {
        dispatch(setFrontendYaml(nextYaml));
      }
    }

    reconcileFrontendAfterLogicChange(dispatch, getState);
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

/** Call after external frontend YAML loads (import, open, showcase). */
export function loadFrontendYaml(yaml: string) {
  return (dispatch: AppDispatch) => {
    dispatch(setFrontendYaml(yaml));
    dispatch(bumpFrontendYamlRevision());
  };
}
