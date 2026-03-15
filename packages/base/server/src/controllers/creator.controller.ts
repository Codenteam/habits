/**
 * Creator Controller
 * Handles: POST /api/creator/create-habit, POST /api/creator/create-bit
 *
 * Streams Server-Sent Events (SSE) to the client with real-time progress,
 * then sends the final ZIP as a base64 payload in a `complete` event.
 *
 * SSE event types:
 *   progress  : { step: string }          live progress line
 *   complete  : { zip: "<base64>" }       final ZIP payload
 *   error     : { message: string }       fatal error
 *
 * Requires:
 *   HABITS_AI_GEN=true    : enables the creator endpoints
 *   CLAUDE_API_KEY=sk-... : Anthropic API key
 *
 * Optional:
 *   HABITS_AI_DEBUG=true   : keeps staging directories after ZIP is sent
 */

import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';
import { LoggerFactory } from '@ha-bits/core';
import { createResponse } from '../helpers';
import {query } from '@anthropic-ai/claude-agent-sdk';

/**
 * Lazily import the ESM-only claude-agent-sdk.
 * Called only when AI generation is actually triggered, so the
 * server starts normally even when the SDK is not installed.
 */
// async function loadClaudeAgent(): Promise<
//   (opts: { prompt: string; options?: { allowedTools?: string[] } }) => AsyncIterable<unknown>
// > {
//   try {
//     const mod = await import('@anthropic-ai/claude-agent-sdk');
//     return mod.query;
//   } catch {
//     throw new Error(
//       'Could not load @anthropic-ai/claude-agent-sdk. ' +
//       'Install it with: npm g i @anthropic-ai/claude-agent-sdk',
//     );
//   }
// }

const logger = LoggerFactory.getRoot();

// ── SSE helpers ─────────────────────────────────────────────────────

/** Send a single SSE event to the client. */
function sseEvent(res: Response, event: string, data: Record<string, unknown>): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** Set up SSE headers and keepalive. Returns a cleanup fn. */
function initSSE(res: Response): () => void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // nginx pass-through
  });
  // Keepalive every 15 s so proxies don't close the connection
  const keepalive = setInterval(() => res.write(':keepalive\n\n'), 15_000);
  return () => clearInterval(keepalive);
}

// ── Workspace root resolver ─────────────────────────────────────────

function resolveWorkspaceRoot(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'showcase'))) return cwd;
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    dir = path.dirname(dir);
    if (fs.existsSync(path.join(dir, 'showcase'))) return dir;
  }
  return cwd;
}

// ── Progress extraction from SDK messages ───────────────────────────

/**
 * Try to extract a human-readable progress line from a Claude agent SDK message.
 * Returns null if the message has no user-facing information.
 */
function extractProgress(msg: any, stagingDir: string): string | null {
  if (!msg || typeof msg !== 'object') return null;

  const type: string = msg.type;

  // system / init : agent starting
  if (type === 'system' && msg.subtype === 'init') {
    return 'AI agent initialized';
  }

  // assistant : parse content blocks for tool_use (Write, Read, Bash, …)
  if (type === 'assistant' && msg.message?.content) {
    const blocks: any[] = Array.isArray(msg.message.content) ? msg.message.content : [];
    for (const block of blocks) {
      if (block.type === 'tool_use') {
        const name: string = block.name || '';
        const input: any = block.input || {};
        if (name === 'Write') {
          const filePath: string = input.file_path || input.path || '';
          const short = filePath.startsWith(stagingDir)
            ? filePath.slice(stagingDir.length + 1)
            : filePath.split('/').pop() || filePath;
          return `Creating file: ${short}`;
        }
        if (name === 'Edit') {
          const filePath: string = input.file_path || input.path || '';
          const short = filePath.startsWith(stagingDir)
            ? filePath.slice(stagingDir.length + 1)
            : filePath.split('/').pop() || filePath;
          return `Editing file: ${short}`;
        }
        if (name === 'Read') {
          const filePath: string = input.file_path || input.path || '';
          const short = filePath.split('/').pop() || filePath;
          return `Reading reference: ${short}`;
        }
        if (name === 'Bash') {
          const cmd: string = (input.command || '').slice(0, 60);
          return `Running command: ${cmd}`;
        }
        if (name === 'Glob') {
          return 'Scanning files…';
        }
        if (name === 'Grep') {
          return 'Searching codebase…';
        }
        return `Using tool: ${name}`;
      }
    }
    return null; // text-only assistant message : skip
  }

  // tool_use_summary : short summary of a completed tool invocation
  if (type === 'tool_use_summary' && msg.summary) {
    const sum = String(msg.summary).slice(0, 120);
    return sum;
  }

  // result : agent finished
  if (type === 'result') {
    if (msg.subtype === 'success') return 'Generation complete';
    return `Agent finished (${msg.subtype || 'unknown'})`;
  }

  return null;
}

