/**
 * Action configuration helpers for the UI wizard — body mapping, triggers, state sync.
 */
import type { SpecState } from './uiSpecYaml';
import {
  collectActionReferences,
  defaultActionIdForHabit,
  habitIdFromEndpoint,
  linkHabitToAction,
  type ActionReference,
  type HabitOption,
} from './actionLinking';
import { collectWidgetsFromSpec, syncSpecWithInferredState } from './inferState';

export interface TriggerOption {
  id: string;
  label: string;
  ref: ActionReference;
  currentActionId: string;
}

const STATE_REF_RE = /^\{\{\s*state\.([^}\s]+)\s*\}\}$/;

export function objectToKvList(
  obj: Record<string, unknown> | undefined,
): Array<{ key: string; value: string }> {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).map(([key, value]) => ({
    key,
    value: value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value),
  }));
}

export function kvListToObject(rows: Array<{ key: string; value: string }>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    const k = row.key.trim();
    if (!k) continue;
    const v = row.value.trim();
    if (v === 'true') out[k] = true;
    else if (v === 'false') out[k] = false;
    else if (v === 'null') out[k] = null;
    else if (v.startsWith('$') || v.includes('{{')) out[k] = v;
    else if (/^-?\d+(\.\d+)?$/.test(v)) out[k] = Number(v);
    else out[k] = v;
  }
  return out;
}

/** Show friendly text in the body value field. */
export function displayBodyValue(stored: string): string {
  const m = stored.match(STATE_REF_RE);
  if (m) return m[1];
  return stored;
}

/** Convert user input to a stored action body value. */
export function storeBodyValue(display: string): string {
  const trimmed = display.trim();
  if (!trimmed) return '';
  if (trimmed.includes('{{') || trimmed.startsWith('$')) return trimmed;
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) return `{{state.${trimmed}}}`;
  return trimmed;
}

export function findActionIdForHabit(spec: SpecState, habitId: string): string | null {
  for (const [actionId, action] of Object.entries(spec.actions ?? {})) {
    if (!action || typeof action !== 'object') continue;
    if (habitIdFromEndpoint((action as Record<string, unknown>).endpoint) === habitId) {
      return actionId;
    }
  }
  return null;
}

export function habitInputsFor(habitId: string, linkableHabits: HabitOption[]): string[] {
  const habit = linkableHabits.find((h) => h.id === habitId);
  return habit?.inputs ?? [];
}

export function allHabitInputNames(linkableHabits: HabitOption[]): string[] {
  const names = new Set<string>();
  for (const h of linkableHabits) {
    for (const input of h.inputs ?? []) names.add(input);
  }
  return [...names];
}

export function ensureActionForHabit(
  spec: SpecState,
  habitId: string,
  linkableHabits: HabitOption[],
  slotKind: ActionReference['slotKind'] = 'form-submit',
): { spec: SpecState; actionId: string } {
  const existingId = findActionIdForHabit(spec, habitId);
  const actionId = existingId ?? defaultActionIdForHabit(habitId);
  let next = existingId
    ? spec
    : linkHabitToAction(spec, actionId, habitId, slotKind);

  const inputs = habitInputsFor(habitId, linkableHabits);
  const action = (next.actions[actionId] ?? {}) as Record<string, unknown>;
  const existingBody =
    action.body && typeof action.body === 'object' && !Array.isArray(action.body)
      ? (action.body as Record<string, unknown>)
      : {};

  const body: Record<string, string> = { ...existingBody } as Record<string, string>;
  for (const input of inputs) {
    if (!(input in body)) {
      body[input] = `{{state.${input}}}`;
    }
  }

  next = {
    ...next,
    actions: {
      ...next.actions,
      [actionId]: { ...action, body },
    },
  };

  return { spec: syncSpecWithInferredState(next), actionId };
}

export function updateActionBody(
  spec: SpecState,
  actionId: string,
  rows: Array<{ key: string; value: string }>,
): SpecState {
  const action = (spec.actions[actionId] ?? {}) as Record<string, unknown>;
  const body: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    const stored = storeBodyValue(row.value);
    if (stored) body[key] = stored;
  }
  const next: SpecState = {
    ...spec,
    actions: {
      ...spec.actions,
      [actionId]: { ...action, body },
    },
  };
  return syncSpecWithInferredState(next);
}

