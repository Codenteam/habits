export function walkStrings(value: unknown, visit: (str: string, path: string) => void, path = ''): void {
  if (typeof value === 'string') {
    visit(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => walkStrings(item, visit, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walkStrings(v, visit, path ? `${path}.${k}` : k);
    }
  }
}

export function extractHabitsInputFields(obj: unknown): Set<string> {
  const fields = new Set<string>();
  walkStrings(obj, (str) => {
    const re = /\{\{habits\.input\.([a-zA-Z0-9_]+)\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(str)) !== null) fields.add(m[1]);
  });
  return fields;
}

export function extractHabitsEnvFields(obj: unknown): Set<string> {
  const fields = new Set<string>();
  walkStrings(obj, (str) => {
    const re = /\{\{habits\.env\.([A-Za-z0-9_]+)\}\}/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(str)) !== null) fields.add(m[1].toUpperCase());
  });
  return fields;
}

export interface NodeRef {
  nodeId: string;
  property?: string;
}

export function extractNodeRefs(obj: unknown): NodeRef[] {
  const refs: NodeRef[] = [];
  walkStrings(obj, (str) => {
    const re = /\{\{([a-zA-Z0-9_-]+)(?:\.([^}]+))?\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(str)) !== null) {
      const fullRef = m[2] ? `${m[1]}.${m[2]}` : m[1];
      if (fullRef.startsWith('habits.')) continue;
      refs.push({ nodeId: m[1], property: m[2] });
    }
  });
  return refs;
}

export function extractStateRefs(template: string): string[] {
  const refs: string[] = [];
  const re = /\{\{\s*state\.([^}\s]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) refs.push(m[1]);
  return refs;
}

export function parseWorkflowIdFromEndpoint(endpoint: string | undefined, defaultId?: string): string | null {
  if (!endpoint) return defaultId ?? null;
  const staticMatch = endpoint.match(/\/api\/([^/?\s{]+)/);
  if (staticMatch) return staticMatch[1];
  if (endpoint.includes('{{')) return null;
  return defaultId ?? null;
}

export function extractBodyKeys(body: unknown): string[] {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return [];
  return Object.keys(body as Record<string, unknown>);
}

export function normalizeStatePath(path: string): string {
  if (path.startsWith('state.')) return path.slice('state.'.length);
  return path;
}
