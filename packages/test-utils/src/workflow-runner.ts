/**
 * Workflow test runner
 * Uses the real WorkflowExecutor with call-level mocking (HTTP, modules)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { WorkflowExecutor } from '@ha-bits/cortex';
import {
  WorkflowTestDefinition,
  TestResult,
  TestSuiteResult,
} from './types';
import {
  createFetchInterceptor,
  applyModuleMocks,
  normalizeModulesConfig,
} from './mocks';

/**
 * Workflow execution result for test assertions
 */
interface TestExecution {
  status: 'completed' | 'failed';
  output?: any;
  error?: string;
  nodeOutputs: Record<string, any>;
}

/**
 * Run workflow tests from a YAML file
 */
export async function runWorkflowTestFile(
  filePath: string,
  basePath: string,
  startTime: number
): Promise<TestSuiteResult> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const testFile = yaml.parse(content) as {
    workflow: string;
    tests: WorkflowTestDefinition[];
  };
  
  // Load workflow
  const workflowPath = path.resolve(basePath, testFile.workflow);
  const workflowContent = fs.readFileSync(workflowPath, 'utf-8');
  const workflow = yaml.parse(workflowContent);
  
  const results: TestResult[] = [];
  
  for (const test of testFile.tests) {
    const testStartTime = Date.now();
    
    try {
      // Execute workflow with real executor (call-level mocks applied)
      const execution = await executeWorkflowWithMocks(workflow, test, basePath);
      
      // Check for expected error
      if (test.expectError) {
        const hasError = execution.status === 'failed';
        const errorMsg = execution.error || '';
        
        if (!hasError) {
          results.push({
            name: test.name,
            passed: false,
            duration: Date.now() - testStartTime,
            error: `Expected error "${test.expectError}" but workflow succeeded`,
            expected: test.expectError,
            actual: execution.output,
          });
          continue;
        }
        
        if (!errorMsg.includes(test.expectError)) {
          results.push({
            name: test.name,
            passed: false,
            duration: Date.now() - testStartTime,
            error: 'Error message mismatch',
            expected: test.expectError,
            actual: errorMsg,
          });
          continue;
        }
        
        results.push({
          name: test.name,
          passed: true,
          duration: Date.now() - testStartTime,
        });
        continue;
      }
      
      // Check execution success
      if (execution.status === 'failed') {
        results.push({
          name: test.name,
          passed: false,
          duration: Date.now() - testStartTime,
          error: execution.error || 'Workflow execution failed',
        });
        continue;
      }
      
      // Check step expectations
      if (test.expectSteps) {
        let stepFailed = false;
        for (const [stepId, expectedValue] of Object.entries(test.expectSteps)) {
          const stepResult = execution.nodeOutputs[stepId];
          if (stepResult === undefined) {
            results.push({
              name: test.name,
              passed: false,
              duration: Date.now() - testStartTime,
              error: `Step "${stepId}" not found in execution results`,
            });
            stepFailed = true;
            break;
          }
          
          if (!partialMatch(stepResult, expectedValue)) {
            results.push({
              name: test.name,
              passed: false,
              duration: Date.now() - testStartTime,
              error: `Step "${stepId}" output mismatch`,
              expected: expectedValue,
              actual: stepResult,
            });
            stepFailed = true;
            break;
          }
        }
        if (stepFailed) continue;
      }
      
      // Check final output
      if (test.expect !== undefined) {
        if (!partialMatch(execution.output, test.expect)) {
          results.push({
            name: test.name,
            passed: false,
            duration: Date.now() - testStartTime,
            error: 'Output mismatch',
            expected: test.expect,
            actual: execution.output,
          });
          continue;
        }
      }
      
      results.push({
        name: test.name,
        passed: true,
        duration: Date.now() - testStartTime,
      });
      
    } catch (error: any) {
      results.push({
        name: test.name,
        passed: false,
        duration: Date.now() - testStartTime,
        error: error.message,
      });
    }
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
 * Execute workflow using the real WorkflowExecutor with call-level mocking
 * Mocks HTTP calls (fetch) and module imports (SDKs like openai)
 */
async function executeWorkflowWithMocks(
  workflow: any,
  test: WorkflowTestDefinition,
  _basePath: string
): Promise<TestExecution> {
  // Set up fetch mocks (intercepts HTTP calls made by bits)
  const fetchMocks = test.mocks?.fetch || [];
  const fetchInterceptor = createFetchInterceptor(fetchMocks, {
    httpModules: test.mocks?.httpModules,
    clearModules: test.mocks?.clearModules,
  });

  // Set up module mocks (intercepts SDK imports like openai, axios)
  const moduleMocks = normalizeModulesConfig(test.mocks?.modules);
  const restoreModules = applyModuleMocks(moduleMocks);

  // Build initial context from test
  const initialContext: Record<string, any> = {
    trigger: test.trigger || {},
    ...test.context,
  };

  try {
    // Create executor and run workflow with real execution
    const executor = new WorkflowExecutor();
    const execution = await executor.executeWorkflow(workflow, {
      initialContext,
      triggerData: test.trigger,
    });

    // Build nodeOutputs from execution results
    const nodeOutputs: Record<string, any> = {};
    for (const result of execution.results) {
      nodeOutputs[result.nodeId] = result.result;
    }

    // Determine final output
    let output: any;
    if (workflow.output) {
      output = execution.output;
    } else if (execution.results.length > 0) {
      output = execution.results[execution.results.length - 1].result;
    }

    // Check for failures
    const failedResult = execution.results.find(r => !r.success);
    if (execution.status === 'failed' || failedResult) {
      return {
        status: 'failed',
        error: failedResult?.error || 'Workflow execution failed',
        output,
        nodeOutputs,
      };
    }

    return {
      status: 'completed',
      output,
      nodeOutputs,
    };
  } catch (error: any) {
    return {
      status: 'failed',
      error: error.message,
      nodeOutputs: {},
    };
  } finally {
    // Always restore mocks
    fetchInterceptor.restore();
    restoreModules();
  }
}

/**
 * Check if expected is a subset of actual (partial matching)
 */
function partialMatch(actual: any, expected: any): boolean {
  if (expected === undefined) return true;
  if (actual === expected) return true;
  
  if (typeof expected !== 'object' || expected === null) {
    return actual === expected;
  }
  
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return false;
    return expected.every((item, i) => partialMatch(actual[i], item));
  }
  
  // Object partial match
  if (typeof actual !== 'object' || actual === null) return false;
  
  return Object.keys(expected).every(key => partialMatch(actual[key], expected[key]));
}
