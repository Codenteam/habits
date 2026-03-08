/**
 * Run Agent Action
 *
 * Executes an AI agent with LangChain and MCP tool integration.
 * Supports multiple LLM providers and dynamic MCP server connections.
 */

import { createAction, Property } from '@ha-bits/cortex';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';
import { z } from 'zod';

import {
  agentAuth,
  AgentAuthValue,
  LLM_PROVIDERS,
  LLMProvider,
  MCP_TRANSPORTS,
  MCPServerConfig,
  MCPTransport,
  resolveModel,
} from '../common/common';
import {
  getPreset,
  isPreset,
  resolvePresetEnv,
  validatePresetSecrets,
  getPresetOptions,
} from '../common/mcp-presets';

/**
 * Connected MCP client with its tools
 */
interface ConnectedMCP {
  client: Client;
  transport: StdioClientTransport | SSEClientTransport;
  serverName: string;
}

/**
 * Create an LLM instance based on provider
 */
function createLLM(
  provider: LLMProvider,
  apiKey: string,
  model: string,
  temperature: number
) {
  switch (provider) {
    case LLM_PROVIDERS.INTERSECT:
      return new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: model,
        temperature,
        configuration:{
            baseURL: 'https://api.openai.com/v1'
        }
        
      });

    case LLM_PROVIDERS.OPENAI:
      return new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: model,
        temperature,
        configuration:{
            baseURL: 'https://api.openai.com/v1'
        }
        
      });

    case LLM_PROVIDERS.ANTHROPIC:
      return new ChatAnthropic({
        anthropicApiKey: apiKey,
        modelName: model,
        temperature,
      });

    case LLM_PROVIDERS.GOOGLE:
      return new ChatGoogleGenerativeAI({
        apiKey,
        model,
        temperature,
      });

    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

/**
 * Connect to an MCP server and return the client
 */
async function connectToMCPServer(
  config: MCPServerConfig,
  mcpSecrets: Record<string, string> = {}
): Promise<ConnectedMCP> {
  let command: string;
  let args: string[];
  let env: Record<string, string> = {};
  let transport: MCPTransport;
  let serverName: string;

  if (config.type !== 'custom' && isPreset(config.type)) {
    // Use preset configuration
    const preset = getPreset(config.type)!;
    serverName = preset.name;

    // Validate secrets
    const validation = validatePresetSecrets(preset, mcpSecrets);
    if (!validation.valid) {
      throw new Error(
        `Missing required secrets for ${preset.name}: ${validation.missingVars.join(', ')}`
      );
    }

    command = preset.command;
    args = [...preset.args];
    env = resolvePresetEnv(preset, mcpSecrets);
    transport = config.transport || preset.transport;
  } else {
    // Custom configuration
    if (!config.command && config.transport !== MCP_TRANSPORTS.SSE) {
      throw new Error('Custom MCP server requires a command for stdio transport');
    }

    serverName = config.command || 'custom-sse';
    command = config.command || '';
    args = config.args || [];
    env = config.env || {};
    transport = config.transport || MCP_TRANSPORTS.STDIO;
  }

  // Create and connect transport
  let mcpTransport: StdioClientTransport | SSEClientTransport;

  if (transport === MCP_TRANSPORTS.SSE) {
    if (!config.url) {
      throw new Error('SSE transport requires a URL');
    }
    mcpTransport = new SSEClientTransport(new URL(config.url));
  } else {
    mcpTransport = new StdioClientTransport({
      command,
      args,
      env: { ...process.env, ...env } as Record<string, string>,
    });
  }

  // Create client and connect
  const client = new Client(
    {
      name: 'bit-agent',
      version: '0.1.0',
    },
    {
      capabilities: {},
    }
  );

  await client.connect(mcpTransport);

  return {
    client,
    transport: mcpTransport,
    serverName,
  };
}

/**
 * Convert MCP tools to LangChain tools
 */
