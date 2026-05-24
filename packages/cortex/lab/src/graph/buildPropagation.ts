import type { HabitGraph, HabitGraphNode, GraphNodeStatus } from './types';

export interface PropagationDisplayNode {
  id: string;
  logicalId: string;
  label: string;
  layer: HabitGraphNode['layer'];
  column: number;
  status: GraphNodeStatus;
  meta?: Record<string, string>;
}

export interface PropagationDisplayEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  column: number;
  status: GraphNodeStatus;
}

export type PropagationStep =
  | { kind: 'nodes'; column: number; nodes: PropagationDisplayNode[] }
  | { kind: 'edges'; column: number; edges: PropagationDisplayEdge[]; ghostTargets: PropagationDisplayNode[] };

function makeDisplay(node: HabitGraphNode, column: number): PropagationDisplayNode {
  return {
    id: node.id,
    logicalId: node.id,
    label: node.label,
    layer: node.layer,
    column,
    status: node.status,
    meta: node.meta,
  };
}

function maxNodeColumn(displayByLogical: Map<string, PropagationDisplayNode>): number {
  return Math.max(0, ...Array.from(displayByLogical.values()).map((n) => n.column));
}

/**
 * Build a left-to-right propagation timeline:
 * nodes (col 0) → edges → nodes → edges → …
 * Each logical node appears once; edges may connect back to earlier nodes.
 */
export function buildPropagationSteps(graph: HabitGraph): PropagationStep[] {
  const steps: PropagationStep[] = [];
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const processed = new Set<string>();
  const displayByLogical = new Map<string, PropagationDisplayNode>();
  const visible = new Set<string>();

  const sourceNodes = graph.nodes.filter((n) => n.layer === 'source');
  if (sourceNodes.length === 0) return steps;

  const initial = sourceNodes.map((n) => makeDisplay(n, 0));
  steps.push({ kind: 'nodes', column: 0, nodes: initial });
  for (const n of initial) {
    displayByLogical.set(n.logicalId, n);
    visible.add(n.logicalId);
  }

  const runBatch = (): boolean => {
    const batch = graph.edges.filter((e) => !processed.has(e.id) && visible.has(e.source));
    if (batch.length === 0) return false;

    const edgeCol = maxNodeColumn(displayByLogical) + 1;
    const newNodeCol = maxNodeColumn(displayByLogical) + 2;
    const edgeBatch: PropagationDisplayEdge[] = [];
    const newNodes: PropagationDisplayNode[] = [];

    for (const edge of batch) {
      const src = displayByLogical.get(edge.source);
      const tgtNode = nodeById.get(edge.target);
      if (!src || !tgtNode) {
        processed.add(edge.id);
        continue;
      }

      if (!displayByLogical.has(edge.target)) {
        const tgt = makeDisplay(tgtNode, newNodeCol);
        displayByLogical.set(edge.target, tgt);
        newNodes.push(tgt);
      }

      const tgt = displayByLogical.get(edge.target)!;
      edgeBatch.push({
        id: `${edge.id}@s${steps.length}`,
        source: src.id,
        target: tgt.id,
        label: edge.label,
        column: edgeCol,
        status: edge.status,
      });
      processed.add(edge.id);
      visible.add(edge.target);
    }

    if (edgeBatch.length === 0) return false;

    steps.push({ kind: 'edges', column: edgeCol, edges: edgeBatch, ghostTargets: newNodes });
    if (newNodes.length > 0) {
      steps.push({ kind: 'nodes', column: newNodeCol, nodes: newNodes });
    }
    return true;
  };

  while (runBatch()) {
    /* next wave */
  }

  let remaining = graph.edges.filter((e) => !processed.has(e.id));
  while (remaining.length > 0) {
    const stuckBefore = remaining.length;

    for (const edge of remaining) {
      if (visible.has(edge.source) || displayByLogical.has(edge.source)) continue;
      const srcNode = nodeById.get(edge.source);
      if (!srcNode) {
        processed.add(edge.id);
        continue;
      }
      const col = maxNodeColumn(displayByLogical) + 2;
      const d = makeDisplay(srcNode, col);
      displayByLogical.set(edge.source, d);
      visible.add(edge.source);
      steps.push({ kind: 'nodes', column: col, nodes: [d] });
    }

    if (!runBatch()) {
      remaining = graph.edges.filter((e) => !processed.has(e.id));
      if (remaining.length === stuckBefore) break;
    }
    remaining = graph.edges.filter((e) => !processed.has(e.id));
  }

  return steps;
}

export function describePropagationStep(step: PropagationStep, index: number): string {
  if (step.kind === 'nodes') {
    return `Step ${index + 1}: show ${step.nodes.length} node(s) at column ${step.column}`;
  }
  return `Step ${index + 1}: show ${step.edges.length} edge(s) at column ${step.column}`;
}
