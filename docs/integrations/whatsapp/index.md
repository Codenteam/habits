---
title: "WhatsApp Business"
description: "Send and receive WhatsApp messages via Meta Cloud API"
---

# WhatsApp Business

Use `@ha-bits/bit-whatsapp` to send template messages and receive inbound messages via webhooks.

**Related bit:** [`@ha-bits/bit-whatsapp`](/bits/bit-whatsapp)

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `HABITS_WHATSAPP_ACCESS_TOKEN` | Permanent system user token | `EAAG...` |
| `HABITS_WHATSAPP_PHONE_NUMBER_ID` | Phone number ID from Meta app | `1234567890` |
| `HABITS_WHATSAPP_PHONE` | Recipient in E.164 format | `+201234567890` |
| `HABITS_WHATSAPP_VERIFY_TOKEN` | Webhook verify token (your choice) | `my-secret-token` |
| `HABITS_WHATSAPP_APP_SECRET` | Meta app secret for `X-Hub-Signature-256` on inbound POSTs | From App settings → Basic |
| `HABITS_WHATSAPP_SESSION_TEMPLATE` | Approved template name for session-aware outbound (see Step 10) | `hello_world` |
| `HABITS_WHATSAPP_SESSION_TEMPLATE_LANGUAGE` | Template language code — must match Meta exactly | `en_US` |
| `WHATSAPP_ACCESS_TOKEN` | Alternate naming | `EAAG...` |
| `WHATSAPP_PHONE_NUMBER_ID` | Alternate naming | `1234567890` |
| `WHATSAPP_PHONE` | Alternate naming | `+1234567890` |

## Prerequisites

