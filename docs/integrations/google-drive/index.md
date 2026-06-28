---
title: "Google Drive"
description: "Upload files to Google Drive with OAuth 2.0 credentials"
---

# Google Drive

Use `@ha-bits/bit-google-drive` to upload files (such as generated PDF invoices) to a Google Drive folder.

**Related bit:** [`@ha-bits/bit-google-drive`](/bits/bit-google-drive)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HABITS_GOOGLE_DRIVE_CLIENT_ID` | OAuth 2.0 Client ID |
| `HABITS_GOOGLE_DRIVE_CLIENT_SECRET` | OAuth 2.0 Client Secret |
| `HABITS_GOOGLE_DRIVE_FOLDER_ID` | Target folder ID from the Drive URL |

## Step 1: Create a Google Cloud Project and Enable the API

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com).
2. Click the project dropdown → **New Project** → name it (e.g. `Invoice Manager`) → **Create**.
3. Go to **APIs & Services → Library**.
4. Search for **Google Drive API** → click **Enable**.

## Step 2: Configure the OAuth Consent Screen

1. Navigate to **APIs & Services → OAuth consent screen**.
2. Click **Get started**.
3. Fill in required fields:
   - **App name**: e.g. `Invoice Manager`
   - **User support email** and **Developer contact email**: your Google account
   - **Audience**: External
4. Click **Create**.
5. On the **Audience** tab, under **Test users**, click **Add users** and add the Google account that:
   - owns the Drive folder, **and**
   - you will sign in with during OAuth
6. Click **Save and Continue**.

> While the app is in **Testing** mode, only explicitly added test users can authorize it.

## Step 3: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services → Credentials**.
2. Click **+ Create Credentials → OAuth client ID**.
3. Set **Application type** to **Web application**.
4. Under **Authorized redirect URIs**, add:

   ```
   http://localhost:13000/oauth/bit-google-drive/callback
   ```

5. Click **Create** and copy the **Client ID** and **Client Secret**.
6. Add them to `.env`:

```env
HABITS_GOOGLE_DRIVE_CLIENT_ID=your-client-id
HABITS_GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret
```

## Step 4: Authorize on First Run

When you start the Cortex server, it prints an authorization URL. Open it in your browser, sign in with a test user account, and grant access.

## Get Your Google Drive Folder ID

1. Open [Google Drive](https://drive.google.com).
2. Navigate to (or create) the target folder.
3. The URL looks like:

   ```
   https://drive.google.com/drive/folders/<FOLDER_ID>
   ```

4. Copy the folder ID and add it to `.env`:

```env
HABITS_GOOGLE_DRIVE_FOLDER_ID=your-folder-id
```

<IntegrationShowcases integration="google-drive" />
