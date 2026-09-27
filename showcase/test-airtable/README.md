# Test Airtable

Test `@ha-bits/bit-airtable` with **user-defined column names** — created in Airtable automatically, then saved to `@ha-bits/bit-database` before creating records.

## How it works

1. **Configure columns** — enter field names (comma-separated). The workflow creates any missing columns in Airtable, then saves the config to the database.
2. **Create record** — enter values as labeled pairs or comma-separated text; the workflow maps them to your saved columns and calls `createRecord`.
3. **Poll new records** — `poll-new-records` runs every minute, detects new rows via `pollingStore`, and logs them to the server console.

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
3. Give it a name (e.g. `habits-test-airtable`).
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
5. Optional: rename the table to something like `Showcase` (name does not affect the API; you will use the table **ID** in `.env`).

### 4. Confirm token and base are in the same workspace

1. In Airtable home, note which **workspace** your new base lives under.
2. Open [airtable.com/create/tokens](https://airtable.com/create/tokens), edit your token, and verify that workspace is listed under **Access**.
3. Your Airtable user must be **Owner or Creator** on that base to create fields via the API.

## Get your credentials (PAT, Base ID, Table ID)

### Personal access token (`AIRTABLE_PAT`)

- Value: the `pat...` string from [airtable.com/create/tokens](https://airtable.com/create/tokens).
- If you lost it, create a new token with the same scopes and workspace access.

### Base ID (`AIRTABLE_BASE_ID`)

1. Open your base in the browser.
2. Look at the URL:

   ```
   https://airtable.com/appXXXXXXXXXXXXXX/tblYYYYYYYYYYYYYY/...
   ```

3. Copy the segment that starts with **`app`** — that is your base ID.

### Table ID (`AIRTABLE_TABLE_ID`)

1. With the same base open, click the table you want to use.
2. The URL still contains both IDs:

   ```
   https://airtable.com/appXXXXXXXXXXXXXX/tblYYYYYYYYYYYYYY/...
   ```

3. Copy the segment that starts with **`tbl`** — that is your table ID.

### Configure `.env`

Copy `.env.example` to `.env` in this folder and fill in the values:

```bash
cp .env.example .env
```

```env
AIRTABLE_PAT=pat_your_token_here
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_TABLE_ID=tblYYYYYYYYYYYYYY
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AIRTABLE_PAT` | Personal access token from [airtable.com/create/tokens](https://airtable.com/create/tokens) |
| `AIRTABLE_BASE_ID` | Base ID (`app...`) from the Airtable URL |
| `AIRTABLE_TABLE_ID` | Table ID (`tbl...`) from the Airtable URL |

### Required PAT scopes

- `data.records:read`
- `data.records:write`
- `schema.bases:read`
- `schema.bases:write` — required to **create fields** via [Create field API](https://airtable.com/developers/web/api/create-field)

Your Airtable user must be **base creator** to create fields. The token must have **access to the workspace** that contains the base.

### Auto field types

When creating columns, types are inferred from the name:

| Name contains | Airtable type |
|---------------|---------------|
| email | `email` |
| phone, mobile, tel | `phoneNumber` |
| url, website, link | `url` |
| amount, price, total, count | `number` |
| note, description, comment | `multilineText` |
| (default) | `singleLineText` |

Example: `Name, Email, Phone` → `singleLineText`, `email`, `phoneNumber`.

## Workflows

| Workflow | Description |
|----------|-------------|
| `configure-fields` | Parse names → `ensureFields` in Airtable → save to database |
| `get-field-config` | Load saved configuration |
| `create-record` | Load config → map values → `createRecord` |
| `list-records` | List recent records |
| `list-tables` | Show table and field metadata |
| `poll-new-records` | Poll every 1 min → log new Airtable records (no webhook/ngrok needed) |

### Polling new records

The `poll-new-records` workflow starts automatically with the server. Each poll fetches records (same API as `list-records`), skips IDs already in `pollingStore`, and logs each **new** record:

```
[Airtable New Record] { "recordId": "rec...", "fields": { ... } }
```

On the **first run**, any records not yet in the store are treated as new. After that, only rows added since the last poll are logged. Watch the **server terminal** while the showcase runs.

## Run locally

```bash
cd nodes/bits/@ha-bits/bit-airtable && npx tsc
pnpm habits dev showcase/test-airtable/stack.yaml
```

Open the UI, run Step 1 then Step 2.
