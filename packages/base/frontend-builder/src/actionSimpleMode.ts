/**
 * Simplified action wiring for non-technical users — auto-match, presets, plain summaries.
 */
import type { SpecState } from './uiSpecYaml';
import type { HabitOption } from './actionLinking';
import { collectWidgetsFromSpec, syncSpecWithInferredState } from './inferState';
import {
  displayBodyValue,
  findActionIdForHabit,
  findTriggersForAction,
  listTriggerOptions,
  type TriggerOption,
  updateActionBody,
  updateActionHandlerSet,
} from './actionConfig';

export interface FormFieldOption {
  name: string;
  label: string;
}

export interface DisplayWidgetOption {
  id: string;
  label: string;
  kind: string;
  source?: string;
}

export interface SimpleActionOutcome {
  showToast: boolean;
  toastMessage: string;
  showResult: boolean;
  resultTarget: 'add' | 'existing';
  resultWidgetId: string;
  showErrors: boolean;
}

export function humanizeFieldName(key: string): string {
  if (!key) return '';
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Friendly label for trigger dropdown options. */
export function friendlyTriggerLabel(option: TriggerOption, spec: SpecState): string {
  const loc = option.label;
  if (loc.includes('form submit')) {
    const formTitle = findParentCardTitle(spec, option.ref);
    const submit = findFormSubmitLabel(spec, option.ref);
    if (formTitle && submit) return `${submit} on ${formTitle}`;
    if (formTitle) return `Submit on ${formTitle}`;
    return 'Submit button on form';
  }
  if (loc.includes('button')) {
    const btnLabel = findButtonLabel(spec, option.ref);
    return btnLabel ? `Button: ${btnLabel}` : 'Button click';
  }
  if (loc.includes('on enter')) {
    const viewId = option.ref.viewId;
    if (!viewId) return 'When page opens';
    const navItem = spec.layout.nav?.find((n) => n.id === viewId);
    const tab = navItem?.label ?? viewId;
    return `When "${tab}" tab opens`;
  }
  return loc.replace(/ › /g, ' → ').replace(/Tab "/g, '').replace(/" › /g, ' → ');
}

function walkWidgetTree(
  widgets: unknown[] | undefined,
  visit: (w: Record<string, unknown>, parents: Record<string, unknown>[]) => void,
  parents: Record<string, unknown>[] = [],
): void {
  if (!widgets) return;
  for (const item of widgets) {
    if (!item || typeof item !== 'object') continue;
    const w = item as Record<string, unknown>;
    visit(w, parents);
    const nextParents = [...parents, w];
    if (Array.isArray(w.children)) walkWidgetTree(w.children as unknown[], visit, nextParents);
  }
}

/** Walk each widget once — when views exist, skip `spec.widgets` (active-view mirror). */
function walkSpecWidgetTree(
  spec: SpecState,
  visit: (w: Record<string, unknown>, parents: Record<string, unknown>[]) => void,
): void {
  if (spec.views && Object.keys(spec.views).length > 0) {
    for (const view of Object.values(spec.views)) {
      walkWidgetTree(view?.widgets as unknown[], visit);
    }
    return;
  }
  walkWidgetTree(widgetNodesToRecords(spec.widgets as unknown[]), visit);
}

/** Normalize WidgetNode `{ kind, props, children }` into flat records for tree walks. */
function widgetNodesToRecords(widgets: unknown[] | undefined): Record<string, unknown>[] {
  if (!widgets) return [];
  return widgets.map((item) => {
    if (!item || typeof item !== 'object') return {};
    const n = item as Record<string, unknown>;
    if (n.props && typeof n.props === 'object') {
      return {
        kind: n.kind,
        uid: n.uid,
        ...(n.props as Record<string, unknown>),
        children: Array.isArray(n.children) ? widgetNodesToRecords(n.children as unknown[]) : undefined,
      };
    }
    return {
      ...n,
      children: Array.isArray(n.children) ? widgetNodesToRecords(n.children as unknown[]) : n.children,
    };
  });
}

function findParentCardTitle(spec: SpecState, ref: TriggerOption['ref']): string | null {
  let found: string | null = null;
  const match = (w: Record<string, unknown>, parents: Record<string, unknown>[]) => {
    if (ref.widgetUid && w.uid !== ref.widgetUid && w.kind !== 'form') return;
    if (w.kind === 'form' && ref.propPath === 'submit.action') {
      for (let i = parents.length - 1; i >= 0; i--) {
        const p = parents[i];
        if (p.kind === 'card' && typeof p.title === 'string') {
          found = p.title;
          return;
        }
      }
      found = 'Form';
    }
  };
  walkWidgetTree(collectWidgetsFromSpec(spec) as unknown[], match);
  if (spec.views) {
    for (const view of Object.values(spec.views)) {
      walkWidgetTree(view?.widgets as unknown[], match);
    }
  }
  return found;
}

function findFormSubmitLabel(spec: SpecState, ref: TriggerOption['ref']): string | null {
  let label: string | null = null;
  walkWidgetTree(collectWidgetsFromSpec(spec) as unknown[], (w) => {
    if (w.kind !== 'form') return;
    if (ref.widgetUid && w.uid !== ref.widgetUid) return;
    const submit = (w.submit ?? {}) as Record<string, unknown>;
    if (typeof submit.label === 'string') label = submit.label;
  });
  if (spec.views) {
    for (const view of Object.values(spec.views)) {
      walkWidgetTree(view?.widgets as unknown[], (w) => {
        if (w.kind !== 'form') return;
        const submit = (w.submit ?? {}) as Record<string, unknown>;
        if (typeof submit.label === 'string') label = submit.label;
      });
    }
  }
  return label;
}

function findButtonLabel(spec: SpecState, _ref: TriggerOption['ref']): string | null {
  let label: string | null = null;
  const scan = (w: Record<string, unknown>) => {
    if (w.kind === 'button' && typeof w.label === 'string') label = w.label;
  };
  walkWidgetTree(collectWidgetsFromSpec(spec) as unknown[], scan);
  return label;
}

export function getFormFieldsWithLabels(spec: SpecState): FormFieldOption[] {
  const out: FormFieldOption[] = [];
  const seen = new Set<string>();
  const add = (name: string, label: string) => {
    if (!name || seen.has(name)) return;
    seen.add(name);
    out.push({ name, label: label || humanizeFieldName(name) });
  };
  walkWidgetTree(collectWidgetsFromSpec(spec) as unknown[], (w) => {
    if (w.kind !== 'form') return;
    for (const f of (w.fields as Array<Record<string, unknown>>) ?? []) {
      const name = typeof f.name === 'string' ? f.name : '';
      const label = typeof f.label === 'string' ? f.label : humanizeFieldName(name);
      add(name, label);
    }
  });
  if (spec.views) {
    for (const view of Object.values(spec.views)) {
      walkWidgetTree(view?.widgets as unknown[], (w) => {
        if (w.kind !== 'form') return;
        for (const f of (w.fields as Array<Record<string, unknown>>) ?? []) {
          const name = typeof f.name === 'string' ? f.name : '';
          const label = typeof f.label === 'string' ? f.label : humanizeFieldName(name);
          add(name, label);
        }
      });
    }
  }
  return out;
}

export function autoMatchFormToHabitInputs(
  habitInputs: string[],
  formFields: FormFieldOption[],
): Record<string, string> {
  const formNames = new Set(formFields.map((f) => f.name));
  const mapping: Record<string, string> = {};
  for (const input of habitInputs) {
    if (formNames.has(input)) {
      mapping[input] = input;
      continue;
    }
    const lower = input.toLowerCase();
    const match = formFields.find((f) => f.name.toLowerCase() === lower);
    if (match) mapping[input] = match.name;
  }
  return mapping;
}

export function getBodyMappingFromAction(
  spec: SpecState,
  actionId: string,
  habitInputs: string[],
): Record<string, string> {
  const action = (spec.actions[actionId] ?? {}) as Record<string, unknown>;
  const body =
    action.body && typeof action.body === 'object' && !Array.isArray(action.body)
      ? (action.body as Record<string, unknown>)
      : {};
  const mapping: Record<string, string> = {};
  for (const input of habitInputs) {
    const val = body[input];
    if (typeof val === 'string') {
      mapping[input] = displayBodyValue(val);
    }
  }
  return mapping;
}

export function applyBodyMapping(
  spec: SpecState,
  actionId: string,
  habitInputs: string[],
  mapping: Record<string, string>,
): SpecState {
  const rows = habitInputs.map((input) => ({
    key: input,
    value: mapping[input] ?? '',
  }));
  const extraKeys = Object.keys(
    ((spec.actions[actionId] as Record<string, unknown>)?.body as Record<string, unknown>) ?? {},
  ).filter((k) => !habitInputs.includes(k));
  for (const k of extraKeys) {
    const body = (spec.actions[actionId] as Record<string, unknown>).body as Record<string, unknown>;
    rows.push({ key: k, value: displayBodyValue(String(body[k] ?? '')) });
  }
  return updateActionBody(spec, actionId, rows);
}

export function listDisplayWidgets(spec: SpecState): DisplayWidgetOption[] {
  const kinds = new Set(['result-panel', 'status-banner', 'pre', 'code-block', 'markdown', 'text']);
  const out: DisplayWidgetOption[] = [];
  let n = 0;
  const seen = new Set<string>();
  const scan = (w: Record<string, unknown>) => {
    const kind = String(w.kind ?? '');
    if (!kinds.has(kind)) return;
    n += 1;
    const title = typeof w.title === 'string' ? w.title : humanizeFieldName(kind);
    const source = typeof w.source === 'string' ? w.source : undefined;
    const id = typeof w.uid === 'string' ? w.uid : `display-${n}`;
    const key = typeof w.uid === 'string' ? `uid:${w.uid}` : `${kind}|${source ?? ''}|${title}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ id, label: title, kind, source });
  };
  walkSpecWidgetTree(spec, scan);
  return out;
}

function hasErrorBanner(spec: SpecState): boolean {
  let found = false;
  const scan = (w: Record<string, unknown>) => {
    if (w.kind === 'status-banner') {
      const src = w.source ?? w.showWhen;
      if (typeof src === 'string' && src.includes('error')) found = true;
    }
  };
  walkSpecWidgetTree(spec, scan);
  return found;
}

function appendWidgets(spec: SpecState, widgets: Record<string, unknown>[]): SpecState {
  const existing = collectWidgetsFromSpec(spec) as Record<string, unknown>[];
  const flat = [...existing, ...widgets];
  return {
    ...spec,
    widgets: flat as unknown as SpecState['widgets'],
  };
}

export function readSimpleActionOutcome(spec: SpecState, actionId: string): SimpleActionOutcome {
  const action = (spec.actions[actionId] ?? {}) as Record<string, unknown>;
  const onSuccess = (action.onSuccess ?? {}) as Record<string, unknown>;
  const onError = (action.onError ?? {}) as Record<string, unknown>;
  const successSet = (onSuccess.set ?? {}) as Record<string, unknown>;
  const errorSet = (onError.set ?? {}) as Record<string, unknown>;

  const displays = listDisplayWidgets(spec);
  const resultWidget = displays.find((d) => d.source?.includes('result'));

  return {
    showToast: Boolean(onSuccess.toast),
    toastMessage: String(onSuccess.toast ?? 'Done!'),
    showResult: 'result' in successSet || displays.some((d) => d.source?.includes('result')),
    resultTarget: resultWidget ? 'existing' : 'add',
    resultWidgetId: resultWidget?.id ?? 'add',
    showErrors: 'error' in errorSet || hasErrorBanner(spec),
  };
}

export interface ApplySimpleOutcomeOptions {
  showToast: boolean;
  toastMessage?: string;
  showResult: boolean;
  resultWidgetId: 'add' | string;
  showErrors: boolean;
}

export function applySimpleActionOutcome(
  spec: SpecState,
  actionId: string,
  options: ApplySimpleOutcomeOptions,
): SpecState {
  const action = (spec.actions[actionId] ?? {}) as Record<string, unknown>;
  const existingSuccess = (action.onSuccess ?? {}) as Record<string, unknown>;
  const existingError = (action.onError ?? {}) as Record<string, unknown>;
  const existingSuccessSet = { ...((existingSuccess.set ?? {}) as Record<string, unknown>) };
  const existingErrorSet = { ...((existingError.set ?? {}) as Record<string, unknown>) };

  let next = spec;

  if (options.showToast) {
    existingSuccess.toast = options.toastMessage?.trim() || 'Done!';
  } else {
    delete existingSuccess.toast;
  }

  if (options.showResult) {
    existingSuccessSet.result = '$response';
    existingSuccessSet.error = null;
  } else {
    delete existingSuccessSet.result;
  }

  if (options.showErrors) {
    existingErrorSet.error = '$error.message';
    if (options.showResult) {
      existingErrorSet.result = null;
    }
  } else {
    delete existingErrorSet.error;
  }

  const successRows = Object.entries(existingSuccessSet).map(([key, value]) => ({
    key,
    value: value == null ? 'null' : String(value),
  }));

  const errorRows = Object.entries(existingErrorSet).map(([key, value]) => ({
    key,
    value: value == null ? 'null' : String(value),
  }));

  next = updateActionHandlerSet(
    next,
    actionId,
    'onSuccess',
    successRows,
    options.showToast ? (options.toastMessage?.trim() || 'Done!') : '',
  );
  next = updateActionHandlerSet(next, actionId, 'onError', errorRows);

  if (options.showErrors && !hasErrorBanner(next)) {
    next = appendWidgets(next, [
      {
        kind: 'status-banner',
        showWhen: 'state.error',
        source: 'state.error',
      },
    ]);
  }

  if (options.showResult && options.resultWidgetId === 'add') {
    const hasResult = listDisplayWidgets(next).some((d) => d.source?.includes('result'));
    if (!hasResult) {
      next = appendWidgets(next, [
        {
          kind: 'result-panel',
          showWhen: 'state.result',
          source: 'state.result',
          title: 'Result',
          sections: [{ kind: 'json-dump', source: 'state.result', copy: true }],
        },
      ]);
    }
  }

  return syncSpecWithInferredState(next);
}

export function resolveBodyMapping(
  habitInputs: string[],
  formFields: FormFieldOption[],
  existing: Record<string, string>,
): Record<string, string> {
  const formNames = new Set(formFields.map((f) => f.name));
  const auto = autoMatchFormToHabitInputs(habitInputs, formFields);
  const mapping: Record<string, string> = { ...auto };
  for (const input of habitInputs) {
    const v = existing[input];
    if (v && formNames.has(v)) mapping[input] = v;
  }
  return mapping;
}

export function unmatchedHabitInputs(
  habitInputs: string[],
  mapping: Record<string, string>,
  formFields?: FormFieldOption[],
): string[] {
  if (!formFields?.length) {
    return habitInputs.filter((input) => !mapping[input]?.trim());
  }
  const formNames = new Set(formFields.map((f) => f.name));
  return habitInputs.filter((input) => {
    const mapped = mapping[input]?.trim();
    return !mapped || !formNames.has(mapped);
  });
}

/** Returns habit input names that are not mapped to a form field across all linkable habits. */
export function findUnmatchedInputsAcrossHabits(
  spec: SpecState,
  linkableHabits: HabitOption[],
): string[] {
  const formFields = getFormFieldsWithLabels(spec);
  const unmatched: string[] = [];
  for (const habit of linkableHabits) {
    const actionId = findActionIdForHabit(spec, habit.id);
    if (!actionId) continue;
    const inputs = habit.inputs ?? [];
    const existing = getBodyMappingFromAction(spec, actionId, inputs);
    const mapping = resolveBodyMapping(inputs, formFields, existing);
    unmatched.push(...unmatchedHabitInputs(inputs, mapping, formFields));
  }
  return unmatched;
}

export function describeActionInPlainEnglish(
  spec: SpecState,
  habitId: string,
  actionId: string,
  habitName?: string,
  habitInputs?: string[],
  mapping?: Record<string, string>,
  outcome?: SimpleActionOutcome,
): string {
  const workflowName = habitName ?? humanizeFieldName(habitId);
  const triggers = findTriggersForAction(spec, actionId);
  const triggerLabel =
    triggers.length > 0
      ? friendlyTriggerLabel(triggers[0], spec)
      : 'Submit';

  const formFields = getFormFieldsWithLabels(spec);
  const inputs = habitInputs ?? habitInputsFromAction(spec, actionId);
  const map = mapping ?? getBodyMappingFromAction(spec, actionId, inputs);
  const sentLabels = Object.entries(map)
    .filter(([, v]) => v)
    .map(([input, formName]) => {
      const f = formFields.find((x) => x.name === formName);
      return f?.label ?? humanizeFieldName(input);
    });

  const parts: string[] = [];
  if (triggers.length > 0) {
    parts.push(
      sentLabels.length > 0
        ? `When someone clicks **${triggerLabel}**, **${sentLabels.join('**, **')}** are sent to **${workflowName}**.`
        : `When someone clicks **${triggerLabel}**, **${workflowName}** runs.`,
    );
  } else {
    parts.push(`Connect a Submit button to run **${workflowName}**.`);
  }

  const o = outcome ?? readSimpleActionOutcome(spec, actionId);
  const after: string[] = [];
  if (o.showResult) after.push('the response is shown on screen');
  if (o.showToast) after.push('a success message appears');
  if (o.showErrors) after.push('errors are shown if something fails');
  if (after.length > 0) {
    parts.push(`Afterwards, ${after.join(', ')}.`);
  }

  return parts.join(' ');
}

function habitInputsFromAction(spec: SpecState, actionId: string): string[] {
  const action = spec.actions[actionId] as Record<string, unknown>;
  const body =
    action?.body && typeof action.body === 'object' && !Array.isArray(action.body)
      ? (action.body as Record<string, unknown>)
      : {};
  return Object.keys(body);
}

export function ensureAutoMatchedActions(
  spec: SpecState,
  linkableHabits: HabitOption[],
): SpecState {
  const formFields = getFormFieldsWithLabels(spec);
  let next = spec;
  for (const habit of linkableHabits) {
    const actionId = findActionIdForHabit(next, habit.id);
    if (!actionId) continue;
    const inputs = habit.inputs ?? [];
    if (inputs.length === 0) continue;
    const existing = getBodyMappingFromAction(next, actionId, inputs);
    const merged = resolveBodyMapping(inputs, formFields, existing);
    next = applyBodyMapping(next, actionId, inputs, merged);
  }
  return next;
}

export function getFormSubmitTriggers(spec: SpecState): TriggerOption[] {
  return listTriggerOptions(spec).filter((o) => o.ref.propPath === 'submit.action');
}
