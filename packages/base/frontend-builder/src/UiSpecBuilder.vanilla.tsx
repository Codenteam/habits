/**
 * UiSpecBuilder.vanilla — a single-file WYSIWYG editor for the Habits
 * UiSpec YAML schema (see `schemas/ui-spec.schema.yaml` and
 * `packages/cortex/core/src/ui/types.ts`).
 *
 * Design goals (per the request that spawned this file):
 *   - DO NOT use GrapesJS. The structured UiSpec is already a tree, so a
 *     plain React palette + drop-zone is plenty.
 *   - Live in ONE file (like `FrontendBuilder.vanilla.tsx`) so the engine
 *     is easy to understand at a glance.
 *   - Produce a valid UiSpec YAML that round-trips through
 *     `parseUiSpec` / `compileUiSpec` in `@ha-bits/cortex-core` and
 *     validates against `schemas/ui-spec.schema.yaml`.
 *   - Show the main widget blocks in a simple WYSIWYG view with a live
 *     HTML preview powered by the `/api/ui/compile-yaml` endpoint.
 *
 * Layout:
 *   ┌───────────┬─────────────────────┬─────────────────┬──────────────────────────┐
 *   │ palette   │ canvas (widgets)    │ live preview    │ settings / yaml / app    │
 *   │ (drag)    │ (drop, reorder)     │ (iframe)        │ settings tabs            │
 *   └───────────┴─────────────────────┴─────────────────┴──────────────────────────┘
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Layers,
  Type as TypeIcon,
  FormInput,
  MousePointerClick,
  LayoutGrid,
  Megaphone,
  Activity,
  Image as ImageIcon,
  ListChecks,
  Code as CodeIcon,
  PanelsTopLeft,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  FileCode,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Database,
  Zap,
  LayoutTemplate,
  Settings,
} from 'lucide-react';
import { LUCIDE_ICON_NAMES } from '@ha-bits/cortex-core/ui/icons';
import { parseYamlToSpecState, objectToWidgetNode, widgetNodeToObject, resolveActiveViewId, syncWidgetsToSpecState } from './uiSpecYaml';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UiSpecBuilderProps {
  /** Initial UiSpec YAML to load. Empty string starts a fresh spec. */
  initialYaml?: string;
  /** Fires whenever the YAML changes (debounced). */
  onChange: (yaml: string) => void;
  /** Editor height (CSS). Defaults to "100%". */
  height?: string | number;
  /** Override the compile endpoint. Defaults to `/habits/base/api/ui/compile-yaml`. */
  compileEndpoint?: string;
  /** Convenience to seed `meta.id` from the active habit. */
  defaultMetaId?: string;
  /** Convenience to seed `meta.title`. */
  defaultMetaTitle?: string;
  /** Compile preview HTML in-browser (must pass `builderPreview: true`). */
  compilePreviewHtml?: (yaml: string) => Promise<string>;
}

/** Internal widget node: kind + arbitrary props + children (for containers). */
interface WidgetNode {
  uid: string; // local-only id used for selection / drag
  kind: string;
  props: Record<string, any>;
  children?: WidgetNode[]; // only used by container widgets
}

interface SpecState {
  meta: { id: string; title: string; subtitle?: string; icon?: string };
  theme: {
    preset?:
      | 'neural'
      | 'ha-bits-blue' | 'ha-bits-cyan' | 'ha-bits-purple' | 'ha-bits-red'
      | 'ha-bits-emerald' | 'ha-bits-warn' | 'aurora' | 'cyberpunk'
      | 'mobile-blue' | 'tailwind-dark' | 'showcase-flat';
    mode?: 'dark' | 'light';
    primary?: string;
  };
  layout: {
    type: 'single' | 'tabs' | 'sidebar' | 'mobile-shell' | 'showcase';
    header?: { title?: string; subtitle?: string; icon?: string };
    nav?: Array<{ id: string; label?: string; icon?: string }>;
  };
  state: Record<string, any>;
  actions: Record<string, any>;
  widgets: WidgetNode[];
  views?: Record<string, Record<string, any>>;
  defaultView?: string;
  activeViewId?: string;
}

// ---------------------------------------------------------------------------
// Widget catalog — kept compact on purpose. Each entry knows:
//   - how to render the palette tile
//   - the default props on insert
//   - which fields to show in the property panel
// ---------------------------------------------------------------------------

type FieldKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'json'
  | 'fields-array' // for FormWidget.fields
  | 'metrics-array' // for MetricGrid.metrics
  | 'tabs-array' // for TabsWidget.tabs (top-level only)
  | 'kv-array' // for kv-grid.fields
  | 'columns-array' // for data-table.columns
  | 'options-array' // for select / chip-group / radio-cards options
  | 'string-array'
  | 'icon';

interface FieldDef {
  key: string;
  label: string;
  type: FieldKind;
  options?: Array<string | { value: string; label: string }>;
  placeholder?: string;
  help?: string;
}

interface WidgetDef {
  kind: string;
  label: string;
  category: 'Layout' | 'Forms' | 'Buttons' | 'Output' | 'Feedback' | 'Realtime';
  icon: React.ComponentType<{ className?: string }>;
  /** Defaults applied when the widget is dropped onto the canvas. */
  defaults: () => Record<string, any>;
  /** Property fields rendered in the side panel. */
  fields: FieldDef[];
  /** True if this widget acts as a container with `children`. */
  container?: boolean;
  /** Short label rendered on the canvas card. */
  preview?: (props: Record<string, any>) => string;
}

const TONES = ['primary', 'secondary', 'accent', 'success', 'warn', 'danger', 'info', 'muted'];

const FIELD_TYPES = [
  'text', 'email', 'url', 'password', 'number', 'date', 'datetime', 'time',
  'textarea', 'select', 'multi-select', 'chip-group', 'radio-cards',
  'tag-input', 'likert', 'checkbox', 'switch', 'slider', 'file-upload',
  'image-upload', 'hidden',
];

