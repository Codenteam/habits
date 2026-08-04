# AI Reply and Routing Assistant

Listens for inbound Slack messages, classifies them with OpenAI, sends an automatic acknowledgement in the same channel, optionally auto-replies for low-risk questions, and forwards a summary to the correct team channel (with the auto-reply included for low-risk cases).

## Workflows

| Workflow | Role |
|----------|------|
| `slack-routing` | Main pipeline: Slack trigger → parse → analyze → process |
| `analyze-message` | AI classification, risk assessment, summary, ack and final reply |
| `route-category` | `bit-if` branch → team channel ID from `.env` |
| `send-acknowledgement` | Receipt acknowledgement in the source channel |
| `send-auto-reply` | Full AI answer in the source channel (low-risk only) |
| `forward-to-channel` | Summary to team channel (high-risk, human review) |
| `forward-with-auto-reply` | Summary + auto-reply to team channel (low-risk) |
| `process-message` | Orchestrates route → ack → risk branch → auto-reply/forward |

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `HABITS_OPENAI_API_KEY` | OpenAI API key for message analysis |
| `HABITS_SLACK_BOT_TOKEN` | Bot token for posting replies and forwards |
| `HABITS_SLACK_CHANNEL_SALES` | Sales team channel ID |
| `HABITS_SLACK_CHANNEL_SUPPORT` | Support team channel ID |
| `HABITS_SLACK_CHANNEL_BILLING` | Billing team channel ID |
| `HABITS_SLACK_CHANNEL_TECHNICAL` | Technical team channel ID |
| `HABITS_SLACK_CHANNEL_HR` | HR team channel ID |
| `HABITS_SLACK_CHANNEL_GENERAL` | General inquiry channel ID |

### Slack app scopes

| Scope | Purpose |
|-------|---------|
| `chat:write` | Post acknowledgement and forwarded summaries |
| `channels:read` | Resolve channel IDs |
| `channels:history` | Receive inbound messages (Events API) |

After changing scopes, **Reinstall to Workspace** and update `HABITS_SLACK_BOT_TOKEN` in `.env`.

## Run

```bash
pnpm habits dev showcase/ai-reply-routing-assistant/stack.yaml
```

## Event Subscriptions

The `slack-routing` workflow listens at `/webhook/v/slack`.

**Before** adding the Request URL in Slack, start the server and ngrok:

```bash
pnpm habits dev showcase/ai-reply-routing-assistant/stack.yaml
ngrok http 13000
```

Request URL:

```
https://<your-ngrok-host>/webhook/v/slack
```

In [api.slack.com/apps](https://api.slack.com/apps):

1. **Event Subscriptions** → On → paste the ngrok URL (wait for **Verified**).
2. Subscribe to bot event `message.channels`.
3. Save, reinstall the app, invite the bot to your intake channel and each team channel.
4. Post a message in the intake channel — the bot replies there and forwards to the matching team channel.

## Flow

```
Slack message
  → slack-routing (trigger)
  → analyze-message (AI: category, risk, summary, replies)
  → process-message
      → route-category (pick channel from .env)
      → route-by-risk (bit-if: low vs high)
      → send-auto-reply + forward-with-auto-reply (low-risk branch)
      → forward-to-channel (high-risk / else branch)
```

### Risk handling

| Risk | User channel | Team channel |
|------|--------------|--------------|
| **Low** | Ack + AI auto-reply | Forward with auto-reply text included |
| **High** | Ack only | Forward for human review (no auto-reply) |
