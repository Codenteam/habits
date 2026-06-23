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

## Step 3: Open the WhatsApp Use Case

1. In the left sidebar, click **Use cases**.
2. Find WhatsApp and click **Customize**.

## Step 4: Get the Access Token

1. Open [Meta Business Settings](https://business.facebook.com/settings) → **System users**.
2. Click **Add**, enter a name, set **Role** to **Admin**.
3. Select the user → **Assigned assets** → choose your app with **Manage app** access.
4. Click **Generate token**, select your app, set expiration to **Never**.
5. Enable permissions:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
6. Copy the token to `.env` as `HABITS_WHATSAPP_ACCESS_TOKEN`.

## Step 5: Get the Phone Number ID

1. In your Meta app, open **Use cases → Customize → API Setup**.
2. Under **Send and receive messages → From**, select the test phone number.
3. Copy the **Phone number ID** → `HABITS_WHATSAPP_PHONE_NUMBER_ID`.
4. Under **To**, add the recipient phone number (must match `HABITS_WHATSAPP_PHONE`).

> In development/test mode, you can only message numbers added under **To**.

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
2. In your Meta app → WhatsApp → **Configuration**.
3. Paste the callback URL.
4. Set **Verify token** to any string — save the same value as `HABITS_WHATSAPP_VERIFY_TOKEN`.
5. Click **Verify and save** (ngrok and Cortex must be running).

## Example `.env`

```env
HABITS_WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
HABITS_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
HABITS_WHATSAPP_PHONE=+201234567890
HABITS_WHATSAPP_VERIFY_TOKEN=your_verify_token
```

## Used in Showcases

- [WhatsApp Test](https://github.com/codenteam/habits/tree/main/showcase/whatsapp-test)
- [Email Classification](/showcase/email-classification) (not-important emails routed to WhatsApp)