const CATALOG: WidgetDef[] = [
  // ---------- Layout ----------
  {
    kind: 'card',
    label: 'Card',
    category: 'Layout',
    icon: LayoutGrid,
    container: true,
    defaults: () => ({ title: 'Card title' }),
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
    ],
    preview: (p) => p.title || 'Card',
  },
  {
    kind: 'section',
    label: 'Section',
    category: 'Layout',
    icon: PanelsTopLeft,
    container: true,
    defaults: () => ({}),
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
    ],
    preview: (p) => p.title || 'Section',
  },
  {
    kind: 'row',
    label: 'Row',
    category: 'Layout',
    icon: LayoutGrid,
    container: true,
    defaults: () => ({ gap: 12 }),
    fields: [{ key: 'gap', label: 'Gap (px)', type: 'number' }],
    preview: () => 'Row',
  },
  {
    kind: 'column',
    label: 'Column',
    category: 'Layout',
    icon: LayoutGrid,
    container: true,
    defaults: () => ({ gap: 12 }),
    fields: [{ key: 'gap', label: 'Gap (px)', type: 'number' }],
    preview: () => 'Column',
  },
  {
    kind: 'hero',
    label: 'Hero',
    category: 'Layout',
    icon: Megaphone,
    defaults: () => ({ icon: 'lucide:Sparkles', title: 'Welcome', subtitle: 'A short tagline' }),
    fields: [
      { key: 'icon', label: 'Icon', type: 'icon' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    preview: (p) => p.title || 'Hero',
  },

  // ---------- Forms ----------
  {
    kind: 'form',
    label: 'Form',
    category: 'Forms',
    icon: FormInput,
    defaults: () => ({
      bindTo: 'state',
      fields: [
        { name: 'title', type: 'text', label: 'Title', required: true },
      ],
      submit: { label: 'Submit', action: 'submit' },
    }),
    fields: [
      { key: 'bindTo', label: 'Bind to (state path)', type: 'text', placeholder: 'state' },
      { key: 'fields', label: 'Fields', type: 'fields-array' },
      { key: 'submit.label', label: 'Submit label', type: 'text', placeholder: 'Submit' },
      { key: 'submit.action', label: 'Submit action id', type: 'text', placeholder: 'submit' },
      { key: 'submit.loadingLabel', label: 'Loading label', type: 'text', placeholder: 'Submitting...' },
    ],
    preview: (p) => `Form (${(p.fields ?? []).length} field${(p.fields ?? []).length === 1 ? '' : 's'})`,
  },

  // ---------- Buttons ----------
  {
    kind: 'button',
    label: 'Button',
    category: 'Buttons',
    icon: MousePointerClick,
    defaults: () => ({ label: 'Click me', tone: 'primary' }),
    fields: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'action', label: 'Action id', type: 'text' },
      { key: 'loadingLabel', label: 'Loading label', type: 'text', placeholder: 'Loading...' },
      { key: 'tone', label: 'Tone', type: 'select', options: TONES },
      { key: 'fullWidth', label: 'Full width', type: 'boolean' },
    ],
    preview: (p) => `Button · ${p.label || ''}`,
  },
  {
    kind: 'copy-button',
    label: 'Copy button',
    category: 'Buttons',
    icon: MousePointerClick,
    defaults: () => ({ label: 'Copy', textPath: 'state.result' }),
    fields: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'textPath', label: 'State path to copy', type: 'text' },
    ],
  },
  {
    kind: 'download-button',
    label: 'Download button',
    category: 'Buttons',
    icon: MousePointerClick,
    defaults: () => ({ label: 'Download', dataPath: 'state.result.file' }),
    fields: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'dataPath', label: 'Data path (base64 or text)', type: 'text' },
      { key: 'fileName', label: 'File name', type: 'text' },
      { key: 'mimeType', label: 'Mime type', type: 'text' },
    ],
  },

  // ---------- Output ----------
  {
    kind: 'text',
    label: 'Text / heading',
    category: 'Output',
    icon: TypeIcon,
    defaults: () => ({ value: 'Some text' }),
    fields: [
      { key: 'value', label: 'Text (supports {{state.x}})', type: 'textarea' },
      { key: 'as', label: 'Render as', type: 'select', options: ['p', 'h1', 'h2', 'h3', 'small'] },
    ],
    preview: (p) => (p.value || '').slice(0, 40),
  },
  {
    kind: 'markdown',
    label: 'Markdown',
    category: 'Output',
    icon: TypeIcon,
    defaults: () => ({ source: 'state.markdown' }),
    fields: [{ key: 'source', label: 'State path or template', type: 'text' }],
  },
  {
    kind: 'metric-grid',
    label: 'Metric grid',
    category: 'Output',
    icon: LayoutGrid,
    defaults: () => ({
      columns: 4,
      metrics: [
        { value: '1,842', label: 'Orders today', tone: 'primary' },
        { value: '94%', label: 'On-time rate', tone: 'success' },
      ],
    }),
    fields: [
      { key: 'columns', label: 'Columns', type: 'number' },
      { key: 'metrics', label: 'Metrics', type: 'metrics-array' },
      { key: 'source', label: 'Dynamic source (state path)', type: 'text', help: 'If set, overrides metrics[]' },
    ],
    preview: (p) => `Metric grid · ${(p.metrics ?? []).length} tile(s)`,
  },
  {
    kind: 'kv-grid',
    label: 'Key/value grid',
    category: 'Output',
    icon: LayoutGrid,
    defaults: () => ({ source: 'state.result', columns: 2 }),
    fields: [
      { key: 'source', label: 'Source (state path)', type: 'text' },
      { key: 'columns', label: 'Columns', type: 'number' },
      { key: 'fields', label: 'Fields', type: 'kv-array' },
    ],
  },
  {
    kind: 'result-panel',
    label: 'Result panel',
    category: 'Output',
    icon: PanelsTopLeft,
    defaults: () => ({
      source: 'state.result',
      title: 'Result',
      sections: [{ kind: 'json-dump', source: 'state.result', copy: true }],
    }),
    fields: [
      { key: 'source', label: 'Source (state path)', type: 'text' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'sections', label: 'Sections (widget specs)', type: 'json' },
    ],
    preview: (p) => `Result · ${p.title || ''}`,
  },
  {
    kind: 'json-dump',
    label: 'JSON dump',
    category: 'Output',
    icon: CodeIcon,
    defaults: () => ({ source: 'state.result', copy: true }),
    fields: [
      { key: 'source', label: 'Source (state path)', type: 'text' },
      { key: 'copy', label: 'Copy button', type: 'boolean' },
    ],
  },
  {
    kind: 'badge-list',
    label: 'Badge list',
    category: 'Output',
    icon: ListChecks,
    defaults: () => ({ source: 'state.tags', tone: 'info' }),
    fields: [
      { key: 'source', label: 'Source (state path or CSV template)', type: 'text' },
      { key: 'tone', label: 'Tone', type: 'select', options: TONES },
    ],
  },
  {
    kind: 'bullet-list',
    label: 'Bullet list',
    category: 'Output',
    icon: ListChecks,
    defaults: () => ({ source: 'state.items' }),
    fields: [
      { key: 'source', label: 'Source (state path)', type: 'text' },
      { key: 'itemTemplate', label: 'Item template', type: 'text' },
    ],
    preview: (p) => `List · ${p.source || ''}`,
  },
  {
    kind: 'numbered-list',
    label: 'Numbered list',
    category: 'Output',
    icon: ListChecks,
    defaults: () => ({ source: 'state.items' }),
    fields: [
      { key: 'source', label: 'Source (state path)', type: 'text' },
      { key: 'itemTemplate', label: 'Item template', type: 'text' },
    ],
    preview: (p) => `List · ${p.source || ''}`,
  },
  {
    kind: 'history-grid',
    label: 'History grid',
    category: 'Output',
    icon: LayoutGrid,
    defaults: () => ({
      loadAction: 'loadItems',
      dataPath: 'entries',
      columns: 1,
      itemTemplate: { title: '{{item.title}}', meta: '{{item.date}}' },
      empty: 'No items yet.',
    }),
    fields: [
      { key: 'loadAction', label: 'Load action id', type: 'text' },
      { key: 'dataPath', label: 'Data path in response', type: 'text', placeholder: 'entries' },
      { key: 'columns', label: 'Columns', type: 'number' },
      { key: 'empty', label: 'Empty state text', type: 'text' },
      { key: 'reloadAfter', label: 'Reload after actions', type: 'string-array' },
      { key: 'itemTemplate', label: 'Item template', type: 'json' },
      { key: 'onClick', label: 'On click handler', type: 'json' },
    ],
    preview: (p) => `History · ${p.loadAction || ''}`,
  },
  {
    kind: 'history-list',
    label: 'History list',
    category: 'Output',
    icon: LayoutGrid,
    defaults: () => ({
      loadAction: 'loadItems',
      dataPath: 'entries',
      itemTemplate: { title: '{{item.title}}', meta: '{{item.date}}' },
      empty: 'No items yet.',
    }),
    fields: [
      { key: 'loadAction', label: 'Load action id', type: 'text' },
      { key: 'dataPath', label: 'Data path in response', type: 'text', placeholder: 'entries' },
      { key: 'empty', label: 'Empty state text', type: 'text' },
      { key: 'reloadAfter', label: 'Reload after actions', type: 'string-array' },
      { key: 'itemTemplate', label: 'Item template', type: 'json' },
      { key: 'onClick', label: 'On click handler', type: 'json' },
    ],
    preview: (p) => `History · ${p.loadAction || ''}`,
  },
  {
    kind: 'data-table',
    label: 'Data table',
    category: 'Output',
    icon: LayoutGrid,
    defaults: () => ({
      source: 'state.rows',
      columns: [{ key: 'name', label: 'Name' }, { key: 'value', label: 'Value' }],
    }),
    fields: [
      { key: 'source', label: 'Source (state path)', type: 'text' },
      { key: 'columns', label: 'Columns', type: 'columns-array' },
      { key: 'empty', label: 'Empty state text', type: 'text' },
    ],
  },
  {
    kind: 'image',
    label: 'Image',
    category: 'Output',
    icon: ImageIcon,
    defaults: () => ({ source: 'state.imageUrl', rounded: true }),
    fields: [
      { key: 'source', label: 'Source (URL or state path)', type: 'text' },
      { key: 'alt', label: 'Alt text', type: 'text' },
      { key: 'rounded', label: 'Rounded', type: 'boolean' },
    ],
  },

  // ---------- Feedback ----------
  {
    kind: 'status-banner',
    label: 'Status banner',
    category: 'Feedback',
    icon: Megaphone,
    defaults: () => ({ source: 'state.status' }),
    fields: [
      { key: 'source', label: 'Source (state path)', type: 'text' },
    ],
    preview: (p) => `Status · ${p.source || ''}`,
  },
  {
    kind: 'alert',
    label: 'Alert',
    category: 'Feedback',
    icon: AlertTriangle,
    defaults: () => ({ level: 'info', text: 'Heads up.' }),
    fields: [
      { key: 'level', label: 'Level', type: 'select', options: ['info', 'success', 'warn', 'error'] },
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'showWhen', label: 'Show when (template)', type: 'text', placeholder: 'state.error' },
    ],
    preview: (p) => `Alert · ${p.level || 'info'}`,
  },
  {
    kind: 'empty-state',
    label: 'Empty state',
    category: 'Feedback',
    icon: Activity,
    defaults: () => ({ icon: 'lucide:Inbox', title: 'Nothing yet', subtitle: 'Get started by adding an item.' }),
    fields: [
      { key: 'icon', label: 'Icon', type: 'icon' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
    ],
  },
  {
    kind: 'spinner',
    label: 'Spinner',
    category: 'Feedback',
    icon: RefreshCw,
    defaults: () => ({ label: 'Loading...' }),
    fields: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'source', label: 'Show when (state path)', type: 'text' },
    ],
  },

  // ---------- Realtime ----------
  {
    kind: 'chat-panel',
    label: 'Chat panel',
    category: 'Realtime',
    icon: Activity,
    defaults: () => ({ messages: 'state.messages', inputAction: 'sendMessage', autoScroll: true }),
    fields: [
      { key: 'messages', label: 'Messages (state path)', type: 'text' },
      { key: 'inputAction', label: 'Input action id', type: 'text' },
      { key: 'placeholder', label: 'Placeholder', type: 'text' },
      { key: 'autoScroll', label: 'Auto-scroll', type: 'boolean' },
    ],
  },
  {
    kind: 'streaming-panel',
    label: 'Streaming panel',
    category: 'Realtime',
    icon: Activity,
    defaults: () => ({ source: 'state.streamItems' }),
    fields: [{ key: 'source', label: 'Source (state path)', type: 'text' }],
  },
];

const CATALOG_BY_KIND = new Map(CATALOG.map((d) => [d.kind, d]));
const CATEGORIES = ['Layout', 'Forms', 'Buttons', 'Output', 'Feedback', 'Realtime'] as const;

// ---------------------------------------------------------------------------
// Helpers — uid, deep paths, YAML serialization
// ---------------------------------------------------------------------------

