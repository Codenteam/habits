/**
 * Describes how data moves between UI widgets, app state, and backend habits.
 */
import type { SpecState } from './uiSpecYaml';
import { collectActionReferences, habitIdFromEndpoint } from './actionLinking';
import { collectWidgetsFromSpec } from './inferState';

export interface DataFlowHop {
  from: string;
  to: string;
}

export interface DataFlowRoute {
  /** Where the flow starts (widget, tab, button, etc.) */
  trigger: string;
  hops: DataFlowHop[];
}

const STATE_REF = /\{\{\s*state\.([^}\s]+)\s*\}\}/g;
const PARAM_REF = /\{\{\s*params\.([^}\s]+)\s*\}\}/g;

function extractRefs(value: unknown, pattern: RegExp): string[] {
  const keys = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === 'string') {
      pattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(v)) !== null) keys.add(m[1]);
      return;
    }
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(value);
  return [...keys];
}

function habitLabel(habitId: string): string {
  return `Habit “${habitId}”`;
}

function stateLabel(key: string): string {
  return `App state “${key}”`;
}

function scanDisplayBindings(spec: SpecState): DataFlowRoute[] {
  const routes: DataFlowRoute[] = [];
  const processWidget = (w: Record<string, unknown>) => {
    if (typeof w.source === 'string' && w.source.startsWith('state.')) {
      const key = w.source.slice(6);
      const title = typeof w.title === 'string' ? w.title : String(w.kind ?? 'widget');
      routes.push({
        trigger: `Display: ${title}`,
        hops: [{ from: stateLabel(key), to: 'Screen' }],
      });
    }
    if (w.kind === 'form') {
      for (const f of (w.fields as Array<Record<string, unknown>>) ?? []) {
        const name = typeof f.name === 'string' ? f.name : '';
        const label = typeof f.label === 'string' ? f.label : name;
        if (!name) continue;
        routes.push({
          trigger: `Form field: ${label || name}`,
          hops: [{ from: 'User input', to: stateLabel(name) }],
        });
      }
    }
  };
  const widgets = collectWidgetsFromSpec(spec) as unknown as Record<string, unknown>[];
  for (const w of widgets) processWidget(w);
  return routes;
}

/** All data routes: UI ↔ state ↔ habits. */
export function describeDataFlow(spec: SpecState): DataFlowRoute[] {
  const routes: DataFlowRoute[] = [...scanDisplayBindings(spec)];
  const refs = collectActionReferences(spec);

  for (const ref of refs) {
    const action = spec.actions?.[ref.actionId];
    if (!action || typeof action !== 'object') continue;
    const a = action as Record<string, unknown>;
    const habitId = habitIdFromEndpoint(a.endpoint);
    const hops: DataFlowHop[] = [];

    const bodyKeys = extractRefs(a.body, STATE_REF);
    const queryKeys = extractRefs(a.query, STATE_REF);
    const paramKeys = extractRefs(a.query, PARAM_REF);

    for (const key of bodyKeys) {
      hops.push({ from: stateLabel(key), to: habitId ? habitLabel(habitId) : 'API' });
    }
    for (const key of queryKeys) {
      hops.push({ from: stateLabel(key), to: habitId ? habitLabel(habitId) : 'API' });
    }
    for (const key of paramKeys) {
      hops.push({ from: `URL param “${key}”`, to: habitId ? habitLabel(habitId) : 'API' });
    }

    if (habitId && bodyKeys.length === 0 && queryKeys.length === 0 && paramKeys.length === 0) {
      const method = typeof a.method === 'string' ? a.method : 'POST';
      hops.push({ from: ref.location, to: `${habitLabel(habitId)} (${method})` });
    }

    const onSuccess = a.onSuccess as Record<string, unknown> | undefined;
    const onError = a.onError as Record<string, unknown> | undefined;
    const successSet = onSuccess?.set as Record<string, unknown> | undefined;
    const errorSet = onError?.set as Record<string, unknown> | undefined;

    if (successSet && typeof successSet === 'object') {
      for (const [stateKey, val] of Object.entries(successSet)) {
        if (val === '$response' || (typeof val === 'string' && val.includes('$response'))) {
          hops.push({
            from: habitId ? `${habitLabel(habitId)} output` : 'API response',
            to: stateLabel(stateKey),
          });
        }
      }
    }
    if (errorSet && typeof errorSet === 'object') {
      for (const [stateKey, val] of Object.entries(errorSet)) {
        if (typeof val === 'string' && val.includes('$error')) {
          hops.push({ from: 'API error', to: stateLabel(stateKey) });
        }
      }
    }

    if (hops.length > 0) {
      routes.push({ trigger: ref.location, hops });
    }
  }

  return routes;
}
