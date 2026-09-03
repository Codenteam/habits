# Sync HubSpot ↔ Salesforce

Bidirectional contact sync between HubSpot and Salesforce.

| Workflow | Direction | Trigger |
|----------|-----------|---------|
| `sync-hubspot-salesforce` | HubSpot → Salesforce | HubSpot `contact.creation` webhook |
| `sync-salesforce-hubspot` | Salesforce → HubSpot | Salesforce Flow HTTP POST |

**Start here:** complete the Salesforce setup below first to get `SALESFORCE_CLIENT_ID`, `SALESFORCE_INSTANCE_URL`, and confirm you can see the **Contacts** table in Salesforce. Then configure the webhook Flow for `SALESFORCE_X_WEBHOOK_SECRET`, then the rest of this guide.

---

## Salesforce setup

### 1. Create a Developer Edition org

Sign up for a free **Developer Edition** account:

https://developer.salesforce.com/signup

Complete the signup and basic org setup.

### 2. Create a Connected App

**Where in Salesforce:**

1. Click the **gear** icon (top right) → **Setup**.
2. In the left sidebar **Quick Find** box, type **App Manager** → click **App Manager** (under *Apps*).
3. Click **New Connected App** (top right).  
   *(Some orgs show **External Client App Manager** instead — use **New External Client App** if that is what you see.)*

**On the form:**

4. **Connected App Name** / **API Name** / **Contact Email** — fill in any values you like.
5. Scroll to **API (Enable OAuth Settings)** → check **Enable OAuth Settings**.
6. **Callback URL** — paste:
   ```
   http://localhost:13000/oauth/bit-salesforce/callback
   ```
7. **Selected OAuth Scopes** — move these from *Available* to *Selected*:
   - **Manage user data via APIs (`api`)**
   - **Perform requests at any time (`refresh_token`, `offline_access`)**
8. Click **Save** (then **Continue** if Salesforce warns about token timeout).

> New Connected Apps can take a few minutes to become active.

### 3. Get Consumer Key (Client ID)

**Where in Salesforce:**

1. **Setup** → Quick Find → **App Manager** → open your Connected App.
2. On the app detail page, click **Manage Consumer Details** (or **View** under *Consumer Key and Secret*).
3. Complete email/SMS verification if prompted.
4. Copy **Consumer Key** → this is `SALESFORCE_CLIENT_ID` in `.env`.

You do not need the Consumer Secret for this showcase; OAuth uses PKCE with the Client ID only.

### 4. Get your instance URL (`SALESFORCE_INSTANCE_URL`)

**Where in Salesforce:**

Look at the browser address bar while logged in. Copy everything up to `.com` (no path), for example:

```
https://yourcompany-dev-ed.develop.my.salesforce.com
```

That value is `SALESFORCE_INSTANCE_URL` in `.env`.

### 5. Open the Contacts table

**Where in Salesforce:**

1. Click the **App Launcher** (nine dots, top left).
2. Type **Contacts** in the search box → click **Contacts**.
3. You see the Contacts list — synced contacts appear here after a successful run.

*(Alternative: **Setup** → Quick Find → **Contacts** → open the Contacts tab.)*

---

................................................................................

## Salesforce webhook secret (`SALESFORCE_X_WEBHOOK_SECRET`)

For **Salesforce → HubSpot**, Salesforce must POST new contacts to Habits with a custom auth header. Generate a shared secret, put it in `.env` as `SALESFORCE_X_WEBHOOK_SECRET`, and configure Salesforce to send it on every request.

**Header name (exact):** `salesforce-X-Webhook-Secret`  
**Webhook URL:** `https://<your-ngrok-host>/webhook/v/salesforce`  
**Method:** `POST`

Habits compares the header value to `SALESFORCE_X_WEBHOOK_SECRET` in `.env`. If they do not match → `401 Unauthorized`.

### Overview

```text
Contact created in Salesforce
        → Record-Triggered Flow (after save)
        → Run Asynchronously
        → Build JSON body from Triggering Contact
        → HTTP Callout (Named Credential)
        → POST /webhook/v/salesforce
           Header: salesforce-X-Webhook-Secret: <your secret>
```

### 1. External Credential

**Where in Salesforce:**

1. **Setup** (gear → **Setup**).
2. Quick Find → type **Named Credentials** → click **Named Credentials**.
3. Open the **External Credentials** tab → click **New**.

**On the form:**

| Field | Value |
|-------|--------|
| Label | `habits_webhook` |
| Authentication Protocol | **Custom** |

Click **Save**.

**Add Principal** (on the External Credential detail page):

1. Scroll to **Principals** → **New**.
2. **Parameter Name:** `WebhookSecret`
3. **Sequence Number:** `1`
4. **Identity Type:** **Named Principal**
5. Click **Save**.

**Add Authentication Parameter** (inside the Principal):