// ── Controller ──────────────────────────────────────────────────────

export class CreatorController {
  // ── Guards ──────────────────────────────────────────────────────────

  private guardDisabled(res: Response): boolean {
    if (process.env.HABITS_AI_GEN !== 'true') {
      res.status(403).json(
        createResponse(false, undefined, 'AI generation is not enabled. Set HABITS_AI_GEN=true to enable.'),
      );
      return true;
    }
    if (!process.env.CLAUDE_API_KEY) {
      res.status(403).json(
        createResponse(false, undefined, 'CLAUDE_API_KEY is not set. Provide an Anthropic API key.'),
      );
      return true;
    }
    return false;
  }

  /**
   * Guard that checks if bits and examples directories exist.
   * These are required for the AI to learn from and generate quality output.
   */
  private guardMissingReferences(res: Response): boolean {
    const root = resolveWorkspaceRoot();
    const bitsDir = path.join(root, 'nodes', 'bits', '@ha-bits');
    const examplesDir = path.join(root, 'showcase');

    const missingBits = !fs.existsSync(bitsDir);
    const missingExamples = !fs.existsSync(examplesDir);

    if (missingBits || missingExamples) {
      const missing: string[] = [];
      if (missingBits) missing.push('nodes/bits/@ha-bits (bit modules)');
      if (missingExamples) missing.push('examples (reference habits)');

      const message = [
        `AI generation requires reference materials that are not present: ${missing.join(', ')}.`,
        '',
        'The AI needs access to existing bits and example habits to generate quality output.',
        '',
        'To fix this, clone the full habits repository instead of using npx/npm:',
        '',
        '  git clone https://github.com/codenteam/habits.git',
        '  cd habits',
        '  pnpm install',
        '',
        'Then run the server from the cloned repository.',
      ].join('\n');

      res.status(400).json(createResponse(false, undefined, message));
      return true;
    }
    return false;
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private createStagingDir(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const stagingDir = path.resolve(process.cwd(), 'staging', timestamp);
    fs.mkdirSync(stagingDir, { recursive: true });
    logger.info('Created staging directory', { stagingDir });
    return stagingDir;
  }

  /**
   * Run the Claude agent and stream progress events to the SSE response.
   */
  private async executeClaudeAgent(
    prompt: string,
    stagingDir: string,
    res: Response,
  ): Promise<void> {
    process.env.ANTHROPIC_API_KEY = process.env.CLAUDE_API_KEY;

    logger.info('Starting Claude agent execution', { stagingDir });
    sseEvent(res, 'progress', { step: 'Starting AI agent…' });

    // const query = await loadClaudeAgent();

    for await (const message of query({
      prompt,
      options: {
        allowedTools: ['Read', 'Edit', 'Bash', 'Write', 'Glob', 'Grep'],
      },
    })) {
      // Log full message for debugging
      try {
        logger.info('Claude agent message', { message: JSON.stringify(message) });
      } catch {
        logger.info('Claude agent message', { message: String(message) });
      }

      // Extract human-readable progress and send to client
      const step = extractProgress(message, stagingDir);
      if (step) {
        sseEvent(res, 'progress', { step });
      }
    }

    logger.info('Claude agent execution finished');
  }

  /**
   * Build a ZIP from the staging directory, send it as a base64 SSE event,
   * and clean up unless HABITS_AI_DEBUG=true.
   */
  private async zipAndComplete(res: Response, stagingDir: string): Promise<void> {
    sseEvent(res, 'progress', { step: 'Packaging files…' });

    const zip = new JSZip();

    const addDirToZip = (dirPath: string, zipFolder: JSZip) => {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          addDirToZip(fullPath, zipFolder.folder(entry.name)!);
        } else {
          zipFolder.file(entry.name, fs.readFileSync(fullPath));
        }
      }
    };

    addDirToZip(stagingDir, zip);

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const zipBase64 = zipBuffer.toString('base64');

    sseEvent(res, 'complete', { zip: zipBase64 });

