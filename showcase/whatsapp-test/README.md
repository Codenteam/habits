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

## 5. Try it out — test number, credentials, and first message

1. Go to [Meta for Developers — Apps](https://developers.facebook.com/apps) and open your app.
2. Open **Use cases** → **Customize** on the WhatsApp use case.
3. Open **Basic setup** from the left sidebar (Step 1: **Try it out**).

Meta’s onboarding is a short wizard titled *“Send a message from your test number to understand how WhatsApp API works.”* It has two sections:

### 5.1 Claim a WhatsApp test number

1. Complete **Claim a WhatsApp test number** (status shows **Completed** when done).
2. Copy the values shown on this card into your notes / `.env`:

| Meta dashboard field | `.env` variable |
|----------------------|-----------------|
| **Phone Number ID** (e.g. `1196076370266031`) | `HABITS_WHATSAPP_PHONE_NUMBER_ID` |
| **WhatsApp Business Account ID** (e.g. `2119204378662436`) | Used in §6.4 (`subscribed_apps`) — not an env var |
| **Test number** (e.g. `+1 (555) 204-9466`) | Business **From** number — message this number when testing inbound |

3. **Access token** on this card may show *“Not generated yet”* — that is Meta’s **temporary** test token. For Habits, use the permanent **system user token** from §4 as `HABITS_WHATSAPP_ACCESS_TOKEN` instead.

Claiming the test number also connects a WhatsApp Business Account (WABA) to your app. If no WABA is linked yet, follow the claim flow and select or create a business portfolio when prompted.

### 5.2 Send a message from your test number

1. Complete **Send a message from your test number** (second card in Try it out).
2. Meta notes you can set up your own production number later in **Step 2. Production setup** — skip that for this showcase.

| Field | What to enter |
|-------|----------------|
| **Your test number** / **From** | Pre-filled with the claimed test number (e.g. `+1-555-204-9466`) |
| **Recipient** / **To** | Your personal phone in E.164 format (e.g. `+201286185810`) — must match `HABITS_WHATSAPP_PHONE` in `.env` |
| **Message** | Any approved test template (e.g. **Order Confirmation** or `hello_world`) |

3. Send the message and confirm it arrives on your phone.

> **Test app limitation:** In development/test mode, you can only send messages to numbers added as **Recipient / To**. That number must match `HABITS_WHATSAPP_PHONE` in your `.env` file.

### 5.3 Older dashboard layout (API Setup)

Some apps still show **Use cases → Customize → API Setup** with **Send and receive messages → From / To** instead of the Try it out wizard. The mapping is the same:

| Try it out (current) | API Setup (legacy) |
|----------------------|-------------------|
| Claim a WhatsApp test number | **From** test number + Phone number ID |
| Recipient / **To** | **To** recipient list |
| WhatsApp Business Account ID on claim card | WABA ID on API Setup |

The next sections configure the webhook and ensure inbound messages reach Cortex.

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
2. In your Meta app, open **Use cases** → **Customize** → **Configuration** (webhook settings; separate from **Basic setup → Try it out**).
3. Under **Callback URL**, paste the full URL from above (including `/webhook/v/whatsapp`).
4. Under **Verify token**, enter any string you choose and save the same value in `.env` as `HABITS_WHATSAPP_VERIFY_TOKEN`.
5. Click **Verify and save**.

> **Important:** Both the showcase and the ngrok terminal must be running before you click **Verify and save**, or verification will fail.

Meta may redirect you to **Permissions and features** after verify — that is normal. Go back to **Configuration** for the steps below.

Verification (GET) only proves Meta can reach your URL. You still need to subscribe webhook fields and link your app to the WABA before inbound messages are POSTed to ngrok/Cortex.

### 6.3 Subscribe to the `messages` webhook field

1. Stay on (or return to) **Use cases** → **Customize** → **Configuration**.
2. Under **Webhook fields**, click **Manage**.
3. Find **`messages`** and toggle **Subscribe**.
4. Click **Save**.

Optional sanity check: click **Test** next to **`messages`** on the same page. With ngrok and Cortex running, you should see a **POST** in the ngrok inspector (`http://127.0.0.1:4040`).

> **Do not rely on Try it out → Check test webhooks** to confirm delivery to your server. That viewer shows payloads inside Meta’s dashboard and may use Meta’s internal **WA DevX Webhook Events** app instead of your callback URL.

### 6.4 Subscribe your Meta app to the WABA (required for inbound messages)

Real WhatsApp message webhooks are delivered only to the Meta app that is **subscribed** to your WhatsApp Business Account (WABA). A verified callback URL alone is not enough.

New apps are often subscribed only to Meta’s default **WA DevX Webhook Events 1P App**. In that case, **Send hello** works, **Check test webhooks** may show payloads, but **nothing reaches ngrok or Cortex**.

Use [Graph API Explorer](https://developers.facebook.com/tools/explorer) (browser UI — no terminal `curl` required).

#### 6.4.1 Open Graph API Explorer

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer).
2. In the **Meta App** dropdown (top right), select **your app** (e.g. HabitsCortexApp) — not WA DevX.
3. Click **Generate access token** (or paste your system user token from §4).
4. Ensure the token has `whatsapp_business_management` and `whatsapp_business_messaging`.

#### 6.4.2 Get your WABA ID

Copy **WhatsApp Business Account ID** from **Basic setup → Try it out → Claim a WhatsApp test number** (see §5.1).

If it is not shown in the dashboard, use Graph API Explorer:

1. Set method to **GET**.
2. Enter (replace with your phone number ID from `.env`):

```
/{PHONE_NUMBER_ID}?fields=whatsapp_business_account
```

Example: `/<PHONE_NUMBER_ID>?fields=whatsapp_business_account`

3. Click **Submit**.
4. Copy the `whatsapp_business_account.id` value from the response — this is your **WABA ID**.

#### 6.4.3 Check if your app is subscribed to the WABA

1. Set method to **GET**.
2. Enter:

```
/{WABA_ID}/subscribed_apps
```

Example: `/<WABA_ID>/subscribed_apps`

3. Click **Submit**.

**Connected** — response `data` includes an entry whose `name` matches **your app**:

```json
{
  "data": [
    {
      "whatsapp_business_api_data": {
        "name": "YourAppName",
        "id": "<id>"
      }
    }
  ]
}
```

**Not connected** — `data` is empty, or only **WA DevX Webhook Events 1P App** appears (not your app). Continue to §6.4.4.

#### 6.4.4 Subscribe your app to the WABA (if not connected)

1. Keep **your app** selected in Graph API Explorer.
2. Set method to **POST**.
3. Enter the same path:

```
/{WABA_ID}/subscribed_apps
```

4. Leave the request body empty.
5. Click **Submit**.

Expected response:

```json
{ "success": true }
```

6. Run the **GET** from §6.4.3 again. **Your app** should now appear in `data` (WA DevX may also remain listed — that is usually fine).

Official reference: [Webhooks for WhatsApp Business Accounts](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-whatsapp)

#### 6.4.5 Connect WABA via dashboard (if not linked)

If **Basic setup → Try it out** does not show a **WhatsApp Business Account ID** on the claim card:

1. **Use cases** → **Customize** → **Basic setup** → **Try it out**.
2. Start or redo **Claim a WhatsApp test number** and connect/select a WhatsApp Business Account when Meta prompts you.
3. On older layouts: **API Setup** → **Connect** / **Add** WhatsApp Business Account.
4. Return to §6.4.3 and confirm your app appears under `subscribed_apps`.

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

This opens the conversation with the **Recipient / To** phone from §5.2 and `HABITS_WHATSAPP_PHONE` in your `.env`.

### Receive messages

1. Confirm §6.3 (`messages` subscribed) and §6.4 (your app in `subscribed_apps`) are complete.
2. Keep ngrok and Cortex running. Open the ngrok inspector at `http://127.0.0.1:4040`.
3. Reply from WhatsApp on the phone you set as **Recipient / To** in §5.2 — message the **test number** (**From**, e.g. `+1-555-204-9466`), not your own number.
4. You should see a **POST** to `/webhook/v/whatsapp` in ngrok, then in Cortex:

   ```
   📥 Vendor webhook received: /webhook/v/whatsapp
      Method: POST
   ```

5. The inbound message is parsed and logged as a JSON object (from, text, messageId, contact name, etc.).

### Troubleshooting inbound webhooks

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Verify works, send works, no POST on reply | `messages` not subscribed | §6.3 |
| Check test webhooks shows payload, ngrok empty | WABA subscribed to WA DevX only | §6.4.3–6.4.4 |
| POST in ngrok with `statuses`, not `messages` | Outbound status webhook (normal after Send hello) | Reply from your **To** phone |
| No POST at all | ngrok URL changed | Update Callback URL in Configuration and re-verify |

---

## Workflows

| Workflow | Endpoint / path | Purpose |
|----------|-----------------|---------|
| `send-hello` | `POST /api/send-hello` | Sends `hello_world` template via `@ha-bits/bit-whatsapp` |
| `receive-message` | `GET/POST /webhook/v/whatsapp` | Webhook trigger for inbound WhatsApp messages |
