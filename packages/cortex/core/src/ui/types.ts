/**
 * Habits UI Spec — YAML-driven UI schema.
 *
 * A UiSpec is compiled to a single self-contained HTML document by
 * `compileUiSpec`. Each habit ships only an `index.yaml` (or `ui.yaml`)
 * file; the Cortex server emits the HTML at request time.
 *
 * The schema covers every pattern observed across the existing
 * hand-written `all-frontends/*.html` library: forms, tabbed apps,
 * sidebars, wizards, mobile shells, chat threads, history grids,
 * streaming (NDJSON), OAuth gating, polling, and static showcase
 * dashboards.
 */

// ============================================================================
// Theme
// ============================================================================

export type ThemePreset =
  | 'neural'
  | 'ha-bits-blue'
  | 'ha-bits-cyan'
  | 'ha-bits-purple'
  | 'ha-bits-red'
  | 'ha-bits-emerald'
  | 'ha-bits-warn'
  | 'aurora'
  | 'cyberpunk'
  | 'mobile-blue'
  | 'tailwind-dark'
  | 'showcase-flat';

/** Default preset when YAML omits `theme.preset`. */
export const DEFAULT_THEME_PRESET: ThemePreset = 'neural';

export type Density = 'comfortable' | 'compact' | 'mobile';

export interface ThemeSpec {
  preset?: ThemePreset;
  mode?: 'dark' | 'light';
  /** Primary accent override (hex) */
  primary?: string;
  /** Secondary accent override (hex) */
  secondary?: string;
  /** Tertiary / highlight accent override (hex) */
  accent?: string;
  /** Surface/background override (hex) */
  background?: string;
  font?: {
    body?: string;
    mono?: string;
    display?: string;
  };
  /** Border radius in px */
  radius?: number;
  density?: Density;
  /** Free-form extra CSS appended after the generated theme CSS */
  customCss?: string;
}

// ============================================================================
// Meta
// ============================================================================

export interface MetaSpec {
  /** Workflow id used for default `/api/{id}` action endpoints. */
  id?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  /** Lucide name (`lucide:Zap`), image URL, inline SVG, or plain text. */
  icon?: string;
  /** Page <title>; falls back to `title`. */
  documentTitle?: string;
}

// ============================================================================
// Actions (API calls / OAuth / streaming)
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ActionEventHandler {
  /** Match streamed event by partial object (`{ status: 'completed' }`). */
  match?: Record<string, unknown>;
  /** Push the matched event to a state array. */
  append?: string;
  /** Merge the matched event into state. */
  set?: Record<string, string>;
  /** Increment a counter on state. */
  increment?: string;
}

export interface ActionSuccessSpec {
  /** Navigate to view id after success. */
  goto?: string;
  /** Set state fields from response. Values are templates (see templating). */
  set?: Record<string, string>;
  /** Append the response to a list in state. */
  append?: string;
  /** Toast message template. */
  toast?: string;
  /** Re-dispatch one or more actions after success. */
  reload?: string | string[];
  /** Alias for `reload`. Either spelling works at runtime. */
  dispatch?: string | string[];
  /** Reset a form by id. */
  resetForm?: string;
  /** Trigger client-side download of a base64 field in response. */
  download?: { dataPath: string; fileNamePath?: string; mimeType?: string };
}

export interface ActionErrorSpec {
  toast?: string;
  set?: Record<string, string>;
}

export interface ActionSpec {
  /** Logical action: HTTP fetch by default. */
  type?: 'http' | 'oauth' | 'navigate' | 'reset' | 'logout';
  method?: HttpMethod;
  /** Endpoint URL; templated. Defaults to `/api/{meta.id}`. */
  endpoint?: string;
  /** Body template. Object whose leaf values are templates. */
  body?: Record<string, unknown> | string;
  /** Query-string template (objects only). */
  query?: Record<string, unknown>;
  /** Extra headers (templated). */
  headers?: Record<string, string>;
  /** Where in the response the payload lives. e.g. "output", "output.quiz", "$". Default "output" with root fallback. */
  responsePath?: string;
  /** Streaming mode: parse NDJSON lines and dispatch events. */
  stream?: 'ndjson' | 'tokens' | false;
  /** Event handlers for streaming. */
  events?: ActionEventHandler[];
  /** Polling: re-run the action every N seconds. */
  poll?: { intervalMs: number; auto?: boolean };
  /** OAuth: status check + init URLs (used by `oauth` type). */
  oauth?: { statusUrl: string; initUrl: string };

