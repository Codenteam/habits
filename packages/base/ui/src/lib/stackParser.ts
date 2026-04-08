import type { CanvasNode, CanvasEdge } from '@ha-bits/core';
import * as yaml from 'js-yaml';

// Types for stack configuration
export interface StackWorkflowReference {
  id: string;
  path: string;
  enabled?: boolean;
}

export interface StackConfig {
  version: string;
  name?: string; // Human-readable name of the habit package (recommended)
  description?: string;
  workflows: StackWorkflowReference[];
  server?: {
    port?: number;
    host?: string;
    frontend?: string;
  };
}

// Types for habit/workflow YAML
export interface HabitYamlNode {
  id: string;
  type: string;
  data: {
    framework?: string;
    source?: string;
    module?: string;
    operation?: string;
    params?: Record<string, any>;
    credentials?: Record<string, any>;
    label?: string;
    script?: {
      type?: string;
      language?: string;
      content?: string;
    };
  };
}

export interface HabitYamlEdge {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface HabitYaml {
  id: string;
  name: string;
  description?: string;
  nodes: HabitYamlNode[];
  edges: HabitYamlEdge[];
  output?: Record<string, string>; // Habit-level output mappings
}

// Parsed habit ready for Redux store
export interface ParsedHabit {
  id: string;
  name: string;
  description: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  frontendHtml?: string;
  output?: Record<string, string>; // Habit-level output mappings
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedStack {
  config: StackConfig;
  habits: ParsedHabit[];
  frontendHtml?: string;
  envVariables?: Record<string, string>;
  errors: string[];
}

export interface FileEntry {
  name: string;
  path: string;
  content: string;
}

/**
 * Detects if a file is a valid stack configuration file
 */
export function isStackConfigFile(filename: string): boolean {
  const lowerName = filename.toLowerCase();
  return (
    lowerName === 'stack.yaml' ||
    lowerName === 'stack.yml' ||
    lowerName === 'config.json' ||
    lowerName === 'habits.json' ||
    lowerName === 'stack.json'
  );
}

/**
 * Detects potential config files from a list of files
 */
export function detectConfigFiles(files: FileEntry[]): FileEntry[] {
  return files.filter(f => isStackConfigFile(f.name));
}

/**
 * Parses a stack configuration file (YAML or JSON)
 */
export function parseStackConfig(content: string, filename: string): StackConfig {
  const isYaml = filename.endsWith('.yaml') || filename.endsWith('.yml');
  
  try {
    if (isYaml) {
      const parsed = yaml.load(content) as StackConfig;
      validateStackConfig(parsed);
      return parsed;
    } else {
      const parsed = JSON.parse(content) as StackConfig;
      validateStackConfig(parsed);
      return parsed;
    }
  } catch (error) {
    throw new Error(`Failed to parse config file "${filename}": ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validates that a parsed object is a valid stack config
 */
function validateStackConfig(config: any): asserts config is StackConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Config must be an object');
  }
  
  if (!config.version || typeof config.version !== 'string') {
    throw new Error('Config must have a "version" string');
  }
  
  if (!Array.isArray(config.workflows)) {
    throw new Error('Config must have a "workflows" array');
  }
  
  for (const wf of config.workflows) {
    if (!wf.id || typeof wf.id !== 'string') {
      throw new Error('Each workflow must have an "id" string');
    }
    if (!wf.path || typeof wf.path !== 'string') {
      throw new Error('Each workflow must have a "path" string');
    }
  }
}

/**
 * Parses a habit/workflow YAML file
 */
export function parseHabitYaml(content: string, filename: string): HabitYaml {
  try {
    const parsed = yaml.load(content) as HabitYaml;
    validateHabitYaml(parsed);
    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse habit file "${filename}": ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validates a parsed habit YAML
 */
function validateHabitYaml(habit: any): asserts habit is HabitYaml {
  if (!habit || typeof habit !== 'object') {
    throw new Error('Habit must be an object');
  }
  
  if (!habit.id || typeof habit.id !== 'string') {
    throw new Error('Habit must have an "id" string');
  }
  
  if (!habit.name || typeof habit.name !== 'string') {
    throw new Error('Habit must have a "name" string');
  }
  
  if (!Array.isArray(habit.nodes)) {
    throw new Error('Habit must have a "nodes" array');
  }
  
  if (!Array.isArray(habit.edges)) {
    throw new Error('Habit must have an "edges" array');
  }
}

/**
 * Converts a HabitYaml to a ParsedHabit (ready for Redux store)
 */
export function convertHabitYamlToHabit(habitYaml: HabitYaml): ParsedHabit {
  const now = new Date().toISOString();
  
  // Convert nodes with auto-layout if positions not specified
  const nodes: CanvasNode[] = habitYaml.nodes.map((node, index) => {
    // For script nodes, extract script info from params
    const params = node.data.params || {};
    const scriptContent = typeof params.script === 'string' ? params.script : undefined;
    const scriptLanguage = params.language;
    
    return {
      id: node.id,
      type: 'custom',
      position: { x: 100, y: 100 + index * 150 }, // Auto-layout vertically
      data: {
        label: node.data.label || node.id,
        framework: node.data.framework || node.type,
        module: node.data.module || '',
        operation: node.data.operation || '',
        params: node.data.params || {},
        credentials: node.data.credentials || {},
        source: node.data.source,
        content: scriptContent,
        language: scriptLanguage,
      },
    };
  });
  
  // Convert edges
  const edges: CanvasEdge[] = habitYaml.edges.map((edge, index) => ({
    id: `edge-${edge.source}-${edge.target}-${index}`,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
  }));
  
  return {
    id: habitYaml.id,
    name: habitYaml.name,
    description: habitYaml.description || '',
    nodes,
    edges,
    output: habitYaml.output || {},
    version: '1.0.0',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Resolves a relative path from a base path
 */
export function resolvePath(basePath: string, relativePath: string): string {
  // Remove leading ./ from relative path
  const cleanRelative = relativePath.replace(/^\.\//, '');
  
  // Get directory of base path
  const baseDir = basePath.includes('/') 
    ? basePath.substring(0, basePath.lastIndexOf('/'))
    : '';
  
  if (!baseDir) {
    return cleanRelative;
  }
  
  return `${baseDir}/${cleanRelative}`;
}

/**
 * Parses a .env file content into a key-value object with comments
 */
function parseEnvFile(content: string): Record<string, { value: string; comment?: string }> {
  const result: Record<string, { value: string; comment?: string }> = {};
  const lines = content.split('\n');
  let pendingComments: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Accumulate comment lines
    if (trimmed.startsWith('#')) {
      // Remove the # and leading space if present
      const commentText = trimmed.slice(1).trimStart();
      pendingComments.push(commentText);
      continue;
    }
    
    // Skip empty lines but don't clear comments (they might belong to next var)
    if (!trimmed) {
      // Only clear comments if we've already processed at least one variable
      // This preserves file header comments being associated with first variable
      if (Object.keys(result).length > 0) {
        pendingComments = [];
      }
      continue;
    }
    
    // Match KEY=VALUE pattern
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      result[key] = {
        value,
        comment: pendingComments.length > 0 ? pendingComments.join('\n') : undefined,
      };
      pendingComments = [];
    }
  }
  
  return result;
}

/**
 * Parses a complete stack from a folder of files
 */
export async function parseStack(
  files: FileEntry[],
  configFilePath: string
): Promise<ParsedStack> {
  const errors: string[] = [];
  const habits: ParsedHabit[] = [];
  let frontendHtml: string | undefined;
  
  // Find and parse the config file
  const configFile = files.find(f => f.path === configFilePath);
  if (!configFile) {
    throw new Error(`Config file not found: ${configFilePath}`);
  }
  
  const config = parseStackConfig(configFile.content, configFile.name);
  
  // Parse each workflow referenced in the config
  for (const workflowRef of config.workflows) {
    if (workflowRef.enabled === false) {
      continue; // Skip disabled workflows
    }
    
    const habitPath = resolvePath(configFilePath, workflowRef.path);
    const habitFile = files.find(f => f.path === habitPath);
    
    if (!habitFile) {
      errors.push(`Workflow file not found: ${habitPath} (referenced by ${workflowRef.id})`);
      continue;
    }
    
    try {
      const habitYaml = parseHabitYaml(habitFile.content, habitFile.name);
      const habit = convertHabitYamlToHabit(habitYaml);
      habits.push(habit);
    } catch (error) {
      errors.push(`Failed to parse ${habitPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Try to load frontend HTML if specified
  if (config.server?.frontend) {
    const frontendPath = resolvePath(configFilePath, config.server.frontend);
    // Look for index.html in the frontend directory
    const indexPath = frontendPath.endsWith('.html') 
      ? frontendPath 
      : `${frontendPath}/index.html`;
    
    const frontendFile = files.find(f => f.path === indexPath);
    if (frontendFile) {
      frontendHtml = frontendFile.content;
    }
  }
  
  // Try to load .env file from the same directory as the config file
  let envVariables: Record<string, string> | undefined;
  const configDir = configFilePath.includes('/') 
    ? configFilePath.substring(0, configFilePath.lastIndexOf('/'))
    : '';
  const envPath = configDir ? `${configDir}/.env` : '.env';
  const envFile = files.find(f => f.path === envPath || f.name === '.env');
  if (envFile) {
    const parsed = parseEnvFile(envFile.content);
    // Extract just the values from the parsed env file
    envVariables = Object.fromEntries(
      Object.entries(parsed).map(([key, obj]) => [key, obj.value])
    );
  }
  
  return {
    config,
    habits,
    frontendHtml,
    envVariables,
    errors,
  };
}

/**
 * Reads files from a FileList (from input element) into FileEntry array
 */
export async function readFilesFromFileList(fileList: FileList): Promise<FileEntry[]> {
  const files: FileEntry[] = [];
  
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    // webkitRelativePath gives us the path relative to the selected folder
    const path = (file as any).webkitRelativePath || file.name;
    
    try {
      const content = await file.text();
      files.push({
        name: file.name,
        path,
        content,
      });
    } catch (error) {
      console.warn(`Failed to read file ${path}:`, error);
    }
  }
  
  return files;
}

/**
 * Gets the root folder name from files
 */
export function getRootFolderName(files: FileEntry[]): string {
  if (files.length === 0) return '';
  
  const firstPath = files[0].path;
  const parts = firstPath.split('/');
  return parts[0] || '';
}
