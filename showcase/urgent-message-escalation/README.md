# Urgent Message Escalation

Detects urgent Slack messages with AI, posts structured escalations to an on-call channel, and re-escalates if nobody acknowledges within 15 minutes.

## Workflows

| Workflow | Role |
|----------|------|
| `slack-urgent-routing` | Main pipeline: Slack trigger → parse → analyze → process |
| `analyze-urgency` | AI urgency detection, summary, and suggested action |
| `process-urgent-message` | Urgent-only branch → post escalation → register DB record |
| `post-escalation` | Structured Slack post to the on-call channel |
| `register-pending-ack` | Save pending record with `escalateAt = now + 15 min` |
| `check-pending-acks` | Cron every 3 min → query overdue `pending_ack` records |
| `verify-and-escalate` | `conversations.replies` + `reactions.get` → OpenAI → ack or re-escalate |

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `HABITS_OPENAI_API_KEY` | OpenAI API key for urgency analysis and ack detection |
| `HABITS_SLACK_BOT_TOKEN` | Bot token for posting escalations and reading threads |
| `HABITS_SLACK_SIGNING_SECRET` | Slack app signing secret (verifies inbound Events API requests) |
| `HABITS_SLACK_CHANNEL_ESCALATION` | On-call / incident channel ID for escalations |

Get `HABITS_SLACK_SIGNING_SECRET` from [api.slack.com/apps](https://api.slack.com/apps) → your app → **Basic Information** → **App Credentials** → **Signing Secret** → **Show**.

### Slack app scopes

| Scope | Purpose |
|-------|---------|
| `chat:write` | Post escalation messages |
| `channels:history` | Receive inbound messages and read thread replies |
| `reactions:read` | Check acknowledgement reactions |
| `channels:read` | Resolve channel IDs |

After changing scopes, **Reinstall to Workspace** and update `HABITS_SLACK_BOT_TOKEN`, Only if scopes changes.

## Run

```bash
pnpm habits dev showcase/urgent-message-escalation/stack.yaml
```

## Event Subscriptions

The `slack-urgent-routing` workflow listens at `/webhook/v/slack`. Cortex verifies each inbound request with `HABITS_SLACK_SIGNING_SECRET` before dispatching to the trigger.

**Before** adding the Request URL in Slack, start the server and ngrok:

```bash
pnpm habits dev showcase/urgent-message-escalation/stack.yaml
ngrok http 13000
```

Request URL:

```
https://<your-ngrok-host>/webhook/v/slack
```

In [api.slack.com/apps](https://api.slack.com/apps):

> **Disable Socket Mode first.** Habits uses HTTP Event Subscriptions (a Request URL), not Socket Mode. If **Event Subscriptions** shows *"Socket Mode is enabled. You won't need to specify a Request URL"*, open **Socket Mode** in the left sidebar, turn **Enable Socket Mode** **off**, save, then return to **Event Subscriptions**.

1. **Event Subscriptions** → On → paste the ngrok URL (wait for **Verified**).
2. Subscribe to bot event `message.channels`.
3. Save, reinstall the app, invite the bot to your intake channel and the escalation channel.
4. Post an urgent message — the bot forwards a structured escalation to the on-call channel.

## Flow

```
Slack message
  → slack-urgent-routing (trigger)
  → analyze-urgency (AI: isUrgent, summary, suggested action)
  → process-urgent-message (urgent only)
      → post-escalation (structured Slack post)
      → register-pending-ack (DB: status=pending_ack, escalateAt=+15m)

Every 1 minutes:
  → check-pending-acks (cron)
      → verify-and-escalate (per overdue record)
          → conversations.replies + reactions.get
          → OpenAI decides acknowledged true/false
          → true:  mark DB acknowledged
          → false: re-post escalation in thread, bump escalateAt +15m
```

## Acknowledgement

Humans can acknowledge by:

- Replying in the escalation thread ("on it", "looking", etc.)
- Reacting with `:eyes:` or `:white_check_mark:`

OpenAI evaluates thread replies and reactions together on each cron check.