export function updateActionHandlerSet(
  spec: SpecState,
  actionId: string,
  handler: 'onSuccess' | 'onError',
  rows: Array<{ key: string; value: string }>,
  toast?: string,
): SpecState {
  const action = (spec.actions[actionId] ?? {}) as Record<string, unknown>;
  const existing = (action[handler] ?? {}) as Record<string, unknown>;
  const setObj = kvListToObject(rows);
  const patch: Record<string, unknown> = {
    ...existing,
    set: Object.keys(setObj).length ? setObj : undefined,
  };
  if (handler === 'onSuccess' && toast !== undefined) {
    patch.toast = toast || undefined;
  }
  const next: SpecState = {
    ...spec,
    actions: {
      ...spec.actions,
      [actionId]: { ...action, [handler]: patch },
    },
  };
  return syncSpecWithInferredState(next);
}

function setNested(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    const child = (cur[p] ?? {}) as Record<string, unknown>;
    cur[p] = child;
    cur = child;
  }
  cur[parts[parts.length - 1]] = value;
}

function widgetMatchesRef(w: Record<string, unknown>, ref: ActionReference): boolean {
  const uid = typeof w.uid === 'string' ? w.uid : undefined;
  if (ref.widgetUid && uid === ref.widgetUid) return true;
  if (!ref.widgetUid) {
    if (ref.propPath === 'submit.action' && w.kind === 'form') return true;
    if (ref.propPath === 'action' && w.kind === 'button') return true;
    if (ref.propPath === 'loadAction' && (w.kind === 'history-grid' || w.kind === 'history-list')) {
      return true;
    }
  }
  return false;
}

function patchWidgetForRef(w: Record<string, unknown>, ref: ActionReference, actionId: string): Record<string, unknown> {
  const next = { ...w };
  if (ref.propPath === 'submit.action') {
    const submit = (w.submit ?? {}) as Record<string, unknown>;
    next.submit = { label: submit.label ?? 'Submit', ...submit, action: actionId };
  } else if (ref.propPath === 'action') {
    next.action = actionId;
  } else if (ref.propPath === 'loadAction') {
    next.loadAction = actionId;
  } else if (ref.propPath === 'onClick.action') {
    next.onClick = { ...(w.onClick as Record<string, unknown>), action: actionId };
  } else {
    setNested(next, ref.propPath, actionId);
  }
  return next;
}

function patchWidgetTree(
  widgets: unknown[],
  ref: ActionReference,
  actionId: string,
): unknown[] {
  return widgets.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const w = item as Record<string, unknown>;
    let next = widgetMatchesRef(w, ref) ? patchWidgetForRef(w, ref, actionId) : { ...w };
    if (Array.isArray(next.children)) {
      next = {
        ...next,
        children: patchWidgetTree(next.children as unknown[], ref, actionId),
      };
    }
    return next;
  });
}

export function assignActionToTrigger(
  spec: SpecState,
  actionId: string,
  ref: ActionReference,
): SpecState {
  if (ref.propPath === 'onEnter' && ref.viewId) {
    const views = { ...(spec.views ?? {}) };
    views[ref.viewId] = { ...(views[ref.viewId] ?? {}), onEnter: actionId };
    return { ...spec, views };
  }

  if (ref.viewId && spec.views?.[ref.viewId]) {
    const view = spec.views[ref.viewId];
    const rawWidgets = view.widgets;
    const widgets = patchWidgetTree(Array.isArray(rawWidgets) ? rawWidgets : [], ref, actionId);
    const views = { ...spec.views, [ref.viewId]: { ...view, widgets } };
    const next: SpecState = { ...spec, views };
    if (spec.activeViewId === ref.viewId || spec.defaultView === ref.viewId) {
      next.widgets = widgets as SpecState['widgets'];
    }
    return next;
  }

  const widgets = patchWidgetTree(collectWidgetsFromSpec(spec), ref, actionId);
  return { ...spec, widgets: widgets as SpecState['widgets'] };
}