  onSuccess?: ActionSuccessSpec;
  onError?: ActionErrorSpec;

  /** Display a confirmation prompt before running. */
  confirm?: string;
}

export type ActionsMap = Record<string, ActionSpec>;

// ============================================================================
// Layout
// ============================================================================

export type LayoutType =
  | 'single'
  | 'tabs'
  | 'sidebar'
  | 'wizard'
  | 'mobile-shell'
  | 'split'
  | 'chat'
  | 'showcase';

export interface HeaderSpec {
  title?: string;
  subtitle?: string;
  icon?: string;
  badge?: { text: string; tone?: Tone };
  sticky?: boolean;
  /** Right-side action buttons inside the header. */
  actions?: WidgetSpec[];
}

export interface FooterStatusSpec {
  dot?: 'live' | 'idle' | 'warn' | 'error';
  text?: string;
  port?: number | string;
  version?: string;
}

export interface NavItemSpec {
  id: string;
  label: string;
  icon?: string;
  badge?: string | number;
}

export interface LayoutSpec {
  type?: LayoutType;
  header?: HeaderSpec;
  footerStatus?: FooterStatusSpec;
  nav?: NavItemSpec[];
  /** For mobile-shell: position of the nav. */
  navPosition?: 'top' | 'bottom' | 'left';
  /** For split layout: left/right view ids. */
  split?: { left: string; right: string; ratio?: string };
}

// ============================================================================
// Widgets
// ============================================================================

export type Tone =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'warn'
  | 'danger'
  | 'info'
  | 'muted';

export interface BaseWidget {
  kind: string;
  id?: string;
  className?: string;
  /** Internal builder-only id for WYSIWYG preview selection (stripped on export). */
  _builderId?: string;
  /** Template expression evaluating to truthy renders the widget. */
  showWhen?: string;
  /** Template expression evaluating to falsy hides the widget. */
  hideWhen?: string;
}

// ---------- Layout primitives ----------

export interface SectionWidget extends BaseWidget {
  kind: 'section' | 'card' | 'row' | 'column';
  title?: string;
  subtitle?: string;
  gap?: number | string;
  padding?: number | string;
  children?: WidgetSpec[];
}

export interface TabsWidget extends BaseWidget {
  kind: 'tabs';
  variant?: 'pills' | 'underline' | 'segmented';
  tabs: Array<{
    id: string;
    label: string;
    icon?: string;
    children: WidgetSpec[];
  }>;
  defaultTab?: string;
}

export interface AccordionWidget extends BaseWidget {
  kind: 'accordion';
  items: Array<{ id: string; label: string; children: WidgetSpec[]; open?: boolean }>;
}

export interface ModalWidget extends BaseWidget {
  kind: 'modal' | 'bottom-sheet';
  openWhen: string; // template expression
  title?: string;
  children: WidgetSpec[];
  onClose?: { set?: Record<string, string> };
}

// ---------- Forms ----------

export type FieldType =
  | 'text'
  | 'email'
  | 'url'
  | 'password'
  | 'number'
  | 'date'
  | 'datetime'
  | 'time'
  | 'textarea'
  | 'select'
  | 'multi-select'
  | 'chip-group'
  | 'radio-cards'
  | 'tag-input'
  | 'likert'
  | 'checkbox'
  | 'switch'
  | 'slider'
  | 'file-upload'
  | 'image-upload'
  | 'hidden';

export interface FieldOption {
  value: string | number;
  label?: string;
  icon?: string;
  description?: string;
}