    // Cleanup
    if (process.env.HABITS_AI_DEBUG === 'true') {
      logger.info('Debug mode : keeping staging directory', { stagingDir });
    } else {
      try {
        fs.rmSync(stagingDir, { recursive: true, force: true });
        logger.info('Cleaned up staging directory', { stagingDir });
      } catch (err) {
        logger.warn('Failed to clean up staging directory', { stagingDir, error: String(err) });
      }
    }
  }

  // ── Route handlers ──────────────────────────────────────────────────

  /**
   * POST /api/creator/create-habit
   * Accepts { prompt: string }
   * Streams SSE progress events, then sends the ZIP as base64 in a `complete` event.
   */
  createHabit = async (req: Request, res: Response): Promise<void> => {
    if (this.guardDisabled(res)) return;
    if (this.guardMissingReferences(res)) return;

    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.json(createResponse(false, undefined, 'A non-empty "prompt" field is required'));
      return;
    }

    const stopKeepalive = initSSE(res);
    const stagingDir = this.createStagingDir();

    try {
      const root = resolveWorkspaceRoot();
      const examplesDir = path.join(root, 'showcase');
      const schemaFile = path.join(root, 'schemas', 'habits.schema.yaml');
      const bitsDir = path.join(root,  'nodes', 'bits', '@ha-bits');

      sseEvent(res, 'progress', { step: 'Preparing prompt…' });

      const agentPrompt = [
        `You are a Habits workflow generator. Create a habit based on the following description:`,
        ``,
        `"${prompt.trim()}"`,
        ``,
        `== CRITICAL: USE BITS, NOT SCRIPTS ==`,
        `You MUST build habits using bit modules (framework: bits), NOT inline scripts.`,
        `Inline scripts (framework: script) should ONLY be used as a last resort when no bit can do the job.`,
        `NEVER use activepieces or n8n nodes or patterns.`,
        ``,
        `== OUTPUT RULES ==`,
        `• Create ALL files inside this directory: ${stagingDir}`,
        `• The output MUST include a stack.yaml and one or more habit YAML files.`,
        `• Create a frontend/index.html if the habit benefits from a UI.`,
        `• Do NOT create, modify, or delete any files outside ${stagingDir}.`,
        `Make sure to add edges to all habits, empty if needed. `,
        ``,
        `== HOW A BIT NODE LOOKS IN A HABIT (COPY THIS PATTERN) ==`,
        ``,
        `  - id: my-node`,
        `    type: action`,
        `    data:`,
        `      framework: bits`,
        `      source: npm`,
        `      module: "@ha-bits/bit-http"      # npm package name of the bit`,
        `      operation: request                 # action name in the bit`,
        `      params:`,
        `        url: "https://api.example.com/data"`,
        `        method: "GET"`,
        ``,
        `Another example with credentials:`,
        ``,
        `  - id: ask-ai`,
        `    type: action`,
        `    data:`,
        `      framework: bits`,
        `      source: npm`,
        `      module: "@ha-bits/bit-openai"`,
        `      operation: ask_chatgpt`,
        `      credentials:`,
        `        openai:`,
        `          apiKey: "{{habits.env.OPENAI_API_KEY}}"`,
        `      params:`,
        `        model: gpt-4o-mini`,
        `        prompt: "{{habits.input.question}}"`,
        ``,
        `== AVAILABLE BITS : read their src/index.ts to learn their actions & props ==`,
        ``,
        `Directory: ${bitsDir}`,
        ``,
        `  bit-http          : HTTP requests (GET/POST/PUT/DELETE)`,
        `  bit-openai         : OpenAI chat, embeddings, image generation`,
        `  bit-string         : String manipulation (split, join, replace, etc.)`,
        `  bit-if             : Conditional branching`,
        `  bit-loop           : Iteration over arrays`,
        `  bit-shell          : Run shell commands`,
        `  bit-slack          : Send Slack messages`,
        `  bit-discord        : Send Discord messages`,
        `  bit-email          : Send emails`,
        `  bit-telegram       : Send Telegram messages`,
        `  bit-filesystem     : Read/write files`,
        `  bit-database       : SQLite database operations`,
        `  bit-database-mongodb : MongoDB operations`,
        `  bit-database-sql : SQL operations`,
        `  bit-intersect      : Intersect AI API (OpenAI-compatible)`,
        ``,
        `IMPORTANT: Before using a bit, READ its src/index.ts to see exact action names and props.`,
        `Start by reading: ${path.join(bitsDir, 'bit-http', 'src', 'index.ts')}`,
        ``,
        `== REFERENCE MATERIAL ==`,
        ``,
        `1. Habits schema: ${schemaFile}`,
        ``,
        `2. Example habits that correctly use bits:`,
        `   • Hello-world (simplest):           ${path.join(examplesDir, 'hello-world')}`,
        `   • Personal finance (multi-habit):   ${path.join(examplesDir, 'personal-finance-advisor')}`,
        `   • Social media manager:             ${path.join(examplesDir, 'social-media-manager')}`,
        `   • Research paper assistant:          ${path.join(examplesDir, 'research-paper-assistant')}`,
        `   Browse ${examplesDir} for more examples.`,
        ``,
        `== KEY PATTERNS ==`,
        `• stack.yaml lists workflows with id + path.`,
        `• habit.yaml defines nodes, edges, and output.`,
        `• Node type MUST be "action" (not "script") when using a bit.`,
        `• Use {{node-id.result.field}} or {{node-id}} for data flow between nodes.`,
        `• Use {{habits.input.field}} for workflow inputs.`,
        `• Use {{habits.env.VAR_NAME}} for environment variables / secrets.`,
        ``,
        `Read the reference bits and examples above, then generate the habit files.`,
      ].join('\n');

      // Write prompt log to staging dir for debugging
      fs.writeFileSync(path.join(stagingDir, '_agent-prompt.log'), agentPrompt, 'utf-8');

      await this.executeClaudeAgent(agentPrompt, stagingDir, res);
      await this.zipAndComplete(res, stagingDir);
    } catch (error: any) {
      logger.warn('create-habit failed', { error: String(error) });
      if (process.env.HABITS_AI_DEBUG !== 'true') {
        try { fs.rmSync(stagingDir, { recursive: true, force: true }); } catch { /* ignore */ }
      }
      sseEvent(res, 'error', { message: error.message || 'AI generation failed' });
    } finally {
      stopKeepalive();
      res.end();
    }
  };

  /**
   * POST /api/creator/create-bit
   * Accepts { prompt: string }
   * Streams SSE progress events, then sends the ZIP as base64 in a `complete` event.
   */
  createBit = async (req: Request, res: Response): Promise<void> => {
    if (this.guardDisabled(res)) return;
    if (this.guardMissingReferences(res)) return;

    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.json(createResponse(false, undefined, 'A non-empty "prompt" field is required'));
      return;
    }

    const stopKeepalive = initSSE(res);
    const stagingDir = this.createStagingDir();

    try {
      const root = resolveWorkspaceRoot();
      const bitsDir = path.join(root,  'nodes', 'bits', '@ha-bits');

      sseEvent(res, 'progress', { step: 'Preparing prompt…' });

      const agentPrompt = [
        `You are a Habits bit (node module) generator. Create a bit based on the following description:`,
        ``,
        `"${prompt.trim()}"`,
        ``,
        `== OUTPUT RULES ==`,
        `• Create ALL files inside this directory: ${stagingDir}`,
        `• Create a complete bit package: package.json, tsconfig.json, src/index.ts (and optionally src/index.test.ts).`,
        `• Do NOT create, modify, or delete any files outside ${stagingDir}.`,
        ``,
        `== REFERENCE BITS (READ these first to understand the structure) ==`,
        ``,
        `1. Hello-world bit (simplest example):`,
        `   ${path.join(bitsDir, 'bit-hello-world')}`,
        `   Read its src/index.ts, package.json, and tsconfig.json.`,
        ``,
        `2. HTTP bit (more complex, shows props, auth, error handling):`,
        `   ${path.join(bitsDir, 'bit-http')}`,
        ``,
        `3. OpenAI bit (API integration pattern):`,
        `   ${path.join(bitsDir, 'bit-openai')}`,
        ``,
        `4. Browse all bits for more patterns:`,
        `   ${bitsDir}`,
        ``,
        `== KEY PATTERNS ==`,
        `• A bit exports an object with displayName, description, logoUrl, actions, and triggers.`,
        `• Each action has: name, displayName, description, props, and an async run(context) method.`,
        `• Props use types: SHORT_TEXT, LONG_TEXT, NUMBER, CHECKBOX, STATIC_DROPDOWN, JSON, etc.`,
        `• The run method receives context.propsValue with the user-provided values.`,
        `• Package name follows @ha-bits/bit-<name> convention.`,
        `• Use "lucide:<IconName>" for logoUrl.`,
        ``,
        `Read the reference bits above, then generate the bit files.`,
      ].join('\n');

      // Write prompt log to staging dir for debugging
      fs.writeFileSync(path.join(stagingDir, '_agent-prompt.log'), agentPrompt, 'utf-8');

      await this.executeClaudeAgent(agentPrompt, stagingDir, res);
      await this.zipAndComplete(res, stagingDir);
    } catch (error: any) {
      logger.warn('create-bit failed', { error: String(error) });
      if (process.env.HABITS_AI_DEBUG !== 'true') {
        try { fs.rmSync(stagingDir, { recursive: true, force: true }); } catch { /* ignore */ }
      }
      sseEvent(res, 'error', { message: error.message || 'AI generation failed' });
    } finally {
      stopKeepalive();
      res.end();
    }
  };
}
