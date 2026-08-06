# Slack Test

Minimal showcase to verify `@ha-bits/bit-slack` messaging and reactions.

## Environment Variables

Create a `.env` file in this directory:

| Variable | Description |
|----------|-------------|
| `HABITS_SLACK_BOT_TOKEN` | Slack Bot OAuth Token (`xoxb-...`) |
| `HABITS_SLACK_SIGNING_SECRET` | Slack app signing secret (verifies inbound Events API requests) |
| `HABITS_SLACK_DIGEST_CHANNEL` | Channel ID (e.g. `C08XXXXXXXX`) or `#channel-name` |

```bash
HABITS_SLACK_BOT_TOKEN=xoxb-your-token-here
HABITS_SLACK_SIGNING_SECRET=your-signing-secret-here
HABITS_SLACK_DIGEST_CHANNEL=C08XXXXXXXX
```

Get `HABITS_SLACK_SIGNING_SECRET` from [api.slack.com/apps](https://api.slack.com/apps) → your app → **Basic Information** → **App Credentials** → **Signing Secret** → **Show**.

### Slack app scopes

| Scope | Used by |
|-------|---------|
| `chat:write` | send message, send block message, update message |
| `channels:read` | resolve channel IDs / channel access |
| `reactions:read` | read reactions on messages |
| `reactions:write` | add reaction ([reactions.add](https://docs.slack.dev/reference/methods/reactions.add)) |
| `channels:history` | receive inbound messages (Events API) |

> **Note:** After adding or changing scopes in your Slack app (**OAuth & Permissions** → **Bot Token Scopes**), click **Reinstall to Workspace**, then copy the new **Bot User OAuth Token** into `.env`. Tokens issued before reinstall do not include newly added scopes.


Actions:

1. **Send message** / **Send block message** — post to the channel (bot token)
2. **Send webhook** — post via Incoming Webhook URL (no bot token required)
3. **Update message** — edit text using the message timestamp
4. **Add reaction** — add an emoji reaction using the timestamp and reaction `name` (e.g. `thumbsup`, without colons)
5. **Receive message** — inbound channel messages via Events API (`receive-message` workflow)

### Receive inbound messages (Events API)

The `receive-message` workflow listens at `/webhook/v/slack`. Cortex verifies each request with `HABITS_SLACK_SIGNING_SECRET`, then Slack's `url_verification` handshake is handled by `@ha-bits/bit-slack` (responds with the `challenge`).

**Before adding the Request URL in Slack**, start the showcase and ngrok:

```bash
pnpm habits dev showcase/slack-test/stack.yaml
ngrok http 13000
```

Use the ngrok HTTPS URL as your endpoint:

```
https://<your-ngrok-host>/webhook/v/slack
```

Then in [api.slack.com/apps](https://api.slack.com/apps):

1. Go to **Event Subscriptions** → turn it **On**.
2. Paste the ngrok URL above as **Request URL**. Slack sends a verification request to your server — you should see **Verified** once the handshake succeeds.
3. Under **Subscribe to bot events**, add `message.channels` (and/or `message.groups` for private channels).
4. Add the scopes from the table above, **Save**, then **Reinstall to Workspace** and update `HABITS_SLACK_BOT_TOKEN` in `.env` if the token changed.
5. Invite the bot to the channel you will test in (`/invite @YourBot`).
6. Post a message in that channel — the terminal logs the full inbound payload object from the `receive-message` workflow.

### Message timestamp

After you send a message from this UI, the **Message timestamp** field auto-fills from the API response. To update or react to an existing Slack message instead, open that message in Slack → **More actions** → **Copy link** — the link ends with `p` followed by digits (e.g. `p1734567890123456`); insert a decimal point six digits from the end to get the `ts` value (e.g. `1734567890.123456`).

### Incoming Webhook URL

To use **Send webhook**, create an Incoming Webhook in your Slack app:

1. Open [https://api.slack.com/apps](https://api.slack.com/apps) and select your app.
2. In the left sidebar, go to **Incoming Webhooks**.
3. Turn **Activate Incoming Webhooks** on.
4. Click **Add New Webhook to Workspace**, pick the channel, and authorize.
5. Copy the webhook URL (starts with `https://hooks.slack.com/services/...`) and paste it into the **Webhook URL** field in the UI.

> **Note:** **Send webhook** only needs the webhook URL and message text — no bot token or channel ID in `.env`. Messages are posted to the channel you selected in step 4 when the webhook was created.

