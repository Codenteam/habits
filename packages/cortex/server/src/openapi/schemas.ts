/**
 * OpenAPI Component Schemas
 * 
 * Extracted schema definitions for the Habits Workflow Executor API.
 */

/**
 * Health response schema
 */
export const HealthResponseSchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      example: 'healthy',
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
    },
    configLoaded: {
      type: 'boolean',
    },
    workflowsLoaded: {
      type: 'integer',
    },
    workflows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          enabled: {
            type: 'boolean',
          },
        },
      },
    },
  },
};

/**
 * Workflow list response schema
 */
export const WorkflowListResponseSchema = {
  type: 'object',
  properties: {
    count: {
      type: 'integer',
    },
    workflows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          description: {
            type: 'string',
          },
          enabled: {
            type: 'boolean',
          },
          path: {
            type: 'string',
          },
          nodeCount: {
            type: 'integer',
          },
          edgeCount: {
            type: 'integer',
          },
        },
      },
    },
  },
};

/**
 * Workflow detail response schema
 */
export const WorkflowDetailResponseSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
    description: {
      type: 'string',
    },
    enabled: {
      type: 'boolean',
    },
    workflow: {
      $ref: '#/components/schemas/WorkflowDefinition',
    },
  },
};

/**
 * Workflow definition schema
 */
export const WorkflowDefinitionSchema = {
  type: 'object',
  required: ['name', 'nodes', 'edges'],
  properties: {
    name: {
      type: 'string',
      description: 'Name of the workflow',
    },
    description: {
      type: 'string',
      description: 'Description of the workflow',
    },
    nodes: {
      type: 'array',
      description: 'List of workflow nodes',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          type: {
            type: 'string',
          },
          data: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
    },
    edges: {
      type: 'array',
      description: 'List of connections between nodes',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          source: {
            type: 'string',
          },
          target: {
            type: 'string',
          },
        },
      },
    },
  },
};

/**
 * Execution context schema (base)
 */
export const ExecutionContextSchema = {
  type: 'object',
  description: 'Base execution context - common fields for all responses',
  properties: {
    executionId: {
      type: 'string',
      description: 'Unique execution ID',
    },
    workflowId: {
      type: 'string',
      description: 'ID of the workflow',
    },
  },
  required: ['executionId', 'workflowId'],
};

/**
 * Node result schema
 */
export const NodeResultSchema = {
  type: 'object',
  description: 'Result of a single node execution. Used in both streaming (per-node events) and non-streaming (nodeResults array).',
  properties: {
    executionId: {
      type: 'string',
      description: 'Unique execution ID',
    },
    workflowId: {
      type: 'string',
      description: 'ID of the workflow',
    },
    nodeId: {
      type: 'string',
      description: 'ID of the node',
    },
    nodeName: {
      type: 'string',
      description: 'Human-readable name of the node',
    },
    status: {
      type: 'string',
      enum: ['completed', 'failed'],
      description: 'Node execution status',
    },
    output: {
      type: 'object',
      additionalProperties: true,
      description: 'Output of the node (present if node produced output)',
    },
    error: {
      type: 'string',
      description: 'Error message (present if node failed)',
    },
    duration: {
      type: 'number',
      description: 'Execution duration in milliseconds',
    },
  },
  required: ['executionId', 'workflowId', 'nodeId', 'nodeName', 'status'],
};

/**
 * Execution response schema (non-streaming)
 */
export const ExecutionResponseSchema = {
  type: 'object',
  description: 'Complete workflow execution response (non-streaming mode)',
  properties: {
    executionId: {
      type: 'string',
      description: 'Unique execution ID',
    },
    workflowId: {
      type: 'string',
      description: 'ID of the executed workflow',
    },
    status: {
      type: 'string',
      enum: ['completed', 'failed', 'cancelled'],
      description: 'Final execution status',
    },
    output: {
      type: 'object',
      additionalProperties: true,
      description: 'Final output of the workflow',
    },
    error: {
      type: 'string',
      description: 'Error message (present if execution failed)',
    },
    startTime: {
      type: 'string',
      format: 'date-time',
      description: 'Execution start time (ISO 8601)',
    },
    endTime: {
      type: 'string',
      format: 'date-time',
      description: 'Execution end time (ISO 8601)',
    },
    nodeResults: {
      type: 'array',
      description: 'Results from each node execution',
      items: {
        $ref: '#/components/schemas/NodeResult',
      },
    },
  },
  required: ['executionId', 'workflowId', 'status', 'startTime', 'endTime'],
};

