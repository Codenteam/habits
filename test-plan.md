# YAML Frontend Test Plan — 15 Habits

Each step tests **one habit’s `frontend/index.yaml`** (YAML takes precedence over `index.html` when both exist).

Run habits **one at a time** — many share port `15000`, and several share `13000`.

## Testing rules

**NEVER test by calling the API directly.**

Do **not** use:

- `curl`, `fetch`, Postman, or HTTP clients against `/api/*`
- `pnpm nx test-habit` or any workflow runner that bypasses the UI
- MCP/server tools that POST to habit endpoints without going through the page

Every step must be verified **only through the live browser DOM** — the same way a user would:

1. Open the habit URL in a browser (or Browser DevTools MCP)
2. Take an accessibility snapshot to find fields, buttons, and tabs
3. **Fill** inputs and textareas with real test data
4. **Click** buttons, tabs, list items, and file-upload controls
5. **Read** what appears on the page (result panels, lists, metrics, alerts)

Pass or fail is based on **what you see and interact with on screen**, not on API response JSON.

## Prerequisites

- Dependencies installed and workspace built (`pnpm install`)
- `HABITS_OPENAI_API_KEY` set (required for most AI workflows)
- Email/RSS habits: Gmail IMAP and Slack credentials configured for full pipeline tests
- A browser (manual) or Browser DevTools MCP for automated DOM interaction

## Commands

```bash
# Start a habit server — then test in the browser only
pnpm nx cortex habits --config showcase/<habit>/stack.yaml
```

Stop the previous server (`Ctrl+C`) before starting another habit on the same port.

## Pass criteria (every step)

1. Page title matches `meta.title` in `frontend/index.yaml` (visible in the browser tab)
2. Layout matches the YAML spec (single / split / tabs) — visible in the DOM
3. Forms accept typed/pasted input; submit buttons are clickable
4. After submit, the page shows new content (result panel, list rows, metrics) or a visible error alert — **verified by looking at the page**, not by inspecting network responses
5. No uncaught errors in the browser console during the interaction

---

## Step 1 — `budget-analyst`

| | |
|---|---|
| **Config** | `showcase/budget-analyst/stack.yaml` |
| **URL** | http://localhost:15000 |
| **Layout** | single |

**Test (DOM only):** Type or paste sample budget/financial data into the textarea → click **Analyze budget**.

**Expect:** A result section appears on the page with HTML analysis content (not an empty panel).

---

## Step 2 — `daily-standup`

| | |
|---|---|
| **Config** | `showcase/daily-standup/stack.yaml` |
| **URL** | http://localhost:15000 |
| **Layout** | single |

**Test (DOM only):** Type or paste 3–5 bullet tasks into the textarea → click **Generate standup**.

**Expect:** Standup content appears on the page with Yesterday / Today / Blockers visible.

---

## Step 3 — `email-drafts`

| | |
|---|---|
| **Config** | `showcase/email-drafts/stack.yaml` |
| **URL** | http://localhost:15000 |
| **Layout** | split |

**Test (DOM only):** Type a situation in the left textarea → click **Generate drafts**.

**Expect:** Draft text appears in the right panel (multiple tone variants visible).

---

## Step 4 — `habit-reflection`

| | |
|---|---|
| **Config** | `showcase/habit-reflection/stack.yaml` |
| **URL** | http://localhost:15000 |
| **Layout** | single |

**Test (DOM only):** Paste weekly check-in answers into the textarea → click **Analyze my week**.

**Expect:** Reflection content appears on the page (insights, victories, roadmap sections visible).

---

## Step 5 — `idea-validator`

| | |
|---|---|
| **Config** | `showcase/idea-validator/stack.yaml` |
| **URL** | http://localhost:15000 |
| **Layout** | split |

**Test (DOM only):** Paste a startup idea into the textarea → click **Validate idea**.

**Expect:** Report text appears in the right panel.

---

## Step 6 — `meeting-notes`

| | |
|---|---|
| **Config** | `showcase/meeting-notes/stack.yaml` |
| **URL** | http://localhost:15000 |
| **Layout** | split |

**Test (DOM only):** Paste meeting notes into the textarea → click **Summarize**.

**Expect:** Summary text appears in the right panel (decisions and action items readable on screen).

---

## Step 7 — `minimal-blog`

| | |
|---|---|
| **Config** | `showcase/minimal-blog/stack.yaml` |
| **URL** | http://localhost:13000 |
| **Layout** | single |

**Test (DOM only):** Load the page → confirm **Latest posts** is visible → click **Refresh posts**.

**Expect:** Page shows "No posts yet." or a list of post titles and excerpts — verified visually, without calling any API yourself.

**Note:** Covers the home page only. Admin, contact, and post detail pages are separate HTML routes.

---

## Step 8 — `pr-review-brief`

| | |
|---|---|
| **Config** | `showcase/pr-review-brief/stack.yaml` |
| **URL** | http://localhost:15000 |
| **Layout** | split |

**Test (DOM only):** Paste a `git diff` into the left textarea → click **Generate brief**.

**Expect:** Brief text appears in the right panel.

---

