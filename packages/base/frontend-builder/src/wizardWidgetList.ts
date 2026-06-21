/** Slim widget list for the Build pages wizard palette (kind + label + category). */
export type WizardWidgetCategory =
  | 'Layout'
  | 'Forms'
  | 'Buttons'
  | 'Output'
  | 'Feedback'
  | 'Realtime';

export interface WizardWidgetEntry {
  kind: string;
  label: string;
  category: WizardWidgetCategory;
}

export const WIZARD_WIDGET_CATEGORIES: WizardWidgetCategory[] = [
  'Layout',
  'Forms',
  'Buttons',
  'Output',
  'Feedback',
  'Realtime',
];

export const WIZARD_WIDGET_LIST: WizardWidgetEntry[] = [
  { kind: 'card', label: 'Card', category: 'Layout' },
  { kind: 'section', label: 'Section', category: 'Layout' },
  { kind: 'row', label: 'Row', category: 'Layout' },
  { kind: 'column', label: 'Column', category: 'Layout' },
  { kind: 'hero', label: 'Hero', category: 'Layout' },
  { kind: 'form', label: 'Form', category: 'Forms' },
  { kind: 'button', label: 'Button', category: 'Buttons' },
  { kind: 'copy-button', label: 'Copy button', category: 'Buttons' },
  { kind: 'download-button', label: 'Download button', category: 'Buttons' },
  { kind: 'text', label: 'Text', category: 'Output' },
  { kind: 'markdown', label: 'Markdown', category: 'Output' },
  { kind: 'metric-grid', label: 'Metric grid', category: 'Output' },
  { kind: 'kv-grid', label: 'Key–value grid', category: 'Output' },
  { kind: 'result-panel', label: 'Result panel', category: 'Output' },
  { kind: 'json-dump', label: 'JSON dump', category: 'Output' },
  { kind: 'badge-list', label: 'Badge list', category: 'Output' },
  { kind: 'bullet-list', label: 'Bullet list', category: 'Output' },
  { kind: 'numbered-list', label: 'Numbered list', category: 'Output' },
  { kind: 'history-grid', label: 'History grid', category: 'Output' },
  { kind: 'history-list', label: 'History list', category: 'Output' },
  { kind: 'data-table', label: 'Data table', category: 'Output' },
  { kind: 'image', label: 'Image', category: 'Output' },
  { kind: 'status-banner', label: 'Status banner', category: 'Feedback' },
  { kind: 'alert', label: 'Alert', category: 'Feedback' },
  { kind: 'empty-state', label: 'Empty state', category: 'Feedback' },
  { kind: 'spinner', label: 'Spinner', category: 'Feedback' },
  { kind: 'chat-panel', label: 'Chat panel', category: 'Realtime' },
  { kind: 'streaming-panel', label: 'Streaming panel', category: 'Realtime' },
];
