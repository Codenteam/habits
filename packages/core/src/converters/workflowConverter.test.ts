/**
 * Unit Tests for Workflow Converters
 * Tests n8n, Activepieces, and Script workflow conversion to Habits format
 * 
 * These tests assert complete input→output transformations as whole JSON objects.
 * 
 * Run with: cd packages/core && npx jest src/converters/workflowConverter.test.ts
 */

import {
  convertN8nWorkflow,
  convertActivepiecesWorkflow,
  ScriptWorkflowConverter,
  detectWorkflowType,
  convertWorkflow,
  convertWorkflowWithConnections,
  generateEnvContent,
  extractConnectionsFromHabitsWorkflow,
  getWorkflowTypeName,
} from './index';

import type { 
  N8nWorkflow, 
  ActivepiecesWorkflow,
  ExtractedConnection,
} from './types';

import type {
  FrontendWorkflow,
  ScriptWorkflow,
} from '../types';

// ============================================================================
// Test Data - Inputs
// ============================================================================

const sampleN8nWorkflow: N8nWorkflow = {
  name: 'Test n8n Workflow',
  nodes: [
    {
      id: 'node-1',
      name: 'Webhook Trigger',
      type: 'n8n-nodes-webhook',
      position: [100, 200],
      parameters: {
        resource: 'webhook',
        operation: 'trigger',
      },
    },
    {
      id: 'node-2',
      name: 'HTTP Request',
      type: 'n8n-nodes-base.httpRequest',
      position: [300, 200],
      parameters: {
        url: 'https://api.example.com',
        method: 'POST',
      },
    },
  ],
  connections: {
    'Webhook Trigger': {
      main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
    },
  },
};

const sampleActivepiecesWorkflow: ActivepiecesWorkflow = {
  displayName: 'Test Activepieces Workflow',
  trigger: {
    name: 'trigger',
    type: 'PIECE_TRIGGER',
    displayName: 'Web Form',
    settings: {
      pieceName: '@activepieces/piece-forms',
      triggerName: 'form_submission',
      input: {},
    },
    nextAction: {
      name: 'step_1',
      type: 'PIECE',
      displayName: 'HTTP Request',
      settings: {
        pieceName: '@activepieces/piece-http',
        actionName: 'send_request',
        input: {
          url: 'https://api.example.com',
          method: 'GET',
        },
      },
    },
  },
};

