export {
  runCaptureSession,
  runReplaySession,
  runDryRunSession,
  defaultDataFlowPath,
} from './sessions';

export type {
  CaptureSessionOptions,
  ReplaySessionOptions,
  DryRunSessionOptions,
  SimulationReport,
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
  loadStackGraphInput,
  printDiscoveryReport,
} from './discovery';
export type { DataFlowDiscoveryReport, DiscoverDataFlowOptions } from './discovery';

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
  buildEditorGraphInput,
  habitsToGraphInput,
  parseEnvKeysFromContent,
} from './validate';
export type {
  HabitLabValidationReport,
  EditorHabitLike,
} from './validate';
