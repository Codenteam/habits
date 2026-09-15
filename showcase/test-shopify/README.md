# Test Shopify

Showcase for [`@ha-bits/bit-shopify`](../../nodes/bits/@ha-bits/bit-shopify) using the Shopify **client credentials grant** (Dev Dashboard app + dev store in the same organization). No browser OAuth redirect is required for this flow.

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
habits-pl7w934a
```

Use this value **without** `.myshopify.com` in Habits (e.g. `HABITS_SHOPIFY_SHOP=`).

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
| `read_products` | `listProducts`, `getProductById`, product webhooks |
| `write_products` | `createProduct` |
| `read_orders` | Order webhooks (with Protected customer data approval — see Webhooks) |
| `write_orders` | Optional for order Admin API actions |

`getShop` works once the app is installed and client credentials succeed; product actions need the scopes above.

Order webhook topics (e.g. `ORDERS_CREATE`, `ORDERS_UPDATE`) also require **Protected customer data access** approval in the Partner Dashboard (scopes alone are not enough).

Then **Release** the version.

- [Manage access scopes](https://shopify.dev/docs/apps/build/authentication-authorization/manage-access-scopes)
- [GraphQL Admin API – products](https://shopify.dev/docs/api/admin-graphql/latest/queries/products)
- [productCreate mutation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate)

---

## 6. Get Client ID and Client secret

In Dev Dashboard → your app → **Settings**, copy:

- **Client ID**
- **Client secret**

Store them in environment variables (never commit secrets).

Copy the example file and edit values:

```bash
cp showcase/test-shopify/.env.example showcase/test-shopify/.env
```

Example (Habits naming):

```env
HABITS_SHOPIFY_SHOP=
HABITS_SHOPIFY_CLIENT_ID=your-client-id
HABITS_SHOPIFY_CLIENT_SECRET=your-client-secret
HABITS_SHOPIFY_TEST_PRODUCT_TITLE=Habits test product
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
| Shop name (`HABITS_SHOPIFY_SHOP`) | `` |
| Admin API version (in bit) | `2026-07` |
| App URL (Shopify version) | `https://your-domain.ngrok-free.dev` |
| `read_products` | Required for list / get by ID |
| `write_products` | Required for create |
| `read_orders` | Required for `ORDERS_CREATE` webhooks |
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
pnpm habits dev showcase/test-shopify/stack.yaml
```

Open the UI: **http://localhost:13000**

---

## Workflows

| Workflow ID | Bit action | Purpose |
| ----------- | ---------- | ------- |
| `get-shop` | `getShop` | Validate token and shop metadata |
| `create-product` | `createProduct` | Create a test product |
| `list-products` | `listProducts` | List products |
| `get-product-by-id` | `getProductById` | Fetch one product by GID |
| `configure-webhooks` | `createWebhookSubscription` (via loop) | Register Shopify webhook topics |
| `shopify-event-webhook` | `shopifyEvent` trigger | Log inbound Shopify webhooks |

### Webhooks

Webhooks need a **public HTTPS** URL that reaches your Habits Cortex server (port **13000**). In `.env` (see `.env.example`), set the **full** callback path Shopify must POST to:

```env
HABITS_SHOPIFY_WEBHOOK_URL=https://<ngrok>/webhook/v/shopify
```

Point ngrok at `http://localhost:13000`. You can override the URL per request with the **Callback URL** field in the UI. Shopify requires **HTTPS**; `localhost` will not work for subscriptions.

**Product webhooks** (e.g. `PRODUCTS_CREATE`, `PRODUCTS_UPDATE`) only need the usual Admin scopes (`read_products` / `write_products`) and the steps below.

**Order webhooks** (e.g. `ORDERS_CREATE`, `ORDERS_UPDATE`) include **protected customer data**. Shopify blocks `webhookSubscriptionCreate` until your app is approved for **Protected customer data access**, even if `read_orders` / `write_orders` are on the app version. Error example:

```text
This app is not approved to subscribe to webhook topics containing protected customer data
```

#### Protected customer data access (required for order webhooks)

1. Open the [Shopify Partner program](https://www.shopify.com/partners) and sign in (regional sites such as [Shopify Partners Egypt](https://www.shopify.com/eg/partners) redirect to the same partner account).
2. Open **Apps** → select your app (or go to **App distribution** and choose the app from the list).
3. In the left sidebar, open **API access requests** (under app distribution / partner app settings).
4. Request **Protected customer data access** and complete the form.

**Step 1 — What you need access to**

- Select **Protected customer data**.
- Reason: **App functionality** (your integration needs order/customer fields to run automations when orders are created or updated).

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

Save the request and wait for Shopify approval. Then release/use the approved app version on your dev store, restart Habits, and run **Configure webhooks** again with order topics.

References: [Protected customer data](https://shopify.dev/docs/apps/launch/protected-customer-data), [HTTPS webhooks](https://shopify.dev/docs/apps/build/webhooks/subscribe/https), [`webhookSubscriptionCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/webhookSubscriptionCreate).

#### Run webhooks in this showcase

1. Expose port **13000** with ngrok (or similar) and set **`HABITS_SHOPIFY_WEBHOOK_URL`** in `.env` to your full URL including **`/webhook/v/shopify`**.
2. Start the server — workflow **`shopify-event-webhook`** registers **`POST /webhook/v/shopify`**. Cortex verifies **`X-Shopify-Hmac-Sha256`** using **`HABITS_SHOPIFY_CLIENT_SECRET`**.
3. In the UI, enter comma-separated topics (e.g. `PRODUCTS_CREATE,PRODUCTS_UPDATE` for testing without PCD; add `ORDERS_CREATE` after approval) and click **Configure webhooks**, or call:

```bash
curl -s -X POST http://localhost:13000/api/configure-webhooks \
  -H 'Content-Type: application/json' \
  -d '{"topics":"PRODUCTS_CREATE,PRODUCTS_UPDATE,ORDERS_CREATE"}'
```

4. Trigger events in Shopify admin (create/update product; create order after order topics are subscribed). Watch Cortex logs for **`[Shopify webhook]`** from `@ha-bits/bit-logger`.

List registered listeners: `GET http://localhost:13000/webhook/list`

### HTTP (OpenAPI, port 13000)

```bash
curl -s -X POST http://localhost:13000/api/get-shop -H 'Content-Type: application/json' -d '{}'

curl -s -X POST http://localhost:13000/api/create-product \
  -H 'Content-Type: application/json' \
  -d '{"title":"My Habits test product"}'

curl -s -X POST http://localhost:13000/api/list-products \
  -H 'Content-Type: application/json' \
  -d '{"first":10}'

curl -s -X POST http://localhost:13000/api/get-product-by-id \
  -H 'Content-Type: application/json' \
  -d '{"id":"gid://shopify/Product/YOUR_NUMERIC_ID"}'
```

---

## Troubleshooting

| Symptom | What to check |
| ------- | ---------------- |
| `shop_not_permitted` | App and store in the same Dev Dashboard org; store created from **Dev stores** |
| `Access denied for products field` | Add **`read_products`** on app version, release, approve on store, restart server |
| `productCreate` / write errors | Add **`write_products`**, release, approve, restart |
| Token / scope stale after changes | Restart server; confirm `scope` in token response includes needed scopes |
| `protected customer data` on `webhookSubscriptionCreate` | Complete **Protected customer data access** in Partner Dashboard (order topics only); product topics work without it |
| Webhook configure fails “HTTPS” | Set `HABITS_SHOPIFY_WEBHOOK_URL` to `https://…/webhook/v/shopify`; restart after `.env` changes |
