/**
 * Per-state-key view of how data flows: forms → state → actions → outputs → displays.
 */
import type { SpecState } from './uiSpecYaml';
import { habitIdFromEndpoint } from './actionLinking';
import { collectWidgetsFromSpec, inferStateDefaults } from './inferState';

const STATE_REF_RE = /\{\{\s*state\.([^}\s]+)\s*\}\}/g;

export interface StateFormSource {
  fieldLabel: string;
  fieldName: string;
}

export interface StateActionSend {
  actionId: string;
  habitId: string | null;
  /** Habit input / body key this state value is mapped to */
  bodyKey: string;
}

export interface StateActionUpdate {
  actionId: string;
  habitId: string | null;
  handler: 'onSuccess' | 'onError';
  /** What fills this state key, e.g. $response or $error.message */
  expression: string;
}

export interface StateDisplayUse {
  widgetTitle: string;
  widgetKind: string;
  usage: 'source' | 'showWhen' | 'hideWhen';
}

export interface StateKeyProfile {
  key: string;
  label: string;
  startingValue: unknown;
  /** User types into a form field → this state key */
  filledFrom: StateFormSource[];
  /** State value sent as habit input when an action runs */
  sentTo: StateActionSend[];
  /** State updated when an action succeeds or fails */
  updatedBy: StateActionUpdate[];
  /** Widgets that read or conditionally show this state */
  shownIn: StateDisplayUse[];
}

function humanLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractStateRefs(value: unknown): string[] {
  const keys = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === 'string') {
      STATE_REF_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = STATE_REF_RE.exec(v)) !== null) keys.add(m[1]);
      return;
    }
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(value);
  return [...keys];
}

function walkWidgetTree(widgets: unknown[] | undefined, visit: (w: Record<string, unknown>) => void): void {
  if (!widgets) return;
  for (const item of widgets) {
    if (!item || typeof item !== 'object') continue;
    const w = item as Record<string, unknown>;
    visit(w);
    if (Array.isArray(w.children)) walkWidgetTree(w.children as unknown[], visit);
    if (Array.isArray(w.sections)) walkWidgetTree(w.sections as unknown[], visit);
  }
}

function ensureProfile(
  map: Map<string, StateKeyProfile>,
  key: string,
  spec: SpecState,
  defaults: Record<string, unknown>,
): StateKeyProfile {
  let p = map.get(key);
  if (!p) {
    p = {
      key,
      label: humanLabel(key),
      startingValue: spec.state[key] ?? defaults[key],
      filledFrom: [],
      sentTo: [],
      updatedBy: [],
      shownIn: [],
    };
    map.set(key, p);
  }
  return p;
}

