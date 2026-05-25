import type {
  AccordionWidget,
  AlertWidget,
  BadgeListWidget,
  BarChartWidget,
  ButtonRowButton,
  ButtonRowWidget,
  ButtonWidget,
  ChatPanelWidget,
  CopyButtonWidget,
  DataTableWidget,
  DownloadButtonWidget,
  EmptyStateWidget,
  FieldSpec,
  FormWidget,
  HabitGridWidget,
  HeadingWidget,
  HeroWidget,
  HistoryGridWidget,
  HtmlPreviewWidget,
  ImageWidget,
  KvGridWidget,
  ListWidget,
  MarkdownWidget,
  MetricGridWidget,
  ModalWidget,
  ModeSelectorWidget,
  NumberedListWidget,
  QuizQuestionsWidget,
  OAuthStatusCardWidget,
  PreWidget,
  PrintButtonWidget,
  ProgressBarWidget,
  ResultPanelWidget,
  ScoreRingWidget,
  SectionWidget,
  SpinnerWidget,
  StatusBannerWidget,
  StreamingPanelWidget,
  StreamingTextWidget,
  TabsWidget,
  TextWidget,
  Tone,
  WidgetSpec,
} from './types';
import { attrs, cls, escapeAttr, escapeHtml, joinHtml, safeJson, tmplText, uniqueId } from './helpers';
import { renderIcon, renderIconPrefix, renderIconTmpl } from './icons';

// ============================================================================
// Public entry
// ============================================================================

export function renderWidgets(widgets: WidgetSpec[] | undefined): string {
  if (!widgets || !widgets.length) return '';
  return widgets.map(renderWidget).join('\n');
}

export function renderWidget(w: WidgetSpec): string {
  const html = renderWidgetInner(w);
  if (!w._builderId) return html;
  return `<div${attrs({
    class: 'ha-builder-target',
    'data-ha-builder-id': w._builderId,
  })}>${html}</div>`;
}

function renderWidgetInner(w: WidgetSpec): string {
  // Common wrapper attributes (visibility gates apply to every widget).
  const wrap = (inner: string, extraCls?: string): string => {
    const visAttrs: Record<string, string | undefined> = {};
    if (w.showWhen) visAttrs['data-show-when'] = w.showWhen;
    if (w.hideWhen) visAttrs['data-hide-when'] = w.hideWhen;
    if (!Object.keys(visAttrs).length && !extraCls && !w.className) return inner;
    // If we need a wrapper, inject one
    if (!Object.keys(visAttrs).length && !extraCls) return inner;
    const className = cls(extraCls, w.className);
    return `<div${attrs({ class: className || undefined, ...visAttrs })}>${inner}</div>`;
  };

  switch (w.kind) {
    case 'section':
    case 'card':
    case 'row':
    case 'column':
      return renderSection(w);
    case 'tabs':
      return renderTabs(w);
    case 'accordion':
      return renderAccordion(w);
    case 'modal':
    case 'bottom-sheet':
      return renderModal(w);
    case 'form':
      return renderForm(w);
    case 'button':
    case 'action-button':
    case 'submit-button':
      return wrap(renderButton(w));
    case 'button-row':
      return wrap(renderButtonRow(w));
    case 'copy-button':
      return wrap(renderCopyButton(w));
    case 'download-button':
      return wrap(renderDownloadButton(w));
    case 'print-button':
      return wrap(renderPrintButton(w));
    case 'result-panel':
      return renderResultPanel(w);
    case 'pre':
    case 'code-block':
    case 'json-dump':
      return renderPre(w);
    case 'markdown':
      return renderMarkdown(w);
    case 'text':
      return wrap(renderText(w));
    case 'heading':
      return wrap(renderHeading(w));
    case 'alert':
      return wrap(renderAlert(w));
    case 'list':
      return wrap(renderList(w));
    case 'html-preview':
      return renderHtmlPreview(w);
    case 'image':
      return wrap(renderImage(w));
    case 'score-ring':
      return wrap(renderScoreRing(w));
    case 'bar-chart':
      return wrap(renderBarChart(w));
    case 'progress-bar':
      return wrap(renderProgressBar(w));
    case 'metric-grid':
    case 'stat-row':
      return wrap(renderMetricGrid(w));
    case 'badge-list':
      return wrap(renderBadgeList(w));
    case 'numbered-list':
    case 'bullet-list':
      return wrap(renderNumberedList(w));
    case 'quiz-questions':
      return wrap(renderQuizQuestions(w));
    case 'data-table':
      return wrap(renderDataTable(w));
    case 'kv-grid':
      return wrap(renderKvGrid(w));
    case 'status-banner':
      return wrap(renderStatusBanner(w));
    case 'empty-state':
      return wrap(renderEmptyState(w));
    case 'spinner':
    case 'loading-steps':
    case 'pipeline-indicator':
      return wrap(renderSpinner(w));
    case 'chat-panel':
      return wrap(renderChatPanel(w));
    case 'streaming-panel':
      return wrap(renderStreamingPanel(w));
    case 'streaming-text':
      return wrap(renderStreamingText(w));
    case 'history-grid':
    case 'history-list':
      return wrap(renderHistoryGrid(w));
    case 'habit-grid':
      return wrap(renderHabitGrid(w));
    case 'hero':
      return wrap(renderHero(w));
    case 'mode-selector':
      return wrap(renderModeSelector(w));
    case 'oauth-status-card':
      return wrap(renderOAuthCard(w));
    default:
      return `<!-- unknown widget: ${escapeHtml((w as { kind: string }).kind)} -->`;
  }
}

