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
 *   CLAUDE_API_KEY=sk-... : Anthropic API key (or user provides one per-request)
 *
 * Optional:
 *   HABITS_AI_DEBUG=true   : keeps staging directories after ZIP is sent
 */

import { Request, Response } from 'express';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import JSZip from 'jszip';
import { LoggerFactory } from '@ha-bits/core/logger';
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

// ── Reference material resolver / downloader ────────────────────────

const REFERENCE_REPO = 'https://github.com/codenteam/habits.git';
const SPARSE_PATHS = ['nodes/bits/@ha-bits', 'showcase', 'schemas'];

/** Stable cache dir: ~/.habits/reference (or HABITS_REF_PATH env override) */
function getReferenceCacheDir(): string {
  return process.env.HABITS_REF_PATH || path.join(os.homedir(), '.habits', 'reference');
}

interface ReferencePaths {
  bitsDir: string;
  examplesDir: string;
}

/**
 * Check the workspace root first, then the user-level cache.
 * Returns null when neither is populated yet.
 */
function findExistingReferences(): ReferencePaths | null {
  const root = resolveWorkspaceRoot();
  const wsBitsDir = path.join(root, 'nodes', 'bits', '@ha-bits');
  const wsExamplesDir = path.join(root, 'showcase');
  if (fs.existsSync(wsBitsDir) && fs.existsSync(wsExamplesDir)) {
    return { bitsDir: wsBitsDir, examplesDir: wsExamplesDir };
  }

  const cacheDir = getReferenceCacheDir();
  const cacheBitsDir = path.join(cacheDir, 'nodes', 'bits', '@ha-bits');
  const cacheExamplesDir = path.join(cacheDir, 'showcase');
  if (fs.existsSync(cacheBitsDir) && fs.existsSync(cacheExamplesDir)) {
    return { bitsDir: cacheBitsDir, examplesDir: cacheExamplesDir };
  }

  return null;
}

/** In-memory singleton so concurrent requests share one download */
let referenceDownloadPromise: Promise<ReferencePaths> | null = null;

/**
 * Sparse-clone only `nodes/bits/@ha-bits` and `showcase` from the habits repo
 * into the user-level cache dir, then return the resolved paths.
 */
