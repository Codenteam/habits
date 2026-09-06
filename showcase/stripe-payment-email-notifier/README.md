# Stripe Payment Email Notifier

Polls Stripe for new successful payments every 30 seconds, logs each payment, uses OpenAI to draft a notification email, and sends it via Gmail SMTP.

**Workflows**

| ID | Purpose |
|----|---------|
| `poll-stripe-payments` | Stripe `paymentSucceededPolling` trigger → logger → `bit-loop` |
| `send-payment-email` | OpenAI email copy → `bit-email` (Gmail SMTP) |

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

## Part 5 — Run this showcase

### 5.1 Environment variables

```bash
cd showcase/stripe-payment-email-notifier
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
