/**
 * Bit test runner
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import {
  BitTestDefinition,
  YamlTestFile,
  TestResult,
  TestSuiteResult,
  Bit,
  BitAction,
  WorkflowTestFile,
  ModuleMock,
} from './types';
import {
  createFetchInterceptor,
  createMockStoreInstance,
  applyModuleMocks,
  mockStore,
  clearModulesFromCache,
  mockFactories,
  createBitMockInterceptor,
  normalizeModulesConfig,
} from './mocks';
import { runWorkflowTestFile } from './workflow-runner';

/**
 * Deep equality check that ignores key order in objects
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return a === b;
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => key in b && deepEqual(a[key], b[key]));
}

/**
 * Mock for @ha-bits/cortex framework (to avoid CLI side effects)
 */
const cortexMock = {
  createAction: (config: any) => ({
    ...config,
    run: config.run,
  }),
  createBitAction: (config: any) => config,
  Property: {
    ShortText: (opts: any) => ({ type: 'SHORT_TEXT', ...opts }),
    LongText: (opts: any) => ({ type: 'LONG_TEXT', ...opts }),
    Number: (opts: any) => ({ type: 'NUMBER', ...opts }),
    Checkbox: (opts: any) => ({ type: 'CHECKBOX', ...opts }),
    Dropdown: (opts: any) => ({ type: 'DROPDOWN', ...opts }),
    StaticDropdown: (opts: any) => ({ type: 'STATIC_DROPDOWN', ...opts }),
    Json: (opts: any) => ({ type: 'JSON', ...opts }),
    Object: (opts: any) => ({ type: 'OBJECT', ...opts }),
    Array: (opts: any) => ({ type: 'ARRAY', ...opts }),
    File: (opts: any) => ({ type: 'FILE', ...opts }),
    DateTime: (opts: any) => ({ type: 'DATE_TIME', ...opts }),
    Markdown: (opts: any) => ({ type: 'MARKDOWN', ...opts }),
    MultiSelectDropdown: (opts: any) => ({ type: 'MULTI_SELECT_DROPDOWN', ...opts }),
  },
  StoreScope: {
    PROJECT: 'PROJECT',
    FLOW: 'FLOW',
  },
  PieceAuth: {
    SecretText: (opts: any) => ({ type: 'SECRET_TEXT', ...opts }),
    CustomAuth: (opts: any) => ({ type: 'CUSTOM_AUTH', ...opts }),
    OAuth2: (opts: any) => ({ type: 'OAUTH2', ...opts }),
  },
  httpClient: {
    sendRequest: async () => ({ body: {}, status: 200 }),
  },
  HttpMethod: {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
    PATCH: 'PATCH',
  },
};

/**
 * Install cortex mock to prevent CLI side effects
 * Must be called with the bit's directory to properly resolve the module
 */
function installCortexMock(bitDir: string) {
  const moduleName = '@ha-bits/cortex';
  
  try {
    const resolvedPath = require.resolve(moduleName, { paths: [bitDir] });
    delete require.cache[resolvedPath];
    
    // @ts-ignore
    require.cache[resolvedPath] = {
      id: resolvedPath,
      filename: resolvedPath,
      loaded: true,
      exports: cortexMock,
    };
  } catch {
    // Module not installed in bit's node_modules, skip
  }
}

/**
 * Apply mock factories for modules that have registered factories
 * Returns additional module mocks to apply
 */
function applyMockFactories(
  fetchInterceptor: ReturnType<typeof createFetchInterceptor>,
  existingMocks: ModuleMock[],
  basePath: string
): ModuleMock[] {
  const additionalMocks: ModuleMock[] = [];
  const existingModuleNames = new Set(existingMocks.map(m => m.moduleName));
  
  // For each registered factory, create a mock if not already provided
  for (const [moduleName, factory] of Object.entries(mockFactories)) {
    if (!existingModuleNames.has(moduleName)) {
      try {
        // Check if module is installed
        require.resolve(moduleName, { paths: [basePath] });
        // Create mock using factory
        const mock = factory(fetchInterceptor.mockFetch);
        additionalMocks.push(mock);
      } catch {
        // Module not installed, skip
      }
    }
  }
  
  return additionalMocks;
}

