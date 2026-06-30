/**
 * Prune or retarget UiSpec YAML when backend habits are removed or renamed.
 */
import { habitIdFromEndpoint } from './actionLinking';
import {
  emitYaml,
  parseYamlToSpecState,
  specStateToSpec,
  type SpecState,
  type WidgetNode,
} from './uiSpecYaml';

const YAML_HEAD = '# yaml-language-server: $schema=../../../schemas/ui-spec.schema.yaml\n';

export function emitSpecStateAsYaml(spec: SpecState): string {
  return YAML_HEAD + emitYaml(specStateToSpec(spec));
}

function stripActionFromProps(
  props: Record<string, unknown>,
  removedActionIds: Set<string>,
): Record<string, unknown> {
  const next = { ...props };

  const submit = next.submit as { action?: string } | undefined;
  if (submit?.action && removedActionIds.has(String(submit.action))) {
    const { action: _action, ...rest } = submit;
    if (Object.keys(rest).length > 0) next.submit = rest;
    else delete next.submit;
  }

  if (next.action && removedActionIds.has(String(next.action))) {
    delete next.action;
  }

  if (next.loadAction && removedActionIds.has(String(next.loadAction))) {
    delete next.loadAction;
  }

  const onClick = next.onClick as { action?: string } | undefined;
  if (onClick?.action && removedActionIds.has(String(onClick.action))) {
    const { action: _action, ...rest } = onClick;
    if (Object.keys(rest).length > 0) next.onClick = rest;
    else delete next.onClick;
  }

  const secondary = next.secondary as Array<{ action?: string }> | undefined;
  if (Array.isArray(secondary)) {
    const filtered = secondary.filter((s) => !s.action || !removedActionIds.has(String(s.action)));
    if (filtered.length > 0) next.secondary = filtered;
    else delete next.secondary;
  }

  return next;
}

function stripActionFromWidgetNode(node: WidgetNode, removedActionIds: Set<string>): WidgetNode {
  return {
    ...node,
    props: stripActionFromProps(node.props, removedActionIds),
    children: node.children?.map((child) => stripActionFromWidgetNode(child, removedActionIds)),
  };
}

function stripActionFromRawWidget(
  widget: Record<string, unknown>,
  removedActionIds: Set<string>,
): Record<string, unknown> {
  const { kind, children, ...rest } = widget;
  const props = stripActionFromProps(rest, removedActionIds);
  const next: Record<string, unknown> = { kind, ...props };
  if (Array.isArray(children)) {
    next.children = children.map((child) =>
      stripActionFromRawWidget(child as Record<string, unknown>, removedActionIds),
    );
  }
  return next;
}

function collectRemovedActionIds(spec: SpecState, removedHabitIds: string[]): Set<string> {
  const removedHabits = new Set(removedHabitIds);
  const removedActionIds = new Set<string>();

  for (const [actionId, action] of Object.entries(spec.actions ?? {})) {
    const habitId = habitIdFromEndpoint((action as Record<string, unknown>).endpoint);
    if (habitId && removedHabits.has(habitId)) {
      removedActionIds.add(actionId);
    }
  }

  return removedActionIds;
}

/** Remove actions targeting deleted habits and clear widget references to those actions. */
export function pruneSpecForRemovedHabits(
  spec: SpecState,
  removedHabitIds: string[],
): SpecState {
  if (removedHabitIds.length === 0) return spec;

  const removedActionIds = collectRemovedActionIds(spec, removedHabitIds);
  if (removedActionIds.size === 0) return spec;

  const nextActions: Record<string, unknown> = {};
  for (const [actionId, action] of Object.entries(spec.actions ?? {})) {
    if (!removedActionIds.has(actionId)) {
      nextActions[actionId] = action;
    }
  }

  let nextViews = spec.views;
  if (spec.views) {
    nextViews = { ...spec.views };
    for (const [viewId, view] of Object.entries(nextViews)) {
      const nextView = { ...view };
      if (nextView.onEnter && removedActionIds.has(String(nextView.onEnter))) {
        delete nextView.onEnter;
      }
      if (Array.isArray(nextView.widgets)) {
        nextView.widgets = nextView.widgets.map((widget) =>
          stripActionFromRawWidget(widget as Record<string, unknown>, removedActionIds),
        );
      }
      nextViews[viewId] = nextView;
    }
  }

  return {
    ...spec,
    actions: nextActions,
    widgets: spec.widgets.map((widget) => stripActionFromWidgetNode(widget, removedActionIds)),
    views: nextViews,
  };
}

export function pruneFrontendYamlForRemovedHabits(
  yamlText: string,
  removedHabitIds: string[],
  defaultMetaId?: string,
  defaultMetaTitle?: string,
): string {
  if (!yamlText.trim() || removedHabitIds.length === 0) return yamlText;

  const spec = parseYamlToSpecState(yamlText, defaultMetaId, defaultMetaTitle);
  if (collectRemovedActionIds(spec, removedHabitIds).size === 0) return yamlText;

  const pruned = pruneSpecForRemovedHabits(spec, removedHabitIds);
  return emitSpecStateAsYaml(pruned);
}

/** Retarget action endpoints when a habit id is renamed in Logic. */
export function renameHabitEndpointsInSpec(
  spec: SpecState,
  oldHabitId: string,
  newHabitId: string,
): SpecState {
  if (oldHabitId === newHabitId) return spec;

  const nextActions: Record<string, unknown> = { ...spec.actions };
  let changed = false;

  for (const [actionId, action] of Object.entries(nextActions)) {
    if (!action || typeof action !== 'object') continue;
    const record = action as Record<string, unknown>;
    const habitId = habitIdFromEndpoint(record.endpoint);
    if (habitId !== oldHabitId) continue;
    nextActions[actionId] = {
      ...record,
      endpoint: `/api/${newHabitId}`,
    };
    changed = true;
  }

  return changed ? { ...spec, actions: nextActions } : spec;
}

export function renameHabitInFrontendYaml(
  yamlText: string,
  oldHabitId: string,
  newHabitId: string,
  defaultMetaId?: string,
  defaultMetaTitle?: string,
): string {
  if (!yamlText.trim() || oldHabitId === newHabitId) return yamlText;

  const spec = parseYamlToSpecState(yamlText, defaultMetaId, defaultMetaTitle);
  const renamed = renameHabitEndpointsInSpec(spec, oldHabitId, newHabitId);
  if (renamed === spec) return yamlText;
  return emitSpecStateAsYaml(renamed);
}
