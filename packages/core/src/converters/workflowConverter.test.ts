/**
 * Unit Tests for Workflow Converters
 * Tests Script workflow conversion to Habits format
 * 
 * Supported formats: Habits, Script
 * 
 * These tests assert complete input→output transformations as whole JSON objects.
 * 
 * Run with: cd packages/core && npx jest src/converters/workflowConverter.test.ts
 */

import {
  ScriptWorkflowConverter,
  detectWorkflowType,
  convertWorkflow,
  convertWorkflowWithConnections,
  getWorkflowTypeName,
} from './index';

import type {
  FrontendWorkflow,
  ScriptWorkflow,
} from '../types';

// ============================================================================
// Test Data - Inputs
// ============================================================================

const sampleScriptWorkflow: ScriptWorkflow = {
  summary: 'Test Script Workflow',
  description: 'A test workflow for script conversion',
  value: {
    modules: [
      {
        id: 'script-1',
        summary: 'Fetch Data',
        value: {
          type: 'rawscript',
          content: 'export async function main() { return { data: "test" }; }',
          language: 'deno',
          lock: '',
          inputTransforms: {
            url: { expr: 'flow_input.url', type: 'javascript' },
          },
        },
      },
    ],
    failureModule: {
      id: 'failure-handler',
      summary: 'Error Handler',
      value: {
        type: 'rawscript',
        content: 'export async function main(error) { console.error(error); }',
        language: 'deno',
      },
    },
  },
  schema: {
    type: 'object',
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    required: ['url'],
    properties: {
      url: { type: 'string', description: 'API URL' },
    },
  },
};

const sampleHabitsWorkflow: FrontendWorkflow = {
  id: 'habits-test-1',
  name: 'Test Habits Workflow',
  description: 'A native habits workflow',
  version: '1.0.0',
  nodes: [
    {
      id: 'node-1',
      type: 'bits',
      position: { x: 100, y: 100 },
      data: {
        label: 'Webhook',
        framework: 'bits',
        module: 'bit-webhook',
        params: {},
      },
    },
    {
      id: 'node-2',
      type: 'bits',
      position: { x: 300, y: 100 },
      data: {
        label: 'HTTP Request',
        framework: 'bits',
        module: 'bit-http',
        params: {
          url: '{{habits.env.API_URL}}',
        },
      },
    },
  ],
  edges: [
    { id: 'edge-1', source: 'node-1', target: 'node-2' },
  ],
};

// ============================================================================
// Test Data - Expected Outputs
// ============================================================================

const expectedScriptConversionOutput: FrontendWorkflow = {
  id: expect.any(String),
  name: 'Test Script Workflow',
  description: 'A test workflow for script conversion',
  version: '1.0.0',
  nodes: expect.arrayContaining([
    expect.objectContaining({
      id: 'script-1',
      type: 'script',
      data: expect.objectContaining({
        label: 'Fetch Data',
        framework: 'script',
        module: 'script-rawscript',
        content: 'export async function main() { return { data: "test" }; }',
        language: 'deno',
      }),
    }),
    expect.objectContaining({
      id: 'failure-module',
      data: expect.objectContaining({
        label: 'Error Handler',
      }),
    }),
  ]),
  edges: expect.any(Array),
};

const expectedScriptToScriptOutput: ScriptWorkflow = {
  summary: 'Script Test',
  description: 'Test description',
  value: {
    modules: [
      expect.objectContaining({
        id: 'node-1',
        summary: 'Script Node',
      }),
    ],
  },
  schema: expect.any(Object),
};

// ============================================================================
// Tests - Workflow Type Detection
// ============================================================================

describe('detectWorkflowType', () => {
  const testCases: Array<{ input: any; expected: string; description: string }> = [
    { input: sampleScriptWorkflow, expected: 'script', description: 'script workflow' },
    { input: sampleHabitsWorkflow, expected: 'habits', description: 'habits workflow' },
    { input: { foo: 'bar' }, expected: 'unknown', description: 'unrecognized object' },
    { input: {}, expected: 'unknown', description: 'empty object' },
    { input: null, expected: 'unknown', description: 'null' },
  ];

  it.each(testCases)('should detect $description as $expected', ({ input, expected }) => {
    expect(detectWorkflowType(input)).toBe(expected);
  });
});

