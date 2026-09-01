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
| `post-escalation` | Structured WhatsApp message to the on-call number (session-aware) |
| `send-whatsapp-session-aware` | Sends template + text on cold start, text only within 24h window |
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
HABITS_WHATSAPP_APP_SECRET=your_app_secret
HABITS_WHATSAPP_ESCALATION_PHONE=+14155238886
```

| Variable | Description |
|----------|-------------|
| `HABITS_OPENAI_API_KEY` | OpenAI API key for urgency analysis and ack detection |
| `HABITS_WHATSAPP_ACCESS_TOKEN` | WhatsApp Cloud API permanent access token |
| `HABITS_WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business phone number ID |
| `HABITS_WHATSAPP_VERIFY_TOKEN` | Webhook verify token (same value in Meta App Dashboard) |
| `HABITS_WHATSAPP_APP_SECRET` | Meta app secret (verifies `X-Hub-Signature-256` on inbound webhook POSTs) |
| `HABITS_WHATSAPP_SESSION_TEMPLATE` | Approved template for first outbound to on-call (outside 24h window) — see [Create a message template](#create-a-message-template) |
| `HABITS_WHATSAPP_SESSION_TEMPLATE_LANGUAGE` | Template language code (default `en_US`) — must match Meta exactly |
| `HABITS_WHATSAPP_ESCALATION_PHONE` | On-call phone number that receives escalation messages (E.164) |

Get `HABITS_WHATSAPP_APP_SECRET` from [Meta for Developers](https://developers.facebook.com/apps) → your app → **App settings** → **Basic** → **App secret** → **Show**.

## WhatsApp setup — read the docs first

The variables above are not enough on their own. **Before you run this showcase**, open the Habits documentation and read the **WhatsApp integration guide** from start to finish. It covers:

- Meta app and WhatsApp Business setup
- Access tokens, phone number ID, and app secret
- Webhook URL, verify token, and `messages` subscription
- Test recipients and message templates
- Common errors and troubleshooting

Follow every step in that guide to make sure WhatsApp is fully configured and working before testing this showcase.

## Run

```bash
pnpm habits dev showcase/urgent-message-escalation-whatsapp/stack.yaml
```

## Meta Webhook Setup

Both `whatsapp-urgent-routing` and `handle-whatsapp-ack` listen on `/webhook/v/whatsapp`. Cortex verifies each inbound POST with `HABITS_WHATSAPP_APP_SECRET` before dispatching to the trigger. The `whatsapp-inbound` nodes use `HABITS_WHATSAPP_VERIFY_TOKEN` only for the GET webhook handshake.

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

## Create a message template

Escalations to the on-call number (`send-whatsapp-session-aware`) require an approved template for the first outbound message to that phone. Set `HABITS_WHATSAPP_SESSION_TEMPLATE` and `HABITS_WHATSAPP_SESSION_TEMPLATE_LANGUAGE` in `.env`.

**Development:** use Meta’s built-in test template:

```env
HABITS_WHATSAPP_SESSION_TEMPLATE=hello_world
HABITS_WHATSAPP_SESSION_TEMPLATE_LANGUAGE=en_US
```

**Production:** create and approve a template in Meta:

1. [WhatsApp Manager → Message templates](https://business.facebook.com/wa/manage/message-templates/) → **Create template**.
2. After approval, copy the **template name** and **language code** into `.env`.
3. See [Message templates (Meta)](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates) and the [WhatsApp integration guide](../../docs/integrations/whatsapp/index.md#step-10-create-a-message-template-session-outbound).

> Template name and language must match the approved template exactly or the API returns `#132001`.

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
