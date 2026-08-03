---
title: "Slack"
description: "Post messages, use Incoming Webhooks, and receive channel events with @ha-bits/bit-slack"
---

# Slack

Use `@ha-bits/bit-slack` to post curated digests and notifications to Slack channels.

**Related bit:** [`@ha-bits/bit-slack`](/bits/bit-slack)

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `HABITS_SLACK_BOT_TOKEN` | Bot User OAuth Token | `xoxb-...` |
| `HABITS_SLACK_DIGEST_CHANNEL` | Channel ID for digest posts | `C08XXXXXXXX` |
| `SLACK_BOT_TOKEN` | Alternate naming (MCP demo) | `xoxb-...` |

## Setup

### 1. Create a Slack Workspace

If you don't already have a workspace:

1. Go to [https://slack.com/get-started](https://slack.com/get-started).
2. Click **Create a new workspace** and follow the prompts.

### 2. Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps).
2. Click **Create New App** → **From scratch**.
3. Give it a name (e.g. `Digest Bot`) and select your workspace.
4. Click **Create App**.

### 3. Enable OAuth Scopes

1. In your app settings, go to **OAuth & Permissions**.
2. Under **Bot Token Scopes**, add:

   | Scope | Purpose |
   |-------|---------|
   | `chat:write` | Post messages to channels |
   | `channels:read` | List public channels (to find channel IDs) |
   | `reactions:write` | Add reaction on msg |
   | `reactions:read` | Read msg reaction |
   | `channels:history` | View msgs sent to the channels |

3. Click **Save Changes**.

### 4. Install the App and Get the Bot Token

1. On the **OAuth & Permissions** page, click **Install to Workspace**.
2. Authorize the app.
3. Copy the **Bot User OAuth Token** (starts with `xoxb-`).
4. Add it to `.env`:

```env
HABITS_SLACK_BOT_TOKEN=xoxb-your-token-here
```

### 5. Invite the Bot and Get the Channel ID

1. In Slack, open (or create) the target channel.
2. Type `/invite @Your Bot Name` to add the bot.
3. Right-click the channel name → **View channel details**.
4. Scroll to the bottom — the **Channel ID** is shown (e.g. `C08XXXXXXXX`).
5. Add it to `.env`:

```env
HABITS_SLACK_DIGEST_CHANNEL=C08XXXXXXXX
```

## Example `.env`

```env
HABITS_SLACK_BOT_TOKEN=xoxb-...
HABITS_SLACK_DIGEST_CHANNEL=C08XXXXXXXX
```

> **Note:** After adding or changing scopes (**OAuth & Permissions** → **Bot Token Scopes**), click **Reinstall to Workspace** and copy the new **Bot User OAuth Token** into `.env`. Tokens issued before reinstall do not include newly added scopes.

## Incoming Webhook (no bot token)

Use the `sendWebhook` action to post a message with only a **webhook URL** and **text** — no `HABITS_SLACK_BOT_TOKEN` or channel ID in `.env`. Messages go to the channel you pick when creating the webhook.

1. Open [api.slack.com/apps](https://api.slack.com/apps) and select your app.
2. Go to **Incoming Webhooks** → turn **Activate Incoming Webhooks** on.
3. Click **Add New Webhook to Workspace**, choose the target channel, and authorize.
4. Copy the webhook URL (`https://hooks.slack.com/services/...`) into your workflow or UI showcase **Webhook URL** field.

Pass `webhookUrl` and `text` to `sendWebhook` in a habit workflow, or try it in the slack-test UI.

## Event Subscriptions (inbound message trigger)

The `inboundMessage` trigger receives user messages from channels your app is subscribed to. Habits Cortex exposes it at:

```
/webhook/v/slack
```

### On your system

**Before** pasting the Request URL in Slack, start your habit server and expose it (local dev needs a public URL):

```bash
pnpm habits dev showcase/slack-test/stack.yaml
ngrok http 13000
```

Use the ngrok HTTPS URL:

```
https://<your-ngrok-host>/webhook/v/slack
```

Register a workflow with an `inboundMessage` trigger node (`module: "@ha-bits/bit-slack"`, `operation: inboundMessage`).

### In the Slack app

1. Go to **Event Subscriptions** → turn it **On**.
2. Paste the endpoint above as **Request URL**. Slack sends a verification request — status should show **Verified** when the server is running and the trigger is registered.
3. Under **Subscribe to bot events**, add `message.channels` (public channels) and/or `message.groups` (private channels).
4. Ensure scopes include `channels:history` (and related scopes from the table above), **Save**, then **Reinstall to Workspace**. Update `HABITS_SLACK_BOT_TOKEN` in `.env` if the token changed.
5. Invite the bot to the channel you will test (`/invite @YourBot`).
6. Post a message in that channel — the server terminal logs the inbound payload from the trigger workflow.

<IntegrationShowcases integration="slack" />
