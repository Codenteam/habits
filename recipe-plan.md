# Plan: Recipes Section + Tools Section + Mirror Rename

## TL;DR
Fully additive docs restructure: add a "Tools" sidebar section covering Admin, Cortex Server, Desktop App, Mobile App, and Mirror; add a "Recipes" section with 10 use-case playbooks; and rename the "Share" P2P feature to "Mirror" across docs and code.

---

## Phase 1, Mirror Rename (Share → Mirror)

### Docs changes
- `docs/misc/habit-viewer.md`, rename "Share Habit Link" button reference → "Mirror Habit"
- Any mention of "share" in docs that refers to the P2P feature (search and replace carefully, not generic "share" words)


## Phase 2, Tools Section (new sidebar + new docs pages)

### Sidebar addition in `config.ts`
Insert after "Getting Started", before "Deep Dive":

```
Tools
├── Base (Visual Builder)          → /tools/base
├── Cortex Server                  → /tools/cortex-server
├── Desktop App                    → /tools/desktop-app
├── Mobile App                     → /tools/mobile-app
├── Admin                          → /tools/admin
└── Mirror (P2P Habit Transfer)    → /tools/mirror
```

### New pages in `docs/tools/`
Each is a thin 1-page tool reference that aggregates links to existing content. No new authoritative content is duplicated.

| Page | Content |
|---|---|
| `base.md` | Visual builder, drag-drop editor, YAML export, links to `/deep-dive/creating` |
| `cortex-server.md` | CLI, REST API, self-hosting, Docker, links to `/deep-dive/running` |
| `desktop-app.md` | macOS/Windows/Linux Tauri app, offline execution, keychain, links to `/downloads` |
| `mobile-app.md` | iOS/Android, device features (WiFi, SMS, Location), links to `/downloads` |
| `admin.md` | Multi-Cortex orchestrator, subdomain routing, habit library, screenshots from `public/images/admin*.webp` |
| `mirror.md` | WebRTC P2P habit transfer, signaling server, 6-char pairing code, explains the rename from "Share" |

---

## Phase 3, Recipes Section (new sidebar + new docs pages)

### Sidebar addition in `config.ts`
Insert after "Tools", before "Showcase":

```
Recipes
├── Overview                           → /recipes/
├── Company Automation Hub             → /recipes/company-hub
├── Customer SaaS Platform             → /recipes/customer-saas
├── AI Agent Orchestration             → /recipes/ai-agents
├── White-Label App Distribution       → /recipes/white-label
├── Personal Device Workflows          → /recipes/personal-device
├── Offline Field Operations           → /recipes/offline-field
├── Content & Marketing Automation     → /recipes/content-marketing
├── Developer CI/CD Pipelines          → /recipes/developer-cicd
├── Multi-Tenant Habit Marketplace     → /recipes/habit-marketplace
└── Data Privacy / On-Prem AI          → /recipes/on-prem-ai
```

### Recipe page template
Each page follows this fixed structure:
- **The scenario** (1 paragraph, who, what, why)
- **Tools you'll use** (table: tool → role)
- **Architecture** (markdown table or D2 diagram)
- **Quick start** (link to closest Showcase + 10-line `stack.yaml` snippet)
- **Key bits** (links to relevant bits)
- **Next steps** (links to tool pages and deep-dive)

### Recipe summaries

| # | Recipe | Who it's for | Core tools |
|---|---|---|---|
| 1 | **Company Automation Hub** | IT/ops deploying shared workflows company-wide | Admin + Cortex Server |
| 2 | **Customer SaaS Platform** | SaaS founders exposing habits as a product | Admin + Cortex Server + Auth bit |
| 3 | **AI Agent Orchestration** | Internal platform teams running 24/7 AI agents | Cortex Server + bit-agent + bit-openai + Scheduler |
| 4 | **White-Label App Distribution** | Agencies/ISVs shipping branded native apps to clients | Desktop/Mobile App (packed Tauri) |
| 5 | **Personal Device Workflows** | Power users with SMS triggers, location automations | Mobile App + WiFi/SMS/Location bits |
| 6 | **Offline Field Operations** | Field teams (construction, healthcare) with intermittent connectivity | Mobile App (offline) + local database bit |
| 7 | **Content & Marketing Automation** | Marketing teams automating posts, emails, scraping | Cortex Server + bit-openai + bit-email + Scheduler |
| 8 | **Developer CI/CD Pipelines** | Dev teams using habits as a lightweight CI runner | Cortex Server + bit-github + bit-shell |
| 9 | **Multi-Tenant Habit Marketplace** | Platform companies hosting a browse-and-run habit store | Admin (multi-tenant) + Cortex Server |
| 10 | **Data Privacy / On-Prem AI** | Regulated industries (healthcare, legal, finance) with no cloud | Cortex Server + bit-local-ai (fully on-prem) |

---

## Relevant Files

### Phase 1 (Mirror rename)
- `packages/manage/admin/src/ui/templates/layout.hbs`
- `packages/manage/admin/src/services/system-catalog.ts`
- `habits-cortex/www/index.html`
- `habits-cortex/www/runner.js`
- `docs/misc/habit-viewer.md`

### Phase 2 & 3 (new docs)
- `docs/.vitepress/config.ts`, sidebar array (lines 62–175)
- `docs/tools/`, new directory (6 pages)
- `docs/recipes/`, new directory (11 pages: `index.md` + 10 recipes)

### Existing cross-link targets
- `docs/deep-dive/creating.md`, `running.md`, `pack-distribute.md`
- `docs/showcase/`
- `docs/downloads.md`
- `docs/bits/` (individual bit pages)

---

## Verification Checklist

- [ ] Dev server renders Tools and Recipes sidebar sections with no dead links
- [ ] All 6 tool pages resolve correctly
- [ ] All 11 recipe pages resolve correctly
- [ ] Admin UI nav shows "Mirror" not "Share"
- [ ] Cortex App UI shows "Mirror" not "Share"
- [ ] `@ha-bits/share` package still installs and functions (name unchanged)
- [ ] Existing sidebar sections (About, Getting Started, Deep Dive, Showcase, Bits) are unaffected

---

## Decisions

- Package names (`@ha-bits/share`, `habits-share`, `window.HabitShare`) are **NOT renamed**, would be breaking changes
- URL route `/share` kept as-is, only display labels change
- Tool pages are intentionally thin (aggregators only), no duplicated authoritative content
- Recipe pages are pointer-heavy, quick to write, easy to expand later
- Desktop App and Mobile App are **separate sidebar entries** even though they share one Tauri codebase, they have meaningfully different feature sets
