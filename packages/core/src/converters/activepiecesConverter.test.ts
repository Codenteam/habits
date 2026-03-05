/**
 * Unit tests for Activepieces Converter
 * Tests conversion from Activepieces export format to Habits workflow format
 * 
 * Run with: cd packages/core && npx jest src/converters/activepiecesConverter.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { 
  convertActivepiecesWorkflow, 
  detectWorkflowType,
  convertWorkflow
} from './index';
import type { ActivepiecesWorkflow } from './types';

// ============================================================================
// Test Data Paths
// ============================================================================

// Find the workspace root by going up from the current file
function findWorkspaceRoot(): string {
  let dir = __dirname;
  // Keep going up until we find packages folder or hit root
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'packages')) && fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  // Fallback to process.cwd() for running from repo root
  return process.cwd();
}

const WORKSPACE_ROOT = findWorkspaceRoot();
const IMAP_SMTP_JSON_PATH = path.join(WORKSPACE_ROOT, 'examples/activepieces-export/imap_stmp_activepieces.json');
const EXPECTED_HABIT_YAML_PATH = path.join(WORKSPACE_ROOT, 'examples/activepieces-export/habit.yaml');

// ============================================================================
// Types
// ============================================================================

interface ActivepiecesExport {
  name: string;
  flows: ActivepiecesWorkflow[];
  pieces: string[];
  [key: string]: any;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Load and parse the Activepieces JSON export file
 */
function loadActivepiecesExport(filePath: string): ActivepiecesExport {
  let content = fs.readFileSync(filePath, 'utf8');
  // Remove BOM if present
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return JSON.parse(content);
}

/**
 * Load and parse the expected Habits YAML file
 */
