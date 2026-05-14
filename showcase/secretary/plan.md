# Secretary Habit - Implementation Plan

A personal AI secretary that runs in the Tauri mobile/desktop app. Two modes: **Briefing** (reads files
and Slack, produces a structured daily brief) and **Do It** (free-text prompt that organizes files,
sends Slack messages, sends Telegram messages, and browses the web).

---

## Architecture Decision: Tauri-native bit-agent via stub

`bit-agent` currently spawns Node.js child processes for every MCP server (`StdioClientTransport` from
`@modelcontextprotocol/sdk`). This does not work in a Tauri WebView. The approach is:

- Mirror the `bit-filesystem` pattern: add a `stubs/tauri-agent.js` file to `@ha-bits/bit-agent` that
  replaces `run-agent.ts` at bundle time.
- The stub exposes the identical `createAction({ name: 'run_agent', ... })` API surface so no habit YAML
  changes are needed between server and Tauri modes.
- Instead of connecting to MCP servers, the stub builds `DynamicStructuredTool` instances that call
  `invoke('plugin:fs|...')`, `fetch()` to Slack/Telegram APIs, etc.
- `createReactAgent` from `@langchain/langgraph/prebuilt` and `DynamicStructuredTool` from
  `@langchain/core/tools` have no Node.js dependencies - they run fine in-browser with esbuild
  `platform: 'browser'`.
- `ChatOpenAI` must be constructed with `configuration: { dangerouslyAllowBrowser: true }`.

---

## File Structure

```
showcase/secretary/
  plan.md                    <- this file
  stack.yaml
  habits/
    briefing.yaml
    do-it.yaml
  frontend/
    index.html
```

---

## Phase 0: Pre-requisite Changes

### 0.1 - Create Tauri stub for bit-agent

**File to create:** `nodes/bits/@ha-bits/bit-agent/src/stubs/tauri-agent.ts`

Must export a `createAction({ name: 'run_agent', ... })` that:

1. Reads `propsValue.mcpServers` and `authValue.mcpSecrets` (same input schema as run-agent.ts).
2. Calls `buildTauriTools(mcpServers, mcpSecrets)` which maps each `type` to native tools (see Tool
   Definitions below).
3. Creates the LLM with:
   ```ts
   new ChatOpenAI({
     openAIApiKey: authValue.apiKey,
     modelName: model,
     temperature,
     configuration: { dangerouslyAllowBrowser: true },
   })
   ```
4. Runs `createReactAgent({ llm, tools })` and invokes it with `{ messages }` exactly as run-agent.ts.
5. Returns the same output shape: `{ success, response, model, provider, toolsAvailable, toolCalls, ... }`.

Helper `getInvoke()` pattern (copy from tauri-driver.js):
```js
function getInvoke() {
  if (typeof window === 'undefined') return null;
  if (window.__TAURI__?.core?.invoke) return window.__TAURI__.core.invoke;
  if (window.__TAURI__?.invoke) return window.__TAURI__.invoke;
  if (window.__TAURI_INTERNALS__?.invoke) return window.__TAURI_INTERNALS__.invoke;
  return null;
}
```

#### Tool Definitions per mcpServers[].type

**type: "filesystem"**

Uses `invoke('plugin:fs|...')` with `options: { baseDir: params.tauriBaseDir ?? BASE_DIR_APPDATA }`.
BaseDirectory enum values (Tauri v2 TS): APPDATA=14, DOCUMENT=3, DOWNLOAD=8, HOME=16, TEMP=12.

| Tool name | invoke command | Key params |
|---|---|---|
| `fs_list_directory` | `plugin:fs\|read_dir` | `path`, `options.baseDir` |
| `fs_read_file` | `plugin:fs\|read_text_file` | `path`, `options.baseDir` |
| `fs_write_file` | `plugin:fs\|write_text_file` | `path`, `contents`, `options.baseDir` |
| `fs_move_file` | `plugin:fs\|rename` | `oldPath`, `newPath`, `options.baseDir` |
| `fs_copy_file` | `plugin:fs\|copy_file` | `fromPath`, `toPath`, `options.baseDir` |
| `fs_delete_file` | `plugin:fs\|remove` | `path`, `options.recursive`, `options.baseDir` |
| `fs_create_directory` | `plugin:fs\|mkdir` | `path`, `options.recursive`, `options.baseDir` |
| `fs_file_exists` | `plugin:fs\|exists` | `path`, `options.baseDir` |
| `fs_stat` | `plugin:fs\|stat` | `path`, `options.baseDir` |

