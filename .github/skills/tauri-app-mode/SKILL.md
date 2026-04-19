---
name: tauri-app-mode
description: 'EXCLUSIVE Tauri desktop/mobile app development mode. Use when: building native features, implementing Tauri commands, working on habits-cortex Tauri app, testing device capabilities (WiFi, SMS, Email, Keyring, Matter), or when user says "app mode", "tauri only", "native app". NEVER use Node.js Cortex server, HTTP endpoints, or npx habits commands in this mode. All functionality must go through Tauri invoke(), DOM manipulations using webdriver, and Rust commands.'
argument-hint: 'Describe the Tauri feature or native capability you need'
---

# Tauri App Mode (Exclusive)

## CRITICAL CONSTRAINTS

**NEVER DO** in this mode:
- Never start or reference the Node.js Cortex server
- Never use `npx habits`, `pnpm nx dev @ha-bits/cortex`, or any server commands
- Never use HTTP endpoints like `/api/`, `/misc/workflows`, or `localhost:3000`
- Never suggest or implement server-side workflow execution
- Never use `httpyac` or `curl` for API testing
- Never reference `packages/cortex/` code

**ALWAYS DO** in this mode:
- **Test via Tauri WebDriver MCP tools** (primary testing method): packages/manage/src/mcp/tauri.ts
- Use Tauri `invoke()` for all backend operations
- Implement native features via Rust commands in `src-tauri/`
- Edit stubs in bits
- Use Tauri plugins for device capabilities
- Reference code in `habits-cortex/src-tauri/` directory

## Testing with MCP (Primary Method)

The tauri-webdriver MCP server provides comprehensive testing capabilities. **Always use MCP tools for testing habits in app mode.**

### Quick Start Testing Flow
```
1. mcp_tauri-webdriv_run_app          → Launch the Tauri app
2. mcp_tauri-webdriv_start_session    → Connect WebDriver
3. mcp_tauri-webdriv_pack_habit       → Pack stack.yaml to .habit
4. mcp_tauri-webdriv_import_habit_file → Install the habit
5. mcp_tauri-webdriv_select_habit     → Activate the habit
6. mcp_tauri-webdriv_list_workflows   → Verify workflows loaded
7. mcp_tauri-webdriv_run_workflow     → Test a workflow with inputs
8. mcp_tauri-webdriv_take_screenshot  → Capture results
9. mcp_tauri-webdriv_close_session    → Cleanup
10. mcp_tauri-webdriv_stop_app        → Stop the app
```

### MCP Tools by Category

**App Lifecycle:**
- `mcp_tauri-webdriv_run_app` - Start Tauri app (target: macos, ios-sim, android-emu)
- `mcp_tauri-webdriv_stop_app` - Stop the running app
- `mcp_tauri-webdriv_build_app` - Build for platform (debug/release)
- `mcp_tauri-webdriv_get_status` - Check WebDriver/app status
- `mcp_tauri-webdriv_list_devices` - List available simulators/emulators

**Session Management:**
- `mcp_tauri-webdriv_start_session` - Start WebDriver session
- `mcp_tauri-webdriv_close_session` - End session

**Habit Management:**
- `mcp_tauri-webdriv_pack_habit` - Pack stack.yaml → .habit file
- `mcp_tauri-webdriv_import_habit_file` - Install habit by path
- `mcp_tauri-webdriv_list_habits` - List installed habits
- `mcp_tauri-webdriv_select_habit` - Activate a habit
- `mcp_tauri-webdriv_remove_habit` - Uninstall a habit

**Workflow Testing:**
- `mcp_tauri-webdriv_list_workflows` - List workflows in current habit
- `mcp_tauri-webdriv_run_workflow` - Run workflow via UI (with inputs)
- `mcp_tauri-webdriv_run_workflow_noui` - Run workflow directly (no UI interaction)
- `mcp_tauri-webdriv_get_app_state` - Get internal app state

