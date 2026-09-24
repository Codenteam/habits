---
title: "QuickBooks Online"
description: "Record payments in QuickBooks Online with OAuth 2.0 and the QBO Accounting API"
---

# QuickBooks Online

Use `@ha-bits/bit-quickbooks` to record received payments in QuickBooks Online via OAuth 2.0 and the [QBO Accounting API](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/payment).

**Related bit:** [`@ha-bits/bit-quickbooks`]

Sandbox API base URL: `https://sandbox-quickbooks.api.intuit.com` ([docs](https://developer.intuit.com/app/developer/qbo/docs/get-started/create-a-request))

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HABITS_QUICKBOOKS_CLIENT_ID` | Intuit app Client ID (Development / Sandbox keys) |
| `HABITS_QUICKBOOKS_CLIENT_SECRET` | Intuit app Client Secret |
| `HABITS_QUICKBOOKS_ENV` | `sandbox` or `production` |
| `HABITS_QUICKBOOKS_REALM_ID` | QBO company id (`realmId`) |
| `HABITS_QUICKBOOKS_CUSTOMER_ID` | QBO CustomerRef id for payments |

## Step 1: Create an Intuit Developer account

1. Go to [https://developer.intuit.com](https://developer.intuit.com)
2. Click **Sign up** (or **Sign in** if you already have an Intuit account)
3. Complete your developer profile (name, email, country, etc.)
4. Verify your email if prompted

## Step 2: Create a workspace

After sign-in you land on the developer **Dashboard**.

1. If you have no workspace yet, click **Create a workspace** (or **+ New workspace**)
2. Enter a workspace name (e.g. `Habits Dev`)
3. Confirm — the workspace is where your apps and sandbox companies live

> Already have a workspace? Select it from the workspace switcher (top-left) and continue.

## Step 3: Create an app inside the workspace

1. Open your workspace
2. Go to **Apps** (or **My apps**) → **Create an app**
3. Choose a name (e.g. `Stripe Payment Reconciliation`)
4. Select **QuickBooks Online and Payments** (or **QuickBooks Online Accounting**)
5. Enable the **Accounting** scope — the bit uses `com.intuit.quickbooks.accounting`
6. Finish creating the app

## Step 4: Get Client ID and Client Secret

1. Open your app in the developer portal
2. Go to **Keys & credentials** (or **Development** → **Keys & OAuth**)
3. Stay on the **Development** / **Sandbox** keys tab (not Production)
4. Copy:
   - **Client ID**
   - **Client Secret** (click **Show** / **Reveal** if hidden)
5. Add them to `.env`:

```env
HABITS_QUICKBOOKS_CLIENT_ID=your_client_id_here
HABITS_QUICKBOOKS_CLIENT_SECRET=your_client_secret_here
HABITS_QUICKBOOKS_ENV=sandbox
```

Docs: [Get Client ID and Client Secret](https://developer.intuit.com/app/developer/qbo/docs/get-started/get-client-id-and-client-secret)

## Step 5: Set the redirect URI (app settings)

Habits needs a fixed OAuth callback URL for `@ha-bits/bit-quickbooks`.

1. In your app, open **Settings** (or stay on **Keys & OAuth**)
2. Find **Redirect URIs** (sometimes under **OAuth 2.0**)
3. Click **Add URI** and enter exactly:

```
http://localhost:13000/oauth/bit-quickbooks/callback
```

4. Save

Use your real server host in production (e.g. `https://your-domain.com/oauth/bit-quickbooks/callback`). The URI must match character-for-character.

Docs: [Set up OAuth 2.0](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0)

## Step 6: US sandbox company (created by default)

When you create a QuickBooks app, Intuit usually provisions a **US** sandbox company automatically.

1. In the developer portal, open **Sandbox companies** (or **Test credentials** / **Sandboxes**) from the top-right dropdown in **My Hub**
2. You should see a US QuickBooks Online sandbox company (e.g. `Sandbox Company_US_1`)
3. If none exists, click **Add sandbox** → choose **QuickBooks Online** → **United States**

Open the sandbox books: [https://app.sandbox.qbo.intuit.com](https://app.sandbox.qbo.intuit.com)

## Step 7: Get the Company ID (`realmId`)

Use this value as `HABITS_QUICKBOOKS_REALM_ID`.

**Option A — QuickBooks sandbox settings (recommended)**

1. Sign in to [https://app.sandbox.qbo.intuit.com](https://app.sandbox.qbo.intuit.com)
2. Click the **Gear** icon → **Settings**
3. Open the **Company** tab (or **Additional info** / **Billing & subscription** depending on UI version)
4. Find **Company ID** — a long numeric value 
5. Copy it into `.env`:

```env
HABITS_QUICKBOOKS_REALM_ID=
```

## Step 8: Customer ID (`HABITS_QUICKBOOKS_CUSTOMER_ID`)

Every QBO Payment must reference a customer (`CustomerRef`).

**Try `1` first** — a fresh US sandbox often has a sample customer with id `1`.

```env
HABITS_QUICKBOOKS_CUSTOMER_ID=1
```

**If payment creation fails** (customer not found):

1. In QBO sandbox, go to **Sales → Customers**
2. Click **New customer**, create one (e.g. `Stripe Payments`)
3. Open that customer — the URL may show `nameId=58` (use `58` as the id), or use the [API Explorer](https://developer.intuit.com/app/developer/qbo/docs/get-started/get-client-id-and-client-secret) query: `SELECT * FROM Customer`
4. Set the numeric **Id** in `.env`:

```env
HABITS_QUICKBOOKS_CUSTOMER_ID=58
```

## Step 9: Authorize OAuth (first run)

1. Fill QuickBooks variables in `.env` (client id, secret, realm id, customer id)
2. Start your Habits stack (e.g. [Stripe Payment Reconciliation](/showcase/stripe-payment-reconciliation))
3. On the first payment, `createPayment` triggers Intuit OAuth
4. Sign in, select your **sandbox company**, and approve access
5. Tokens are stored for later runs — you normally authorize once per sandbox company

## Step 10: View recorded payments in QuickBooks

After a successful workflow run, open your sandbox company:

1. Go to **Sales → Sales transactions** (or **Sales → All sales**)
2. Filter or look for **Receive payment** / **Payment** rows
3. Open a row to see amount, customer, date, and the **Private note** (includes external payment id and customer details)

Payments created without linking to an invoice may show as **Unapplied** — that is expected. The money is recorded; it is not yet applied to a specific invoice.

## Habit credentials example

```yaml
credentials:
  quickbooks:
    clientId: "{{habits.env.HABITS_QUICKBOOKS_CLIENT_ID}}"
    clientSecret: "{{habits.env.HABITS_QUICKBOOKS_CLIENT_SECRET}}"
```

Or pass OAuth tokens under `auth` if obtained externally.

<IntegrationShowcases integration="quickbooks" />

## Related Integrations

- [Gmail (IMAP/SMTP)](/integrations/gmail/) — payment notification emails
- [OpenAI](/integrations/openai/) — AI-generated email copy
