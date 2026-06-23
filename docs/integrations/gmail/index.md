---
title: "Gmail (IMAP/SMTP)"
description: "Connect Gmail for reading and sending email using App Passwords"
---

# Gmail (IMAP/SMTP)

Use `@ha-bits/bit-email` to poll inboxes via IMAP and send messages via SMTP. Gmail requires an **App Password** instead of your regular account password when using third-party apps.

**Related bit:** [`@ha-bits/bit-email`](/bits/bit-email)

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `HABITS_GMAIL_IMAP_HOST` | IMAP server hostname | `imap.gmail.com` |
| `HABITS_GMAIL_IMAP_PORT` | IMAP port | `993` |
| `HABITS_GMAIL_IMAP_USER` | Gmail address to read from | `you@gmail.com` |
| `HABITS_GMAIL_IMAP_APP_PASSWORD` | 16-character App Password | `abcdefghijklmnop` |
| `HABITS_IMAP_HOST` | Generic IMAP host (alternate naming) | `imap.gmail.com` |
| `HABITS_IMAP_PORT` | Generic IMAP port | `993` |
| `HABITS_IMAP_USER` | Generic IMAP user | `you@gmail.com` |
| `HABITS_IMAP_PASSWORD` | Generic IMAP password | App Password |
| `HABITS_SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `HABITS_SMTP_PORT` | SMTP port (TLS) | `587` |
| `HABITS_SMTP_USER` | SMTP username | `you@gmail.com` |
| `HABITS_SMTP_PASSWORD` | SMTP App Password | App Password |
| `HABITS_SMTP_FROM` | Optional From header | `you@gmail.com` |

## Prerequisites

The Gmail account must have **2-Step Verification** enabled.

Enable it at [Google Account Security](https://myaccount.google.com/security) → **2-Step Verification**.

## Generate an App Password

1. Go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (you must be signed in to the Gmail account).
2. In the **App name** field, enter a label like `Habits IMAP` or `Habits SMTP`.
3. Click **Create**.
4. Google displays a **16-character password** (shown as `xxxx xxxx xxxx xxxx`). Copy it — it will not be shown again.
5. Paste it **without spaces** into your `.env` file.

### Multiple Gmail Accounts

Some workflows use separate Gmail accounts for IMAP (reading) and SMTP (sending to different team inboxes). Generate one App Password per account:

| Variable | Account purpose |
|----------|-----------------|
| `HABITS_GMAIL_IMAP_APP_PASSWORD` | Inbox you read emails from |
| `HABITS_SMTP_SUPPORT_PASSWORD` | Support team Gmail |
| `HABITS_SMTP_SALES_PASSWORD` | Sales team Gmail |
| `HABITS_SMTP_BILLING_PASSWORD` | Billing team Gmail |
| `HABITS_SMTP_FEEDBACK_PASSWORD` | Feedback inbox |
| `HABITS_SMTP_SPAM_PASSWORD` | Spam/abuse inbox |
| `HABITS_SMTP_URGENT_PASSWORD` | Urgent/critical inbox |

## Example `.env`

```env
HABITS_GMAIL_IMAP_HOST=imap.gmail.com
HABITS_GMAIL_IMAP_PORT=993
HABITS_GMAIL_IMAP_USER=your-email@gmail.com
HABITS_GMAIL_IMAP_APP_PASSWORD=your-16-char-app-password

HABITS_SMTP_HOST=smtp.gmail.com
HABITS_SMTP_PORT=587
HABITS_SMTP_USER=your-email@gmail.com
HABITS_SMTP_PASSWORD=your-16-char-app-password
```

## Local Testing with GreenMail

For development without real Gmail credentials:

```env
SMTP_HOST=localhost
SMTP_PORT=3025
IMAP_HOST=localhost
IMAP_PORT=3143
EMAIL_USER=e2e@localhost
EMAIL_PASSWORD=e2e
```

Start Docker services from the project root: `cd docker && docker compose up -d`

## Used in Showcases

- [Email Digest Summarizer](/showcase/email-digest-summarizer)
- [Emails Categorization](/showcase/emails-categorization)
- [Email Ticket Routing](/showcase/email-ticket-routing)
- [Email Send & Receive Demo](/showcase/email-demo)
- [Email Classification](/showcase/email-classification)
- [Invoices Processing](/showcase/invoices-processing)
- [Smart Contact Form](https://github.com/codenteam/habits/tree/main/showcase/smart-contact-form) (SMTP notifications)
