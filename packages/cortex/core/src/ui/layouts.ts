import type { LayoutSpec, NavItemSpec, UiSpec, ViewSpec, WidgetSpec } from './types';
import { renderWidgets } from './widgets';
import { attrs, cls, escapeAttr, escapeHtml, safeJson, tmplText } from './helpers';

function viewsFromSpec(spec: UiSpec): Record<string, ViewSpec> {
  const out: Record<string, ViewSpec> = {};
  if (spec.views) Object.assign(out, spec.views);
  if (spec.widgets && !out['main']) {
    out['main'] = { widgets: spec.widgets };
  }
  return out;
}

function renderHeader(spec: UiSpec): string {
  const h = spec.layout?.header;
  if (!h && !spec.meta?.title) return '';
  const title = h?.title ?? spec.meta?.title;
  const subtitle = h?.subtitle ?? spec.meta?.subtitle;
  const icon = h?.icon ?? spec.meta?.icon;
  const sticky = h?.sticky === false ? '' : 'ha-header--sticky';
  const badge = h?.badge
    ? `<span class="ha-tag ha-tag--${h.badge.tone ?? 'primary'}">${escapeHtml(h.badge.text)}</span>`
    : '';
  const actions = h?.actions ? renderWidgets(h.actions) : '';
  return `<header class="${cls('ha-header', sticky)}">
${icon ? `<div class="ha-header__icon">${tmplText(icon)}</div>` : ''}
<div>
  <h1 class="ha-header__title">${tmplText(title ?? '')} ${badge}</h1>
  ${subtitle ? `<p class="ha-header__subtitle">${tmplText(subtitle)}</p>` : ''}
</div>
<div class="ha-header__actions">${actions}</div>
</header>`;
}

function renderFooterStatus(spec: UiSpec): string {
  const f = spec.layout?.footerStatus;
  if (!f) return '';
  const dotCls = f.dot && f.dot !== 'live' ? `ha-footer-status__dot--${f.dot}` : '';
  return `<footer class="ha-footer-status">
<div class="${cls('ha-footer-status__dot', dotCls)}"></div>
<div>${escapeHtml(f.text ?? '')}</div>
${f.port ? `<div style="margin-left:auto">Port ${escapeHtml(String(f.port))}</div>` : ''}
${f.version ? `<div>v${escapeHtml(String(f.version))}</div>` : ''}
</footer>`;
}

function renderViewContainer(viewId: string, view: ViewSpec, isDefault: boolean, opts?: { alwaysVisible?: boolean }): string {
  return `<section${attrs({
    class: cls('ha-view', isDefault && 'ha-view--active'),
    'data-view-id': viewId,
    'data-on-enter': view.onEnter ? (Array.isArray(view.onEnter) ? view.onEnter.join(',') : view.onEnter) : undefined,
    'data-always-visible': opts?.alwaysVisible ? 'true' : undefined,
  })}>${renderWidgets(view.widgets)}</section>`;
}

function pickDefaultView(spec: UiSpec, views: Record<string, ViewSpec>): string {
  if (spec.defaultView && views[spec.defaultView]) return spec.defaultView;
  const nav = spec.layout?.nav?.[0]?.id;
  if (nav && views[nav]) return nav;
  if (views['main']) return 'main';
  return Object.keys(views)[0] ?? 'main';
}

// ============================================================================
// Layout renderers
// ============================================================================

export function renderLayout(spec: UiSpec): string {
  const layout = spec.layout ?? {};
  const type = layout.type ?? 'single';
  const views = viewsFromSpec(spec);

  switch (type) {
    case 'tabs':
      return renderTabsLayout(spec, views);
    case 'sidebar':
      return renderSidebarLayout(spec, views);
    case 'mobile-shell':
      return renderMobileShellLayout(spec, views);
    case 'wizard':
      return renderWizardLayout(spec, views);
    case 'split':
      return renderSplitLayout(spec, views);
    case 'chat':
      return renderChatLayout(spec, views);
    case 'showcase':
      return renderShowcaseLayout(spec, views);
    case 'single':
    default:
      return renderSingleLayout(spec, views);
  }
}

function renderSingleLayout(spec: UiSpec, views: Record<string, ViewSpec>): string {
  const def = pickDefaultView(spec, views);
  const main = views[def] ?? { widgets: spec.widgets ?? [] };
  return `<div class="ha-app">
${renderHeader(spec)}
<main class="ha-app__main"><div class="ha-container">${renderViewContainer(def, main, true)}</div></main>
${renderFooterStatus(spec)}
</div>`;
}

function renderTabsLayout(spec: UiSpec, views: Record<string, ViewSpec>): string {
  const def = pickDefaultView(spec, views);
  const nav: NavItemSpec[] = spec.layout?.nav ?? Object.keys(views).map((id) => ({ id, label: id }));
  const tabBtns = nav
    .map(
      (n) =>
        `<button${attrs({
          type: 'button',
          class: cls('ha-tab', n.id === def && 'ha-tab--active'),
          'data-view-link': n.id,
        })}>${n.icon ? escapeHtml(n.icon) + ' ' : ''}${escapeHtml(n.label)}</button>`,
    )
    .join('');
  const panels = nav
    .map((n) => renderViewContainer(n.id, views[n.id] ?? { widgets: [] }, n.id === def))
    .join('');
  return `<div class="ha-app">
${renderHeader(spec)}
<main class="ha-app__main"><div class="ha-container">
<div class="ha-tabs">${tabBtns}</div>
<div class="ha-views">${panels}</div>
</div></main>
${renderFooterStatus(spec)}
</div>`;
}

