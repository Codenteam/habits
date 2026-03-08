/**
 * MCP Server Presets
 *
 * Built-in configurations for popular MCP servers.
 * Users can reference these by name instead of providing full server config.
 */

import { MCP_TRANSPORTS, MCPTransport } from './common';

/**
 * MCP Server preset definition
 */
export interface MCPPreset {
  /** Display name for the preset */
  name: string;
  /** Description of what this MCP provides */
  description: string;
  /** Command to spawn the MCP server */
  command: string;
  /** Arguments for the command */
  args: string[];
  /** Environment variables required (keys that should be pulled from mcpSecrets) */
  requiredEnvVars: string[];
  /** Optional environment variables */
  optionalEnvVars?: string[];
  /** Default transport type */
  transport: MCPTransport;
  /** NPM package name for installation reference */
  npmPackage: string;
}

/**
 * Built-in MCP presets
 */
export const MCP_PRESETS: Record<string, MCPPreset> = {
  'google-drive': {
    name: 'Google Drive',
    description: 'Access and search Google Drive files',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-gdrive'],
    requiredEnvVars: ['GDRIVE_CREDENTIALS'],
    transport: MCP_TRANSPORTS.STDIO,
    npmPackage: '@modelcontextprotocol/server-gdrive',
  },

  slack: {
    name: 'Slack',
    description: 'Access Slack workspaces, channels, and messages',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    requiredEnvVars: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'],
    transport: MCP_TRANSPORTS.STDIO,
    npmPackage: '@modelcontextprotocol/server-slack',
  },

  github: {
    name: 'GitHub',
    description: 'Access GitHub repositories, issues, and pull requests',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    requiredEnvVars: ['GITHUB_TOKEN'],
    transport: MCP_TRANSPORTS.STDIO,
    npmPackage: '@modelcontextprotocol/server-github',
  },

  notion: {
    name: 'Notion',
    description: 'Access Notion workspaces, pages, and databases',
    command: 'npx',
    args: ['-y', '@notionhq/notion-mcp-server'],
    requiredEnvVars: ['NOTION_API_KEY'],
    transport: MCP_TRANSPORTS.STDIO,
    npmPackage: '@notionhq/notion-mcp-server',
  },

  figma: {
    name: 'Figma',
    description: 'Access Figma designs and components',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-server-figma'],
    requiredEnvVars: ['FIGMA_ACCESS_TOKEN'],
    transport: MCP_TRANSPORTS.STDIO,
    npmPackage: '@anthropic/mcp-server-figma',
  },

  everything: {
    name: 'Everything',
    description:
      'Local MCP server for testing with filesystem access and utilities',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-everything'],
    requiredEnvVars: [],
    transport: MCP_TRANSPORTS.STDIO,
    npmPackage: '@modelcontextprotocol/server-everything',
  },

  filesystem: {
    name: 'Filesystem',
    description: 'Access local filesystem with configurable allowed paths',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
    requiredEnvVars: [],
    optionalEnvVars: ['ALLOWED_PATHS'],
    transport: MCP_TRANSPORTS.STDIO,
    npmPackage: '@modelcontextprotocol/server-filesystem',
  },

  memory: {
    name: 'Memory',
    description: 'Persistent memory storage for agent context',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    requiredEnvVars: [],
    transport: MCP_TRANSPORTS.STDIO,
    npmPackage: '@modelcontextprotocol/server-memory',
  },

  postgres: {
    name: 'PostgreSQL',
    description: 'Query PostgreSQL databases',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    requiredEnvVars: ['POSTGRES_CONNECTION_STRING'],
    transport: MCP_TRANSPORTS.STDIO,
    npmPackage: '@modelcontextprotocol/server-postgres',
  },

  sqlite: {
    name: 'SQLite',
    description: 'Query SQLite databases',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite', '--db-path'],
    requiredEnvVars: ['SQLITE_DB_PATH'],
    transport: MCP_TRANSPORTS.STDIO,
    npmPackage: '@modelcontextprotocol/server-sqlite',
  },

  'brave-search': {
    name: 'Brave Search',
    description: 'Web search using Brave Search API',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    requiredEnvVars: ['BRAVE_API_KEY'],
    transport: MCP_TRANSPORTS.STDIO,
    npmPackage: '@modelcontextprotocol/server-brave-search',
  },

  fetch: {
    name: 'Fetch',
    description: 'Fetch and parse web content',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
    requiredEnvVars: [],
    transport: MCP_TRANSPORTS.STDIO,
    npmPackage: '@modelcontextprotocol/server-fetch',
  },
};

/**
 * Get preset names for dropdown options
 */
export function getPresetOptions(): Array<{ label: string; value: string }> {
  const options = Object.entries(MCP_PRESETS).map(([key, preset]) => ({
    label: `${preset.name} - ${preset.description}`,
    value: key,
  }));

  // Add custom option at the end
  options.push({
    label: 'Custom - Define your own MCP server',
    value: 'custom',
  });

  return options;
}

/**
 * Check if a type is a known preset
 */
export function isPreset(type: string): boolean {
  return type in MCP_PRESETS;
}

/**
 * Get preset by name
 */
export function getPreset(name: string): MCPPreset | undefined {
  return MCP_PRESETS[name];
}

/**
 * Resolve environment variables for a preset from mcpSecrets
 */
export function resolvePresetEnv(
  preset: MCPPreset,
  mcpSecrets: Record<string, string> = {}
): Record<string, string> {
  const env: Record<string, string> = {};

  // Add required env vars
  for (const envVar of preset.requiredEnvVars) {
    if (mcpSecrets[envVar]) {
      env[envVar] = mcpSecrets[envVar];
    }
  }

  // Add optional env vars if provided
  if (preset.optionalEnvVars) {
    for (const envVar of preset.optionalEnvVars) {
      if (mcpSecrets[envVar]) {
        env[envVar] = mcpSecrets[envVar];
      }
    }
  }

  return env;
}

/**
 * Validate that required env vars are present for a preset
 */
export function validatePresetSecrets(
  preset: MCPPreset,
  mcpSecrets: Record<string, string> = {}
): { valid: boolean; missingVars: string[] } {
  const missingVars: string[] = [];

  for (const envVar of preset.requiredEnvVars) {
    if (!mcpSecrets[envVar]) {
      missingVars.push(envVar);
    }
  }

  return {
    valid: missingVars.length === 0,
    missingVars,
  };
}
