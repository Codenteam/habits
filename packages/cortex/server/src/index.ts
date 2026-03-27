// @ha-bits/cortex - Habits Workflow Executor
// The execution engine for running habits (workflows)

// Re-export everything from core package
export * from '@ha-bits/cortex-core';

// Server-specific exports
export { WorkflowExecutorServer, startServer, runCLI } from './server';

// Webhook handling (Node.js server only - Express-based implementation)
export { WebhookTriggerServer, WebhookServerOptions } from './WebhookTriggerServer';

// Webhook registry for vendor-based webhook routing
export { WebhookRegistry, webhookRegistry, WebhookListener, WebhookDispatchResult } from './WebhookRegistry';

// OAuth2 callback handling
export { OAuthCallbackServer, initOAuthCallbackServer, getOAuthCallbackServer } from './OAuthCallbackServer';

// Server utilities
export { ManageModule, setupManageRoutes } from './manage';
export { setupOpenAPIRoutes, generateOpenAPISpec } from './openapi';