All fs invoke commands need the capability permissions listed in 0.3 below.

**type: "slack"**

Uses `fetch('https://slack.com/api/...')` with `Authorization: Bearer <mcpSecrets.SLACK_BOT_TOKEN>`.
No invoke needed, standard browser fetch works in Tauri.

| Tool name | Endpoint | Key params |
|---|---|---|
| `slack_send_message` | `POST /chat.postMessage` | `channel`, `text` |
| `slack_get_messages` | `GET /conversations.history` | `channel`, `limit` (default 20) |
| `slack_list_channels` | `GET /conversations.list` | `limit` (default 50) |
| `slack_get_channel_info` | `GET /conversations.info` | `channel` |

Required env secret: `SLACK_BOT_TOKEN` in `mcpSecrets`.

**type: "telegram"**

Uses `fetch('https://api.telegram.org/bot<TOKEN>/...')`.
Token from `mcpSecrets.TELEGRAM_BOT_TOKEN`.

| Tool name | Endpoint | Key params |
|---|---|---|
| `telegram_send_message` | `POST /sendMessage` | `chat_id` (from mcpSecrets.TELEGRAM_CHAT_ID or tool param), `text`, `parse_mode` (optional) |
| `telegram_send_photo` | `POST /sendPhoto` | `chat_id`, `photo` (URL or file_id), `caption` |
| `telegram_get_updates` | `GET /getUpdates` | `offset`, `limit` |
| `telegram_get_me` | `GET /getMe` | - |