function loadExpectedHabitsWorkflow(filePath: string): any {
  const content = fs.readFileSync(filePath, 'utf8');
  return yaml.parse(content);
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Activepieces Converter', () => {
  let apExport: ActivepiecesExport;
  let expectedWorkflow: any;
  let singleFlow: ActivepiecesWorkflow;

  beforeAll(() => {
    // Load test data
    apExport = loadActivepiecesExport(IMAP_SMTP_JSON_PATH);
    expectedWorkflow = loadExpectedHabitsWorkflow(EXPECTED_HABIT_YAML_PATH);
    singleFlow = apExport.flows[0];
  });

  describe('detectWorkflowType', () => {
    it('should detect activepieces workflow type', () => {
      const detectedType = detectWorkflowType(singleFlow);
      expect(detectedType).toBe('activepieces');
    });

    it('should return unknown for invalid input', () => {
      expect(detectWorkflowType(null)).toBe('unknown');
      expect(detectWorkflowType(undefined)).toBe('unknown');
      expect(detectWorkflowType({})).toBe('unknown');
    });
  });

  describe('convertActivepiecesWorkflow', () => {
    let conversionResult: ReturnType<typeof convertActivepiecesWorkflow>;

    beforeAll(() => {
      conversionResult = convertActivepiecesWorkflow(singleFlow);
    });

    it('should return a valid conversion result', () => {
      expect(conversionResult).toBeDefined();
      expect(conversionResult.workflow).toBeDefined();
    });

    it('should have nodes array', () => {
      expect(conversionResult.workflow.nodes).toBeDefined();
      expect(Array.isArray(conversionResult.workflow.nodes)).toBe(true);
    });

    it('should have edges array', () => {
      expect(conversionResult.workflow.edges).toBeDefined();
      expect(Array.isArray(conversionResult.workflow.edges)).toBe(true);
    });

    it('should have correct node count', () => {
      expect(conversionResult.workflow.nodes.length).toBe(expectedWorkflow.nodes.length);
    });

    it('should have correct edge count', () => {
      expect(conversionResult.workflow.edges.length).toBe(expectedWorkflow.edges.length);
    });
  });

  describe('Trigger Node Structure', () => {
    let conversionResult: ReturnType<typeof convertActivepiecesWorkflow>;
    let actualTrigger: any;
    let expectedTrigger: any;

    beforeAll(() => {
      conversionResult = convertActivepiecesWorkflow(singleFlow);
      actualTrigger = conversionResult.workflow.nodes[0];
      expectedTrigger = expectedWorkflow.nodes[0];
    });

    it('should have correct node type', () => {
      expect(actualTrigger.type).toBe('activepieces');
    });

    it('should have correct framework', () => {
      expect(actualTrigger.data.framework).toBe('activepieces');
    });

    it('should have correct module', () => {
      expect(actualTrigger.data.module).toBe(expectedTrigger.data.module);
    });

    it('should have correct operation', () => {
      expect(actualTrigger.data.operation).toBe(expectedTrigger.data.operation);
    });
  });

  describe('Action Node Structure', () => {
    let conversionResult: ReturnType<typeof convertActivepiecesWorkflow>;
    let actualAction: any;
    let expectedAction: any;

    beforeAll(() => {
      conversionResult = convertActivepiecesWorkflow(singleFlow);
      actualAction = conversionResult.workflow.nodes[1];
      expectedAction = expectedWorkflow.nodes[1];
    });

    it('should have correct node type', () => {
      expect(actualAction.type).toBe('activepieces');
    });

    it('should have correct framework', () => {
      expect(actualAction.data.framework).toBe('activepieces');
    });

    it('should have correct module', () => {
      expect(actualAction.data.module).toBe(expectedAction.data.module);
    });

    it('should have correct operation', () => {
      expect(actualAction.data.operation).toBe(expectedAction.data.operation);
    });
  });

  describe('Edge Connectivity', () => {
    let conversionResult: ReturnType<typeof convertActivepiecesWorkflow>;

    beforeAll(() => {
      conversionResult = convertActivepiecesWorkflow(singleFlow);
    });

    it('should have edge source matching trigger node ID', () => {
      const edge = conversionResult.workflow.edges[0];
      const triggerNodeId = conversionResult.workflow.nodes[0].id;
      expect(edge.source).toBe(triggerNodeId);
    });

    it('should have edge target matching action node ID', () => {
      const edge = conversionResult.workflow.edges[0];
      const actionNodeId = conversionResult.workflow.nodes[1].id;
      expect(edge.target).toBe(actionNodeId);
    });
  });

  describe('Full Workflow Structure', () => {
    it('should match expected workflow structure', () => {
      const conversionResult = convertActivepiecesWorkflow(singleFlow);
      
      const workflowStructure = {
        nodeCount: conversionResult.workflow.nodes.length,
        edgeCount: conversionResult.workflow.edges.length,
        nodeTypes: conversionResult.workflow.nodes.map(n => n.type),
        frameworks: conversionResult.workflow.nodes.map(n => n.data.framework),
        modules: conversionResult.workflow.nodes.map(n => n.data.module),
        operations: conversionResult.workflow.nodes.map(n => n.data.operation),
      };

      const expectedStructure = {
        nodeCount: expectedWorkflow.nodes.length,
        edgeCount: expectedWorkflow.edges.length,
        nodeTypes: expectedWorkflow.nodes.map((n: any) => n.type),
        frameworks: expectedWorkflow.nodes.map((n: any) => n.data.framework),
        modules: expectedWorkflow.nodes.map((n: any) => n.data.module),
        operations: expectedWorkflow.nodes.map((n: any) => n.data.operation),
      };

      expect(workflowStructure).toEqual(expectedStructure);
    });
  });

  describe('convertWorkflow (generic converter)', () => {
    it('should convert activepieces workflow using generic convertWorkflow', () => {
      const result = convertWorkflow(singleFlow);
      
      expect(result).toBeDefined();
      expect(result.nodes).toBeDefined();
      expect(result.edges).toBeDefined();
      expect(result.nodes.length).toBe(expectedWorkflow.nodes.length);
    });

    it('should detect and convert activepieces format correctly', () => {
      const result = convertWorkflow(singleFlow);
      
      // Verify first node is the IMAP trigger
      expect(result.nodes[0].data.module).toBe('@activepieces/piece-imap');
      expect(result.nodes[0].data.operation).toBe('new_email');
      
      // Verify second node is the SMTP action
      expect(result.nodes[1].data.module).toBe('@activepieces/piece-smtp');
      expect(result.nodes[1].data.operation).toBe('send-email');
    });

    it('should throw error for unknown workflow format', () => {
      expect(() => convertWorkflow({ invalid: 'workflow' })).toThrow(
        'Unknown workflow format'
      );
    });
  });

  describe('Loaded Test Data Validation', () => {
    it('should load valid Activepieces export', () => {
      expect(apExport.name).toBeDefined();
      expect(apExport.flows).toBeDefined();
      expect(apExport.flows.length).toBeGreaterThan(0);
    });

    it('should load valid expected workflow', () => {
      expect(expectedWorkflow.id).toBeDefined();
      expect(expectedWorkflow.nodes).toBeDefined();
      expect(expectedWorkflow.edges).toBeDefined();
    });

    it('should have expected workflow ID', () => {
      expect(expectedWorkflow.id).toBe('imap-smtp-email-workflow');
    });
  });
});
