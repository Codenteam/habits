---
name: record-browser-demo
description: 'Record headed browser demo videos (WebM) of Habits Base UI or other web apps using Browser DevTools MCP. Use when the user asks to record a tutorial, walkthrough, screencast, or step-by-step demo in Chrome.'
argument-hint: 'What to demo and where to save (e.g., "MBTI habit build from Logic to export, save to docs/recordings")'
---

# Record Browser Demo Skill

Record step-by-step product demos as WebM video using **Browser DevTools MCP** only (VS Code extension `browser-devtools-mcp`). Do **not** use Cursor's built-in browser or `chrome-devtools` MCP for recordings.

## Prerequisites

1. **App running** — e.g. Habits Base UI at `http://localhost:3003/habits/base/` (`pnpm nx run base:dev` or `docs/commands/base-dev.md`).
2. **Browser DevTools MCP** enabled in Cursor (VS Code extension or `browser-devtools-mcp` package).
3. **Headed browser** — the recording window must be visible. Configure the extension for headful mode (`--no-headless` / headed = true). Restart MCP after config changes.
4. **Output directory** — create if missing, e.g. `docs/recordings/`.

## Recording setup (always do this first)

Run these steps **before** `content_start-recording`:

### 1. Set 1080p viewport

```json
// interaction_resize-viewport
{ "width": 1920, "height": 1080 }
```

This sets the page viewport and **screencast frame size** (1920×1080). Call it again after any navigation if the viewport resets.

Optional for headed mode — also resize the OS window so chrome matches content:

```json
// interaction_resize-window
{ "width": 1920, "height": 1080, "state": "normal" }
```

Note: `interaction_resize-window` only changes layout when viewport emulation is disabled (`viewport: null`). Prefer `interaction_resize-viewport` for reliable 1080p recordings.

### 2. Show animated mouse pointer in the video

`content_start-recording` uses CDP/Playwright screencast and does **not** expose a cursor flag. Immediately after starting recording, enable Playwright's action cursor via `execute`:

```javascript
await callTool('content_start-recording', {
  outputDir: '/absolute/path/to/docs/recordings',
  name: 'my-demo-slug'
}, true);
await page.screencast.showActions({ cursor: 'pointer' });
return 'recording started with pointer overlay';
```

`cursor: 'pointer'` draws an animated arrow that moves between click/hover targets (Playwright 1.61+). Use `cursor: 'none'` to disable.

If `page.screencast.showActions` is unavailable (older Playwright), tell the user the MCP extension may need an update; there is no OS-level mouse capture in screencast mode.

### 3. Start recording

```json
// content_start-recording
{
  "outputDir": "/absolute/path/to/docs/recordings",
  "name": "demo-slug"
}
```

Filename pattern: `{name}-{timestamp}.webm`.

## Demo workflow

```
SETUP     → resize viewport 1920×1080 → start recording → showActions(cursor)
NAVIGATE  → navigation_go-to (includeSnapshot: true)
ACT       → execute { batched interaction_* + sleep() for pacing }
INSPECT   → a11y_take-aria-snapshot before every click/fill (refs e1, e2, …)
STOP      → content_stop-recording
```

### Pacing

- Insert `await sleep(800)`–`sleep(1500)` between major steps so viewers can follow.
- Batch multi-step flows in one `execute` call (fill → click → snapshot) to reduce round-trips.
- After navigation or modal open/close, take a fresh ARIA snapshot — refs invalidate.

### Interaction rules

1. **Snapshot first, then interact** — never guess CSS selectors from screenshots.
2. Prefer refs from `a11y_take-aria-snapshot` (`e1`, `@e1`) in `interaction_click`, `interaction_fill`, etc.
3. Use `waitForNavigation: true` on clicks that change the page.
4. Dismiss blocking modals (confirm dialogs, validation overlays) before continuing.
5. For file uploads in Habits Base sidebar **Open**, use `interaction_fill` on the hidden file input with an absolute path to the YAML file.

## Habits Base demo pattern (Logic → UI → Export)

Reference recording: `docs/recordings/mbti-habit-build-*.webm`.

| Phase | Steps |
|-------|--------|
| **Logic** | Start from scratch → Open habit YAMLs from `showcase/{habit}/` → remove empty habits → set outputs in Outputs modal → rename stack |
| **UI (New)** | Toolbar **UI (New)** → wizard: Identity → Layout → Build pages (templates) → Actions (link habits) → Advanced |
| **Export** | Toolbar Export/Deploy (requires stack validation) **or** sidebar **View/Export Code (YAML)** |

### Known pitfalls

- Sidebar **Open** loads nodes/edges only — set `output:` fields manually in the Outputs modal.
- **Export/Deploy** stays disabled until connection + habit validation passes (stricter than the UI editor gate).
- `getByText` strict-mode failures — use refs or narrower role+name selectors.
- Modal overlays block clicks — close or confirm first.

## Stop recording

```json
// content_stop-recording
{}
```

Report the saved `filePath` / filename to the user.

## User-requested defaults (Cursor rule)

If the user always wants 1080p + pointer + headed Chrome, add a project rule (`.cursor/rules/record-demos.mdc`):

```markdown
When recording a browser demo:
1. Use Browser DevTools MCP only.
2. Call interaction_resize-viewport with width 1920, height 1080 before recording.
3. After content_start-recording, call page.screencast.showActions({ cursor: 'pointer' }) via execute.
4. Save videos to docs/recordings/ unless another path is specified.
5. Pace steps with 800–1500 ms pauses between major actions.
```

## Tool reference

| Tool | Purpose |
|------|---------|
| `interaction_resize-viewport` | 1080p (and responsive layout) |
| `interaction_resize-window` | OS window size (headed) |
| `content_start-recording` | Begin WebM capture |
| `content_stop-recording` | End capture, write file |
| `execute` | Batch steps; `page.screencast.showActions` for pointer |
| `navigation_go-to` | Open app URL |
| `a11y_take-aria-snapshot` | Get element refs |
| `interaction_click` / `fill` / `select` | User actions |
| `sync_wait-for-network-idle` | Wait for SPA content |

## Example prompt

> Record a headed 1080p demo of building the MBTI habit from scratch (Logic → UI wizard → export YAML). Show the mouse pointer. Save to `docs/recordings/mbti-habit-build`.
