# Known issues (YAML-driven frontends)

Issues observed during showcase habit migration. Documented for awareness — not necessarily scheduled fixes.

## YAML migration progress (batch of 16)

Tracked habits from the **Next batch** request. **Builds** = `frontend/index.yaml` compiles via `scripts/smoke-test-ui-engine.mjs`. **Agent tested** = packed, run on port 13000, and E2E-checked (browser and/or API). **User tested** = you manually verified and signed off (or reported issues). **Issues** = count of open entries for that habit in this file (see sections below).

| Habit | Builds | Agent tested | User tested | Issues |
|--------|--------|--------------|-------------|--------|
| ai-agent-lead-enrichment | Yes | Yes | No | 0 |
| ai-cookbook | Yes | Yes | Yes | 0 |
| ai-invoice-mailer | Yes | Yes | No | 0 |
| ai-journal | Yes | Yes | Yes | 0 |
| client-invoice-manager | Yes | Yes | No | 0 |
| content-digest-summarizer | Yes | Yes | No | 0 |
| email-demo | Yes | Yes | Yes | 0 |
| email-ticket-routing | Yes | Partial | No | 1 |
| emails-categorization | Yes | Partial | No | 1 |
| hello-world | Yes | Yes | Yes | 0 |
| invoices-processing | Yes | Partial | No | 1 |
| marketing-campaign | Yes | Yes | Yes | 1 |
| qr-database | Yes | Yes | Yes | 0 |
| resume-analyzer | Yes | Yes | Yes | 0 |
| rss-social-poster | Yes | Skipped | — | 0 |
| social-media-multi-posting | Yes | Skipped | — | 0 |

**Legend:** Partial (agent) = YAML migrated but marked needs double-check, or E2E not finished. Partial (user) = you exercised the habit and reported feedback (e.g. qr-database Archive, resume-analyzer tab overflow — both fixed). Skipped = not validated end-to-end (blocker or intentionally deferred). **—** = not applicable (habit skipped before user testing).

Last compile check: all 16 habits — **16 ok, 0 failed**.

---

## Migration workflow prompts

Prompt used to drive the initial bulk YAML conversion (all remaining HTML frontends):

> Now go through the remaining ones one by one, create the yaml, render it to html, compare the two html functionally and if all good, continue to the next one until you are done.

Prompt used to start the **showcase batch** migration (pack → run on port 13000 → E2E → your approval → next):

> Next batch:
> ai-agent-lead-enrichment - AI Agent Lead Enrichment
> ai-cookbook - AI Cookbook
> ai-invoice-mailer - AI Invoice Mailer
> ai-journal - AI Journal
> client-invoice-manager - Client Invoice Manager
> content-digest-summarizer - Content Digest Summarizer
> email-demo - Email Send & Receive Demo
> email-ticket-routing - Email Ticket Routing
> emails-categorization - Emails Categorization
> hello-world - Hello World Habit
> invoices-processing - Invoices Processing
> marketing-campaign - Marketing Campaign Generator
> qr-database - QR Code Manager
> resume-analyzer - Resume Analyzer
> rss-social-poster - RSS Social Poster
> social-media-multi-posting - Social Media Multi-Posting

Per-habit agent workflow after that: migrate/fix `showcase/<id>/frontend/index.yaml` → `pnpm nx build @ha-bits/cortex-core` (when runtime changes) → `node scripts/smoke-test-ui-engine.mjs showcase/<id>/frontend/index.yaml` → pack `.habit` → `habits cortex` on **13000** → E2E → await your OK before continuing.

Prompt used to gate progress — **wait for your verification on each habit before moving to the next** (originally for a 10-habit pilot; same rule applied to the 16-habit batch):

> Now pick 10 habits. One by one run pack it with the yaml, then run the output .habit, then you test it, and allow me to test it, when you are OK with it. When both of us are ok with it, I'll let you know and we can move to the next one. Pick 10 randomly but a good mix of features so we can cover everything.

