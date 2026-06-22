/**
 * Wizard patterns — seed widget trees onto a view, then user tweaks on canvas.
 */
import { objectToWidgetNode, resolveActiveViewId, type SpecState, widgetNodeToObject } from './uiSpecYaml';
import type { WidgetNode } from './uiSpecYaml';

export interface FormFieldDef {
  name: string;
  type: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  default?: string;
  options?: string[];
}

export interface FormFeedbackResultConfig {
  viewId: string;
  cardTitle: string;
  fields: FormFieldDef[];
  submitAction: string;
  submitLabel?: string;
  loadingLabel?: string;
  errorStateKey?: string;
  resultStateKey?: string;
  resultTitle?: string;
  hideFormWhen?: string;
  resultSections?: 'json' | 'recipe';
  clearAction?: string;
}

export interface HistoryListConfig {
  viewId: string;
  loadAction: string;
  dataPath?: string;
  onEnter?: string;
  onClickAction: string;
  columns?: number;
  empty?: string;
  reloadAfter?: string[];
}

function recipeResultSections(resultStateKey: string): Record<string, unknown>[] {
  const s = resultStateKey.startsWith('state.') ? resultStateKey : `state.${resultStateKey}`;
  return [
    {
      kind: 'hero',
      title: `{{${s}.recipe.title}}`,
      description: `{{${s}.recipe.description}}`,
      chips: [
        { label: `{{${s}.recipe.prepTime}}`, icon: 'lucide:Timer' },
        { label: `{{${s}.recipe.cookTime}}`, icon: 'lucide:Flame' },
        { label: `{{${s}.recipe.servings}} servings`, icon: 'lucide:Utensils' },
        { label: `{{${s}.recipe.difficulty}}`, icon: 'lucide:TrendingUp' },
      ],
    },
    {
      kind: 'section',
      title: 'Ingredients',
      children: [
        { kind: 'bullet-list', source: `${s}.recipe.ingredients`, itemTemplate: '{{item.amount}} {{item.item}}' },
      ],
    },
    {
      kind: 'section',
      title: 'Instructions',
      children: [
        { kind: 'numbered-list', source: `${s}.recipe.instructions`, itemTemplate: '{{item.instruction}}' },
      ],
    },
    {
      kind: 'button',
      label: 'Generate another',
      action: 'clearRecipe',
      variant: 'secondary',
    },
  ];
}

export function buildFormFeedbackResultWidgets(config: FormFeedbackResultConfig): Record<string, unknown>[] {
  const errorKey = config.errorStateKey ?? 'error';
  const resultKey = config.resultStateKey ?? 'result';
  const resultSource = resultKey.startsWith('state.') ? resultKey : `state.${resultKey}`;
  const errorSource = errorKey.startsWith('state.') ? errorKey : `state.${errorKey}`;

  const sections =
    config.resultSections === 'recipe'
      ? recipeResultSections(resultKey)
      : [{ kind: 'json-dump', source: resultSource, copy: true }];

  if (config.clearAction && config.resultSections === 'recipe') {
    const btn = sections.find((s) => s.kind === 'button');
    if (btn) btn.action = config.clearAction;
  }

  return [
    {
      kind: 'card',
      title: config.cardTitle,
      ...(config.hideFormWhen ? { hideWhen: config.hideFormWhen } : { hideWhen: resultSource }),
      children: [
        {
          kind: 'form',
          bindTo: 'state',
          fields: config.fields.map((f) => {
            const field: Record<string, unknown> = {
              name: f.name,
              type: f.type,
              label: f.label,
            };
            if (f.placeholder) field.placeholder = f.placeholder;
            if (f.required) field.required = true;
            if (f.default) field.default = f.default;
            if (f.options?.length) field.options = f.options;
            return field;
          }),
          submit: {
            label: config.submitLabel ?? 'Submit',
            action: config.submitAction,
            loadingLabel: config.loadingLabel ?? 'Working…',
          },
        },
      ],
    },
    {
      kind: 'status-banner',
      showWhen: errorSource,
      source: errorSource,
    },
    {
      kind: 'result-panel',
      showWhen: resultSource,
      source: resultSource,
      title: config.resultTitle ?? 'Result',
      sections,
    },
  ];
}

export function buildHistoryListWidgets(config: HistoryListConfig): Record<string, unknown>[] {
  return [
    {
      kind: 'history-grid',
      loadAction: config.loadAction,
      dataPath: config.dataPath ?? 'entries',
      columns: config.columns ?? 2,
      empty: config.empty ?? 'No items yet.',
      reloadAfter: config.reloadAfter,
      itemTemplate: {
        title: '{{item.recipe.title}}',
        subtitle: '{{item.recipe.cuisine}} · {{item.recipe.totalTime}}',
        meta: '{{item._createdAt | date}}',
      },
      onClick: {
        action: config.onClickAction,
        params: { id: '{{item._id}}' },
      },
    },
  ];
}

