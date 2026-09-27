---
title: "Shopify"
description: "Connect your Shopify store for orders, products, and webhooks with @ha-bits/bit-shopify"
---

# Shopify

Use `@ha-bits/bit-shopify` to read shop, product, and order data from your store and to run workflows when Shopify sends event notifications (webhooks).

Authentication uses a **Shopify app from the Dev Dashboard** installed on a **development store in the same organization**. You do not need a browser login redirect for this setup.

**Related bit:** `@ha-bits/bit-shopify`

## What you need

- A [Shopify](https://www.shopify.com/) account
- A **development store** created from the [Dev Dashboard](https://dev.shopify.com/dashboard/)
- A **Shopify app** in that dashboard
- Your app **Client ID** and **Client secret**
- Your **shop name** (the store subdomain only — not `.myshopify.com`)

## Environment variables

Add these to your Habits `.env` file:

| Variable | What it is | Where to get it |
|----------|------------|-----------------|
| `HABITS_SHOPIFY_SHOP` | Store subdomain | After creating the dev store, open the store in admin. The URL looks like `https://admin.shopify.com/store/your-store-name` — use `your-store-name` only. |
| `HABITS_SHOPIFY_CLIENT_ID` | App Client ID | Dev Dashboard → **Apps** → your app → **Settings** → **Client ID** |
| `HABITS_SHOPIFY_CLIENT_SECRET` | App Client secret | Same **Settings** page → **Client secret** |
| `HABITS_SHOPIFY_WEBHOOK_URL` | Public HTTPS address for Shopify to call | Your live or tunnel URL with path `/webhook/v/shopify` (see [Webhooks](#webhooks)) |

Example:

```env
HABITS_SHOPIFY_SHOP=your-dev-store
HABITS_SHOPIFY_CLIENT_ID=your-client-id
HABITS_SHOPIFY_CLIENT_SECRET=your-client-secret
HABITS_SHOPIFY_WEBHOOK_URL=https://your-subdomain.ngrok-free.app/webhook/v/shopify
```

In habit workflows, point the Shopify bit at the same values (for example `{{habits.env.HABITS_SHOPIFY_SHOP}}`, `{{habits.env.HABITS_SHOPIFY_CLIENT_ID}}`, and `{{habits.env.HABITS_SHOPIFY_CLIENT_SECRET}}`).

Never commit real secrets to git.

## Setup

### 1. Create a Shopify account

Sign up or sign in at [Shopify](https://www.shopify.com/).

### 2. Open the Dev Dashboard

Go to the [Shopify Dev Dashboard](https://dev.shopify.com/dashboard/) — this is where you create dev stores and apps.

### 3. Create a development store

1. **Dev stores** → **Create store**.
2. Choose **Development store** and the **Basic** plan.
3. Optionally turn on **Generate test data**.
4. Note your **shop name** from the admin URL (`https://admin.shopify.com/store/<shop-name>`).

[Create dev stores (Shopify help)](https://shopify.dev/docs/apps/build/dev-dashboard/development-stores)

### 4. Create the app

1. **Apps** → **Create app** (name it anything you like, e.g. `Habits`).
2. Open the app and go to **Versions** (or create your first version).

[Create apps in Dev Dashboard](https://shopify.dev/docs/apps/build/dev-dashboard/create-apps-using-dev-dashboard)

### 5. Configure and release an app version

On the new version:

**App URL** — Shopify may require a URL. For local testing you can use your tunnel address (see webhooks) or another HTTPS placeholder you control.

**Access scopes** — choose scopes on the **app version** to match what your workflows need:

| Scope | Use when you want to… |
|-------|------------------------|
| `read_orders` | Load order details or subscribe to **new order** events |
| `write_orders` | Change orders from Habits (optional for many flows) |
| `read_customers` | Show customer name and contact details on orders |
| `read_products` | List or read products |
| `write_products` | Create or update products from Habits |

**New order webhooks** (`ORDERS_CREATE` / order created) also need **Protected customer data** approval in the Partner program (see below). Scopes alone are not enough for those events.

Click **Release** on the version.

[Manage access scopes](https://shopify.dev/docs/apps/build/authentication-authorization/manage-access-scopes)

### 6. Copy Client ID and Client secret

Dev Dashboard → **Apps** → your app → **Settings** → copy **Client ID** and **Client secret** into `.env` as `HABITS_SHOPIFY_CLIENT_ID` and `HABITS_SHOPIFY_CLIENT_SECRET`.

### 7. Install the app on your development store

1. Dev Dashboard → **Apps** → your app → **Install app**.
2. Select your development store and finish **Install**.

The app must be installed before Habits can access that store.

Open `https://admin.shopify.com/store/<your-shop-name>` and confirm your app appears under **Apps** in the left sidebar.

[Install your app](https://shopify.dev/docs/apps/build/dev-dashboard/create-apps-using-dev-dashboard#step-3-install-your-app)

### 8. If you change scopes later

1. Dev Dashboard → your app → **Versions** → new version with updated scopes → **Release**.
2. In the store admin: **Settings** → **Apps and sales channels** (or **Apps** in the sidebar) → your app → **Update** and approve the new access.
3. Restart your Habits server.

### Protected customer data (order webhooks)

If you subscribe to **order created** or similar events that include buyer information:

1. Sign in to the [Shopify Partner program](https://www.shopify.com/partners).
2. **Apps** → your app → **API access requests**.
3. Request **Protected customer data access** and complete the form.

**What you need access to**

- Select **Protected customer data**.
- Reason: **App functionality** (for example syncing or processing new orders).

**Protected customer fields**

- Enable **Name**, **Email**, **Phone**, and **Address** with reason **App functionality** for each.

**Data protection questions**

Answer honestly for how you run Habits (minimum data, privacy policy, encryption in transit, retention, and so on).

After approval, use the released app version on your store and register order webhooks again.

[Protected customer data](https://shopify.dev/docs/apps/launch/protected-customer-data)

## Webhooks

Webhooks let Shopify notify Habits when something happens in your store (for example a new order). Shopify only delivers webhooks to a **public HTTPS** address — a `localhost` URL will not work.

### 1. Choose your callback URL

Set `HABITS_SHOPIFY_WEBHOOK_URL` to the full HTTPS URL Habits should receive, including the path:

```text
https://<your-public-host>/webhook/v/shopify
```

When you develop on your own computer, use a tunnel service (such as [ngrok](https://ngrok.com/)) pointed at the port where Habits runs, then put that HTTPS host in `HABITS_SHOPIFY_WEBHOOK_URL`. Update the URL if your tunnel address changes.

### 2. Register topics in Shopify

Use the bit action **Create Webhook Subscription** in a workflow (or your project’s webhook setup step). Pass:

- **Topic** — for example `ORDERS_CREATE` for new orders, or `PRODUCTS_CREATE` for new products (one topic per registration).
- **Callback URL** — the same value as `HABITS_SHOPIFY_WEBHOOK_URL`.

Your app version must include the scopes that match the topic (orders need order scopes, products need product scopes).

### 3. Run workflows on incoming events

Use the **Shopify Event** webhook trigger in a habit. It runs when Shopify posts to `/webhook/v/shopify`. Habits checks that the request really came from Shopify using your **Client secret** (`HABITS_SHOPIFY_CLIENT_SECRET`).

You can optionally filter by event type (for example only `orders/create`).

[HTTPS webhooks (Shopify)](https://shopify.dev/docs/apps/build/webhooks/subscribe/https)

## Verify the connection (optional)

After install, webhooks, and Habits are running:

### Create a product

1. Open `https://admin.shopify.com/store/<shop-name>`.
2. **Products** → **Add product**.
3. Set name and price.
4. Under **Inventory**, add stock (for example **100**) for your locations.
5. **Save**.

### Create a paid order

1. **Orders** → **Create order**.
2. **Add product** and select the product you created.
3. Set quantity.
4. **Collect payment** → **Mark as paid**.
5. **Create order**.

If order webhooks are set up, Shopify sends the order to Habits and your workflow can process it.

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| Cannot access the store | App installed on that dev store; shop name in `.env` matches the subdomain |
| Webhook never arrives | `HABITS_SHOPIFY_WEBHOOK_URL` is HTTPS and reachable; tunnel is running; subscription registered for the right topic |
| Webhook rejected | `HABITS_SHOPIFY_CLIENT_SECRET` matches Dev Dashboard; restart Habits after `.env` changes |
| Order webhook registration blocked | Complete **Protected customer data** approval for the app |
| Stale permissions after scope change | New app version released; store approved **Update** on the app; restart Habits |

## Official documentation

- [Shopify Dev Dashboard](https://dev.shopify.com/dashboard/)
- [Client credentials grant](https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant)
- [Shopify apps documentation](https://shopify.dev/docs/apps)