Required env secrets: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` in `mcpSecrets`.

**type: "fetch"**

Generic HTTP via browser `fetch()` (no invoke needed).

| Tool name | Description | Key params |
|---|---|---|
| `http_get` | Fetch any URL via GET | `url`, `headers` (optional JSON) |
| `http_post` | POST to any URL | `url`, `body` (string), `headers` (optional JSON) |

**type: "notification"**

Uses `invoke('plugin:notification|...')`.

| Tool name | invoke command | Key params |
|---|---|---|
| `notification_show` | `plugin:notification\|notify` | `title`, `body`, `icon` (optional) |
| `notification_check_permission` | `plugin:notification\|is_permission_granted` | - |
| `notification_request_permission` | `plugin:notification\|request_permission` | - |

Note: On mobile, `plugin:notification|is_permission_granted` must return true before showing. OS prompts
for permission on first use.

**type: "clipboard"**

Uses `invoke('plugin:clipboard-manager|...')`. Text-only on mobile.

| Tool name | invoke command | Key params |
|---|---|---|
| `clipboard_read` | `plugin:clipboard-manager\|read_text` | - |
| `clipboard_write` | `plugin:clipboard-manager\|write_text` | `text` |

**type: "store"**

Uses `invoke('plugin:store|...')`. Persistent key-value store, survives app restarts.

| Tool name | invoke command | Key params |
|---|---|---|
| `store_get` | `plugin:store\|get` | `path` (store filename, e.g. "secretary.json"), `key` |
| `store_set` | `plugin:store\|set` | `path`, `key`, `value` |
| `store_delete` | `plugin:store\|delete` | `path`, `key` |
| `store_keys` | `plugin:store\|keys` | `path` |
| `store_save` | `plugin:store\|save` | `path` (flush to disk) |

---

### 0.2 - Register the stub in bit-agent package.json

**File:** `nodes/bits/@ha-bits/bit-agent/package.json`

Add to the `"habits"` object:
```json
{
  "habits": {
    "catalog": true,
    "featured": true,
    "stubs": {
      "@ha-bits/bit-agent/lib/actions/run-agent": "./dist/stubs/tauri-agent.js"
    }
  }
}
```

The bundle-generator's `createStubRedirectPlugin` reads `habits.stubs` and intercepts the relative
import of `./lib/actions/run-agent` inside `@ha-bits/bit-agent`, replacing it with the stub path.
The key must exactly match `<packageName>/<relative-path-without-extension>`.

---

### 0.3 - Add fs + notification + clipboard + store permissions to mobile capabilities

**File:** `habits-cortex/src-tauri/capabilities/mobile.json`

Currently only has `"deep-link:default"`. Add:
```json
"permissions": [
  "core:default",
  "deep-link:default",
  { "identifier": "http:default", "allow": [{ "url": "*://*" }] },
  "fs:default",
  "fs:scope-appdata-recursive",
  "fs:allow-appdata-read-recursive",
  "fs:allow-appdata-write-recursive",
  "fs:allow-appdata-meta-recursive",
  "fs:allow-exists",
  "fs:allow-read-file",
  "fs:allow-read-text-file",
  "fs:allow-write-file",
  "fs:allow-write-text-file",
  "fs:allow-mkdir",
  "fs:allow-remove",
  "fs:allow-rename",
  "fs:allow-copy-file",
  "fs:allow-read-dir",
  "fs:allow-stat",
  "fs:allow-lstat",
  { "identifier": "fs:scope", "allow": ["**/*"] },
  "dialog:default",
  "dialog:allow-open",
  "notification:default",
  "notification:allow-is-permission-granted",
  "notification:allow-request-permission",
  "notification:allow-notify"
]
```

Note: `{ "identifier": "fs:scope", "allow": ["**/*"] }` grants capability-level scope. iOS/Android OS
will still show its own permission dialog at runtime when the app first accesses a path outside its
sandbox (e.g. ~/Documents). User must accept.

---

### 0.4 - Add "telegram" preset to mcp-presets.ts (server mode)

**File:** `nodes/bits/@ha-bits/bit-agent/src/lib/common/mcp-presets.ts`

For Node.js/server mode, add a `telegram` preset using the community MCP server:
```ts
telegram: {
  name: 'Telegram',
  command: 'npx',
  args: ['-y', '@elct9620/mcp-telegram'],
  transport: MCP_TRANSPORTS.STDIO,
  requiredSecrets: ['TELEGRAM_BOT_TOKEN'],
  env: (secrets) => ({ TELEGRAM_BOT_TOKEN: secrets.TELEGRAM_BOT_TOKEN }),
}
```

If no reliable community server exists, skip and document as Tauri-only. The stub handles Telegram in
Tauri mode via direct fetch() regardless.

---

## Phase 1: Showcase Habit

### 1.1 - stack.yaml

```yaml
version: "1.0"
name: "Secretary"
workflows:
  - id: briefing
    path: ./habits/briefing.yaml
    enabled: true
    webhookTimeout: 120000
  - id: do-it
    path: ./habits/do-it.yaml
    enabled: true
    webhookTimeout: 120000
server:
  port: 13000
  host: "0.0.0.0"
  frontend: ./frontend
  openapi: true
logging:
  level: info
  outputs: [console]
  format: text
  colorize: true
```

---

### 1.2 - habits/briefing.yaml

- **id:** briefing
- **No user input required** (fully automatic)
- **Env:**
  - `OPENAI_API_KEY` (required)
  - `SLACK_BOT_TOKEN` (optional, include if Slack briefing wanted)
  - `SLACK_CHANNEL_ID` (optional, the channel to read from)
  - `FILES_DIRECTORY` (required, absolute path e.g. `/Users/me/Documents` or `~/Documents`)
- **One node:** `bit-agent` `run_agent`
  - `mcpServers: [filesystem, slack]`
  - `systemPrompt:` instructs agent to: (1) list FILES_DIRECTORY, (2) read any recently modified files,
    (3) read Slack messages from SLACK_CHANNEL_ID, (4) produce structured brief with sections:
    **Files Summary**, **Slack Highlights**, **Action Items**
  - `model: gpt-4o`, `maxIterations: 20`, `temperature: 0.3`
- **Output:** `{{briefing-agent.response}}`

---

### 1.3 - habits/do-it.yaml

- **id:** do-it
- **Input:**
  - `prompt` (textarea, required, label: "What do you want to do?")
- **Env:**
  - `OPENAI_API_KEY` (required)
  - `SLACK_BOT_TOKEN` (optional)
  - `SLACK_CHANNEL_ID` (optional)
  - `TELEGRAM_BOT_TOKEN` (optional)
  - `TELEGRAM_CHAT_ID` (optional)
  - `FILES_DIRECTORY` (optional)
- **One node:** `bit-agent` `run_agent`
  - `mcpServers: [filesystem, slack, telegram, fetch, notification, clipboard]`
  - `systemPrompt:` general personal secretary. Can organize files, send Slack messages, send Telegram
    messages, fetch web pages, show notifications, and read/write clipboard. Always confirm destructive
    actions (delete, move) before executing. For Telegram, use TELEGRAM_CHAT_ID env by default unless
    user specifies a different chat.
  - `model: gpt-4o`, `maxIterations: 25`, `temperature: 0.5`
- **Output:** `{{do-it-agent.response}}`

---

### 1.4 - frontend/index.html

Two-tab mobile-first UI. Template files to reference:
- **Streaming pattern:** `showcase/marketing-campaign/frontend/index.html`
- **Mobile UI tokens:** `showcase/wise-google-payment-invoice-processor/frontend/index.html`

Requirements:
- Dark mode, no gradients, solid colors, `--ha-*` design tokens
- Viewport meta: `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover`
- Meta: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`
- `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)`
- Font: `-apple-system, BlinkMacSystemFont, 'SF Pro Display'`
- Tailwind CDN
- `-webkit-tap-highlight-color: transparent`

