# Stripe Payment Reconciliation

Polls Stripe for new successful payments every 30 seconds, logs each payment, sends an AI-generated notification email via Gmail SMTP, and records the payment in QuickBooks Online.

**Workflows**

| ID | Purpose |
|----|---------|
| `poll-stripe-payments` | Stripe `paymentSucceededPolling` trigger → logger → `bit-loop` |
| `process-payment` | OpenAI email copy → `bit-email` (Gmail SMTP) → `bit-quickbooks` createPayment |

---

## Part 1 — Create a Stripe account

### 1.1 Register

1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Enter your **email**, **full name**, **country**, and **password**
3. Verify your email if Stripe asks you to
4. Complete the initial account setup (business type, etc.). For testing you can use personal / individual details — you are not charging real money until you switch to live mode

### 1.2 Open the Sandbox (test mode) dashboard

After sign-in you land in the Stripe Dashboard.

1. Look for the **“Test mode”** toggle (usually top-right, or an orange banner: *“You're testing in a sandbox”*)
2. Turn **Test mode ON** before creating keys or payment links
3. In test mode:
   - No real money moves
   - API keys start with `sk_test_` / `pk_test_`
   - Payments appear only in the test dashboard

Direct link (when logged in): [https://dashboard.stripe.com/test/dashboard](https://dashboard.stripe.com/test/dashboard)

---

## Part 2 — Get your Secret Key

The showcase uses `paymentSucceededPolling`, which calls the Stripe API with your **secret key**.

1. In **Test mode**, open **Developers → API keys**  from the left sidebar or direct link: 
   [https://dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
2. Under **Standard keys**, find **Secret key**
3. Click **Reveal test key** and copy the value (`sk_test_...`)
4. Put it in your `.env`:

```env
HABITS_STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
```

**Publishable key** (`pk_test_...`) is not needed for this showcase — only the secret key.

---

## Part 3 — Create a Payment Link and pay

### 3.1 Create a Payment Link (add product inline)

1. Go to **Payment Links** → **+ New**  
   [https://dashboard.stripe.com/test/payment-links](https://dashboard.stripe.com/test/payment-links)
2. **First:** if you see **Enable Managed Payments**, turn it **OFF**.  
   Do this before adding a product — otherwise Stripe may block creation with *“A product category is required when Managed Payments is enabled.”*
3. Click **Add new product** (or **+ Add** next to products) and fill in:
   - **Name** (e.g. `Habits test product`)
   - **Price** (e.g. US$10.00, one-time)
4. Click **Create link**
5. Copy the link URL (e.g. `https://buy.stripe.com/test_...`)

> Already have a product? Select it from the list instead of adding a new one — still keep **Enable Managed Payments** off for quick testing.

### 3.2 Pay with a test card

1. Open the Payment Link in a browser
2. Use Stripe test card details:

| Field | Value |
|-------|--------|
| Card number | `4242 4242 4242 4242` |
| Expiry | Any future date (e.g. `12/34`) |
| CVC | Any 3 digits (e.g. `123`) |
| ZIP | Any valid format |

3. Enter a **name** and **email** at checkout (these show up in payment customer details after the `bit-stripe` fix)
4. Complete payment — status should be **Succeeded**

Repeat once if you want to test multiple payments in one poll cycle.

More test cards: [https://docs.stripe.com/testing#cards](https://docs.stripe.com/testing#cards)

---

## Part 4 — View payments for your Payment Link

### All payments (main view)

1. **Test mode ON**
2. Open **Payments** (or **Transactions**) in the left sidebar  
   [https://dashboard.stripe.com/test/payments](https://dashboard.stripe.com/test/payments)
3. You should see each successful charge with amount, status **Succeeded**, and customer email

Click a row for full details: Payment ID (`pi_...`), customer, receipt, etc.

### Payments for one Payment Link only

1. Go to **Payment Links**
2. Click your link
3. Open the **Payments** / **Conversions** section on that link’s page — lists payments made through that URL only

### Balance (sanity check)

**Balances** in test mode shows test funds (e.g. two × $10 → +$20 test balance, minus fees).

---

## Part 5 — QuickBooks Online setup (sandbox)

This showcase records each Stripe payment in QuickBooks using `@ha-bits/bit-quickbooks` and the [QBO Accounting API](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/payment). Sandbox API base URL: `https://sandbox-quickbooks.api.intuit.com` ([docs](https://developer.intuit.com/app/developer/qbo/docs/get-started/create-a-request)).

### 5.1 Create an Intuit Developer account

1. Go to [https://developer.intuit.com](https://developer.intuit.com)
2. Click **Sign up** (or **Sign in** if you already have an Intuit account)
3. Complete your developer profile (name, email, country, etc.)
4. Verify your email if prompted

### 5.2 Create a workspace

After sign-in you land on the developer **Dashboard**.

1. If you have no workspace yet, click **Create a workspace** (or **+ New workspace**)
2. Enter a workspace name (e.g. `Habits Dev`)
3. Confirm — the workspace is where your apps and sandbox companies live

> Already have a workspace? Select it from the workspace switcher (top-left) and continue to the next step.

### 5.3 Create an app inside the workspace

1. Open your workspace
2. Go to **Apps** (or **My apps**) → **Create an app**
3. Choose a name (e.g. `Stripe Payment Notifier`)
4. Select **QuickBooks Online and Payments** (or **QuickBooks Online Accounting**)
5. Enable the **Accounting** scope — the bit uses `com.intuit.quickbooks.accounting`
6. Finish creating the app

### 5.4 Get Client ID and Client Secret

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

### 5.5 Set the redirect URI (app settings)

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

### 5.6 US sandbox company (created by default)

When you create a QuickBooks app, Intuit usually provisions a **US** sandbox company automatically.

1. In the developer portal, open **Sandbox companies** (or **Test credentials** / **Sandboxes**) from top right dropdown in my hub
2. You should see a US QuickBooks Online sandbox company (e.g. `Sandbox Company_US_1`)
3. If none exists, click **Add sandbox** → choose **QuickBooks Online** → **United States**

Open the sandbox books: [https://app.sandbox.qbo.intuit.com](https://app.sandbox.qbo.intuit.com)

### 5.7 Get the Company ID (`realmId`)

The showcase uses this as `HABITS_QUICKBOOKS_REALM_ID`.

**Option A — QuickBooks sandbox settings (recommended)**

1. Sign in to [https://app.sandbox.qbo.intuit.com](https://app.sandbox.qbo.intuit.com)
2. Click the **Gear** icon → **settings**
3. Open the **Company** tab (or **Additional info** / **Billing & subscription** depending on UI version)
4. Find **Company ID** — a long numeric value 
5. Copy it into `.env`:

```env
HABITS_QUICKBOOKS_REALM_ID=
```

### 5.8 Customer ID (`HABITS_QUICKBOOKS_CUSTOMER_ID`)

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

### 5.9 Authorize OAuth (first run)

1. Fill QuickBooks variables in `.env` (client id, secret, realm id, customer id)
2. Start the showcase (see Part 6)
3. On the first Stripe payment, `createPayment` triggers Intuit OAuth
4. Sign in, select your **sandbox company**, and approve access
5. Tokens are stored for later runs — you normally authorize once per sandbox company

### 5.10 View recorded payments in QuickBooks

After a successful workflow run, open your sandbox company:

1. Go to **Sales → Sales transactions** (or **Sales → All sales**)
2. Filter or look for **Receive payment** / **Payment** rows
3. Open a row to see amount, customer, date, and the **Private note** (includes Stripe payment id and customer details)

Payments created without linking to an invoice may show as **Unapplied** — that is expected. The money is recorded; it is not yet applied to a specific invoice.

---

## Part 6 — Run this showcase

### 6.1 Environment variables

```bash
cd showcase/stripe-payment-reconciliation
cp .env.example .env
```

Fill in `.env`:

| Variable | Required for | Example |
|----------|----------------|---------|
| `HABITS_STRIPE_SECRET_KEY` | Stripe polling | `sk_test_...` |
| `HABITS_OPENAI_API_KEY` | Email copy | `sk-...` |
| `HABITS_SMTP_HOST` | Gmail | `smtp.gmail.com` |
| `HABITS_SMTP_PORT` | Gmail | `587` |
| `HABITS_SMTP_USER` | Gmail login | `you@gmail.com` |
| `HABITS_SMTP_PASSWORD` | Gmail [app password](https://myaccount.google.com/apppasswords) | 16-char app password |
| `HABITS_EMAIL_FROM` | From header | `Habits Payments <you@gmail.com>` |
| `HABITS_PAYMENT_NOTIFY_EMAIL` | Where alerts go | `finance@example.com` |
| `HABITS_QUICKBOOKS_CLIENT_ID` | Intuit OAuth | From app **Keys & credentials** |
| `HABITS_QUICKBOOKS_CLIENT_SECRET` | Intuit OAuth | From app **Keys & credentials** |
| `HABITS_QUICKBOOKS_ENV` | QuickBooks environment | `sandbox` |
| `HABITS_QUICKBOOKS_REALM_ID` | QBO company id | **Settings → Account and settings → Company ID** |
| `HABITS_QUICKBOOKS_CUSTOMER_ID` | QBO customer | `1` or id from **Sales → Customers** |

Complete QuickBooks setup in **Part 5** before starting the stack.

### 6.2 Start the stack

From the repo root:

```bash
pnpm habits dev showcase/stripe-payment-reconciliation/stack.yaml
```

1. Pay with a Stripe test Payment Link (Part 3)
2. Watch server logs for `STRIPE-PAYMENTS-POLL`
3. Check `HABITS_PAYMENT_NOTIFY_EMAIL` for the notification
4. Check **Sales → Sales transactions** in QBO sandbox for the recorded payment
