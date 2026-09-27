# Sheets ↔ Airtable Sync

Bidirectional sync showcase between **Google Sheets** and **Airtable** with shared column configuration, SQLite deduplication, and background polling triggers.

## How it works

### 1. Configure columns (UI)

Run **Configure & sync headers** in the UI (`configure-fields` workflow):

1. Parse comma-separated column names
2. Create missing fields in Airtable (`ensureFields`)
3. Write row 1 as headers in Google Sheets (`writeRange`)
4. Save config to SQLite (`sheets-airtable-sync.db`)

### 2. Background sync habits

| Workflow | Direction | Trigger | Action |
|----------|-----------|---------|--------|
| `sync-airtable-to-sheets` | Airtable → Sheets | `newRecords` (1 min) | `appendRow` |
| `sync-sheets-to-airtable` | Sheets → Airtable | `newRows` (1 min) | `createRecord` |

Both habits load the shared column config, look up a content-based **itemId** in SQLite, and use **`bit-if`** branches to either sync or skip duplicates.

### 3. Deduplication (shared itemId)

Both sync habits build the same **itemId** from all configured columns:

1. Normalize every column to a trimmed string (including empty columns)
2. `fieldsJson = JSON.stringify({ Name: "Jane", Email: "jane@example.com", ... })`
3. `itemId = hash(fieldsJson)` → stored as `sync-item:<itemId>` in SQLite

Before syncing, each habit:

1. Looks up `sync-item:<itemId>` in the database
2. **`bit-if` branch** — separate nodes per branch:
   - **New** (`found === false`): reserve → write → save item → log synced
   - **Exists** (else): log skipped only

Because both directions share the same itemId for the same field values, a row synced from Airtable is automatically skipped when the Sheets trigger sees it again, and vice versa.

---

## Airtable setup (first time)

### 1. Create an Airtable account