**DOM Interaction:**
- `mcp_tauri-webdriv_find_element` - Find single element by CSS
- `mcp_tauri-webdriv_find_elements` - Find all matching elements
- `mcp_tauri-webdriv_click_element` - Click an element
- `mcp_tauri-webdriv_send_keys` - Type into input field
- `mcp_tauri-webdriv_get_element_text` - Read element text
- `mcp_tauri-webdriv_get_element_attribute` - Get element attribute
- `mcp_tauri-webdriv_wait_for_element` - Wait for element to appear
- `mcp_tauri-webdriv_get_visible_elements` - List all interactive elements

**Page/Navigation:**
- `mcp_tauri-webdriv_navigate` - Go to URL
- `mcp_tauri-webdriv_get_url` - Get current URL
- `mcp_tauri-webdriv_get_title` - Get page title
- `mcp_tauri-webdriv_get_page_source` - Get HTML source

**Debugging:**
- `mcp_tauri-webdriv_execute_script` - Run JavaScript in app context
- `mcp_tauri-webdriv_take_screenshot` - Capture screenshot (base64 PNG)

**File Operations:**
- `mcp_tauri-webdriv_write_app_file` - Upload file to app's data directory (chunked)

**CLI Integration:**
- `mcp_tauri-webdriv_run_test` - Run habits-test CLI commands

### Example: Test a Habit End-to-End

```
# 1. Launch app
mcp_tauri-webdriv_run_app

# 2. Connect
mcp_tauri-webdriv_start_session

# 3. Pack and import
mcp_tauri-webdriv_pack_habit(stackPath: "showcase/local-ai/stack-no-ui.yaml")
mcp_tauri-webdriv_import_habit_file(habitPath: "/path/to/output.habit")

# 4. Activate and verify
mcp_tauri-webdriv_select_habit(name: "Local AI (No UI)")
mcp_tauri-webdriv_list_workflows  → Should show ask-local-ai, generate-image, etc.

# 5. Test workflow
mcp_tauri-webdriv_run_workflow(workflowId: "ask-local-ai", inputs: { prompt: "hello" })

# 6. Verify result
mcp_tauri-webdriv_get_visible_elements  → Check output rendered
mcp_tauri-webdriv_take_screenshot

# 7. Cleanup
mcp_tauri-webdriv_close_session
mcp_tauri-webdriv_stop_app
```

## Project Structure

```
habits-cortex/
├── src-tauri/           # Rust backend - ALL backend logic here
│   ├── src/
│   │   ├── main.rs      # Entry point
│   │   ├── lib.rs       # Command registrations
│   │   └── commands/    # Tauri commands
│   ├── Cargo.toml
│   └── capabilities/    # Permission configs
├── tauri-plugin-*/      # Native plugins
│   ├── tauri-plugin-email/
│   ├── tauri-plugin-keyring/
│   ├── tauri-plugin-matter/
│   ├── tauri-plugin-sms/
│   ├── tauri-plugin-wifi/
│   └── tauri-plugin-system-settings/
└── www/                 # Frontend assets
```

## Tauri v2 Invoke Pattern

```typescript
// Frontend: Use window.__TAURI__.core.invoke()
const invoke = window.__TAURI__.core.invoke.bind(window.__TAURI__.core);

// IMPORTANT: Rust snake_case params become camelCase in JS
const result = await invoke('my_command', { 
  modelPath: '/path/to/model',  // NOT model_path
  maxTokens: 100                // NOT max_tokens
});

// Always handle errors - Tauri v2 rejects with plain strings
try {
  const data = await invoke('command_name', args);
} catch (e) {
  throw new Error(typeof e === 'string' ? e : e.message);
}
```

## Implementing New Features

### 1. Add Rust Command
```rust
// src-tauri/src/commands/my_feature.rs
#[tauri::command]
pub async fn my_feature(app: tauri::AppHandle, param_name: String) -> Result<String, String> {
    // Implementation
    Ok("result".to_string())
}
```

### 2. Register Command
```rust
// src-tauri/src/lib.rs
.invoke_handler(tauri::generate_handler![
    commands::my_feature::my_feature,
])
```

