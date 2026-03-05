/**
 * @ha-bits/test-utils
 * 
 * Dead simple bit testing utilities for Habits.
 * 
 * YAML test file format:
 * - bit: path to bit file
 * - tests: array of test definitions with name, action, input, mocks, expect
 * 
 * TypeScript test file format:
 * - Export array of BitTestDefinition using defineBitTests()
 * 
 * Workflow testing:
 * - Use BitMock to mock bit responses during workflow execution
 * - Register mock factories for SDK mocking (extensible, not hardcoded)
 */

// Types
export type {
  BitTestDefinition,
  YamlTestFile,
  TestResult,
  TestSuiteResult,
  Bit,
  BitAction,
  BitActionContext,
  FetchMock,
  StoreMock,
  ModuleMock,
  ModuleMockInput,
  ModuleMocksConfig,
  DeclarativeModuleMocks,
  DeclarativeModuleMethods,
  TestMocks,
  // Workflow testing types
  BitMock,
  WorkflowTestDefinition,
  WorkflowTestFile,
  // Mock factory types
  MockFactory,
  MockFactoryRegistry,
} from './types';

// Mocks
export {
  mockFetch,
  mockStore,
  mockModule,
  normalizeModuleMock,
  normalizeModulesConfig,
  declarativeToModuleMocks,
  isDeclarativeModuleMocks,
  createMockStoreInstance,
  createFetchInterceptor,
  applyModuleMocks,
  matchUrl,
  // Generic mocking utilities
  clearModulesFromCache,
  mockFactories,
  registerMockFactory,
  // Bit mocking for workflows
  createBitMockInterceptor,
} from './mocks';

// Runner
export {
  runTest,
  runYamlTestFile,
  runTsTestFile,
  runTsTestFileAuto,
  loadBit,
  loadYamlTests,
  loadWorkflowTests,
  defineBitTests,
} from './runner';

