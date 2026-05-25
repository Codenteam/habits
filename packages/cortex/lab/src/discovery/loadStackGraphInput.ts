import * as fs from 'fs';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
import type { BuildHabitGraphInput, GraphHabitInput } from '../graph';

const FRONTEND_SPEC_CANDIDATES = ['index.yaml', 'index.yml', 'ui.yaml', 'ui.yml'];

function parseEnvKeys(envContent: string): string[] {
  const keys: string[] = [];
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) keys.push(trimmed.slice(0, eq).trim());
  }
  return keys;
}

function readFrontendSpecYaml(configDir: string, config: any): string | null {
  const frontendRef = config?.server?.frontend;
  if (!frontendRef) return null;

  const frontendDir = path.isAbsolute(frontendRef)
    ? frontendRef
    : path.resolve(configDir, frontendRef);

  if (!fs.existsSync(frontendDir)) return null;

  if (fs.statSync(frontendDir).isFile()) {
    return fs.readFileSync(frontendDir, 'utf-8');
  }

  for (const name of FRONTEND_SPEC_CANDIDATES) {
    const candidate = path.join(frontendDir, name);
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, 'utf-8');
    }
  }

  return null;
}

function loadWorkflow(configDir: string, ref: any): GraphHabitInput | null {
  if (ref.enabled === false) return null;

  const workflowPath = path.isAbsolute(ref.path)
    ? ref.path
    : path.resolve(configDir, ref.path);

  if (!fs.existsSync(workflowPath)) return null;

  const content = fs.readFileSync(workflowPath, 'utf-8');
  const workflow = workflowPath.endsWith('.json')
    ? JSON.parse(content)
    : parseYaml(content);

  return {
    id: ref.id || workflow.id,
    name: workflow.name || ref.id || workflow.id,
    nodes: (workflow.nodes || []).map((node: any) => ({
      id: node.id,
      data: node.data,
    })),
    edges: (workflow.edges || []).map((edge: any) => ({
      source: edge.source,
      target: edge.target,
    })),
    output: workflow.output,
    input: workflow.input,
  };
}

export function loadStackGraphInput(configPath: string): BuildHabitGraphInput {
  const absolutePath = path.resolve(configPath);
  const configDir = path.dirname(absolutePath);
  const content = fs.readFileSync(absolutePath, 'utf-8');
  const config = absolutePath.endsWith('.json')
    ? JSON.parse(content)
    : parseYaml(content);

  const habits: GraphHabitInput[] = [];
  for (const ref of config.workflows || []) {
    const habit = loadWorkflow(configDir, ref);
    if (habit) habits.push(habit);
  }

  const envPath = path.join(configDir, '.env');
  const envKeys = fs.existsSync(envPath)
    ? parseEnvKeys(fs.readFileSync(envPath, 'utf-8'))
    : [];

  return {
    workflowIds: habits.map((h) => h.id),
    habits,
    uiSpecYaml: readFrontendSpecYaml(configDir, config),
    envKeys,
  };
}
