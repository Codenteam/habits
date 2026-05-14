/**
 * Tauri Agent Stub for @ha-bits/bit-agent
 *
 * Replaces run-agent.ts in Tauri bundles. Instead of spawning Node.js MCP servers
 * via StdioClientTransport (not available in Tauri WebView), this stub builds
 * DynamicStructuredTool instances that call Tauri invoke() or browser fetch().
 *
 * Same createAction API surface as run-agent.ts - no habit YAML changes needed.
 */

import { createAction, Property } from '@ha-bits/cortex-core';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';
import { z } from 'zod';

import {
  agentAuth,
  AgentAuthValue,
  LLM_PROVIDERS,
  LLMProvider,
  MCPServerConfig,
  resolveModel,
} from '../lib/common/common';
import { getPresetOptions } from '../lib/common/mcp-presets';
import { MCP_TRANSPORTS } from '../lib/common/common';

// ---------------------------------------------------------------------------
// Tauri invoke helper
// ---------------------------------------------------------------------------

function getInvoke(): ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  const tauri = (w['__TAURI__'] || w['__TAURI_INTERNALS__']) as Record<string, unknown> | undefined;
  if (!tauri) return null;
  const core = tauri['core'] as Record<string, unknown> | undefined;
  if (core?.['invoke']) return core['invoke'] as (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  if (tauri['invoke']) return tauri['invoke'] as (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  const internals = w['__TAURI_INTERNALS__'] as Record<string, unknown> | undefined;
  if (internals?.['invoke']) return internals['invoke'] as (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  return null;
}

function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  try {
    const internals = w['__TAURI_INTERNALS__'] as Record<string, unknown> | undefined;
    const meta = internals?.['metadata'] as Record<string, unknown> | undefined;
    const win = meta?.['currentWindow'] as Record<string, unknown> | undefined;
    const platform = win?.['platform'] as string | undefined;
    if (platform) return platform === 'ios' || platform === 'android';
  } catch {
    // ignore
  }
  // Fallback: check user agent
  return /iPhone|iPad|Android/.test(navigator.userAgent);
}

// BaseDirectory enum values (Tauri v2 TypeScript)
const BASE_DIR_DOCUMENT = 3;
const BASE_DIR_DOWNLOAD = 8;
const BASE_DIR_APPDATA = 14;
const BASE_DIR_HOME = 16;
const BASE_DIR_TEMP = 12;

function resolveBaseDir(name?: string): number {
  switch ((name || '').toUpperCase()) {
    case 'DOCUMENT': return BASE_DIR_DOCUMENT;
    case 'DOWNLOAD': return BASE_DIR_DOWNLOAD;
    case 'HOME': return BASE_DIR_HOME;
    case 'TEMP': return BASE_DIR_TEMP;
    default: return BASE_DIR_APPDATA;
  }
}

// ---------------------------------------------------------------------------
// LLM factory (browser-safe: dangerouslyAllowBrowser)
// ---------------------------------------------------------------------------

function createLLM(provider: LLMProvider, apiKey: string, model: string, temperature: number) {
  // Only OpenAI is supported in Tauri WebView (no Node.js deps for Anthropic/Google)
  return new ChatOpenAI({
    openAIApiKey: apiKey,
    modelName: model,
    temperature,
    configuration: { dangerouslyAllowBrowser: true },
  });
}

// ---------------------------------------------------------------------------
// Filesystem tools (Tauri invoke)
// ---------------------------------------------------------------------------

function buildFilesystemTools(secrets: Record<string, string>): DynamicStructuredTool[] {
  const invoke = getInvoke();
  if (!invoke) {
    console.warn('[tauri-agent] Tauri invoke not available, skipping filesystem tools');
    return [];
  }

  const defaultBaseDir = resolveBaseDir(secrets['FS_BASE_DIR']);

  return [
    new DynamicStructuredTool({
      name: 'fs_list_directory',
      description: 'List the contents of a directory. Returns file/folder names and types.',
      schema: z.object({
        path: z.string().describe('Directory path to list'),
        baseDir: z.string().optional().describe('Base directory: APPDATA (default), DOCUMENT, DOWNLOAD, HOME, TEMP'),
      }),
      func: async (input) => {
        try {
          const entries = await invoke('plugin:fs|read_dir', {
            path: input.path,
            options: { baseDir: resolveBaseDir(input.baseDir) ?? defaultBaseDir },
          }) as Array<{ name?: string; isDirectory?: boolean; isFile?: boolean }>;
          return JSON.stringify(entries.map(e => ({ name: e.name, type: e.isDirectory ? 'directory' : 'file' })));
        } catch (e) {
          return `Error listing directory: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),

    new DynamicStructuredTool({
      name: 'fs_read_file',
      description: 'Read the text contents of a file.',
      schema: z.object({
        path: z.string().describe('File path to read'),
        baseDir: z.string().optional().describe('Base directory: APPDATA (default), DOCUMENT, DOWNLOAD, HOME, TEMP'),
      }),
      func: async (input) => {
        try {
          const text = await invoke('plugin:fs|read_text_file', {
            path: input.path,
            options: { baseDir: resolveBaseDir(input.baseDir) ?? defaultBaseDir },
          }) as string;
          return text;
        } catch (e) {
          return `Error reading file: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),

    new DynamicStructuredTool({
      name: 'fs_write_file',
      description: 'Write text content to a file (creates or overwrites).',
      schema: z.object({
        path: z.string().describe('File path to write'),
        contents: z.string().describe('Text content to write'),
        baseDir: z.string().optional().describe('Base directory: APPDATA (default), DOCUMENT, DOWNLOAD, HOME, TEMP'),
      }),
      func: async (input) => {
        try {
          await invoke('plugin:fs|write_text_file', {
            path: input.path,
            contents: input.contents,
            options: { baseDir: resolveBaseDir(input.baseDir) ?? defaultBaseDir },
          });
          return `File written successfully: ${input.path}`;
        } catch (e) {
          return `Error writing file: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),

    new DynamicStructuredTool({
      name: 'fs_move_file',
      description: 'Move or rename a file.',
      schema: z.object({
        oldPath: z.string().describe('Current file path'),
        newPath: z.string().describe('New file path'),
        baseDir: z.string().optional().describe('Base directory: APPDATA (default), DOCUMENT, DOWNLOAD, HOME, TEMP'),
      }),
      func: async (input) => {
        try {
          const bd = resolveBaseDir(input.baseDir) ?? defaultBaseDir;
          await invoke('plugin:fs|rename', {
            oldPath: input.oldPath,
            newPath: input.newPath,
            options: { baseDir: bd },
          });
          return `File moved: ${input.oldPath} -> ${input.newPath}`;
        } catch (e) {
          return `Error moving file: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),

    new DynamicStructuredTool({
      name: 'fs_copy_file',
      description: 'Copy a file to a new location.',
      schema: z.object({
        fromPath: z.string().describe('Source file path'),
        toPath: z.string().describe('Destination file path'),
        baseDir: z.string().optional().describe('Base directory: APPDATA (default), DOCUMENT, DOWNLOAD, HOME, TEMP'),
      }),
      func: async (input) => {
        try {
          const bd = resolveBaseDir(input.baseDir) ?? defaultBaseDir;
          await invoke('plugin:fs|copy_file', {
            fromPath: input.fromPath,
            toPath: input.toPath,
            options: { baseDir: bd },
          });
          return `File copied: ${input.fromPath} -> ${input.toPath}`;
        } catch (e) {
          return `Error copying file: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),

    new DynamicStructuredTool({
      name: 'fs_delete_file',
      description: 'Delete a file or directory.',
      schema: z.object({
        path: z.string().describe('Path to delete'),
        recursive: z.boolean().optional().describe('Recursively delete directory contents (default: false)'),
        baseDir: z.string().optional().describe('Base directory: APPDATA (default), DOCUMENT, DOWNLOAD, HOME, TEMP'),
      }),
      func: async (input) => {
        try {
          await invoke('plugin:fs|remove', {
            path: input.path,
            options: { baseDir: resolveBaseDir(input.baseDir) ?? defaultBaseDir, recursive: input.recursive ?? false },
          });
          return `Deleted: ${input.path}`;
        } catch (e) {
          return `Error deleting: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),

    new DynamicStructuredTool({
      name: 'fs_create_directory',
      description: 'Create a directory (and parent directories if needed).',
      schema: z.object({
        path: z.string().describe('Directory path to create'),
        baseDir: z.string().optional().describe('Base directory: APPDATA (default), DOCUMENT, DOWNLOAD, HOME, TEMP'),
      }),
      func: async (input) => {
        try {
          await invoke('plugin:fs|mkdir', {
            path: input.path,
            options: { baseDir: resolveBaseDir(input.baseDir) ?? defaultBaseDir, recursive: true },
          });
          return `Directory created: ${input.path}`;
        } catch (e) {
          return `Error creating directory: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),

    new DynamicStructuredTool({
      name: 'fs_file_exists',
      description: 'Check if a file or directory exists.',
      schema: z.object({
        path: z.string().describe('Path to check'),
        baseDir: z.string().optional().describe('Base directory: APPDATA (default), DOCUMENT, DOWNLOAD, HOME, TEMP'),
      }),
      func: async (input) => {
        try {
          const exists = await invoke('plugin:fs|exists', {
            path: input.path,
            options: { baseDir: resolveBaseDir(input.baseDir) ?? defaultBaseDir },
          }) as boolean;
          return JSON.stringify({ exists, path: input.path });
        } catch (e) {
          return `Error checking existence: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),

    new DynamicStructuredTool({
      name: 'fs_stat',
      description: 'Get metadata about a file (size, modified time, is directory, etc.).',
      schema: z.object({
        path: z.string().describe('Path to stat'),
        baseDir: z.string().optional().describe('Base directory: APPDATA (default), DOCUMENT, DOWNLOAD, HOME, TEMP'),
      }),
      func: async (input) => {
        try {
          const stat = await invoke('plugin:fs|stat', {
            path: input.path,
            options: { baseDir: resolveBaseDir(input.baseDir) ?? defaultBaseDir },
          });
          return JSON.stringify(stat);
        } catch (e) {
          return `Error getting stat: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),
  ];
}

// ---------------------------------------------------------------------------
// Slack tools (browser fetch)
// ---------------------------------------------------------------------------

function buildSlackTools(secrets: Record<string, string>): DynamicStructuredTool[] {
  const token = secrets['SLACK_BOT_TOKEN'];
  if (!token) {
    console.warn('[tauri-agent] SLACK_BOT_TOKEN missing, skipping Slack tools');
    return [];
  }

  async function slackApi(method: string, path: string, body?: Record<string, unknown>): Promise<unknown> {
    const url = `https://slack.com/api/${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json() as Record<string, unknown>;
    if (!data['ok']) throw new Error(String(data['error'] || 'Slack API error'));
    return data;
  }

  return [
    new DynamicStructuredTool({
      name: 'slack_send_message',
      description: 'Send a message to a Slack channel.',
      schema: z.object({
        channel: z.string().describe('Channel ID or name (e.g. #general or C0XXXXXX)'),
        text: z.string().describe('Message text to send'),
      }),
      func: async (input) => {
        try {
          await slackApi('POST', 'chat.postMessage', { channel: input.channel, text: input.text });
          return `Message sent to ${input.channel}`;
        } catch (e) {
          return `Error sending Slack message: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),

    new DynamicStructuredTool({
      name: 'slack_get_messages',
      description: 'Get recent messages from a Slack channel.',
      schema: z.object({
        channel: z.string().describe('Channel ID (e.g. C0XXXXXX)'),
        limit: z.number().optional().describe('Number of messages to fetch (default: 20)'),
      }),
      func: async (input) => {
        try {
          const data = await slackApi('GET', `conversations.history?channel=${input.channel}&limit=${input.limit ?? 20}`) as Record<string, unknown>;
          const messages = (data['messages'] as Array<Record<string, unknown>>) || [];
          return JSON.stringify(messages.map(m => ({ user: m['user'], text: m['text'], ts: m['ts'] })));
        } catch (e) {
          return `Error fetching Slack messages: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),

    new DynamicStructuredTool({
      name: 'slack_list_channels',
      description: 'List available Slack channels.',
      schema: z.object({
        limit: z.number().optional().describe('Number of channels to list (default: 50)'),
      }),
      func: async (input) => {
        try {
          const data = await slackApi('GET', `conversations.list?limit=${input.limit ?? 50}`) as Record<string, unknown>;
          const channels = (data['channels'] as Array<Record<string, unknown>>) || [];
          return JSON.stringify(channels.map(c => ({ id: c['id'], name: c['name'] })));
        } catch (e) {
          return `Error listing Slack channels: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),
  ];
}

// ---------------------------------------------------------------------------
// Telegram tools (browser fetch)
// ---------------------------------------------------------------------------

function buildTelegramTools(secrets: Record<string, string>): DynamicStructuredTool[] {
  const botToken = secrets['TELEGRAM_BOT_TOKEN'];
  if (!botToken) {
    console.warn('[tauri-agent] TELEGRAM_BOT_TOKEN missing, skipping Telegram tools');
    return [];
  }
  const defaultChatId = secrets['TELEGRAM_CHAT_ID'];

  async function tgApi(method: string, body?: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json() as Record<string, unknown>;
    if (!data['ok']) throw new Error(String(data['description'] || 'Telegram API error'));
    return data['result'];
  }

  return [
    new DynamicStructuredTool({
      name: 'telegram_send_message',
      description: 'Send a message via Telegram bot.',
      schema: z.object({
        text: z.string().describe('Message text to send'),
        chat_id: z.string().optional().describe('Chat ID to send to (defaults to TELEGRAM_CHAT_ID env var)'),
        parse_mode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).optional().describe('Message parse mode'),
      }),
      func: async (input) => {
        try {
          const chatId = input.chat_id || defaultChatId;
          if (!chatId) return 'Error: No chat_id provided and TELEGRAM_CHAT_ID not set';
          await tgApi('sendMessage', { chat_id: chatId, text: input.text, parse_mode: input.parse_mode });
          return `Telegram message sent to ${chatId}`;
        } catch (e) {
          return `Error sending Telegram message: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),

    new DynamicStructuredTool({
      name: 'telegram_get_me',
      description: 'Get information about the Telegram bot.',
      schema: z.object({}),
      func: async () => {
        try {
          const result = await tgApi('getMe');
          return JSON.stringify(result);
        } catch (e) {
          return `Error: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),
  ];
}

// ---------------------------------------------------------------------------
// HTTP fetch tools (browser fetch)
// ---------------------------------------------------------------------------

function buildFetchTools(): DynamicStructuredTool[] {
  return [
    new DynamicStructuredTool({
      name: 'http_get',
      description: 'Make an HTTP GET request to any URL.',
      schema: z.object({
        url: z.string().describe('URL to fetch'),
        headers: z.string().optional().describe('JSON string of request headers'),
      }),
      func: async (input) => {
        try {
          const headers = input.headers ? JSON.parse(input.headers) as Record<string, string> : {};
          const res = await fetch(input.url, { headers });
          const text = await res.text();
          return `Status: ${res.status}\n\n${text.slice(0, 5000)}`;
        } catch (e) {
          return `Error fetching ${input.url}: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),

    new DynamicStructuredTool({
      name: 'http_post',
      description: 'Make an HTTP POST request to any URL.',
      schema: z.object({
        url: z.string().describe('URL to post to'),
        body: z.string().optional().describe('Request body as string'),
        headers: z.string().optional().describe('JSON string of request headers'),
      }),
      func: async (input) => {
        try {
          const headers = input.headers ? JSON.parse(input.headers) as Record<string, string> : {};
          const res = await fetch(input.url, { method: 'POST', body: input.body, headers });
          const text = await res.text();
          return `Status: ${res.status}\n\n${text.slice(0, 5000)}`;
        } catch (e) {
          return `Error posting to ${input.url}: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),
  ];
}

// ---------------------------------------------------------------------------
// Notification tools (Tauri invoke)
// ---------------------------------------------------------------------------

function buildNotificationTools(): DynamicStructuredTool[] {
  const invoke = getInvoke();
  if (!invoke) return [];

  return [
    new DynamicStructuredTool({
      name: 'notification_show',
      description: 'Show a system notification on the device.',
      schema: z.object({
        title: z.string().describe('Notification title'),
        body: z.string().describe('Notification body text'),
      }),
      func: async (input) => {
        try {
          // Request permission if needed
          const granted = await invoke('plugin:notification|is_permission_granted') as boolean;
          if (!granted) {
            await invoke('plugin:notification|request_permission');
          }
          await invoke('plugin:notification|notify', { title: input.title, body: input.body });
          return `Notification shown: ${input.title}`;
        } catch (e) {
          return `Error showing notification: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),
  ];
}

// ---------------------------------------------------------------------------
// Clipboard tools (Tauri invoke)
// ---------------------------------------------------------------------------

function buildClipboardTools(): DynamicStructuredTool[] {
  const invoke = getInvoke();
  if (!invoke) return [];

  return [
    new DynamicStructuredTool({
      name: 'clipboard_read',
      description: 'Read the current clipboard text content.',
      schema: z.object({}),
      func: async () => {
        try {
          const text = await invoke('plugin:clipboard-manager|read_text') as string;
          return text || '(clipboard is empty)';
        } catch (e) {
          return `Error reading clipboard: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),

    new DynamicStructuredTool({
      name: 'clipboard_write',
      description: 'Write text to the clipboard.',
      schema: z.object({
        text: z.string().describe('Text to write to clipboard'),
      }),
      func: async (input) => {
        try {
          await invoke('plugin:clipboard-manager|write_text', { text: input.text });
          return 'Clipboard updated';
        } catch (e) {
          return `Error writing clipboard: ${e instanceof Error ? e.message : String(e)}`;
        }
      },
    }),
  ];
}

// ---------------------------------------------------------------------------
// All-bits tools (via window.HabitsBundle)
// ---------------------------------------------------------------------------

const EXCLUDED_BITS = new Set([
  '@ha-bits/bit-agent',
  '@ha-bits/bit-if',
  '@ha-bits/bit-loop',
  '@ha-bits/bit-any-of',
  '@ha-bits/bit-scheduler',
  '@ha-bits/bit-ai',
  '@ha-bits/bit-local-ai',
  '@ha-bits/bit-litert',
  '@ha-bits/bit-auth',
  '@ha-bits/bit-cookie',
  '@ha-bits/bit-oauth-mock',
  '@ha-bits/bit-hello-world',
  '@ha-bits/bit-httpbin',
  '@ha-bits/bit-wifi',
  '@ha-bits/bit-system-settings',
]);

function propTypeToZod(type: string, required: boolean, description: string): z.ZodTypeAny {
  let zodType: z.ZodTypeAny;
  switch (type) {
    case 'SHORT_TEXT':
    case 'LONG_TEXT':
    case 'FILE_NAME':
    case 'URL':
    case 'STATIC_DROPDOWN':
      zodType = z.string().describe(description);
      break;
    case 'NUMBER':
      zodType = z.number().describe(description);
      break;
    case 'CHECKBOX':
      zodType = z.boolean().describe(description);
      break;
    case 'JSON':
      zodType = z.record(z.any()).describe(description);
      break;
    case 'ARRAY':
      zodType = z.array(z.any()).describe(description);
      break;
    default:
      zodType = z.any().describe(description);
  }
  return required ? zodType : zodType.optional();
}

interface BitProp {
  name: string;
  type: string;
  displayName: string;
  description: string;
  required: boolean;
  defaultValue?: unknown;
}

interface BitAction {
  displayName: string;
  description: string;
  props: BitProp[];
}

interface BitManifest {
  [moduleName: string]: {
    displayName: string;
    runtime: string;
    actions: { [actionName: string]: BitAction };
  };
}

function buildAllBitsTools(
  credentialsMap: Record<string, Record<string, string>>,
  existingToolNames: Set<string>
): DynamicStructuredTool[] {
  const habitsBundle = (window as unknown as Record<string, unknown>)['HabitsBundle'] as Record<string, unknown> | undefined;
  if (!habitsBundle || typeof habitsBundle['getBitManifest'] !== 'function') {
    console.warn('[tauri-agent] window.HabitsBundle.getBitManifest not available, skipping all-bits tools');
    return [];
  }

  const manifest: BitManifest = (habitsBundle['getBitManifest'] as () => BitManifest)();
  const mobile = isMobile();
  const tools: DynamicStructuredTool[] = [];

  // Bits whose native tools already cover them
  const nativeCoveredBits = new Set([
    '@ha-bits/bit-filesystem',
    '@ha-bits/bit-slack',
    '@ha-bits/bit-telegram',
  ]);

  for (const [moduleName, bitInfo] of Object.entries(manifest)) {
    if (EXCLUDED_BITS.has(moduleName)) continue;
    if (nativeCoveredBits.has(moduleName)) continue;
    if (mobile && moduleName === '@ha-bits/bit-shell') continue;

    const short = moduleName.replace('@ha-bits/bit-', '');
    const bitCreds = credentialsMap[moduleName] || null;

    for (const [actionName, action] of Object.entries(bitInfo.actions)) {
      const toolName = `bit__${short}__${actionName}`;
      if (existingToolNames.has(toolName)) continue;

      const zodShape: Record<string, z.ZodTypeAny> = {};
      for (const prop of action.props) {
        zodShape[prop.name] = propTypeToZod(prop.type, prop.required, prop.description || prop.displayName);
      }
      zodShape['_credentials'] = z.record(z.string()).optional().describe('Optional API credentials for this bit');

      const schema = z.object(zodShape);

      tools.push(new DynamicStructuredTool({
        name: toolName,
        description: `[${bitInfo.displayName}] ${action.displayName}: ${action.description || 'No description'}`,
        schema,
        func: async (input: Record<string, unknown>) => {
          try {
            const { _credentials, ...propsValue } = input;
            const resolvedCreds = (_credentials as Record<string, string> | undefined) ?? bitCreds;
            const result = await (habitsBundle['runAction'] as (m: string, a: string, p: Record<string, unknown>, c: unknown) => Promise<unknown>)(
              moduleName, actionName, propsValue, resolvedCreds
            );
            return typeof result === 'string' ? result : JSON.stringify(result);
          } catch (e) {
            return `Error calling ${toolName}: ${e instanceof Error ? e.message : String(e)}`;
          }
        },
      }));
    }
  }

  return tools;
}

// ---------------------------------------------------------------------------
// Build credentials map from mcpSecrets
// ---------------------------------------------------------------------------

function buildCredentialsMap(mcpSecrets: Record<string, string>): Record<string, Record<string, string>> {
  const map: Record<string, Record<string, string>> = {};

  const assign = (modName: string, creds: Record<string, string>) => {
    map[modName] = { ...(map[modName] || {}), ...creds };
  };

  if (mcpSecrets['OPENAI_API_KEY']) {
    const creds = { apiKey: mcpSecrets['OPENAI_API_KEY'] };
    assign('@ha-bits/bit-openai', creds);
    assign('@ha-bits/bit-text', creds);
    assign('@ha-bits/bit-voice', creds);
    assign('@ha-bits/bit-intersect', creds);
  }
  if (mcpSecrets['ANTHROPIC_API_KEY']) {
    assign('@ha-bits/bit-intersect', { apiKey: mcpSecrets['ANTHROPIC_API_KEY'] });
  }
  if (mcpSecrets['GITHUB_TOKEN']) {
    assign('@ha-bits/bit-github', { accessToken: mcpSecrets['GITHUB_TOKEN'] });
  }
  if (mcpSecrets['GOOGLE_API_KEY']) {
    const creds = { accessToken: mcpSecrets['GOOGLE_API_KEY'] };
    assign('@ha-bits/bit-google-sheets', creds);
    assign('@ha-bits/bit-google-drive', creds);
    assign('@ha-bits/bit-google-calendar', creds);
  }
  if (mcpSecrets['STRIPE_SECRET_KEY']) {
    assign('@ha-bits/bit-stripe', { secretKey: mcpSecrets['STRIPE_SECRET_KEY'] });
  }
  if (mcpSecrets['SLACK_BOT_TOKEN']) {
    assign('@ha-bits/bit-slack', { token: mcpSecrets['SLACK_BOT_TOKEN'] });
  }
  if (mcpSecrets['TELEGRAM_BOT_TOKEN']) {
    assign('@ha-bits/bit-telegram', { token: mcpSecrets['TELEGRAM_BOT_TOKEN'] });
  }
  if (mcpSecrets['DISCORD_BOT_TOKEN']) {
    assign('@ha-bits/bit-discord', { token: mcpSecrets['DISCORD_BOT_TOKEN'] });
  }

  return map;
}

// ---------------------------------------------------------------------------
// Main tool builder: maps mcpServers types to native tool sets
// ---------------------------------------------------------------------------

function buildTauriTools(
  mcpServers: MCPServerConfig[],
  mcpSecrets: Record<string, string>
): DynamicStructuredTool[] {
  const tools: DynamicStructuredTool[] = [];
  let hasAllBits = false;

  for (const server of mcpServers) {
    switch (server.type) {
      case 'filesystem':
        tools.push(...buildFilesystemTools(mcpSecrets));
        break;
      case 'slack':
        tools.push(...buildSlackTools(mcpSecrets));
        break;
      case 'telegram':
        tools.push(...buildTelegramTools(mcpSecrets));
        break;
      case 'fetch':
        tools.push(...buildFetchTools());
        break;
      case 'notification':
        tools.push(...buildNotificationTools());
        break;
      case 'clipboard':
        tools.push(...buildClipboardTools());
        break;
      case 'all-bits':
        hasAllBits = true;
        break;
      default:
        console.warn(`[tauri-agent] Unknown mcpServer type "${server.type}", skipping`);
    }
  }

  // all-bits is processed last so native tools take priority
  if (hasAllBits) {
    const existingNames = new Set(tools.map(t => t.name));
    const credMap = buildCredentialsMap(mcpSecrets);
    tools.push(...buildAllBitsTools(credMap, existingNames));
  }

  return tools;
}

// ---------------------------------------------------------------------------
// Exported action (mirrors run-agent.ts API exactly)
// ---------------------------------------------------------------------------

export const runAgent = createAction({
  auth: agentAuth,
  name: 'run_agent',
  displayName: 'Run Agent',
  description:
    'Execute an AI agent with native Tauri tool access (filesystem, Slack, Telegram, web). Works without Node.js MCP servers.',
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
      defaultValue: "You are a helpful AI assistant with access to various tools. Use them to complete the user's request.",
    }),
    mcpServers: Property.Array({
      displayName: 'MCP Servers',
      description: 'List of tool sets to enable for this agent',
      required: true,
      properties: {
        type: Property.StaticDropdown({
          displayName: 'Server Type',
          description: 'Select a preset or tool category',
          required: true,
          defaultValue: 'filesystem',
          options: {
            options: [
              ...getPresetOptions(),
              { label: 'Filesystem (Tauri native)', value: 'filesystem' },
              { label: 'Slack (browser fetch)', value: 'slack' },
              { label: 'Telegram (browser fetch)', value: 'telegram' },
              { label: 'HTTP Fetch', value: 'fetch' },
              { label: 'Notifications (Tauri native)', value: 'notification' },
              { label: 'Clipboard (Tauri native)', value: 'clipboard' },
              { label: 'All Bits (universal)', value: 'all-bits' },
            ],
          },
        }),
        command: Property.ShortText({
          displayName: 'Command',
          description: 'Not used in Tauri mode',
          required: false,
        }),
        args: Property.ShortText({
          displayName: 'Arguments',
          description: 'Not used in Tauri mode',
          required: false,
        }),
        env: Property.Json({
          displayName: 'Environment',
          description: 'Not used in Tauri mode',
          required: false,
          defaultValue: {},
        }),
        transport: Property.StaticDropdown({
          displayName: 'Transport',
          description: 'Not used in Tauri mode',
          required: false,
          defaultValue: MCP_TRANSPORTS.STDIO,
          options: {
            options: [
              { label: 'Standard I/O', value: MCP_TRANSPORTS.STDIO },
              { label: 'SSE', value: MCP_TRANSPORTS.SSE },
            ],
          },
        }),
        url: Property.ShortText({
          displayName: 'SSE URL',
          description: 'Not used in Tauri mode',
          required: false,
        }),
      },
    }),
    model: Property.ShortText({
      displayName: 'Model',
      description: "Model to use (e.g. 'gpt-4o', 'gpt-4o-mini')",
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

    // Parse MCP server configs
    const mcpConfigs: MCPServerConfig[] = (propsValue.mcpServers || []).map(
      (server: Record<string, unknown>) => ({
        type: server['type'] as string,
        command: server['command'] as string | undefined,
        args: server['args'] ? String(server['args']).split(',').map((a: string) => a.trim()) : undefined,
        env: server['env'] as Record<string, string> | undefined,
        transport: server['transport'] as string | undefined,
        url: server['url'] as string | undefined,
      })
    );

    const mcpSecrets = (authValue.mcpSecrets as Record<string, string>) || {};
    const allTools = buildTauriTools(mcpConfigs, mcpSecrets);

    if (allTools.length === 0) {
      throw new Error('No tools available. Check mcpServers configuration and that SLACK_BOT_TOKEN / TELEGRAM_BOT_TOKEN secrets are provided.');
    }

    // Create LLM (browser-safe)
    const provider = authValue.llmProvider;
    const model = resolveModel(provider, propsValue.model as string | undefined);
    const llm = createLLM(provider, authValue.apiKey, model, (propsValue.temperature as number) || 0.7);

    // Build agent
    const agent = createReactAgent({ llm, tools: allTools });

    // Build messages
    const messages: BaseMessage[] = [];
    if (propsValue.systemPrompt) {
      messages.push(new SystemMessage(propsValue.systemPrompt as string));
    }
    messages.push(new HumanMessage(propsValue.prompt as string));

    // Execute
    const maxIterations = (propsValue.maxIterations as number) || 10;
    const result = await agent.invoke(
      { messages },
      { recursionLimit: maxIterations * 2 }
    );

    // Extract final response
    const agentMessages = result.messages || [];
    const lastMessage = agentMessages[agentMessages.length - 1];
    const finalResponse =
      typeof lastMessage?.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage?.content);

    // Collect tool calls
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
      mcpServersConnected: mcpConfigs.map(c => c.type),
      mcpServersFailed: [],
      toolsAvailable: allTools.map(t => t.name),
      toolCalls,
      iterations: Math.ceil(agentMessages.length / 2),
    };
  },
});

// Full package export - wraps runAgent into the same structure as the real @ha-bits/bit-agent package
// This allows the stub to be aliased as the entire package (not just a subpath)
export const agent = {
  displayName: 'AI Agent (Tauri)',
  description: 'Run an AI agent with MCP tools (Tauri native implementation)',
  auth: agentAuth,
  actions: {
    run_agent: runAgent,
  },
  triggers: {},
};

export default agent;