let __uidCounter = 0;
const uid = () => `w_${Date.now().toString(36)}_${(__uidCounter++).toString(36)}`;

function slugify(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'habit';
}

function setDeep(obj: any, path: string, value: any): any {
  const parts = path.split('.');
  const next = { ...obj };
  let cursor = next;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    cursor[k] = { ...(cursor[k] ?? {}) };
    cursor = cursor[k];
  }
  cursor[parts[parts.length - 1]] = value;
  return next;
}

function getDeep(obj: any, path: string): any {
  if (!obj) return undefined;
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

// Minimal YAML emitter. We control the shape so we never need anchors,
// flow style, or anything fancy. Strings are double-quoted whenever they
// contain characters that would confuse PyYAML/yaml-cpp/Cortex.
function emitYaml(value: any, indent = 0): string {
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
          const inner = emitYamlObject(item, indent + 1);
          if (!inner) return `${pad}- {}`;
          // First key inlined after dash, rest indented.
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
    const body = emitYamlObject(value, indent);
    return body || '{}';
  }
  return emitYamlString(String(value));
}

function emitYamlObject(obj: Record<string, any>, indent: number): string {
  const pad = '  '.repeat(indent);
  const lines: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    if (val === null) {
      lines.push(`${pad}${emitYamlKey(key)}: null`);
      continue;
    }
    if (typeof val === 'object' && !Array.isArray(val)) {
      if (Object.keys(val).length === 0) {
        lines.push(`${pad}${emitYamlKey(key)}: {}`);
      } else {
        lines.push(`${pad}${emitYamlKey(key)}:`);
        lines.push(emitYamlObject(val, indent + 1));
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

function emitYamlKey(key: string): string {
  return /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(key) ? key : `"${key.replace(/"/g, '\\"')}"`;
}

function emitYamlString(s: string): string {
  // Multiline → folded scalar
  if (s.includes('\n')) {
    const indent = '  ';
    const escaped = s.split('\n').map((line) => indent + line).join('\n');
    return `|-\n${escaped}`;
  }
  // Safe bare strings — no surrounding quotes if it doesn't look special.
  const needsQuote =
    s === '' ||
    /^[\s'"|*&!%@`#,?{}\[\]>]/.test(s) ||
    /[:#]\s/.test(s) ||
    /^(true|false|null|yes|no|on|off|~)$/i.test(s) ||
    /^-?\d+(\.\d+)?$/.test(s);
  if (!needsQuote) return s;
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// ---------------------------------------------------------------------------
// Spec ↔ widget tree round-trip
// ---------------------------------------------------------------------------

/** Preview compile payload — includes builder-only `_builderId` for click-to-select. */
function widgetNodeToPreviewObject(node: WidgetNode): any {
  const out: any = { kind: node.kind, _builderId: node.uid, ...node.props };
  if (node.children && node.children.length > 0) {
    out.children = node.children.map(widgetNodeToPreviewObject);
  }
  return out;
}

function specStateToSpec(s: SpecState): any {
  const spec: any = { version: 1, meta: pruneEmpty(s.meta), theme: pruneEmpty(s.theme) };
  const header = s.layout?.header ? pruneEmpty(s.layout.header) : undefined;
  const nav = s.layout?.nav && s.layout.nav.length > 0 ? s.layout.nav : undefined;
  if (s.layout?.type && s.layout.type !== 'single') {
    spec.layout = { type: s.layout.type, ...(header ? { header } : {}), ...(nav ? { nav } : {}) };
  } else if (header || nav) {
    spec.layout = { type: 'single', ...(header ? { header } : {}), ...(nav ? { nav } : {}) };
  }
  if (s.state && Object.keys(s.state).length > 0) spec.state = s.state;
  if (s.actions && Object.keys(s.actions).length > 0) spec.actions = s.actions;
  if (s.defaultView) spec.defaultView = s.defaultView;
  if (s.views && Object.keys(s.views).length > 0) {
    const synced = syncWidgetsToSpecState(s as Parameters<typeof syncWidgetsToSpecState>[0]);
    spec.views = synced.views;
  } else if (s.widgets.length > 0) {
    spec.widgets = s.widgets.map(widgetNodeToObject);
  }
  return spec;
}

function specStateToPreviewSpec(s: SpecState): any {
  const spec = specStateToSpec(s);
  const viewId = resolveActiveViewId(s as Parameters<typeof resolveActiveViewId>[0]);
  if (viewId) {
    spec.defaultView = viewId;
    if (spec.views?.[viewId]) {
      spec.views = {
        ...spec.views,
        [viewId]: {
          ...spec.views[viewId],
          widgets: s.widgets.map(widgetNodeToPreviewObject),
        },
      };
    }
  } else if (s.widgets.length > 0) {
    spec.widgets = s.widgets.map(widgetNodeToPreviewObject);
  }
  return spec;
}

function pruneEmpty<T extends Record<string, any>>(obj: T | undefined): T | undefined {
  if (!obj) return undefined;
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) continue;
    out[k] = v;
  }
  return Object.keys(out).length ? (out as T) : undefined;
}

// Parse initial / loaded UiSpec YAML (uses the `yaml` package — works in browser builds).
function tryParseExisting(yamlText: string | undefined, defaultMetaId?: string, defaultMetaTitle?: string): SpecState {
  return parseYamlToSpecState(yamlText, defaultMetaId, defaultMetaTitle) as SpecState;
}

function debounce<T extends (...a: any[]) => void>(fn: T, ms: number): T {
  let t: any;
  return ((...args: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as T;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UiSpecBuilderVanilla({
  initialYaml,
  onChange,
  height = '100%',
  compileEndpoint = '/habits/base/api/ui/compile-yaml',
  defaultMetaId,
  defaultMetaTitle,
  compilePreviewHtml,
}: UiSpecBuilderProps) {
  const [spec, setSpec] = useState<SpecState>(() =>
    tryParseExisting(initialYaml, defaultMetaId, defaultMetaTitle),
  );
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  // Reload when a new habit/stack is opened while this builder is mounted.
  useEffect(() => {
    setSpec(tryParseExisting(initialYaml, defaultMetaId, defaultMetaTitle));
    setSelectedUid(null);
  }, [initialYaml, defaultMetaId, defaultMetaTitle]);
  const [rightTab, setRightTab] = useState<'yaml' | 'settings' | 'app-settings'>('settings');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CATEGORIES.map((c) => [c, true])),
  );
  // Drag state — kept in refs to avoid re-renders mid-drag.
  const dragRef = useRef<{ kind?: string; sourceUid?: string }>({});
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const previewSelectCleanupRef = useRef<(() => void) | null>(null);

  // YAML preview (always derived; cheap enough to compute on every render).
  const yamlText = useMemo(() => {
    const spec2 = specStateToSpec(spec);
    const head = '# yaml-language-server: $schema=../../../schemas/ui-spec.schema.yaml\n';
    return head + emitYaml(spec2);
  }, [spec]);

  // Preview compile YAML includes `_builderId` on each widget for click-to-select.
  const previewYamlText = useMemo(() => {
    const spec2 = specStateToPreviewSpec(spec);
    const head = '# yaml-language-server: $schema=../../../schemas/ui-spec.schema.yaml\n';
    return head + emitYaml(spec2);
  }, [spec]);

  // Propagate to parent (debounced).
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  const debouncedEmit = useMemo(() => debounce((y: string) => onChangeRef.current(y), 250), []);
  useEffect(() => { debouncedEmit(yamlText); }, [yamlText, debouncedEmit]);

  // Live HTML preview — compiled in-browser so builder selection markup is always present.
  const compile = useCallback(async (yaml: string) => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      if (compilePreviewHtml) {
        setPreviewHtml(await compilePreviewHtml(yaml));
        return;
      }
      const res = await fetch(compileEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml, builderPreview: true }),
      });
      const data = await res.json();
      if (data?.success && data?.data?.html) {
        setPreviewHtml(data.data.html);
      } else {
        throw new Error(data?.error || `Compile failed (HTTP ${res.status})`);
      }
    } catch (e: any) {
      setPreviewError(e?.message || 'Preview compile failed');
    } finally {
      setPreviewLoading(false);
    }
  }, [compileEndpoint, compilePreviewHtml]);

  const debouncedCompile = useMemo(() => debounce(compile, 400), [compile]);
  useEffect(() => { debouncedCompile(previewYamlText); }, [previewYamlText, debouncedCompile]);

  const highlightPreviewSelection = useCallback((id: string | null) => {
    previewIframeRef.current?.contentWindow?.postMessage(
      { type: 'ha-builder-highlight', id },
      '*',
    );
  }, []);

  const attachPreviewSelectHandlers = useCallback(() => {
    previewSelectCleanupRef.current?.();
    previewSelectCleanupRef.current = null;
    const doc = previewIframeRef.current?.contentDocument;
    if (!doc) return;
    const onPointer = (e: Event) => {
      let el = e.target as Element | null;
      while (el && el !== doc.body) {
        const builderId = el.getAttribute?.('data-ha-builder-id');
        if (builderId) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof (e as Event & { stopImmediatePropagation?: () => void }).stopImmediatePropagation === 'function') {
            (e as Event & { stopImmediatePropagation: () => void }).stopImmediatePropagation();
          }
          setSelectedUid(builderId);
          setRightTab('settings');
          highlightPreviewSelection(builderId);
          return;
        }
        el = el.parentElement;
      }
    };
    const types = ['pointerdown', 'mousedown', 'click'] as const;
    types.forEach((type) => doc.addEventListener(type, onPointer, true));
    previewSelectCleanupRef.current = () => {
      types.forEach((type) => doc.removeEventListener(type, onPointer, true));
    };
  }, [highlightPreviewSelection]);

  useEffect(() => () => previewSelectCleanupRef.current?.(), []);

  useEffect(() => {
    if (!previewHtml || previewLoading) return;
    const t = window.setTimeout(() => attachPreviewSelectHandlers(), 0);
    return () => window.clearTimeout(t);
  }, [previewHtml, previewLoading, attachPreviewSelectHandlers]);

  useEffect(() => {
    highlightPreviewSelection(selectedUid);
  }, [selectedUid, previewHtml, highlightPreviewSelection]);

  useEffect(() => {
    const bridge = {
      select(id: string) {
        setSelectedUid(id);
        setRightTab('settings');
      },
    };
    (window as unknown as { __HA_BUILDER_BRIDGE__?: typeof bridge }).__HA_BUILDER_BRIDGE__ = bridge;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'ha-builder-select' && typeof e.data.id === 'string') {
        bridge.select(e.data.id);
      }
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      const w = window as unknown as { __HA_BUILDER_BRIDGE__?: typeof bridge };
      if (w.__HA_BUILDER_BRIDGE__ === bridge) delete w.__HA_BUILDER_BRIDGE__;
    };
  }, []);

  // ----------------- mutation helpers -----------------

  const updateMeta = useCallback((patch: Partial<SpecState['meta']>) => {
    setSpec((s) => ({ ...s, meta: { ...s.meta, ...patch } }));
  }, []);
  const updateTheme = useCallback((patch: Partial<SpecState['theme']>) => {
    setSpec((s) => ({ ...s, theme: { ...s.theme, ...patch } }));
  }, []);
  const updateLayoutType = useCallback((type: SpecState['layout']['type']) => {
    setSpec((s) => ({ ...s, layout: { ...s.layout, type } }));
  }, []);
  const updateLayoutHeader = useCallback((patch: Partial<NonNullable<SpecState['layout']['header']>>) => {
    setSpec((s) => ({
      ...s,
      layout: { ...s.layout, header: { ...(s.layout.header ?? {}), ...patch } },
    }));
  }, []);
  const updateState = useCallback((state: Record<string, any>) => {
    setSpec((s) => ({ ...s, state }));
  }, []);
  const updateActions = useCallback((actions: Record<string, any>) => {
    setSpec((s) => ({ ...s, actions }));
  }, []);

  const switchView = useCallback((newViewId: string) => {
    setSpec((s) => {
      if (!s.views) return s;
      const currentViewId = resolveActiveViewId(s as Parameters<typeof resolveActiveViewId>[0]);
      if (!currentViewId || currentViewId === newViewId) {
        return { ...s, activeViewId: newViewId };
      }
      const savedViews = {
        ...s.views,
        [currentViewId]: {
          ...(s.views[currentViewId] ?? {}),
          widgets: s.widgets.map(widgetNodeToObject),
        },
      };
      const targetView = savedViews[newViewId];
      const rawWidgets = targetView?.widgets;
      const newWidgets = Array.isArray(rawWidgets)
        ? rawWidgets.map((w) => objectToWidgetNode(w as Record<string, unknown>))
        : [];
      return { ...s, views: savedViews, widgets: newWidgets, activeViewId: newViewId };
    });
    setSelectedUid(null);
  }, []);

  const viewNavItems = useMemo(() => {
    if (!spec.views) return [];
    if (spec.layout.nav?.length) return spec.layout.nav;
    return Object.keys(spec.views).map((id) => ({ id, label: id, icon: undefined as string | undefined }));
  }, [spec.views, spec.layout.nav]);

  const activeViewId = resolveActiveViewId(spec as Parameters<typeof resolveActiveViewId>[0]);

  const addWidget = useCallback((kind: string, atIndex?: number, parentUid?: string | null) => {
    const def = CATALOG_BY_KIND.get(kind);
    if (!def) return;
    const node: WidgetNode = {
      uid: uid(),
      kind,
      props: def.defaults(),
      children: def.container ? [] : undefined,
    };
    setSpec((s) => {
      if (!parentUid) {
        const widgets = [...s.widgets];
        const i = atIndex == null ? widgets.length : Math.min(atIndex, widgets.length);
        widgets.splice(i, 0, node);
        return { ...s, widgets };
      }
      const insertIntoChildren = (nodes: WidgetNode[]): WidgetNode[] =>
        nodes.map((n) => {
          if (n.uid === parentUid) {
            const children = [...(n.children ?? [])];
            const i = atIndex == null ? children.length : Math.min(atIndex, children.length);
            children.splice(i, 0, node);
            return { ...n, children };
          }
          return n.children ? { ...n, children: insertIntoChildren(n.children) } : n;
        });
      return { ...s, widgets: insertIntoChildren(s.widgets) };
    });
    setSelectedUid(node.uid);
  }, []);

  const removeWidget = useCallback((targetUid: string) => {
    setSpec((s) => {
      const prune = (nodes: WidgetNode[]): WidgetNode[] =>
        nodes
          .filter((n) => n.uid !== targetUid)
          .map((n) => (n.children ? { ...n, children: prune(n.children) } : n));
      return { ...s, widgets: prune(s.widgets) };
    });
    setSelectedUid((cur) => (cur === targetUid ? null : cur));
  }, []);

  const moveWidget = useCallback((sourceUid: string, parentUid: string | null, atIndex: number) => {
    setSpec((s) => {
      // Find & detach the source node.
      let detached: WidgetNode | null = null;
      const detach = (nodes: WidgetNode[]): WidgetNode[] => {
        const out: WidgetNode[] = [];
        for (const n of nodes) {
          if (n.uid === sourceUid) {
            detached = n;
            continue;
          }
          out.push(n.children ? { ...n, children: detach(n.children) } : n);
        }
        return out;
      };
      const trimmed = detach(s.widgets);
      if (!detached) return s;
      const insert = (nodes: WidgetNode[]): WidgetNode[] => {
        if (parentUid == null) {
          const next = [...nodes];
          next.splice(Math.min(atIndex, next.length), 0, detached!);
          return next;
        }
        return nodes.map((n) => {
          if (n.uid === parentUid) {
            const children = [...(n.children ?? [])];
            children.splice(Math.min(atIndex, children.length), 0, detached!);
            return { ...n, children };
          }
          return n.children ? { ...n, children: insert(n.children) } : n;
        });
      };
      return { ...s, widgets: insert(trimmed) };
    });
  }, []);

  const updateWidgetProps = useCallback((targetUid: string, patch: (props: Record<string, any>) => Record<string, any>) => {
    setSpec((s) => {
      const walk = (nodes: WidgetNode[]): WidgetNode[] =>
        nodes.map((n) =>
          n.uid === targetUid
            ? { ...n, props: patch(n.props) }
            : n.children ? { ...n, children: walk(n.children) } : n,
        );
      return { ...s, widgets: walk(s.widgets) };
    });
  }, []);

  const findNode = useCallback((targetUid: string | null): WidgetNode | null => {
    if (!targetUid) return null;
    const walk = (nodes: WidgetNode[]): WidgetNode | null => {
      for (const n of nodes) {
        if (n.uid === targetUid) return n;
        if (n.children) {
          const found = walk(n.children);
          if (found) return found;
        }
      }
      return null;
    };
    return walk(spec.widgets);
  }, [spec.widgets]);

  const selectedNode = findNode(selectedUid);

  // ----------------- drag & drop wiring -----------------

  const onPaletteDragStart = (e: React.DragEvent<HTMLButtonElement>, kind: string) => {
    dragRef.current = { kind };
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/uispec-kind', kind);
  };

  const onCanvasDragStart = (e: React.DragEvent<HTMLDivElement>, sourceUid: string) => {
    dragRef.current = { sourceUid };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/uispec-uid', sourceUid);
  };

  const onDropAt = (parentUid: string | null, atIndex: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const { kind, sourceUid } = dragRef.current;
    if (kind) {
      addWidget(kind, atIndex, parentUid);
    } else if (sourceUid) {
      moveWidget(sourceUid, parentUid, atIndex);
    }
    dragRef.current = {};
  };

  // ----------------- render -----------------

  return (
    <div
      className="flex flex-col bg-slate-950 text-slate-100"
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      {/* ============== Body: palette / canvas / preview / yaml-settings ============== */}
      <div className="flex flex-1 min-h-0">

        {/* Palette */}
        <aside className="w-56 flex-shrink-0 border-r border-slate-800 bg-slate-900 overflow-y-auto">
          <div className="px-3 py-2 text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" /> Widgets
          </div>
          {CATEGORIES.map((cat) => {
            const open = expandedCats[cat];
            const items = CATALOG.filter((w) => w.category === cat);
            return (
              <div key={cat} className="border-t border-slate-800/60">
                <button
                  className="w-full flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                  onClick={() => setExpandedCats((s) => ({ ...s, [cat]: !s[cat] }))}
                  type="button"
                >
                  {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {cat}
                </button>
                {open && items.map((def) => {
                  const Icon = def.icon;
                  return (
                    <button
                      key={def.kind}
                      type="button"
                      draggable
                      onDragStart={(e) => onPaletteDragStart(e, def.kind)}
                      onDoubleClick={() => addWidget(def.kind)}
                      title="Drag to canvas, or double-click to append"
                      className="w-full flex items-center gap-2 px-4 py-1.5 text-sm text-slate-200 hover:bg-slate-800 cursor-grab active:cursor-grabbing"
                    >
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{def.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </aside>

        {/* Canvas */}
        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto bg-slate-950">
          {viewNavItems.length > 1 && (
            <div className="px-4 pt-3 flex flex-wrap gap-1 border-b border-slate-800">
              {viewNavItems.map((nav) => {
                const active = nav.id === activeViewId;
                return (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => switchView(nav.id)}
                    className={
                      'px-3 py-1.5 rounded-md text-xs font-medium transition-colors ' +
                      (active
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800')
                    }
                  >
                    {nav.icon ? `${nav.icon} ` : ''}{nav.label ?? nav.id}
                  </button>
                );
              })}
            </div>
          )}
          <div className="px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
            <PanelsTopLeft className="w-3.5 h-3.5" />
            Drag widgets from the palette. Click to select. Drag the handle to reorder.
          </div>
          <CanvasList
            nodes={spec.widgets}
            parentUid={null}
            onDropAt={onDropAt}
            onDragStartNode={onCanvasDragStart}
            onSelect={setSelectedUid}
            selectedUid={selectedUid}
            onRemove={removeWidget}
            depth={0}
          />
        </main>

        {/* Live preview */}
        <aside className="w-[380px] flex-shrink-0 border-l border-slate-800 bg-slate-900 flex flex-col min-h-0">
          <div className="px-3 py-2 text-xs text-slate-500 flex items-center gap-2 border-b border-slate-800 flex-shrink-0">
            {previewLoading ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Compiling…</>
            ) : previewError ? (
              <><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> <span className="truncate text-amber-300" title={previewError}>{previewError}</span></>
            ) : (
              <><Eye className="w-3.5 h-3.5" /> Live preview: click to select</>
            )}
          </div>
          <iframe
            ref={previewIframeRef}
            title="ui-spec-preview"
            srcDoc={previewHtml}
            sandbox="allow-scripts allow-forms allow-same-origin"
            className="flex-1 w-full min-h-0 bg-black"
            onLoad={() => {
              attachPreviewSelectHandlers();
              highlightPreviewSelection(selectedUid);
            }}
          />
        </aside>

        {/* YAML + widget settings + app settings */}
        <aside className="w-[420px] flex-shrink-0 border-l border-slate-800 bg-slate-900 flex flex-col min-h-0">
          <div className="flex border-b border-slate-800 flex-shrink-0">
            <PaneTab active={rightTab === 'settings'} onClick={() => setRightTab('settings')} icon={FormInput} label="Settings" />
            <PaneTab active={rightTab === 'yaml'} onClick={() => setRightTab('yaml')} icon={FileCode} label="YAML" />
            <PaneTab active={rightTab === 'app-settings'} onClick={() => setRightTab('app-settings')} icon={Settings} label="App Settings" />
          </div>

          {rightTab === 'yaml' && (
            <pre className="flex-1 overflow-auto p-3 text-xs text-slate-200 font-mono whitespace-pre min-h-0">
{yamlText}
            </pre>
          )}

          {rightTab === 'settings' && (
            selectedNode ? (
              <PropertyPanel
                node={selectedNode}
                onChange={(patch) => updateWidgetProps(selectedNode.uid, patch)}
                onRemove={() => removeWidget(selectedNode.uid)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center min-h-0">
                <MousePointerClick className="w-8 h-8 text-slate-600" />
                <p className="text-sm text-slate-400">No widget selected</p>
                <p className="text-xs text-slate-500 max-w-[240px]">
                  Click a widget on the canvas or in the live preview to edit its properties here.
                </p>
              </div>
            )
          )}

          {rightTab === 'app-settings' && (
            <SpecSettingsPanel
              spec={spec}
              onUpdateMeta={updateMeta}
              onUpdateTheme={updateTheme}
              onUpdateLayoutType={updateLayoutType}
              onUpdateLayoutHeader={updateLayoutHeader}
              onUpdateState={updateState}
              onUpdateActions={updateActions}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CanvasList — recursive widget renderer with drop slots before each item
// ---------------------------------------------------------------------------

interface CanvasListProps {
  nodes: WidgetNode[];
  parentUid: string | null;
  onDropAt: (parentUid: string | null, atIndex: number) => (e: React.DragEvent<HTMLDivElement>) => void;
  onDragStartNode: (e: React.DragEvent<HTMLDivElement>, sourceUid: string) => void;
  onSelect: (uid: string) => void;
  selectedUid: string | null;
  onRemove: (uid: string) => void;
  depth: number;
}

function CanvasList({ nodes, parentUid, onDropAt, onDragStartNode, onSelect, selectedUid, onRemove, depth }: CanvasListProps) {
  const allowDrop = (e: React.DragEvent) => e.preventDefault();
  return (
    <div className={depth === 0 ? 'px-4 pb-6' : 'mt-2 space-y-1.5'}>
      {/* Slot 0 */}
      <div
        className="h-2 rounded transition-colors hover:bg-blue-500/20"
        onDragOver={allowDrop}
        onDrop={onDropAt(parentUid, 0)}
      />

      {nodes.map((node, i) => {
        const def = CATALOG_BY_KIND.get(node.kind);
        const Icon = def?.icon ?? Layers;
        const previewText = def?.preview?.(node.props) ?? '';
        const selected = node.uid === selectedUid;
        return (
          <React.Fragment key={node.uid}>
            <div
              className={
                'group rounded-lg border transition-colors cursor-pointer ' +
                (node.kind === 'card' ? 'mb-3 ' : '') +
                (selected
                  ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
                  : 'border-slate-800 bg-slate-900 hover:border-slate-700')
              }
              onClick={(e) => { e.stopPropagation(); onSelect(node.uid); }}
            >
              <div
                className="flex items-center gap-2 px-3 py-2"
                draggable
                onDragStart={(e) => { e.stopPropagation(); onDragStartNode(e, node.uid); }}
              >
                <GripVertical className="w-4 h-4 text-slate-500 cursor-grab active:cursor-grabbing" />
                <Icon className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-mono text-slate-400">{node.kind}</span>
                {previewText && (
                  <span className="text-sm text-slate-200 truncate max-w-[240px]">— {previewText}</span>
                )}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemove(node.uid); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-400 p-1 rounded"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {def?.container && (
                <div className="px-2 pb-2 border-t border-slate-800/60">
                  <CanvasList
                    nodes={node.children ?? []}
                    parentUid={node.uid}
                    onDropAt={onDropAt}
                    onDragStartNode={onDragStartNode}
                    onSelect={onSelect}
                    selectedUid={selectedUid}
                    onRemove={onRemove}
                    depth={depth + 1}
                  />
                </div>
              )}
            </div>
            {/* Slot after this node */}
            <div
              className="h-2 rounded transition-colors hover:bg-blue-500/20"
              onDragOver={allowDrop}
              onDrop={onDropAt(parentUid, i + 1)}
            />
          </React.Fragment>
        );
      })}

      {nodes.length === 0 && (
        <div
          className="h-16 rounded-lg border-2 border-dashed border-slate-700 text-slate-500 text-sm flex items-center justify-center"
          onDragOver={allowDrop}
          onDrop={onDropAt(parentUid, 0)}
        >
          <Plus className="w-4 h-4 mr-2" /> Drop a widget here
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spec settings — meta, theme, layout, state, actions (App Settings tab)
// ---------------------------------------------------------------------------

interface SpecSettingsPanelProps {
  spec: SpecState;
  onUpdateMeta: (patch: Partial<SpecState['meta']>) => void;
  onUpdateTheme: (patch: Partial<SpecState['theme']>) => void;
  onUpdateLayoutType: (type: SpecState['layout']['type']) => void;
  onUpdateLayoutHeader: (patch: Partial<NonNullable<SpecState['layout']['header']>>) => void;
  onUpdateState: (state: Record<string, any>) => void;
  onUpdateActions: (actions: Record<string, any>) => void;
}

function SpecSettingsPanel({
  spec,
  onUpdateMeta,
  onUpdateTheme,
  onUpdateLayoutType,
  onUpdateLayoutHeader,
  onUpdateState,
  onUpdateActions,
}: SpecSettingsPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-100">App metadata</h3>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Title">
            <input
              className={INPUT}
              value={spec.meta.title}
              onChange={(e) => {
                const title = e.target.value;
                onUpdateMeta({ title, id: spec.meta.id || slugify(title) });
              }}
              placeholder="Habit title"
            />
          </Field>
          <Field label="Subtitle">
            <input
              className={INPUT}
              value={spec.meta.subtitle ?? ''}
              onChange={(e) => onUpdateMeta({ subtitle: e.target.value || undefined })}
              placeholder="Short description"
            />
          </Field>
          <Field label="App ID" help="Short name used in URLs and exports">
            <input
              className={INPUT}
              value={spec.meta.id}
              onChange={(e) => onUpdateMeta({ id: slugify(e.target.value) })}
              placeholder="my-app"
            />
          </Field>
          <Field label="Icon">
            <IconPicker
              value={spec.meta.icon}
              onChange={(v) => onUpdateMeta({ icon: v })}
            />
          </Field>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-100">Theme & layout</h3>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Color theme">
            <select
              className={INPUT}
              value={spec.theme.preset ?? 'neural'}
              onChange={(e) => onUpdateTheme({ preset: e.target.value as SpecState['theme']['preset'] })}
            >
              {[
                'neural',
                'ha-bits-blue', 'ha-bits-cyan', 'ha-bits-purple', 'ha-bits-red',
                'ha-bits-emerald', 'ha-bits-warn', 'aurora', 'cyberpunk',
                'mobile-blue', 'tailwind-dark', 'showcase-flat',
              ].map((p) => <option key={p} value={p}>{p.replace(/^ha-bits-/, '').replace(/-/g, ' ')}</option>)}
            </select>
          </Field>
          <Field label="Light or dark">
            <select
              className={INPUT}
              value={spec.theme.mode ?? 'dark'}
              onChange={(e) => onUpdateTheme({ mode: e.target.value as SpecState['theme']['mode'] })}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </Field>
          <Field label="Page layout">
            <select
              className={INPUT}
              value={spec.layout.type}
              onChange={(e) => onUpdateLayoutType(e.target.value as SpecState['layout']['type'])}
            >
              <option value="single">Single page</option>
              <option value="tabs">Tabs</option>
              <option value="sidebar">Sidebar</option>
              <option value="mobile-shell">Mobile app</option>
              <option value="showcase">Showcase</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <LayoutTemplate className="w-4 h-4 text-blue-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Page header</h3>
            <p className="text-xs text-slate-500">Title bar shown at the top of your app</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Page title">
            <input
              className={INPUT}
              value={spec.layout.header?.title ?? ''}
              onChange={(e) => onUpdateLayoutHeader({ title: e.target.value || undefined })}
              placeholder="Same as habit title"
            />
          </Field>
          <Field label="Page subtitle">
            <input
              className={INPUT}
              value={spec.layout.header?.subtitle ?? ''}
              onChange={(e) => onUpdateLayoutHeader({ subtitle: e.target.value || undefined })}
              placeholder="Short tagline under the title"
            />
          </Field>
          <Field label="Page icon">
            <IconPicker
              value={spec.layout.header?.icon}
              onChange={(v) => onUpdateLayoutHeader({ icon: v })}
            />
          </Field>
        </div>
      </div>

      <div className="space-y-4">
        <StartingValuesEditor state={spec.state} onChange={onUpdateState} />
        <InteractionsEditor actions={spec.actions} onChange={onUpdateActions} stateKeys={Object.keys(spec.state)} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Property panel — fields rendered per the widget definition
// ---------------------------------------------------------------------------

interface PropertyPanelProps {
  node: WidgetNode;
  onChange: (patch: (props: Record<string, any>) => Record<string, any>) => void;
  onRemove: () => void;
}

function PropertyPanel({ node, onChange, onRemove }: PropertyPanelProps) {
  const def = CATALOG_BY_KIND.get(node.kind);
  if (!def) {
    return (
      <div className="flex-1 overflow-y-auto p-3 text-xs text-slate-400 min-h-0">
        Unknown widget kind: <code>{node.kind}</code>
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto min-h-0 bg-slate-900">
      <div className="px-3 py-2 flex items-center gap-2 sticky top-0 bg-slate-900 border-b border-slate-800 z-10">
        <span className="text-sm font-semibold text-slate-100">{def.label}</span>
        <code className="text-xs text-slate-500">{node.kind}</code>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-red-400 hover:text-red-300 inline-flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>
      <div className="p-3 space-y-2">
        {def.fields.map((f) => (
          <PropertyField
            key={f.key}
            field={f}
            value={getDeep(node.props, f.key)}
            onChange={(v) =>
              onChange((props) => {
                if (v === undefined || v === '' || (typeof v === 'object' && v !== null && Array.isArray(v) && v.length === 0)) {
                  // Allow clearing optional fields, but only for top-level keys.
                  if (!f.key.includes('.')) {
                    const next = { ...props };
                    delete next[f.key];
                    return next;
                  }
                }
                return setDeep(props, f.key, v);
              })
            }
          />
        ))}
        {/* Always-on field: showWhen */}
        <PropertyField
          field={{ key: 'showWhen', label: 'Show when (template)', type: 'text', placeholder: 'state.result' }}
          value={node.props.showWhen}
          onChange={(v) =>
            onChange((props) => {
              const next = { ...props };
              if (v) next.showWhen = v; else delete next.showWhen;
              return next;
            })
          }
        />
        <PropertyField
          field={{ key: 'hideWhen', label: 'Hide when (template)', type: 'text', placeholder: 'state.loading' }}
          value={node.props.hideWhen}
          onChange={(v) =>
            onChange((props) => {
              const next = { ...props };
              if (v) next.hideWhen = v; else delete next.hideWhen;
              return next;
            })
          }
        />
      </div>
    </div>
  );
}

interface PropertyFieldProps {
  field: FieldDef;
  value: any;
  onChange: (v: any) => void;
}

function PropertyField({ field, value, onChange }: PropertyFieldProps) {
  if (field.type === 'icon') {
    return (
      <Field label={field.label} help={field.help ?? 'Lucide icon name, or leave empty'}>
        <IconPicker value={value} onChange={onChange} />
      </Field>
    );
  }
  if (field.type === 'text' || field.type === 'number') {
    return (
      <Field label={field.label} help={field.help}>
        <input
          className={INPUT}
          type={field.type === 'number' ? 'number' : 'text'}
          value={value ?? ''}
          placeholder={field.placeholder}
          onChange={(e) =>
            onChange(field.type === 'number'
              ? (e.target.value === '' ? undefined : Number(e.target.value))
              : e.target.value)
          }
        />
      </Field>
    );
  }
  if (field.type === 'textarea') {
    return (
      <Field label={field.label} help={field.help}>
        <textarea
          className={`${INPUT} font-mono min-h-[60px]`}
          value={value ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
    );
  }
  if (field.type === 'boolean') {
    return (
      <Field label={field.label} help={field.help} inline>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked || undefined)} />
      </Field>
    );
  }
  if (field.type === 'select') {
    return (
      <Field label={field.label} help={field.help}>
        <select className={INPUT} value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
          <option value="">—</option>
          {(field.options ?? []).map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o;
            return <option key={opt.value} value={opt.value}>{opt.label}</option>;
          })}
        </select>
      </Field>
    );
  }
  if (field.type === 'json') {
    return (
      <Field label={field.label} help={field.help}>
        <textarea
          className={`${INPUT} font-mono min-h-[80px]`}
          value={value == null ? '' : JSON.stringify(value, null, 2)}
          onChange={(e) => {
            const raw = e.target.value;
            if (!raw.trim()) { onChange(undefined); return; }
            try { onChange(JSON.parse(raw)); } catch { /* swallow invalid JSON */ }
          }}
        />
      </Field>
    );
  }
  if (field.type === 'string-array') {
    const arr: string[] = Array.isArray(value) ? value : [];
    return (
      <Field label={field.label} help={field.help}>
        <input
          className={INPUT}
          value={arr.join(', ')}
          placeholder="comma, separated, values"
          onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
        />
      </Field>
    );
  }
  if (field.type === 'fields-array') {
    return (
      <Field label={field.label} help={field.help}>
        <FieldsArrayEditor value={value ?? []} onChange={onChange} />
      </Field>
    );
  }
  if (field.type === 'metrics-array') {
    return (
      <Field label={field.label} help={field.help}>
        <MetricsArrayEditor value={value ?? []} onChange={onChange} />
      </Field>
    );
  }
  if (field.type === 'kv-array') {
    return (
      <Field label={field.label} help={field.help}>
        <KvArrayEditor value={value ?? []} onChange={onChange} />
      </Field>
    );
  }
  if (field.type === 'columns-array') {
    return (
      <Field label={field.label} help={field.help}>
        <ColumnsArrayEditor value={value ?? []} onChange={onChange} />
      </Field>
    );
  }
  if (field.type === 'options-array') {
    return (
      <Field label={field.label} help={field.help}>
        <KvArrayEditor value={value ?? []} onChange={onChange} keyLabel="value" valueLabel="label" />
      </Field>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Array editors (form fields, metrics, kv pairs, columns)
// ---------------------------------------------------------------------------

function FieldsArrayEditor({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) {
  const update = (i: number, patch: any) =>
    onChange(value.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  return (
    <div className="space-y-2">
      {value.map((f, i) => (
        <div key={i} className="rounded border border-slate-700 bg-slate-950 p-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <input className={`${INPUT} flex-1`} value={f.name ?? ''} placeholder="name"
                   onChange={(e) => update(i, { name: e.target.value })} />
            <select className={INPUT} value={f.type ?? 'text'}
                    onChange={(e) => update(i, { type: e.target.value })}>
              {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="button" className="text-slate-400 hover:text-red-400 p-1"
                    onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <input className={INPUT} value={f.label ?? ''} placeholder="label"
                 onChange={(e) => update(i, { label: e.target.value })} />
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={!!f.required}
                     onChange={(e) => update(i, { required: e.target.checked || undefined })} />
              required
            </label>
            <input className={`${INPUT} flex-1`} value={f.placeholder ?? ''} placeholder="placeholder"
                   onChange={(e) => update(i, { placeholder: e.target.value || undefined })} />
          </div>
          {f.type === 'textarea' && (
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <label className="inline-flex items-center gap-1 whitespace-nowrap">
                rows
                <input
                  className={`${INPUT} w-16`}
                  type="number"
                  min={1}
                  value={f.rows ?? ''}
                  placeholder="4"
                  onChange={(e) => update(i, { rows: e.target.value === '' ? undefined : Number(e.target.value) })}
                />
              </label>
              <label className="inline-flex items-center gap-1">
                <input type="checkbox" checked={!!f.showWordCount}
                       onChange={(e) => update(i, { showWordCount: e.target.checked || undefined })} />
                word count
              </label>
            </div>
          )}
        </div>
      ))}
      <button type="button" className={BTN_SECONDARY}
              onClick={() => onChange([...value, { name: `field${value.length + 1}`, type: 'text', label: 'Label' }])}>
        <Plus className="w-3 h-3" /> Add field
      </button>
    </div>
  );
}

function MetricsArrayEditor({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) {
  const update = (i: number, patch: any) =>
    onChange(value.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  return (
    <div className="space-y-2">
      {value.map((m, i) => (
        <div key={i} className="rounded border border-slate-700 bg-slate-950 p-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <input className={`${INPUT} flex-1`} value={m.value ?? ''} placeholder="value"
                   onChange={(e) => update(i, { value: e.target.value })} />
            <input className={`${INPUT} flex-1`} value={m.label ?? ''} placeholder="label"
                   onChange={(e) => update(i, { label: e.target.value })} />
            <button type="button" className="text-slate-400 hover:text-red-400 p-1"
                    onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select className={INPUT} value={m.tone ?? ''}
                    onChange={(e) => update(i, { tone: e.target.value || undefined })}>
              <option value="">tone…</option>
              {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className={`${INPUT} w-16 text-center`} value={m.icon ?? ''} placeholder="icon"
                   onChange={(e) => update(i, { icon: e.target.value || undefined })} />
            <input className={`${INPUT} flex-1`} value={m.sublabel ?? ''} placeholder="sublabel"
                   onChange={(e) => update(i, { sublabel: e.target.value || undefined })} />
          </div>
        </div>
      ))}
      <button type="button" className={BTN_SECONDARY}
              onClick={() => onChange([...value, { value: '0', label: 'Metric' }])}>
        <Plus className="w-3 h-3" /> Add metric
      </button>
    </div>
  );
}

function KvArrayEditor({
  value, onChange, keyLabel = 'key', valueLabel = 'label',
}: { value: any[]; onChange: (v: any[]) => void; keyLabel?: string; valueLabel?: string }) {
  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input className={`${INPUT} flex-1`} value={row.key ?? row.value ?? ''} placeholder={keyLabel}
                 onChange={(e) => onChange(value.map((v, idx) => idx === i ? { ...v, key: e.target.value } : v))} />
          <input className={`${INPUT} flex-1`} value={row.label ?? ''} placeholder={valueLabel}
                 onChange={(e) => onChange(value.map((v, idx) => idx === i ? { ...v, label: e.target.value } : v))} />
          <button type="button" className="text-slate-400 hover:text-red-400 p-1"
                  onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button type="button" className={BTN_SECONDARY}
              onClick={() => onChange([...value, { key: '', label: '' }])}>
        <Plus className="w-3 h-3" /> Add row
      </button>
    </div>
  );
}

function ColumnsArrayEditor({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) {
  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input className={`${INPUT} flex-1`} value={row.key ?? ''} placeholder="key"
                 onChange={(e) => onChange(value.map((v, idx) => idx === i ? { ...v, key: e.target.value } : v))} />
          <input className={`${INPUT} flex-1`} value={row.label ?? ''} placeholder="label"
                 onChange={(e) => onChange(value.map((v, idx) => idx === i ? { ...v, label: e.target.value } : v))} />
          <select className={INPUT} value={row.align ?? ''}
                  onChange={(e) => onChange(value.map((v, idx) => idx === i ? { ...v, align: e.target.value || undefined } : v))}>
            <option value="">align…</option>
            <option value="left">left</option>
            <option value="center">center</option>
            <option value="right">right</option>
          </select>
          <button type="button" className="text-slate-400 hover:text-red-400 p-1"
                  onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button type="button" className={BTN_SECONDARY}
              onClick={() => onChange([...value, { key: '', label: '' }])}>
        <Plus className="w-3 h-3" /> Add column
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Starting values & interactions — friendly editors (no raw JSON)
// ---------------------------------------------------------------------------

type StateValueKind = 'text' | 'number' | 'yesno' | 'empty' | 'list';

function humanizeKey(key: string): string {
  if (!key) return '';
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferStateValueKind(value: unknown): StateValueKind {
  if (value === null || value === undefined) return 'empty';
  if (typeof value === 'boolean') return 'yesno';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'text';
  if (Array.isArray(value)) return 'list';
  return 'text';
}

function stateValueFromKind(kind: StateValueKind, raw: unknown): unknown {
  switch (kind) {
    case 'empty': return null;
    case 'yesno': return raw === true || raw === 'true';
    case 'number': {
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    }
    case 'list':
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') {
        return raw.split(',').map((s) => s.trim()).filter(Boolean);
      }
      return [];
    default:
      return raw == null ? '' : String(raw);
  }
}

function objectToKvList(obj: Record<string, unknown> | undefined): Array<{ key: string; value: string }> {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).map(([key, value]) => ({
    key,
    value: value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value),
  }));
}

function kvListToObject(rows: Array<{ key: string; value: string }>): Record<string, unknown> {
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

interface StartingValuesEditorProps {
  state: Record<string, unknown>;
  onChange: (state: Record<string, unknown>) => void;
}

function StartingValuesEditor({ state, onChange }: StartingValuesEditorProps) {
  const entries = Object.entries(state);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const setEntry = (index: number, key: string, value: unknown) => {
    const next = { ...state };
    const oldKey = entries[index]?.[0];
    if (oldKey && oldKey !== key) delete next[oldKey];
    if (key.trim()) next[key.trim()] = value;
    else if (oldKey) delete next[oldKey];
    onChange(next);
  };

  const removeEntry = (key: string) => {
    const next = { ...state };
    delete next[key];
    onChange(next);
  };

  const addEntry = () => {
    let n = 1;
    let candidate = 'field1';
    while (candidate in state) {
      n += 1;
      candidate = `field${n}`;
    }
    onChange({ ...state, [candidate]: '' });
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Starting values</h3>
            <p className="text-xs text-slate-500">
              Default data your page remembers — form fields, lists, status messages, etc.
            </p>
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-slate-500 italic mb-3">No starting values yet. Add one when a widget needs stored data.</p>
      ) : (
        <div className="space-y-2 mb-3">
          {entries.map(([key, value], i) => {
            const kind = inferStateValueKind(value);
            return (
              <div key={key} className="rounded-md border border-slate-800 bg-slate-900/80 p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] uppercase tracking-wide text-slate-500">Name</label>
                    <input
                      className={`${INPUT} w-full mt-0.5`}
                      value={key}
                      placeholder="e.g. recipientEmail"
                      onChange={(e) => setEntry(i, e.target.value, value)}
                    />
                    {key && (
                      <span className="text-[10px] text-slate-600 mt-0.5 block">{humanizeKey(key)}</span>
                    )}
                  </div>
                  <div className="w-28 flex-shrink-0">
                    <label className="text-[10px] uppercase tracking-wide text-slate-500">Type</label>
                    <select
                      className={`${INPUT} w-full mt-0.5`}
                      value={kind}
                      onChange={(e) => {
                        const nextKind = e.target.value as StateValueKind;
                        setEntry(i, key, stateValueFromKind(nextKind, value));
                      }}
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="yesno">Yes / No</option>
                      <option value="empty">Empty</option>
                      <option value="list">List</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="mt-4 text-slate-500 hover:text-red-400 p-1"
                    title="Remove"
                    onClick={() => removeEntry(key)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {kind === 'text' && (
                  <Field label="Default text">
                    <input
                      className={INPUT}
                      value={String(value ?? '')}
                      placeholder="Leave blank to start empty"
                      onChange={(e) => setEntry(i, key, e.target.value)}
                    />
                  </Field>
                )}
                {kind === 'number' && (
                  <Field label="Default number">
                    <input
                      className={INPUT}
                      type="number"
                      value={Number(value) || 0}
                      onChange={(e) => setEntry(i, key, Number(e.target.value))}
                    />
                  </Field>
                )}
                {kind === 'yesno' && (
                  <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!value}
                      onChange={(e) => setEntry(i, key, e.target.checked)}
                    />
                    Starts as yes
                  </label>
                )}
                {kind === 'list' && (
                  <Field label="List items" help="Comma-separated; usually starts empty">
                    <input
                      className={INPUT}
                      value={Array.isArray(value) ? value.join(', ') : ''}
                      placeholder="item one, item two"
                      onChange={(e) =>
                        setEntry(
                          i,
                          key,
                          e.target.value ? e.target.value.split(',').map((s) => s.trim()) : [],
                        )
                      }
                    />
                  </Field>
                )}
                {kind === 'empty' && (
                  <p className="text-xs text-slate-500">Starts empty — useful for messages or results shown later.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button type="button" className={BTN_SECONDARY} onClick={addEntry}>
        <Plus className="w-3 h-3" /> Add starting value
      </button>

      <div className="mt-3 pt-3 border-t border-slate-800">
        <button
          type="button"
          className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          Advanced (raw JSON)
        </button>
        {showAdvanced && (
          <textarea
            className={`${INPUT} font-mono text-xs w-full mt-2 min-h-[80px]`}
            value={JSON.stringify(state, null, 2)}
            onChange={(e) => {
              try { onChange(JSON.parse(e.target.value)); } catch { /* ignore while typing */ }
            }}
          />
        )}
      </div>
    </div>
  );
}

interface InteractionsEditorProps {
  actions: Record<string, unknown>;
  onChange: (actions: Record<string, unknown>) => void;
  stateKeys: string[];
}

function InteractionsEditor({ actions, onChange, stateKeys }: InteractionsEditorProps) {
  const actionIds = Object.keys(actions);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(actionIds.map((id) => [id, true])),
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  const patchAction = (id: string, patch: Record<string, unknown>) => {
    onChange({ ...actions, [id]: { ...(actions[id] as Record<string, unknown>), ...patch } });
  };

  const removeAction = (id: string) => {
    const next = { ...actions };
    delete next[id];
    onChange(next);
  };

  const addAction = () => {
    let n = 1;
    let id = 'myAction';
    while (id in actions) {
      n += 1;
      id = `myAction${n}`;
    }
    onChange({
      ...actions,
      [id]: {
        method: 'POST',
        endpoint: '/api/my-action',
        body: {},
        onSuccess: { toast: 'Done!' },
        onError: { set: { error: '$error.message' } },
      },
    });
    setExpanded((s) => ({ ...s, [id]: true }));
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Interactions</h3>
            <p className="text-xs text-slate-500">
              What happens when someone clicks a button or submits a form
            </p>
          </div>
        </div>
      </div>

      {actionIds.length === 0 ? (
        <p className="text-xs text-slate-500 italic mb-3">
          No interactions yet. Add one and link it from a button or form.
        </p>
      ) : (
        <div className="space-y-2 mb-3">
          {actionIds.map((id) => {
            const action = (actions[id] ?? {}) as Record<string, unknown>;
            const open = expanded[id] ?? false;
            const onSuccess = (action.onSuccess ?? {}) as Record<string, unknown>;
            const onError = (action.onError ?? {}) as Record<string, unknown>;
            const successUpdates = objectToKvList(onSuccess.set as Record<string, unknown>);
            const errorUpdates = objectToKvList(onError.set as Record<string, unknown>);
            const bodyRows = objectToKvList(
              action.body && typeof action.body === 'object' && !Array.isArray(action.body)
                ? (action.body as Record<string, unknown>)
                : {},
            );

            return (
              <div key={id} className="rounded-md border border-slate-800 bg-slate-900/80 overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800/60"
                  onClick={() => setExpanded((s) => ({ ...s, [id]: !open }))}
                >
                  {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                  <span className="text-sm font-medium text-slate-100">{humanizeKey(id)}</span>
                  <code className="text-[10px] text-slate-500 ml-1">{id}</code>
                </button>

                {open && (
                  <div className="px-3 pb-3 pt-1 space-y-3 border-t border-slate-800/80">
                    <Field label="Internal name" help="Referenced by buttons and forms — use camelCase, no spaces">
                      <input
                        className={INPUT}
                        value={id}
                        onChange={(e) => {
                          const newId = e.target.value.replace(/\s+/g, '');
                          if (!newId || newId === id) return;
                          const next = { ...actions };
                          next[newId] = next[id];
                          delete next[id];
                          onChange(next);
                          setExpanded((s) => {
                            const { [id]: _, ...rest } = s;
                            return { ...rest, [newId]: true };
                          });
                        }}
                      />
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-[88px_1fr] gap-2">
                      <Field label="Request type">
                        <select
                          className={INPUT}
                          value={String(action.method ?? 'POST')}
                          onChange={(e) => patchAction(id, { method: e.target.value })}
                        >
                          <option value="POST">POST</option>
                          <option value="GET">GET</option>
                          <option value="PUT">PUT</option>
                          <option value="DELETE">DELETE</option>
                        </select>
                      </Field>
                      <Field label="Backend address" help="URL path your server handles, e.g. /api/send-email">
                        <input
                          className={INPUT}
                          value={String(action.endpoint ?? '')}
                          placeholder="/api/my-action"
                          onChange={(e) => patchAction(id, { endpoint: e.target.value })}
                        />
                      </Field>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-slate-500 block mb-1.5">
                        Data to send
                      </label>
                      <KvRowsEditor
                        rows={bodyRows}
                        emptyHint="No extra fields — the server receives an empty request"
                        keyPlaceholder="Field name"
                        valuePlaceholder='Value or {{state.fieldName}}'
                        onChange={(rows) => patchAction(id, { body: kvListToObject(rows) })}
                      />
                    </div>

                    <Field label="Save API response to" help="Optional — where to store the server reply">
                      <input
                        className={INPUT}
                        list={`response-path-${id}`}
                        value={String(action.responsePath ?? '')}
                        placeholder="e.g. output.emails"
                        onChange={(e) => patchAction(id, { responsePath: e.target.value || undefined })}
                      />
                      <datalist id={`response-path-${id}`}>
                        {stateKeys.map((k) => (
                          <option key={k} value={k} />
                        ))}
                      </datalist>
                    </Field>

                    <div className="rounded border border-emerald-900/40 bg-emerald-950/20 p-2.5 space-y-2">
                      <p className="text-xs font-medium text-emerald-300/90">When it succeeds</p>
                      <Field label="Show notification">
                        <input
                          className={INPUT}
                          value={String(onSuccess.toast ?? '')}
                          placeholder="Optional success message"
                          onChange={(e) =>
                            patchAction(id, {
                              onSuccess: {
                                ...onSuccess,
                                toast: e.target.value || undefined,
                                set: onSuccess.set,
                              },
                            })
                          }
                        />
                      </Field>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-slate-500 block mb-1.5">
                          Update these values
                        </label>
                        <KvRowsEditor
                          rows={successUpdates}
                          emptyHint="No field updates on success"
                          keyPlaceholder="Field name"
                          valuePlaceholder='New value or $response'
                          onChange={(rows) =>
                            patchAction(id, {
                              onSuccess: {
                                ...onSuccess,
                                set: Object.keys(kvListToObject(rows)).length ? kvListToObject(rows) : undefined,
                              },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="rounded border border-red-900/30 bg-red-950/15 p-2.5 space-y-2">
                      <p className="text-xs font-medium text-red-300/80">When something goes wrong</p>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-slate-500 block mb-1.5">
                          Update these values
                        </label>
                        <KvRowsEditor
                          rows={errorUpdates}
                          emptyHint="No error handling configured"
                          keyPlaceholder="Field name"
                          valuePlaceholder="$error.message"
                          onChange={(rows) =>
                            patchAction(id, {
                              onError: {
                                ...onError,
                                set: Object.keys(kvListToObject(rows)).length ? kvListToObject(rows) : undefined,
                              },
                            })
                          }
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="text-xs text-red-400/80 hover:text-red-300 inline-flex items-center gap-1"
                      onClick={() => removeAction(id)}
                    >
                      <Trash2 className="w-3 h-3" /> Remove interaction
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button type="button" className={BTN_SECONDARY} onClick={addAction}>
        <Plus className="w-3 h-3" /> Add interaction
      </button>

      <div className="mt-3 pt-3 border-t border-slate-800">
        <button
          type="button"
          className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          Advanced (raw JSON)
        </button>
        {showAdvanced && (
          <textarea
            className={`${INPUT} font-mono text-xs w-full mt-2 min-h-[80px]`}
            value={JSON.stringify(actions, null, 2)}
            onChange={(e) => {
              try { onChange(JSON.parse(e.target.value)); } catch { /* ignore while typing */ }
            }}
          />
        )}
      </div>
    </div>
  );
}

function KvRowsEditor({
  rows,
  onChange,
  emptyHint,
  keyPlaceholder,
  valuePlaceholder,
}: {
  rows: Array<{ key: string; value: string }>;
  onChange: (rows: Array<{ key: string; value: string }>) => void;
  emptyHint: string;
  keyPlaceholder: string;
  valuePlaceholder: string;
}) {
  const update = (i: number, patch: Partial<{ key: string; value: string }>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-1.5">
      {rows.length === 0 && (
        <p className="text-[11px] text-slate-600 italic">{emptyHint}</p>
      )}
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            className={`${INPUT} flex-1 min-w-0`}
            value={row.key}
            placeholder={keyPlaceholder}
            onChange={(e) => update(i, { key: e.target.value })}
          />
          <input
            className={`${INPUT} flex-[1.2] min-w-0`}
            value={row.value}
            placeholder={valuePlaceholder}
            onChange={(e) => update(i, { value: e.target.value })}
          />
          <button
            type="button"
            className="text-slate-500 hover:text-red-400 p-1 flex-shrink-0"
            onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-[11px] text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
        onClick={() => onChange([...rows, { key: '', value: '' }])}
      >
        <Plus className="w-3 h-3" /> Add row
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------------

const INPUT = 'bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-blue-500 placeholder-slate-500';

function IconPicker({
  value,
  onChange,
  className,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  className?: string;
}) {
  const selectValue = value?.startsWith('lucide:') ? value : '';
  return (
    <select
      className={className ?? `${INPUT} w-full`}
      value={selectValue}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      <option value="">None</option>
      {LUCIDE_ICON_NAMES.map((name) => (
        <option key={name} value={`lucide:${name}`}>{name}</option>
      ))}
    </select>
  );
}
const BTN_SECONDARY = 'inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800';

function Field({ label, help, children, inline }: { label: string; help?: string; children: React.ReactNode; inline?: boolean }) {
  if (inline) {
    return (
      <label className="flex items-center gap-2 text-xs text-slate-300">
        {children}
        <span>{label}</span>
        {help && <span className="text-slate-500">— {help}</span>}
      </label>
    );
  }
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-300 min-w-[120px]">
      <span className="text-slate-400">{label}</span>
      {children}
      {help && <span className="text-slate-500">{help}</span>}
    </label>
  );
}

function PaneTab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex-1 flex items-center justify-center gap-2 py-2 text-sm transition-colors ' +
        (active ? 'bg-slate-800 text-white border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50')
      }
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

export default UiSpecBuilderVanilla;