async function downloadReferenceMaterials(
  onProgress: (msg: string) => void,
): Promise<ReferencePaths> {
  const cacheDir = getReferenceCacheDir();

  // Double-check cache (another request may have finished while we waited)
  const existing = findExistingReferences();
  if (existing) return existing;

  onProgress('Downloading AI reference materials (first run only, please wait)...');

  // Check git is available
  try {
    execSync('git --version', { stdio: 'pipe' });
  } catch {
    throw new Error(
      'git is required to download reference materials but was not found. ' +
      'Install git and retry, or set HABITS_REF_PATH to a directory containing ' +
      'nodes/bits/@ha-bits and showcase.',
    );
  }

  const tmpCloneDir = path.join(os.tmpdir(), `habits-ref-${Date.now()}`);

  try {
    onProgress('Cloning reference repository (sparse, no history)...');
    execSync(
      `git clone --depth=1 --filter=blob:none --sparse ${REFERENCE_REPO} "${tmpCloneDir}"`,
      { stdio: 'pipe', timeout: 180_000 },
    );

    onProgress('Checking out reference directories...');
    execSync(
      `git -C "${tmpCloneDir}" sparse-checkout set ${SPARSE_PATHS.join(' ')}`,
      { stdio: 'pipe', timeout: 120_000 },
    );

    onProgress('Installing reference materials to cache...');
    fs.mkdirSync(cacheDir, { recursive: true });

    for (const rel of SPARSE_PATHS) {
      const src = path.join(tmpCloneDir, rel);
      const dest = path.join(cacheDir, rel);
      if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.cpSync(src, dest, { recursive: true, force: true });
      }
    }

    logger.info('Reference materials downloaded', { cacheDir });
    onProgress('Reference materials ready.');

    return {
      bitsDir: path.join(cacheDir, 'nodes', 'bits', '@ha-bits'),
      examplesDir: path.join(cacheDir, 'showcase'),
    };
  } finally {
    try {
      fs.rmSync(tmpCloneDir, { recursive: true, force: true });
    } catch { /* ignore cleanup errors */ }
  }
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

  /**
   * GET /api/creator/status
   * Returns whether AI generation is enabled and whether an API key is pre-configured.
   */
  getStatus = (_req: Request, res: Response): void => {
    res.json({
      enabled: true,
      hasApiKey: !!process.env.CLAUDE_API_KEY,
    });
  };

  private guardDisabled(req: Request, res: Response): boolean {
    // Accept env var or a key supplied by the client in the request body
    if (!process.env.CLAUDE_API_KEY && !req.body?.claudeApiKey) {
      res.status(403).json(
        createResponse(false, undefined,
          'CLAUDE_API_KEY is not set. Provide an Anthropic API key. ' +
          'It can be configured in several ways: ' +
          '(1) habits command: set CLAUDE_API_KEY=sk-ant-... when starting Base (or add it to a .env file in the same directory); ' +
          '(2) Admin panel: open the service settings for this Base instance and add CLAUDE_API_KEY to its environment variables. ' +
          'See: https://codenteam.com/intersect/habits/tools/base.html#environment-variables and https://codenteam.com/intersect/habits/tools/admin.html'
        ),
      );
      return true;
    }
    return false;
  }

  /**
   * Ensure bits and showcase directories are available, downloading them if needed.
   * Streams SSE progress while the download runs. Returns the resolved paths.
   * Uses a module-level singleton promise so concurrent requests share one download.
   */
  private async ensureReferences(res: Response): Promise<ReferencePaths> {
    const existing = findExistingReferences();
    if (existing) return existing;

    if (!referenceDownloadPromise) {
      referenceDownloadPromise = downloadReferenceMaterials((msg) =>
        sseEvent(res, 'progress', { step: msg }),
      ).finally(() => {
        // Reset so a failed download can be retried on the next request
        referenceDownloadPromise = null;
      });
    } else {
      sseEvent(res, 'progress', { step: 'Waiting for reference download already in progress...' });
    }

    return referenceDownloadPromise;
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
    apiKey?: string,
  ): Promise<void> {
    process.env.ANTHROPIC_API_KEY = apiKey || process.env.CLAUDE_API_KEY;

    logger.info('Starting Claude agent execution', { stagingDir });
    sseEvent(res, 'progress', { step: 'Starting AI agent…' });

    // Resolve the SDK's cli.js explicitly so it works when bundled as CJS
    // (import.meta.url is undefined in CJS, which the SDK normally uses to locate cli.js)
    let pathToClaudeCodeExecutable: string | undefined;
    try {
      const sdkPkg = require.resolve('@anthropic-ai/claude-agent-sdk/package.json');
      pathToClaudeCodeExecutable = path.join(path.dirname(sdkPkg), 'cli.js');
    } catch {
      // SDK not found in node_modules; fall back and let the SDK try import.meta.url
    }

    for await (const message of query({
      prompt,
      options: {
        allowedTools: ['Read', 'Edit', 'Bash', 'Write', 'Glob', 'Grep'],
        ...(pathToClaudeCodeExecutable ? { pathToClaudeCodeExecutable } : {}),
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
    if (this.guardDisabled(req, res)) return;

    const { prompt, claudeApiKey } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.json(createResponse(false, undefined, 'A non-empty "prompt" field is required'));
      return;
    }

    const stopKeepalive = initSSE(res);
    const stagingDir = this.createStagingDir();

    try {
      const { bitsDir, examplesDir } = await this.ensureReferences(res);
      const root = resolveWorkspaceRoot();
      const schemaFile = path.join(root, 'schemas', 'habits.schema.yaml');

      sseEvent(res, 'progress', { step: 'Preparing prompt…' });

      const agentPrompt = [
        `You are a Habits workflow generator. Create a habit based on the following description:`,
        ``,
        `"${prompt.trim()}"`,
        ``,
        `== CRITICAL: USE BITS, NOT SCRIPTS ==`,
        `You MUST build habits using bit modules (framework: bits), NOT inline scripts.`,
        `Inline scripts (framework: script) should ONLY be used as a last resort when no bit can do the job.`,
        ``,
        `== OUTPUT RULES ==`,
        `• Create ALL files inside this directory: ${stagingDir}`,
        `• The output MUST include a stack.yaml and one or more habit YAML files.`,
        `• Create a frontend/index.yaml (YAML-driven UiSpec) if the habit benefits from a UI. NEVER create frontend/index.html.`,
        `• Do NOT create, modify, or delete any files outside ${stagingDir}.`,
        `Make sure to add edges to all habits, empty if needed. `,
        ``,
        `== FRONTEND: USE YAML UISPEC (CRITICAL) ==`,
        `The frontend MUST be a \`frontend/index.yaml\` file (a UiSpec), NOT an HTML file.`,
        `The YAML is compiled to a self-contained HTML page at request time by the Cortex server.`,
        ``,
        `UiSpec file MUST start with:`,
        `  # yaml-language-server: $schema=../../../schemas/ui-spec.schema.yaml`,
        `  version: 1`,
        ``,
        `UiSpec schema reference: ${path.join(root, 'schemas', 'ui-spec.schema.yaml')}`,
        ``,
        `Key UiSpec rules:`,
        `  - Use solid colors only, NO CSS gradients.`,
        `  - Default theme: preset: neural, mode: dark`,
        `  - Use "responsePath: output" in actions to capture the workflow response.`,
        `  - Use "set: { result: \\"$response\\" }" in onSuccess to store the output.`,
        `  - Access output fields in templates as {{state.result.fieldName}}.`,
        `  - Available layouts: single, tabs, sidebar, wizard, mobile-shell, chat`,
        `  - Widget kinds include: card, form, button, result-panel, text, metric-grid, data-table,`,
        `    json-dump, markdown, alert, empty-state, spinner, streaming-panel, kv-grid, badge-list`,
        ``,
        `Example minimal frontend/index.yaml:`,
        `  # yaml-language-server: $schema=../../../schemas/ui-spec.schema.yaml`,
        `  version: 1`,
        `  meta:`,
        `    id: {workflow-id}`,
        `    title: {Habit Title}`,
        `    icon: "lucide:Bot"`,
        `  theme:`,
        `    preset: neural`,
        `    mode: dark`,
        `  state:`,
        `    result: null`,
        `  actions:`,
        `    run:`,
        `      method: POST`,
        `      endpoint: /api/{workflow-id}`,
        `      body: { input: "{{state.input}}" }`,
        `      responsePath: output`,
        `      onSuccess:`,
        `        set: { result: "$response" }`,
        `        toast: "Done!"`,
        `  widgets:`,
        `    - kind: card`,
        `      title: {Habit Title}`,
        `      children:`,
        `        - kind: form`,
        `          bindTo: state`,
        `          fields:`,
        `            - { name: input, type: text, label: Your Input, required: true }`,
        `          submit: { label: Run, action: run, loadingLabel: "Running..." }`,
        `    - kind: result-panel`,
        `      source: state.result`,
        `      showWhen: state.result`,
        `      title: Result`,
        `      sections:`,
        `        - { kind: json-dump, source: state.result, copy: true }`,
        ``,
        `== FRONTEND API ENDPOINT (CRITICAL) ==`,
        `When the generated frontend/index.yaml calls a habit, use EXACTLY this pattern:`,
        `  POST /api/{habit-id}   – submit JSON body with input fields`,
        `  GET  /api/{habit-id}   – pass inputs as query parameters`,
        `where {habit-id} is the habit's "id" field as declared in stack.yaml.`,
        ``,
        `NEVER use any of these – they do not exist:`,
        `  /api/workflows/{id}/run   ← WRONG`,
        `  /misc/execute/{id}        ← WRONG`,
        `  /api/{id}/run             ← WRONG`,
        `  /api/workflows/{id}       ← WRONG`,
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
        `2. UiSpec schema (for frontend/index.yaml): ${path.join(root, 'schemas', 'ui-spec.schema.yaml')}`,
        ``,
        `3. Example habits that correctly use bits and YAML frontends:`,
        `   • Hello-world (simplest):           ${path.join(examplesDir, 'hello-world')}`,
        `   • Personal finance (multi-habit):   ${path.join(examplesDir, 'personal-finance-advisor')}`,
        `   • Social media manager:             ${path.join(examplesDir, 'social-media-manager')}`,
        `   • Research paper assistant:          ${path.join(examplesDir, 'research-paper-assistant')}`,
        `   Browse ${examplesDir} for more examples.`,
        `   For each example, read its frontend/index.yaml to see how the YAML UI is structured.`,
        ``,
        `== KEY PATTERNS ==`,
        `• stack.yaml lists workflows with id + path.`,
        `• habit.yaml defines nodes, edges, and output.`,
        `• Node type MUST be "action" (not "script") when using a bit.`,
        `• Use {{node-id.result.field}} or {{node-id}} for data flow between nodes.`,
        `• Use {{habits.input.field}} for workflow inputs.`,
        `• Use {{habits.env.VAR_NAME}} for environment variables / secrets.`,
        ``,
        `== KNOWN PITFALLS — AVOID THESE ==`,
        ``,
        `1. ENV VAR NAMES: Use HABITS_ prefix for env vars, like HABITS_OPENAI_API_KEY (not OPENAI_API_KEY) for the OpenAI bit.`,
        `   The standard prefix for all habit env vars is HABITS_. Example:`,
        `     credentials:`,
        `       openai:`,
        `         apiKey: "{{habits.env.HABITS_OPENAI_API_KEY}}"`,
        ``,
        `2. WORKFLOW ID MUST MATCH IN BOTH PLACES: The "id:" field inside a habit YAML file`,
        `   must be identical to the "id:" registered for that file in stack.yaml.`,
        `   Wrong:  stack.yaml says  id: get-history  but habit.yaml says  id: get-all-records`,
        `   Right:  both say         id: get-history`,
        ``,
        `3. FRONTEND RESPONSE SHAPE: The response from POST /api/{habit-id} has data.output as a map.`,
        `   In UiSpec, use responsePath: output and set: { result: "$response" }.`,
        `   Then access fields as {{state.result.fieldName}} in templates.`,
        ``,
        `5. NO habits.now: The template expression {{habits.now}} is NOT supported and will`,
        `   be stored as the literal string "habits.now". Never use it.`,
        `   For timestamps, rely on the database bit's automatic _createdAt field instead.`,
        ``,
        `6. OPTIONAL INPUT DEFAULTS: Always provide a default for optional template fields to`,
        `   prevent unresolved literals being stored in databases or sent to APIs:`,
        `     "{{habits.input.name || ''}}"      // correct`,
        `     "{{habits.input.name}}"            // WRONG if the field might be absent`,
        ``,
        `Read the reference bits and examples above, then generate the habit files.`,
      ].join('\n');

      // Write prompt log to staging dir for debugging
      fs.writeFileSync(path.join(stagingDir, '_agent-prompt.log'), agentPrompt, 'utf-8');

      await this.executeClaudeAgent(agentPrompt, stagingDir, res, claudeApiKey);
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
    if (this.guardDisabled(req, res)) return;

    const { prompt, claudeApiKey } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.json(createResponse(false, undefined, 'A non-empty "prompt" field is required'));
      return;
    }

    const stopKeepalive = initSSE(res);
    const stagingDir = this.createStagingDir();

    try {
      const { bitsDir } = await this.ensureReferences(res);

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

      await this.executeClaudeAgent(agentPrompt, stagingDir, res, claudeApiKey);
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
