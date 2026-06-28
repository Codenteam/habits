/**
 * Link UI widgets / views to backend habits (workflows) as actions.
 */
import type { SpecState, WidgetNode } from './uiSpecYaml';
import { getFormFieldNames } from './inferState';

export interface HabitOption {
  id: string;
  name?: string;
  /** Input field names extracted from habits.input.* in the workflow */
  inputs?: string[];
}

export interface ActionReference {
  /** Where the reference lives */
  location: string;
  /** Current action id on the widget/view */
  actionId: string;
  /** Suggested slot kind for default action shape */
  slotKind: 'form-submit' | 'button' | 'load' | 'get' | 'client';
  viewId?: string;
  widgetUid?: string;
  propPath: string;
}

export function habitIdFromEndpoint(endpoint: unknown): string | null {
  if (typeof endpoint !== 'string') return null;
  const m = endpoint.match(/\/api\/([^/?\s{]+)/);
  return m?.[1] ?? null;
}

/** Default action id when linking a habit — readable camelCase from habit id. */
export function defaultActionIdForHabit(habitId: string): string {
  const parts = habitId.split('-').filter(Boolean);
  if (parts.length === 0) return 'run';
  const [first, ...rest] = parts;
  return (
    first +
    rest.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')
  );
}

export function suggestedActionBodyFromForms(spec: SpecState): Record<string, string> {
  const fields = getFormFieldNames(spec);
  const body: Record<string, string> = {};
  for (const f of fields) body[f] = `{{state.${f}}}`;
  return body;
}

export function createApiActionForHabit(
  habitId: string,
  _actionId: string,
  spec: SpecState,
  slotKind: ActionReference['slotKind'] = 'button',
): Record<string, unknown> {
  if (slotKind === 'client') {
    return { set: { result: null, error: null } };
  }
  if (slotKind === 'load') {
    return {
      method: 'POST',
      endpoint: `/api/${habitId}`,
      body: { limit: 12 },
      responsePath: 'output',
    };
  }
  if (slotKind === 'get') {
    return {
      method: 'GET',
      endpoint: `/api/${habitId}`,
      query: { id: '{{params.id}}' },
      responsePath: 'output',
      onSuccess: {
        set: { result: '$response', error: null },
      },
    };
  }
  const body = slotKind === 'form-submit' ? suggestedActionBodyFromForms(spec) : {};
  return {
    method: 'POST',
    endpoint: `/api/${habitId}`,
    body: Object.keys(body).length ? body : {},
    responsePath: 'output',
    onSuccess: { set: { result: '$response', error: null }, toast: 'Done' },
    onError: { set: { error: '$error.message' } },
  };
}

function walkWidgetNodes(
  nodes: WidgetNode[],
  visit: (node: WidgetNode, path: string) => void,
  prefix = '',
): void {
  for (const node of nodes) {
    const path = prefix ? `${prefix} › ${node.kind}` : node.kind;
    visit(node, path);
    if (node.children?.length) walkWidgetNodes(node.children, visit, path);
  }
}

function refsFromWidget(node: WidgetNode, location: string, viewId?: string): ActionReference[] {
  const p = node.props;
  const refs: ActionReference[] = [];
  const base = { viewId, widgetUid: node.uid };
  const submit = p.submit as { action?: unknown } | undefined;

  if (node.kind === 'form' && submit?.action) {
    refs.push({
      ...base,
      location: `${location} › form submit`,
      actionId: String(submit.action),
      slotKind: 'form-submit',
      propPath: 'submit.action',
    });
  }
  if (node.kind === 'button' && p.action) {
    const id = String(p.action);
    refs.push({
      ...base,
      location: `${location} › button`,
      actionId: id,
      slotKind: id.startsWith('clear') ? 'client' : 'button',
      propPath: 'action',
    });
  }
  if ((node.kind === 'history-grid' || node.kind === 'history-list') && p.loadAction) {
    refs.push({
      ...base,
      location: `${location} › ${node.kind}`,
      actionId: String(p.loadAction),
      slotKind: 'load',
      propPath: 'loadAction',
    });
  }
  if (p.onClick && typeof p.onClick === 'object' && (p.onClick as Record<string, unknown>).action) {
    refs.push({
      ...base,
      location: `${location} › onClick`,
      actionId: String((p.onClick as Record<string, unknown>).action),
      slotKind: 'get',
      propPath: 'onClick.action',
    });
  }
  return refs;
}

/** All action ids referenced by widgets and views. */
export function collectActionReferences(spec: SpecState): ActionReference[] {
  const refs: ActionReference[] = [];

  const scanWidgets = (widgets: WidgetNode[], viewId?: string) => {
    walkWidgetNodes(widgets, (node, path) => {
      const loc = viewId ? `Tab “${viewId}” › ${path}` : path;
      refs.push(...refsFromWidget(node, loc, viewId));
    });
  };

  scanWidgets(spec.widgets);
  if (spec.views) {
    for (const [viewId, view] of Object.entries(spec.views)) {
      const raw = view?.widgets;
      if (!Array.isArray(raw)) continue;
      // Views store flat widget objects — scan via collectWidgetsFromSpec pattern
      const walkFlat = (items: unknown[], prefix: string) => {
        for (const item of items) {
          if (!item || typeof item !== 'object') continue;
          const w = item as Record<string, unknown>;
          const kind = String(w.kind ?? '');
          const fakeNode: WidgetNode = {
            uid: String(w.uid ?? kind),
            kind,
            props: { ...w },
            children: undefined,
          };
          delete fakeNode.props.kind;
          delete fakeNode.props.uid;
          delete fakeNode.props.children;
          if (Array.isArray(w.children)) {
            walkFlat(w.children as unknown[], `${prefix} › ${kind}`);
          }
          refs.push(...refsFromWidget(fakeNode, `Tab “${viewId}” › ${prefix} › ${kind}`, viewId));
        }
      };
      walkFlat(raw as unknown[], kindFromView(viewId));
      if (view?.onEnter) {
        refs.push({
          location: `Tab “${viewId}” › on enter`,
          actionId: String(view.onEnter),
          slotKind: 'load',
          viewId,
          propPath: 'onEnter',
        });
      }
    }
  }

  return refs;
}

function kindFromView(viewId: string): string {
  return viewId;
}

export function isActionDefined(
  spec: SpecState,
  actionId: string,
  linkableHabitIds: string[],
): boolean {
  const action = spec.actions?.[actionId];
  if (!action || typeof action !== 'object') return false;
  const a = action as Record<string, unknown>;
  if (!a.endpoint) return true; // client-only
  const habitId = habitIdFromEndpoint(a.endpoint);
  if (!habitId) return true;
  return linkableHabitIds.includes(habitId);
}

export function missingActionReferences(
  spec: SpecState,
  linkableHabitIds: string[],
): ActionReference[] {
  const seen = new Set<string>();
  return collectActionReferences(spec).filter((ref) => {
    const key = `${ref.location}:${ref.actionId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    if (!ref.actionId) return true;
    return !isActionDefined(spec, ref.actionId, linkableHabitIds);
  });
}

export function linkHabitToAction(
  spec: SpecState,
  actionId: string,
  habitId: string,
  slotKind: ActionReference['slotKind'] = 'button',
): SpecState {
  return {
    ...spec,
    actions: {
      ...spec.actions,
      [actionId]: createApiActionForHabit(habitId, actionId, spec, slotKind),
    },
  };
}
