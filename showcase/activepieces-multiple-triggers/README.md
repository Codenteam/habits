# IMAP Trigger Test

## 1. Start GreenMail (local IMAP/SMTP server)

```bash
docker run -d --name greenmail -p 3025:3025 -p 3143:3143 greenmail/standalone:2.0.0
```

## 2. Send a test email

```bash
curl smtp://localhost:3025 \
  --mail-from sender@localhost \
  --mail-rcpt test@localhost \
  --upload-file - <<EOF
Subject: Test Email
From: sender@localhost
To: test@localhost

Hello from IMAP test!
EOF
```

## 3. Run Cortex

```bash
pnpm nx dev @ha-bits/cortex --config ./showcase/activepieces-imap-trigger/stack.yaml
```

The trigger hooks immediately and fetches emails from GreenMail.
