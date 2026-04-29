# Client Invoice Manager

A Habits workflow that saves client data with AI extraction, generates PDF invoices, and uploads them automatically to Google Drive.

## Step 1 — Create a Google Cloud Project & Enable the API

### 1.1 Create a new project ( If first time)

- If it's your first time opening Google Cloud Console, Google may require you to enable two-step verification, so make sure to enable it.

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown at the top → **New Project**
3. Give it a name (e.g. `Invoice Manager`) and click **Create**
4. Make sure the new project is selected in the dropdown

### 1.2 Enable the Google Drive API

1. In the left sidebar go to **APIs & Services → Library**
2. Search for **Google Drive API**
3. Click it → click **Enable**


### Step 2 — Configure the OAuth Consent Screen

Before creating credentials, Google requires an app to be configured (Skip from 1 to 4 if already app created before):

- You can check if app created or not from the **Branding** tab

1. Navigate to **APIs & Services → OAuth consent screen**.
2. Click **Get start**
3. Fill in the required fields:
   - **App name**: any name (e.g. `Invoice Manager`)
   - **User support email**: your Google account email
   - **Developer contact email**: your Google account email
   - For audience choose **external**
   - Fill contact info email
4. Click **Create** .
5. Then click on **Audience** tab and on **Test users** part, click **Add users** and add the Google account email that:
   - owns the Drive folder, **and**
   - you will log in with during the OAuth redirect
6. Click **Save and Continue**, then **Back to Dashboard**.

> **Why test users?** While the app is in "Testing" mode (not published), only explicitly added test users can authorize it.


### Step 3 — Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services → Credentials**.
2. Click **+ Create Credentials → OAuth client ID**.
3. Set **Application type** to **Web application**.
4. Give it a name (e.g. `Invoice Manager Web Client`).
5. Under **Authorized redirect URIs**, click **Add URI** and enter:
   ```
   http://localhost:13000/oauth/bit-google-drive/callback
   ```
6. Click **Create** — a dialog will show the created client, open it and copy the **Client ID** and **Client Secret** into your `.env` file.
   > **If the Client Secret is not visible in the dialog**, click **OK** to close it, then find your client in the **Clients** list on the same page, click on its name to open it, and copy the **Client Secret** from the bottom-right of the client details page.
7. Paste them into `.env`:
   ```env
   HABITS_GOOGLE_DRIVE_CLIENT_ID=your-client-id
   HABITS_GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret


### Step 4 — Authorize via OAuth on First Run

When you start the server , it will print a URL to the console:

```
Visit to authorize
```

Open that URL in your browser, sign in with the Google account you added as a test user, and grant access.

---

## Get Your Google Drive Folder ID

1. Open [Google Drive](https://drive.google.com)
2. Navigate to (or create) the folder where invoices will be uploaded
3. Open the folder — look at the URL in your browser:
   ```
   https://drive.google.com/drive/folders/<ID>
                                          ^^^^
                                          This is your Folder ID
   ```
4. Copy the folder ID from the URL
5. Fill .env with clientId and clientsecret and googledrive folder id like in .env.example 