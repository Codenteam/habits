import yaml from 'js-yaml';
import { ExportBundle, normalizePathsInObject } from '@ha-bits/core';

// Helper to convert envVariables state to .env file format
export function envVariablesToString(envVars: Record<string, { value: string; revealed?: boolean; comment?: string }>): string {
  const lines: string[] = [];
  for (const [key, data] of Object.entries(envVars)) {
    // Add comment lines if present
    if (data.comment) {
      for (const commentLine of data.comment.split('\n')) {
        lines.push(`# ${commentLine}`);
      }
    }
    const value = data.value;
    // Quote values with spaces or special characters
    const escapedValue = value.includes(' ') || value.includes('"') || value.includes('=')
      ? `"${value.replace(/"/g, '\\"')}"`
      : value;
    lines.push(`${key}=${escapedValue}`);
    lines.push(''); // Empty line between variables for readability
  }
  return lines.join('\n').trimEnd();
}

interface HabitNode {
  id: string;
  type: string;
  position?: { x: number; y: number };
  data: {
    framework: 'n8n' | 'activepieces' | 'script' | 'bits';
    module?: string;
    label?: string;
    source?: string;
    operation?: string;
    params?: Record<string, any>;
    credentials?: Record<string, any>;
    script?: {
      type: string;
      language: string;
      content: string;
    };
    content?: string;
    language?: string;
  };
}

interface HabitEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface Habit {
  id: string;
  name: string;
  description: string;
  nodes: HabitNode[];
  edges: HabitEdge[];
  output?: Record<string, string>; // Habit-level output mappings
  version: string;
  createdAt: string;
  updatedAt: string;
}

interface EnvVariable {
  key: string;
  value: string;
  nodeLabel?: string;
  description?: string;
}

// Generate a slug from a name
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

// Extract environment variables from habit nodes
export function extractEnvVariables(habits: Habit[]): EnvVariable[] {
  const envVars: EnvVariable[] = [];
  const seenKeys = new Set<string>();

  for (const habit of habits) {
    for (const node of habit.nodes) {
      // Check credentials for env references
      if (node.data.credentials) {
        extractEnvFromObject(node.data.credentials, node.data.label || node.id, envVars, seenKeys);
      }
      // Check params for env references
      if (node.data.params) {
        extractEnvFromObject(node.data.params, node.data.label || node.id, envVars, seenKeys);
      }
    }
  }

  return envVars;
}

function extractEnvFromObject(
  obj: Record<string, any>, 
  nodeLabel: string, 
  envVars: EnvVariable[], 
  seenKeys: Set<string>,
  path: string = ''
): void {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Match {{habits.env.VAR_NAME}} pattern
      const matches = value.matchAll(/\{\{habits\.env\.([A-Z_][A-Z0-9_]*)\}\}/g);
      for (const match of matches) {
        const envKey = match[1];
        if (!seenKeys.has(envKey)) {
          seenKeys.add(envKey);
          envVars.push({
            key: envKey,
            value: '', // Placeholder - user needs to fill
            nodeLabel,
            description: `Used in ${nodeLabel} for ${path ? path + '.' : ''}${key}`,
          });
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      extractEnvFromObject(value, nodeLabel, envVars, seenKeys, path ? `${path}.${key}` : key);
    }
  }
}

