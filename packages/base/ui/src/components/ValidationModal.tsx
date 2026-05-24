import { useMemo, useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  GitBranch,
  ListChecks,
  LayoutList,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Waypoints,
  Loader2,
} from 'lucide-react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { validateHabit, type ValidatableHabit } from '../store/validation/habitValidation';
import type { HabitGraphReport, HabitGraphNode } from '@ha-bits/cortex-lab/graph';
import {
  buildEditorGraphInput,
  buildPropagationSteps,
  describePropagationStep,
  type PropagationStep,
  type PropagationDisplayNode,
  type PropagationDisplayEdge,
} from '@ha-bits/cortex-lab/graph';
import type { UnifiedValidationIssue } from '../store/selectors/validationSelectors';
import { api } from '../lib/api';

interface LabDryRunItem {
  workflowId: string;
  workflowName: string;
  report: {
    status: string;
    simulatedOutput?: Record<string, unknown> | null;
    errors?: Array<{ code: string; message: string }>;
    warnings?: Array<{ code: string; message: string }>;
    checks?: { dataFlow?: Array<{ nodeId: string; accessedFields?: string[] }> };
  };
}

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  habits: ValidatableHabit[];
  graphReport: HabitGraphReport;
  allIssues: UnifiedValidationIssue[];
  frontendYaml?: string;
  envContent?: string;
}

type ValidationTab = 'overview' | 'habits' | 'graph' | 'dataflow';

const allValidationChecks = [
  { id: 'missing_name', name: 'Habit Name', description: 'Habit should have a meaningful name' },
  { id: 'missing_nodes', name: 'Workflow Nodes', description: 'Habit should contain at least one node' },
  { id: 'missing_output', name: 'Output Mappings', description: 'Habit should define output mappings' },
  {
    id: 'missing_input_params',
    name: 'Input Parameters',
    description: 'Habit should use input parameters ({{habits.input.*}})',
  },
];

const PROP_COLUMN_WIDTH = 220;
const NODE_HEIGHT = 64;

function edgeColor(label: string | undefined, status: HabitGraphNode['status']): string {
  if (status === 'error') return '#ef4444';
  if (status === 'warning') return '#eab308';
  switch (label) {
    case 'env':
      return '#a78bfa';
    case 'consumes':
    case 'bind':
      return '#34d399';
    case 'POST':
    case 'submit':
      return '#60a5fa';
    case 'display':
    case 'set state':
    case 'response':
    case 'output':
      return '#fbbf24';
    default:
      return '#94a3b8';
  }
}

function GraphNode({
  data,
}: {
  data: {
    label: string;
    status: HabitGraphNode['status'];
    layer: string;
    pending?: boolean;
  };
}) {
  return (
    <div
      style={{
        border: `2px solid ${data.pending ? '#475569' : statusColor(data.status)}`,
        background: data.pending ? 'rgba(30,41,59,0.5)' : statusBg(data.status),
        borderRadius: 8,
        padding: '8px 12px',
        minWidth: 160,
        maxWidth: 220,
        color: '#f8fafc',
        fontSize: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
        position: 'relative',
        opacity: data.pending ? 0.35 : 1,
        borderStyle: data.pending ? 'dashed' : 'solid',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: 8, height: 8, background: '#64748b', border: '2px solid #1e293b' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ width: 8, height: 8, background: '#64748b', border: '2px solid #1e293b' }}
      />
      <div style={{ fontSize: 10, opacity: 0.65, marginBottom: 2 }}>{data.layer}</div>
      <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>{data.label}</div>
    </div>
  );
}
function statusColor(status: HabitGraphNode['status']): string {
  switch (status) {
    case 'error':
      return '#ef4444';
    case 'warning':
      return '#eab308';
    case 'disconnected':
      return '#6b7280';
    default:
      return '#22c55e';
  }
}

