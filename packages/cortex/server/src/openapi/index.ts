/**
 * OpenAPI/Swagger Documentation Generator for Habits Workflow Executor
 * 
 * This module generates OpenAPI 3.0 specification for all API endpoints
 * and provides a Swagger UI for interactive documentation.
 */

import { Application, Request, Response } from 'express';
import { WorkflowExecutor } from '../WorkflowExecutor';
import { Workflow, LoadedWorkflow } from '@habits/shared/types';
import { getComponentSchemas } from './schemas';
import { 
  extractHabitsReferences, 
  extractHabitsSchema, 
  HabitsContextSchema 
} from '@habits/shared/variableUtils';

/**
 * OpenAPI 3.0 Specification
 */
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
    contact?: {
      name?: string;
      email?: string;
      url?: string;
    };
  };
  servers: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
  tags: Array<{
    name: string;
    description: string;
  }>;
}

// Re-export HabitsContextSchema for backward compatibility
export type { HabitsContextSchema } from '@habits/shared/variableUtils';

/**
 * Parse a workflow to extract its expected habits context schema
 * Uses the shared extractHabitsSchema function
 */
export function extractWorkflowHabitsSchema(workflow: Workflow): HabitsContextSchema {
  return extractHabitsSchema(workflow);
}

/**
 * Generate OpenAPI schema for a workflow's request body
 */
function generateWorkflowRequestSchema(schema: HabitsContextSchema): any {
  const hasInput = Object.keys(schema.input).length > 0;
  const hasHeaders = Object.keys(schema.headers).length > 0;
  const hasCookies = Object.keys(schema.cookies).length > 0;

  if (!hasInput && !hasHeaders && !hasCookies) {
    return {
      type: 'object',
      description: 'This workflow does not require any specific input parameters',
      additionalProperties: true,
    };
  }

  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const [field, info] of Object.entries(schema.input)) {
    properties[field] = {
      type: info.type,
      description: info.description,
    };
    if (info.required) {
      required.push(field);
    }
  }

  return {
    type: 'object',
    description: 'Input data for the workflow execution',
    properties,
    required: required.length > 0 ? required : undefined,
    additionalProperties: true,
  };
}

/**
 * Generate OpenAPI parameter definitions for headers
 */
function generateWorkflowHeaderParams(schema: HabitsContextSchema): any[] {
  const params: any[] = [];

  for (const [field, info] of Object.entries(schema.headers)) {
    params.push({
      name: field,
      in: 'header',
      required: info.required,
      description: info.description,
      schema: {
        type: info.type,
      },
    });
  }

  return params;
}

/**
 * Generate description of cookies required by a workflow
 */