/**
 * Load a bit module from path
 */
export async function loadBit(bitPath: string, basePath: string): Promise<Bit | BitAction> {
  let fullPath = bitPath.startsWith('.')
    ? path.resolve(basePath, bitPath)
    : bitPath;
  
  // If it's a TypeScript file, try to load from dist instead
  if (fullPath.endsWith('.ts')) {
    const distPath = fullPath
      .replace('/src/', '/dist/')
      .replace('.ts', '.js');
    
    if (fs.existsSync(distPath)) {
      fullPath = distPath;
    } else {
      const altDistPath = fullPath
        .replace(/\/src\/([^/]+)\.ts$/, '/dist/$1.js');
      if (fs.existsSync(altDistPath)) {
        fullPath = altDistPath;
      }
    }
  }
  
  // Find the bit's package directory (containing node_modules)
  let bitDir = path.dirname(fullPath);
  while (bitDir !== '/' && !fs.existsSync(path.join(bitDir, 'node_modules'))) {
    bitDir = path.dirname(bitDir);
  }
  
  // Install cortex mock before loading the bit
  installCortexMock(bitDir);
  
  // Clear require cache for fresh load
  const resolvedPath = require.resolve(fullPath);
  delete require.cache[resolvedPath];
  
  const module = require(fullPath);
  return module.default || module;
}

/**
 * Load test definitions from a YAML file
 */
export function loadYamlTests(filePath: string): YamlTestFile {
  const content = fs.readFileSync(filePath, 'utf-8');
  return yaml.parse(content);
}

/**
 * Load test definitions from a TypeScript file
 */
export async function loadTsTests(filePath: string): Promise<BitTestDefinition[]> {
  const module = require(filePath);
  return module.default || module;
}

/**
 * Load workflow test definitions from a YAML file
 */
export function loadWorkflowTests(filePath: string): WorkflowTestFile {
  const content = fs.readFileSync(filePath, 'utf-8');
  return yaml.parse(content);
}

/**
 * Run a single test against a bit action
 */