**Briefing tab:**
- Single "Get Briefing" button
- Loading spinner during fetch
- Renders response sections (Files Summary, Slack Highlights, Action Items) as card blocks
- Streams via NDJSON: `fetch('/api/briefing?stream=true', { method: 'POST' })`

**Do It tab:**
- `<textarea>` for prompt (auto-resize, placeholder: "What do you want to do?")
- Send button (bottom-right, rounded, accent color)
- Streams response below as agent narrates steps
- Show each tool call as a small pill/tag (e.g. "fs_list_directory", "slack_send_message")
- Final answer rendered in a result card

**NDJSON streaming pattern** (from marketing-campaign):
```js
const response = await fetch(`/api/${workflowId}?stream=true`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    if (line.trim()) {
      const event = JSON.parse(line);
      // event shape: { nodeId, nodeName, status, output, duration }
      // or final: { type: 'execution_completed', output }
      handleStreamEvent(event);
    }
  }
}
```

---

## Phase 2: Verification Steps

### 2.1 - Stub bundle verification (server mode)
```bash
pnpm nx test-habit @ha-bits/manage --path=showcase/secretary/stack.yaml
```
Verify no StdioClientTransport errors in server mode (Telegram preset may warn/skip if not installed).

### 2.2 - Tauri bundle verification
Build the cortex bundle with secretary habit included and verify that `StdioClientTransport` and
`child_process` are NOT present in the output (replaced by stub):
```bash
# From workspace root - build cortex bundle
pnpm nx build @ha-bits/cortex-core --skip-nx-cache
# Check bundle does not contain stdio spawn
grep -c 'child_process' habits-cortex/www/cortex-bundle.js
```

### 2.3 - Tauri app manual test (desktop first, then mobile)
```bash
pnpm nx dev habits-cortex
```
1. Import `showcase/secretary/stack.yaml` into the Tauri app
2. Set env vars (OPENAI_API_KEY, optionally SLACK_BOT_TOKEN, TELEGRAM_BOT_TOKEN)
3. Run Briefing workflow - confirm OS file permission dialog appears on first fs access
4. Accept permission, verify brief renders with file list and (if configured) Slack messages
5. Run Do It with: `"list files in my Downloads folder"` - verify fs_list_directory tool call
6. Run Do It with: `"send a Telegram message to my channel saying hello"` - verify Telegram API called
7. Run Do It with: `"send a Slack message to #general saying I'm working"` - verify Slack API called

### 2.4 - Mobile build test
```bash
# iOS
pnpm nx build habits-cortex --target=ios
# Android
pnpm nx build habits-cortex --target=android
```
Verify `mobile.json` permissions are applied and no capability errors in the Tauri build log.

---

## Known Limitations