1. Open the `habits_webhook - WebhookSecret` principal.
2. Under **Authentication Parameters** → **New**.
3. **Name:** `WebhookSecret`
4. **Value:** same string as `SALESFORCE_X_WEBHOOK_SECRET` in your Habits `.env`
5. Click **Save**.

**Add Custom Header** (back on the External Credential page):

1. Scroll to **Custom Headers** → **New**.
2. **Name:** `salesforce-X-Webhook-Secret` *(exact spelling and casing)*
3. **Value:** `{!$Credential.habits_webhook.WebhookSecret}`
4. **Sequence Number:** `1`
5. Click **Save**.

### 2. Named Credential

**Where in Salesforce:**

1. **Setup** → Quick Find → **Named Credentials** → **Named Credentials** tab → **New**.

**On the form:**

| Field | Value |
|-------|--------|
| Label | `habits_webhook` |
| URL | `https://<your-ngrok-host>/webhook/v/salesforce` *(full URL — no trailing path missing)* |
| External Credential | select `habits_webhook` |
| Generate Authorization Header | **unchecked** |
| Allow Formulas in HTTP Header | **checked** |

Click **Save**.

> The Named Credential holds the **full** webhook URL. The Flow HTTP Callout **URL Path must stay empty**.

### 3. Permission Set

**Where in Salesforce:**

1. **Setup** → Quick Find → **Permission Sets** → **New**.
2. **Label:** `Salesforce Webhook Permission` → **Save**.

**Grant External Credential access:**

1. On the Permission Set page → **External Credential Principal Access** → **Edit**.
2. Enable **habits_webhook - WebhookSecret** → **Save**.

**Assign to your user:**

1. On the same Permission Set → **Manage Assignments** → **Add Assignment**.
2. Select your Salesforce user → **Next** → **Assign** → **Done**.

### 4. Record-Triggered Flow

**Where in Salesforce:**

1. **Setup** → Quick Find → **Flows** → **New Flow**.
2. Select **Record-Triggered Flow** → **Create**.

**Configure Start** (click the **Start** element):

| Field | Value |
|-------|--------|
| Object | **Contact** |
| Trigger | **A record is created** |
| Optimize the Flow for | **Actions and Related Records** *(after-save — required for HTTP callouts)* |

Click **Done** on the Start element.

**Add async path** (still on Start):

1. Click **Start** again → under *Scheduled Paths* or *Asynchronous Paths* → **Add Asynchronous Path** → **Run Asynchronously** → **Done**.

**Add HTTP Callout action** (creates the body schema):

1. Click **+** below **Run Asynchronously** → **Action** → search **HTTP Callout** → **Create HTTP Callout**.
2. **Label:** `Send New Contact`
3. **Named Credential:** `habits_webhook`
4. **Method:** `POST`
5. **URL Path:** leave **empty**
6. **Sample Request Body** — paste:

```json
{
  "id": "003XXXXXXXXXXXX",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+20123456789"
}
```

7. Click **Review** → Salesforce generates a body resource (e.g. `ContactWebhookBody`).
8. For sample response, choose **Use Example Response**:

```json
{ "success": true, "message": "Contact received successfully" }
```

9. Finish the HTTP Callout wizard → **Done**.

**Add Assignment** (before the HTTP Callout):

1. Click **+** between **Run Asynchronously** and **Send New Contact** → **Assignment**.
2. **Label:** `Build Contact Webhook Body`
3. Map **Triggering Contact** fields to the body resource:

| Variable (left) | Operator | Value (right — pick from resources) |
|-----------------|----------|-------------------------------------|
| `ContactWebhookBody.id` | Equals | **Triggering Contact** → **Contact ID** |
| `ContactWebhookBody.email` | Equals | **Triggering Contact** → **Email** |
| `ContactWebhookBody.firstName` | Equals | **Triggering Contact** → **First Name** |
| `ContactWebhookBody.lastName` | Equals | **Triggering Contact** → **Last Name** |
| `ContactWebhookBody.phone` | Equals | **Triggering Contact** → **Mobile Phone** (or **Phone**) |

4. Click **Done**.

**Final flow shape:**

```text
Start
 └── Run Asynchronously
      └── Build Contact Webhook Body  (Assignment)
           └── Send New Contact       (HTTP Callout)
```

**Activate:**

1. Click **Save** → enter Flow label (e.g. `Send New Contact to Webhook`) → **Save**.
2. Click **Activate**.

### 5. Request sent to Habits

```http
POST /webhook/v/salesforce
Content-Type: application/json
salesforce-X-Webhook-Secret: YOUR_WEBHOOK_SECRET
```

```json
{
  "id": "003XXXXXXXXXXXX",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+20123456789"
}
```

Set `SALESFORCE_X_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET` in `.env` to match.

---

## Sync showcase setup

### 1. Set up `.env`

```bash
cp .env.example .env
```