// ============================================================================
// Section / layout primitives
// ============================================================================

function renderSection(w: SectionWidget): string {
  const kindClass =
    w.kind === 'card' ? 'ha-card'
    : w.kind === 'row' ? 'ha-row'
    : w.kind === 'column' ? 'ha-col'
    : 'ha-stack';
  const title = w.title ? `<h3 class="ha-card__title">${tmplText(w.title)}</h3>` : '';
  const subtitle = w.subtitle ? `<p class="ha-card__subtitle">${tmplText(w.subtitle)}</p>` : '';
  const style = [
    w.gap != null ? `gap:${typeof w.gap === 'number' ? w.gap + 'px' : w.gap}` : '',
    w.padding != null ? `padding:${typeof w.padding === 'number' ? w.padding + 'px' : w.padding}` : '',
  ].filter(Boolean).join(';');
  return `<div${attrs({
    class: cls(kindClass, w.className),
    id: w.id,
    style: style || undefined,
    'data-show-when': w.showWhen,
    'data-hide-when': w.hideWhen,
  })}>${title}${subtitle}${renderWidgets(w.children)}</div>`;
}

// ============================================================================
// Tabs / accordion / modal
// ============================================================================

function renderTabs(w: TabsWidget): string {
  const groupId = w.id ?? uniqueId('tabs');
  const variant = w.variant ?? 'underline';
  const navCls = variant === 'pills' || variant === 'segmented' ? 'ha-pills' : 'ha-tabs';
  const defaultTab = w.defaultTab ?? w.tabs[0]?.id;
  const buttons = w.tabs
    .map((t) =>
      `<button${attrs({
        class: cls('ha-tab', t.id === defaultTab && 'ha-tab--active'),
        type: 'button',
        'data-tab-group': groupId,
        'data-tab': t.id,
      })}>${renderIconPrefix(t.icon)}${escapeHtml(t.label)}</button>`,
    )
    .join('');
  const panels = w.tabs
    .map((t) =>
      `<div${attrs({
        class: cls('ha-tab-panel', t.id === defaultTab && 'ha-tab-panel--active'),
        'data-tab-group': groupId,
        'data-tab-panel': t.id,
      })}>${renderWidgets(t.children)}</div>`,
    )
    .join('');
  return `<div${attrs({
    class: cls('ha-tabs-wrap', w.className),
    'data-show-when': w.showWhen,
    'data-hide-when': w.hideWhen,
  })}><div class="${navCls}">${buttons}</div>${panels}</div>`;
}

function renderAccordion(w: AccordionWidget): string {
  const items = w.items
    .map(
      (it) =>
        `<details${it.open ? ' open' : ''} class="ha-card" style="padding:0">
  <summary style="padding:var(--ha-pad-lg);cursor:pointer;font-weight:600">${escapeHtml(it.label)}</summary>
  <div style="padding:var(--ha-pad-lg);padding-top:0">${renderWidgets(it.children)}</div>
</details>`,
    )
    .join('');
  return `<div class="ha-stack"${attrs({ 'data-show-when': w.showWhen, 'data-hide-when': w.hideWhen })}>${items}</div>`;
}

function renderModal(w: ModalWidget): string {
  const variant = w.kind === 'bottom-sheet' ? 'ha-sheet' : 'ha-modal';
  const body = `<div class="${variant}">
  ${w.title ? `<h3 class="ha-card__title">${escapeHtml(w.title)}</h3>` : ''}
  ${renderWidgets(w.children)}
</div>`;
  if (w.kind === 'bottom-sheet') {
    return `<template${attrs({ 'data-modal': w.id ?? uniqueId('modal'), 'data-modal-when': w.openWhen })}>${body}</template>`;
  }
  return `<template${attrs({ 'data-modal': w.id ?? uniqueId('modal'), 'data-modal-when': w.openWhen })}>
<div class="ha-modal-backdrop" data-modal-close>${body}</div>
</template>`;
}

// ============================================================================
// Form + fields
// ============================================================================