export async function runTest(
  action: BitAction,
  test: BitTestDefinition
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Setup mocks
    const fetchMocks = test.mocks?.fetch || [];
    const storeMock = test.mocks?.store || mockStore({});
    const moduleMocks = normalizeModulesConfig(test.mocks?.modules);
    
    // Apply module mocks
    const restoreModules = applyModuleMocks(moduleMocks);
    
    // Create fetch interceptor
    const fetchInterceptor = createFetchInterceptor(fetchMocks);
    fetchInterceptor.install();
    
    // Create mock store
    const storeInstance = createMockStoreInstance(storeMock);
    
    // Build context
    const context = {
      auth: test.auth,
      propsValue: test.input,
      store: storeInstance,
    };
    
    let result: any;
    let error: Error | null = null;
    
    try {
      result = await action.run(context);
    } catch (e) {
      error = e as Error;
    } finally {
      // Restore mocks
      fetchInterceptor.restore();
      restoreModules();
    }
    
    // Check for expected error
    if (test.expectError) {
      if (!error) {
        return {
          name: test.name,
          passed: false,
          duration: Date.now() - startTime,
          error: `Expected error "${test.expectError}" but no error was thrown`,
          expected: test.expectError,
          actual: result,
        };
      }
      if (!error.message.includes(test.expectError)) {
        return {
          name: test.name,
          passed: false,
          duration: Date.now() - startTime,
          error: `Expected error containing "${test.expectError}"`,
          expected: test.expectError,
          actual: error.message,
        };
      }
      return {
        name: test.name,
        passed: true,
        duration: Date.now() - startTime,
      };
    }
    
    // If there was an unexpected error
    if (error) {
      return {
        name: test.name,
        passed: false,
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
    
    // Check expectations
    if (test.expect !== undefined) {
      const passed = checkExpectation(result, test.expect);
      if (!passed) {
        return {
          name: test.name,
          passed: false,
          duration: Date.now() - startTime,
          error: 'Expectation mismatch',
          expected: test.expect,
          actual: result,
        };
      }
    }
    
    // Check store expectations
    if (test.expectStore) {
      for (const [key, expected] of Object.entries(test.expectStore)) {
        const actual = storeInstance.data[key];
        if (!deepEqual(actual, expected)) {
          return {
            name: test.name,
            passed: false,
            duration: Date.now() - startTime,
            error: `Store expectation failed for key "${key}"`,
            expected,
            actual,
          };
        }
      }
    }
    
    // Run afterRun callback if provided
    if (test.afterRun) {
      test.afterRun(result, { store: storeInstance, modules: moduleMocks });
    }
    
    return {
      name: test.name,
      passed: true,
      duration: Date.now() - startTime,
    };
  } catch (e) {
    return {
      name: test.name,
      passed: false,
      duration: Date.now() - startTime,
      error: (e as Error).message,
    };
  }
}

/**
 * Run a test with fetch interceptor already set up
 * Used when we need to load the bit fresh with mocked fetch
 */
async function runTestWithoutFetchSetup(
  action: BitAction,
  test: BitTestDefinition,
  fetchInterceptor: { restore: () => void }
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Setup other mocks (fetch already set up)
    const storeMock = test.mocks?.store || mockStore({});
    const moduleMocks = normalizeModulesConfig(test.mocks?.modules);
    
    // Apply module mocks
    const restoreModules = applyModuleMocks(moduleMocks);
    
    // Create mock store
    const storeInstance = createMockStoreInstance(storeMock);
    
    // Build context
    const context = {
      auth: test.auth,
      propsValue: test.input,
      store: storeInstance,
    };
    
    let result: any;
    let error: Error | null = null;
    
    try {
      result = await action.run(context);
    } catch (e) {
      error = e as Error;
    } finally {
      // Restore mocks
      fetchInterceptor.restore();
      restoreModules();
    }
    
    // Check for expected error
    if (test.expectError) {
      if (!error) {
        return {
          name: test.name,
          passed: false,
          duration: Date.now() - startTime,
          error: `Expected error "${test.expectError}" but no error was thrown`,
          expected: test.expectError,
          actual: result,
        };
      }
      if (!error.message.includes(test.expectError)) {
        return {
          name: test.name,
          passed: false,
          duration: Date.now() - startTime,
          error: `Expected error containing "${test.expectError}"`,
          expected: test.expectError,
          actual: error.message,
        };
      }
      return {
        name: test.name,
        passed: true,
        duration: Date.now() - startTime,
      };
    }
    
    // If there was an unexpected error
    if (error) {
      return {
        name: test.name,
        passed: false,
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
    
    // Check expectations
    if (test.expect !== undefined) {
      const passed = checkExpectation(result, test.expect);
      if (!passed) {
        return {
          name: test.name,
          passed: false,
          duration: Date.now() - startTime,
          error: 'Expectation mismatch',
          expected: test.expect,
          actual: result,
        };
      }
    }
    
    // Check store expectations
    if (test.expectStore) {
      for (const [key, expected] of Object.entries(test.expectStore)) {
        const actual = storeInstance.data[key];
        if (!deepEqual(actual, expected)) {
          return {
            name: test.name,
            passed: false,
            duration: Date.now() - startTime,
            error: `Store expectation failed for key "${key}"`,
            expected,
            actual,
          };
        }
      }
    }
    
    return {
      name: test.name,
      passed: true,
      duration: Date.now() - startTime,
    };
  } catch (e) {
    fetchInterceptor.restore();
    return {
      name: test.name,
      passed: false,
      duration: Date.now() - startTime,
      error: (e as Error).message,
    };
  }
}

/**
 * Check if result matches expectation
 */
function checkExpectation(actual: any, expected: any): boolean {
  // Direct equality for primitives
  if (typeof expected !== 'object' || expected === null) {
    return actual === expected;
  }
  
  // Function expectation (custom assertion)
  if (typeof expected === 'function') {
    return expected(actual);
  }
  
  // Object/array - check each property
  for (const [key, value] of Object.entries(expected)) {
    if (!checkExpectation(actual?.[key], value)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Run all tests from a YAML file (supports both bit tests and workflow tests)
 */
export async function runYamlTestFile(filePath: string): Promise<TestSuiteResult> {
  const startTime = Date.now();
  const testFile = loadYamlTests(filePath);
  const basePath = path.dirname(filePath);
  
  // Check if this is a workflow test
  if ((testFile as any).workflow) {
    return runWorkflowTestFile(filePath, basePath, startTime);
  }
  
  if (!testFile.bit) {
    return {
      bitPath: filePath,
      results: [{
        name: 'Invalid test file',
        passed: false,
        duration: 0,
        error: 'Test file must have either "bit:" or "workflow:" property',
      }],
      passed: 0,
      failed: 1,
      duration: Date.now() - startTime,
    };
  }
  
  // Find the bit's package directory for module resolution
  let fullPath = testFile.bit.startsWith('.')
    ? path.resolve(basePath, testFile.bit)
    : testFile.bit;
  
  let bitDir = path.dirname(fullPath);
  while (bitDir !== '/' && !fs.existsSync(path.join(bitDir, 'node_modules'))) {
    bitDir = path.dirname(bitDir);
  }
  
  const results: TestResult[] = [];
  
  for (const test of testFile.tests) {
    // Setup mocks BEFORE loading the bit
    const fetchMocks = test.mocks?.fetch || [];
    const moduleMocks = normalizeModulesConfig(test.mocks?.modules);
    const httpModules = test.mocks?.httpModules;
    const clearModules = test.mocks?.clearModules;
    
    // Create and install fetch interceptor
    const fetchInterceptor = createFetchInterceptor(fetchMocks, { 
      httpModules,
      clearModules,
    });
    fetchInterceptor.install(bitDir);
    
    // Apply any mock factories that are registered
    const factoryMocks = applyMockFactories(fetchInterceptor, moduleMocks, bitDir);
    const allModuleMocks = [...moduleMocks, ...factoryMocks];
    
    // Apply module mocks
    const restoreModules = applyModuleMocks(allModuleMocks, [bitDir]);
    
    // Now load the bit (fresh, with mocked fetch)
    const bit = await loadBit(testFile.bit, basePath);
    
    // Determine which action to use
    const actionName = test.action || testFile.action;
    let action: BitAction;
    
    // Check if it's a single action (has 'run' function directly)
    if ('run' in bit && typeof (bit as any).run === 'function') {
      // It's a single action (like createAction result)
      action = bit as BitAction;
    } else if (actionName && (bit as Bit).actions?.[actionName]) {
      // It's a full bit with actions object
      action = (bit as Bit).actions[actionName];
    } else {
      // Try to find the action by export name (e.g., askOpenAI)
      const moduleExports = bit as Record<string, any>;
      const actionExport = Object.values(moduleExports).find(
        (exp: any) => exp && typeof exp === 'object' && typeof exp.run === 'function' &&
          (exp.name === actionName || !actionName)
      );
      
      if (actionExport) {
        action = actionExport as BitAction;
      } else {
        fetchInterceptor.restore();
        restoreModules();
        results.push({
          name: test.name,
          passed: false,
          duration: 0,
          error: `Action "${actionName}" not found in bit. Available: ${Object.keys(moduleExports).join(', ')}`,
        });
        continue;
      }
    }
    
    const result = await runTestWithoutFetchSetup(action, test, fetchInterceptor);
    results.push(result);
  }
  
  return {
    bitPath: filePath,
    results,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    duration: Date.now() - startTime,
  };
}

/**
 * Run TypeScript tests
 */
export async function runTsTestFile(
  filePath: string,
  bit: Bit | BitAction
): Promise<TestSuiteResult> {
  const startTime = Date.now();
  const tests = await loadTsTests(filePath);
  
  const results: TestResult[] = [];
  
  for (const test of tests) {
    const actionName = test.action;
    let action: BitAction;
    
    if ('run' in bit && typeof bit.run === 'function') {
      action = bit as BitAction;
    } else if (actionName && (bit as Bit).actions?.[actionName]) {
      action = (bit as Bit).actions[actionName];
    } else {
      results.push({
        name: test.name,
        passed: false,
        duration: 0,
        error: `Action "${actionName}" not found in bit`,
      });
      continue;
    }
    
    const result = await runTest(action, test);
    results.push(result);
  }
  
  return {
    bitPath: filePath,
    results,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    duration: Date.now() - startTime,
  };
}

/**
 * Helper to define bit tests (for TypeScript test files)
 */
export function defineBitTests(
  bit: Bit | BitAction,
  tests: BitTestDefinition[]
): BitTestDefinition[] {
  // Store reference to bit for later use
  (tests as any).__bit__ = bit;
  return tests;
}

/**
 * Run TypeScript test file autonomously
 * Derives the bit path from the test file name:
 *   index.test.ts → index.ts (or ../index.ts)
 */
export async function runTsTestFileAuto(filePath: string): Promise<TestSuiteResult> {
  const startTime = Date.now();
  const basePath = path.dirname(filePath);
  
  // Derive bit path from test file name
  // Pattern: <name>.sdk.test.ts or <name>.test.ts → <name>.ts
  const fileName = path.basename(filePath);
  let bitFileName = fileName
    .replace(/\.test\.(ts|js)$/, '.ts');
  
  // Look for the bit file
  let bitPath = path.join(basePath, bitFileName);
  if (!fs.existsSync(bitPath)) {
    // Try parent directory
    bitPath = path.join(basePath, '..', bitFileName);
    if (!fs.existsSync(bitPath)) {
      // Try index.ts in parent
      bitPath = path.join(basePath, '..', 'index.ts');
    }
  }
  
  // Find the bit's package directory
  let bitDir = basePath;
  while (bitDir !== '/' && !fs.existsSync(path.join(bitDir, 'node_modules'))) {
    bitDir = path.dirname(bitDir);
  }
  
  // Load test definitions (from compiled JS)
  let jsFilePath = filePath
    .replace('/src/', '/dist/')
    .replace('.ts', '.js');
  
  if (!fs.existsSync(jsFilePath)) {
    // Try alternate dist path
    jsFilePath = filePath.replace(/\/src\/([^/]+)\.ts$/, '/dist/$1.js');
  }
  
  const tests = await loadTsTests(jsFilePath);
  const results: TestResult[] = [];
  
  for (const test of tests) {
    // Setup mocks BEFORE loading the bit
    const fetchMocks = test.mocks?.fetch || [];
    const moduleMocks = normalizeModulesConfig(test.mocks?.modules);
    const httpModules = test.mocks?.httpModules;
    const clearModules = test.mocks?.clearModules;
    
    // Create and install fetch interceptor
    const fetchInterceptor = createFetchInterceptor(fetchMocks, {
      httpModules,
      clearModules,
    });
    fetchInterceptor.install(bitDir);
    
    // Apply any mock factories that are registered
    const factoryMocks = applyMockFactories(fetchInterceptor, moduleMocks, bitDir);
    const allModuleMocks = [...moduleMocks, ...factoryMocks];
    
    // Apply module mocks (including custom SDK mocks if provided) - pass bitDir for resolution
    const restoreModules = applyModuleMocks(allModuleMocks, [bitDir]);
    
    // Now load the bit (fresh, with mocks)
    const bit = await loadBit(bitPath, basePath);
    
    // Determine which action to use
    const actionName = test.action;
    let action: BitAction;
    
    if ('run' in bit && typeof (bit as any).run === 'function') {
      action = bit as BitAction;
    } else if (actionName && (bit as Bit).actions?.[actionName]) {
      action = (bit as Bit).actions[actionName];
    } else {
      // Try to find the action by export name
      const moduleExports = bit as Record<string, any>;
      const actionExport = Object.values(moduleExports).find(
        (exp: any) => exp && typeof exp === 'object' && typeof exp.run === 'function' &&
          (exp.name === actionName || !actionName)
      );
      
      if (actionExport) {
        action = actionExport as BitAction;
      } else {
        fetchInterceptor.restore();
        restoreModules();
        results.push({
          name: test.name,
          passed: false,
          duration: 0,
          error: `Action "${actionName}" not found in bit. Available: ${Object.keys(moduleExports).join(', ')}`,
        });
        continue;
      }
    }
    
    const result = await runTestWithoutFetchSetup(action, test, fetchInterceptor);
    restoreModules();
    results.push(result);
  }
  
  return {
    bitPath: filePath,
    results,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    duration: Date.now() - startTime,
  };
}