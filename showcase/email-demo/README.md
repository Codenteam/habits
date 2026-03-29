# Email Demo

This showcase demonstrates the `@ha-bits/bit-email` bit capabilities:

1. **IMAP Polling Trigger** - Monitors an inbox for new emails
2. **Forward Email Action** - Forwards received emails to another address via SMTP

## Setup

1. Copy `.env.example` to `.env`
2. Fill in your email credentials:
   - For Gmail: Use an [App Password](https://support.google.com/accounts/answer/185833)
   - For other providers: Use your regular credentials

```bash
cp .env.example .env
# Edit .env with your credentials
```

## Running

### Node.js (Cortex)

```bash
# From the habits workspace root
pnpm nx dev @ha-bits/cortex --config showcase/email-demo/stack.yaml
```

### Tauri Desktop

```bash
# Pack the habit first
pnpm nx pack habits --config showcase/email-demo/stack.yaml --format tauri

# Run the Tauri app
# The tauri app will use the tauri-plugin-email for IMAP/SMTP operations
```

## Testing

The workflow will:
1. Poll INBOX every minute (default) for unread emails
2. Forward the first unread email to the configured FORWARD_TO address

You can manually trigger the workflow via HTTP:

```bash
# Trigger polling
curl http://localhost:13000/api/workflows/email-forward-demo/run

# Check workflow status
curl http://localhost:13000/misc/workflows
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| EMAIL_HOST | Mail server hostname | imap.gmail.com |
| IMAP_PORT | IMAP port | 993 |
| SMTP_PORT | SMTP port | 587 |
| EMAIL_USER | Email address | your-email@gmail.com |
| EMAIL_PASSWORD | Email password/app password | xxxx-xxxx-xxxx-xxxx |
| FORWARD_TO | Recipient for forwarded emails | recipient@example.com |
