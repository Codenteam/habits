import * as fs from 'fs';
import * as path from 'path';
import { stringify, parse } from 'yaml';
import type { Workflow } from '@habits/shared/types';
import {
  DATA_FLOW_VERSION,
  DataFlowFile,
  DataFlowWorkflowRecord,
} from './types';

const ENV_PATTERN = /\{\{habits\.env\.([^}]+)\}\}/g;

export function defaultDataFlowPath(configDir: string): string {
  return path.join(configDir, 'data-flow.yaml');
}

/**
 * Normalize configPath for storage in data-flow.yaml.
 * Always relative to the process cwd so captures are portable and
 * do not leak machine-specific absolute paths.
 */
export function toRelativeConfigPath(
  configPath: string,
  cwd: string = process.cwd(),
): string {
  const normalizedInput = configPath.replace(/\\/g, '/');

  if (!path.isAbsolute(configPath)) {
    return normalizedInput.replace(/^\.\/+/, '') || normalizedInput;
  }

  const relative = path.relative(cwd, path.resolve(configPath));
  const posixRelative = relative.replace(/\\/g, '/');

  if (posixRelative && !posixRelative.startsWith('..') && !path.isAbsolute(relative)) {
    return posixRelative;
  }

  // Config lives outside cwd — drop the absolute prefix, keep repo-relative tail if any
  const showcaseIdx = normalizedInput.lastIndexOf('showcase/');
  if (showcaseIdx >= 0) {
    return normalizedInput.slice(showcaseIdx);
  }

  return path.basename(configPath);
}

export function collectEnvVarReferences(workflow: Workflow): string[] {
  const vars = new Set<string>();

  const scanValue = (value: unknown): void => {
    if (typeof value === 'string') {
      let match: RegExpExecArray | null;
      const pattern = new RegExp(ENV_PATTERN.source, 'g');
      while ((match = pattern.exec(value)) !== null) {
        vars.add(match[1].trim());
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(scanValue);
      return;
    }

    if (value !== null && typeof value === 'object') {
      Object.values(value).forEach(scanValue);
    }
  };

  for (const node of workflow.nodes || []) {
    scanValue(node.data?.params);
    scanValue(node.data?.credentials);
  }

  scanValue(workflow.output);
  scanValue((workflow as { outputs?: unknown }).outputs);

  return Array.from(vars);
}

export function readDataFlowFile(filePath: string): DataFlowFile {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Data-flow file not found: ${filePath}`);
  }

  const parsed = parse(fs.readFileSync(filePath, 'utf8')) as DataFlowFile;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Invalid data-flow file: ${filePath}`);
  }

  if (parsed.version !== DATA_FLOW_VERSION) {
    throw new Error(
      `Unsupported data-flow version ${parsed.version} in ${filePath} (expected ${DATA_FLOW_VERSION})`,
    );
  }

  if (!parsed.workflows || typeof parsed.workflows !== 'object') {
    throw new Error(`Data-flow file missing workflows map: ${filePath}`);
  }

  return parsed;
}

export function writeDataFlowFile(
  filePath: string,
  configPath: string,
  workflowId: string,
  workflowRecord: DataFlowWorkflowRecord,
): void {
  let existing: DataFlowFile = {
    version: DATA_FLOW_VERSION,
    configPath: toRelativeConfigPath(configPath),
    capturedAt: new Date().toISOString(),
    workflows: {},
  };

  if (fs.existsSync(filePath)) {
    try {
      existing = readDataFlowFile(filePath);
    } catch {
      existing.workflows = {};
    }
  }

  existing.version = DATA_FLOW_VERSION;
  existing.configPath = toRelativeConfigPath(configPath);
  existing.capturedAt = new Date().toISOString();
  existing.workflows[workflowId] = workflowRecord;

  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, stringify(existing), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

export function getWorkflowRecord(
  file: DataFlowFile,
  workflowId: string,
): DataFlowWorkflowRecord {
  const record = file.workflows[workflowId];
  if (!record) {
    throw new Error(
      `Workflow "${workflowId}" not found in data-flow file (available: ${Object.keys(file.workflows).join(', ') || 'none'})`,
    );
  }
  return record;
}
