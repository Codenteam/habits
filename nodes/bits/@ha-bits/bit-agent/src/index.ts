/**
 * @ha-bits/bit-agent
 *
 * AI Agent bit with LangChain and MCP (Model Context Protocol) integration.
 * This module provides a generic agent that can connect to multiple MCP servers
 * and use their tools to complete complex tasks.
 */

import { createBit, BitCategory } from '@ha-bits/cortex-core';

import { agentAuth } from './lib/common/common';
import { runAgent } from './lib/actions';

// Re-export auth and utilities for external use
export { agentAuth } from './lib/common/common';
export {
  MCP_PRESETS,
  getPresetOptions,
  isPreset,
  getPreset,
} from './lib/common/mcp-presets';
export type {
  AgentAuthValue,
  MCPServerConfig,
  LLMProvider,
  MCPTransport,
} from './lib/common/common';
export type { MCPPreset } from './lib/common/mcp-presets';

/**
 * Agent bit definition
 */
export const agent = createBit({
  displayName: 'Agent',
  description:
    'AI Agent with LangChain and MCP integration. Connect to multiple MCP servers to give your agent access to tools like Google Drive, Slack, GitHub, Notion, Figma, and more.',
  minimumSupportedRelease: '0.63.0',
  logoUrl: 'lucide:Bot',
  categories: [BitCategory.ARTIFICIAL_INTELLIGENCE],
  auth: agentAuth,
  actions: [runAgent],
  triggers: [],
  authors: ['Codenteam'],
});

// Default export
export default agent;
