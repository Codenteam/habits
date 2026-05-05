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
7. A dialog will show your **Client ID** and **Client Secret** — save these values and close the dialog.

### 5. Add Credentials to `.env`

Add the following variables to your `.env` file:

```dotenv
HABITS_TWITTER_CLIENT_ID=<YOUR_TWITTER_CLIENT_ID>
HABITS_TWITTER_CLIENT_SECRET=<YOUR_TWITTER_CLIENT_SECRET>
```