- A Facebook account
- [ngrok](https://ngrok.com/) for local webhook testing
- Habits workspace set up locally

## Step 1: Create a Meta Business Account

1. Log in to [Facebook](https://www.facebook.com/).
2. Open [Meta Business login](https://business.facebook.com/) and create your business account.

## Step 2: Create a Meta App

1. Go to [Meta for Developers — Apps](https://developers.facebook.com/apps).
2. Click **Get started** and complete verification if prompted.
3. Click **Create App**.
4. Fill in app name and email.
5. Under **Use cases**, select **Connect with customers through WhatsApp**.
6. Choose your business account and click **Create app**.

## Step 3: Get the Access Token

1. Open [Meta Business Settings](https://business.facebook.com/settings) → **System users**.
2. Click **Add**, enter a name, set **Role** to **Admin**.
3. Select the user → **Assigned assets** → choose your app with **Manage app** access.
4. Click **Generate token**, select your app, set expiration to **Never**.
5. Enable permissions:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
6. Copy the token to `.env` as `HABITS_WHATSAPP_ACCESS_TOKEN`.

## Step 4: Get the App Secret

Cortex verifies inbound webhook POSTs using `X-Hub-Signature-256` and your Meta **App Secret** ([Meta webhooks docs](https://developers.facebook.com/docs/graph-api/webhooks/getting-started)).

1. Go to [Meta for Developers — Apps](https://developers.facebook.com/apps) and open your app.
2. In the left sidebar, open **App settings** → **Basic**.
3. Find **App secret** and click **Show** (you may need to re-enter your Facebook password).
4. Copy the value to `.env` as `HABITS_WHATSAPP_APP_SECRET`.

> **Do not confuse these credentials:**
>
> | Variable | Used for |
> |----------|----------|
> | `HABITS_WHATSAPP_VERIFY_TOKEN` | GET webhook handshake (`hub.verify_token`) — you choose this string |
> | `HABITS_WHATSAPP_ACCESS_TOKEN` | Sending messages via the Cloud API |
> | `HABITS_WHATSAPP_APP_SECRET` | Verifying `X-Hub-Signature-256` on inbound POST webhooks |

## Step 5: Try it out — test number and credentials

Open **Use cases → Customize → Basic setup** (Step 1: **Try it out**).

### Claim a WhatsApp test number

1. Complete **Claim a WhatsApp test number**.
2. Copy **Phone Number ID** → `HABITS_WHATSAPP_PHONE_NUMBER_ID`.
3. Note **WhatsApp Business Account ID** for Step 9 (`subscribed_apps`).
4. The dashboard **Access token** may show *Not generated yet* — use the system user token from Step 4 instead.

### Send a message from your test number

| Field | Value |
|-------|--------|
| **From** (your test number) | Pre-filled, e.g. `+1-555-204-9466` |
| **Recipient / To** | Your phone — must match `HABITS_WHATSAPP_PHONE` |
| **Message** | Test template (e.g. Order Confirmation) |

Production numbers are configured in **Step 2. Production setup** — not needed for local testing.

### Register every outbound recipient (test mode)

In development/test mode, WhatsApp only delivers messages to phone numbers listed as **Recipient / To** in **Send a message from your test number**. Add **every** number your workflows send to — not just one:

- Customer or test sender phones (inbound testers you auto-reply to)
- Team routing phones (`HABITS_WHATSAPP_TEAM_*_PHONE`)
- On-call or escalation phones (`HABITS_WHATSAPP_ESCALATION_PHONE`)
- Any other `to` value used by `sendTextMessage` in your habits

If a number is missing from the list, the API returns **`(#131030) Recipient phone number not in allowed list`**.

Legacy **API Setup** uses the same **From / To** fields instead of the Try it out wizard.

## Step 6: Configure the Webhook

Meta must reach your local Cortex server. Use ngrok:

```bash
ngrok http 13000
```

Your webhook callback URL:

```
https://<your-ngrok-host>/webhook/v/whatsapp
```

1. Start the showcase so Cortex listens on port `13000`.
2. In your Meta app → **Use cases → Customize → Production Setup → Configure Webhooks**.
3. Paste the callback URL.
4. Set **Verify token** to any string — save the same value as `HABITS_WHATSAPP_VERIFY_TOKEN`.
5. Click **Verify and save** (ngrok and Cortex must be running).

Meta may redirect to **Permissions and features** after verify — return to **Configuration** for the steps below.

## Step 7: Subscribe to the `messages` webhook field

1. On **Configuration**, open **Webhook fields** → **Manage**.
2. Subscribe to **`messages`** and save.
3. Optional: click **Test** next to **`messages`** — ngrok inspector (`<Forwarding Url>`) should show a POST.

> **Check test webhooks** (Try it out) shows payloads inside Meta’s UI only; it does not confirm delivery to your callback URL.

## Step 8: Subscribe your Meta app to the WABA

Inbound messages are POSTed only to the Meta app subscribed to your WABA. Use [Graph API Explorer](https://developers.facebook.com/tools/explorer) (select **your app**, use your system user token).

### Get WABA ID

Copy from **Basic setup → Try it out → Claim a WhatsApp test number**, or **GET** `/{PHONE_NUMBER_ID}?fields=whatsapp_business_account`.

### Check subscription

**GET** `/{WABA_ID}/subscribed_apps`

Your app should appear in `data`. If `data` is empty or only **WA DevX Webhook Events 1P App** is listed, your app is not subscribed.

### Subscribe (if needed)

**POST** `/{WABA_ID}/subscribed_apps` (empty body). Confirm with GET again.

Reference: [Webhooks for WhatsApp Business Accounts](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-whatsapp)

## Step 9: Create a message template (session outbound)

Showcases that notify team or on-call phones (`send-whatsapp-session-aware`) send an approved **template message** first when there is no open 24-hour session with that recipient. You need a template name and language code for `.env`.

### Quick start (development)

Meta provides a pre-approved test template you can use immediately:

| Variable | Value |
|----------|--------|
| `HABITS_WHATSAPP_SESSION_TEMPLATE` | `hello_world` |
| `HABITS_WHATSAPP_SESSION_TEMPLATE_LANGUAGE` | `en_US` |

### Create your own template (production)

1. Open [WhatsApp Manager → Message templates](https://business.facebook.com/wa/manage/message-templates/) (or **Meta Business Suite** → **WhatsApp Manager** → **Message templates**).
2. Click **Create template** and follow the wizard (name, category, language, body text).
3. Submit for Meta review. Status must be **Approved** before you can send it via the API.
4. Copy the **template name** exactly as shown (lowercase, underscores — e.g. `urgent_message_alert`) into `HABITS_WHATSAPP_SESSION_TEMPLATE`.
5. Copy the **language code** exactly (e.g. `en_US`, `en`) into `HABITS_WHATSAPP_SESSION_TEMPLATE_LANGUAGE`. A mismatch causes error `#132001` (template not in translation).

Official guides:

- [Message templates overview](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [Template components and guidelines](https://developers.facebook.com/docs/whatsapp/message-templates/guidelines)

> **Tip:** The template name and language in `.env` must match the approved template in WhatsApp Manager character-for-character.

## Example `.env`

```env
HABITS_WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
HABITS_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
HABITS_WHATSAPP_PHONE=+201234567890
HABITS_WHATSAPP_VERIFY_TOKEN=your_verify_token
HABITS_WHATSAPP_APP_SECRET=your_app_secret

# Session template — see Step 10 above
HABITS_WHATSAPP_SESSION_TEMPLATE=hello_world
HABITS_WHATSAPP_SESSION_TEMPLATE_LANGUAGE=en_US
```

<IntegrationShowcases integration="whatsapp" />