function renderForm(w: FormWidget): string {
  const formId = w.id ?? uniqueId('form');
  const bindTo = w.bindTo ?? 'state';
  const fields = w.fields.map((f) => renderField(f, bindTo)).join('');
  const repeatable = w.repeatable ? renderRepeatable(w.repeatable, bindTo) : '';
  const submitBtn = w.submit
    ? `<button${attrs({
        type: 'submit',
        class: cls('ha-btn', w.submit.tone && `ha-btn--${w.submit.tone}`, 'ha-btn--block'),
        'data-submit-label': w.submit.label,
        'data-loading-label': w.submit.loadingLabel ?? 'Working...',
        'data-disabled-when': w.submit.disabledWhen,
      })}>${renderIconPrefix(w.submit.icon)}${escapeHtml(w.submit.label)}</button>`
    : '';
  const secondary = (w.secondary ?? [])
    .map(
      (s) =>
        `<button${attrs({
          type: 'button',
          class: cls('ha-btn', s.tone ? `ha-btn--${s.tone}` : 'ha-btn--secondary'),
          'data-action-click': s.action,
        })}>${escapeHtml(s.label)}</button>`,
    )
    .join('');
  const validate = w.validate ? ` data-validate="${escapeAttr(safeJson(w.validate))}"` : '';
  return `<form${attrs({
    id: formId,
    class: cls('ha-stack', w.className),
    'data-form': formId,
    'data-bind-to': bindTo,
    'data-action-submit': w.submit?.action,
    'data-show-when': w.showWhen,
    'data-hide-when': w.hideWhen,
  })}${validate}>
${fields}${repeatable}
<div class="ha-row">${submitBtn}${secondary}</div>
</form>`;
}

function renderField(f: FieldSpec, bindTo: string): string {
  const path = `${bindTo}.${f.name}`;
  const label = f.label
    ? `<label class="ha-label" for="${escapeAttr(`fld-${path}`)}">${escapeHtml(f.label)}${f.required ? '<span class="ha-label__req">*</span>' : ''}</label>`
    : '';
  const help = f.help ? `<small class="ha-help">${escapeHtml(f.help)}</small>` : '';
  let control = '';
  const baseAttrs = {
    id: `fld-${path}`,
    name: f.name,
    'data-bind': path,
    'data-required': f.required ? 'true' : undefined,
    'data-disabled-when': f.disabledWhen,
    placeholder: f.placeholder,
  } as Record<string, string | boolean | undefined>;

  switch (f.type) {
    case 'text':
    case 'email':
    case 'url':
    case 'password':
    case 'number':
    case 'date':
    case 'datetime':
    case 'time': {
      const type =
        f.type === 'datetime' ? 'datetime-local'
        : f.type;
      control = `<input${attrs({
        ...baseAttrs,
        type,
        class: 'ha-input',
        min: f.min,
        max: f.max,
        step: f.step,
      })} />`;
      break;
    }
    case 'hidden':
      control = `<input${attrs({ ...baseAttrs, type: 'hidden' })} />`;
      break;
    case 'textarea':
      control = `<textarea${attrs({
        ...baseAttrs,
        class: 'ha-textarea',
        rows: f.rows ?? 4,
      })}></textarea>`;
      break;
    case 'select':
    case 'multi-select': {
      if (f.optionsFrom) {
        control = `<select${attrs({
          ...baseAttrs,
          class: 'ha-select',
          multiple: f.type === 'multi-select',
          'data-options-from': f.optionsFrom,
          'data-option-label': f.optionLabel ?? 'name',
          'data-option-value': f.optionValue ?? '_id',
        })}><option value=""></option></select>`;
        break;
      }
      const opts = (f.options ?? [])
        .map((o) => {
          const v = typeof o === 'object' ? o.value : o;
          const l = typeof o === 'object' ? (o.label ?? String(v)) : String(o);
          return `<option value="${escapeAttr(String(v))}">${escapeHtml(l)}</option>`;
        })
        .join('');
      control = `<select${attrs({
        ...baseAttrs,
        class: 'ha-select',
        multiple: f.type === 'multi-select',
      })}>${opts}</select>`;
      break;
    }
    case 'chip-group':
    case 'radio-cards': {
      const opts = (f.options ?? [])
        .map((o) => {
          const v = typeof o === 'object' ? o.value : o;
          const lbl = typeof o === 'object' ? (o.label ?? String(v)) : String(o);
          const desc = typeof o === 'object' && o.description ? `<div class="ha-mode__opt-desc">${escapeHtml(o.description)}</div>` : '';
          const icon = typeof o === 'object' && o.icon ? renderIcon(o.icon, 'ha-icon ha-mode__opt-icon') : '';
          if (f.type === 'radio-cards') {
            return `<button type="button"${attrs({
              class: 'ha-mode__opt',
              'data-chip-group': path,
              'data-chip-value': String(v),
            })}>${icon}<div class="ha-mode__opt-label">${escapeHtml(lbl)}</div>${desc}</button>`;
          }
          return `<button type="button"${attrs({
            class: 'ha-chip',
            'data-chip-group': path,
            'data-chip-value': String(v),
          })}>${icon}${escapeHtml(lbl)}</button>`;
        })
        .join('');
      const wrapperCls = f.type === 'radio-cards' ? 'ha-mode' : 'ha-chip-group';
      control = `<div class="${wrapperCls}" data-chip-host="${escapeAttr(path)}">${opts}</div>`;
      break;
    }
    case 'tag-input':
      control = `<input${attrs({
        ...baseAttrs,
        type: 'text',
        class: 'ha-input',
        'data-tag-input': path,
        'data-tag-separator': f.separator ?? 'Enter',
      })} /><div class="ha-chip-group" data-tag-host="${escapeAttr(path)}" style="margin-top:6px"></div>`;
      break;
    case 'likert': {
      const scale = f.scale ?? 5;
      const opts = Array.from({ length: scale }, (_, i) =>
        `<button type="button"${attrs({
          class: 'ha-likert__opt',
          'data-chip-group': path,
          'data-chip-value': String(i + 1),
        })}>${i + 1}</button>`,
      ).join('');
      control = `<div class="ha-likert" data-chip-host="${escapeAttr(path)}">${opts}</div>`;
      break;
    }
    case 'checkbox':
    case 'switch':
      control = `<label class="ha-row" style="align-items:center;gap:8px"><input${attrs({
        ...baseAttrs,
        type: 'checkbox',
      })} /> ${escapeHtml(f.placeholder ?? '')}</label>`;
      break;
    case 'slider':
      control = `<input${attrs({
        ...baseAttrs,
        type: 'range',
        class: 'ha-input',
        min: f.min ?? 0,
        max: f.max ?? 100,
        step: f.step ?? 1,
      })} />`;
      break;
    case 'file-upload':
    case 'image-upload': {
      const accept = f.accept ?? (f.type === 'image-upload' ? 'image/*' : undefined);
      control = `<label class="ha-dropzone" data-dropzone="${escapeAttr(path)}"${attrs({
        'data-accept': accept,
        'data-max-size': f.maxSize,
        'data-as-base64': f.asBase64 !== false ? 'true' : undefined,
        'data-as-image': f.type === 'image-upload' ? 'true' : undefined,
      })}>
  <div class="ha-dropzone__icon">${renderIcon(f.type === 'image-upload' ? 'lucide:Image' : 'lucide:File', 'ha-icon ha-icon--dropzone')}</div>
  <div>Drop or click to upload</div>
  <div class="ha-dropzone__hint" data-dropzone-hint>${accept ? escapeHtml(accept) : 'Any file'}</div>
  <img class="ha-dropzone__preview" hidden data-dropzone-preview />
  <input type="file"${attrs({ accept, 'data-bind': path })} />
</label>`;
      break;
    }
    default:
      control = `<!-- unknown field: ${escapeHtml(f.type)} -->`;
  }

  return `<div${attrs({
    class: 'ha-field',
    'data-show-when': f.showWhen,
  })}>${label}${control}${help}</div>`;
}

