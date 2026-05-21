# Social Media Multi-Posting

This showcase demonstrates posting to multiple social media platforms from a single workflow, including Twitter/X.

## Getting Twitter Credentials

### 1. Create a Developer Account

1. Go to [https://developer.twitter.com/](https://developer.twitter.com/) and sign in with your Twitter account.
2. Enter your account name, check all required checkboxes, and type a brief description of how you plan to use the API.
3. Click **Create** — your developer account will be created and you'll be navigated to the dashboard.

### 2. Purchase Credits

1. In the left sidebar, go to the **Credits** tab.
2. Under **Remaining balance**, click **Purchase credit**.
3. Add credits to your account — this is required to be able to post tweets via the API.

### 3. Create an App

1. In the left sidebar, go to the **Apps** tab.
2. Click the **Create App** button in the top-right corner.
3. Enter an **Application name** and set the **Environment** to **Production**, then click **Create**.
4. A confirmation dialog will appear — close it.
5. Your app should now appear in the Apps tab. If not, refresh the page.

### 4. Configure App Settings

1. Open your app and click **Settings** in the top-right corner.
2. Under **App permissions**, select **Read and Write**.
3. Under **Type of App**, select **Native App Public Client**.
4. Under **App info**, add the following **Callback URL**:
   ```
   http://localhost:13000/oauth/bit-twitter/callback
   ```
5. Add any website URL you own to the **Website URL** field.
6. Click **Save Changes**.
7. A dialog will show your **Client ID** and **Client Secret** — save the value of Client ID and close the dialog.

### 5. Add Credentials to `.env`

Add the following variables to your `.env` file:

```dotenv
HABITS_TWITTER_CLIENT_ID=<YOUR_TWITTER_CLIENT_ID>

```

---

## Getting LinkedIn Credentials

### 1. Create a LinkedIn Company Page

A LinkedIn Company Page (Organization) is required to post on behalf of an organization. If you already have one, skip to step 2.

1. Sign in to your LinkedIn account.
2. Go to [https://www.linkedin.com/company/setup/new/](https://www.linkedin.com/company/setup/new/).
3. Fill in the required fields:
   - **Name**: Enter your company or organization name.
   - **LinkedIn public URL**: Choose a unique URL slug for your page (e.g., `linkedin.com/company/my-company`).
   - **Industry**: Select the industry that best describes your organization.
   - **Company size**: Select the size range that matches your organization.
   - **Company type**: Select the appropriate type (e.g., Privately Held, Nonprofit, etc.).
4. Upload a **logo** for your page (optional but recommended).
5. Check the verification checkbox confirming you are authorized to create this page.
6. Click **Create page**.
7. You will be redirected to your new Company Page. You are automatically set as its admin.

### 2. Create a LinkedIn Developer App

1. Go to [https://www.linkedin.com/developers/](https://www.linkedin.com/developers/) and sign in with your LinkedIn account.
2. Click **Create App** in the top-right corner.
3. Fill in the required fields:
   - **App name**: Enter a name for your app.
   - **LinkedIn Page**: Select the Company Page you created in step 1.
   - **App logo**: Upload a logo image.
4. Check the legal agreement checkbox and click **Create App**.

### 3. Get Client ID and Client Secret

1. After the app is created, you'll be taken to the app dashboard.
2. Go to the **Auth** tab.
3. Your **Client ID** is displayed at the top of the page.
4. Click **Generate Client Secret** (or copy it if already generated) to get your **Client Secret**.
5. Save both values — you'll need them for your `.env` file.

### 4. Add Authorized Redirect URLs

1. Still on the **Auth** tab, scroll down to **OAuth 2.0 settings**.
2. Under **Authorized redirect URLs for your app**, click **Add redirect URL** and add:
   ```
   http://localhost:13000/oauth/bit-linkedin/callback
   ```
3. Click **Update**.

### 5. Enable Required OAuth Scopes

1. Go to the **Products** tab on your app dashboard.
2. Find and request access to **Share on LinkedIn** — this enables the `w_member_social` scope (required to post).
3. Find and request access to **Marketing Developer Platform** — this enables the `w_organization_social` and `r_organization_social` scopes required for posting on behalf of an organization page.
4. Some products are approved instantly; others may require review. Once approved, go to the **Auth** tab and confirm the following scopes appear under **OAuth 2.0 scopes**:
   - `w_member_social`
   - `w_organization_social`
   - `r_organization_social`

### 6. Get Your Organization ID

The Organization ID is the numeric ID of your LinkedIn Company Page.

1. Sign in to your LinkedIn account.
2. Click the **Me** icon at the top-right corner of the page.
3. Under the **Manage** section in the dropdown, select the company page you created.
4. LinkedIn will open your Company Page admin dashboard — the URL will look like this:
   ```
   https://www.linkedin.com/company/<ORGANIZATION_ID>/admin/dashboard/
   ```
5. Copy the numeric ID between `/company/` and `/admin/` — that is your `HABITS_LINKEDIN_ORGANIZATION_ID`.

### 7. Add Credentials to `.env`

Add the following variables to your `.env` file:

```dotenv
HABITS_LINKEDIN_CLIENT_ID=<YOUR_LINKEDIN_CLIENT_ID>
HABITS_LINKEDIN_CLIENT_SECRET=<YOUR_LINKEDIN_CLIENT_SECRET>
HABITS_LINKEDIN_ORGANIZATION_ID=<YOUR_LINKEDIN_ORGANIZATION_ID>
```
