# Test Google Sheets Polling

Test `@ha-bits/bit-google-sheets` **newRows** polling trigger — reads a sheet range every minute, deduplicates rows via `pollingStore`, and logs new rows.

## How it works

1. **read-range** — manual workflow to verify OAuth and `readRange` against your sheet.
2. **poll-new-rows** — cron trigger every 1 min; logs each new row:

```
[Google Sheets New Row] {
  "spreadsheetId": "...",
  "range": "Sheet1!A1:Z100",
  "rowIndex": 3,
  "values": ["ID-002", "Bob", "bob@example.com"]
}
```

## Sheet setup

Use a header row in row 1 (default `hasHeaderRow: true`). New rows are deduplicated by **spreadsheet ID + full row content** (not row index), so inserting rows above existing data does not re-trigger old rows.

Example:

| Name | Email |
|------|-------|
| Alice | alice@example.com |

Append new rows below — the poll detects rows with new cell values.

## Environment

Copy `.env.example` to `.env` and fill in OAuth credentials and spreadsheet details. See [Google Sheets integration docs](/integrations/google-sheets/) for OAuth setup.

## Run

```bash
cd nodes/bits/@ha-bits/bit-google-sheets && npx tsc
pnpm habits dev showcase/test-google-sheets-poll/stack.yaml
```

On first start, complete the Google OAuth flow when prompted (or visit `http://localhost:13000/oauth/bit-google-sheets/init`). Then watch the **server terminal** for new row logs after you append rows in the sheet.

> **Note:** Polling triggers use the same OAuth token store as `read-range`. After restarting the server, authorize once if needed. On the **first successful poll**, existing data rows are logged once each (header row is skipped). Later polls only log rows with new content. To re-test from scratch, delete `.habits/habits-polling.db` and restart.