const sampleActivepiecesWorkflowWithConnections: ActivepiecesWorkflow = {
  displayName: 'Test with Connections',
  trigger: {
    name: 'trigger',
    type: 'PIECE_TRIGGER',
    displayName: 'Webhook',
    settings: {
      pieceName: '@activepieces/piece-webhook',
      triggerName: 'webhook',
      input: {
        apiKey: "{{connections['api-key-123']}}",
      },
    },
    nextAction: {
      name: 'step_1',
      type: 'PIECE',
      displayName: 'Database Query',
      settings: {
        pieceName: '@activepieces/piece-postgres',
        actionName: 'query',
        input: {
          connectionString: "{{connections['db-conn-456']}}",
          query: 'SELECT * FROM users',
        },
      },
    },
  },
};

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
      type: 'n8n',
      position: { x: 100, y: 100 },
      data: {
        label: 'Webhook',
        framework: 'n8n',
        module: 'n8n-nodes-webhook',
        params: {},
      },
    },
    {
      id: 'node-2',
      type: 'activepieces',
      position: { x: 300, y: 100 },
      data: {
        label: 'HTTP Request',
        framework: 'activepieces',
        module: '@activepieces/piece-http',
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

const expectedN8nConversionOutput: FrontendWorkflow = {
  id: expect.stringMatching(/^imported-n8n-/),
  name: 'Test n8n Workflow',
  version: '1.0.0',
  nodes: [
    {
      id: 'node-1',
      type: 'n8n',
      position: { x: 100, y: 200 },
      data: {
        label: 'Webhook Trigger',
        framework: 'n8n',
        module: 'n8n-nodes-webhook',
        resource: 'webhook',
        operation: 'trigger',
        params: {
          resource: 'webhook',
          operation: 'trigger',
        },
      },
    },
    {
      id: 'node-2',
      type: 'n8n',
      position: { x: 300, y: 200 },
      data: {
        label: 'HTTP Request',
        framework: 'n8n',
        module: 'n8n-nodes-base.httpRequest',
        resource: '',
        operation: '',
        params: {
          url: 'https://api.example.com',
          method: 'POST',
        },
      },
    },
  ],
  edges: [
    {
      id: expect.stringMatching(/^edge-/),
      source: 'node-1',
      target: 'node-2',
    },
  ],
};

const expectedActivepiecesConversionOutput = {
  workflow: {
    id: expect.stringMatching(/^imported-ap-/),
    name: 'Test Activepieces Workflow',
    version: '1.0.0',
    nodes: [
      expect.objectContaining({
        id: expect.any(String),
        type: 'activepieces',
        data: expect.objectContaining({
          label: 'Web Form',
          framework: 'activepieces',
          module: '@activepieces/piece-forms',
          operation: 'form_submission',
          params: {},
        }),
      }),
      expect.objectContaining({
        id: expect.any(String),
        type: 'activepieces',
        data: expect.objectContaining({
          label: 'HTTP Request',
          framework: 'activepieces',
          module: '@activepieces/piece-http',
          operation: 'send_request',
          params: {
            url: 'https://api.example.com',
            method: 'GET',
          },
        }),
      }),
    ],
    edges: [
      expect.objectContaining({
        id: expect.stringMatching(/^edge-/),
        source: expect.any(String),
        target: expect.any(String),
      }),
    ],
  },
  connections: [],
};

const expectedActivepiecesWithConnectionsOutput = {
  workflow: {
    id: expect.stringMatching(/^imported-ap-/),
    name: 'Test with Connections',
    version: '1.0.0',
    nodes: expect.arrayContaining([
      expect.objectContaining({
        id: expect.any(String),
        data: expect.objectContaining({
          params: expect.objectContaining({
            apiKey: expect.stringMatching(/\{\{habits\.env\.[A-Z_]+\}\}/),
          }),
        }),
      }),
      expect.objectContaining({
        id: expect.any(String),
        data: expect.objectContaining({
          params: expect.objectContaining({
            connectionString: expect.stringMatching(/\{\{habits\.env\.[A-Z_]+\}\}/),
            query: 'SELECT * FROM users',
          }),
        }),
      }),
    ]),
    edges: expect.any(Array),
  },
  connections: expect.arrayContaining([
    expect.objectContaining({
      originalId: 'api-key-123',
      envVarName: expect.stringMatching(/APIKEY$/),
    }),
    expect.objectContaining({
      originalId: 'db-conn-456',
      envVarName: expect.stringMatching(/CONNECTIONSTRING$/),
    }),
  ]),
};

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
    { input: sampleN8nWorkflow, expected: 'n8n', description: 'n8n workflow' },
    { input: sampleActivepiecesWorkflow, expected: 'activepieces', description: 'activepieces workflow' },
    { input: { template: sampleActivepiecesWorkflow }, expected: 'activepieces-template', description: 'activepieces template' },
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
    { input: 'n8n', expected: 'n8n' },
    { input: 'activepieces', expected: 'Activepieces' },
    { input: 'activepieces-template', expected: 'Activepieces Template' },
    { input: 'script', expected: 'Script' },
    { input: 'habits', expected: 'Habits' },
    { input: 'unknown', expected: 'Unknown' },
  ];

  it.each(testCases)('should return "$expected" for type "$input"', ({ input, expected }) => {
    expect(getWorkflowTypeName(input as any)).toBe(expected);
  });
});

// ============================================================================
// Tests - N8N Workflow Conversion (Input → Output)
// ============================================================================

describe('convertN8nWorkflow', () => {
  it('should convert n8n workflow to complete habits format', () => {
    const input = sampleN8nWorkflow;
    const output = convertN8nWorkflow(input);
    
    expect(output).toMatchObject(expectedN8nConversionOutput);
  });

  it('should generate stable output structure for workflow without IDs', () => {
    const input: N8nWorkflow = {
      name: 'No ID Workflow',
      nodes: [
        { name: 'Node1', type: 'test-node', position: [50, 100] },
      ],
      connections: {},
    };

    const expectedOutput = {
      id: expect.stringMatching(/^imported-n8n-/),
      name: 'No ID Workflow',
      version: '1.0.0',
      nodes: [
        {
          id: expect.any(String),
          type: 'n8n',
          position: { x: 50, y: 100 },
          data: {
            label: 'Node1',
            framework: 'n8n',
            module: 'n8n-nodes-test-node',
            params: {},
          },
        },
      ],
      edges: [],
    };

    const output = convertN8nWorkflow(input);
    expect(output).toMatchObject(expectedOutput);
  });
});

// ============================================================================
// Tests - Activepieces Workflow Conversion (Input → Output)
// ============================================================================