/**
 * Streaming node event schema
 */
export const StreamEventNodeResultSchema = {
  allOf: [
    { $ref: '#/components/schemas/NodeResult' },
  ],
  description: 'Streaming event emitted when a node completes or fails (non-debug mode). Same structure as NodeResult.',
};

/**
 * Streaming execution event schema
 */
export const StreamEventExecutionResultSchema = {
  type: 'object',
  description: 'Streaming event emitted when workflow execution completes or fails',
  properties: {
    executionId: {
      type: 'string',
      description: 'Unique execution ID',
    },
    workflowId: {
      type: 'string',
      description: 'ID of the workflow',
    },
    type: {
      type: 'string',
      enum: ['execution_completed', 'execution_failed'],
      description: 'Event type',
    },
    status: {
      type: 'string',
      enum: ['completed', 'failed'],
      description: 'Execution status',
    },
    output: {
      type: 'object',
      additionalProperties: true,
      description: 'Final workflow output (present on completion)',
    },
    error: {
      type: 'string',
      description: 'Error message (present on failure)',
    },
  },
  required: ['executionId', 'workflowId', 'type', 'status'],
};

/**
 * Verbose streaming event schema (debug mode)
 */
export const StreamEventVerboseSchema = {
  type: 'object',
  description: 'Verbose streaming event (debug mode). Includes all fields plus progress tracking.',
  properties: {
    type: {
      type: 'string',
      enum: ['execution_started', 'node_started', 'node_completed', 'node_failed', 'execution_completed', 'execution_failed'],
      description: 'Event type',
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'ISO 8601 timestamp of the event',
    },
    executionId: {
      type: 'string',
      description: 'Unique execution ID',
    },
    workflowId: {
      type: 'string',
      description: 'ID of the workflow',
    },
    nodeId: {
      type: 'string',
      description: 'ID of the node (for node events)',
    },
    nodeName: {
      type: 'string',
      description: 'Human-readable name of the node',
    },
    status: {
      type: 'string',
      enum: ['running', 'completed', 'failed'],
      description: 'Current status',
    },
    result: {
      type: 'object',
      additionalProperties: true,
      description: 'Node result/output',
    },
    error: {
      type: 'string',
      description: 'Error message',
    },
    duration: {
      type: 'number',
      description: 'Execution duration in milliseconds',
    },
    output: {
      type: 'object',
      additionalProperties: true,
      description: 'Final workflow output (for execution_completed)',
    },
    progress: {
      type: 'object',
      properties: {
        completed: {
          type: 'integer',
          description: 'Number of completed nodes',
        },
        total: {
          type: 'integer',
          description: 'Total number of nodes',
        },
        percentage: {
          type: 'integer',
          description: 'Completion percentage (0-100)',
        },
      },
    },
  },
  required: ['type', 'timestamp', 'executionId', 'workflowId'],
};

/**
 * Webhook response schema
 */
export const WebhookResponseSchema = {
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
      example: true,
    },
    message: {
      type: 'string',
      example: 'Webhook received and processed',
    },
    workflowId: {
      type: 'string',
    },
    nodeId: {
      type: 'string',
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
    },
  },
};

/**
 * Webhook error response schema
 */
export const WebhookErrorResponseSchema = {
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
      example: false,
    },
    message: {
      type: 'string',
    },
    availableWebhooks: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
};

/**
 * Error response schema
 */
export const ErrorResponseSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'string',
      description: 'Error message',
    },
  },
};

/**
 * Get all component schemas as a record for OpenAPI spec
 */
export function getComponentSchemas(): Record<string, any> {
  return {
    HealthResponse: HealthResponseSchema,
    WorkflowListResponse: WorkflowListResponseSchema,
    WorkflowDetailResponse: WorkflowDetailResponseSchema,
    WorkflowDefinition: WorkflowDefinitionSchema,
    ExecutionContext: ExecutionContextSchema,
    NodeResult: NodeResultSchema,
    ExecutionResponse: ExecutionResponseSchema,
    StreamEventNodeResult: StreamEventNodeResultSchema,
    StreamEventExecutionResult: StreamEventExecutionResultSchema,
    StreamEventVerbose: StreamEventVerboseSchema,
    WebhookResponse: WebhookResponseSchema,
    WebhookErrorResponse: WebhookErrorResponseSchema,
    ErrorResponse: ErrorResponseSchema,
  };
}