function renderRepeatable(r: NonNullable<FormWidget['repeatable']>, bindTo: string): string {
  const hostPath = `${bindTo}.${r.name}`;
  const tplFields = r.fields.map((f) => renderField(f, 'item')).join('');
  return `<div${attrs({
    class: 'ha-stack',
    'data-repeat-host': hostPath,
    'data-repeat-min': r.min,
    'data-repeat-max': r.max,
  })}>
<template data-repeat-template>${tplFields}<button type="button" class="ha-btn ha-btn--ghost ha-btn--sm" data-repeat-remove>${escapeHtml(r.removeLabel ?? 'Remove')}</button></template>
<div data-repeat-items class="ha-stack"></div>
<button type="button" class="ha-btn ha-btn--secondary ha-btn--sm" data-repeat-add>${escapeHtml(r.addLabel ?? `+ Add ${r.name}`)}</button>
</div>`;
}

// ============================================================================
// Buttons
// ============================================================================

function buttonToneClass(tone?: Tone): string {
  if (!tone || tone === 'primary') return '';
  return `ha-btn--${tone}`;
}

function renderButton(w: ButtonWidget): string {
  const tone = w.variant ?? w.tone;
  const size = w.size === 'sm' ? 'ha-btn--sm' : w.size === 'lg' ? 'ha-btn--lg' : '';
  const toneCls = buttonToneClass(tone);
  return `<button${attrs({
    type: w.kind === 'submit-button' ? 'submit' : 'button',
    class: cls('ha-btn', size, toneCls, w.fullWidth && 'ha-btn--block', w.className),
    id: w.id,
    'data-action-click': w.action,
    'data-action-params': w.params ? safeJson(w.params) : undefined,
    'data-disabled-when': w.disabledWhen,
    'data-loading-label': w.loadingLabel,
    'data-submit-label': w.label,
  })}>${renderIconPrefix(w.icon)}${escapeHtml(w.label)}</button>`;
}

function renderButtonRowButton(w: ButtonRowButton): string {
  const tone = w.variant ?? w.tone;
  const size = w.size === 'sm' ? 'ha-btn--sm' : w.size === 'lg' ? 'ha-btn--lg' : '';
  const btn = `<button${attrs({
    type: 'button',
    class: cls('ha-btn', size, buttonToneClass(tone), w.className),
    'data-action-click': w.action,
    'data-action-params': w.params ? safeJson(w.params) : undefined,
    'data-disabled-when': w.disabledWhen,
    'data-loading-label': w.loadingLabel,
    'data-submit-label': w.label,
  })}>${renderIconPrefix(w.icon)}${escapeHtml(w.label)}</button>`;
  if (w.showWhen || w.hideWhen) {
    return `<span${attrs({ 'data-show-when': w.showWhen, 'data-hide-when': w.hideWhen })}>${btn}</span>`;
  }
  return btn;
}

