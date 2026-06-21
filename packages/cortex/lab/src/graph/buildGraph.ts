import { parseUiSpec } from '@ha-bits/cortex-core/ui/parseSpec';
import { analyzeUiSpec } from './analyzeUiSpec';
import type {
  BuildHabitGraphInput,
  GraphHabitInput,
  GraphLayer,
  HabitGraph,
  HabitGraphEdge,
  HabitGraphNode,
} from './types';
import {
  extractHabitsEnvFields,
  extractHabitsInputFields,
  extractNodeRefs,
  normalizeStatePath,
} from './templateUtils';

const LAYER_INDEX: Record<GraphLayer, number> = {
  source: 0,
  state: 1,
  ui: 2,
  workflow: 3,
  output: 4,
  response: 5,
};

function mkNode(
  id: string,
  label: string,
  layer: GraphLayer,
  meta?: Record<string, string>,
): HabitGraphNode {
  return {
    id,
    label,
    layer,
    layerIndex: LAYER_INDEX[layer],
    status: 'ok',
    issues: [],
    meta,
  };
}

function addEdge(edges: HabitGraphEdge[], source: string, target: string, label?: string): void {
  const suffix = label ? `:${label}` : '';
  let id = `${source}→${target}${suffix}`;
  let n = 0;
  while (edges.some((e) => e.id === id)) {
    n += 1;
    id = `${source}→${target}${suffix}#${n}`;
  }
  edges.push({ id, source, target, label, status: 'ok', issues: [] });
}

function linkResponseToState(
  edges: HabitGraphEdge[],
  nodes: Map<string, HabitGraphNode>,
  stateKey: string,
  label = 'set state',
): void {
  const stateId = `state:${stateKey}`;
  const respId = `response:${stateKey}`;
  if (nodes.has(stateId) && nodes.has(respId)) {
    addEdge(edges, respId, stateId, label);
  }
}

function getOutputValue(v: string | { value?: string }): string {
  if (typeof v === 'string') return v;
  return v?.value ?? '';
}

function declaredInputFields(habit: GraphHabitInput): string[] {
  if (!habit.input?.length) return [];
  return habit.input.map((f) => f.name ?? f.id ?? '').filter(Boolean);
}

function addHabitWorkflowNodes(
  habit: GraphHabitInput,
  nodes: Map<string, HabitGraphNode>,
  edges: HabitGraphEdge[],
): void {
  const wfId = `workflow:${habit.id}`;
  nodes.set(wfId, mkNode(wfId, habit.name || habit.id, 'workflow', { workflowId: habit.id }));

  const inputFields = extractHabitsInputFields({ nodes: habit.nodes, output: habit.output });
  for (const field of inputFields) {
    const id = `input:${habit.id}:${field}`;
    if (!nodes.has(id)) {
      nodes.set(id, mkNode(id, `input.${field}`, 'source', { workflowId: habit.id, field }));
    }
    addEdge(edges, id, wfId, 'consumes');
  }

  const envFields = extractHabitsEnvFields({ nodes: habit.nodes, output: habit.output });
  for (const envVar of envFields) {
    const id = `env:${envVar}`;
    if (!nodes.has(id)) {
      nodes.set(id, mkNode(id, `env.${envVar}`, 'source', { envVar }));
    }
    addEdge(edges, id, wfId, 'env');
  }

  for (const node of habit.nodes) {
    const nodeId = `node:${habit.id}:${node.id}`;
    nodes.set(
      nodeId,
      mkNode(nodeId, node.data?.label ?? node.id, 'workflow', { workflowId: habit.id, nodeId: node.id }),
    );
    addEdge(edges, wfId, nodeId);

    const nodeRefs = extractNodeRefs(node.data?.params ?? {});
    for (const ref of nodeRefs) {
      const upstreamId = `node:${habit.id}:${ref.nodeId}`;
      if (nodes.has(upstreamId)) {
        addEdge(edges, upstreamId, nodeId, ref.property ?? 'output');
      }
    }
  }

  for (const edge of habit.edges) {
    const src = `node:${habit.id}:${edge.source}`;
    const tgt = `node:${habit.id}:${edge.target}`;
    if (nodes.has(src) && nodes.has(tgt) && !edges.some((e) => e.source === src && e.target === tgt)) {
      addEdge(edges, src, tgt, 'edge');
    }
  }

  if (habit.output) {
    for (const [field, tmpl] of Object.entries(habit.output)) {
      const outId = `output:${habit.id}:${field}`;
      nodes.set(outId, mkNode(outId, `output.${field}`, 'output', { workflowId: habit.id, field }));
      addEdge(edges, wfId, outId);

      const refs = extractNodeRefs(getOutputValue(tmpl));
      for (const ref of refs) {
        const srcId = `node:${habit.id}:${ref.nodeId}`;
        if (nodes.has(srcId)) addEdge(edges, srcId, outId, ref.property ?? 'output');
      }
    }
  }
}