export function listTriggerOptions(spec: SpecState): TriggerOption[] {
  const refs = collectActionReferences(spec);
  const options: TriggerOption[] = refs.map((ref) => ({
    id: `${ref.location}|${ref.propPath}|${ref.actionId}`,
    label: ref.location,
    ref,
    currentActionId: ref.actionId,
  }));

  const walk = (widgets: Array<Record<string, unknown>>, viewId?: string, prefix = '') => {
    for (const w of widgets) {
      const kind = String(w.kind ?? '');
      const loc = viewId ? `Tab "${viewId}" › ${prefix}${kind}` : `${prefix}${kind}`;
      if (kind === 'form') {
        const submit = (w.submit ?? {}) as Record<string, unknown>;
        const actionId = submit.action ? String(submit.action) : '';
        // Wired forms already come from collectActionReferences — only offer empty slots here.
        if (!actionId) {
          const ref: ActionReference = {
            location: `${loc} › form submit`,
            actionId: '',
            slotKind: 'form-submit',
            viewId,
            widgetUid: typeof w.uid === 'string' ? w.uid : undefined,
            propPath: 'submit.action',
          };
          if (!options.some((o) => o.ref.location === ref.location)) {
            options.push({
              id: `${ref.location}|${ref.propPath}|`,
              label: ref.location,
              ref,
              currentActionId: '',
            });
          }
        }
      }
      if (kind === 'button' && !w.action) {
        const ref: ActionReference = {
          location: `${loc} › button`,
          actionId: '',
          slotKind: 'button',
          viewId,
          widgetUid: typeof w.uid === 'string' ? w.uid : undefined,
          propPath: 'action',
        };
        if (!options.some((o) => o.ref.location === ref.location)) {
          options.push({
            id: `${ref.location}|action|`,
            label: ref.location,
            ref,
            currentActionId: '',
          });
        }
      }
      if (Array.isArray(w.children)) {
        walk(w.children as Array<Record<string, unknown>>, viewId, `${prefix}${kind} › `);
      }
    }
  };

  // Walk nested trees only. Never use collectWidgetsFromSpec here — it flattens children into
  // siblings and duplicates form submit options. When views exist, widgets is only a mirror.
  if (spec.views && Object.keys(spec.views).length > 0) {
    for (const [viewId, view] of Object.entries(spec.views)) {
      const raw = view?.widgets;
      if (Array.isArray(raw)) walk(raw as Array<Record<string, unknown>>, viewId);
    }
  } else {
    walk(spec.widgets.map((n) => widgetNodeToRecord(n)));
  }

  const nav = spec.layout.nav ?? [];
  const viewIds = nav.length > 0 ? nav.map((n) => n.id) : Object.keys(spec.views ?? {});
  if (viewIds.length > 1) {
    for (const viewId of viewIds) {
      if (options.some((o) => o.ref.propPath === 'onEnter' && o.ref.viewId === viewId)) continue;
      const navItem = nav.find((n) => n.id === viewId);
      const tabLabel = navItem?.label ?? viewId;
      const ref: ActionReference = {
        location: `Tab "${tabLabel}" › on enter`,
        actionId: '',
        slotKind: 'load',
        viewId,
        propPath: 'onEnter',
      };
      options.push({
        id: `${ref.location}|onEnter|${viewId}`,
        label: ref.location,
        ref,
        currentActionId: '',
      });
    }
  }

  return options;
}

/** Flatten WidgetNode keeping children nested (not sibling-duplicated). */
function widgetNodeToRecord(node: {
  kind: string;
  uid?: string;
  props?: Record<string, unknown>;
  children?: unknown[];
}): Record<string, unknown> {
  const children = Array.isArray(node.children)
    ? node.children.map((c) => {
        if (!c || typeof c !== 'object') return {};
        const child = c as {
          kind: string;
          uid?: string;
          props?: Record<string, unknown>;
          children?: unknown[];
        };
        return child.props && typeof child.props === 'object'
          ? widgetNodeToRecord(child)
          : (c as Record<string, unknown>);
      })
    : undefined;
  return {
    kind: node.kind,
    uid: node.uid,
    ...(node.props ?? {}),
    ...(children ? { children } : {}),
  };
}

export function findTriggersForAction(spec: SpecState, actionId: string): TriggerOption[] {
  return listTriggerOptions(spec).filter((o) => o.currentActionId === actionId);
}