async function convertMCPToolsToLangChain(
  connectedMCP: ConnectedMCP
): Promise<DynamicStructuredTool[]> {
  const { client, serverName } = connectedMCP;

  // Get available tools from MCP server
  const toolsResult = await client.listTools();
  const tools: DynamicStructuredTool[] = [];

  for (const mcpTool of toolsResult.tools) {
    // Convert JSON Schema to Zod schema for LangChain
    const zodSchema = jsonSchemaToZod(mcpTool.inputSchema || { type: 'object', properties: {} });

    // Create tool with explicit typing to avoid deep instantiation issues
    const toolConfig = {
      name: `${serverName.toLowerCase().replace(/\s+/g, '_')}_${mcpTool.name}`,
      description: mcpTool.description || `Tool from ${serverName}: ${mcpTool.name}`,
      schema: zodSchema as any,
      func: async (input: Record<string, unknown>): Promise<string> => {
        try {
          const result = await client.callTool({
            name: mcpTool.name,
            arguments: input,
          });

          // Handle different result types
          if (result.content && Array.isArray(result.content)) {
            return result.content
              .map((c: { type: string; text?: string }) => {
                if (c.type === 'text') return c.text;
                return JSON.stringify(c);
              })
              .join('\n');
          }

          return JSON.stringify(result);
        } catch (error) {
          return `Error calling tool ${mcpTool.name}: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    };

    const langchainTool = new DynamicStructuredTool(toolConfig as any);
    tools.push(langchainTool as DynamicStructuredTool);
  }

  return tools;
}

/**
 * Convert JSON Schema to Zod schema (simplified version)
 */
function jsonSchemaToZod(schema: Record<string, unknown>): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const properties = (schema.properties || {}) as Record<string, Record<string, unknown>>;
  const required = (schema.required || []) as string[];

  const zodShape: Record<string, z.ZodTypeAny> = {};

  for (const [key, prop] of Object.entries(properties)) {
    let zodType: z.ZodTypeAny;

    switch (prop.type) {
      case 'string':
        zodType = z.string().describe((prop.description as string) || key);
        break;
      case 'number':
      case 'integer':
        zodType = z.number().describe((prop.description as string) || key);
        break;
      case 'boolean':
        zodType = z.boolean().describe((prop.description as string) || key);
        break;
      case 'array':
        zodType = z.array(z.any()).describe((prop.description as string) || key);
        break;
      case 'object':
        zodType = z.record(z.any()).describe((prop.description as string) || key);
        break;
      default:
        zodType = z.any().describe((prop.description as string) || key);
    }

    if (!required.includes(key)) {
      zodType = zodType.optional();
    }

    zodShape[key] = zodType;
  }

  return z.object(zodShape);
}

/**
 * Run Agent action
 */
export const runAgent = createAction({
  auth: agentAuth,
  name: 'run_agent',
  displayName: 'Run Agent',
  description:
    'Execute an AI agent with MCP tool access. The agent can use tools from multiple MCP servers to complete tasks.',
  props: {
    prompt: Property.LongText({
      displayName: 'Prompt',
      description: 'The task or question for the agent to handle',
      required: true,
    }),
    systemPrompt: Property.LongText({
      displayName: 'System Prompt',
      description: 'Optional system instructions for the agent',
      required: false,
      defaultValue: 'You are a helpful AI assistant with access to various tools. Use them to complete the user\'s request.',
    }),
    mcpServers: Property.Array({
      displayName: 'MCP Servers',
      description: 'List of MCP servers to connect for tool access',
      required: true,
      properties: {
        type: Property.StaticDropdown({
          displayName: 'Server Type',
          description: 'Select a preset or choose custom',
          required: true,
          defaultValue: 'everything',
          options: {
            options: getPresetOptions(),
          },
        }),
        command: Property.ShortText({
          displayName: 'Command',
          description: 'Command to spawn the MCP server (for custom type)',
          required: false,
        }),
        args: Property.ShortText({
          displayName: 'Arguments',
          description: 'Comma-separated arguments for the command (for custom type)',
          required: false,
        }),
        env: Property.Json({
          displayName: 'Environment',
          description: 'Environment variables as JSON object (for custom type)',
          required: false,
          defaultValue: {},
        }),
        transport: Property.StaticDropdown({
          displayName: 'Transport',
          description: 'How to connect to the MCP server',
          required: false,
          defaultValue: MCP_TRANSPORTS.STDIO,
          options: {
            options: [
              { label: 'Standard I/O (spawn process)', value: MCP_TRANSPORTS.STDIO },
              { label: 'Server-Sent Events (HTTP)', value: MCP_TRANSPORTS.SSE },
            ],
          },
        }),
        url: Property.ShortText({
          displayName: 'SSE URL',
          description: 'URL for SSE transport (required if transport is SSE)',
          required: false,
        }),
      },
    }),
    model: Property.ShortText({
      displayName: 'Model',
      description: 'Model to use (defaults to provider\'s best model)',
      required: false,
    }),
    maxIterations: Property.Number({
      displayName: 'Max Iterations',
      description: 'Maximum number of agent iterations before stopping',
      required: false,
      defaultValue: 10,
    }),
    temperature: Property.Number({
      displayName: 'Temperature',
      description: 'LLM temperature (0-2, lower = more deterministic)',
      required: false,
      defaultValue: 0.7,
    }),
  },

  async run({ auth, propsValue }) {
    const authValue = auth as AgentAuthValue;
    const connectedMCPs: ConnectedMCP[] = [];
    const allTools: DynamicStructuredTool[] = [];

    try {
      // Parse MCP server configs
      const mcpConfigs: MCPServerConfig[] = (propsValue.mcpServers || []).map(
        (server: Record<string, unknown>) => ({
          type: server.type as string,
          command: server.command as string | undefined,
          args: server.args
            ? String(server.args)
                .split(',')
                .map((a) => a.trim())
            : undefined,
          env: server.env as Record<string, string> | undefined,
          transport: server.transport as MCPTransport | undefined,
          url: server.url as string | undefined,
        })
      );

      // Connect to all MCP servers (continue on failure, be resilient)
      const failedMCPs: Array<{ type: string; error: string }> = [];
      for (const config of mcpConfigs) {
        try {
          const connected = await connectToMCPServer(
            config,
            (authValue.mcpSecrets as Record<string, string>) || {}
          );
          connectedMCPs.push(connected);

          // Convert MCP tools to LangChain format
          const langchainTools = await convertMCPToolsToLangChain(connected);
          allTools.push(...langchainTools);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.warn(
            `Warning: Failed to connect to MCP server ${config.type}: ${errorMsg}. Continuing with other servers.`
          );
          failedMCPs.push({ type: config.type, error: errorMsg });
          // Continue with other MCP servers instead of failing
        }
      }

      if (allTools.length === 0) {
        const failedList = failedMCPs.map(f => `${f.type}: ${f.error}`).join('; ');
        throw new Error(
          `No tools available. All MCP servers failed to connect. Errors: ${failedList}`
        );
      }

      // Create LLM
      const model = resolveModel(
        authValue.llmProvider,
        propsValue.model as string | undefined
      );
      const llm = createLLM(
        authValue.llmProvider,
        authValue.apiKey,
        model,
        (propsValue.temperature as number) || 0.7
      );

      // Create agent with tools
      const agent = createReactAgent({
        llm,
        tools: allTools,
      });

      // Build messages
      const messages: BaseMessage[] = [];
      if (propsValue.systemPrompt) {
        messages.push(new SystemMessage(propsValue.systemPrompt as string));
      }
      messages.push(new HumanMessage(propsValue.prompt as string));

      // Execute agent
      const maxIterations = (propsValue.maxIterations as number) || 10;
      const result = await agent.invoke(
        {
          messages,
        },
        {
          recursionLimit: maxIterations * 2, // Each iteration can have multiple steps
        }
      );

      // Extract final response
      const agentMessages = result.messages || [];
      const lastMessage = agentMessages[agentMessages.length - 1];
      const finalResponse =
        typeof lastMessage?.content === 'string'
          ? lastMessage.content
          : JSON.stringify(lastMessage?.content);

      // Collect tool calls for transparency
      const toolCalls: Array<{ tool: string; input: unknown; output: unknown }> = [];
      for (const msg of agentMessages) {
        if (msg.constructor.name === 'ToolMessage') {
          toolCalls.push({
            tool: (msg as { name?: string }).name || 'unknown',
            input: (msg as { tool_call_id?: string }).tool_call_id,
            output: msg.content,
          });
        }
      }

      return {
        success: true,
        response: finalResponse,
        model,
        provider: authValue.llmProvider,
        mcpServersConnected: connectedMCPs.map((c) => c.serverName),
        mcpServersFailed: failedMCPs,
        toolsAvailable: allTools.map((t) => t.name),
        toolCalls,
        iterations: Math.ceil(agentMessages.length / 2),
      };
    } finally {
      // Clean up: close all MCP connections
      for (const connected of connectedMCPs) {
        try {
          await connected.client.close();
        } catch {
          // Ignore close errors
        }
      }
    }
  },
});
