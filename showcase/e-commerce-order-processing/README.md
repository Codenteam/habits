# E-Commerce Order Processing

Showcase for [`@ha-bits/bit-shopify`](../../nodes/bits/@ha-bits/bit-shopify) order **`ORDERS_CREATE`** webhooks, plus `@ha-bits/bit-airtable`, `@ha-bits/bit-database-sql`, `@ha-bits/bit-openai`, and `@ha-bits/bit-slack`. Uses the Shopify **client credentials grant** (Dev Dashboard app + dev store in the same organization). No browser OAuth redirect is required for this flow.

- [Client credentials grant (Shopify)](https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant)
- [Manage access scopes](https://shopify.dev/docs/apps/build/authentication-authorization/manage-access-scopes)

---

# Shopify Integration Setup

## Requirements

Before starting, you need:

- A **Shopify account**
- A **Shopify development store** (created from Dev Dashboard)
- A **Shopify app** (Dev Dashboard)
- The app **Client ID** and **Client secret**
- The **shop name** (subdomain only, without `.myshopify.com`)
- **Airtable** PAT, base ID, table ID
- **Slack** bot token and channel
- **OpenAI** API key (Slack message draft)

---

## 1. Create a Shopify account

Create or sign in to a Shopify account:

- [Shopify](https://www.shopify.com/)

---

## 2. Open Shopify Dev Dashboard

Open the Dev Dashboard (apps, dev stores, credentials):

- [Shopify Dev Dashboard](https://dev.shopify.com/dashboard/)

---

## 3. Create a development store

From the Dev Dashboard:

```text
Dev stores → Create store
```

Choose **Development store**, pick the **Basic** plan, and optionally enable **Generate test data**.

After creation, note the store **subdomain** (shop name):

```text
your-dev-store
```

Use this value **without** `.myshopify.com` in Habits (e.g. `HABITS_SHOPIFY_SHOP=your-dev-store`).

- [Create dev stores](https://shopify.dev/docs/apps/build/dev-dashboard/development-stores)

---

## 4. Create the Shopify app

From the Dev Dashboard:

```text
Apps → Create app
```

Example app name: `habits`.

Then open the app and go to **Versions** (or create your first version).

- [Create apps using Dev Dashboard](https://shopify.dev/docs/apps/build/dev-dashboard/create-apps-using-dev-dashboard)

---

## 5. Configure and release an app version

Create a new app version and set:

### App URL

Shopify may require an app URL on the version. For **server-only / client-credentials** testing you can use a placeholder or your tunnel URL, for example:

```text
https://your-domain.ngrok-free.dev
```

### Admin API version

This repo’s `@ha-bits/bit-shopify` bit calls GraphQL with version **`2026-07`** (see `SHOPIFY_ADMIN_API_VERSION` in the bit). Keep your Dev Dashboard version aligned with [Shopify API versioning](https://shopify.dev/docs/api/usage/versioning).

### Access scopes

Configure scopes on the **app version** (not in the token request). For **this showcase**:

| Scope | Used by |
| ----- | ------- |
| `read_orders` | `getOrderById`, **`ORDERS_CREATE`** webhook (with Protected customer data approval — see Webhooks) |
| `write_orders` | Optional; often granted with order access on dev apps |
| `read_customers` | **`getOrderById`** — customer `displayName` on orders for Slack / Airtable mapping |

You do **not** need product scopes (`read_products` / `write_products`) for this showcase.

**`ORDERS_CREATE`** requires **Protected customer data access** approval in the Partner Dashboard (scopes alone are not enough).

Then **Release** the version.

- [Manage access scopes](https://shopify.dev/docs/apps/build/authentication-authorization/manage-access-scopes)

---

## 6. Get Client ID and Client secret

In Dev Dashboard → your app → **Settings**, copy:

- **Client ID**
- **Client secret**

Store them in environment variables (never commit secrets).

Copy the example file and edit values:

```bash
cp showcase/e-commerce-order-processing/.env.example showcase/e-commerce-order-processing/.env
```

Example (Habits naming):

```env
HABITS_SHOPIFY_SHOP=your-dev-store
HABITS_SHOPIFY_CLIENT_ID=your-client-id
HABITS_SHOPIFY_CLIENT_SECRET=your-client-secret
HABITS_SHOPIFY_WEBHOOK_URL=https://your-subdomain.ngrok-free.app/webhook/v/shopify
AIRTABLE_PAT=
AIRTABLE_BASE_ID=
AIRTABLE_TABLE_ID=
HABITS_SLACK_BOT_TOKEN=
HABITS_SLACK_DIGEST_CHANNEL=
HABITS_OPENAI_API_KEY=
```

---

## 7. Install the app on the development store

From Dev Dashboard:

```text
Apps → your app → Install app
```

Select the development store you created and complete **Install**.

The app must be installed on the store before client credentials can obtain an access token for that shop.

- [Install your app (Dev Dashboard)](https://shopify.dev/docs/apps/build/dev-dashboard/create-apps-using-dev-dashboard#step-3-install-your-app)

**Same organization:** the app and dev store must appear under the same org in Dev Dashboard, or you may see `shop_not_permitted` on token requests.

---

## 8. If app scopes change later

When you add or change scopes:

1. **Dev Dashboard → Apps → your app → Versions**
2. Create a **new version** with updated scopes
3. **Release** the version
4. On the dev store: **Settings → Apps and sales channels** → your app → **Update** (approve new scopes)
5. **Restart** the Habits server

- [Access scopes overview](https://shopify.dev/docs/api/usage/access-scopes)

---

## Quick configuration

| Setting | Example |
| ------- | ------- |
| Shop name (`HABITS_SHOPIFY_SHOP`) | `your-dev-store` |
| Admin API version (in bit) | `2026-07` |
| App URL (Shopify version) | `https://your-domain.ngrok-free.dev` |
| `read_orders` | Required for order fetch + **`ORDERS_CREATE`** |
| `read_customers` | Recommended for customer name on orders |
| `HABITS_SHOPIFY_WEBHOOK_URL` | Full HTTPS callback, e.g. `https://your-subdomain.ngrok-free.app/webhook/v/shopify` |
| Client ID | Dev Dashboard → Settings |
| Client secret | Dev Dashboard → Settings |

### Official documentation

- [Shopify Dev Dashboard](https://dev.shopify.com/dashboard/)
- [Shopify apps documentation](https://shopify.dev/docs/apps)
- [GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql)

---

## Run this showcase

Build the bit (local monorepo):

```bash
cd nodes/bits/@ha-bits/bit-shopify && pnpm exec tsc
```

Start the habit server from the repo root:

```bash
pnpm habits dev showcase/e-commerce-order-processing/stack.yaml
```

Open the UI: **http://localhost:13000**

> **Note — complete setup in the UI before testing orders**  
> Starting the showcase only loads the server and UI. To run the full flow (Shopify webhook → Airtable → Slack → SQLite → **Orders** tab), you must use the **Configuration** tab:
>
> 1. **Step 1 — Airtable columns** — enter your field list (defaults are prefilled) and click **Configure Airtable fields** so `process-order` can map and create records.
> 2. **Step 2 — Shopify webhooks** — confirm **`ORDERS_CREATE`** (default) and click **Configure webhooks**. The callback URL comes from **`HABITS_SHOPIFY_WEBHOOK_URL`** in `.env` (ngrok must be running and pointed at port **13000**).
>
> Until both steps succeed, new Shopify orders will not be processed end-to-end. Use the **Orders** tab to confirm saved rows (auto-refresh every 30 seconds).

---

## Workflows

| Workflow ID | Purpose |
| ----------- | ------- |
| `configure-airtable-fields` | Create Airtable columns from UI field list |
| `get-field-config` | Load saved field config from SQLite |
| `configure-webhooks` | Register Shopify webhook topic(s) from UI (default **`ORDERS_CREATE` only**) |
| `order-event-webhook` | Log inbound webhook → invoke **`process-order`** |
| `process-order` | Fetch order → Airtable create → OpenAI Slack → SQLite |
| `list-orders` | List saved `orders/create` rows from SQLite (UI polls every 30s) |

### Webhooks

Webhooks need a **public HTTPS** URL that reaches your Habits Cortex server (port **13000**). In `.env`, set the **full** callback path Shopify must POST to:

```env
HABITS_SHOPIFY_WEBHOOK_URL=https://<ngrok>/webhook/v/shopify
```

Point ngrok at `http://localhost:13000`. Set **`HABITS_SHOPIFY_WEBHOOK_URL`** in `.env`; the Configuration tab does not override it. Shopify requires **HTTPS**; `localhost` will not work for subscriptions.

**This showcase is intended to subscribe only to `ORDERS_CREATE`.** The UI default is `ORDERS_CREATE`; **`order-event-webhook`** listens for **`orders/create`** only. Do not register product or other order topics on the same URL unless you add matching handlers.

**Order create** includes **protected customer data**. Shopify blocks `webhookSubscriptionCreate` until your app is approved for **Protected customer data access**, even if `read_orders` is on the app version. Error example:

```text
This app is not approved to subscribe to webhook topics containing protected customer data
```

#### Protected customer data access (required for ORDERS_CREATE)

1. Open the [Shopify Partner program](https://www.shopify.com/partners) and sign in.
2. Open **Apps** → select your app (or **App distribution** → your app).
3. In the left sidebar, open **API access requests**.
4. Request **Protected customer data access** and complete the form.

**Step 1 — What you need access to**

- Select **Protected customer data**.
- Reason: **App functionality** (order payloads to sync Airtable, SQLite, and Slack on new orders).

**Step 2 — Data protection details**

Answer according to how you operate Habits in production (adjust if your deployment differs):

| Question | Suggested answer | Notes |
| -------- | ---------------- | ----- |
| Do you process only the minimum personal data required for your stated purposes? | **Yes** | Request only fields your workflows use. |
| Do you tell merchants what data you process and why? | **Yes** | Document in app listing / privacy policy. |
| Do you limit use of personal data to that purpose? | **Yes** | No unrelated reuse of order/customer payloads. |
| Do you have privacy or data protection agreements with merchants? | **Yes** | If you publish a Privacy Policy and/or DPA for Habits services. |
| Do you respect customer consent decisions where applicable? | **Not applicable** | If Habits does not process marketing consent preferences for this app. |
| Do you respect opt-out of data being sold? | **Not applicable** | If Habits does not sell or share data for that purpose. |
| Automated decision-making with legal or similarly significant effects? | **Not applicable** | If Habits does not perform that type of automated decision-making on customer data. |
| Do you have data retention periods? | **Yes** | Only if you have a real retention policy (logs, databases, backups). |
| Do you encrypt data at rest and in transit? | **Yes** | Only if data is actually encrypted in transit (HTTPS/TLS) and at rest in your hosting. |

Save the request and wait for Shopify approval. Then release/use the approved app version on your dev store, restart Habits, and run **Configure webhooks** with **`ORDERS_CREATE`**.

References: [Protected customer data](https://shopify.dev/docs/apps/launch/protected-customer-data), [HTTPS webhooks](https://shopify.dev/docs/apps/build/webhooks/subscribe/https), [`webhookSubscriptionCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/webhookSubscriptionCreate).

#### Run webhooks in this showcase

1. Expose port **13000** with ngrok and set **`HABITS_SHOPIFY_WEBHOOK_URL`** in `.env` (include **`/webhook/v/shopify`**).
2. Start the server — **`order-event-webhook`** registers **`POST /webhook/v/shopify`**. Cortex verifies **`X-Shopify-Hmac-Sha256`** with **`HABITS_SHOPIFY_CLIENT_SECRET`**.
3. In the UI, **Step 1** configure Airtable fields; **Step 2** set webhook topics (default **`ORDERS_CREATE`**) and click **Configure webhooks**, or call:

```bash
curl -s -X POST http://localhost:13000/api/configure-webhooks \
  -H 'Content-Type: application/json' \
  -d '{"topics":"ORDERS_CREATE"}'
```

4. Create a test order in Shopify admin. Watch Cortex logs for the webhook log and **`process-order`** (Airtable, Slack, SQLite).

List registered listeners: `GET http://localhost:13000/webhook/list`

**Note:** Only one Habits stack should use the same ngrok URL for **`shopifyEvent`**. Run this showcase **or** test-shopify webhooks on that URL, not both.

---

## Troubleshooting

| Symptom | What to check |
| ------- | ---------------- |
| `shop_not_permitted` | App and store in the same Dev Dashboard org; store created from **Dev stores** |
| Token / scope stale after changes | Restart server; confirm token `scope` includes `read_orders`, `read_customers` if needed |
| `protected customer data` on `webhookSubscriptionCreate` | Complete **Protected customer data access** in Partner Dashboard |
| Webhook configure fails “HTTPS” | Set `HABITS_SHOPIFY_WEBHOOK_URL` to `https://…/webhook/v/shopify`; restart after `.env` changes |
| Duplicate Airtable rows | Shopify may retry webhooks; check SQLite `shopify_orders` for existing GID |