## Step 9 — `product-changelog`

| | |
|---|---|
| **Config** | `showcase/product-changelog/stack.yaml` |
| **URL** | http://localhost:15000 |
| **Layout** | split |

**Test (DOM only):** Paste raw `git log` output into the textarea → click **Generate release notes**.

**Expect:** Release notes appear on the page (What's New / Improvements / Fixes sections visible).

---

## Step 10 — `resume-tailor`

| | |
|---|---|
| **Config** | `showcase/resume-tailor/stack.yaml` |
| **URL** | http://localhost:15000 |
| **Layout** | split |

**Test (DOM only):** Fill both textareas (job description and resume) → click **Tailor my resume**.

**Expect:** Tailored resume text appears in the right panel.

---

## Step 11 — `study-flashcards`

| | |
|---|---|
| **Config** | `showcase/study-flashcards/stack.yaml` |
| **URL** | http://localhost:15000 |
| **Layout** | single |

**Test (DOM only):** Paste study material into the textarea → click **Generate flashcards**.

**Expect:** Flashcard list appears on the page with question/answer pairs visible.

---

## Step 12 — `email-digest-summarizer`

| | |
|---|---|
| **Config** | `showcase/email-digest-summarizer/stack.yaml` |
| **URL** | http://localhost:13000 |
| **Layout** | single |

**Test (DOM only):** Click **Run email digest** and wait for the page to update.

**Expect:** Metric numbers and/or a summaries table appear on the page (not merely a network 200).

**Note:** Requires Gmail and Slack credentials for a full successful run.

---

## Step 13 — `rss-digest-summarizer`

| | |
|---|---|
| **Config** | `showcase/rss-digest-summarizer/stack.yaml` |
| **URL** | http://localhost:13000 |
| **Layout** | single |

**Test (DOM only):** Click **Start automation** → read the Status field on the page (should show "Running") → click **Stop automation**.

**Expect:** Status label on the page changes between "Running" and "Stopped" after each button click.

---

## Step 14 — `real-estate-agent-leads-management`

| | |
|---|---|
| **Config** | `showcase/real-estate-agent-leads-management/stack.yaml` |
| **URL** | http://localhost:13000 |
| **Layout** | tabs |

**Test (DOM only):**

1. Click **Lead Form** tab → fill all required fields → click **Submit lead**
2. Click **Contacts** tab → confirm the lead appears in a list → click the lead row
3. On **Process Lead** — confirm details, language dropdown, and file upload are visible
4. Click **Today's Calls** tab — confirm the page renders (list or empty state)
5. Click **End of Day** tab → click **Run EOD analysis**

**Expect:** Each tab switch works via clicks; after submit, new list items are visible on screen; process view shows lead fields and forms.

---

## Step 15 — `real-estate-social-marketing`

| | |
|---|---|
| **Config** | `showcase/real-estate-social-marketing/stack.yaml` |
| **URL** | http://localhost:13000 |
| **Layout** | tabs |

**Test (DOM only):**

1. Click **Add Property** tab → type a listing URL → click **Extract and generate posts**
2. Click **Properties** tab → click a property in the list
3. Click **Process** tab — confirm details and social post text are visible; interact with schedule fields/buttons if present
4. Click **Scheduled** tab — confirm queue list or empty state is visible

**Expect:** All tab clicks work; after adding a property, a new row/card appears in the Properties list; Process shows Twitter/LinkedIn preview text on the page.

---

## Quick reference

| Step | Habit | Port | Layout |
|------|-------|------|--------|
| 1 | budget-analyst | 15000 | single |
| 2 | daily-standup | 15000 | single |
| 3 | email-drafts | 15000 | split |
| 4 | habit-reflection | 15000 | single |
| 5 | idea-validator | 15000 | split |
| 6 | meeting-notes | 15000 | split |
| 7 | minimal-blog | 13000 | single |
| 8 | pr-review-brief | 15000 | split |
| 9 | product-changelog | 15000 | split |
| 10 | resume-tailor | 15000 | split |
| 11 | study-flashcards | 15000 | single |
| 12 | email-digest-summarizer | 13000 | single |
| 13 | rss-digest-summarizer | 13000 | single |
| 14 | real-estate-agent-leads-management | 13000 | tabs |
| 15 | real-estate-social-marketing | 13000 | tabs |

## Compile check (preflight only — not a substitute for DOM testing)

YAML must compile before browser testing. This script does **not** count as passing any step above.

```bash
pnpm exec tsx -e "
import fs from 'fs';
import { compileUiYaml } from '@ha-bits/cortex-core';
const habits = [
  'budget-analyst','daily-standup','email-digest-summarizer','email-drafts',
  'habit-reflection','idea-validator','meeting-notes','minimal-blog',
  'pr-review-brief','product-changelog','real-estate-agent-leads-management',
  'real-estate-social-marketing','resume-tailor','rss-digest-summarizer','study-flashcards'
];
for (const h of habits) {
  const src = fs.readFileSync('showcase/' + h + '/frontend/index.yaml', 'utf8');
  compileUiYaml(src);
  console.log('OK', h);
}
"
```