describe('getWorkflowTypeName', () => {
  const testCases: Array<{ input: string; expected: string }> = [
    { input: 'script', expected: 'Script' },
    { input: 'habits', expected: 'Habits' },
    { input: 'unknown', expected: 'Unknown' },
  ];

  it.each(testCases)('should return "$expected" for type "$input"', ({ input, expected }) => {
    expect(getWorkflowTypeName(input as any)).toBe(expected);
  });
});

// ============================================================================
// Tests - Script Workflow Conversion (Input → Output)
// ============================================================================

describe('ScriptWorkflowConverter.fromScript', () => {
  it('should convert script workflow to complete habits format', () => {
    const input = sampleScriptWorkflow;
    const output = ScriptWorkflowConverter.fromScript(input);
    
    expect(output).toMatchObject(expectedScriptConversionOutput);
  });
});

describe('ScriptWorkflowConverter.toScript', () => {
  it('should convert habits workflow to complete script format', () => {
    const input: FrontendWorkflow = {
      id: 'test-1',
      name: 'Script Test',
      description: 'Test description',
      version: '1.0.0',
      nodes: [
        {
          id: 'node-1',
          type: 'script',
          position: { x: 0, y: 0 },
          data: {
            label: 'Script Node',
            framework: 'script',
            module: 'script-rawscript',
            content: 'console.log("test")',
            language: 'deno',
            params: {},
          },
        },
      ],
      edges: [],
    };

    const output = ScriptWorkflowConverter.toScript(input);
    
    expect(output).toMatchObject(expectedScriptToScriptOutput);
  });
});

describe('ScriptWorkflowConverter.createMatrixWorkflowExample', () => {
  it('should create complete matrix workflow example', () => {
    const expectedOutput: ScriptWorkflow = {
      summary: 'Matrix Message Workflow',
      description: expect.any(String),
      value: {
        modules: [
          expect.objectContaining({
            id: expect.any(String),
            summary: expect.any(String),
            value: expect.objectContaining({
              type: 'rawscript',
              language: 'deno',
            }),
          }),
        ],
      },
      schema: {
        type: 'object',
        $schema: expect.any(String),
        required: expect.arrayContaining(['matrix_res', 'room', 'body']),
        properties: expect.objectContaining({
          matrix_res: expect.any(Object),
          room: expect.any(Object),
          body: expect.any(Object),
        }),
      },
    };

    const output = ScriptWorkflowConverter.createMatrixWorkflowExample();
    expect(output).toMatchObject(expectedOutput);
  });
});

// ============================================================================
// Tests - Universal Converter (Input → Output)
// ============================================================================

describe('convertWorkflow', () => {
  const conversionTestCases = [
    {
      description: 'script workflow',
      input: sampleScriptWorkflow,
      expectedName: 'Test Script Workflow',
    },
  ];

  it.each(conversionTestCases)(
    'should auto-detect and convert $description',
    ({ input, expectedName }) => {
      const output = convertWorkflow(input);
      
      expect(output).toMatchObject({
        name: expectedName,
        nodes: expect.any(Array),
        edges: expect.any(Array),
        version: '1.0.0',
      });
    }
  );

  it('should return habits workflow unchanged', () => {
    const input = sampleHabitsWorkflow;
    const output = convertWorkflow(input);
    
    expect(output).toEqual(input);
  });

  it('should throw for unknown format', () => {
    const input = { foo: 'bar' };
    expect(() => convertWorkflow(input)).toThrow();
  });
});

// ============================================================================
// Tests - Workflow With Connections (Input → Output)
// ============================================================================

describe('convertWorkflowWithConnections', () => {
  it('should convert script workflow with empty connections', () => {
    const input = sampleScriptWorkflow;
    
    const expectedOutput = {
      workflow: expect.objectContaining({
        name: 'Test Script Workflow',
      }),
      connections: [],
    };

    const output = convertWorkflowWithConnections(input);
    expect(output).toMatchObject(expectedOutput);
  });

  it('should return habits workflow with empty connections', () => {
    const input = sampleHabitsWorkflow;
    
    const expectedOutput = {
      workflow: input,
      connections: [],
    };

    const output = convertWorkflowWithConnections(input);
    expect(output).toMatchObject(expectedOutput);
  });
});