export function buildHabitGraph(input: BuildHabitGraphInput): HabitGraph {
  const nodes = new Map<string, HabitGraphNode>();
  const edges: HabitGraphEdge[] = [];

  let uiSpec = input.uiSpec ?? null;
  if (!uiSpec && input.uiSpecYaml) {
    try {
      uiSpec = parseUiSpec(input.uiSpecYaml);
    } catch {
      uiSpec = null;
    }
  }

  const habitById = new Map(input.habits.map((h) => [h.id, h]));
  for (const habit of input.habits) {
    addHabitWorkflowNodes(habit, nodes, edges);
  }

  if (uiSpec) {
    const ui = analyzeUiSpec(uiSpec);

    for (const key of ui.stateKeys) {
      const id = `state:${key}`;
      nodes.set(id, mkNode(id, `state.${key}`, 'state', { stateKey: key }));
    }

    for (const field of ui.formFields) {
      const formId = `form:${field.name}`;
      if (!nodes.has(formId)) {
        nodes.set(formId, mkNode(formId, field.name, 'ui', { field: field.name }));
      }
      const stateId = `state:${field.name}`;
      if (nodes.has(stateId)) {
        addEdge(edges, formId, stateId, 'bind');
      }
    }

    for (const action of ui.actions) {
      const actId = `action:${action.actionId}`;
      nodes.set(actId, mkNode(actId, action.actionId, 'ui', { actionId: action.actionId }));

      if (action.workflowId) {
        const wfId = `workflow:${action.workflowId}`;
        if (nodes.has(wfId)) {
          addEdge(edges, actId, wfId, 'POST');
        }
      }

      for (const [bodyKey, stateRefs] of Object.entries(action.bodyStateRefs)) {
        for (const ref of stateRefs) {
          const stateId = `state:${ref}`;
          if (nodes.has(stateId)) addEdge(edges, stateId, actId, bodyKey);
        }
        if (action.workflowId) {
          const inputId = `input:${action.workflowId}:${bodyKey}`;
          if (nodes.has(inputId)) {
            addEdge(edges, actId, inputId, bodyKey);
          }
        }
      }

      for (const bodyKey of action.bodyKeys) {
        if (action.workflowId) {
          const inputId = `input:${action.workflowId}:${bodyKey}`;
          if (nodes.has(inputId) && !edges.some((e) => e.source === actId && e.target === inputId)) {
            addEdge(edges, actId, inputId, bodyKey);
          }
        }
      }

      for (const queryKey of action.queryKeys) {
        if (action.workflowId) {
          const inputId = `input:${action.workflowId}:${queryKey}`;
          if (nodes.has(inputId) && !edges.some((e) => e.source === actId && e.target === inputId)) {
            addEdge(edges, actId, inputId, `query:${queryKey}`);
          }
        }
      }

      if (action.workflowId && habitById.has(action.workflowId)) {
        const habit = habitById.get(action.workflowId)!;
        for (const sk of action.onSuccessResponseTargets) {
          const respId = `response:${sk}`;
          if (!nodes.has(respId)) {
            nodes.set(respId, mkNode(respId, `state.${sk}`, 'response', { stateKey: sk }));
          }
          if (habit.output) {
            for (const field of Object.keys(habit.output)) {
              const outId = `output:${action.workflowId}:${field}`;
              if (nodes.has(outId)) addEdge(edges, outId, respId, action.responsePath);
            }
          }
          addEdge(edges, `workflow:${action.workflowId}`, respId, 'response');
          linkResponseToState(edges, nodes, sk);
        }
        for (const stateKey of action.onSuccessStateKeys) {
          const respId = `response:${stateKey}`;
          if (!nodes.has(respId)) {
            nodes.set(respId, mkNode(respId, `state.${stateKey}`, 'response', { stateKey }));
          }
          if (habit.output) {
            for (const field of Object.keys(habit.output)) {
              const outId = `output:${action.workflowId}:${field}`;
              if (nodes.has(outId)) addEdge(edges, outId, respId, action.responsePath);
            }
          }
          linkResponseToState(edges, nodes, stateKey);
        }
      }
    }

    for (const field of ui.formFields) {
      if (!field.submitAction) continue;
      const formId = `form:${field.name}`;
      const actId = `action:${field.submitAction}`;
      if (nodes.has(formId) && nodes.has(actId)) {
        addEdge(edges, formId, actId, 'submit');
      }
    }

    for (const src of ui.resultPanelSources) {
      const stateKey = normalizeStatePath(src);
      const respId = `response:${stateKey}`;
      const stateId = `state:${stateKey}`;
      if (!nodes.has(respId)) {
        nodes.set(respId, mkNode(respId, src, 'response', { stateKey }));
      }
      if (nodes.has(stateId)) {
        addEdge(edges, stateId, respId, 'display');
      }
    }
  }

  return { nodes: Array.from(nodes.values()), edges };
}

export { declaredInputFields, extractHabitsInputFields };