| Limitation | Reason | Workaround |
|---|---|---|
| Briefing reads only one Slack channel | bit-slack has no channel discovery in stub | Pass SLACK_CHANNEL_ID in env; agent can call slack_list_channels tool to discover others |
| File organize: batch moves are sequential | No loop construct in the agent tool loop, but agent CAN call fs_move_file multiple times | Agent handles this naturally by calling the tool in a loop within its iteration budget |
| Telegram read: no polling | Polling requires a background process | Not in scope; only sending supported |
| iOS deep file access | iOS sandbox; user must grant permission per path via OS dialog | Document in habit README: user accepts permission prompt on first run |
| No offline LLM fallback | bit-agent stub always calls OpenAI API | Future: detect bit-local-ai availability and route to local model |

---

## Phase 3: All Bits as Agent Tools

This phase transforms the agent into a **universal meta-orchestrator**: every loaded bit becomes a LangChain tool the agent can call dynamically.

### 3.1 - Add `getBitManifest()` and `runAction()` to HabitsBundle

**File:** `bundle-generator/template.js`

```js
getBitManifest: function() {
  const manifest = {};
  for (const [name, mod] of Object.entries(bitsRegistry)) {
    const piece = mod.default || mod[Object.keys(mod)[0]];
    if (!piece || !piece.actions) continue;
    const actions = typeof piece.actions === 'function' ? piece.actions() : piece.actions;
    manifest[name] = { displayName: piece.displayName || name, runtime: piece.runtime || 'all', actions: {} };
    for (const [actionName, action] of Object.entries(actions)) {
      manifest[name].actions[actionName] = {
        displayName: action.displayName || actionName,
        description: action.description || '',
        props: Object.entries(action.props || {}).map(([k, p]) => ({
          name: k, type: p.type, displayName: p.displayName,
          description: p.description || '', required: p.required ?? false, defaultValue: p.defaultValue,
        })),
      };
    }
  }
  return manifest;
},
runAction: async function(moduleName, actionName, propsValue, credentials) {
  const mod = bitsRegistry[moduleName];
  if (!mod) throw new Error('Bit not loaded: ' + moduleName);
  const piece = mod.default || mod[Object.keys(mod)[0]];
  const actions = typeof piece.actions === 'function' ? piece.actions() : piece.actions;
  const action = actions[actionName];
  if (!action) throw new Error('Action not found: ' + actionName + ' in ' + moduleName);
  return await action.run({ auth: credentials || null, propsValue: propsValue || {} });
},
```

### 3.2 - `buildAllBitsTools()` in tauri-agent.ts stub

Calls `getBitManifest()`, skips exclusion list, skips native-covered bits, skips `bit-shell` on mobile.
Zod type mapping: SHORT_TEXT/LONG_TEXT/URL -> z.string(), NUMBER -> z.number(), CHECKBOX -> z.boolean(), JSON -> z.record(z.any()), ARRAY -> z.array(z.any()), STATIC_DROPDOWN -> z.string(). Non-required wrapped in `.optional()`. Every schema adds `_credentials: z.record(z.string()).optional()`.
Tool name: `bit__<short>__<action>` (strip `@ha-bits/bit-`).

### 3.3 - New mcpServers type: "all-bits"

Processed last so native tools take priority. Server mode uses `executeBitsModule()` directly.

### 3.4 - do-it.yaml with all-bits

Add `- type: all-bits`, `maxIterations: 40`. System prompt lists full tool catalogue by category.

### 3.5 - briefing.yaml with all-bits

Add `- type: all-bits`, `maxIterations: 30`. System prompt adds email, calendar, GitHub sources.

### 3.6 - Exclusion list

Excluded: ~~bit-agent~~ (circular), ~~bit-if/loop/any-of/scheduler~~ (control flow), ~~bit-auth/cookie/oauth-mock~~ (internal), ~~bit-hello-world/httpbin~~ (examples), ~~bit-ai~~ (types), ~~bit-local-ai/litert~~ (heavy), ~~bit-wifi/system-settings~~ (device sensors). Mobile-only: ~~bit-shell~~ filtered by `isMobile()`.

### 3.7 - Verification

- `window.HabitsBundle.getBitManifest()` -> ~40 keys
- `window.HabitsBundle.runAction('@ha-bits/bit-http', 'request', { url: 'https://httpbin.org/json', method: 'GET' })` -> status 200
- Do It: "Fetch open GitHub PRs" -> `bit__github__list_prs` in tool call trace
- iOS sim: `getBitManifest()` does NOT include `@ha-bits/bit-shell`
