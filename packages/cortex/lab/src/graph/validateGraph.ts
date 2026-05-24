import { analyzeUiSpec } from './analyzeUiSpec';
import { buildHabitGraph, declaredInputFields, extractHabitsInputFields } from './buildGraph';
import { parseUiSpec } from '@ha-bits/cortex-core/ui/parseSpec';
import type {
  BuildHabitGraphInput,
  GraphIssue,
  GraphNodeStatus,
  HabitGraph,
  HabitGraphReport,
  ValidateGraphOptions,
} from './types';
import { extractHabitsEnvFields, extractNodeRefs } from './templateUtils';

function getOutputTemplateValue(v: string | { value?: string }): string {
  if (typeof v === 'string') return v;
  return v?.value ?? '';
}

function detectCycles(
  habitId: string,
  edges: Array<{ source: string; target: string }>,
): GraphIssue[] {
  const issues: GraphIssue[] = [];
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push(edge.target);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();

  const dfs = (id: string, path: string[]): void => {
    visited.add(id);
    inStack.add(id);
    for (const next of adj.get(id) || []) {
      if (!visited.has(next)) {
        dfs(next, [...path, next]);
      } else if (inStack.has(next)) {
        issues.push({
          severity: 'error',
          code: 'CIRCULAR_DEPENDENCY',
          message: `Workflow "${habitId}" has a circular dependency: ${[...path, next].join(' → ')}`,
        });
      }
    }
    inStack.delete(id);
  };

  for (const edge of edges) {
    if (!visited.has(edge.source)) dfs(edge.source, [edge.source]);
    if (!visited.has(edge.target)) dfs(edge.target, [edge.target]);
  }

  return issues;
}

function setNodeStatus(node: HabitGraph['nodes'][0], status: GraphNodeStatus, issue: GraphIssue): void {
  if (status === 'error') node.status = 'error';
  else if (status === 'warning' && node.status !== 'error') node.status = 'warning';
  else if (status === 'disconnected' && node.status === 'ok') node.status = 'disconnected';
  node.issues.push(issue);
}

function hasIncomingEdge(graph: HabitGraph, targetId: string): boolean {
  return graph.edges.some((e) => e.target === targetId);
}

