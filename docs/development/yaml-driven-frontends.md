# YAML-driven Frontends

Habit frontends are authored as a single declarative file — `frontend/index.yaml` — and compiled to a self-contained HTML document on the fly. This guide explains the runtime, the schema, the workflow for converting an existing HTML page, and how to test the result locally.

If you already have a hand-written `frontend/index.html`, the Cortex server keeps serving it. You only opt into the YAML pipeline by adding `frontend/index.yaml`. When both files exist, the YAML wins.

## Why YAML?

A habit's UI is almost always a thin shell over its workflows: a form, a fetch, a result panel, sometimes a tab strip or a history grid. Hand-written HTML/CSS/JS for every habit means duplicated boilerplate, drifting design tokens, and a long tail of one-off bugs.

The YAML engine inverts that:

- **One schema** (`schemas/ui-spec.schema.yaml`) describes every pattern we use.
- **One renderer** (`@ha-bits/cortex-core` → `compileUiSpec`) produces consistent HTML, CSS, and a small client-side runtime.
- **One source of truth** per habit. No more `<style>` blobs to maintain.

## File layout

```
showcase/<habit-id>/
├── stack.yaml            # workflow + server config
├── habits/               # individual workflow YAMLs
└── frontend/
    ├── index.yaml        # ← the UiSpec the server compiles
    └── index.html        # optional fallback, ignored when index.yaml exists
```

The `stack.yaml` doesn't change — it still points at the folder:

```yaml
server:
  port: 13000
  frontend: ./frontend
```

The server resolves the directory and picks the first match from `index.yaml`, `index.yml`, `ui.yaml`, `ui.yml`, then `index.html`.

## How compilation works

The pipeline lives in `packages/cortex/core/src/ui/`:

```text
frontend/index.yaml
       │
       ▼
   parseUiSpec()                  // yaml → typed UiSpec
       │
       ▼
   compileUiSpec()                // UiSpec → { html, css, js }
       │      │      │
       │      │      └── runtime.ts (state, dispatch, templating, streaming)
       │      └──────── theme.ts   (CSS variables from ThemeSpec)
       └─────────────── layouts.ts + widgets.ts (server-rendered HTML)
       │
       ▼
   <!DOCTYPE html><html><head>…<style>…</style></head>
                     <body>…compiled markup…
                          <script>…RUNTIME_JS + boot data…</script>
                     </body></html>
```

What the engine handles natively (no per-habit JS needed):

- Forms (text, email, number, date, textarea, select, chip-group, radio-cards, tag-input, file/image upload with base64).
- Layouts: `single`, `tabs`, `sidebar`, `wizard`, `mobile-shell`, `split`, `chat`, `showcase`.
- Templated text: `{{state.foo}}`, `{{state.user.name | truncate:30}}`, `{{now | iso}}`.
- Conditional rendering via `showWhen` / `hideWhen`.
- Action dispatch: HTTP (`GET`/`POST`/etc.), OAuth gating, NDJSON streaming, polling.
- Output widgets: result panels, metric grids, kv-grids, score rings, progress bars, badge lists, data tables, history grids, code/markdown blocks with copy buttons.
- Drag-and-drop file zones, downloads from base64 payloads, print-friendly views.

The canonical list of widget kinds lives in `packages/cortex/core/src/ui/types.ts`.

## Server integration

The Cortex server (`packages/cortex/server/src/server.ts`) handles compilation transparently:

```text
GET /                       (habit root URL)
  └── if frontend/index.yaml exists:
        compileUiYaml(file) → HTML response
      else if frontend/index.html exists:
        sendFile(file)
```

For `.habit` zip bundles the loader applies the same rule against the bundled `frontend/` directory.

## Authoring a new YAML frontend

A minimal example:

```yaml
# yaml-language-server: $schema=../../../schemas/ui-spec.schema.yaml
version: 1

meta:
  id: hello-world
  title: Hello World Demo
  icon: "lucide:Hand"

theme:
  preset: neural
  mode: dark

state:
  name: ""
  result: null

actions:
  greet:
    method: POST
    endpoint: /api/hello-world
    body: { name: "{{state.name}}" }
    responsePath: output
    onSuccess: { set: { result: "$response" }, toast: "Greeted" }

widgets:
  - kind: card
    title: Say hello
    children:
      - kind: form
        bindTo: state
        fields:
          - { name: name, type: text, label: Your name, required: true }
        submit: { label: Say hello, action: greet, loadingLabel: "Greeting..." }
  - kind: result-panel
    source: state.result
    title: Greeting
    sections:
      - { kind: json-dump, source: state.result, copy: true }
```

That single file gives you a themed page, a validated form, a POST to `/api/hello-world`, a toast on success, a conditional result panel, and a JSON viewer with a copy button. No CSS, no JS.

## Icons

Icon fields (`meta.icon`, `layout.header.icon`, `layout.nav[].icon`, widget `icon` props) accept:

| Format | Example | Notes |
|--------|---------|-------|
| **Lucide name** (recommended) | `lucide:Zap` | 47 curated icons; inherits theme primary color |
| **Image URL** | `/assets/logo.svg` | Rendered as `<img>` |
| **Inline SVG** | `<svg viewBox="0 0 24 24">…</svg>` | Sanitized at compile time |
| **Plain text** | `◆` or `H` | Escaped text fallback |
| **Omit** | _(no field)_ | Header/nav show labels only |

