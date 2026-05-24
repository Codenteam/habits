import type { BuildHabitGraphInput, GraphHabitInput } from '../graph';

export interface EditorHabitLike {
  id: string;
  name: string;
  nodes: Array<{ id: string; data?: Record<string, unknown> }>;
  edges: Array<{ source: string; target: string }>;
  output?: Record<string, string | { value?: string }>;
  input?: Array<{ name?: string; id?: string }>;
}

export function parseEnvKeysFromContent(envContent: string): string[] {
  const keys: string[] = [];
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) keys.push(trimmed.slice(0, eq).trim());
  }
  return keys;
}

export function habitsToGraphInput(habits: EditorHabitLike[]): GraphHabitInput[] {
  return habits.map((h) => ({
    id: h.id,
    name: h.name,
    nodes: h.nodes.map((n) => ({
      id: n.id,
      data: n.data as GraphHabitInput['nodes'][0]['data'],
    })),
    edges: h.edges.map((e) => ({ source: e.source, target: e.target })),
    output: h.output,
    input: h.input,
  }));
}

export function buildEditorGraphInput(options: {
  habits: EditorHabitLike[];
  frontendYaml?: string | null;
  envContent?: string;
}): BuildHabitGraphInput {
  return {
    workflowIds: options.habits.map((h) => h.id),
    habits: habitsToGraphInput(options.habits),
    uiSpecYaml: options.frontendYaml || null,
    envKeys: parseEnvKeysFromContent(options.envContent ?? ''),
  };
}
