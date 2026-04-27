# Invoices Processing — Setup Guide

This workflow fetches emails, extracts invoice data via OpenAI, and saves results to a Google Sheet.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

```env
HABITS_GOOGLE_ACCESS_TOKEN=...
HABITS_GOOGLE_SPREADSHEET_ID=...
```

---

## Getting `HABITS_GOOGLE_SPREADSHEET_ID`

1. Open [Google Sheets](https://sheets.google.com) and open (or create) your spreadsheet.
2. Look at the URL — it looks like:
   ```
   https://docs.google.com/spreadsheets/d/<ID>/edit
   ```
3. The long string between `/d/` and `/edit` is your **Spreadsheet ID**.
4. Copy it and set it as `HABITS_GOOGLE_SPREADSHEET_ID` in `.env`.

> **Sheet tab name:** Make sure the tab you want to write to is named `Invoices` (check the bottom tab strip).

---

## Getting `HABITS_GOOGLE_ACCESS_TOKEN`

The access token is a short-lived OAuth2 token that authorizes the workflow to write to your Google Sheet.

### Step 1 — Enable the Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Select or create a project.
3. Navigate to **APIs & Services → Library**.
4. Search for **Google Sheets API** and click **Enable**.

### Step 2 — Generate an Access Token via OAuth Playground

The easiest way to get a token without setting up a full OAuth app:

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. In the left panel under **Step 1 — Select & authorize APIs**, find and expand:
   ```
   Google Sheets API v4
   ```
   Select the scope:
   ```
   https://www.googleapis.com/auth/spreadsheets
   ```
3. Click **Authorize APIs** and sign in with the Google account that owns the spreadsheet.
4. In **Step 2 — Exchange authorization code for tokens**, click **Exchange authorization code for tokens**.
5. Copy the **Access token** value.
6. Set it as `HABITS_GOOGLE_ACCESS_TOKEN` in `.env`.

> **Note:** Access tokens expire after **1 hour**. When the workflow returns a `401` error, repeat Step 2 to get a fresh token.

## Sheet Headers (Recommended)

Add these headers to **Row 1** of the `Invoices` tab manually:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Invoice Number | Invoice Date | Vendor Name | Vendor Email | Customer Name | Total Amount | Currency | Due Date | Notes |

