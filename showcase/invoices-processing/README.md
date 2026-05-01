# Invoices Processing — Setup Guide

This workflow fetches emails, extracts invoice data via OpenAI, and saves results to a Google Sheet.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

```env
HABITS_GOOGLE_SHEETS_CLIENT_ID=...
HABITS_GOOGLE_SHEETS_CLIENT_SECRET=...
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

## Getting `HABITS_GOOGLE_SHEETS_CLIENT_ID` and `HABITS_GOOGLE_SHEETS_CLIENT_SECRET`

## Step 1 — Create a Google Cloud Project & Enable the API

### 1.1 Create a new project ( If first time)

- If it's your first time opening Google Cloud Console, Google may require you to enable two-step verification, so make sure to enable it.

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown at the top → **New Project**
3. Give it a name (e.g. `Invoices Processing`) and click **Create**
4. Make sure the new project is selected in the dropdown

### Step 1.2 — Enable the Google Sheets API

1. In the left sidebar go to **APIs & Services → Library**
2. Search for **Google Sheets API** and click **Enable**.

### Step 2 — Configure the OAuth Consent Screen

Before creating credentials, Google requires an app to be configured (Skip from 1 to 4 if already app created before):

- You can check if app created or not from the **Branding** tab

1. Navigate to **APIs & Services → OAuth consent screen**.
2. Click **Get start**
3. Fill in the required fields:
   - **App name**: any name (e.g. `Invoices Processing`)
   - **User support email**: your Google account email
   - **Developer contact email**: your Google account email
   - For audience choose **external**
   - Fill contact info email
4. Click **Create** .
5. Then click on Audience tab and on **Test users** part, click **Add users** and add the Google account email that:
   - owns the spreadsheet, **and**
   - you will log in with during the OAuth redirect
6. Click **Save and Continue**, then **Back to Dashboard**.

> **Why test users?** While the app is in "Testing" mode (not published), only explicitly added test users can authorize it.

### Step 3 — Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services → Credentials**.
2. Click **+ Create Credentials → OAuth client ID**.
3. Set **Application type** to **Web application**.
4. Give it a name (e.g. `Invoices Processing Web Client`).
5. Under **Authorized redirect URIs**, click **Add URI** and enter:
   ```
   http://localhost:13000/oauth/bit-google-sheets/callback
   ```
6. Click **Create** — a dialog will show the created client, open it and copy the **Client ID** and **Client Secret** into your `.env` file.
   > **If the Client Secret is not visible in the dialog**, click **OK** to close it, then find your client in the **Clients** list on the same page, click on its name to open it, and copy the **Client Secret** from the bottom-right of the client details page.
7. Paste them into `.env`:
   ```env
   HABITS_GOOGLE_SHEETS_CLIENT_ID=your-client-id
   HABITS_GOOGLE_SHEETS_CLIENT_SECRET=your-client-secret
   ```

### Step 4 — Authorize via OAuth on First Run

When you start the server , it will print a URL to the console:

```
Visit to authorize
```

Open that URL in your browser, sign in with the Google account you added as a test user, and grant access.

## Sheet Headers (Recommended)

Add these headers to **Row 1** of the `Invoices` tab manually:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Invoice Number | Invoice Date | Vendor Name | Vendor Email | Customer Name | Total Amount | Currency | Due Date | Notes |

