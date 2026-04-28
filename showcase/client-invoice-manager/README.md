# Client Invoice Manager

A Habits workflow that saves client data with AI extraction, generates PDF invoices, and uploads them automatically to Google Drive.

## Step 1 — Create a Google Cloud Project & OAuth Credentials

### 1.1 Create a new project

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown at the top → **New Project**
3. Give it a name (e.g. `Invoice Manager`) and click **Create**
4. Make sure the new project is selected in the dropdown

### 1.2 Enable the Google Drive API

1. In the left sidebar go to **APIs & Services → Library**
2. Search for **Google Drive API**
3. Click it → click **Enable**

### 1.3 Create OAuth 2.0 credentials

1. Go to **APIs & Services → OAuth consent screen**
2. Click **Get Started**
3. Fill in the required fields:
   - **App name** — e.g. `Invoice Manager`
   - **User support email** — your email
   - **Developer contact information** — your email
4. Click **Save and Continue** / **Create**
5. You will land on the OAuth configuration page for your app — click **Configure OAuth**
6. Set **Application type** to **Web application** and give it a name (e.g. `Invoice Manager Web`)
7. Under **Authorized redirect URIs** click **Add URI** and add both:
   ```
   http://localhost:13000/oauth/callback
   http://localhost:13000/oauth/bit-google-drive/callback
   ```
8. Click **Create** — a dialog will show the created client, open it and copy the **Client ID** and **Client Secret** into your `.env` file:
   ```
   HABITS_GOOGLE_DRIVE_CLIENT_ID=<your client id>
   HABITS_GOOGLE_DRIVE_CLIENT_SECRET=<your client secret>
   ```
   > **If the Client Secret is not visible in the dialog**, click **OK** to close it, then find your client in the **Clients** list on the same page, click on its name to open it, and copy the **Client Secret** from the bottom-right of the client details page.
9. Since the app is in **Testing** mode, only explicitly added users can authorize it. Go to **Audience** in the left sidebar, scroll to **Test users**, click **+ Add Users**, and add the Google account email you will use when authorizing — this must be the same account that owns the Google Drive folder where invoices will be uploaded

> **Note:** While the app is in *Testing* mode, only the test users you added can authorize it. You can publish the app later if needed.

---

## Step 2 — Get Your Google Drive Folder ID

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