import {
  buildAndValidateHabitGraph,
  type BuildHabitGraphInput,
  type HabitGraphReport,
  type ValidateGraphOptions,
} from '../graph';
import { loadStackGraphInput } from './loadStackGraphInput';

export interface DiscoverDataFlowOptions extends ValidateGraphOptions {
  configPath?: string;
}

export interface DataFlowDiscoveryReport extends HabitGraphReport {
  configPath: string;
}

export function discoverDataFlowFromInput(
  input: BuildHabitGraphInput,
  options: DiscoverDataFlowOptions = {},
): DataFlowDiscoveryReport {
  const report = buildAndValidateHabitGraph(input, options);
  return {
    ...report,
    configPath: options.configPath ?? '',
  };
}

export function discoverDataFlow(
  configPath: string,
  options: ValidateGraphOptions = {},
): DataFlowDiscoveryReport {
  const input = loadStackGraphInput(configPath);
  return discoverDataFlowFromInput(input, { ...options, configPath });
}