function renderButtonRow(w: ButtonRowWidget): string {
  const buttons = (w.buttons ?? [])
    .map((btn) => {
      const kind = 'kind' in btn ? btn.kind : undefined;
      if (kind === 'copy-button') return renderCopyButton(btn as CopyButtonWidget);
      if (kind === 'download-button') return renderDownloadButton(btn as DownloadButtonWidget);
      if (kind === 'print-button') return renderPrintButton(btn as PrintButtonWidget);
      return renderButtonRowButton(btn as ButtonRowButton);
    })
    .join('');
  return `<div class="ha-row">${buttons}</div>`;
}

function renderCopyButton(w: CopyButtonWidget): string {
  return `<button${attrs({
    type: 'button',
    class: cls('ha-btn', 'ha-btn--secondary', 'ha-btn--sm', w.className),
    'data-copy-from': w.textPath,
  })}>${escapeHtml(w.label ?? 'Copy')}</button>`;
}

function renderDownloadButton(w: DownloadButtonWidget): string {
  return `<button${attrs({
    type: 'button',
    class: cls('ha-btn', 'ha-btn--secondary', 'ha-btn--sm', w.className),
    'data-download-from': w.dataPath,
    'data-download-name': w.fileName,
    'data-download-name-path': w.fileNamePath,
    'data-download-mime': w.mimeType,
  })}>${escapeHtml(w.label ?? 'Download')}</button>`;
}

function renderPrintButton(w: PrintButtonWidget): string {
  return `<button${attrs({
    type: 'button',
    class: cls('ha-btn', 'ha-btn--secondary', 'ha-btn--sm', w.className),
    'data-print-target': w.targetId,
  })}>${escapeHtml(w.label ?? 'Print')}</button>`;
}

// ============================================================================
// Result panels + structured outputs
// ============================================================================

function renderResultPanel(w: ResultPanelWidget): string {
  const title = w.title ? `<h3 class="ha-card__title">${tmplText(w.title)}</h3>` : '';
  return `<div${attrs({
    class: cls('ha-card', 'ha-stack', w.className),
    id: w.id,
    'data-show-when': w.source ?? w.showWhen,
    'data-hide-when': w.hideWhen,
  })}>${title}${renderWidgets(w.sections)}</div>`;
}

function renderPre(w: PreWidget): string {
  const copy = w.copy
    ? `<button type="button" class="ha-btn ha-btn--ghost ha-btn--sm" data-copy-from="${escapeAttr(w.source)}" style="float:right">Copy</button>`
    : '';
  return `<div${attrs({ class: cls('ha-card', w.className), 'data-show-when': w.showWhen, 'data-hide-when': w.hideWhen })}>
${copy}<pre class="ha-mono" data-pre-from="${escapeAttr(w.source)}" style="white-space:pre-wrap;margin:0"></pre>
</div>`;
}

function renderMarkdown(w: MarkdownWidget): string {
  return `<div${attrs({
    class: cls('ha-card', w.className),
    'data-markdown-from': w.source,
    'data-markdown-truncate': w.truncate,
    'data-show-when': w.showWhen,
    'data-hide-when': w.hideWhen,
  })}></div>`;
}

function renderText(w: TextWidget): string {
  return `<p${attrs({
    class: cls(w.muted ? 'ha-help' : w.strong ? 'ha-text--strong' : '', w.className),
    'data-text-tmpl': w.value,
    'data-show-when': w.showWhen,
    'data-hide-when': w.hideWhen,
  })}></p>`;
}

function renderHeading(w: HeadingWidget): string {
  const level = Math.min(6, Math.max(1, w.level ?? 2));
  return `<h${level}${attrs({
    class: w.className,
    'data-heading-tmpl': w.value,
    'data-show-when': w.showWhen,
    'data-hide-when': w.hideWhen,
  })}></h${level}>`;
}

function renderAlert(w: AlertWidget): string {
  const level = w.level === 'error' ? 'danger' : (w.level ?? 'info');
  return `<div${attrs({
    class: cls('ha-status', `ha-status--${level}`, w.className),
    'data-alert-tmpl': w.text,
    'data-show-when': w.showWhen,
    'data-hide-when': w.hideWhen,
  })}></div>`;
}

function renderList(w: ListWidget): string {
  return `<div${attrs({
    class: cls('ha-list', w.className),
    'data-ha-list-from': w.source,
    'data-ha-list-empty': w.empty,
    'data-ha-list-limit': w.limit,
    'data-ha-list-key': w.itemKey,
    'data-ha-list-tmpl': safeJson(w.template ?? []),
    'data-show-when': w.showWhen,
    'data-hide-when': w.hideWhen,
  })}></div>`;
}

