import type { UiSpec } from './types';
import { renderThemeCss } from './theme';
import { renderLayout } from './layouts';
import { getRuntimeJs } from './runtime';
import { BUILDER_PREVIEW_CSS, BUILDER_PREVIEW_JS } from './builderPreview';
import { escapeHtml, resetIdCounter, safeJson } from './helpers';
import { parseUiSpec } from './parseSpec';

export interface CompileOptions {
  /** Defaults to `meta.id`. Used as the default action endpoint base (`/api/{id}`). */
  workflowId?: string;
  /** Inject extra `<head>` HTML (CSS links, fonts, etc.). */
  extraHead?: string;
  /** Override the document <title>. */
  documentTitle?: string;
  /** Pretty-print the output. Default true. */
  pretty?: boolean;
  /** WYSIWYG builder preview: inject selection overlays and disable interactions. */
  builderPreview?: boolean;
}

export interface CompiledUi {
  html: string;
}

/** Compile a `UiSpec` into a self-contained HTML document. */
export function compileUiSpec(spec: UiSpec, opts: CompileOptions = {}): CompiledUi {
  resetIdCounter();
  const themeCss = renderThemeCss(spec.theme);
  const body = renderLayout(spec);
  const runtimeJs = getRuntimeJs();
  const title = opts.documentTitle ?? spec.meta?.documentTitle ?? spec.meta?.title ?? 'Habit';
  const workflowId = opts.workflowId ?? spec.meta?.id ?? '';
  const meta = { id: workflowId, title: spec.meta?.title ?? '', icon: spec.meta?.icon ?? '' };
  const cfg = {
    meta,
    state: spec.state ?? {},
    actions: spec.actions ?? {},
    defaultView: spec.defaultView,
    onMount: spec.onMount,
  };
  const html = `<!DOCTYPE html>
<html lang="en"${spec.theme?.mode === 'light' ? '' : ' class="dark"'}>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>${escapeHtml(title)}</title>
${opts.extraHead ?? ''}
<style>
${themeCss}
${opts.builderPreview ? BUILDER_PREVIEW_CSS : ''}
</style>
</head>
<body>
${body}
<script type="application/json" id="__ha_cfg">${safeJson(cfg)}<\/script>
<script>${runtimeJs}<\/script>
${opts.builderPreview ? `<script>${BUILDER_PREVIEW_JS}<\/script>` : ''}
</body>
</html>`;
  return { html };
}

/** Convenience: parse YAML + compile in one step. */
export function compileUiYaml(source: string, opts: CompileOptions = {}): CompiledUi {
  const spec = parseUiSpec(source);
  return compileUiSpec(spec, opts);
}
