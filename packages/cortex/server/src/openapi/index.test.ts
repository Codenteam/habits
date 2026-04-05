/**
 * Unit tests for OpenAPI dynamic generation
 * Run with: cd packages/cortex/server && npx jest
 */

import { extractWorkflowHabitsSchema } from './index';
import { getComponentSchemas } from './schemas';
import type { FrontendWorkflow } from '@ha-bits/core';

// ============================================================
// Test Fixtures
// ============================================================

const emptyWorkflow: FrontendWorkflow = {
  id: 'empty-1',
  name: 'empty-workflow',
  nodes: [],
  edges: [],
  version: '1.0'
};

const workflowWithInputRefs: FrontendWorkflow = {
  id: 'input-1',
  name: 'input-workflow',
  nodes: [
    {
      id: 'node-1',
      type: 'bits',
      position: { x: 0, y: 0 },
      data: {
        label: 'HTTP Request',
        framework: 'bits',
        module: 'bit-http',
        params: {
          url: 'https://api.example.com/users/{{habits.input.userId}}',
          body: '{"prompt": "{{habits.input.prompt}}", "context": "{{habits.input.context}}"}'
        }
      }
    }
  ],
  edges: [],
  version: '1.0'
};

const workflowWithHeaderRefs: FrontendWorkflow = {
  id: 'header-1',
  name: 'header-workflow',
  nodes: [
    {
      id: 'node-1',
      type: 'bits',
      position: { x: 0, y: 0 },
      data: {
        label: 'API Call',
        framework: 'bits',
        module: 'bit-http',
        params: {
          headers: {
            'Authorization': '{{habits.header.authorization}}',
            'X-Custom': '{{habits.header.customHeader}}'
          }
        }
      }
    }
  ],
  edges: [],
  version: '1.0'
};

const workflowWithCookieRefs: FrontendWorkflow = {
  id: 'cookie-1',
  name: 'cookie-workflow',
  nodes: [
    {
      id: 'node-1',
      type: 'script',
      position: { x: 0, y: 0 },
      data: {
        label: 'Auth Check',
        framework: 'script',
        language: 'typescript',
        content: 'const session = "{{habits.cookies.sessionId}}"; const user = "{{habits.cookies.userId}}";'
      }
    }
  ],
  edges: [],
  version: '1.0'
};

const workflowWithMixedRefs: FrontendWorkflow = {
  id: 'mixed-1',
  name: 'mixed-workflow',
  nodes: [
    {
      id: 'node-1',
      type: 'bits',
      position: { x: 0, y: 0 },
      data: {
        label: 'Mixed Node',
        framework: 'bits',
        module: 'bit-http',
        params: {
          url: '{{habits.input.endpoint}}',
          headers: { 'Auth': '{{habits.header.authToken}}' },
          cookies: '{{habits.cookies.session}}'
        }
      }
    }
  ],
  edges: [],
  version: '1.0'
};

// ============================================================
// Tests
// ============================================================

describe('extractWorkflowHabitsSchema', () => {
  it('returns empty schema for workflow with no habits references', () => {
    const schema = extractWorkflowHabitsSchema(emptyWorkflow);
    expect(Object.keys(schema.input)).toHaveLength(0);
    expect(Object.keys(schema.headers)).toHaveLength(0);
    expect(Object.keys(schema.cookies)).toHaveLength(0);
  });

  it('extracts input field references', () => {
    const schema = extractWorkflowHabitsSchema(workflowWithInputRefs);
    const inputFields = Object.keys(schema.input);
    expect(inputFields).toHaveLength(3);
    expect(inputFields).toContain('userId');
    expect(inputFields).toContain('prompt');
    expect(inputFields).toContain('context');
  });

  it('extracts header field references', () => {
    const schema = extractWorkflowHabitsSchema(workflowWithHeaderRefs);
    const headerFields = Object.keys(schema.headers);
    expect(headerFields).toHaveLength(2);
    expect(headerFields).toContain('authorization');
    expect(headerFields).toContain('customHeader');
  });

  it('extracts cookie field references', () => {
    const schema = extractWorkflowHabitsSchema(workflowWithCookieRefs);
    const cookieFields = Object.keys(schema.cookies);
    expect(cookieFields).toHaveLength(2);
    expect(cookieFields).toContain('sessionId');
    expect(cookieFields).toContain('userId');
  });

  it('extracts mixed references correctly', () => {
    const schema = extractWorkflowHabitsSchema(workflowWithMixedRefs);
    expect(Object.keys(schema.input)).toContain('endpoint');
    expect(Object.keys(schema.headers)).toContain('authToken');
    expect(Object.keys(schema.cookies)).toContain('session');
  });
});

describe('getComponentSchemas', () => {
  const schemas = getComponentSchemas();

  it('returns all required schemas', () => {
    const requiredSchemas = [
      'HealthResponse',
      'WorkflowListResponse',
      'WorkflowDetailResponse',
      'WorkflowDefinition',
      'ExecutionContext',
      'NodeResult',
      'ExecutionResponse',
      'StreamEventNodeResult',
      'StreamEventExecutionResult',
      'StreamEventVerbose',
      'WebhookResponse',
      'WebhookErrorResponse',
      'ErrorResponse'
    ];
    for (const name of requiredSchemas) {
      expect(schemas).toHaveProperty(name);
    }
    expect(Object.keys(schemas)).toHaveLength(13);
  });

  it('ExecutionResponse schema has required properties', () => {
    const execResponse = schemas['ExecutionResponse'];
    expect(execResponse).toHaveProperty('type');
    expect(execResponse).toHaveProperty('properties');
    const props = execResponse.properties as Record<string, unknown>;
    expect(props).toHaveProperty('executionId');
    expect(props).toHaveProperty('status');
    expect(props).toHaveProperty('nodeResults');
  });

  it('ExecutionContext schema has required fields', () => {
    const execContext = schemas['ExecutionContext'];
    const props = execContext.properties as Record<string, unknown>;
    expect(props).toHaveProperty('executionId');
    expect(props).toHaveProperty('workflowId');
  });
});
