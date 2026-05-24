# RSS Digest Summarizer

Polls any RSS or Atom feed, summarizes new articles with GPT-4o-mini, and posts a curated digest to a Slack channel automatically every 3 minutes.

---

## Setup

### 1. Create a Slack Workspace

If you don't already have a workspace:

1. Go to [https://slack.com/get-started](https://slack.com/get-started)
2. Click **Create a new workspace** and follow the prompts.

---

### 2. Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → choose **From scratch**.
3. Give it a name (e.g. `RSS Digest Bot`) and select your workspace.
4. Click **Create App**.

---

### 3. Enable OAuth Scopes

1. In your app's settings, go to **OAuth & Permissions** in the left sidebar.
2. Scroll down to **Bot Token Scopes** and add the following scopes:

   | Scope | Purpose |
   |---|---|
   | `chat:write` | Post messages to channels |
   | `channels:read` | List public channels (to find channel IDs) |

3. Click **Save Changes**.

---

### 4. Install the App & Get the Bot Token

1. Still on the **OAuth & Permissions** page, scroll up and click **Install to Workspace**.
2. Authorize the app.
3. After installation, copy the **Bot User OAuth Token** — it starts with `xoxb-`.
4. Paste it into your `.env` file:

```env
HABITS_SLACK_BOT_TOKEN=xoxb-your-token-here
```

---

### 5. Invite the Bot to a Channel & Get the Channel ID

1. In Slack, open (or create) the channel where you want the digest posted.
2. Type `/invite @RSS Digest Bot` and send it to add the bot.
3. To get the **Channel ID**:
   - Right-click the channel name in the sidebar → **View channel details**.
   - Scroll to the bottom — the Channel ID is shown there (e.g. `C08XXXXXXXX`).

4. Paste it into your `.env` file:

```env
HABITS_SLACK_DIGEST_CHANNEL=C08XXXXXXXX
```

---

### 6. Complete the `.env` File

Copy `.env.example` to `.env` and fill in all values:

```env
# OpenAI API Key — https://platform.openai.com/api-keys
HABITS_OPENAI_API_KEY=sk-...

# Slack
HABITS_SLACK_BOT_TOKEN=xoxb-...
HABITS_SLACK_DIGEST_CHANNEL=C08XXXXXXXX

# RSS/Atom feed to monitor
HABITS_RSS_FEED_URL=https://feeds.example.com/rss
```

Some example feed URLs to try:
- TechCrunch: `https://techcrunch.com/feed/`

---
