---
title: "Twitter / X"
description: "Post tweets via the Twitter/X API with developer credentials"
---

# Twitter / X

Use `@ha-bits/bit-twitter` to publish tweets from Habits workflows.

**Related bit:** [`@ha-bits/bit-twitter`](/bits/bit-twitter)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HABITS_TWITTER_CLIENT_ID` | Twitter app Client ID |

## Step 1: Create a Developer Account

1. Go to [https://developer.twitter.com/](https://developer.twitter.com/) and sign in.
2. Enter your account name, accept checkboxes, and describe how you plan to use the API.
3. Click **Create** to access the developer dashboard.

## Step 2: Purchase Credits

1. In the left sidebar, go to **Credits**.
2. Under **Remaining balance**, click **Purchase credit**.
3. Add credits — required to post tweets via the API.

## Step 3: Create an App

1. Go to the **Apps** tab.
2. Click **Create App**.
3. Enter an **Application name** and set **Environment** to **Production**.
4. Click **Create** and refresh if the app does not appear immediately.

## Step 4: Configure App Settings

1. Open your app → click **Settings**.
2. Under **App permissions**, select **Read and Write**.
3. Under **Type of App**, select **Native App Public Client**.
4. Under **App info**, add the **Callback URL**:

   ```
   http://localhost:13000/oauth/bit-twitter/callback
   ```

5. Add a **Website URL** you own.
6. Click **Save Changes**.
7. Copy the **Client ID** from the confirmation dialog.

## Example `.env`

```env
HABITS_TWITTER_CLIENT_ID=your-twitter-client-id
```

<IntegrationShowcases integration="twitter" />
