# Email Ticket Routing

Fetches support emails via IMAP, analyzes each with AI, and routes tickets to the right team inbox via SMTP.

---

## Gmail App Password Setup

Google requires an **App Password** instead of your regular account password when accessing Gmail via IMAP or SMTP. You need one App Password per Gmail account you use (the IMAP inbox you read from, and each SMTP inbox you send through).

### Prerequisites

- The Gmail account must have **2-Step Verification enabled**.  
  Enable it at: https://myaccount.google.com/security → *2-Step Verification*

### Steps

1. Go to **https://myaccount.google.com/apppasswords**  
   *(You must be signed in to the Gmail account you want to generate the password for.)*

2. In the **"App name"** field, enter a descriptive name (e.g. `Habits IMAP` or `Habits SMTP Support`).

3. Click **Create**.

4. Google will display a **16-character password** (shown as `xxxx xxxx xxxx xxxx`).  
   Copy it — it will not be shown again.

5. Paste it (without spaces) into the relevant variable in your `.env` file.

### Repeat for Each Account

You need a separate App Password for every Gmail account referenced in `.env`:

| Variable | Account |
|---|---|
| `HABITS_GMAIL_IMAP_APP_PASSWORD` | The inbox you read emails from |
| `HABITS_SMTP_SUPPORT_PASSWORD` | Support team Gmail address |
| `HABITS_SMTP_SALES_PASSWORD` | Sales team Gmail address |
| `HABITS_SMTP_BILLING_PASSWORD` | Billing team Gmail address |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `HABITS_GMAIL_IMAP_HOST` | IMAP host — `imap.gmail.com` |
| `HABITS_GMAIL_IMAP_PORT` | IMAP port — `993` |
| `HABITS_GMAIL_IMAP_USER` | Full Gmail address to read from |
| `HABITS_GMAIL_IMAP_APP_PASSWORD` | App Password for the IMAP account |
| `HABITS_OPENAI_API_KEY` | OpenAI API key for AI analysis |
| `HABITS_SMTP_HOST` | SMTP host — `smtp.gmail.com` |
| `HABITS_SMTP_PORT` | SMTP port — `587` (TLS) |
| `HABITS_SMTP_SUPPORT_USER` | Gmail address for support replies |
| `HABITS_SMTP_SUPPORT_PASSWORD` | App Password for support Gmail |
| `HABITS_SMTP_SALES_USER` | Gmail address for sales replies |
| `HABITS_SMTP_SALES_PASSWORD` | App Password for sales Gmail |
| `HABITS_SMTP_BILLING_USER` | Gmail address for billing replies |
| `HABITS_SMTP_BILLING_PASSWORD` | App Password for billing Gmail |

---
