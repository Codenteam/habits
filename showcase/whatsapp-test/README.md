# WhatsApp Test

Minimal showcase to verify WhatsApp Business Cloud API messaging: send the `hello_world` template and receive inbound messages via webhook.

## Prerequisites

- A Facebook account
- [ngrok](https://ngrok.com/) installed (for local webhook testing)
- Habits workspace set up locally

## Environment Variables

Create a `.env` file in this directory with:

| Variable | Description |
|----------|-------------|
| `HABITS_WHATSAPP_ACCESS_TOKEN` | Permanent system user token with WhatsApp permissions |
| `HABITS_WHATSAPP_PHONE_NUMBER_ID` | Phone number ID from the Meta app API Setup page |
| `HABITS_WHATSAPP_PHONE` | Recipient phone number in E.164 format (e.g. `+201234567890`) |
| `HABITS_WHATSAPP_VERIFY_TOKEN` | Any string you choose; must match the Meta app webhook verify token |

```bash
HABITS_WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
HABITS_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
HABITS_WHATSAPP_PHONE=+201234567890
HABITS_WHATSAPP_VERIFY_TOKEN=your_verify_token
```

---

## 1. Create a Meta Business Account

1. Log in to your [Facebook account](https://www.facebook.com/).
2. Open [Meta Business login](https://business.facebook.com/).
3. Sign in with your Facebook account, complete the form, and submit to create your business account.

## 2. Create a Meta App

1. Go to [Meta for Developers — Apps](https://developers.facebook.com/apps).
2. Click **Get started** (top right) and complete Meta verification if prompted.
3. Click **Create App**.
4. Fill in the **app name** and your Facebook **email**.
5. Under **Use cases**, select **Connect with customers through WhatsApp**, then click **Next**.
6. Choose your business account, click **Next**, then **Create app**.

You will land on the app dashboard.

## 3. Open the WhatsApp Use Case

1. In the left sidebar, click **Use cases**.
2. Find the WhatsApp use case you selected and click **Customize**.

This opens the WhatsApp configuration area where you will collect credentials and set up the webhook.

---

## 4. Get `HABITS_WHATSAPP_ACCESS_TOKEN` (Permanent Access Token)

1. Open [Meta Business Settings](https://business.facebook.com/settings).
2. In the left sidebar, click **System users**.
3. Click **Add** (top right), enter a name, set **Role** to **Admin**, and create the user.
4. Select the user you created and click **Assigned assets**.
5. Under **Select assets**, choose your app and grant **full access** (enable **Manage app**).
6. Click **Generate token**, select your app, and set **Token expiration** to **Never**.
7. Under **Assign permissions**, select:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
8. Click **Generate token**, copy the token, and save it in `.env` as `HABITS_WHATSAPP_ACCESS_TOKEN`.

## 5. Get `HABITS_WHATSAPP_PHONE_NUMBER_ID`

1. Go back to [Meta for Developers — Apps](https://developers.facebook.com/apps) and open your app.
2. Open **Use cases** → **Customize** on the WhatsApp use case.
3. Open **API Setup** (or **Basic setup**) from the left sidebar.
4. In the **Send and receive messages** section, under **From**, select the test phone number if it is not already selected.
5. Copy the **Phone number ID** and set it in `.env` as `HABITS_WHATSAPP_PHONE_NUMBER_ID`.
6. Under **To**, choose your country code (e.g. **EG +20**) and add the phone number you want to message.

> **Test app limitation:** In development/test mode, you can only send messages to phone numbers added under **To**. That number must match `HABITS_WHATSAPP_PHONE` in your `.env` file.

The next section configures the webhook to receive them.

---

## 6. Configure the Webhook (Receive Messages)

Meta must reach your local Cortex server on port `13000`. Use ngrok to expose it publicly.

### 6.1 Start ngrok

In a terminal:

```bash
ngrok http 13000
```

Keep this terminal open. ngrok prints a public URL that forwards to `localhost:13000`, for example:

```
https://joyous-doorstep-breeder.ngrok-free.dev
```

Your webhook callback URL is that host plus the webhook path:

```
https://joyous-doorstep-breeder.ngrok-free.dev/webhook/v/whatsapp
```

### 6.2 Register the webhook in Meta

1. Start the showcase (see [Running](#running) below) so Cortex is listening on port `13000`.
2. In your Meta app, open the WhatsApp use case (same area as **API Setup**) and click **Configuration**.
3. Under **Callback URL**, paste the full URL from above (including `/webhook/v/whatsapp`).
4. Under **Verify token**, enter any string you choose and save the same value in `.env` as `HABITS_WHATSAPP_VERIFY_TOKEN`.
5. Click **Verify and save**.

> **Important:** Both the showcase and the ngrok terminal must be running before you click **Verify and save**, or verification will fail.

---

## Running

From the Habits workspace root:

```bash
pnpm nx dev @ha-bits/cortex --config showcase/whatsapp-test/stack.yaml
```

The server listens on `0.0.0.0:13000` with the frontend at the same port.

Keep ngrok running in a separate terminal while testing webhooks.

---

## Testing

### Send a template message

1. Open the showcase UI (typically `http://localhost:13000`).
2. Click **Send hello** to send the `hello_world` template to `HABITS_WHATSAPP_PHONE`.

This opens the conversation with the recipient number configured in Meta (**To**) and in your `.env`.

### Receive messages

1. Reply from WhatsApp on the phone number you registered under **To**.
2. The inbound message is parsed and logged in the Cortex terminal as a JSON object (from, text, messageId, contact name, etc.).

---

## Workflows

| Workflow | Endpoint / path | Purpose |
|----------|-----------------|---------|
| `send-hello` | `POST /api/send-hello` | Sends `hello_world` template via `@ha-bits/bit-whatsapp` |
| `receive-message` | `GET/POST /webhook/v/whatsapp` | Webhook trigger for inbound WhatsApp messages |