export interface FieldSpec {
  name: string;
  type: FieldType;
  label?: string;
  placeholder?: string;
  help?: string;
  required?: boolean;
  default?: unknown;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<FieldOption | string | number>;
  /** Populate select options from a state path to an array of objects. */
  optionsFrom?: string;
  /** Object key used as option label (default: name). */
  optionLabel?: string;
  /** Object key used as option value (default: _id). */
  optionValue?: string;
  /** For likert: scale length. */
  scale?: number;
  /** For file-upload/image-upload: accepted mime types. */
  accept?: string;
  /** File size limit in MB. */
  maxSize?: number;
  /** Read file as base64 (strips data-url prefix). */
  asBase64?: boolean;
  /** For tag-input: separator key (default Enter). */
  separator?: string;
  /** Disable when template evaluates truthy. */
  disabledWhen?: string;
  /** Show only when template evaluates truthy. */
  showWhen?: string;
}

export interface FormWidget extends BaseWidget {
  kind: 'form';
  bindTo?: string; // state path; default "state"
  fields: FieldSpec[];
  submit?: {
    label: string;
    action: string; // action id
    loadingLabel?: string;
    icon?: string;
    tone?: Tone;
    disabledWhen?: string;
  };
  /** Optional secondary actions. */
  secondary?: Array<{ label: string; action: string; tone?: Tone }>;
  /** Repeatable groups: e.g. invoice line items, mbti samples. */
  repeatable?: {
    name: string;
    min?: number;
    max?: number;
    fields: FieldSpec[];
    addLabel?: string;
    removeLabel?: string;
  };
  /** Inline validation: template expr → error message. */
  validate?: Array<{ when: string; message: string }>;
}

// ---------- Action buttons ----------

export interface ButtonWidget extends BaseWidget {
  kind: 'button' | 'action-button' | 'submit-button';
  label: string;
  icon?: string;
  tone?: Tone;
  /** Alias for `tone` used in YAML habits (e.g. `variant: primary`). */
  variant?: Tone;
  action?: string;
  /** Inline params merged into action body. */
  params?: Record<string, unknown>;
  loadingLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabledWhen?: string;
}

export interface CopyButtonWidget extends BaseWidget {
  kind: 'copy-button';
  label?: string;
  textPath: string; // path in state to copy
}

export interface DownloadButtonWidget extends BaseWidget {
  kind: 'download-button';
  label?: string;
  dataPath: string; // base64 or text
  fileName?: string;
  fileNamePath?: string;
  mimeType?: string;
}

export interface PrintButtonWidget extends BaseWidget {
  kind: 'print-button';
  label?: string;
  targetId?: string;
}

// ---------- Outputs ----------

export interface ResultPanelWidget extends BaseWidget {
  kind: 'result-panel';
  /** State path that gates visibility (renders when truthy). */
  source?: string;
  title?: string;
  sections?: WidgetSpec[];
}

export interface PreWidget extends BaseWidget {
  kind: 'pre' | 'code-block' | 'json-dump';
  source: string; // state path
  language?: string;
  copy?: boolean;
}

export interface MarkdownWidget extends BaseWidget {
  kind: 'markdown';
  source: string;
  truncate?: number;
}

export interface TextWidget extends BaseWidget {
  kind: 'text';
  value: string;
  strong?: boolean;
  muted?: boolean;
}

export interface HeadingWidget extends BaseWidget {
  kind: 'heading';
  level?: number;
  value: string;
}

export interface AlertWidget extends BaseWidget {
  kind: 'alert';
  level?: Tone | 'error';
  text: string;
}

export interface ListWidget extends BaseWidget {
  kind: 'list';
  source: string;
  empty?: string;
  limit?: number;
  itemKey?: string;
  template?: WidgetSpec[];
}

export interface HtmlPreviewWidget extends BaseWidget {
  kind: 'html-preview';
  source: string;
  /** Render inside an isolated iframe. */
  sandbox?: boolean;
}

export interface ImageWidget extends BaseWidget {
  kind: 'image';
  source: string; // url, base64, or template
  alt?: string;
  width?: number | string;
  height?: number | string;
  rounded?: boolean;
}

export interface ScoreRingWidget extends BaseWidget {
  kind: 'score-ring';
  source: string;
  max?: number;
  label?: string;
  unit?: string;
  tone?: Tone;
}