export function validateHabitGraph(
  graph: HabitGraph,
  input: BuildHabitGraphInput,
  options: ValidateGraphOptions = {},
): HabitGraphReport {
  const issues: GraphIssue[] = [];
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const edgeList = graph.edges;

  let uiSpec = input.uiSpec ?? null;
  if (!uiSpec && input.uiSpecYaml) {
    try {
      uiSpec = parseUiSpec(input.uiSpecYaml);
    } catch (e) {
      issues.push({
        severity: 'error',
        code: 'INVALID_UI_SPEC',
        message: `Failed to parse index.yaml: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  const envKeys = new Set((input.envKeys ?? []).map((k) => k.toUpperCase()));
  const workflowIdSet = new Set(input.workflowIds.length ? input.workflowIds : input.habits.map((h) => h.id));
  const habitById = new Map(input.habits.map((h) => [h.id, h]));
  const actionsCalledWorkflows = new Set<string>();

  if (uiSpec) {
    const ui = analyzeUiSpec(uiSpec);

    for (const ref of ui.unknownActionRefs) {
      const issue: GraphIssue = {
        severity: 'error',
        code: 'UNKNOWN_ACTION',
        message: `Widget references unknown action "${ref}"`,
        nodeId: `action:${ref}`,
        suggestion: `Add action "${ref}" to index.yaml actions section`,
      };
      issues.push(issue);
      const actNode = nodeMap.get(`action:${ref}`);
      if (actNode) setNodeStatus(actNode, 'error', issue);
    }

    for (const action of ui.actions) {
      const actNode = nodeMap.get(`action:${action.actionId}`);

      if (!action.workflowId) {
        const issue: GraphIssue = {
          severity: 'error',
          code: 'UNKNOWN_WORKFLOW',
          message: `Action "${action.actionId}" has no resolvable workflow endpoint`,
          nodeId: actNode?.id,
          suggestion: 'Set endpoint: /api/{workflow-id} matching stack.yaml',
        };
        issues.push(issue);
        if (actNode) setNodeStatus(actNode, 'error', issue);
      } else if (!workflowIdSet.has(action.workflowId)) {
        const issue: GraphIssue = {
          severity: 'error',
          code: 'UNKNOWN_WORKFLOW',
          message: `Action "${action.actionId}" calls /api/${action.workflowId} but no such workflow in stack`,
          nodeId: actNode?.id,
          suggestion: `Add workflow id "${action.workflowId}" to stack.yaml`,
        };
        issues.push(issue);
        if (actNode) setNodeStatus(actNode, 'error', issue);
      } else {
        actionsCalledWorkflows.add(action.workflowId);
      }

      for (const [bodyKey, stateRefs] of Object.entries(action.bodyStateRefs)) {
        for (const ref of stateRefs) {
          if (!ui.stateKeys.has(ref)) {
            const issue: GraphIssue = {
              severity: 'error',
              code: 'MISSING_STATE_KEY',
              message: `Action "${action.actionId}" body key "${bodyKey}" references state.${ref} which is not declared in state`,
              nodeId: actNode?.id,
              suggestion: `Add "${ref}" to state: in index.yaml`,
            };
            issues.push(issue);
            if (actNode) setNodeStatus(actNode, 'error', issue);
          }
        }
      }
    }

    for (const field of ui.formFields) {
      const formNode = nodeMap.get(`form:${field.name}`);
      if (field.submitAction && !ui.actionRefs.has(field.submitAction)) continue;
      const sentByAction = ui.actions.some((a) => a.bodyKeys.includes(field.name));
      if (!sentByAction && formNode) {
        const issue: GraphIssue = {
          severity: 'warning',
          code: 'UNBOUND_FORM_FIELD',
          message: `Form field "${field.name}" is not sent by any action body`,
          nodeId: formNode.id,
        };
        issues.push(issue);
        setNodeStatus(formNode, 'warning', issue);
      }
    }
  }

  for (const habit of input.habits) {
    const consumedInputs = extractHabitsInputFields({ nodes: habit.nodes, output: habit.output });
    const declared = new Set(declaredInputFields(habit));

    for (const field of consumedInputs) {
      const inputNodeId = `input:${habit.id}:${field}`;
      const inputNode = nodeMap.get(inputNodeId);
      if (!hasIncomingEdge(graph, inputNodeId)) {
        const issue: GraphIssue = {
          severity: 'error',
          code: 'DISCONNECTED_INPUT',
          message: `Workflow "${habit.id}" expects habits.input.${field} but no UI action sends it`,
          nodeId: inputNodeId,
          suggestion: `Add "${field}" to an action body in index.yaml`,
        };
        issues.push(issue);
        if (inputNode) setNodeStatus(inputNode, 'disconnected', issue);
      }
      if (declared.size > 0 && !declared.has(field)) {
        const issue: GraphIssue = {
          severity: 'warning',
          code: 'UNDECLARED_INPUT',
          message: `Workflow "${habit.id}" uses habits.input.${field} but it is not declared in habit input schema`,
          nodeId: inputNodeId,
        };
        issues.push(issue);
        if (inputNode) setNodeStatus(inputNode, 'warning', issue);
      }
    }

    const envUsed = extractHabitsEnvFields({ nodes: habit.nodes, output: habit.output });
    for (const envVar of envUsed) {
      const envNodeId = `env:${envVar}`;
      const envNode = nodeMap.get(envNodeId);
      if (envKeys.size > 0 && !envKeys.has(envVar)) {
        const issue: GraphIssue = {
          severity: 'error',
          code: 'MISSING_ENV',
          message: `Workflow "${habit.id}" references env.${envVar} but it is not in .env`,
          nodeId: envNodeId,
          suggestion: `Add ${envVar}=... to .env`,
        };
        issues.push(issue);
        if (envNode) setNodeStatus(envNode, 'error', issue);
      }
    }

    const nodeIds = new Set(habit.nodes.map((n) => n.id));
    const edgePairs = new Set(habit.edges.map((e) => `${e.source}→${e.target}`));

    for (const edge of habit.edges) {
      if (!nodeIds.has(edge.source)) {
        issues.push({
          severity: 'error',
          code: 'BROKEN_EDGE',
          message: `Workflow "${habit.id}" edge source "${edge.source}" does not exist`,
        });
      }
      if (!nodeIds.has(edge.target)) {
        issues.push({
          severity: 'error',
          code: 'BROKEN_EDGE',
          message: `Workflow "${habit.id}" edge target "${edge.target}" does not exist`,
        });
      }
    }

    issues.push(...detectCycles(habit.id, habit.edges));

    for (const node of habit.nodes) {
      const refs = extractNodeRefs(node.data?.params ?? {});
      for (const ref of refs) {
        if (!nodeIds.has(ref.nodeId)) {
          issues.push({
            severity: 'error',
            code: 'BROKEN_NODE_REF',
            message: `Node "${node.id}" references "${ref.nodeId}" which does not exist`,
            nodeId: `node:${habit.id}:${node.id}`,
            suggestion: `Add node "${ref.nodeId}" or fix the template in ${node.id}.params`,
          });
          continue;
        }
        if (!edgePairs.has(`${ref.nodeId}→${node.id}`)) {
          issues.push({
            severity: 'warning',
            code: 'MISSING_EDGE_FOR_REF',
            message: `Node "${node.id}" uses {{${ref.nodeId}${ref.property ? `.${ref.property}` : ''}}} but no edge from "${ref.nodeId}" → "${node.id}"`,
            nodeId: `node:${habit.id}:${node.id}`,
            suggestion: `Add edge: source ${ref.nodeId}, target ${node.id}`,
          });
        }
      }
    }

    if (habit.output) {
      for (const [field, tmpl] of Object.entries(habit.output)) {
        for (const ref of extractNodeRefs(getOutputTemplateValue(tmpl))) {
          if (!nodeIds.has(ref.nodeId)) {
            issues.push({
              severity: 'error',
              code: 'BROKEN_NODE_REF',
              message: `Output "${field}" references "${ref.nodeId}" which does not exist`,
              nodeId: `output:${habit.id}:${field}`,
            });
          }
        }
      }
    }

    if (!actionsCalledWorkflows.has(habit.id) && uiSpec) {
      const wfNode = nodeMap.get(`workflow:${habit.id}`);
      const issue: GraphIssue = {
        severity: 'warning',
        code: 'ORPHAN_WORKFLOW',
        message: `Workflow "${habit.id}" is in stack but no UI action calls it`,
        nodeId: wfNode?.id,
      };
      issues.push(issue);
      if (wfNode) setNodeStatus(wfNode, 'warning', issue);
    }
  }

  if (uiSpec) {
    const ui = analyzeUiSpec(uiSpec);
    for (const action of ui.actions) {
      if (!action.workflowId || !habitById.has(action.workflowId)) continue;
      const habit = habitById.get(action.workflowId)!;
      const consumed = extractHabitsInputFields({ nodes: habit.nodes, output: habit.output });
      for (const bodyKey of action.bodyKeys) {
        if (consumed.size > 0 && !consumed.has(bodyKey)) {
          const issue: GraphIssue = {
            severity: 'warning',
            code: 'EXTRA_BODY_FIELD',
            message: `Action "${action.actionId}" sends "${bodyKey}" but workflow "${action.workflowId}" does not use habits.input.${bodyKey}`,
          };
          issues.push(issue);
        }
      }
    }
  }

  for (const node of graph.nodes) {
    if (node.layer === 'source' && node.id.startsWith('input:') && !hasIncomingEdge(graph, node.id)) {
      if (node.status === 'ok') {
        const issue: GraphIssue = {
          severity: 'error',
          code: 'DISCONNECTED_INPUT',
          message: `${node.label} has no connection from UI`,
          nodeId: node.id,
        };
        issues.push(issue);
        setNodeStatus(node, 'disconnected', issue);
      }
    }
    if (node.layer === 'response' && !hasIncomingEdge(graph, node.id) && node.status === 'ok') {
      const stateKey = node.meta?.stateKey ?? '';
      const issue: GraphIssue = {
        severity: 'warning',
        code: 'OUTPUT_NOT_CONSUMED',
        message: `UI state "${stateKey || node.label}" is not connected to workflow output`,
        nodeId: node.id,
      };
      issues.push(issue);
      setNodeStatus(node, 'warning', issue);
    }
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const ok = options.strict ? issues.length === 0 : errors.length === 0;

  return {
    ok,
    graph: { nodes: Array.from(nodeMap.values()), edges: edgeList },
    issues,
    errors,
    warnings,
    summary: {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      errorCount: errors.length,
      warningCount: warnings.length,
    },
  };
}

export function buildAndValidateHabitGraph(
  input: BuildHabitGraphInput,
  options?: ValidateGraphOptions,
): HabitGraphReport {
  const graph = buildHabitGraph(input);
  return validateHabitGraph(graph, input, options);
}
