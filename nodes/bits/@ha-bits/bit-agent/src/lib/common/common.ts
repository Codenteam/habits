/**
 * Common utilities for bit-agent
 *
 * This module provides shared utilities, authentication, and constants
 * for the AI Agent bit module with LangChain and MCP integration.
 */

import { BitAuth, Property } from '@ha-bits/cortex';

/**
 * Supported LLM providers
 */
export const LLM_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE: 'google',
  INTERSECT: 'intersect',
} as const;

export type LLMProvider = (typeof LLM_PROVIDERS)[keyof typeof LLM_PROVIDERS];

/**
 * Default models per provider
 */
export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
  google: 'gemini-1.5-pro',
  intersect: 'gpt-4o', 
};

/**
 * MCP Transport types
 */
export const MCP_TRANSPORTS = {
  STDIO: 'stdio',
  SSE: 'sse',
} as const;

export type MCPTransport = (typeof MCP_TRANSPORTS)[keyof typeof MCP_TRANSPORTS];

/**
 * Type for agent authentication
 */
export interface AgentAuthValue {
  llmProvider: LLMProvider;
  apiKey: string;
  mcpSecrets?: Record<string, string>;
}

/**
 * MCP Server configuration from user input
 */
export interface MCPServerConfig {
  type: string; // preset name or 'custom'
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  transport?: MCPTransport;
  url?: string; // for SSE transport
}

/**
 * Agent authentication configuration
 * Handles LLM provider credentials and MCP server secrets
 */
export const agentAuth = BitAuth.CustomAuth({
  description: 'Configure AI Agent with LLM provider and MCP secrets',
  required: true,
  props: {
    llmProvider: Property.StaticDropdown({
      displayName: 'LLM Provider',
      description: 'Select the AI model provider',
      required: true,
      defaultValue: LLM_PROVIDERS.OPENAI,
      options: {
        options: [
            { label: 'Intersect (All Models)', value: LLM_PROVIDERS.INTERSECT },
          { label: 'OpenAI (GPT-4, GPT-4o)', value: LLM_PROVIDERS.OPENAI },
          { label: 'Anthropic (Claude)', value: LLM_PROVIDERS.ANTHROPIC },
          { label: 'Google (Gemini)', value: LLM_PROVIDERS.GOOGLE },
        ],
      },
    }),
    apiKey: BitAuth.SecretText({
      displayName: 'API Key',
      description: 'API key for the selected LLM provider',
      required: true,
    }),
    mcpSecrets: Property.Json({
      displayName: 'MCP Secrets',
      description:
        'JSON object with secrets for MCP servers (e.g., {"SLACK_BOT_TOKEN": "xoxb-...", "GITHUB_TOKEN": "ghp_..."})',
      required: false,
      defaultValue: {},
    }),
  },
  validate: async ({ auth }) => {
    // Basic validation - check that API key is provided
    if (!auth.apiKey || auth.apiKey.trim() === '') {
      return {
        valid: false,
        error: 'API key is required',
      };
    }

    // Validate provider selection
    const validProviders = Object.values(LLM_PROVIDERS);
    if (!validProviders.includes(auth.llmProvider as LLMProvider)) {
      return {
        valid: false,
        error: `Invalid LLM provider. Must be one of: ${validProviders.join(', ')}`,
      };
    }

    return { valid: true };
  },
});

/**
 * Get the appropriate model name based on provider and user input
 */
export function resolveModel(
  provider: LLMProvider,
  userModel?: string
): string {
  if (userModel && userModel.trim() !== '') {
    return userModel.trim();
  }
  return DEFAULT_MODELS[provider] || DEFAULT_MODELS.openai;
}
