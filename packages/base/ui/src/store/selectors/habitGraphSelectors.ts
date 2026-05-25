import { createSelector } from '@reduxjs/toolkit';
import {
  buildAndValidateHabitGraph,
  buildEditorGraphInput,
  type HabitGraphReport,
} from '@ha-bits/cortex-lab/graph';

type HabitLike = {
  id: string;
  name: string;
  nodes: Array<{ id: string; data?: Record<string, unknown> }>;
  edges: Array<{ source: string; target: string }>;
  output?: Record<string, string>;
  input?: Array<{ name?: string; id?: string }>;
};

type GraphSelectorState = {
  workflow: { habits: HabitLike[] };
  ui: { frontendYaml: string; envContent: string };
};

export const selectHabitGraphReport = createSelector(
  [
    (state: GraphSelectorState) => state.workflow.habits,
    (state: GraphSelectorState) => state.ui.frontendYaml,
    (state: GraphSelectorState) => state.ui.envContent,
  ],
  (habits, frontendYaml, envContent): HabitGraphReport => {
    const input = buildEditorGraphInput({
      habits,
      frontendYaml,
      envContent,
    });
    return buildAndValidateHabitGraph(input);
  },
);

export const selectGraphValidationErrors = createSelector(
  [selectHabitGraphReport],
  (report) =>
    report.issues.map((issue) => ({
      habitId: 'stack',
      habitName: 'Connection Graph',
      errorType: 'custom' as const,
      message: `[${issue.code}] ${issue.message}`,
      severity: issue.severity,
    })),
);