function renderHtmlPreview(w: HtmlPreviewWidget): string {
  if (w.sandbox) {
    return `<iframe${attrs({
      class: w.className,
      sandbox: 'allow-same-origin',
      'data-html-from': w.source,
      'data-show-when': w.showWhen,
      'data-hide-when': w.hideWhen,
      style: 'width:100%;min-height:480px;border:1px solid var(--ha-border);border-radius:var(--ha-radius)',
    })}></iframe>`;
  }
  return `<div${attrs({ class: cls('ha-card', w.className), 'data-html-from': w.source, 'data-show-when': w.showWhen, 'data-hide-when': w.hideWhen })}></div>`;
}

function renderImage(w: ImageWidget): string {
  const style = [
    w.width != null ? `max-width:${typeof w.width === 'number' ? w.width + 'px' : w.width}` : '',
    w.height != null ? `max-height:${typeof w.height === 'number' ? w.height + 'px' : w.height}` : '',
    w.rounded ? 'border-radius:var(--ha-radius)' : '',
  ].filter(Boolean).join(';');
  return `<img${attrs({ class: w.className, alt: w.alt ?? '', 'data-tmpl-attr-src': w.source, style: style || undefined })} />`;
}

function renderScoreRing(w: ScoreRingWidget): string {
  const tone = w.tone ? `--tone:var(--ha-${w.tone})` : '';
  return `<div${attrs({
    class: cls('ha-score-ring', w.className),
    'data-score-from': w.source,
    'data-score-max': w.max ?? 100,
    style: tone || undefined,
  })}>
<div class="ha-score-ring__inner">
  <span class="ha-score-ring__value" data-score-display>0</span>
  <span class="ha-score-ring__label">${escapeHtml(w.label ?? (w.unit ?? '/' + (w.max ?? 100)))}</span>
</div>
</div>`;
}

function renderBarChart(w: BarChartWidget): string {
  return `<div${attrs({
    class: cls('ha-bar-chart', w.className),
    'data-bar-from': w.source,
    'data-bar-label-key': w.labelKey ?? 'name',
    'data-bar-value-key': w.valueKey ?? 'value',
    'data-bar-max': w.max,
  })}></div>`;
}

function renderProgressBar(w: ProgressBarWidget): string {
  return `<div class="ha-stack" style="gap:4px"${attrs({ 'data-show-when': w.showWhen, 'data-hide-when': w.hideWhen })}>
${w.label ? `<div class="ha-help">${escapeHtml(w.label)}</div>` : ''}
<div class="ha-progress"><div class="ha-progress__fill" data-progress-from="${escapeAttr(w.source)}" data-progress-max="${w.max ?? 100}" style="width:0%"></div></div>
</div>`;
}

function renderMetricGrid(w: MetricGridWidget): string {
  const cols = w.columns ?? (w.metrics?.length ?? 4);
  const style = `grid-template-columns:repeat(${cols},minmax(0,1fr))`;
  if (w.source) {
    return `<div${attrs({
      class: 'ha-metric-grid',
      'data-metric-from': w.source,
      style,
    })}></div>`;
  }
  const items = (w.metrics ?? [])
    .map((m) =>
      `<div class="ha-metric">
  ${m.icon ? renderIcon(m.icon, 'ha-icon ha-icon--metric') : ''}
  <div class="ha-metric__value">${tmplText(m.value)}</div>
  <div class="ha-metric__label">${tmplText(m.label)}</div>
  ${m.sublabel ? `<div class="ha-metric__sublabel">${tmplText(m.sublabel)}</div>` : ''}
</div>`,
    )
    .join('');
  return `<div class="ha-metric-grid" style="${style}">${items}</div>`;
}

function renderBadgeList(w: BadgeListWidget): string {
  return `<div${attrs({
    class: 'ha-chip-group',
    'data-badge-from': w.source,
    'data-badge-values': w.values ? safeJson(w.values) : undefined,
    'data-badge-tone': w.tone ?? 'primary',
    'data-badge-label-key': w.labelKey,
  })}></div>`;
}

function renderNumberedList(w: NumberedListWidget): string {
  const tag = w.kind === 'numbered-list' ? 'ol' : 'ul';
  return `<${tag}${attrs({
    class: w.className,
    'data-list-from': w.source,
    'data-list-tmpl': w.itemTemplate ?? '{{item}}',
    style: 'padding-left:1.4em;line-height:1.7',
  })}></${tag}>`;
}

function renderQuizQuestions(w: QuizQuestionsWidget): string {
  return `<div${attrs({
    class: cls('ha-stack', w.className),
    'data-quiz-from': w.source,
    'data-quiz-answers': w.answersPath ?? 'state.currentAnswers',
  })}></div>`;
}

function renderDataTable(w: DataTableWidget): string {
  const head = w.columns.map((c) => `<th${attrs({ style: c.align ? `text-align:${c.align}` : undefined })}>${escapeHtml(c.label)}</th>`).join('');
  return `<table${attrs({
    class: cls('ha-table', w.className),
    'data-table-from': w.source,
    'data-table-cols': safeJson(w.columns),
    'data-table-empty': w.empty ?? 'No items',
  })}>
<thead><tr>${head}</tr></thead>
<tbody></tbody>
</table>`;
}

