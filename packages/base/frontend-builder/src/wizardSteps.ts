import type { SpecState } from './uiSpecYaml';
import { parseYamlToSpecState } from './uiSpecYaml';
import { missingActionReferences, type HabitOption } from './actionLinking';
import { findUnmatchedInputsAcrossHabits } from './actionSimpleMode';

export type WizardStepId =
  | 'identity'
  | 'pages'
  | 'actions'
  | 'overview';

export interface WizardStepDef {
  id: WizardStepId;
  label: string;
  description: string;
  showCanvas: boolean;
  /** Full builder chrome (palette, templates, app settings) */
  fullBuilder?: boolean;
}

export const WIZARD_STEPS: WizardStepDef[] = [
  {
    id: 'identity',
    label: 'Identity',
    description: 'Name your app and pick a look',
    showCanvas: false,
  },
  {
    id: 'pages',
    label: 'Build pages',
    description: 'Choose layout, then pick a template or add widgets',
    showCanvas: true,
  },
  {
    id: 'actions',
    label: 'Connect',
    description: 'Link your form to workflows and choose what users see',
    showCanvas: true,
  },
  {
    id: 'overview',
    label: 'Overview',
    description: 'Review your app and fine-tune in the full editor',
    showCanvas: true,
    fullBuilder: true,
  },
];

export interface WizardContext {
  /** Habits with workflow nodes (from Logic tab) */
  linkableHabitIds: string[];
  linkableHabits?: HabitOption[];
}

export interface StepValidation {
  ok: boolean;
  reason?: string;
}

export function validateLayoutStep(spec: SpecState): StepValidation {
  if (spec.layout.type === 'tabs' || spec.layout.type === 'sidebar') {
    if (!spec.layout.nav?.length) return { ok: false, reason: 'Add at least one tab' };
    if (!spec.defaultView) return { ok: false, reason: 'Choose a default tab' };
  }
  return { ok: true };
}

export function validatePagesContentStep(spec: SpecState): StepValidation {
  const hasViewWidgets =
    spec.widgets.length > 0 ||
    (spec.views &&
      Object.values(spec.views).some(
        (v) => Array.isArray(v?.widgets) && (v.widgets as unknown[]).length > 0,
      ));
  if (!hasViewWidgets) return { ok: false, reason: 'Add a page pattern or widget' };
  return { ok: true };
}

export function canAdvanceStep(
  step: WizardStepId,
  spec: SpecState,
  ctx: WizardContext,
): StepValidation {
  switch (step) {
    case 'identity': {
      if (!spec.meta.title?.trim()) return { ok: false, reason: 'Enter an app title' };
      if (!spec.meta.id?.trim()) return { ok: false, reason: 'Enter an app ID' };
      return { ok: true };
    }
    case 'pages':
      return validatePagesContentStep(spec);
    case 'actions': {
      const missing = missingActionReferences(spec, ctx.linkableHabitIds);
      if (missing.length > 0) {
        return { ok: false, reason: "Connect your form's Submit button" };
      }
      if (Object.keys(spec.actions ?? {}).length === 0 && ctx.linkableHabitIds.length > 0) {
        return { ok: false, reason: 'Connect at least one workflow to your page' };
      }
      const habits = ctx.linkableHabits ?? [];
      if (habits.length > 0) {
        const unmatched = findUnmatchedInputsAcrossHabits(spec, habits);
        if (unmatched.length > 0) {
          return { ok: false, reason: 'Match all workflow fields to form fields' };
        }
      }
      return { ok: true };
    }
    case 'overview':
      return { ok: true };
    default:
      return { ok: true };
  }
}

export function stepIndex(id: WizardStepId): number {
  return WIZARD_STEPS.findIndex((s) => s.id === id);
}

export function nextStep(id: WizardStepId): WizardStepId | null {
  const i = stepIndex(id);
  return i < 0 || i >= WIZARD_STEPS.length - 1 ? null : WIZARD_STEPS[i + 1].id;
}

export function prevStep(id: WizardStepId): WizardStepId | null {
  const i = stepIndex(id);
  return i <= 0 ? null : WIZARD_STEPS[i - 1].id;
}

/** Reopening a finished spec skips straight to Overview editing. */
export function initialWizardStep(yaml: string): WizardStepId {
  if (!yaml.trim()) return 'identity';
  try {
    const spec = parseYamlToSpecState(yaml);
    const hasWidgets =
      spec.widgets.length > 0 ||
      Object.values(spec.views ?? {}).some(
        (v) => Array.isArray(v?.widgets) && (v.widgets as unknown[]).length > 0,
      );
    const hasActions = Object.keys(spec.actions ?? {}).length > 0;
    if (hasWidgets && hasActions) return 'overview';
    if (hasWidgets) return 'pages';
  } catch {
    /* fresh start */
  }
  return 'identity';
}
