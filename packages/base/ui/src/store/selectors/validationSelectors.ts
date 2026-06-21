import { createSelector } from '@reduxjs/toolkit';
import {
  validateHabits,
  type HabitValidationError,
  type ValidatableHabit,
} from '../validation/habitValidation';
import { selectHabitGraphReport } from './habitGraphSelectors';
import type { GraphIssue } from '@ha-bits/cortex-lab/graph';

export type ValidationIssueSource = 'habit' | 'connection';

export interface UnifiedValidationIssue {
  source: ValidationIssueSource;
  severity: 'error' | 'warning';
  code: string;
  message: string;
  habitId?: string;
  habitName?: string;
  suggestion?: string;
}

type ValidationState = {
  workflow: { habits: ValidatableHabit[] };
  ui: { frontendYaml: string; envContent: string };
};

function habitErrorToUnified(error: HabitValidationError): UnifiedValidationIssue {
  return {
    source: 'habit',
    severity: error.severity,
    code: error.errorType,
    message: error.message,
    habitId: error.habitId,
    habitName: error.habitName,
  };
}

function graphIssueToUnified(issue: GraphIssue): UnifiedValidationIssue {
  return {
    source: 'connection',
    severity: issue.severity,
    code: issue.code,
    message: issue.message,
    suggestion: issue.suggestion,
  };
}

export const selectHabitValidationIssues = createSelector(
  [(state: ValidationState) => state.workflow.habits],
  (habits): UnifiedValidationIssue[] =>
    validateHabits(habits).map(habitErrorToUnified),
);

export const selectConnectionValidationIssues = createSelector(
  [selectHabitGraphReport],
  (report): UnifiedValidationIssue[] => report.issues.map(graphIssueToUnified),
);

export const selectAllValidationIssues = createSelector(
  [selectHabitValidationIssues, selectConnectionValidationIssues],
  (habitIssues, connectionIssues): UnifiedValidationIssue[] => [
    ...habitIssues,
    ...connectionIssues,
  ],
);

export const selectValidationErrorCount = createSelector(
  [selectAllValidationIssues],
  (issues) => issues.filter((i) => i.severity === 'error').length,
);

export const selectValidationWarningCount = createSelector(
  [selectAllValidationIssues],
  (issues) => issues.filter((i) => i.severity === 'warning').length,
);

export const selectHasValidationErrors = createSelector(
  [selectValidationErrorCount],
  (count) => count > 0,
);

// Real prerequisites for building a UI. `missing_input_params` is intentionally NOT here:
// a habit with no {{habits.input.*}} is a valid automation (the warning itself says so), so it
// must not block opening the UI editor.
const UI_EDITOR_BLOCKING_CODES = new Set([
  'missing_nodes',
  'missing_output',
  'missing_name',
]);

export interface UiEditorAccess {
  allowed: boolean;
  reason: string;
  issues: UnifiedValidationIssue[];
}

/** UI editor is blocked only by Logic-tab habit issues — not connection/graph UI wiring errors. */
export const selectUiEditorAccess = createSelector(
  [(state: ValidationState) => state.workflow.habits, selectHabitValidationIssues],
  (habits, habitIssues): UiEditorAccess => {
    if (!habits.length) {
      return {
        allowed: false,
        reason: 'Create at least one habit in Logic before building the UI.',
        issues: [],
      };
    }

    const errors = habitIssues.filter((i) => i.severity === 'error');
    if (errors.length > 0) {
      return {
        allowed: false,
        reason: 'Fix habit validation errors in Logic before opening the UI editor.',
        issues: errors,
      };
    }

    const incomplete = habitIssues.filter(
      (i) => i.severity === 'warning' && UI_EDITOR_BLOCKING_CODES.has(i.code),
    );
    if (incomplete.length > 0) {
      return {
        allowed: false,
        reason:
          'Each habit needs a clear name, workflow nodes, outputs, and input parameters before building the UI.',
        issues: incomplete,
      };
    }

    const empty = habits.filter((h) => !h.nodes?.length);
    if (empty.length > 0) {
      return {
        allowed: false,
        reason: 'Add workflow nodes to every habit in Logic before building the UI.',
        issues: empty.map((h) => ({
          source: 'habit' as const,
          severity: 'error' as const,
          code: 'missing_nodes',
          message: `Habit "${h.name || h.id}" has no nodes.`,
          habitId: h.id,
          habitName: h.name,
        })),
      };
    }

    return { allowed: true, reason: '', issues: [] };
  },
);

export const selectHasValidationWarnings = createSelector(
  [selectValidationWarningCount],
  (count) => count > 0,
);

export const selectValidationSeverity = createSelector(
  [selectValidationErrorCount, selectValidationWarningCount],
  (errors, warnings): 'error' | 'warning' | 'none' => {
    if (errors > 0) return 'error';
    if (warnings > 0) return 'warning';
    return 'none';
  },
);