function renderKvGrid(w: KvGridWidget): string {
  const cols = w.columns ?? 2;
  if (w.items?.length) {
    const rows = w.items
      .map(
        (item) =>
          `<div class="ha-kv__row"><div class="ha-kv__key">${tmplText(item.label)}</div><div class="ha-kv__val">${tmplText(item.value)}</div></div>`,
      )
      .join('');
    return `<div class="ha-kv" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${rows}</div>`;
  }
  return `<div${attrs({
    class: 'ha-kv',
    'data-kv-from': w.source,
    'data-kv-fields': w.fields ? safeJson(w.fields) : undefined,
    style: `grid-template-columns:repeat(${cols},minmax(0,1fr))`,
  })}></div>`;
}

// ============================================================================
// Feedback
// ============================================================================

function renderStatusBanner(w: StatusBannerWidget): string {
  return `<div${attrs({
    class: cls('ha-status', w.className),
    'data-status-from': w.source,
  })}></div>`;
}

function renderEmptyState(w: EmptyStateWidget): string {
  return `<div class="ha-empty"${attrs({ 'data-show-when': w.showWhen, 'data-hide-when': w.hideWhen })}>
${w.icon ? renderIcon(w.icon, 'ha-icon ha-empty__icon') : ''}
${w.title ? `<div class="ha-empty__title">${escapeHtml(w.title)}</div>` : ''}
${w.subtitle ? `<div class="ha-empty__sub">${escapeHtml(w.subtitle)}</div>` : ''}
${w.cta ? `<button type="button" class="ha-btn" style="margin-top:12px" data-action-click="${escapeAttr(w.cta.action)}">${escapeHtml(w.cta.label)}</button>` : ''}
</div>`;
}

function renderSpinner(w: SpinnerWidget): string {
  if (w.kind === 'loading-steps' || w.kind === 'pipeline-indicator') {
    const steps = (w.steps ?? [])
      .map((s, i) => `<div class="ha-stream__item" data-step-index="${i}"><div class="ha-stream__head">${escapeHtml(s)} <span class="ha-help" data-step-status>queued</span></div></div>`)
      .join('');
    return `<div${attrs({ class: 'ha-stream', 'data-show-when': w.source ?? w.showWhen, 'data-hide-when': w.hideWhen, 'data-steps': 'true' })}>${steps}</div>`;
  }
  return `<div${attrs({ class: 'ha-loading-row', 'data-show-when': w.source ?? w.showWhen, 'data-hide-when': w.hideWhen })}><span class="ha-spinner"></span><span>${escapeHtml(w.label ?? 'Loading...')}</span></div>`;
}

// ============================================================================
// Realtime
// ============================================================================

function renderChatPanel(w: ChatPanelWidget): string {
  const draftPath = w.inputField ?? 'state.__chatDraft';
  const quickActions = (w.quickActions ?? [])
    .map(
      (q) =>
        `<button type="button" class="ha-chip" data-quick-action='${escapeAttr(safeJson(q.sets))}'>${escapeHtml(q.label)}</button>`,
    )
    .join('');
  return `<div${attrs({
    class: cls('ha-chat', 'ha-card', w.className),
    style: 'padding:0;height:560px;display:flex;flex-direction:column',
    'data-show-when': w.showWhen,
    'data-hide-when': w.hideWhen,
  })}>
<div class="ha-chat__thread" data-chat-thread data-chat-from="${escapeAttr(w.messages)}" data-chat-show-tools="${w.showToolCalls ? 'true' : 'false'}"></div>
${quickActions ? `<div class="ha-row" style="padding:8px var(--ha-pad);flex-wrap:wrap">${quickActions}</div>` : ''}
<div class="ha-chat__input">
  <textarea class="ha-textarea" rows="2" data-bind="${escapeAttr(draftPath)}" placeholder="${escapeAttr(w.placeholder ?? 'Type your message…')}" data-chat-input></textarea>
  <button type="button" class="ha-btn" data-action-click="${escapeAttr(w.inputAction)}" data-chat-send>Send</button>
</div>
</div>`;
}

function renderStreamingPanel(w: StreamingPanelWidget): string {
  return `<div${attrs({
    class: cls('ha-stream', w.className),
    'data-stream-from': w.source,
    'data-stream-tmpl': safeJson(w.itemTemplate ?? { title: '{{item.nodeName}}', status: '{{item.status}}', body: '{{item.output | json}}' }),
  })}></div>`;
}

function renderStreamingText(w: StreamingTextWidget): string {
  const cls2 = w.monospace !== false ? 'ha-mono' : '';
  return `<pre${attrs({ class: cls(cls2, w.className), 'data-pre-from': w.source, style: 'white-space:pre-wrap;background:var(--ha-bg-surface);padding:var(--ha-pad);border-radius:var(--ha-radius);border:1px solid var(--ha-border);margin:0' })}></pre>`;
}