function renderSidebarLayout(spec: UiSpec, views: Record<string, ViewSpec>): string {
  const def = pickDefaultView(spec, views);
  const nav: NavItemSpec[] = spec.layout?.nav ?? Object.keys(views).map((id) => ({ id, label: id }));
  const items = nav
    .map(
      (n) =>
        `<button${attrs({
          type: 'button',
          class: cls('ha-sidebar__item', n.id === def && 'ha-sidebar__item--active'),
          'data-view-link': n.id,
        })}>${n.icon ? `<span>${escapeHtml(n.icon)}</span>` : ''}<span>${escapeHtml(n.label)}</span></button>`,
    )
    .join('');
  const panels = nav
    .map((n) => renderViewContainer(n.id, views[n.id] ?? { widgets: [] }, n.id === def))
    .join('');
  return `<div class="ha-shell">
<aside class="ha-sidebar">
${spec.meta?.icon || spec.meta?.title ? `<div style="padding:var(--ha-pad-sm) var(--ha-pad);font-weight:700">${escapeHtml(spec.meta?.icon ?? '')} ${escapeHtml(spec.meta?.title ?? '')}</div>` : ''}
${items}
</aside>
<div style="flex:1;display:flex;flex-direction:column;min-width:0">
${renderHeader(spec)}
<div class="ha-shell__main"><div class="ha-container">${panels}</div></div>
${renderFooterStatus(spec)}
</div>
</div>`;
}

function renderMobileShellLayout(spec: UiSpec, views: Record<string, ViewSpec>): string {
  const def = pickDefaultView(spec, views);
  const nav: NavItemSpec[] = spec.layout?.nav ?? Object.keys(views).map((id) => ({ id, label: id }));
  const panels = nav.map((n) => renderViewContainer(n.id, views[n.id] ?? { widgets: [] }, n.id === def)).join('');
  const items = nav
    .map(
      (n) =>
        `<button${attrs({
          type: 'button',
          class: cls('ha-bottom-nav__item', n.id === def && 'ha-bottom-nav__item--active'),
          'data-view-link': n.id,
        })}><span style="font-size:18px">${escapeHtml(n.icon ?? '•')}</span><span>${escapeHtml(n.label)}</span></button>`,
    )
    .join('');
  return `<div class="ha-app" style="max-width:480px;margin:0 auto">
${renderHeader(spec)}
<main class="ha-app__main"><div class="ha-views">${panels}</div></main>
<nav class="ha-bottom-nav">${items}</nav>
</div>`;
}

function renderWizardLayout(spec: UiSpec, views: Record<string, ViewSpec>): string {
  const def = pickDefaultView(spec, views);
  const nav: NavItemSpec[] = spec.layout?.nav ?? Object.keys(views).map((id) => ({ id, label: id }));
  const steps = nav
    .map(
      (n, i) =>
        `<div${attrs({
          class: cls('ha-chip', n.id === def && 'ha-chip--active'),
          'data-view-link': n.id,
        })}>${i + 1}. ${escapeHtml(n.label)}</div>`,
    )
    .join('');
  const panels = nav.map((n) => renderViewContainer(n.id, views[n.id] ?? { widgets: [] }, n.id === def)).join('');
  return `<div class="ha-app">
${renderHeader(spec)}
<main class="ha-app__main"><div class="ha-container">
<div class="ha-chip-group" style="margin-bottom:var(--ha-pad)">${steps}</div>
${panels}
</div></main>
${renderFooterStatus(spec)}
</div>`;
}

function renderSplitLayout(spec: UiSpec, views: Record<string, ViewSpec>): string {
  const left = spec.layout?.split?.left ?? 'left';
  const right = spec.layout?.split?.right ?? 'right';
  const ratio = spec.layout?.split?.ratio ?? '1fr 1fr';
  const lv = views[left] ?? { widgets: [] };
  const rv = views[right] ?? { widgets: [] };
  return `<div class="ha-app">
${renderHeader(spec)}
<main class="ha-app__main"><div style="display:grid;grid-template-columns:${escapeAttr(ratio)};gap:var(--ha-pad);align-items:start">
${renderViewContainer(left, lv, true, { alwaysVisible: true })}
${renderViewContainer(right, rv, true, { alwaysVisible: true })}
</div></main>
${renderFooterStatus(spec)}
</div>`;
}

function renderChatLayout(spec: UiSpec, views: Record<string, ViewSpec>): string {
  const def = pickDefaultView(spec, views);
  const main = views[def] ?? { widgets: spec.widgets ?? [] };
  // chat layout fills the viewport
  return `<div class="ha-app" style="height:100vh">
${renderHeader(spec)}
<main class="ha-app__main" style="flex:1;padding:0">${renderViewContainer(def, main, true)}</main>
</div>`;
}

function renderShowcaseLayout(spec: UiSpec, views: Record<string, ViewSpec>): string {
  // Showcase: header + flat content (stats + habit grid + status footer)
  const def = pickDefaultView(spec, views);
  const main = views[def] ?? { widgets: spec.widgets ?? [] };
  return `<div class="ha-app">
${renderHeader(spec)}
<main class="ha-app__main"><div class="ha-container ha-stack">${renderWidgets(main.widgets)}</div></main>
${renderFooterStatus(spec)}
</div>`;
}

export function listAllViews(spec: UiSpec): { id: string; widgets: WidgetSpec[] }[] {
  const views = viewsFromSpec(spec);
  return Object.entries(views).map(([id, v]) => ({ id, widgets: v.widgets }));
}