1. Go to [airtable.com](https://airtable.com) and sign up (or sign in) with email or Google.
2. Complete onboarding until you reach the Airtable **home** screen (your list of bases).

#### If Omni is shown during signup

New Airtable accounts often go through **Omni** (Airtable’s AI onboarding assistant) before you reach home. Complete these steps so you land on home correctly:

1. **Sign up / sign in** — finish email verification if prompted.
2. **Omni intro** — when Omni appears, read the welcome and click **Continue** (or the primary button) to start.
3. **Answer Omni’s questions** — it may ask about your company, industry, role, or team. Pick any answers that fit (they only personalize the suggested starter app).
4. **Suggested app** — Omni may offer to build a starter base (e.g. “Build it”). You can either:
   - Click **Build it**, answer any follow-up questions, and wait for Omni to finish creating a workspace, **or**
   - Look for **Skip**, **I’ll do this later**, **Go to home**, or close the Omni panel if you prefer to start from a blank base.
5. **Confirm you are on home** — you should see the main Airtable screen with **Create** (or your list of bases/workspaces). The URL is typically `https://airtable.com` (not stuck on a signup or Omni-only screen).
6. If Omni opens inside a generated base instead of home, click the **Airtable logo** (top left) or **Home** in the sidebar to return to your base list.

You can use an Omni-generated base for testing, but **Step 3** below explains creating a dedicated base and clearing default fields for this showcase.

### 2. Create a personal access token (PAT)

1. Open **[airtable.com/create/tokens](https://airtable.com/create/tokens)**.
2. Click **Create token**.
3. Give it a name (e.g. `habits-sheets-airtable-sync`).
4. Under **Scopes**, enable all of these:
   - `data.records:read`
   - `data.records:write`
   - `schema.bases:read`
   - `schema.bases:write` — required so the showcase can **create columns** via the API
5. Under **Access**, add the **workspace** where you will create your test base.
   - The token can only reach bases in workspaces you grant here. If the base and token are in different workspaces, API calls will fail with permission errors.
   - For a quick test, you can choose **All current and future bases in all current and future workspaces** (only if you are comfortable with that scope).
6. Click **Create token** and copy the token (starts with `pat...`). Store it safely — you will not see it again.

### 3. Create a base and table

1. Go back to [airtable.com](https://airtable.com) **home**.
2. Click **Create** → **Build an app on your own** → start from scratch (or use a template and rename it).
3. Open the new base. By default you get a table (often named **Table 1**).
4. **Remove the default columns** so the showcase can create its own from the UI:
   - For each existing column header, open the column menu → **Delete field** (or **Customize fields** and remove them).
   - Leave the table with **no custom fields** (or only fields you do not plan to manage from this showcase).
5. Optional: rename the table to something like `Sync` (name does not affect the API; you will use the table **ID** in `.env`).

### 4. Confirm token and base are in the same workspace

1. In Airtable home, note which **workspace** your new base lives under.
2. Open [airtable.com/create/tokens](https://airtable.com/create/tokens), edit your token, and verify that workspace is listed under **Access**.
3. Your Airtable user must be **Owner or Creator** on that base to create fields via the API.

### 5. Get your Airtable credentials

#### Personal access token (`AIRTABLE_PAT`)

- Value: the `pat...` string from [airtable.com/create/tokens](https://airtable.com/create/tokens).
- If you lost it, create a new token with the same scopes and workspace access.

#### Base ID (`AIRTABLE_BASE_ID`)

1. Open your base in the browser.
2. Look at the URL:

   ```
   https://airtable.com/appXXXXXXXXXXXXXX/tblYYYYYYYYYYYYYY/...
   ```

3. Copy the segment that starts with **`app`** — that is your base ID.

#### Table ID (`AIRTABLE_TABLE_ID`)

1. With the same base open, click the table you want to use.
2. The URL still contains both IDs:

   ```
   https://airtable.com/appXXXXXXXXXXXXXX/tblYYYYYYYYYYYYYY/...
   ```

3. Copy the segment that starts with **`tbl`** — that is your table ID.

### Required PAT scopes

- `data.records:read`
- `data.records:write`
- `schema.bases:read`
- `schema.bases:write` — required to **create fields** via [Create field API](https://airtable.com/developers/web/api/create-field)

Your Airtable user must be **base creator** to create fields. The token must have **access to the workspace** that contains the base.

### Auto field types

When creating columns from the UI, types are inferred from the name:

| Name contains | Airtable type |
|---------------|---------------|
| email | `email` |
| phone, mobile, tel | `phoneNumber` |
| url, website, link | `url` |
| amount, price, total, count | `number` |
| note, description, comment | `multilineText` |
| (default) | `singleLineText` |

Example: `Name, Email, Phone` → `singleLineText`, `email`, `phoneNumber`.

---

## Google Sheets setup

### 1. Create OAuth credentials

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create a project (or pick an existing one).
3. Enable the **Google Sheets API** for that project.
4. Create **OAuth 2.0 Client ID** credentials (type: **Web application**).
5. Add an authorized redirect URI for local dev:

   ```
   http://localhost:13000/oauth/bit-google-sheets/callback
   ```

6. Copy the **Client ID** and **Client secret** into `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### 2. Create or pick a spreadsheet

1. Open [Google Sheets](https://sheets.google.com) and create a spreadsheet (or use an existing one).
2. Note the **spreadsheet ID** from the URL:

   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```

3. Set `GOOGLE_SPREADSHEET_ID` in `.env` to that ID.
4. Note the **tab name** at the bottom of the sheet (e.g. `Sheet1`, `Weekly Report`). Set `GOOGLE_SHEET_NAME` to that tab name.

The showcase will write **row 1** as headers when you configure columns. Add new data rows starting at **row 2**.

### 3. Authorize Google OAuth

After starting the server:

```
http://localhost:13000/oauth/bit-google-sheets/init
```

Sign in and grant access. The token is stored for `readRange`, `writeRange`, `appendRow`, and the `newRows` polling trigger.

---

## Understanding `GOOGLE_RANGE`

`GOOGLE_RANGE` tells the **Sheets → Airtable** polling trigger which cells to read. It uses **A1 notation**: `TabName!TopLeft:BottomRight`.

### Format

```
GOOGLE_RANGE=<sheet-tab>!<start-cell>:<end-cell>
```

| Part | Meaning | Example |
|------|---------|---------|
| Sheet tab | Which tab/sheet to poll | `Sheet1` or `'Weekly Report'` |
| `!` | Separator between tab and cells | Required |
| Start cell | Top-left corner of the range | `A1` |
| End cell | Bottom-right corner of the range | `Z1000` |

### Examples

**Simple tab name (no spaces):**

```env
GOOGLE_SHEET_NAME=Sheet1
GOOGLE_RANGE=Sheet1!A1:Z1000
```

**Tab name with spaces — wrap in single quotes:**

```env
GOOGLE_SHEET_NAME=Weekly Report
GOOGLE_RANGE='Weekly Report'!A1:Z1000
```

If the tab name has spaces and you omit quotes, the range is invalid and polling will fail.

**Fewer columns (e.g. 4 columns):**

```env
GOOGLE_RANGE=Sheet1!A1:D500
```

Column `A` = first configured field, `B` = second, and so on (same order as in the UI).

### What the range should include

| Row | Purpose |
|-----|---------|
| **Row 1** | Header row — written by **Configure columns**; skipped by the poll (`hasHeaderRow: true`) |
| **Row 2+** | Data rows — new rows here trigger **Sheets → Airtable** sync |

The range must:

- **Start at row 1** so the trigger knows where the header is (even though row 1 is skipped for “new row” events).
- **Extend far enough down** (e.g. `Z1000`) so new rows you append are inside the range.
- **Cover all columns** you use (e.g. `A:D` for four fields).

### `GOOGLE_SHEET_NAME` vs `GOOGLE_RANGE`

| Variable | Used for |
|----------|----------|
| `GOOGLE_SHEET_NAME` | **configure-fields** (header row) and **Airtable → Sheets** (`appendRow`) |
| `GOOGLE_RANGE` | **Sheets → Airtable** polling (`newRows` / `readRange`) |

Usually both refer to the **same tab**. Keep them consistent:

```env
GOOGLE_SHEET_NAME=Sheet1
GOOGLE_RANGE=Sheet1!A1:Z1000
```

### Common mistakes

| Mistake | Fix |
|---------|-----|
| `GOOGLE_RANGE=Weekly Report!A1:Z100` (spaces, no quotes) | `GOOGLE_RANGE='Weekly Report'!A1:Z1000` |
| Range only covers row 1 | Use `A1:Z1000` (or similar) so data rows are included |
| Tab name in range doesn’t match `GOOGLE_SHEET_NAME` | Use the exact tab name from the sheet |
| Range too narrow (e.g. `A1:A100`) | Include all columns: `A1:D1000` for 4 fields |

### How polling uses the range

Every minute, `sync-sheets-to-airtable`:

1. Reads all cells in `GOOGLE_RANGE`
2. Skips row 1 (headers)
3. For each data row, builds an **itemId** from column values
4. If **itemId** is new in SQLite → creates an Airtable record
5. If **itemId** already exists → skips (no duplicate)

Rows are deduplicated by **content**, not row number — so inserting a row in the middle does not re-sync old rows, as long as the cell values are unchanged.

---

## Environment variables

Copy `.env.example` to `.env` in this folder:

```bash
cp .env.example .env
```

```env
# Airtable
AIRTABLE_PAT=pat_your_token_here
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_TABLE_ID=tblYYYYYYYYYYYYYY

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Google Sheets
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SHEET_NAME=Sheet1
GOOGLE_RANGE=Sheet1!A1:Z1000

# Optional — Swagger UI at /api/docs
HABITS_OPENAPI_ENABLED=true
```

| Variable | Description |
|----------|-------------|
| `AIRTABLE_PAT` | Personal access token from [airtable.com/create/tokens](https://airtable.com/create/tokens) |
| `AIRTABLE_BASE_ID` | Base ID (`app...`) from the Airtable URL |
| `AIRTABLE_TABLE_ID` | Table ID (`tbl...`) from the Airtable URL |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_SPREADSHEET_ID` | Spreadsheet ID from the Google Sheets URL |
| `GOOGLE_SHEET_NAME` | Tab name for headers and append |
| `GOOGLE_RANGE` | A1 range for Sheets polling (see above) |
| `HABITS_OPENAPI_ENABLED` | Set to `true` for `/api/docs` |

---

## Workflows

| ID | Description |
|----|-------------|
| `configure-fields` | UI: create Airtable fields + Sheets header row + save config |
| `get-field-config` | Load saved column configuration |
| `sync-airtable-to-sheets` | Poll Airtable → append to Sheets |
| `sync-sheets-to-airtable` | Poll Sheets → create in Airtable |

---

## Database

SQLite file: `sheets-airtable-sync.db` (created in the showcase working directory).

| Collection | Purpose |
|------------|---------|
| `sheets-airtable-sync` (kv) | `field-config`, `sync-item:<itemId>` dedup entries |
| `sheets-airtable-sync-records` | Audit log of each successful sync |

---

## Run locally

```bash
pnpm habits dev showcase/sheets-airtable-sync/stack.yaml
```

1. Open `http://localhost:13000/`
2. Complete Google OAuth: `http://localhost:13000/oauth/bit-google-sheets/init`
3. In the UI, enter column names (e.g. `Name, Email, Status, Phone`) and click **Configure & sync headers**
4. Add a record in Airtable **or** a new row in Google Sheets (below the header)
5. Watch the **server terminal** for sync logs

Example log lines:

```
[Airtable → Sheets Synced] { action: "synced", itemId: "...", fields: { ... } }
[Sheets → Airtable Synced] { action: "synced", itemId: "...", airtableRecordId: "rec..." }
[Airtable → Sheets Skipped] { action: "skipped", reason: "Item ID already exists in database", ... }
```

---

## Testing sync

1. **Airtable → Sheets:** Add a record in Airtable. Within ~1 minute, it appears as a new row at the bottom of the sheet.
2. **Sheets → Airtable:** Add a row below the header in the sheet. Within ~1 minute, it appears in Airtable.
3. **No duplicate:** The opposite habit logs `Skipped: Item ID already exists in database` instead of creating the same data again.

### Reset for a clean re-test

```bash
rm -f sheets-airtable-sync.db
rm -f .habits/habits-polling.db
```

Restart the server, run **Configure & sync headers** again, then repeat your tests.

On the **first poll** after a fresh start, existing rows may sync once if they are not yet in the database or polling store. After that, only genuinely new content syncs.
