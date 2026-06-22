import type { ActionSpec, UiSpec, WidgetSpec } from '@ha-bits/cortex-core/ui/types';
import { extractBodyKeys, extractStateRefs, parseWorkflowIdFromEndpoint } from './templateUtils';

export interface UiFormField {
  name: string;
  bindTo: string;
  submitAction?: string;
}

export interface UiActionBinding {
  actionId: string;
  workflowId: string | null;
  bodyKeys: string[];
  queryKeys: string[];
  bodyStateRefs: Record<string, string[]>;
  responsePath?: string;
  onSuccessStateKeys: string[];
  /** State keys set to $response on success */
  onSuccessResponseTargets: string[];
}

export interface UiSpecAnalysis {
  stateKeys: Set<string>;
  formFields: UiFormField[];
  actionRefs: Set<string>;
  actions: UiActionBinding[];
  resultPanelSources: string[];
  unknownActionRefs: string[];
}

function walkWidgets(widgets: WidgetSpec[] | undefined, visit: (w: WidgetSpec) => void): void {
  if (!widgets) return;
  for (const w of widgets) {
    visit(w);
    const anyW = w as unknown as Record<string, unknown>;
    if (Array.isArray(anyW.children)) walkWidgets(anyW.children as WidgetSpec[], visit);
    if (Array.isArray(anyW.sections)) walkWidgets(anyW.sections as WidgetSpec[], visit);
    if (w.kind === 'tabs' && 'tabs' in w) {
      for (const tab of (w as { tabs: Array<{ children?: WidgetSpec[] }> }).tabs) {
        walkWidgets(tab.children, visit);
      }
    }
    if (w.kind === 'accordion' && 'items' in w) {
      for (const item of (w as { items: Array<{ children?: WidgetSpec[] }> }).items) {
        walkWidgets(item.children, visit);
      }
    }
  }
}

function analyzeActionBody(body: ActionSpec['body']): Record<string, string[]> {
  const refs: Record<string, string[]> = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return refs;
  for (const [key, val] of Object.entries(body)) {
    if (typeof val === 'string') refs[key] = extractStateRefs(val);
  }
  return refs;
}

function collectOnSuccessStateKeys(action: ActionSpec): { keys: string[]; responseTargets: string[] } {
  const keys: string[] = [];
  const responseTargets: string[] = [];
  const set = action.onSuccess?.set;
  if (set) {
    for (const [targetKey, val] of Object.entries(set)) {
      if (typeof val === 'string') {
        if (val === '$response') responseTargets.push(targetKey);
        else if (val.startsWith('state.')) keys.push(val.slice('state.'.length));
        else keys.push(val);
      }
    }
  }
  return { keys, responseTargets };
}

function processWidget(w: WidgetSpec, ctx: {
  formFields: UiFormField[];
  actionRefs: Set<string>;
  resultPanelSources: string[];
}): void {
  if (w.kind === 'form') {
    const bindTo = (w as { bindTo?: string }).bindTo ?? 'state';
    const submitAction = (w as { submit?: { action?: string } }).submit?.action;
    for (const f of (w as { fields?: Array<{ name: string }> }).fields ?? []) {
      ctx.formFields.push({ name: f.name, bindTo, submitAction });
      if (submitAction) ctx.actionRefs.add(submitAction);
    }
    for (const sec of (w as { secondary?: Array<{ action: string }> }).secondary ?? []) {
      ctx.actionRefs.add(sec.action);
    }
  }
  if (w.kind === 'button' || w.kind === 'action-button' || w.kind === 'submit-button') {
    const action = (w as { action?: string }).action;
    if (action) ctx.actionRefs.add(action);
  }
  if (w.kind === 'result-panel') {
    const source = (w as { source?: string }).source;
    if (source) ctx.resultPanelSources.push(source);
  }
  if (w.kind === 'pre' || w.kind === 'code-block' || w.kind === 'json-dump' || w.kind === 'markdown') {
    const source = (w as { source?: string }).source;
    if (source?.startsWith('state.')) ctx.resultPanelSources.push(source);
  }
}

export function analyzeUiSpec(spec: UiSpec): UiSpecAnalysis {
  const stateKeys = new Set(Object.keys(spec.state ?? {}));
  const formFields: UiFormField[] = [];
  const actionRefs = new Set<string>();
  const resultPanelSources: string[] = [];
  const defaultWorkflowId = spec.meta?.id;
  const ctx = { formFields, actionRefs, resultPanelSources };

  walkWidgets(spec.widgets, (w) => processWidget(w, ctx));
  for (const view of Object.values(spec.views ?? {})) {
    walkWidgets(view.widgets, (w) => processWidget(w, ctx));
  }

  const actionMap = spec.actions ?? {};
  const unknownActionRefs: string[] = [];
  for (const ref of actionRefs) {
    if (!actionMap[ref]) unknownActionRefs.push(ref);
  }

  const actions: UiActionBinding[] = [];
  for (const [actionId, action] of Object.entries(actionMap)) {
    const onSuccess = collectOnSuccessStateKeys(action);
    const isClientOnly = !action.endpoint && !action.method;
    actions.push({
      actionId,
      workflowId: isClientOnly
        ? null
        : parseWorkflowIdFromEndpoint(action.endpoint, defaultWorkflowId),
      bodyKeys: extractBodyKeys(action.body),
      queryKeys: extractBodyKeys(action.query),
      bodyStateRefs: analyzeActionBody(action.body),
      responsePath: action.responsePath ?? 'output',
      onSuccessStateKeys: onSuccess.keys,
      onSuccessResponseTargets: onSuccess.responseTargets,
    });
  }

  return { stateKeys, formFields, actionRefs, actions, resultPanelSources, unknownActionRefs };
}
