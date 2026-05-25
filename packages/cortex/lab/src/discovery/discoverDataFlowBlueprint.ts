import * as fs from 'fs';
import * as path from 'path';
import { stringify } from 'yaml';
import type { BuildHabitGraphInput } from '../graph';
import { toRelativeConfigPath } from '../dataFlow/io';
import { loadStackGraphInput } from './loadStackGraphInput';
import { buildWorkflowBlueprint } from './buildWorkflowBlueprint';
import {
  DATA_FLOW_BLUEPRINT_KIND,
  DATA_FLOW_BLUEPRINT_VERSION,
  type DataFlowBlueprintFile,
  type DataFlowBlueprintReport,
} from './blueprintTypes';

export interface DiscoverDataFlowBlueprintOptions {
  configPath?: string;
}

export function discoverDataFlowBlueprintFromInput(
  input: BuildHabitGraphInput,
  options: DiscoverDataFlowBlueprintOptions = {},
): DataFlowBlueprintReport {
  const configPath = options.configPath ?? '';
  const workflows: DataFlowBlueprintFile['workflows'] = {};

  for (const habit of input.habits) {
    workflows[habit.id] = buildWorkflowBlueprint(habit);
  }

  const blueprint: DataFlowBlueprintFile = {
    version: DATA_FLOW_BLUEPRINT_VERSION,
    kind: DATA_FLOW_BLUEPRINT_KIND,
    configPath: configPath ? toRelativeConfigPath(configPath) : '',
    discoveredAt: new Date().toISOString(),
    workflows,
  };

  return { blueprint, configPath };
}

export function discoverDataFlowBlueprint(
  configPath: string,
): DataFlowBlueprintReport {
  const input = loadStackGraphInput(configPath);
  return discoverDataFlowBlueprintFromInput(input, { configPath });
}

export function stringifyDataFlowBlueprint(blueprint: DataFlowBlueprintFile): string {
  return stringify(blueprint);
}

export function writeDataFlowBlueprintFile(
  filePath: string,
  blueprint: DataFlowBlueprintFile,
): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, stringifyDataFlowBlueprint(blueprint), 'utf8');
  fs.renameSync(tmpPath, filePath);
}