Lucide icons use the full set synced from `lucide-react` into [`packages/cortex/core/icons/lucide/`](../../packages/cortex/core/icons/lucide/) (see auto-generated [`manifest.json`](../../packages/cortex/core/icons/manifest.json)). Reference any icon as `lucide:IconName` (PascalCase, e.g. `lucide:Hand`, `lucide:TriangleAlert`). Legacy kebab names like `lucide:alert-triangle` also resolve when an alias SVG exists. Re-sync after upgrading lucide: `pnpm --filter @ha-bits/cortex-core sync-lucide-icons`.

**No emoji required.** Prefer `lucide:Name` or omit the icon entirely.

**Alternatives without icons:**

- **Labels only** — drop `icon` from nav items; tabs and sidebar use text alone.
- **Hero / image widgets** — use `kind: hero` with `imageSource` for a logo instead of `meta.icon`.
- **Hide header icon slot** — `theme.customCss: ".ha-header__icon { display: none; }"`

For richer examples, browse `showcase/*/frontend/index.yaml` — every habit in this repo now has one. Notable patterns:

- Tabs + history: `showcase/ai-quiz/frontend/index.yaml`
- Multi-platform output tabs: `showcase/social-media-manager/frontend/index.yaml`
- NDJSON streaming: `showcase/marketing-campaign/frontend/index.yaml`
- Chat layout: `showcase/openclaw-clone/frontend/index.yaml`
- OAuth gating: `showcase/cloud-file-upload/frontend/index.yaml`
- Showcase dashboard: `showcase/ecommerce-retail-order-management/frontend/index.yaml`

## Schema

The full schema is `schemas/ui-spec.schema.yaml`:

<<< @/../schemas/ui-spec.schema.yaml

Wire it into your editor via `.vscode/settings.json`:

```json
{
  "yaml.schemas": {
    "./schemas/ui-spec.schema.yaml": [
      "showcase/*/frontend/index.yaml",
      "showcase/*/frontend/ui.yaml"
    ]
  }
}
```

Or pin a single file with a comment at the top:

```yaml
# yaml-language-server: $schema=../../../schemas/ui-spec.schema.yaml
```

## Testing locally

### 1. Compile every YAML in one pass

The repo ships a smoke-test script that walks `showcase/*/frontend/index.yaml`, compiles each one, and writes the rendered HTML to `.compiled-frontends/<habit-id>.html`:

```bash
pnpm nx build @ha-bits/cortex-core       # build the engine (once)
node scripts/smoke-test-ui-engine.mjs    # compile everything
```

Sample output:

```text
✓ showcase/ai-quiz/frontend/index.yaml → .compiled-frontends/ai-quiz.html (72.8 KB)
✓ showcase/hello-world/frontend/index.yaml → .compiled-frontends/hello-world.html (68.6 KB)
...
78 ok, 0 failed
```

To compile a single file:

```bash
node scripts/smoke-test-ui-engine.mjs showcase/ai-quiz/frontend/index.yaml
```

A non-zero exit code means at least one compile failed — useful for CI.

### 2. Preview the compiled HTML in a browser

```bash
cd .compiled-frontends
python3 -m http.server 7531
# open http://localhost:7531/ai-quiz.html
```

This shows the rendered page without booting Cortex — handy for checking layout, theme, and visibility logic.

### 3. Run end-to-end against Cortex

For a realistic test (real API calls, real state, real polling/streaming), boot the habit normally:

```bash
pnpm habits dev showcase/ai-quiz/stack.yaml
# open http://localhost:13000/
```

The server logs which file it served:

```text
[cortex] serving frontend YAML (index.yaml)
```

Edit `frontend/index.yaml`, refresh the browser, and you'll see the change immediately.

### 4. Authoring loop tips

- **Compile-then-diff.** When porting an HTML page, keep the original `index.html` in place. After compiling, open both side by side. Fields, copy strings, and field order should match.
- **Show conditionals.** Use `showWhen: state.foo` / `hideWhen: state.error` instead of duplicating views. The runtime evaluates them with full JS expressions (`!state.loading`, `state.queue.length > 0`).
- **Template strings.** Anything inside `{{ ... }}` is evaluated against the live state. Common filters: `truncate:N`, `date`, `iso`, `currency`, `splitCsv`, `length`, `filterBy:foo=bar`, `sum:total`, `join:', '`.
- **Default endpoint.** If you omit `endpoint`, the engine uses `/api/{meta.id}`. That covers most habits because the workflow id matches the directory.
- **Use the showcase converter.** `scripts/convert-showcase-to-yaml.mjs` parses any HTML page that follows the static showcase template (header + 4 stat cards + 3x2 habit grid) and emits an `index.yaml`. Use it as a starting point for new industry showcases.

## Adding new widgets or themes

Both live in `@ha-bits/cortex-core`:

| Concern        | File                                             |
| -------------- | ------------------------------------------------ |
| Type definitions | `packages/cortex/core/src/ui/types.ts`        |
| Themes / CSS     | `packages/cortex/core/src/ui/theme.ts`        |
| Server-side render of widgets | `packages/cortex/core/src/ui/widgets.ts` |
| Layout shells    | `packages/cortex/core/src/ui/layouts.ts`      |
  | Client runtime   | `packages/cortex/core/src/ui/runtime.ts`      |
  | Icon rendering   | `packages/cortex/core/src/ui/icons.ts`        |
  | Lucide subset    | `packages/cortex/core/icons/lucide/*.svg` + `lucideIcons.ts` |
  | Entry point      | `packages/cortex/core/src/ui/index.ts`        |

After changing the engine, rebuild and re-run the smoke test:

```bash
pnpm nx build @ha-bits/cortex-core --skip-nx-cache
node scripts/smoke-test-ui-engine.mjs
```

Remember to update `schemas/ui-spec.schema.yaml` and this doc whenever you add a new widget kind, layout, theme preset, or top-level UiSpec property.