**Rule:** Do not start the next habit until you have tested the current one on port 13000 and explicitly said OK (or reported issues to fix first).

---

## Social-media habits — skipped (batch E2E)

The following habits in this batch are **intentionally skipped** for pack → port 13000 → agent/user E2E validation. YAML compiles; no further migration testing unless requested.

- **rss-social-poster** — RSS → OpenAI → Twitter/X + LinkedIn; requires social OAuth and feed env vars.
- **social-media-multi-posting** — scheduled multi-platform posting; same OAuth/scheduling stack.

## marketing-campaign — canvas node output shown as JSON

When the workflow streams `webcanvas` and `draftcanvas` (`create_canvas` bit) nodes, the streaming panel renders their output as raw JSON (via `{{item.output | json}}` in the item body template). This is expected for now; a dedicated canvas preview widget is not yet wired up.

## cloud-file-upload — OAuth requires env vars

Google Drive OAuth will not register until these environment variables are set (e.g. in a `.env` at the repo root when running `habits cortex`):

- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`

Get credentials from [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Enable the Google Drive API and add `http://localhost:13000/oauth/bit-google-drive/callback` as an authorized redirect URI.

In the monorepo, `@ha-bits/bit-google-drive` is loaded from `nodes/bits/@ha-bits/bit-google-drive` when npm install is unavailable.

## email-ticket-routing — needs double-check (workflow + env)

YAML frontend migration is done, but end-to-end behavior should be **re-verified** before calling this habit production-ready.

**Observed during migration testing:**

- Results table can show **literal template strings** (e.g. `email.subject`, `email.from`) instead of resolved email fields — likely workflow output / expression resolution in `assign-ticket` / `send-email`, not the YAML UI.
- **SMTP credentials** must be configured for the assign/send step; without them the send sub-workflow fails even though the UI may still show `ticketsAssigned: 1` (loop uses `continueOnError`).
- `emailsFetched` metric may warn (`get-emails.results[0].output.count` not found) when the fetch step returns an unexpected shape.

**Action:** Double-check with real IMAP inbox + valid SMTP env vars and confirm table rows show real subject/from/category values. Not fixing workflow or env setup in this migration pass.

## emails-categorization — needs double-check (workflow + env)

YAML frontend migration is done, but end-to-end behavior should be **re-verified** before calling this habit production-ready.

**Observed during migration testing:**

- **Telegram** delivery requires `HABITS_TELEGRAM_BOT_TOKEN` and `HABITS_TELEGRAM_CHAT_ID`; without them the pipeline fails at the notify step even if categorization succeeded.
- **IMAP + OpenAI** must be configured for fetch/categorize steps (same email stack as other email habits).
- Auto-poll was removed from the YAML (`toggle` widget is not implemented in the UI runtime); only manual **Categorize now** is available.
- Results table uses nested paths (`output.subject`, `output.category`, etc.) on loop results — confirm real inbox data renders correctly (not empty or literal template strings).

**Action:** Double-check with a live inbox and Telegram credentials; confirm metrics and table match the Telegram report. Not fixing workflow or env setup in this migration pass.

## invoices-processing — needs double-check (workflow + env)

YAML frontend migration is done, but end-to-end behavior should be **re-verified** before calling this habit production-ready.

**Observed during migration testing:**

- Requires **Gmail IMAP**, **OpenAI**, and **Google Sheets** credentials for the full scan → extract → save pipeline.
- The YAML UI uses a flat **data-table** (vendor, invoice #, amount, etc.); per-invoice **line items** from the HTML UI are not rendered (nested table removed with unsupported `list` widget).
- Metrics use workflow fields (`totalEmails`, `processed`, `sheetsSaved`) rather than the HTML’s client-side “invoices found” count (`hasInvoice` filter).
- Table rows use nested paths (`output.vendorName`, etc.) on loop results — confirm real attachment extractions render correctly.

**Action:** Double-check with a live inbox and Sheets access; confirm extracted rows match what lands in the spreadsheet. Not fixing workflow or env setup in this migration pass.
