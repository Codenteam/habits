/**
 * Pure UiSpec YAML parse/emit utilities (no React deps).
 * Shared by UiSpecBuilder and tests.
 */
import yaml from 'yaml';

export interface SpecState {
  meta: { id: string; title: string; subtitle?: string; icon?: string };
  theme: {
    preset?: string;
    mode?: 'dark' | 'light';
    primary?: string;
  };
  layout: {
    type: 'single' | 'tabs' | 'sidebar' | 'mobile-shell' | 'showcase';
    header?: { title?: string; subtitle?: string; icon?: string };
  };
  state: Record<string, unknown>;
  actions: Record<string, unknown>;
  widgets: WidgetNode[];
}

export interface WidgetNode {
  uid: string;
  kind: string;
  props: Record<string, unknown>;
  children?: WidgetNode[];
}

let __uidCounter = 0;
const uid = () => `w_${Date.now().toString(36)}_${(__uidCounter++).toString(36)}`;

function pruneEmpty<T extends Record<string, unknown>>(obj: T | undefined): T | undefined {
  if (!obj) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0) continue;
    out[k] = v;
  }
  return Object.keys(out).length ? (out as T) : undefined;
}

function emitYamlKey(key: string): string {
  return /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(key) ? key : `"${key.replace(/"/g, '\\"')}"`;
}

function emitYamlString(s: string): string {
  if (s.includes('\n')) {
    const indent = '  ';
    const escaped = s.split('\n').map((line) => indent + line).join('\n');
    return `|-\n${escaped}`;
  }
  const needsQuote =
    s === '' ||
    /^[\s'"|*&!%@`#,?{}\[\]>]/.test(s) ||
    /[:#]\s/.test(s) ||
    /^(true|false|null|yes|no|on|off|~)$/i.test(s) ||
    /^-?\d+(\.\d+)?$/.test(s);
  if (!needsQuote) return s;
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function emitYamlObject(obj: Record<string, unknown>, indent: number): string {
  const pad = '  '.repeat(indent);
  const lines: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    if (val === null) {
      lines.push(`${pad}${emitYamlKey(key)}: null`);
      continue;
    }
    if (typeof val === 'object' && !Array.isArray(val)) {
      if (Object.keys(val as object).length === 0) {
        lines.push(`${pad}${emitYamlKey(key)}: {}`);
      } else {
        lines.push(`${pad}${emitYamlKey(key)}:`);
        lines.push(emitYamlObject(val as Record<string, unknown>, indent + 1));
      }
      continue;
    }
    if (Array.isArray(val)) {
      if (val.length === 0) {
        lines.push(`${pad}${emitYamlKey(key)}: []`);
      } else {
        lines.push(`${pad}${emitYamlKey(key)}:`);
        lines.push(emitYaml(val, indent + 1));
      }
      continue;
    }
    lines.push(`${pad}${emitYamlKey(key)}: ${emitYaml(val, indent + 1)}`);
  }
  return lines.join('\n');
}

export function emitYaml(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'string') return emitYamlString(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value
      .map((item) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const inner = emitYamlObject(item as Record<string, unknown>, indent + 1);
          if (!inner) return `${pad}- {}`;
          const lines = inner.split('\n');
          const firstLine = lines[0].replace(pad + '  ', '');
          const rest = lines.slice(1).join('\n');
          return `${pad}- ${firstLine}${rest ? '\n' + rest : ''}`;
        }
        return `${pad}- ${emitYaml(item, indent + 1)}`;
      })
      .join('\n');
  }
  if (typeof value === 'object') {
    const body = emitYamlObject(value as Record<string, unknown>, indent);
    return body || '{}';
  }
  return emitYamlString(String(value));
}

function widgetNodeToObject(node: WidgetNode): Record<string, unknown> {
  const out: Record<string, unknown> = { kind: node.kind, ...node.props };
  if (node.children && node.children.length > 0) {
    out.children = node.children.map(widgetNodeToObject);
  }
  return out;
}

function objectToWidgetNode(obj: Record<string, unknown>): WidgetNode {
  const { kind, children, ...props } = obj ?? {};
  return {
    uid: uid(),
    kind: (kind as string) || 'text',
    props: props as Record<string, unknown>,
    children: Array.isArray(children) ? children.map((c) => objectToWidgetNode(c as Record<string, unknown>)) : undefined,
  };
}

export function specStateToSpec(s: SpecState): Record<string, unknown> {
  const spec: Record<string, unknown> = { version: 1, meta: pruneEmpty(s.meta), theme: pruneEmpty(s.theme) };
  const header = s.layout?.header ? pruneEmpty(s.layout.header) : undefined;
  if (s.layout?.type && s.layout.type !== 'single') {
    spec.layout = { type: s.layout.type, ...(header ? { header } : {}) };
  } else if (header) {
    spec.layout = { type: 'single', header };
  }
  if (s.state && Object.keys(s.state).length > 0) spec.state = s.state;
  if (s.actions && Object.keys(s.actions).length > 0) spec.actions = s.actions;
  spec.widgets = s.widgets.map(widgetNodeToObject);
  return spec;
}

export function parseYamlToSpecState(
  yamlText: string | undefined,
  defaultMetaId?: string,
  defaultMetaTitle?: string,
): SpecState {
  const fallback: SpecState = {
    meta: { id: defaultMetaId || 'my-habit', title: defaultMetaTitle || 'My Habit' },
    theme: { preset: 'ha-bits-blue', mode: 'dark' },
    layout: { type: 'single' },
    state: {},
    actions: {},
    widgets: [],
  };
  if (!yamlText || !yamlText.trim()) return fallback;
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = yaml.parse(yamlText.replace(/^#.*\n/, '')) as Record<string, unknown>;
  } catch {
    return fallback;
  }
  if (!parsed || typeof parsed !== 'object') return fallback;
  const layout = parsed.layout as SpecState['layout'] | undefined;
  return {
    meta: { ...fallback.meta, ...((parsed.meta as SpecState['meta']) ?? {}) },
    theme: { ...fallback.theme, ...((parsed.theme as SpecState['theme']) ?? {}) },
    layout: { type: layout?.type ?? 'single', header: layout?.header },
    state: (parsed.state as Record<string, unknown>) ?? {},
    actions: (parsed.actions as Record<string, unknown>) ?? {},
    widgets: Array.isArray(parsed.widgets)
      ? parsed.widgets.map((w) => objectToWidgetNode(w as Record<string, unknown>))
      : [],
  };
}

export function builderRoundTripYaml(
  yamlText: string,
  defaultMetaId?: string,
  defaultMetaTitle?: string,
): string {
  const head = '# yaml-language-server: $schema=../../../schemas/ui-spec.schema.yaml\n';
  return head + emitYaml(specStateToSpec(parseYamlToSpecState(yamlText, defaultMetaId, defaultMetaTitle)));
}
