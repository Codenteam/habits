# Urgent Message Escalation (WhatsApp)

Detects urgent WhatsApp messages with AI, posts structured escalations to an on-call number, tracks acknowledgements via reply or reaction, and re-escalates if nobody acknowledges within 15 minutes.

> You can also try sending a message from the Meta app under **Use cases → Customize → Basic setup → Try it out → Send a message from your test number** before testing this showcase locally.

## Workflows

| Workflow | Role |
|----------|------|
| `whatsapp-urgent-routing` | Main pipeline: WhatsApp trigger → parse → analyze → process |
| `handle-whatsapp-ack` | Ack handler: reply/reaction to escalation → OpenAI → mark acknowledged |
| `analyze-urgency` | AI urgency detection, summary, and suggested action |
| `process-urgent-message` | Urgent-only branch → post escalation → register DB record |
| `post-escalation` | Structured WhatsApp message to the on-call number |
| `register-pending-ack` | Save pending record with `escalateAt = message time + 15 min` |
| `check-pending-acks` | Cron every 1 min → query overdue unacknowledged records |
| `re-escalate-unacked` | Re-send reminder WhatsApp and bump `escalateAt` +15 min |

## Environment Variables

Create a `.env` file in this directory:

```bash
HABITS_OPENAI_API_KEY=your_openai_api_key
HABITS_WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
HABITS_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
HABITS_WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token
HABITS_WHATSAPP_ESCALATION_PHONE=+14155238886
```

| Variable | Description |
|----------|-------------|
| `HABITS_OPENAI_API_KEY` | OpenAI API key for urgency analysis and ack detection |
| `HABITS_WHATSAPP_ACCESS_TOKEN` | WhatsApp Cloud API permanent access token |
| `HABITS_WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business phone number ID |
| `HABITS_WHATSAPP_VERIFY_TOKEN` | Webhook verify token (same value in Meta App Dashboard) |
| `HABITS_WHATSAPP_ESCALATION_PHONE` | On-call phone number that receives escalation messages (E.164) |

## Run

```bash
pnpm habits dev showcase/urgent-message-escalation-whatsapp/stack.yaml
```

## Meta Webhook Setup

Both `whatsapp-urgent-routing` and `handle-whatsapp-ack` listen on `/webhook/v/whatsapp`.

1. Start the server and expose it (e.g. ngrok):

```bash
pnpm habits dev showcase/urgent-message-escalation-whatsapp/stack.yaml
ngrok http 13000
```

2. In [Meta for Developers](https://developers.facebook.com/apps) → your app → WhatsApp → Configuration:

   - **Callback URL:** `https://<your-ngrok-host>/webhook/v/whatsapp`
   - **Verify token:** same as `HABITS_WHATSAPP_VERIFY_TOKEN`
   - Subscribe to the `messages` webhook field

3. Send a test urgent message from a WhatsApp user to your business number.

## Flow

```
WhatsApp message (new, not a reply/reaction)
  → whatsapp-urgent-routing (trigger)
  → analyze-urgency (AI: isUrgent, summary, suggested action)
  → process-urgent-message (urgent only)
      → post-escalation (structured WhatsApp to on-call number)
      → register-pending-ack (DB: status=pending_ack, acknowledged=false, escalateAt=msg+15m)

WhatsApp reply or reaction (parentMessageId = escalation message)
  → handle-whatsapp-ack (trigger)
  → lookup DB by escalationMessageId
  → OpenAI decides acknowledged true/false
  → true: mark DB acknowledged=true

Every 1 minute:
  → check-pending-acks (cron)
      → re-escalate-unacked (per overdue record)
          → re-send WhatsApp reminder
          → bump escalateAt +15m
```

## Acknowledgement

On-call responders can acknowledge by:

- Replying to the **original escalation message** (e.g. "on it", "looking")
- Reacting with ✅, 👍, or 👀 on the **original escalation message**

OpenAI evaluates reply text and reaction emoji. Replies or reactions to reminder messages are not counted.

## Database

Records are stored in the `whatsapp_urgent_escalations` collection with fields including:

- `sourceMessageId`, `escalationMessageId`, `senderPhone`, `summary`, `urgencyLevel`
- `acknowledged` (boolean), `status` (`pending_ack` | `acknowledged`)
- `escalateAt` (re-escalation deadline), `escalationRound`