export interface BarChartWidget extends BaseWidget {
  kind: 'bar-chart';
  /** State path to array of items. */
  source: string;
  labelKey?: string;
  valueKey?: string;
  max?: number;
  orientation?: 'horizontal' | 'vertical';
}

export interface ProgressBarWidget extends BaseWidget {
  kind: 'progress-bar';
  source: string;
  max?: number;
  label?: string;
}

export interface MetricGridWidget extends BaseWidget {
  kind: 'metric-grid' | 'stat-row';
  columns?: number;
  /** Either inline metrics or a state path returning an array of {value,label}. */
  metrics?: Array<{ value: string; label: string; tone?: Tone; icon?: string; sublabel?: string }>;
  source?: string;
}

export interface BadgeListWidget extends BaseWidget {
  kind: 'badge-list';
  source?: string;
  /** Static or templated badge labels (alternative to source). */
  values?: string[];
  tone?: Tone;
  labelKey?: string;
}

export interface NumberedListWidget extends BaseWidget {
  kind: 'numbered-list' | 'bullet-list';
  source: string;
  itemTemplate?: string;
}

/** Interactive quiz question list with answer binding. */
export interface QuizQuestionsWidget extends BaseWidget {
  kind: 'quiz-questions';
  /** State path to the questions array (e.g. state.currentQuiz.questions). */
  source: string;
  /** State path for answers array of { questionId, answer }. Default state.currentAnswers. */
  answersPath?: string;
}

export interface DataTableWidget extends BaseWidget {
  kind: 'data-table';
  source: string;
  columns: Array<{ key: string; label: string; align?: 'left' | 'right' | 'center'; format?: string }>;
  empty?: string;
}

export interface KvGridWidget extends BaseWidget {
  kind: 'kv-grid';
  /** State path to an object whose keys are rendered as rows. */
  source?: string;
  columns?: number;
  /** If omitted, all top-level keys of the source object are shown. */
  fields?: Array<{ key: string; label: string; format?: string }>;
  /** Static label/value rows (supports `{{state.*}}` templates). */
  items?: Array<{ label: string; value: string }>;
}

export interface ButtonRowButton extends BaseWidget {
  label: string;
  icon?: string;
  tone?: Tone;
  variant?: Tone;
  action?: string;
  params?: Record<string, unknown>;
  loadingLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  disabledWhen?: string;
}

export interface ButtonRowWidget extends BaseWidget {
  kind: 'button-row';
  buttons: Array<
    ButtonRowButton | CopyButtonWidget | DownloadButtonWidget | PrintButtonWidget
  >;
}

// ---------- Feedback ----------

export interface StatusBannerWidget extends BaseWidget {
  kind: 'status-banner';
  source: string; // state path with { text, tone }
}

export interface EmptyStateWidget extends BaseWidget {
  kind: 'empty-state';
  icon?: string;
  title?: string;
  subtitle?: string;
  cta?: { label: string; action: string };
}

export interface SpinnerWidget extends BaseWidget {
  kind: 'spinner' | 'loading-steps' | 'pipeline-indicator';
  /** State path that controls visibility (truthy = visible). */
  source?: string;
  label?: string;
  steps?: string[]; // for loading-steps / pipeline-indicator
}

// ---------- Realtime ----------

export interface ChatPanelWidget extends BaseWidget {
  kind: 'chat-panel';
  /** State path to message list. */
  messages: string;
  /** Template for each message: { role, content, meta? } */
  inputAction: string;
  inputField?: string; // state path holding draft message; default "state.draft"
  placeholder?: string;
  /** Show tool-call chips per assistant message. */
  showToolCalls?: boolean;
  /** Auto-scroll to bottom on new message. */
  autoScroll?: boolean;
  /** Sticky bottom input. */
  stickyInput?: boolean;
  quickActions?: Array<{ label: string; sets: string }>;
}

export interface StreamingPanelWidget extends BaseWidget {
  kind: 'streaming-panel';
  /** State path to array of streamed nodes. */
  source: string;
  /** Per-item template fields. */
  itemTemplate?: { title?: string; status?: string; body?: string };
}