/** Apply widget specs to a view and sync canvas if that view is active. */
export function applyWidgetsToView(
  spec: SpecState,
  viewId: string,
  widgetSpecs: Record<string, unknown>[],
  viewMeta?: Record<string, unknown>,
): SpecState {
  const views = { ...(spec.views ?? {}) };
  views[viewId] = {
    ...(views[viewId] ?? {}),
    ...viewMeta,
    widgets: widgetSpecs,
  };
  const nodes = widgetSpecs.map((w) => objectToWidgetNode(w));
  const activeId = resolveActiveViewId({ ...spec, views });
  return {
    ...spec,
    views,
    activeViewId: activeId ?? viewId,
    widgets: activeId === viewId ? nodes : spec.widgets,
  };
}

export function applyFormFeedbackResultPattern(
  spec: SpecState,
  config: FormFeedbackResultConfig,
): SpecState {
  const widgets = buildFormFeedbackResultWidgets(config);
  return applyWidgetsToView(spec, config.viewId, widgets);
}

export function applyHistoryListPattern(spec: SpecState, config: HistoryListConfig): SpecState {
  const widgets = buildHistoryListWidgets(config);
  const viewMeta = config.onEnter ? { onEnter: config.onEnter } : undefined;
  return applyWidgetsToView(spec, config.viewId, widgets, viewMeta);
}

export function switchSpecView(spec: SpecState, newViewId: string): SpecState {
  if (!spec.views) return { ...spec, activeViewId: newViewId };
  const currentViewId = resolveActiveViewId(spec);
  if (!currentViewId) return { ...spec, activeViewId: newViewId };

  const savedViews = {
    ...spec.views,
    [currentViewId]: {
      ...(spec.views[currentViewId] ?? {}),
      widgets: spec.widgets.map(widgetNodeToObject),
    },
  };
  const targetView = savedViews[newViewId];
  const rawWidgets = targetView?.widgets;
  const newWidgets = Array.isArray(rawWidgets)
    ? rawWidgets.map((w) => objectToWidgetNode(w as Record<string, unknown>))
    : [];

  return {
    ...spec,
    views: savedViews,
    widgets: newWidgets,
    activeViewId: newViewId,
  };
}

export function applyCookbookActions(spec: SpecState): SpecState {
  return {
    ...spec,
    actions: {
      ...spec.actions,
      generate: {
        method: 'POST',
        endpoint: '/api/generate-recipe',
        body: {
          ingredients: '{{state.ingredients}}',
          restrictions: '{{state.restrictions}}',
          cuisine: '{{state.cuisine}}',
          mealType: '{{state.mealType}}',
          servings: '{{state.servings}}',
        },
        responsePath: 'output',
        onSuccess: {
          set: { currentRecipe: '$response', error: null },
          dispatch: 'listHistory',
          toast: 'Recipe ready',
        },
        onError: { set: { error: '$error.message' } },
      },
      listHistory: {
        method: 'POST',
        endpoint: '/api/list-recipes',
        body: { limit: 12 },
        responsePath: 'output',
      },
      reopenRecipe: {
        method: 'GET',
        endpoint: '/api/get-recipe',
        query: { id: '{{params.id}}' },
        responsePath: 'output.recipe',
        onSuccess: {
          set: { currentRecipe: '$response', error: null },
          goto: 'create',
          toast: 'Recipe loaded',
        },
      },
      clearRecipe: {
        set: { currentRecipe: null, error: null },
      },
    },
  };
}

export function applyCookbookLayout(spec: SpecState): SpecState {
  const nav = [
    { id: 'create', label: 'Create', icon: 'lucide:Sparkles' },
    { id: 'history', label: 'History', icon: 'lucide:FolderOpen' },
  ];
  const views: Record<string, Record<string, unknown>> = { ...(spec.views ?? {}) };
  for (const item of nav) {
    if (!views[item.id]) views[item.id] = { widgets: [] };
  }
  return {
    ...spec,
    layout: {
      ...spec.layout,
      type: 'tabs',
      header: {
        title: spec.meta.title,
        subtitle: spec.meta.subtitle,
        icon: spec.meta.icon,
      },
      nav,
    },
    views,
    defaultView: 'create',
    activeViewId: 'create',
    widgets: views.create?.widgets
      ? (views.create.widgets as Record<string, unknown>[]).map((w) => objectToWidgetNode(w))
      : spec.widgets,
  };
}

export function widgetsForView(spec: SpecState, viewId: string): WidgetNode[] {
  const raw = spec.views?.[viewId]?.widgets;
  if (!Array.isArray(raw)) return [];
  return raw.map((w) => objectToWidgetNode(w as Record<string, unknown>));
}
