/**
 * Infer `state:` keys and defaults from forms, actions, and widgets.
 * Users see "App memory" in the wizard — not "starting variables".
 */
import type { SpecState, WidgetNode } from './uiSpecYaml';

export interface AppMemoryEntry {
  key: string;
  label: string;
  usedFor: string;
  startingValue: unknown;
  inferred: boolean;
}

const STATE_REF_RE = /\{\{\s*state\.([^}\s]+)\s*\}\}/g;

function extractStateRefs(template: string): string[] {
  const refs: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(STATE_REF_RE.source, 'g');
  while ((m = re.exec(template)) !== null) refs.push(m[1]);
  return refs;
}

function walkStrings(value: unknown, visit: (str: string) => void): void {
  if (typeof value === 'string') {
    visit(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => walkStrings(item, visit));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((v) => walkStrings(v, visit));
  }
}

function defaultForFieldType(type: string | undefined, fieldDefault?: unknown): unknown {
  switch (type) {
    case 'tag-input':
    case 'multi-select':
      return [];
    case 'number':
    case 'slider':
      return fieldDefault ?? 0;
    case 'switch':
    case 'checkbox':
      return fieldDefault ?? false;
    case 'select':
    case 'chip-group':
    case 'radio-cards':
      return fieldDefault ?? '';
    default:
      return fieldDefault ?? '';
  }
}

export function collectWidgetsFromSpec(spec: SpecState): Array<Record<string, unknown>> {
  const raw: Array<Record<string, unknown>> = [];
  const walkNodes = (nodes: WidgetNode[]) => {
    for (const n of nodes) {
      const flat =
        n.props && Object.keys(n.props).length > 0
          ? { kind: n.kind, ...n.props, children: n.children }
          : (n as unknown as Record<string, unknown>);
      raw.push(flat);
      if (n.children?.length) walkNodes(n.children);
    }
  };
  walkNodes(spec.widgets);
  if (spec.views) {
    for (const view of Object.values(spec.views)) {
      const widgets = view?.widgets;
      if (Array.isArray(widgets)) {
        for (const w of widgets) {
          if (w && typeof w === 'object') raw.push(w as Record<string, unknown>);
        }
      }
    }
  }
  return raw;
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

export interface InferStateOptions {
  /** Keys the user added manually in Advanced — never auto-removed */
  manualKeys?: Set<string>;
}

/**
 * Merge inferred state into spec.state. Preserves manual keys and existing values
 * unless the inferred default type changes materially (empty → list).
 */
export function mergeInferredState(
  spec: SpecState,
  options: InferStateOptions = {},
): Record<string, unknown> {
  const inferred = inferStateDefaults(spec);
  const manual = options.manualKeys ?? new Set<string>();
  const next: Record<string, unknown> = { ...spec.state };

  for (const [key, value] of Object.entries(inferred)) {
    if (!(key in next) || next[key] === undefined) {
      next[key] = value;
      continue;
    }
    if (manual.has(key)) continue;
    const existing = next[key];
    if (Array.isArray(value) && existing === '') next[key] = value;
    if (value === null && (existing === '' || existing === undefined)) next[key] = null;
  }

  return next;
}

export function inferStateDefaults(spec: SpecState): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const setDefault = (key: string, value: unknown) => {
    if (!key) return;
    if (!(key in out)) out[key] = value;
  };

  const processWidget = (w: Record<string, unknown>) => {
    if (w.kind === 'form') {
      const fields = w.fields as Array<Record<string, unknown>> | undefined;
      for (const f of fields ?? []) {
        const name = typeof f.name === 'string' ? f.name : '';
        if (!name) continue;
        setDefault(name, defaultForFieldType(f.type as string, f.default));
      }
    }
    for (const key of ['source', 'showWhen', 'hideWhen'] as const) {
      const val = w[key];
      if (typeof val === 'string' && val.startsWith('state.')) {
        setDefault(val.slice('state.'.length), null);
      }
      if (typeof val === 'string') {
        for (const ref of extractStateRefs(val)) setDefault(ref, null);
      }
    }
    if (w.kind === 'history-grid' || w.kind === 'history-list') {
      // loadAction only — no new state keys
    }
  };

  walkWidgetTree(collectWidgetsFromSpec(spec) as unknown[], processWidget);

  for (const [actionId, action] of Object.entries(spec.actions ?? {})) {
    if (!action || typeof action !== 'object') continue;
    const a = action as Record<string, unknown>;

    walkStrings(a.body, (str) => {
      for (const ref of extractStateRefs(str)) setDefault(ref, '');
    });
    walkStrings(a.query, (str) => {
      for (const ref of extractStateRefs(str)) setDefault(ref, '');
    });

    const applySet = (setObj: unknown) => {
      if (!setObj || typeof setObj !== 'object') return;
      for (const [targetKey, val] of Object.entries(setObj as Record<string, unknown>)) {
        if (typeof val === 'string' && val === '$response') setDefault(targetKey, null);
        else if (typeof val === 'string' && val.startsWith('state.')) setDefault(val.slice(6), null);
        else setDefault(targetKey, null);
      }
    };

    applySet((a.set as Record<string, unknown>) ?? undefined);
    applySet(((a.onSuccess as Record<string, unknown>)?.set) ?? undefined);
    applySet(((a.onError as Record<string, unknown>)?.set) ?? undefined);

    if (!a.endpoint && !a.method && a.set) {
      applySet(a.set);
    }
    void actionId;
  }

  return out;
}

function humanLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function describeAppMemory(spec: SpecState): AppMemoryEntry[] {
  const defaults = inferStateDefaults(spec);
  const entries: AppMemoryEntry[] = [];
  const seen = new Set<string>();

  const add = (key: string, usedFor: string, startingValue?: unknown) => {
    if (!key || seen.has(key)) return;
    seen.add(key);
    entries.push({
      key,
      label: humanLabel(key),
      usedFor,
      startingValue: startingValue ?? defaults[key] ?? spec.state[key],
      inferred: true,
    });
  };

  const processWidget = (w: Record<string, unknown>) => {
    if (w.kind === 'form') {
      for (const f of (w.fields as Array<Record<string, unknown>>) ?? []) {
        const name = typeof f.name === 'string' ? f.name : '';
        const label = typeof f.label === 'string' ? f.label : humanLabel(name);
        if (name) add(name, `Form: ${label}`, defaultForFieldType(f.type as string, f.default));
      }
    }
    if (typeof w.source === 'string' && w.source.startsWith('state.')) {
      const k = w.source.slice(6);
      const title = typeof w.title === 'string' ? w.title : w.kind;
      add(k, `Displayed in ${title}`, null);
    }
  };

  walkWidgetTree(collectWidgetsFromSpec(spec) as unknown[], processWidget);

  for (const key of Object.keys(defaults)) {
    if (!seen.has(key)) add(key, 'Used by actions or UI', defaults[key]);
  }

  for (const key of Object.keys(spec.state ?? {})) {
    if (!seen.has(key)) {
      entries.push({
        key,
        label: humanLabel(key),
        usedFor: 'Custom (advanced)',
        startingValue: spec.state[key],
        inferred: false,
      });
    }
  }

  return entries;
}

export function getFormFieldNames(spec: SpecState): string[] {
  const names = new Set<string>();
  const processWidget = (w: Record<string, unknown>) => {
    if (w.kind !== 'form') return;
    for (const f of (w.fields as Array<Record<string, unknown>>) ?? []) {
      if (typeof f.name === 'string' && f.name) names.add(f.name);
    }
  };
  walkWidgetTree(collectWidgetsFromSpec(spec) as unknown[], processWidget);
  return [...names];
}

export function isSpecEmpty(spec: SpecState): boolean {
  const hasYaml =
    spec.widgets.length > 0 ||
    (spec.views && Object.values(spec.views).some((v) => Array.isArray(v?.widgets) && v.widgets.length > 0)) ||
    Object.keys(spec.actions).length > 0;
  return !hasYaml && spec.meta.title === (spec.meta.title || 'My Habit');
}

export function syncSpecWithInferredState(
  spec: SpecState,
  manualKeys?: Set<string>,
): SpecState {
  return {
    ...spec,
    state: mergeInferredState(spec, { manualKeys }),
  };
}