function statusBg(status: HabitGraphNode['status']): string {
  switch (status) {
    case 'error':
      return 'rgba(127,29,29,0.85)';
    case 'warning':
      return 'rgba(113,63,18,0.85)';
    case 'disconnected':
      return 'rgba(55,65,81,0.85)';
    default:
      return 'rgba(20,83,45,0.85)';
  }
}

const nodeTypes = { graphNode: GraphNode };

const LAYER_DISPLAY: Record<string, string> = {
  source: 'Sources',
  state: 'State',
  ui: 'UI',
  workflow: 'Workflows',
  output: 'Output',
  response: 'Response',
};

type VisiblePropagationNode = PropagationDisplayNode & { pending: boolean };

function getVisiblePropagation(
  steps: PropagationStep[],
  stepIndex: number,
): { nodes: VisiblePropagationNode[]; edges: PropagationDisplayEdge[] } {
  if (stepIndex < 0) return { nodes: [], edges: [] };

  const nodesMap = new Map<string, VisiblePropagationNode>();
  const edges: PropagationDisplayEdge[] = [];

  for (let i = 0; i <= stepIndex && i < steps.length; i++) {
    const step = steps[i];
    if (step.kind === 'nodes') {
      for (const n of step.nodes) {
        nodesMap.set(n.id, { ...n, pending: false });
      }
    } else {
      edges.push(...step.edges);
      for (const g of step.ghostTargets) {
        if (!nodesMap.has(g.id)) {
          nodesMap.set(g.id, { ...g, pending: true });
        }
      }
    }
  }

  return { nodes: Array.from(nodesMap.values()), edges };
}

function layoutPropagationNodes(nodes: VisiblePropagationNode[]): Node[] {
  const byColumn = new Map<number, VisiblePropagationNode[]>();
  for (const n of nodes) {
    const list = byColumn.get(n.column) ?? [];
    list.push(n);
    byColumn.set(n.column, list);
  }

  const result: Node[] = [];
  for (const [column, colNodes] of byColumn.entries()) {
    colNodes.forEach((n, i) => {
      result.push({
        id: n.id,
        type: 'graphNode',
        position: { x: column * PROP_COLUMN_WIDTH + 24, y: i * (NODE_HEIGHT + 20) + 48 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          label: n.label,
          status: n.status,
          layer: LAYER_DISPLAY[n.layer] ?? n.layer,
          pending: n.pending,
        },
      });
    });
  }
  return result;
}

function toPropagationFlowEdge(e: PropagationDisplayEdge): Edge {
  const color = edgeColor(e.label, e.status);
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'default',
    label: e.label,
    animated: true,
    style: { stroke: color, strokeWidth: 2 },
    labelStyle: { fill: '#e2e8f0', fontSize: 10, fontWeight: 500 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.85 },
    labelBgPadding: [4, 6] as [number, number],
    labelBgBorderRadius: 4,
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
  };
}

function IssueBadge({ severity }: { severity: 'error' | 'warning' }) {
  return (
    <span
      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
        severity === 'error' ? 'bg-red-900/50 text-red-300' : 'bg-yellow-900/50 text-yellow-300'
      }`}
    >
      {severity}
    </span>
  );
}

function UnifiedIssueRow({ issue }: { issue: UnifiedValidationIssue }) {
  return (
    <div
      className={`text-xs p-2 rounded border ${
        issue.severity === 'error'
          ? 'bg-red-950/40 border-red-800/50 text-red-200'
          : 'bg-yellow-950/30 border-yellow-800/40 text-yellow-200'
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[10px] opacity-70">{issue.code}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400">
          {issue.source === 'habit' ? 'Habit' : 'Connection'}
        </span>
        <IssueBadge severity={issue.severity} />
      </div>
      {issue.habitName && (
        <div className="text-[10px] text-slate-400 mt-0.5">
          {issue.habitName}
          {issue.habitId ? ` (${issue.habitId})` : ''}
        </div>
      )}
      <div className="mt-0.5">{issue.message}</div>
      {issue.suggestion && <div className="mt-1 text-slate-400">→ {issue.suggestion}</div>}
    </div>
  );
}

