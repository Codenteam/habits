---
title: "Slack"
description: "Post messages and digests to Slack channels with a bot token"
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

<IntegrationShowcases integration="slack" />
