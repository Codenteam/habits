# AI Reply and Routing Assistant (WhatsApp)

Listens for inbound WhatsApp customer messages, classifies them with OpenAI, sends an automatic acknowledgement, optionally auto-replies for low-risk questions, and forwards a summary to the correct team phone number.

> You can also try sending a message from the Meta app under **Use cases → Customize → Basic setup → Try it out → Send a message from your test number** before testing this showcase locally.
>
> In test mode, add every phone number this showcase sends to (your customer test phone and each `HABITS_WHATSAPP_TEAM_*_PHONE`) as **Recipient** in **Send a message from your test number** — otherwise outbound messages fail with error `#131030`.

## Workflows

| Workflow | Role |
|----------|------|
| `whatsapp-routing` | Main pipeline: WhatsApp trigger → parse → analyze → process |
| `analyze-message` | AI classification, risk assessment, summary, ack and final reply |
| `route-category` | `bit-if` branch → team phone from `.env` |
| `send-acknowledgement` | Immediate receipt acknowledgement to the customer (before AI) |
| `send-auto-reply` | Full AI answer to the customer (low-risk only) |
| `forward-to-group` | Summary to team phone (high-risk, human review) |
| `forward-with-auto-reply` | Summary + auto-reply to team phone (low-risk) |
| `process-message` | Orchestrates route → ack → risk branch → auto-reply/forward |

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `HABITS_OPENAI_API_KEY` | OpenAI API key for message analysis |
| `HABITS_WHATSAPP_ACCESS_TOKEN` | WhatsApp Cloud API permanent access token |
| `HABITS_WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business phone number ID |
| `HABITS_WHATSAPP_VERIFY_TOKEN` | Webhook verify token (same value in Meta App Dashboard) |
| `HABITS_WHATSAPP_APP_SECRET` | Meta app secret (verifies `X-Hub-Signature-256` on inbound webhook POSTs) |
| `HABITS_WHATSAPP_TEAM_SALES_PHONE` | Sales team phone (E.164) |
| `HABITS_WHATSAPP_TEAM_SUPPORT_PHONE` | Support team phone (E.164) |
| `HABITS_WHATSAPP_TEAM_BILLING_PHONE` | Billing team phone (E.164) |
| `HABITS_WHATSAPP_TEAM_TECHNICAL_PHONE` | Technical team phone (E.164) |
| `HABITS_WHATSAPP_TEAM_HR_PHONE` | HR team phone (E.164) |
| `HABITS_WHATSAPP_TEAM_GENERAL_PHONE` | General inquiry team phone (E.164) |

Get `HABITS_WHATSAPP_APP_SECRET` from [Meta for Developers](https://developers.facebook.com/apps) → your app → **App settings** → **Basic** → **App secret** → **Show**.

## Run

```bash
pnpm habits dev showcase/ai-reply-and-routing-assistant-whatsapp/stack.yaml
```

## Meta Webhook Setup

The `whatsapp-routing` workflow listens at `/webhook/v/whatsapp`. Cortex verifies each inbound POST with `HABITS_WHATSAPP_APP_SECRET` before dispatching to the trigger. The `whatsapp-inbound` node uses `HABITS_WHATSAPP_VERIFY_TOKEN` only for the GET webhook handshake.

1. Start the server and expose it (e.g. ngrok):

```bash
pnpm habits dev showcase/ai-reply-and-routing-assistant-whatsapp/stack.yaml
ngrok http 13000
```

2. In [Meta for Developers](https://developers.facebook.com/apps) → your app → WhatsApp → Configuration:

   - **Callback URL:** `https://<your-ngrok-host>/webhook/v/whatsapp`
   - **Verify token:** same as `HABITS_WHATSAPP_VERIFY_TOKEN`
   - Subscribe to the `messages` webhook field

3. Send a test message from a customer phone to your business number.

## Flow

```
WhatsApp message (new customer message)
  → whatsapp-routing (trigger)
  → send-acknowledgement (immediate reply to customer)
  → analyze-message (AI: category, risk, summary, final reply)
  → process-message
      → route-category (pick team phone from .env)
      → route-by-risk (bit-if: low vs high)
      → low:  send-auto-reply to customer + forward-with-auto-reply to team
      → high: forward-to-group to team only (no auto-reply to customer)
```

### Risk handling

| Risk | Customer (WhatsApp) | Team phone |
|------|---------------------|------------|
| **Low** | Immediate ack + AI auto-reply | Forward with customer message + auto-reply |
| **High** | Immediate ack only | Forward customer message for human review |

### Categories

Messages are classified as: **sales**, **support**, **billing**, **technical**, **hr**, or **general**.

## Reference

Based on the Slack showcase `showcase/ai-reply-routing-assistant/`, adapted for WhatsApp Business Cloud API.