function generateCookiesDescription(schema: HabitsContextSchema): string {
  const cookieFields = Object.keys(schema.cookies);
  if (cookieFields.length === 0) return '';
  
  return `\n\n**Required Cookies:** ${cookieFields.map(f => `\`${f}\``).join(', ')}`;
}

/**
 * Generate base paths for the OpenAPI specification
 */
function generateBasePaths(): Record<string, any> {
  return {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns the health status of the server and loaded workflows',
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/misc/health': {
      get: {
        tags: ['Health'],
        summary: 'API health check',
        description: 'Returns the health status of the API (same as /health)',
        operationId: 'getMiscHealth',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/misc/workflows': {
      get: {
        tags: ['Workflows'],
        summary: 'List all workflows',
        description: 'Returns a list of all loaded workflows with their metadata',
        operationId: 'listWorkflows',
        responses: {
          '200': {
            description: 'List of workflows',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WorkflowListResponse' },
              },
            },
          },
        },
      },
    },
    '/misc/workflow/{workflowId}': {
      get: {
        tags: ['Workflows'],
        summary: 'Get workflow details',
        description: 'Returns detailed information about a specific workflow',
        operationId: 'getWorkflow',
        parameters: [
          {
            name: 'workflowId',
            in: 'path',
            required: true,
            description: 'The unique identifier of the workflow',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Workflow details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WorkflowDetailResponse' },
              },
            },
          },
          '404': {
            description: 'Workflow not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/misc/execution/{id}': {
      get: {
        tags: ['Executions'],
        summary: 'Get execution status',
        description: 'Returns the current status and results of a workflow execution',
        operationId: 'getExecution',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'The execution ID',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Execution details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExecutionResponse' },
              },
            },
          },
          '404': {
            description: 'Execution not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Executions'],
        summary: 'Cancel execution',
        description: 'Cancels a running workflow execution',
        operationId: 'cancelExecution',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'The execution ID to cancel',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Execution cancelled',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Execution cancelled' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Execution not found or not running',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/misc/executions': {
      get: {
        tags: ['Executions'],
        summary: 'List all executions',
        description: 'Returns a list of all workflow executions',
        operationId: 'listExecutions',
        responses: {
          '200': {
            description: 'List of executions',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ExecutionResponse' },
                },
              },
            },
          },
        },
      },
    },
  };
}

/**
 * Generate webhook paths for the OpenAPI specification
 */
function generateWebhookPaths(): Record<string, any> {
  return {
    '/webhook/{workflowId}/{nodeId}': {
      get: {
        tags: ['Webhooks'],
        summary: 'Trigger webhook (GET)',
        description: 'Triggers a webhook for a specific workflow and node',
        operationId: 'triggerWebhookGet',
        parameters: [
          { name: 'workflowId', in: 'path', required: true, description: 'The workflow ID', schema: { type: 'string' } },
          { name: 'nodeId', in: 'path', required: true, description: 'The node ID', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Webhook received and processed',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/WebhookResponse' } } },
          },
          '404': {
            description: 'No workflow waiting for this webhook',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/WebhookErrorResponse' } } },
          },
        },
      },
      post: {
        tags: ['Webhooks'],
        summary: 'Trigger webhook (POST)',
        description: 'Triggers a webhook for a specific workflow and node with a payload',
        operationId: 'triggerWebhookPost',
        parameters: [
          { name: 'workflowId', in: 'path', required: true, description: 'The workflow ID', schema: { type: 'string' } },
          { name: 'nodeId', in: 'path', required: true, description: 'The node ID', schema: { type: 'string' } },
        ],
        requestBody: {
          description: 'Webhook payload',
          required: false,
          content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
        },
        responses: {
          '200': {
            description: 'Webhook received and processed',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/WebhookResponse' } } },
          },
          '404': {
            description: 'No workflow waiting for this webhook',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/WebhookErrorResponse' } } },
          },
        },
      },
    },
    '/webhook/health': {
      get: {
        tags: ['Webhooks'],
        summary: 'Webhook health check',
        description: 'Returns the health status of the webhook endpoint',
        operationId: 'getWebhookHealth',
        responses: {
          '200': {
            description: 'Webhook endpoint is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    type: { type: 'string', example: 'webhook-endpoint' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/webhook/list': {
      get: {
        tags: ['Webhooks'],
        summary: 'List registered webhooks',
        description: 'Returns a list of all currently registered webhook listeners',
        operationId: 'listWebhooks',
        responses: {
          '200': {
            description: 'List of registered webhooks',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    webhooks: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          workflowId: { type: 'string' },
                          nodeId: { type: 'string' },
                          path: { type: 'string' },
                          status: { type: 'string', example: 'waiting' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

/**
 * Generate dynamic workflow execute path for a specific workflow
 */
function generateWorkflowExecutePath(
  loadedWorkflow: LoadedWorkflow,
  schemas: Record<string, any>
): { path: string; spec: any; inputSchema?: { name: string; schema: any } } {
  const workflow = loadedWorkflow.workflow;
  const workflowId = workflow.id;
  const habitsSchema = extractWorkflowHabitsSchema(workflow);
  
  const requestSchema = generateWorkflowRequestSchema(habitsSchema);
  const headerParams = generateWorkflowHeaderParams(habitsSchema);
  
  const inputFields = Object.keys(habitsSchema.input);
  const headerFields = Object.keys(habitsSchema.headers);
  const cookieFields = Object.keys(habitsSchema.cookies);
  
  let description = `Execute the **${workflow.name}** API Call.`;
  if (workflow.description) {
    description += `\n\n${workflow.description}`;
  }
  if (inputFields.length > 0) {
    description += `\n\n**Required Input Fields:** ${inputFields.map(f => `\`${f}\``).join(', ')}`;
  }
  if (headerFields.length > 0) {
    description += `\n\n**Required Headers:** ${headerFields.map(f => `\`${f}\``).join(', ')}`;
  }
  if (cookieFields.length > 0) {
    description += `\n\n**Required Cookies:** ${cookieFields.map(f => `\`${f}\``).join(', ')}`;
  }
  
  const pathSpec = {
    post: {
      tags: ['Workflows'],
      summary: `Execute: ${workflow.name}`,
      description: description + `\n\n**Streaming Mode:** Add \`?stream=true\` query parameter or set \`Accept: application/x-ndjson\` header to receive real-time streaming output as JSONL.`,
      operationId: `execute_${workflowId.replace(/[^a-zA-Z0-9]/g, '_')}`,
      parameters: [
        {
          name: 'stream',
          in: 'query',
          required: false,
          description: 'Enable streaming mode. Returns JSONL with real-time node status updates.',
          schema: { type: 'boolean', default: false },
        },
        ...(headerParams.length > 0 ? headerParams : []),
      ],
      requestBody: {
        description: inputFields.length > 0 
          ? `Input data for ${workflow.name}. Required fields: ${inputFields.join(', ')}`
          : 'Optional input data for the workflow',
        required: inputFields.length > 0,
        content: {
          'application/json': {
            schema: requestSchema,
            example: inputFields.length > 0 
              ? Object.fromEntries(inputFields.map(f => [f, `<${f} value>`]))
              : {},
          },
        },
      },
      responses: {
        '200': {
          description: 'Workflow execution result. Response format depends on streaming mode.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ExecutionResponse' },
              example: {
                executionId: 'exec-uuid-1234',
                workflowId: workflowId,
                status: 'completed',
                output: { },
                startTime: '2025-12-29T10:00:00.000Z',
                endTime: '2025-12-29T10:00:05.000Z',
                nodeResults: [],
              },
            },
            'application/x-ndjson': {
              schema: {
                type: 'string',
                description: 'Newline Delimited JSON stream.',
              },
            },
          },
        },
        '403': {
          description: 'Workflow is disabled',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
        '500': {
          description: 'Execution error',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
      },
    },
  };
  
  let inputSchema: { name: string; schema: any } | undefined;
  if (inputFields.length > 0 || headerFields.length > 0 || cookieFields.length > 0) {
    const schemaName = `${workflowId.replace(/[^a-zA-Z0-9]/g, '_')}_Input`;
    inputSchema = {
      name: schemaName,
      schema: {
        type: 'object',
        description: `Input schema for ${workflow.name}`,
        properties: Object.fromEntries(
          inputFields.map(f => [f, { type: 'string', description: `${f} parameter` }])
        ),
        required: inputFields,
      },
    };
  }
  
  return {
    path: `/api/${workflowId}`,
    spec: pathSpec,
    inputSchema,
  };
}