/** Build a profile for every state key and how it connects across the spec. */
export function buildStateProfiles(spec: SpecState): StateKeyProfile[] {
  const defaults = inferStateDefaults(spec);
  const map = new Map<string, StateKeyProfile>();

  walkWidgetTree(collectWidgetsFromSpec(spec) as unknown[], (w) => {
    if (w.kind === 'form') {
      for (const f of (w.fields as Array<Record<string, unknown>>) ?? []) {
        const name = typeof f.name === 'string' ? f.name : '';
        if (!name) continue;
        const p = ensureProfile(map, name, spec, defaults);
        const label = typeof f.label === 'string' ? f.label : humanLabel(name);
        if (!p.filledFrom.some((x) => x.fieldName === name)) {
          p.filledFrom.push({ fieldLabel: label, fieldName: name });
        }
      }
    }

    const title = typeof w.title === 'string' ? w.title : String(w.kind ?? 'widget');
    const kind = String(w.kind ?? 'widget');

    if (typeof w.source === 'string' && w.source.startsWith('state.')) {
      const k = w.source.slice(6);
      const p = ensureProfile(map, k, spec, defaults);
      if (!p.shownIn.some((x) => x.widgetTitle === title && x.usage === 'source')) {
        p.shownIn.push({ widgetTitle: title, widgetKind: kind, usage: 'source' });
      }
    }

    for (const usage of ['showWhen', 'hideWhen'] as const) {
      const expr = w[usage];
      if (typeof expr !== 'string') continue;
      const refKey = expr.startsWith('state.') ? expr.slice(6) : null;
      if (!refKey) continue;
      const p = ensureProfile(map, refKey, spec, defaults);
      if (!p.shownIn.some((x) => x.widgetTitle === title && x.usage === usage)) {
        p.shownIn.push({ widgetTitle: title, widgetKind: kind, usage });
      }
    }
  });

  for (const [actionId, raw] of Object.entries(spec.actions ?? {})) {
    if (!raw || typeof raw !== 'object') continue;
    const a = raw as Record<string, unknown>;
    const habitId = habitIdFromEndpoint(a.endpoint);

    const body =
      a.body && typeof a.body === 'object' && !Array.isArray(a.body)
        ? (a.body as Record<string, unknown>)
        : {};
    for (const [bodyKey, val] of Object.entries(body)) {
      if (typeof val !== 'string') continue;
      const refs = extractStateRefs(val);
      for (const stateKey of refs) {
        const p = ensureProfile(map, stateKey, spec, defaults);
        if (!p.sentTo.some((s) => s.actionId === actionId && s.bodyKey === bodyKey)) {
          p.sentTo.push({ actionId, habitId, bodyKey });
        }
      }
    }

    const queryRefs = extractStateRefs(a.query);
    for (const stateKey of queryRefs) {
      const p = ensureProfile(map, stateKey, spec, defaults);
      if (!p.sentTo.some((s) => s.actionId === actionId && s.bodyKey === '(query)')) {
        p.sentTo.push({ actionId, habitId, bodyKey: '(query)' });
      }
    }

    for (const handler of ['onSuccess', 'onError'] as const) {
      const h = a[handler] as Record<string, unknown> | undefined;
      const setObj = h?.set as Record<string, unknown> | undefined;
      if (!setObj || typeof setObj !== 'object') continue;
      for (const [stateKey, expression] of Object.entries(setObj)) {
        const p = ensureProfile(map, stateKey, spec, defaults);
        const exprStr =
          expression == null ? 'null' : typeof expression === 'object' ? JSON.stringify(expression) : String(expression);
        if (!p.updatedBy.some((u) => u.actionId === actionId && u.handler === handler && u.expression === exprStr)) {
          p.updatedBy.push({
            actionId,
            habitId,
            handler,
            expression: exprStr,
          });
        }
      }
    }
  }

  for (const key of Object.keys(defaults)) {
    ensureProfile(map, key, spec, defaults);
  }
  for (const key of Object.keys(spec.state ?? {})) {
    ensureProfile(map, key, spec, defaults);
  }

  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** State keys involved in a specific action (body reads + handler writes). */
export function stateKeysForAction(spec: SpecState, actionId: string): Set<string> {
  const keys = new Set<string>();
  for (const p of buildStateProfiles(spec)) {
    if (p.sentTo.some((s) => s.actionId === actionId)) keys.add(p.key);
    if (p.updatedBy.some((u) => u.actionId === actionId)) keys.add(p.key);
  }
  return keys;
}

export type StateValueKind = 'text' | 'number' | 'yesno' | 'empty' | 'list';

export function inferStateValueKind(value: unknown): StateValueKind {
  if (value === null || value === undefined) return 'empty';
  if (typeof value === 'boolean') return 'yesno';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'text';
  if (Array.isArray(value)) return 'list';
  return 'text';
}

export function formatStateValueForEdit(value: unknown): string {
  const kind = inferStateValueKind(value);
  if (kind === 'empty') return '';
  if (kind === 'list') return Array.isArray(value) ? value.join(', ') : '';
  if (kind === 'yesno') return value ? 'true' : 'false';
  return value == null ? '' : String(value);
}

export function parseStateValueFromEdit(raw: string, kind: StateValueKind): unknown {
  switch (kind) {
    case 'empty':
      return null;
    case 'yesno':
      return raw === 'true';
    case 'number': {
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    }
    case 'list':
      return raw.split(',').map((s) => s.trim()).filter(Boolean);
    default:
      return raw;
  }
}