function renderHistoryGrid(w: HistoryGridWidget): string {
  const tmpl = w.itemTemplate ?? { title: '{{item.title}}', subtitle: '{{item.subtitle}}' };
  const columns = w.columns ?? 1;
  return `<div${attrs({
    class: w.kind === 'history-list' ? 'ha-stack' : 'ha-history',
    'data-history-from': w.loadAction,
    'data-history-path': w.dataPath,
    'data-history-reload-after': w.reloadAfter ? w.reloadAfter.join(',') : undefined,
    'data-history-tmpl': safeJson(tmpl),
    'data-history-onclick': w.onClick ? safeJson(w.onClick) : undefined,
    'data-history-empty': w.empty ?? 'Nothing here yet.',
    style: w.kind === 'history-list' ? undefined : `grid-template-columns:repeat(${columns},minmax(0,1fr))`,
  })}></div>`;
}

// ============================================================================
// App scaffolding
// ============================================================================

function renderHabitGrid(w: HabitGridWidget): string {
  const cols = w.columns ?? 3;
  const items = w.items
    .map((it) => {
      const tags = (it.tags ?? []).map((t) => `<span class="ha-tag">${escapeHtml(t)}</span>`).join('');
      const trigger = it.trigger
        ? `<span class="ha-tag ha-tag--${it.trigger === 'webhook' ? 'accent' : 'primary'}">${escapeHtml(it.trigger)}</span>`
        : '';
      return `<div class="ha-habit-card">
  <div class="ha-habit-card__name">${escapeHtml(it.name)}</div>
  ${it.description ? `<div class="ha-habit-card__desc">${escapeHtml(it.description)}</div>` : ''}
  <div class="ha-habit-card__meta">${trigger}${tags}</div>
</div>`;
    })
    .join('');
  return `<div class="ha-habit-grid" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${items}</div>`;
}

function renderHero(w: HeroWidget): string {
  const description = (w as { description?: string }).description ?? w.subtitle;
  const imageSource = (w as { imageSource?: string }).imageSource;
  const chips = (w as { chips?: Array<{ label?: string; icon?: string }> }).chips;
  return `<div class="ha-card" style="text-align:center;padding:var(--ha-pad-lg)">
${imageSource ? `<img class="ha-hero__img" data-bind-src="${escapeAttr(imageSource)}" alt="" style="max-width:100%;border-radius:12px;margin-bottom:12px" />` : ''}
${w.icon ? `<div style="margin-bottom:8px">${renderIconTmpl(w.icon, 'ha-icon ha-icon--hero')}</div>` : ''}
${w.title ? `<h2 style="margin:0">${tmplText(w.title)}</h2>` : ''}
${description ? `<p style="color:var(--ha-text-muted);margin:6px 0 0">${tmplText(description)}</p>` : ''}
${chips && chips.length ? `<div class="ha-row" style="justify-content:center;gap:8px;margin-top:12px">${chips.map((c) => `<span class="ha-pill">${c.icon ? renderIconPrefix(c.icon) : ''}${tmplText(c.label ?? '')}</span>`).join('')}</div>` : ''}
${w.cta ? `<button class="ha-btn" style="margin-top:14px" data-action-click="${escapeAttr(w.cta.action)}">${tmplText(w.cta.label)}</button>` : ''}
</div>`;
}

function renderModeSelector(w: ModeSelectorWidget): string {
  const opts = w.options
    .map(
      (o) => `<button type="button" class="ha-mode__opt"${attrs({ 'data-chip-group': w.bind, 'data-chip-value': String(o.value) })}>
${o.icon ? renderIcon(o.icon, 'ha-icon ha-mode__opt-icon') : ''}
<span class="ha-mode__opt-label">${escapeHtml(o.label)}</span>
${o.description ? `<div class="ha-mode__opt-desc">${escapeHtml(o.description)}</div>` : ''}
</button>`,
    )
    .join('');
  return `<div class="ha-mode" data-chip-host="${escapeAttr(w.bind)}">${opts}</div>`;
}

function renderOAuthCard(w: OAuthStatusCardWidget): string {
  return `<div${attrs({ class: 'ha-card', 'data-oauth-card': w.action, 'data-oauth-provider': w.provider, 'data-oauth-connected-label': w.connectedLabel ?? `${w.provider} connected`, 'data-oauth-disconnected-label': w.disconnectedLabel ?? `Connect ${w.provider}` })}>
<div class="ha-row" style="align-items:center;justify-content:space-between">
  <div class="ha-row" style="align-items:center;gap:10px"><div class="ha-footer-status__dot ha-footer-status__dot--idle" data-oauth-dot></div><div data-oauth-label>Checking…</div></div>
  <button type="button" class="ha-btn ha-btn--sm" data-oauth-connect hidden>Connect</button>
</div>
</div>`;
}

export const _tone = (t: Tone | undefined): string => (t ? `ha-btn--${t}` : '');
export { joinHtml };
