---
title: "Google Sheets"
description: "Read and write spreadsheet data with OAuth 2.0"
---

# Google Sheets

Use `@ha-bits/bit-google-sheets` to append structured data (such as extracted invoice rows) to a spreadsheet.

**Related bit:** [`@ha-bits/bit-google-sheets`](/bits/bit-google-sheets)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HABITS_GOOGLE_SHEETS_CLIENT_ID` | OAuth 2.0 Client ID |
| `HABITS_GOOGLE_SHEETS_CLIENT_SECRET` | OAuth 2.0 Client Secret |
| `HABITS_GOOGLE_SPREADSHEET_ID` | Spreadsheet ID from the Sheets URL |

## Get the Spreadsheet ID

1. Open [Google Sheets](https://sheets.google.com) and open (or create) your spreadsheet.
2. The URL looks like:

   ```
   https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit
   ```

3. Copy the ID between `/d/` and `/edit`.
4. Add it to `.env`:

```env
HABITS_GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
```

> **Sheet tab name:** Ensure the target tab is named correctly (e.g. `Invoices` for the invoices-processing showcase).

## Step 1: Create a Google Cloud Project and Enable the API

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com).
2. Create a new project (e.g. `Invoices Processing`).
3. Go to **APIs & Services → Library**.
4. Search for **Google Sheets API** → click **Enable**.

## Step 2: Configure the OAuth Consent Screen

1. Navigate to **APIs & Services → OAuth consent screen**.
2. Click **Get started** and fill in app name, support email, and developer contact.
3. Choose **External** audience and click **Create**.
4. On the **Audience** tab, add test users — the Google account that owns the spreadsheet and will authorize OAuth.
5. Click **Save and Continue**.

## Step 3: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services → Credentials**.
2. Click **+ Create Credentials → OAuth client ID**.
3. Set **Application type** to **Web application**.
4. Under **Authorized redirect URIs**, add:

   ```
   http://localhost:13000/oauth/bit-google-sheets/callback
   ```

5. Copy the **Client ID** and **Client Secret** into `.env`:

```env
HABITS_GOOGLE_SHEETS_CLIENT_ID=your-client-id
HABITS_GOOGLE_SHEETS_CLIENT_SECRET=your-client-secret
```

## Step 4: Authorize on First Run

Start the Cortex server. It prints an authorization URL — open it, sign in with a test user, and grant access.

## Recommended Sheet Headers

For [Invoices Processing](/showcase/invoices-processing), add these headers to row 1 of the `Invoices` tab:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Invoice Number | Invoice Date | Vendor Name | Vendor Email | Customer Name | Total Amount | Currency | Due Date | Notes |

<IntegrationShowcases integration="google-sheets" />