| Variable | Purpose |
|----------|---------|
| `HABITS_HUBSPOT_ACCESS_TOKEN` | HubSpot Private App access token |
| `HABITS_HUBSPOT_CLIENT_SECRET` | HubSpot client secret (webhook signature verification) |
| `SALESFORCE_CLIENT_ID` | Connected App Consumer Key (see Salesforce setup above) |
| `SALESFORCE_INSTANCE_URL` | Org URL from the browser (see Salesforce setup above) |
| `SALESFORCE_X_WEBHOOK_SECRET` | Same secret as Salesforce External Credential `WebhookSecret` |

#### HubSpot Private App scopes

**Where in HubSpot:**

1. Log in to HubSpot → click **Settings** (gear, top navigation).
2. Left sidebar → **Integrations** → **Private Apps**.
3. **Create a private app** (or open an existing one).
4. **Scopes** tab → enable:
   - `crm.objects.contacts.read` — HubSpot → Salesforce
   - `crm.objects.contacts.write` — Salesforce → HubSpot
5. **Auth** tab → copy **Access token** → `HABITS_HUBSPOT_ACCESS_TOKEN`
6. Copy **Client secret** → `HABITS_HUBSPOT_CLIENT_SECRET`

### 2. Run the showcase

**Where on your machine** (repo root):

```bash
pnpm habits dev showcase/sync-hubspot-salesforce/stack.yaml
```

**Authorize Salesforce (browser):**

Open:

```
http://localhost:13000/oauth/bit-salesforce/init
```

Approve access in the Salesforce login/consent screen.

**Expose Habits to the internet (terminal):**

```bash
ngrok http 13000
```

Copy the `https://….ngrok-free.app` host → use it in:
- Salesforce **Named Credential** URL
- HubSpot webhook Target URL (below)

**Showcase UI (browser):**

```
http://localhost:13000/
```

Update the Salesforce **Named Credential** URL whenever ngrok restarts and the host changes.

---

## HubSpot → Salesforce

### HubSpot webhook

**Where in HubSpot:**

1. **Settings** → **Integrations** → **Private Apps** → open your app.
2. **Webhooks** tab → **Create subscription** (or **Edit subscriptions**).
3. **Target URL:**

```
https://<your-ngrok-host>/webhook/v/hubspot
```

4. **Event type:** **Contact** → **contact.creation** (Created).
5. Save.

### Test

**HubSpot:** **CRM** → **Contacts** → **Create contact** → fill form → **Create**.

**Salesforce:** App Launcher → **Contacts** → confirm the new contact appears.

---

## Salesforce → HubSpot

Uses the **Record-Triggered Flow** configured above (Named Credential + `salesforce-X-Webhook-Secret` header).

### Test

**Salesforce:** App Launcher → **Contacts** → **New** → fill First Name, Last Name, Email → **Save**.

**HubSpot:** **CRM** → **Contacts** → confirm the new contact appears.

Check Habits terminal logs for `📥 Vendor webhook received: /webhook/v/salesforce`.

### Manual curl test

```bash
curl -X POST https://<ngrok-host>/webhook/v/salesforce \
  -H "Content-Type: application/json" \
  -H "salesforce-X-Webhook-Secret: YOUR_WEBHOOK_SECRET" \
  -d '{
    "id": "003TEST",
    "email": null,
    "firstName": "Test",
    "lastName": "User",
    "phone": "+1 555 0100"
  }'
```

Contacts without email get placeholder `sf-{id}@contacts.sync.local` in HubSpot.

---

## Loop prevention

Bidirectional sync can echo the same contact back and forth. This showcase prevents that with explicit `bit-if` branches (separate nodes per path — create vs skip):

| Direction | Guard |
|-----------|--------|
| HubSpot → Salesforce | Skips HubSpot `contact.creation` events from `INTEGRATION` / `API` (contacts created by this sync) |
| HubSpot → Salesforce | `getContact` by email → **create branch** only when `found === false` |
| Salesforce → HubSpot | `getContact` by email → **create branch** only when `found === false` |

**Example:** You create a contact in HubSpot → it syncs to Salesforce → Salesforce Flow fires → the reverse workflow finds the same email already in HubSpot and **does not** create a duplicate.

Restart `habits dev` after workflow changes.

---

## Troubleshooting

| Issue | Check |
|-------|--------|
| HubSpot webhook 401 | `HABITS_HUBSPOT_CLIENT_SECRET` matches Private App |
| Salesforce webhook 401 | `salesforce-X-Webhook-Secret` header matches `SALESFORCE_X_WEBHOOK_SECRET` in `.env` |
| Salesforce API error (→ SF direction) | OAuth at `/oauth/bit-salesforce/init` |
| HubSpot create fails (→ HS direction) | Token has `crm.objects.contacts.write` scope |
| No Salesforce webhook received | Named Credential URL + ngrok host; Flow is **Activated** |
| Filter rejected (0 matched) | Flow body must include Salesforce Contact `id` |
| Duplicate contacts / sync loop | `bit-if` branches skip create when contact already exists; HubSpot API events are ignored |
