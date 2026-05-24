export {
  runCaptureSession,
  runReplaySession,
  runDryRunSession,
  runWorkflowWithLabOptions,
  defaultDataFlowPath,
} from './sessions';

export type {
  CaptureSessionOptions,
  ReplaySessionOptions,
  DryRunSessionOptions,
  SimulationReport,
  LabExecutionOptions,
} from './sessions';

export {
  readDataFlowFile,
  writeDataFlowFile,
  getWorkflowRecord,
  collectEnvVarReferences,
} from './dataFlow';

export type {
  DataFlowFile,
  DataFlowNodeRecord,
  DataFlowWorkflowRecord,
} from './dataFlow';

export { createProxyMock } from './simulation/MockOutputFactory';
export { buildDryRunReport, printSimulationReport } from './simulation/report';
export type { SimulationReport as SimulationReportType, SimulationStatus } from './simulation/types';

export {
  discoverDataFlow,
  discoverDataFlowFromInput,
  discoverDataFlowBlueprint,
  discoverDataFlowBlueprintFromInput,
  stringifyDataFlowBlueprint,
  writeDataFlowBlueprintFile,
  loadStackGraphInput,
  printDiscoveryReport,
  printDataFlowBlueprint,
  buildWorkflowBlueprint,
  buildHabitInputBlueprint,
  buildEnvBlueprint,
  buildNodeBlueprint,
  buildWorkflowOutputBlueprint,
  orderWorkflowNodes,
  discoverNodeOutputPlaceholder,
  DISCOVER_PLACEHOLDER_PREFIX,
  DATA_FLOW_BLUEPRINT_VERSION,
  DATA_FLOW_BLUEPRINT_KIND,
} from './discovery';
export type {
  DataFlowDiscoveryReport,
  DiscoverDataFlowOptions,
  DataFlowBlueprintFile,
  DataFlowBlueprintReport,
  DataFlowWorkflowBlueprint,
  DataFlowNodeBlueprint,
  DataFlowInputFieldBlueprint,
  DiscoverDataFlowBlueprintOptions,
} from './discovery';

export {
  buildHabitGraph,
  buildAndValidateHabitGraph,
  validateHabitGraph,
  analyzeUiSpec,
  extractHabitsInputFields,
  extractHabitsEnvFields,
  extractNodeRefs,
  declaredInputFields,
} from './graph';
export type {
  HabitGraph,
  HabitGraphNode,
  HabitGraphEdge,
  HabitGraphReport,
  GraphIssue,
  GraphHabitInput,
  BuildHabitGraphInput,
  ValidateGraphOptions,
} from './graph';

export {
  validateHabitLab,
  validateHabitLabDiscovery,
  validateHabitLabDryRun,
} from './validate';
export type {
  HabitLabValidationReport,
  HabitLabDryRunReport,
} from './validate';