function ConnectionGraphCanvas({
  flowNodes,
  flowEdges,
}: {
  flowNodes: Node[];
  flowEdges: Edge[];
}) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const timer = window.setTimeout(() => fitView({ padding: 0.3, duration: 250 }), 80);
    return () => window.clearTimeout(timer);
  }, [flowNodes, flowEdges, fitView]);

  return (
    <ReactFlow
      className="bg-slate-950"
      nodes={flowNodes}
      edges={flowEdges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{ type: 'default' }}
    >
      <Background color="#334155" gap={20} />
      <Controls className="!bg-slate-800 !border-slate-600" />
      <MiniMap
        nodeColor={(n) =>
          (n.data as { pending?: boolean }).pending ? '#475569' : statusColor('ok')
        }
        maskColor="rgba(0,0,0,0.6)"
      />
    </ReactFlow>
  );
}

function ConnectionGraphPanel({ report }: { report: HabitGraphReport }) {
  const steps = useMemo(() => buildPropagationSteps(report.graph), [report.graph]);
  const [stepIndex, setStepIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setStepIndex(-1);
    setPlaying(false);
  }, [steps]);

  useEffect(() => {
    if (!playing || steps.length === 0) return;
    if (stepIndex >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setStepIndex((s) => s + 1), 850);
    return () => window.clearTimeout(timer);
  }, [playing, stepIndex, steps.length]);

  const { nodes: visibleNodes, edges: visibleEdges } = useMemo(
    () => getVisiblePropagation(steps, stepIndex),
    [steps, stepIndex],
  );

  const flowNodes = useMemo(() => layoutPropagationNodes(visibleNodes), [visibleNodes]);
  const flowEdges = useMemo(() => visibleEdges.map(toPropagationFlowEdge), [visibleEdges]);

  const currentStep = stepIndex >= 0 ? steps[stepIndex] : null;
  const connectionIssues = report.issues;

  const handlePlay = () => {
    if (steps.length === 0) return;
    if (stepIndex < 0) setStepIndex(0);
    else if (stepIndex >= steps.length - 1) setStepIndex(0);
    setPlaying(true);
  };

  const handleStep = () => {
    if (steps.length === 0) return;
    setPlaying(false);
    setStepIndex((s) => (s < 0 ? 0 : Math.min(s + 1, steps.length - 1)));
  };

  const handleReset = () => {
    setPlaying(false);
    setStepIndex(-1);
  };

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 relative flex flex-col min-h-0">
        <ReactFlowProvider>
          <div className="flex-1 relative min-h-0">
            {stepIndex < 0 && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90">
                <button
                  type="button"
                  onClick={handlePlay}
                  disabled={steps.length === 0}
                  className="flex items-center gap-3 px-6 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-lg font-medium shadow-lg transition-colors"
                >
                  <Play className="w-6 h-6 fill-current" />
                  Play flow
                </button>
                <p className="mt-3 text-sm text-slate-400 max-w-xs text-center">
                  Propagates left to right from sources — edges, then new nodes, repeating.
                </p>
              </div>
            )}
            <div className="absolute inset-0">
              <ConnectionGraphCanvas flowNodes={flowNodes} flowEdges={flowEdges} />
            </div>
          </div>
        </ReactFlowProvider>

        <div className="shrink-0 border-t border-slate-700 bg-slate-900/80 px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={playing ? () => setPlaying(false) : handlePlay}
            disabled={steps.length === 0}
            className="flex items-center justify-center w-9 h-9 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white"
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
          <button
            type="button"
            onClick={handleStep}
            disabled={steps.length === 0 || stepIndex >= steps.length - 1}
            className="flex items-center justify-center w-9 h-9 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white"
            title="Step forward"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center justify-center w-9 h-9 rounded-md bg-slate-700 hover:bg-slate-600 text-white"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-300 truncate">
              {stepIndex < 0
                ? 'Ready — press play to show sources first'
                : currentStep
                  ? describePropagationStep(currentStep, stepIndex)
                  : 'Done'}
            </div>
            <div className="text-[10px] text-slate-500 tabular-nums">
              {stepIndex < 0 ? `0 / ${steps.length}` : `${stepIndex + 1} / ${steps.length}`} steps ·{' '}
              {visibleNodes.length} nodes · {visibleEdges.length} edges
            </div>
          </div>
        </div>
      </div>

      <div className="w-72 border-l border-slate-700 flex flex-col shrink-0 min-h-0">
        {connectionIssues.length > 0 ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Connection Issues</h3>
            {connectionIssues.map((issue, i) => (
              <UnifiedIssueRow
                key={`${issue.code}-${i}`}
                issue={{
                  source: 'connection',
                  severity: issue.severity,
                  code: issue.code,
                  message: issue.message,
                  suggestion: issue.suggestion,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            <div className="text-center text-green-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm font-medium">All connections valid</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HabitChecksPanel({ habits }: { habits: ValidatableHabit[] }) {
  const allValidationResults = habits.map((habit) => ({
    habit,
    errors: validateHabit(habit),
  }));

  if (habits.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        No habits found
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {allValidationResults.map(({ habit, errors }) => {
        const habitHasErrors = errors.some((e) => e.severity === 'error');
        const habitHasWarnings = errors.some((e) => e.severity === 'warning');
        const habitSeverity = habitHasErrors ? 'error' : habitHasWarnings ? 'warning' : 'none';

        return (
          <div key={habit.id} className="border border-slate-700 rounded-lg overflow-hidden">
            <div
              className={`flex items-center justify-between p-3 ${
                habitSeverity === 'error'
                  ? 'bg-red-900/20 border-b border-red-700/50'
                  : habitSeverity === 'warning'
                    ? 'bg-yellow-900/20 border-b border-yellow-700/50'
                    : 'bg-green-900/10 border-b border-green-700/30'
              }`}
            >
              <div className="flex items-center gap-2">
                {habitSeverity === 'error' ? (
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                ) : habitSeverity === 'warning' ? (
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                )}
                <span className="font-medium text-white">{habit.name}</span>
                <span className="text-xs text-slate-500">({habit.id})</span>
              </div>
              <div className="text-xs">
                {errors.length === 0 ? (
                  <span className="text-green-400">All passed</span>
                ) : (
                  <span className={habitSeverity === 'error' ? 'text-red-400' : 'text-yellow-400'}>
                    {errors.filter((e) => e.severity === 'error').length > 0 &&
                      `${errors.filter((e) => e.severity === 'error').length} error(s)`}
                    {errors.filter((e) => e.severity === 'error').length > 0 &&
                      errors.filter((e) => e.severity === 'warning').length > 0 &&
                      ', '}
                    {errors.filter((e) => e.severity === 'warning').length > 0 &&
                      `${errors.filter((e) => e.severity === 'warning').length} warning(s)`}
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-900/30 space-y-2">
              {allValidationChecks.map((check) => {
                const error = errors.find((e) => e.errorType === check.id);
                const passed = !error;

                return (
                  <div
                    key={check.id}
                    className={`flex items-start gap-2 p-2 rounded text-xs ${
                      passed
                        ? 'bg-green-900/10'
                        : error.severity === 'error'
                          ? 'bg-red-900/20'
                          : 'bg-yellow-900/20'
                    }`}
                  >
                    {passed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    ) : error.severity === 'error' ? (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{check.name}</span>
                        {!passed && <IssueBadge severity={error.severity} />}
                      </div>
                      <p
                        className={`mt-0.5 ${
                          passed
                            ? 'text-green-300/50'
                            : error.severity === 'error'
                              ? 'text-red-200/90'
                              : 'text-yellow-200/90'
                        }`}
                      >
                        {passed ? check.description : error.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OverviewPanel({
  habits,
  graphReport,
  allIssues,
}: {
  habits: ValidatableHabit[];
  graphReport: HabitGraphReport;
  allIssues: UnifiedValidationIssue[];
}) {
  const errorCount = allIssues.filter((i) => i.severity === 'error').length;
  const warningCount = allIssues.filter((i) => i.severity === 'warning').length;
  const habitIssueCount = allIssues.filter((i) => i.source === 'habit').length;
  const connectionIssueCount = allIssues.filter((i) => i.source === 'connection').length;

  if (allIssues.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-green-400 p-8">
        <CheckCircle2 className="w-14 h-14 mb-3" />
        <p className="text-lg font-medium">All validations passed</p>
        <p className="text-sm text-slate-400 mt-1">
          {habits.length} habit(s) · {graphReport.summary.nodeCount} graph nodes ·{' '}
          {graphReport.summary.edgeCount} edges
        </p>
      </div>
    );
  }

  const errors = allIssues.filter((i) => i.severity === 'error');
  const warnings = allIssues.filter((i) => i.severity === 'warning');

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Errors</div>
          <div className={`text-2xl font-semibold ${errorCount ? 'text-red-400' : 'text-green-400'}`}>
            {errorCount}
          </div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Warnings</div>
          <div className={`text-2xl font-semibold ${warningCount ? 'text-yellow-400' : 'text-green-400'}`}>
            {warningCount}
          </div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Habit Checks</div>
          <div className="text-2xl font-semibold text-slate-200">{habitIssueCount}</div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Connection Issues</div>
          <div className="text-2xl font-semibold text-slate-200">{connectionIssueCount}</div>
        </div>
      </div>

      {errors.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">
            Errors ({errors.length})
          </h3>
          <div className="space-y-2">
            {errors.map((issue, i) => (
              <UnifiedIssueRow key={`err-${issue.code}-${i}`} issue={issue} />
            ))}
          </div>
        </section>
      )}

      {warnings.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-yellow-400 uppercase tracking-wide mb-2">
            Warnings ({warnings.length})
          </h3>
          <div className="space-y-2">
            {warnings.map((issue, i) => (
              <UnifiedIssueRow key={`warn-${issue.code}-${i}`} issue={issue} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function DataFlowPanel({
  loading,
  error,
  dryRun,
}: {
  loading: boolean;
  error: string | null;
  dryRun: LabDryRunItem[];
}) {
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p>Running data-flow simulation (no runtime input)…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-red-400 p-8">
        <AlertCircle className="w-8 h-8 mb-3" />
        <p>{error}</p>
      </div>
    );
  }

  if (dryRun.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
        <Waypoints className="w-8 h-8 mb-3" />
        <p>No workflows to simulate</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <p className="text-sm text-slate-400">
        Dry-run walks each workflow with synthetic placeholders — no bits execute and no real input is required.
      </p>
      {dryRun.map((item) => (
        <div key={item.workflowId} className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
          <div className="flex items-center gap-2 mb-2">
            {item.report.status === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            )}
            <h3 className="font-medium text-white">{item.workflowName}</h3>
            <span className="text-xs text-slate-500">({item.workflowId})</span>
          </div>
          {item.report.simulatedOutput && (
            <pre className="text-xs bg-slate-900/80 rounded p-3 overflow-x-auto text-slate-300 mb-2">
              {JSON.stringify(item.report.simulatedOutput, null, 2)}
            </pre>
          )}
          {(item.report.errors?.length ?? 0) > 0 && (
            <ul className="text-sm text-red-300 space-y-1">
              {item.report.errors!.map((err, i) => (
                <li key={i}>• [{err.code}] {err.message}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ValidationModal({
  isOpen,
  onClose,
  habits,
  graphReport,
  allIssues,
  frontendYaml = '',
  envContent = '',
}: ValidationModalProps) {
  const [tab, setTab] = useState<ValidationTab>('overview');
  const [labLoading, setLabLoading] = useState(false);
  const [labError, setLabError] = useState<string | null>(null);
  const [labDryRun, setLabDryRun] = useState<LabDryRunItem[]>([]);

  useEffect(() => {
    if (!isOpen || habits.length === 0) {
      setLabDryRun([]);
      setLabError(null);
      return;
    }

    let cancelled = false;
    setLabLoading(true);
    setLabError(null);

    const graphInput = buildEditorGraphInput({
      habits: habits.map((h) => ({
        id: h.id,
        name: h.name,
        nodes: h.nodes,
        edges: h.edges,
        output: h.output,
        input: h.input,
      })),
      frontendYaml,
      envContent,
    });

    api.validateHabitLabDryRun({ graphInput }).then((result) => {
      if (cancelled) return;
      if (result.data?.dryRun) {
        setLabDryRun(result.data.dryRun);
      } else if (result.error) {
        setLabError(result.error);
      }
    }).catch((err) => {
      if (!cancelled) setLabError(err?.message || 'Validation failed');
    }).finally(() => {
      if (!cancelled) setLabLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, habits, frontendYaml, envContent]);

  const totalErrors = allIssues.filter((i) => i.severity === 'error').length;
  const totalWarnings = allIssues.filter((i) => i.severity === 'warning').length;
  const worstSeverity = totalErrors > 0 ? 'error' : totalWarnings > 0 ? 'warning' : 'none';

  if (!isOpen) return null;

  const tabs: { id: ValidationTab; label: string; icon: typeof LayoutList; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutList, count: allIssues.length },
    { id: 'habits', label: 'Habit Checks', icon: ListChecks },
    { id: 'graph', label: 'Discovery', icon: GitBranch, count: graphReport.issues.length },
    { id: 'dataflow', label: 'Data Flow', icon: Waypoints, count: labDryRun.length },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-slate-900 rounded-lg shadow-xl w-[95vw] max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            {worstSeverity === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            ) : worstSeverity === 'warning' ? (
              <AlertCircle className="w-5 h-5 text-yellow-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            )}
            Habit Validation
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:inline">
              {habits.length} habit{habits.length !== 1 ? 's' : ''} ·{' '}
              {graphReport.summary.nodeCount} nodes · {graphReport.summary.edgeCount} edges ·{' '}
              <span className={totalErrors ? 'text-red-400' : 'text-green-400'}>
                {totalErrors} error{totalErrors !== 1 ? 's' : ''}
              </span>
              {totalWarnings > 0 && (
                <span className="text-yellow-400 ml-2">
                  {totalWarnings} warning{totalWarnings !== 1 ? 's' : ''}
                </span>
              )}
            </span>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-slate-700 shrink-0">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
                tab === id
                  ? 'border-blue-500 text-white bg-slate-800/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count !== undefined && count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    id === 'graph' && graphReport.errors.length > 0
                      ? 'bg-red-900/60 text-red-300'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-1 min-h-0 flex-col">
          {tab === 'overview' && (
            <OverviewPanel habits={habits} graphReport={graphReport} allIssues={allIssues} />
          )}
          {tab === 'habits' && <HabitChecksPanel habits={habits} />}
          {tab === 'graph' && <ConnectionGraphPanel report={graphReport} />}
          {tab === 'dataflow' && (
            <DataFlowPanel loading={labLoading} error={labError} dryRun={labDryRun} />
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700 bg-slate-800/50 shrink-0">
          <div className="text-xs text-slate-400">
            {worstSeverity === 'none'
              ? `All ${habits.length} habit(s) passed validation`
              : `${totalErrors} error(s), ${totalWarnings} warning(s) across habit checks and connection graph`}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
