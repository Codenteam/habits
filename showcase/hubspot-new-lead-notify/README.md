# HubSpot New Lead Slack Notify

When someone is added as a contact in HubSpot, this showcase sends an AI-written notification to your Slack channel.

## 1. Set up your `.env` file

In this folder, copy the example file and fill in your keys:

```bash
cp .env.example .env
```

You need these five values:

| Variable | Where to get it |
|----------|-----------------|
| `HABITS_OPENAI_API_KEY` | [OpenAI API keys](https://platform.openai.com/api-keys) |
| `HABITS_HUBSPOT_ACCESS_TOKEN` | HubSpot Private App → **Access token** (starts with `pat-`) |
| `HABITS_HUBSPOT_CLIENT_SECRET` | Same HubSpot Private App → **Client secret** |
| `HABITS_SLACK_BOT_TOKEN` | [Slack API](https://api.slack.com/apps) → your app → **OAuth & Permissions** → **Bot User OAuth Token** (`xoxb-...`) |
| `HABITS_SLACK_CHANNEL_ID` | Slack channel ID (right-click channel → **View channel details** → copy ID at the bottom, e.g. `C08XXXXXXXX`) |

### HubSpot Private App (token + client secret)

1. HubSpot → **Settings** → **Integrations** → **Private Apps**
2. Click **Create a private app** (or **Go to legacy app** if prompted)
3. Name it (e.g. `Lead Notify`)
4. **Scopes** tab → enable **Read** for **CRM → Contacts** (`crm.objects.contacts.read`)
5. Click **Create app**
6. Copy **Access token** → `HABITS_HUBSPOT_ACCESS_TOKEN`
7. Copy **Client secret** → `HABITS_HUBSPOT_CLIENT_SECRET`

The access token and client secret are two different values from the same app.

### Slack

1. Create an app at [api.slack.com/apps](https://api.slack.com/apps)
2. Under **OAuth & Permissions**, add scope **`chat:write`**
3. **Install to Workspace**, then copy the **Bot User OAuth Token**
4. Invite the bot to your alert channel: `/invite @YourBot`

---

## 2. Run the showcase

From the project root:

```bash
pnpm habits dev showcase/hubspot-new-lead-notify/stack.yaml
```

Leave this terminal running.

---

## 3. Expose your endpoint with ngrok

Open a **second** terminal:

```bash
ngrok http 13000
```

Copy the **HTTPS** URL ngrok shows (e.g. `https://abc123.ngrok-free.app`).

Your webhook URL for HubSpot is:

```
https://<your-ngrok-host>/webhook/v/hubspot
```

Example:

```
https://abc123.ngrok-free.app/webhook/v/hubspot
```

> If you restart ngrok, the URL changes — update it in HubSpot (step 4).

---

## 4. Create the webhook in HubSpot

Use the **same Private App** from step 1.

### Set the Target URL

1. HubSpot → **Settings** → **Integrations** → **Private Apps** → open your app
2. Open the **Webhooks** tab
3. Click **Edit webhooks**
4. **Target URL:** paste your full ngrok URL including `/webhook/v/hubspot`
5. Save

### Add the subscription

1. On the **Webhooks** tab, click **Create subscription**
2. **Object:** Contact
3. **Event:** Created
4. Click **Subscribe**
5. Make sure the subscription is **active**

### Test (optional)

1. On **Webhooks**, expand **Contact** → **Created**
2. Click **Test** — ngrok should show a successful request

---

## 5. Try it

1. Make sure the showcase and ngrok are both running
2. In HubSpot, go to **CRM → Contacts** and create a new contact (name, email, phone)
3. Check your Slack channel — you should get a notification about the new lead

---

## Quick tips

- **No Slack message?** Check that the bot is in the channel and `HABITS_SLACK_CHANNEL_ID` is correct
- **Webhook not working?** Confirm ngrok is running and the Target URL in HubSpot matches exactly (including `/webhook/v/hubspot`)
- **401 error in ngrok?** Double-check `HABITS_HUBSPOT_CLIENT_SECRET` is the **client secret**, not the access token
