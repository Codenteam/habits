import type { SpecState } from './uiSpecYaml';
import { parseYamlToSpecState } from './uiSpecYaml';
import { missingActionReferences } from './actionLinking';

export type WizardStepId =
  | 'identity'
  | 'layout'
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
    id: 'layout',
    label: 'Layout',
    description: 'Single page or tabs',
    showCanvas: true,
  },
  {
    id: 'pages',
    label: 'Build pages',
    description: 'Pick a template, then add presets and widgets',
    showCanvas: true,
  },
  {
    id: 'actions',
    label: 'Actions',
    description: 'Wire habits, map inputs, and connect triggers',
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
}

export interface StepValidation {
  ok: boolean;
  reason?: string;
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
    case 'layout': {
      if (spec.layout.type === 'tabs' || spec.layout.type === 'sidebar') {
        if (!spec.layout.nav?.length) return { ok: false, reason: 'Add at least one tab' };
        if (!spec.defaultView) return { ok: false, reason: 'Choose a default tab' };
      }
      return { ok: true };
    }
    case 'pages': {
      const hasViewWidgets =
        spec.widgets.length > 0 ||
        (spec.views &&
          Object.values(spec.views).some(
            (v) => Array.isArray(v?.widgets) && (v.widgets as unknown[]).length > 0,
          ));
      if (!hasViewWidgets) return { ok: false, reason: 'Add a page pattern or widget' };
      return { ok: true };
    }
    case 'actions': {
      const missing = missingActionReferences(spec, ctx.linkableHabitIds);
      if (missing.length > 0) {
        return {
          ok: false,
          reason: `Connect ${missing.length} widget trigger${missing.length === 1 ? '' : 's'} to an action`,
        };
      }
      if (Object.keys(spec.actions ?? {}).length === 0 && ctx.linkableHabitIds.length > 0) {
        return { ok: false, reason: 'Configure at least one habit action' };
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
    if (hasWidgets && Object.keys(spec.actions ?? {}).length > 0) return 'overview';
  } catch {
    /* fresh start */
  }
  return 'identity';
}