export interface StreamingTextWidget extends BaseWidget {
  kind: 'streaming-text';
  source: string;
  monospace?: boolean;
}

// ---------- History grid ----------

export interface HistoryGridWidget extends BaseWidget {
  kind: 'history-grid' | 'history-list';
  /** Action id to load list. */
  loadAction: string;
  /** Path inside response holding the array. */
  dataPath?: string;
  /** Auto-load on mount + after listed actions. */
  reloadAfter?: string[];
  itemTemplate?: {
    title?: string;
    subtitle?: string;
    meta?: string;
    badge?: string;
    tone?: string;
    image?: string;
  };
  /** Click handler. */
  onClick?: {
    action?: string;
    params?: Record<string, unknown>;
    goto?: string;
    set?: Record<string, string>;
  };
  empty?: string;
  columns?: number;
}

// ---------- App scaffolding ----------

export interface HabitGridWidget extends BaseWidget {
  kind: 'habit-grid';
  items: Array<{
    name: string;
    description?: string;
    trigger?: 'webhook' | 'scheduler' | 'manual';
    tags?: string[];
  }>;
  columns?: number;
}

export interface HeroWidget extends BaseWidget {
  kind: 'hero';
  title?: string;
  subtitle?: string;
  icon?: string;
  cta?: { label: string; action: string };
}

export interface ModeSelectorWidget extends BaseWidget {
  kind: 'mode-selector';
  /** State path that holds the selected mode. */
  bind: string;
  options: Array<{ value: string; label: string; icon?: string; description?: string }>;
}

export interface OAuthStatusCardWidget extends BaseWidget {
  kind: 'oauth-status-card';
  action: string; // action id of type "oauth"
  provider: string;
  connectedLabel?: string;
  disconnectedLabel?: string;
}

// ---------- Discriminated union ----------

export type WidgetSpec =
  | SectionWidget
  | TabsWidget
  | AccordionWidget
  | ModalWidget
  | FormWidget
  | ButtonWidget
  | CopyButtonWidget
  | DownloadButtonWidget
  | PrintButtonWidget
  | ResultPanelWidget
  | PreWidget
  | MarkdownWidget
  | TextWidget
  | HeadingWidget
  | AlertWidget
  | ListWidget
  | HtmlPreviewWidget
  | ImageWidget
  | ScoreRingWidget
  | BarChartWidget
  | ProgressBarWidget
  | MetricGridWidget
  | BadgeListWidget
  | NumberedListWidget
  | QuizQuestionsWidget
  | DataTableWidget
  | KvGridWidget
  | ButtonRowWidget
  | StatusBannerWidget
  | EmptyStateWidget
  | SpinnerWidget
  | ChatPanelWidget
  | StreamingPanelWidget
  | StreamingTextWidget
  | HistoryGridWidget
  | HabitGridWidget
  | HeroWidget
  | ModeSelectorWidget
  | OAuthStatusCardWidget;

// ============================================================================
// Views
// ============================================================================

export interface ViewSpec {
  title?: string;
  widgets: WidgetSpec[];
  /** Actions to dispatch when the view becomes visible. */
  onEnter?: string | string[];
}

export type ViewsMap = Record<string, ViewSpec>;

// ============================================================================
// Top-level UiSpec
// ============================================================================

export interface UiSpec {
  /** Schema version, for forward compatibility. */
  version?: 1;
  meta?: MetaSpec;
  theme?: ThemeSpec;
  layout?: LayoutSpec;
  /** Initial in-memory state. Bindings reference `state.*`. */
  state?: Record<string, unknown>;
  actions?: ActionsMap;
  /** Named views (referenced by nav ids). For `single` layout, define a single `main` view OR use top-level `widgets`. */
  views?: ViewsMap;
  /** Convenience for `single` layout: alternative to `views.main.widgets`. */
  widgets?: WidgetSpec[];
  /** Default view id for tabs/sidebar/mobile-shell layouts. */
  defaultView?: string;
  /** Action ids dispatched once when the page first loads. */
  onMount?: string | string[];
}
