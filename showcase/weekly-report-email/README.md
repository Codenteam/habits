# Weekly Report Email

Reads metrics from a Google Sheet on a schedule, uses OpenAI to write a report email, and sends it via SMTP.

**Schedule:** the workflow runs **every Monday at 09:00 UTC**.

---

## 1. Set up your `.env` file

```bash
cp .env.example .env
```

| Variable | Where to get it |
|----------|-----------------|
| `HABITS_OPENAI_API_KEY` | [OpenAI API keys](https://platform.openai.com/api-keys) |
| `HABITS_GOOGLE_SHEETS_CLIENT_ID` | Google Cloud Console → OAuth client (see below) |
| `HABITS_GOOGLE_SHEETS_CLIENT_SECRET` | Same OAuth client |
| `HABITS_GOOGLE_SPREADSHEET_ID` | From your spreadsheet URL (see below) |
| `HABITS_GOOGLE_SHEET_RANGE` | A1 range, e.g. `Weekly Report!A:F` |
| `HABITS_SMTP_HOST` | e.g. `smtp.gmail.com` |
| `HABITS_SMTP_PORT` | e.g. `587` |
| `HABITS_SMTP_USER` | Your email / SMTP username |
| `HABITS_SMTP_PASSWORD` | SMTP password or Gmail [App Password](https://myaccount.google.com/apppasswords) |
| `HABITS_EMAIL_FROM` | Sender shown on the email (often same as SMTP user) |
| `HABITS_REPORT_EMAIL_TO` | Who receives the weekly report |
| `HABITS_REPORT_EMAIL_SUBJECT` | Email subject (default: `Weekly Performance Report`) |
| `HABITS_REPORT_STAKEHOLDER_NAME` | Name in the greeting (`Dear …`) |
| `HABITS_REPORT_SENDER_NAME` | Name in the sign-off (`Best regards, …`) |
| `HABITS_REPORT_SENDER_POSITION` | Optional title below sender name (e.g. `Operations Manager`) |

---

## 2. Prepare your Google Sheet

### Create a new spreadsheet ( With simple example of the headers and cells data )

1. Open [Google Sheets](https://sheets.google.com).
2. Click **Blank spreadsheet** (or **+** to create a new file).
3. At the top, rename the spreadsheet (e.g. **Team Weekly Report**) — this is the **file title**, not used in the range.
4. At the bottom, double-click the default tab **Sheet1** and rename it to **Weekly Report** — this **tab name** is what you use before `!` in the range.
5. In **row 1**, add these headers (columns A through E):

   | A | B | C | D | E |
   |---|---|---|---|---|
   | Employee | Week | Tasks Completed | Hours Worked | Status |

   As a JSON-style list (same values, row 1 only):

   ```json
   ["Employee", "Week", "Tasks Completed", "Hours Worked", "Status"]
   ```

6. In **rows 2–4**, add sample data you can try with this showcase:

   | Employee | Week | Tasks Completed | Hours Worked | Status |
   |----------|------|-----------------|--------------|--------|
   | Ahmed | 2026-W35 | 22 | 40 | Completed |
   | Sara | 2026-W35 | 27 | 40 | Completed |
   | Mohamed | 2026-W35 | 20 | 40 | In Progress |

   The workflow reads one row per employee. OpenAI uses these columns to build the team summary first, then a per-person breakdown (Ahmed, Sara, Mohamed).

### Spreadsheet ID vs sheet range

Two different settings in `.env` point at different parts of Google Sheets:

| Setting | What it is | Example |
|---------|------------|---------|
| `HABITS_GOOGLE_SPREADSHEET_ID` | The **file** ID from the browser URL | `1kZE0VbEvQGgAjBZvTDpU2oVC7bHZ4Zdw3QI7nmv6Zn8` |
| `HABITS_GOOGLE_SHEET_RANGE` | The **tab + cells** to read inside that file | `Weekly Report!A:F` |

**Spreadsheet ID** — open your sheet and copy the long string from the URL:

```
https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit
```

Put that ID in `.env`:

```env
HABITS_GOOGLE_SPREADSHEET_ID=your-spreadsheet-id-here
```

**Sheet range (A1 notation)** — tells the workflow which **tab** and which **columns/rows** to read. Format:

```
<Tab Name>!<start cell>:<end cell>
```

| Part | Meaning |
|------|---------|
| `Weekly Report` | **Sheet tab name** (bottom of the screen). Must match exactly, including spaces and capitals. |
| `!` | Separates tab name from the cell range. |
| `A:F` | Columns **A through F**, all rows that have data (row 1 = headers, rows 2+ = data). |

For the sample table above (5 columns), use:

```env
HABITS_GOOGLE_SHEET_RANGE=Weekly Report!A:F
```

- `A:F` includes columns A–E (your data) plus column F (empty is fine).
- If your tab is still named `Sheet1`, use `Sheet1!A:F` instead.
- To limit rows: `Weekly Report!A1:E10` (header + 9 data rows).

Other examples:

| Range | Reads |
|-------|--------|
| `Weekly Report!A:F` | Full tab, columns A–F (recommended for this sample) |
| `Weekly Report!A:E` | Columns A–E only (exactly the 5 sample columns) |
| `Weekly Report!A1:E4` | Header row + 3 employee rows only |
| `Sheet1!A:F` | Default tab name if you did not rename the tab |

Set in `.env`:

```env
HABITS_GOOGLE_SHEET_RANGE=Weekly Report!A:F
```

---

## 3. Google Cloud OAuth setup

### Enable the API

1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Create or select a project.
3. **APIs & Services → Library** → search **Google Sheets API** → **Enable**.

### OAuth consent screen

1. **APIs & Services → OAuth consent screen** → configure the app (External audience).
2. Under **Test users**, add the Google account that **owns the spreadsheet** and will authorize OAuth.

### Create OAuth credentials

1. **APIs & Services → Credentials** → **Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URI:**

   ```
   http://localhost:13000/oauth/bit-google-sheets/callback
   ```

4. Copy **Client ID** and **Client Secret** into `.env`:

   ```env
   HABITS_GOOGLE_SHEETS_CLIENT_ID=your-client-id
   HABITS_GOOGLE_SHEETS_CLIENT_SECRET=your-client-secret
   ```

### Authorize on first run

When you start the server, open the OAuth URL printed in the console, sign in with your test user, and grant Sheets access.

---

## 4. Run the showcase

From the project root:

```bash
pnpm habits dev showcase/weekly-report-email/stack.yaml
```

- Open **http://localhost:13000/** for the status UI.
- Watch the terminal on Monday 09:00 UTC — the workflow reads the sheet and sends an email.
- **Manual trigger (optional):**

  ```
  GET http://localhost:13000/misc/workflows/weekly-report-email/test
  ```

---

## 5. Change the schedule (optional)

Default: **every Monday at 09:00 UTC** (`0 9 * * 1`).

| Schedule | Cron |
|----------|------|
| Every Monday 9:00 UTC | `0 9 * * 1` |
| Every Friday 17:00 UTC | `0 17 * * 5` |
| Every day 8:00 UTC | `0 8 * * *` |

For quick testing, temporarily use `*/1 * * * *` (every minute) — remember to switch back.

---

## Workflow overview

```
schedule (cron)
  → read-sheet (Google Sheets readRange)
  → format-sheet-data (script: 2D array → markdown table)
  → generate-email (OpenAI)
  → send-email (SMTP)
```