describe('convertActivepiecesWorkflow', () => {
  it('should convert activepieces workflow to complete habits format with connections', () => {
    const input = sampleActivepiecesWorkflow;
    const output = convertActivepiecesWorkflow(input);
    
    expect(output).toMatchObject(expectedActivepiecesConversionOutput);
  });

  it('should extract connections and convert to habits.env format', () => {
    const input = sampleActivepiecesWorkflowWithConnections;
    const output = convertActivepiecesWorkflow(input);
    
    expect(output).toMatchObject(expectedActivepiecesWithConnectionsOutput);
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
      description: 'n8n workflow',
      input: sampleN8nWorkflow,
      expectedName: 'Test n8n Workflow',
    },
    {
      description: 'activepieces workflow',
      input: sampleActivepiecesWorkflow,
      expectedName: 'Test Activepieces Workflow',
    },
    {
      description: 'script workflow',
      input: sampleScriptWorkflow,
      expectedName: 'Test Script Workflow',
    },
    {
      description: 'activepieces template',
      input: { template: sampleActivepiecesWorkflow },
      expectedName: 'Test Activepieces Workflow',
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
// Tests - Connection Extraction (Input → Output)
// ============================================================================

describe('convertWorkflowWithConnections', () => {
  it('should convert activepieces workflow and extract connections', () => {
    const input = sampleActivepiecesWorkflowWithConnections;
    
    const expectedOutput = {
      workflow: expect.objectContaining({
        name: 'Test with Connections',
        nodes: expect.any(Array),
      }),
      connections: expect.arrayContaining([
        expect.objectContaining({ originalId: 'api-key-123' }),
        expect.objectContaining({ originalId: 'db-conn-456' }),
      ]),
    };

    const output = convertWorkflowWithConnections(input);
    expect(output).toMatchObject(expectedOutput);
  });

  it('should convert n8n workflow with empty connections', () => {
    const input = sampleN8nWorkflow;
    
    const expectedOutput = {
      workflow: expect.objectContaining({
        name: 'Test n8n Workflow',
      }),
      connections: [],
    };

    const output = convertWorkflowWithConnections(input);
    expect(output).toMatchObject(expectedOutput);
  });

  it('should extract connections from habits workflow', () => {
    const input = sampleHabitsWorkflow;
    
    const expectedOutput = {
      workflow: input,
      connections: expect.arrayContaining([
        expect.objectContaining({
          envVarName: 'API_URL',
          nodeId: 'node-2',
        }),
      ]),
    };

    const output = convertWorkflowWithConnections(input);
    expect(output).toMatchObject(expectedOutput);
  });
});

describe('extractConnectionsFromHabitsWorkflow', () => {
  it('should extract habits.env references from workflow', () => {
    const input = sampleHabitsWorkflow;
    
    const expectedOutput: ExtractedConnection[] = [
      {
        originalId: '',
        envVarName: 'API_URL',
        nodeId: 'node-2',
        nodeLabel: 'HTTP Request',
        paramName: 'url',
        originalValue: '{{habits.env.API_URL}}',
      },
    ];

    const output = extractConnectionsFromHabitsWorkflow(input);
    expect(output).toEqual(expectedOutput);
  });

  it('should extract activepieces connection format from habits workflow', () => {
    const input: FrontendWorkflow = {
      id: 'test',
      name: 'Test',
      version: '1.0.0',
      nodes: [
        {
          id: 'node-1',
          type: 'activepieces',
          position: { x: 0, y: 0 },
          data: {
            label: 'Test Node',
            framework: 'activepieces',
            module: 'test',
            params: {
              auth: "{{connections['my-conn-id']}}",
            },
          },
        },
      ],
      edges: [],
    };

    const expectedOutput = [
      expect.objectContaining({
        originalId: 'my-conn-id',
        nodeId: 'node-1',
        nodeLabel: 'Test Node',
        paramName: 'auth',
      }),
    ];

    const output = extractConnectionsFromHabitsWorkflow(input);
    expect(output).toMatchObject(expectedOutput);
  });
});

// ============================================================================
// Tests - Environment Content Generation (Input → Output)
// ============================================================================

describe('generateEnvContent', () => {
  it('should generate complete .env content from connections', () => {
    const inputWorkflowName = 'Test Workflow';
    const inputConnections: ExtractedConnection[] = [
      {
        originalId: 'conn-1',
        envVarName: 'API_KEY',
        nodeId: 'node-1',
        nodeLabel: 'HTTP Request',
        paramName: 'apiKey',
        originalValue: "{{connections['conn-1']}}",
      },
      {
        originalId: 'conn-2',
        envVarName: 'DB_URL',
        nodeId: 'node-2',
        nodeLabel: 'Database',
        paramName: 'url',
        originalValue: "{{connections['conn-2']}}",
      },
    ];

    const output = generateEnvContent(inputWorkflowName, inputConnections);

    // Assert complete structure
    expect(output).toContain('# Environment variables for Test Workflow');
    expect(output).toContain('# HTTP Request');
    expect(output).toContain('API_KEY=<your-apiKey-here>');
    expect(output).toContain('# Database');
    expect(output).toContain('DB_URL=<your-url-here>');
    expect(output).toMatch(/Generated on/);
  });

  it('should generate minimal .env content for empty connections', () => {
    const inputWorkflowName = 'Empty Workflow';
    const inputConnections: ExtractedConnection[] = [];

    const output = generateEnvContent(inputWorkflowName, inputConnections);

    expect(output).toContain('# Environment variables for Empty Workflow');
    expect(output).toMatch(/Generated on/);
    expect(output).not.toContain('=<your-');
  });
});