// Generate .env content from env variables
export function generateEnvFile(envVars: EnvVariable[], existingEnv: string = '', serverOptions?: ServerOptions): string {
  // Parse existing env to preserve values
  const existingValues = new Map<string, string>();
  for (const line of existingEnv.split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      existingValues.set(match[1], match[2]);
    }
  }

  const lines: string[] = [
    '# Habits Stack Environment Variables',
    `# Generated on ${new Date().toISOString()}`,
    '',
  ];

  // Add server configuration
  if (serverOptions) {
    lines.push('# Server Configuration');
    if (serverOptions.openapi !== undefined) {
      lines.push(`HABITS_OPENAPI_ENABLED=${serverOptions.openapi}`);
    } else {
      lines.push(`HABITS_OPENAPI_ENABLED=false`);

    }
    if (serverOptions.manageEndpoint !== undefined) {
      lines.push(`HABITS_MANAGE_ENABLED=${serverOptions.manageEndpoint}`);
    } else {
      lines.push(`HABITS_MANAGE_ENABLED=false`);
    }
    lines.push('');
    
    // Add security configuration
    lines.push('# Security Configuration (all disabled by default)');
    const sec = serverOptions.security || {};
    lines.push(`HABITS_DLP_ENABLED=${sec.dlpEnabled || false}`);
    lines.push(`HABITS_DLP_ICAP_URL=${sec.dlpIcapUrl || ''}`);
    lines.push(`HABITS_DLP_ICAP_TIMEOUT=${sec.dlpIcapTimeout || 5000}`);
    lines.push(`HABITS_PII_PROTECTION=${sec.piiProtection || ''}`);
    lines.push(`HABITS_MODERATION_ENABLED=${sec.moderationEnabled || false}`);
    lines.push(`HABITS_SECURITY_POLICY_ENABLED=${sec.policyEnabled || false}`);
    lines.push(`HABITS_SECURITY_CAPABILITIES_ENABLED=${sec.capabilitiesEnabled || false}`);
    lines.push('');
  }

  // Group by node
  const byNode = new Map<string, EnvVariable[]>();
  for (const env of envVars) {
    const node = env.nodeLabel || 'General';
    const existing = byNode.get(node) || [];
    existing.push(env);
    byNode.set(node, existing);
  }

  for (const [node, vars] of byNode) {
    lines.push(`# ${node}`);
    for (const env of vars) {
      const value = existingValues.get(env.key) || env.value;
      lines.push(`${env.key}=${value}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// Convert a habit to schema-compliant YAML format
export function habitToYaml(habit: Habit): string {
  
  const yamlObj= {
    id: habit.id,
    name: habit.name,
    description: habit.description || undefined,
    nodes: habit.nodes.map(node => {
      const yamlNode: any = {
        id: node.id,
        type: node.data.framework,
        data: {
          framework: node.data.framework,
          source: node.data.source || (node.data.framework === 'script' ? 'inline' : 'npm'),
          module: node.data.module,
          label: node.data.label,
        },
      };

      // Add operation if present
      if (node.data.operation) {
        yamlNode.data.operation = node.data.operation;
      }

      // Add params if present (normalize bracket notation to dot notation)
      if (node.data.params && Object.keys(node.data.params).length > 0) {
        yamlNode.data.params = normalizePathsInObject(node.data.params);
      }

      // Add credentials if present (normalize bracket notation to dot notation)
      if (node.data.credentials && Object.keys(node.data.credentials).length > 0) {
        yamlNode.data.credentials = normalizePathsInObject(node.data.credentials);
      }

      // Handle script nodes - type, language, and script (code string) go directly in params
      if (node.data.framework === 'script') {
        if (node.data.content) {
          if (!yamlNode.data.params) {
            yamlNode.data.params = {};
          }
          yamlNode.data.params.type = 'script';
          yamlNode.data.params.language = node.data.language || 'deno';
          yamlNode.data.params.script = node.data.content;
        }
      }

      return yamlNode;
    }),
    edges: habit.edges.length > 0 ? habit.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      ...(edge.sourceHandle && { sourceHandle: edge.sourceHandle }),
      ...(edge.targetHandle && { targetHandle: edge.targetHandle }),
    })) : undefined,
    // Include output mappings if defined
    output: habit.output && Object.keys(habit.output).length > 0 ? habit.output : undefined,
  };

  // Remove undefined values 
  const cleanObj = JSON.parse(JSON.stringify(yamlObj));

  return yaml.dump(cleanObj, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: true,
  });
}

// Generate stack.yaml (config) content
interface StackConfig {
  version: string;
  workflows: Array<{
    id: string;
    path: string;
    enabled: boolean;
    webhookTimeout?: number;
  }>;
  server: {
    port: number;
    host: string;
    frontend?: string;
  };
  defaults?: {
    webhookTimeout?: number;
  };
}

export interface ServerOptions {
  port?: number;
  host?: string;
  openapi?: boolean;
  manageEndpoint?: boolean;
  webhookTimeout?: number;
  hasFrontend?: boolean;
  // Security options
  security?: {
    dlpEnabled?: boolean;
    dlpIcapUrl?: string;
    dlpIcapTimeout?: number;
    piiProtection?: '' | 'log' | 'eradicate' | 'replace';
    moderationEnabled?: boolean;
    policyEnabled?: boolean;
    capabilitiesEnabled?: boolean;
  };
}

export function generateStackYaml(
  habits: Habit[],
  options: ServerOptions = {}
): string {
  const config: StackConfig = {
    version: '1.0',
    workflows: habits.map(habit => ({
      id: slugify(habit.name),
      path: `./${slugify(habit.name)}.yaml`,
      enabled: true,
      ...(options.webhookTimeout && { webhookTimeout: options.webhookTimeout }),
    })),
    server: {
      port: options.port || 3000,
      host: options.host || '0.0.0.0',
      ...(options.hasFrontend && { frontend: './frontend' }),
    },
    ...(options.webhookTimeout && {
      defaults: {
        webhookTimeout: options.webhookTimeout,
      },
    }),
  };

  return yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });
}

// Parse stack.yaml back to config
export function parseStackYaml(content: string): StackConfig | null {
  try {
    return yaml.load(content) as StackConfig;
  } catch {
    return null;
  }
}

// Parse habit.yaml back to habit
export function parseHabitYaml(content: string): Partial<Habit> | null {
  try {
    const data = yaml.load(content) as any;
    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      nodes: data.nodes || [],
      edges: data.edges || [],
    };
  } catch {
    return null;
  }
}



export function generateExportBundle(
  habits: Habit[],
  existingEnv: string = '',
  serverOptions: ServerOptions = {},
  frontendHtml?: string
): ExportBundle {
  const hasFrontend = !!frontendHtml;

  // Generate habit YAML files
  const habitFiles = habits.map(habit => ({
    filename: `${slugify(habit.name)}.yaml`,
    content: habitToYaml(habit),
  }));

  // Extract env variables and generate .env
  const envVars = extractEnvVariables(habits);
  const envFile = generateEnvFile(envVars, existingEnv, serverOptions);

  // Generate stack.yaml
  const stackYaml = generateStackYaml(habits, {
    ...serverOptions,
    hasFrontend,
  });

  return {
    stackYaml,
    habitFiles,
    envFile,
    frontendHtml,
  };
}
