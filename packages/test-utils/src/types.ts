/**
 * Type definitions for bit testing
 */

export interface FetchMock {
  url: string;
  method?: string;
  status?: number;
  response: any;
  responseType?: 'json' | 'text' | 'arraybuffer';
  assertRequest?: Record<string, any>;
}

export interface StoreMock {
  initial: Record<string, any>;
}

export interface ModuleMock {
  __type: 'module_mock';
  moduleName: string;
  exports: Record<string, any>;
  /** If true, clear all submodules from cache when applying mock */
  clearSubmodules?: boolean;
}

/**
 * User-facing module mock input - __type is optional and added automatically
 */
export interface ModuleMockInput {
  __type?: 'module_mock';
  moduleName: string;
  exports: Record<string, any>;
  clearSubmodules?: boolean;
}

/**
 * Bit mock for workflow testing - mocks a specific bit's action response
 */
export interface BitMock {
  /** Bit name (e.g., "bit-openai") or action name */
  bit: string;
  /** Action to mock (optional, defaults to all actions) */
  action?: string;
  /** Mocked response - returned directly without executing the action */
  response?: any;
  /** Error to throw instead of returning response */
  error?: string;
  /** Optional: assert input before returning mock */
  assertInput?: Record<string, any>;
}

/**
 * Declarative module mock methods for YAML tests
 * Maps method paths to their return values
 * Example: { 'chat.completions.create': { choices: [...] } }
 */
export interface DeclarativeModuleMethods {
  [methodPath: string]: any;
}

/**
 * Declarative module mocks by module name (object format for YAML)
 * Example: { openai: { 'chat.completions.create': {...} } }
 */
export interface DeclarativeModuleMocks {
  [moduleName: string]: DeclarativeModuleMethods;
}

/**
 * Modules can be:
 * - Array format: [{ moduleName: 'openai', exports: {...} }] (TypeScript)
 * - Object format: { openai: { 'chat.completions.create': {...} } } (YAML declarative)
 */
export type ModuleMocksConfig = ModuleMockInput[] | DeclarativeModuleMocks;

export interface TestMocks {
  fetch?: FetchMock[];
  store?: StoreMock;
  /**
   * Module mocks - accepts two formats:
   * 
   * Array format (for TypeScript with custom classes):
   *   modules: [{ moduleName: 'openai', exports: { default: MockClass } }]
   * 
   * Object format (declarative, for YAML):
   *   modules:
   *     openai:
   *       chat.completions.create: { choices: [...] }
   */
  modules?: ModuleMocksConfig;
  /** Bit mocks for workflow testing */
  bits?: BitMock[];
  /** 
   * HTTP modules to replace with mock fetch.
   * Example: ['node-fetch', 'undici']
   */
  httpModules?: string[];
  /** 
   * Modules to clear from cache (but not replace).
   * These will reload and pick up the mocked global fetch.
   * Example: ['openai', '@anthropic-ai/sdk']
   */
  clearModules?: string[];
}

export interface BitTestDefinition {
  name: string;
  action?: string;
  auth?: Record<string, any>;
  input: Record<string, any>;
  mocks?: TestMocks;
  expect?: any;
  expectStore?: Record<string, any>;
  expectError?: string;
  afterRun?: (result: any, mocks: any) => void;
}

export interface YamlTestFile {
  bit: string;
  action?: string;
  tests: BitTestDefinition[];
}

/**
 * Workflow test definition - for testing entire habits/workflows
 */
export interface WorkflowTestDefinition {
  name: string;
  /** Trigger input data */
  trigger?: Record<string, any>;
  /** Initial context/variables */
  context?: Record<string, any>;
  mocks?: TestMocks;
  /** Expected final output */
  expect?: any;
  /** Expected values at specific steps */
  expectSteps?: Record<string, any>;
  expectError?: string;
}

export interface WorkflowTestFile {
  /** Path to workflow YAML */
  workflow: string;
  tests: WorkflowTestDefinition[];
}

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  expected?: any;
  actual?: any;
}

export interface TestSuiteResult {
  bitPath: string;
  results: TestResult[];
  passed: number;
  failed: number;
  duration: number;
}

export interface BitAction {
  name: string;
  displayName?: string;
  description?: string;
  props?: Record<string, any>;
  run: (context: BitActionContext) => Promise<any>;
}

export interface Bit {
  displayName?: string;
  description?: string;
  actions: Record<string, BitAction>;
  triggers?: Record<string, any>;
}

export interface BitActionContext {
  auth?: any;
  propsValue: Record<string, any>;
  store?: {
    get: <T>(key: string, scope?: any) => Promise<T | null>;
    put: <T>(key: string, value: T, scope?: any) => Promise<void>;
    delete: (key: string, scope?: any) => Promise<void>;
  };
  files?: any;
}

/**
 * Mock factory - creates module mocks that use the test's fetch interceptor
 */
export type MockFactory = (mockFetch: (url: string, options: any) => Promise<Response>) => ModuleMock;

/**
 * Registry of mock factories for common SDKs
 */
export interface MockFactoryRegistry {
  [moduleName: string]: MockFactory;
}