/**
 * Generate OpenAPI specification based on loaded workflows
 */
export function generateOpenAPISpec(
  executor: WorkflowExecutor,
  serverUrl: string = 'http://localhost:3000'
): OpenAPISpec {
  const workflows = executor.getAllWorkflows();
  const componentSchemas = getComponentSchemas();

  const spec: OpenAPISpec = {
    openapi: '3.0.3',
    info: {
      title: 'Habits Workflow Executor API',
      description: `
## Overview

The Habits Workflow Executor API provides endpoints for managing and executing automation workflows.

### Features
- Execute pre-loaded workflows by ID
- Submit and execute ad-hoc workflows
- Monitor execution status
- Receive webhooks for workflow triggers

### Loaded Workflows
${workflows.length > 0 
  ? workflows.map(w => `- **${w.reference.id}**: ${w.workflow.name}${w.reference.enabled === false ? ' *(disabled)*' : ''}`).join('\n')
  : '*No workflows loaded*'
}
      `.trim(),
      version: '1.0.0',
    },
    servers: [
      {
        url: serverUrl,
        description: 'Workflow Executor Server',
      },
    ],
    tags: [
      { name: 'Workflows', description: 'Workflow management and execution endpoints' },
      { name: 'Executions', description: 'Execution monitoring and control endpoints' },
      { name: 'Webhooks', description: 'Webhook endpoints for workflow triggers' },
      { name: 'Health', description: 'Server health and status endpoints' },
    ],
    paths: {
      ...generateBasePaths(),
      ...generateWebhookPaths(),
    },
    components: {
      schemas: { ...componentSchemas },
    },
  };

  // Add dynamic workflow-specific execute paths
  for (const loadedWorkflow of workflows) {
    if (loadedWorkflow.reference.enabled !== false) {
      const { path, spec: pathSpec, inputSchema } = generateWorkflowExecutePath(loadedWorkflow, componentSchemas);
      spec.paths[path] = pathSpec;
      
      if (inputSchema) {
        spec.components.schemas[inputSchema.name] = inputSchema.schema;
      }
    }
  }

  return spec;
}

/**
 * Generate Swagger UI HTML
 */
export function generateSwaggerUIHtml(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Habits Workflow Executor - API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { background-color: #2c3e50; }
    .swagger-ui .topbar .download-url-wrapper .download-url-button { background-color: #3498db; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      const currentPath = window.location.pathname.replace(/\\/$/, '');
      const specUrl = currentPath + '/openapi.json';
      
      window.ui = SwaggerUIBundle({
        url: specUrl,
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: "StandaloneLayout",
        validatorUrl: null,
        tryItOutEnabled: true,
      });
    };
  </script>
</body>
</html>
  `.trim();
}

/**
 * Setup OpenAPI documentation routes on an Express app
 */
export function setupOpenAPIRoutes(
  app: Application,
  executor: WorkflowExecutor,
  options: { basePath?: string; serverUrl?: string } = {}
): void {
  const basePath = options.basePath || '/api/docs';
  const serverUrl = options.serverUrl || 'http://localhost:3000';

  // Serve OpenAPI JSON specification
  app.get(`${basePath}/openapi.json`, (req: Request, res: Response) => {
    const protocol = req.protocol;
    const host = req.get('host') || 'localhost:3000';
    const dynamicServerUrl = `${protocol}://${host}`;
    
    const spec = generateOpenAPISpec(executor, dynamicServerUrl);
    res.json(spec);
  });

  // Serve Swagger UI
  app.get(basePath, (req: Request, res: Response) => {
    const html = generateSwaggerUIHtml();
    res.type('html').send(html);
  });

  // Redirect /api/docs/ to /api/docs
  app.get(`${basePath}/`, (req: Request, res: Response) => {
    res.redirect(basePath);
  });

  console.log(`📚 OpenAPI documentation available at ${basePath}`);
}
