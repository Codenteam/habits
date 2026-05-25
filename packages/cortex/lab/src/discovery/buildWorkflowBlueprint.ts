import {
  extractHabitsEnvFields,
  extractHabitsInputFields,
} from '../graph';
import type { GraphHabitInput } from '../graph';
import type {
  DataFlowInputFieldBlueprint,
  DataFlowNodeBlueprint,
  DataFlowWorkflowBlueprint,
} from './blueprintTypes';

export const DISCOVER_PLACEHOLDER_PREFIX = '[discover:';

export function discoverNodeOutputPlaceholder(nodeId: string): string {
  return `${DISCOVER_PLACEHOLDER_PREFIX}${nodeId}]`;
}

function cloneTemplateObject(value: unknown): unknown {
  if (typeof value === 'string' || value === null || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(cloneTemplateObject);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, cloneTemplateObject(v)]),
    );
  }
  return value;
}

function getOutputEntryValue(v: string | { value?: string; [key: string]: unknown }): unknown {
  if (typeof v === 'string') return v;
  return cloneTemplateObject(v);
}

export function orderWorkflowNodes(habit: GraphHabitInput): GraphHabitInput['nodes'] {
  const nodes = habit.nodes || [];
  if (!habit.edges?.length || nodes.length <= 1) {
    return nodes;
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  const orderIndex = new Map(nodes.map((n, i) => [n.id, i]));

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }

  for (const edge of habit.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    adj.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue = [...nodeIds]
    .filter((id) => inDegree.get(id) === 0)
    .sort((a, b) => orderIndex.get(a)! - orderIndex.get(b)!);

  const ordered: GraphHabitInput['nodes'] = [];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = nodes.find((n) => n.id === id);
    if (node) ordered.push(node);

    for (const next of adj.get(id) ?? []) {
      const degree = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, degree);
      if (degree === 0) {
        queue.push(next);
        queue.sort((a, b) => orderIndex.get(a)! - orderIndex.get(b)!);
      }
    }
  }

  for (const node of nodes) {
    if (!seen.has(node.id)) ordered.push(node);
  }

  return ordered;
}

export function buildHabitInputBlueprint(
  habit: GraphHabitInput,
): Record<string, DataFlowInputFieldBlueprint> {
  const result: Record<string, DataFlowInputFieldBlueprint> = {};

  for (const field of habit.input || []) {
    const name = field.name ?? field.id;
    if (!name) continue;
    result[name] = {
      type: field.type as string | undefined,
      required: field.required as boolean | undefined,
      default: (field as { default?: unknown }).default,
      label: field.label as string | undefined,
      description: field.description as string | undefined,
      displayAs: field.displayAs as string | undefined,
    };
  }

  const referenced = extractHabitsInputFields({ nodes: habit.nodes, output: habit.output });
  for (const name of referenced) {
    if (!result[name]) {
      result[name] = { type: 'unknown', required: false };
    }
  }

  return result;
}

export function buildEnvBlueprint(habit: GraphHabitInput): Record<string, string> | undefined {
  const keys = extractHabitsEnvFields({ nodes: habit.nodes, output: habit.output });
  if (keys.size === 0) return undefined;

  const env: Record<string, string> = {};
  for (const key of keys) {
    env[key] = `{{habits.env.${key}}}`;
  }
  return env;
}

export function buildNodeBlueprint(node: GraphHabitInput['nodes'][0]): DataFlowNodeBlueprint {
  const data = node.data ?? {};
  const params = (data.params ?? {}) as Record<string, unknown>;
  const operation =
    (typeof data.operation === 'string' ? data.operation : undefined) ??
    (typeof params.operation === 'string' ? params.operation : undefined);

  const input = cloneTemplateObject(params) as Record<string, unknown>;
  if (operation && input.operation === undefined) {
    input.operation = operation;
  }

  return {
    nodeId: node.id,
    framework: typeof data.framework === 'string' ? data.framework : 'bits',
    module: typeof data.module === 'string' ? data.module : undefined,
    operation,
    input,
    output: discoverNodeOutputPlaceholder(node.id),
  };
}

export function buildWorkflowOutputBlueprint(
  output: GraphHabitInput['output'],
): Record<string, unknown> {
  if (!output) return {};

  const result: Record<string, unknown> = {};
  for (const [field, tmpl] of Object.entries(output)) {
    result[field] = getOutputEntryValue(tmpl as string | { value?: string });
  }
  return result;
}

export function buildWorkflowBlueprint(habit: GraphHabitInput): DataFlowWorkflowBlueprint {
  const orderedNodes = orderWorkflowNodes(habit);

  return {
    workflowName: habit.name || habit.id,
    habitInput: buildHabitInputBlueprint(habit),
    env: buildEnvBlueprint(habit),
    executionOrder: orderedNodes.map((n) => n.id),
    nodes: orderedNodes.map(buildNodeBlueprint),
    workflowOutput: buildWorkflowOutputBlueprint(habit.output),
  };
}