### 3. Add Capability
```json
// src-tauri/capabilities/default.json
{
  "permissions": ["my-feature:allow-my-feature"]
}
```

## Alternative: Rust Unit Tests

For testing Rust commands directly (without UI):
```bash
cd habits-cortex/src-tauri && cargo test
```

## Build Commands

```bash
# Dev mode
cd habits-cortex && pnpm tauri dev

# Build release
cd habits-cortex && pnpm tauri build

# Build for specific target
cd habits-cortex && pnpm tauri build --target aarch64-apple-darwin
```

## Available Tauri Plugins

| Plugin | Purpose |
|--------|---------|
| tauri-plugin-email | Send emails natively |
| tauri-plugin-sms | Send SMS messages |
| tauri-plugin-wifi | WiFi network operations |
| tauri-plugin-keyring | Secure credential storage |
| tauri-plugin-matter | Smart home device control |
| tauri-plugin-system-settings | OS settings access |
| tauri-plugin-local-ai | Local LLM inference |

## When This Mode is Triggered

- User mentions "app", "native", "tauri", "desktop app", "mobile app"
- Working on files in `habits-cortex/src-tauri/`
- User explicitly says "app mode" or "tauri only"
- Building device-specific features (Bluetooth, NFC, camera, etc.)
- User wants offline-capable functionality

## File Upload to App (Chunked Transfer)

WebDriver doesn't natively support `<input type="file">` on WebKit-based Tauri apps. A chunked file transfer system exists to send files to the app's data directory.

### How It Works

1. **MCP Server** ([packages/manage/src/mcp/tauri.ts](packages/manage/src/mcp/tauri.ts#L1676-L1738)):
   - `write_app_file` tool reads the source file
   - Splits into **500KB chunks** (512000 bytes)
   - Each chunk: base64 encode → WebDriver execute_async → Tauri invoke
   - Uses `append: true` for chunks after the first

2. **Rust Handler** ([habits-cortex/src-tauri/src/lib.rs](habits-cortex/src-tauri/src/lib.rs#L95-L145)):
   - `write_app_data_file` Tauri command receives chunks
   - Decodes base64 → writes/appends to file in `appDataDir`
   - Creates parent directories automatically

### Usage

```typescript
// Via MCP tool
mcp_tauri-webdriv_write_app_file({
  sourcePath: "/local/path/to/file.zip",
  destPath: "habits/imported/file.zip"  // Relative to appDataDir
})
```

### Implementation Reference

**TypeScript (chunking):**
```typescript
const chunkSize = 512000; // 500KB
for (let i = 0; i < totalChunks; i++) {
  const chunk = fileContent.slice(start, end);
  const base64Content = chunk.toString('base64');
  await webdriver('POST', `/session/${sid}/execute/async`, {
    script: `window.__TAURI__.core.invoke('write_app_data_file', {
      base64Content: arguments[0],
      relativePath: arguments[1],
      append: arguments[2]
    }).then(done).catch(...)`,
    args: [base64Content, destPath, i > 0],
  });
}
```

**Rust (receiving):**
```rust
#[tauri::command]
async fn write_app_data_file(
    app_handle: tauri::AppHandle,
    base64_content: String,
    relative_path: String,
    append: Option<bool>,
) -> Result<WriteAppDataFileResult, String> {
    let append_mode = append.unwrap_or(false);
    let app_data_dir = app_handle.path().app_data_dir()?;
    let bytes = base64::decode(&base64_content)?;
    
    OpenOptions::new()
        .write(true).create(true)
        .append(append_mode).truncate(!append_mode)
        .open(&full_path)?
        .write_all(&bytes)?;
}
```

### When to Use

- Importing habit files (.habit) into the app
- Uploading test assets (images, data files)
- Transferring large files that don't fit in single WebDriver script
- Any file > 500KB needs this chunked approach

### Limitations

- No streaming; full file loaded into memory on MCP server side
- Base64 encoding adds ~33% overhead per chunk
- Progress logged every 50 chunks to console
