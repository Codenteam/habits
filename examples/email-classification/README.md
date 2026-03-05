# Email Classification Workflow

> **Note:** This example is API-only and does not include a frontend.

Classifies incoming emails by importance using AI and routes them to different channels:
- **Important** → Telegram (instant)
- **Semi-important** → SMTP (backup email)
- **Not important** → WhatsApp

For testing you can use 

## Setup

### 1. Environment Variables

Create `.env` in project root:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# IMAP (receive)
IMAP_HOST=imap.gmail.com
IMAP_USER=you@gmail.com
IMAP_PASSWORD=your-app-password

# SMTP (send)
SMTP_HOST=smtp.gmail.com
SMTP_USER=you@gmail.com
SMTP_PASSWORD=your-app-password
BACKUP_EMAIL=backup@example.com

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=-100...

# WhatsApp
WHATSAPP_ACCESS_TOKEN=EAAG...
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_PHONE=+1234567890
```

### 2. Get API Keys

| Provider | How to Get |
|----------|-----------|
| **OpenAI** | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| **Gmail App Password** | Google Account → Security → 2FA → App passwords |
| **Telegram Bot** | Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy token |
| **Telegram Chat ID** | Add [@userinfobot](https://t.me/userinfobot) to your chat → sends ID |
| **WhatsApp** | [developers.facebook.com](https://developers.facebook.com) → Create App → WhatsApp → Get Access Token |

## Run

```bash
# Local source (bits from workspace)
npx habits cortex --config examples/email-classification/stack.yaml

# NPM source (bits from private registry)
export HABITS_NPM_REGISTRY_URL=http://localhost:4873
npx habits cortex --config examples/email-classification/stack-npm.yaml
```

## Files

- `habit.yaml` - Workflow using local bits
- `habit-npm.yaml` - Workflow using npm registry bits
- `habit-greenmail.yaml` - Workflow using local Greenmail for testing
- `stack.yaml` / `stack-npm.yaml` / `stack-greenmail.yaml` - Server configs
- `results.txt` / `results.json` - Last test execution results

## Testing with Greenmail (Local Docker)

Start Docker services (from project root):
```bash
cd docker && docker compose up -d
```

Run the Greenmail test workflow:
```bash
npx habits cortex --config examples/email-classification/stack-greenmail.yaml
```

Execute via API:
```bash
curl -X POST http://localhost:13000/api/email-classification-test
```
