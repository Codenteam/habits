---
title: "Sumsub KYC"
description: "Run identity verification workflows with Sumsub"
---

# Sumsub KYC

Use `@ha-bits/bit-sumsub` (enterprise edition) for KYC applicant creation, document submission, and webhook-driven review status updates.

**Related bit:** `@ha-bits/bit-sumsub` (enterprise)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HABITS_SUMSUB_APP_TOKEN` | Sumsub app token |
| `HABITS_SUMSUB_SECRET_KEY` | Sumsub secret key |
| `HABITS_SUMSUB_WEBHOOK_SECRET` | Webhook secret from Sumsub Dashboard |
| `HABITS_KYC_DATABASE` | SQLite database path (default: `showcase/sumsub-openai-demo/sumsub-kyc.db`) |
| `HABITS_LOCAL_AI_MODEL` | Local AI model name (e.g. `qwen3.5-0.8b`) |
| `LOCAL_AI_NODE_PATH` | Path to built `local-ai-candle/local-ai-node` |
| `EMAIL_USER` | Gmail address for department emails |
| `EMAIL_PASSWORD` | Gmail App Password |

## Prerequisites

1. Link enterprise bits and build `bit-sumsub`:

   ```bash
   ./packages/manage/ee/scripts/link-ee-bits.sh
   cd nodes/bits/ee/@ha-bits/bit-sumsub && npm install && npm run build
   ```

2. If Cortex cached an older npm copy, remove it:

   ```bash
   rm -rf /tmp/habits-nodes/node_modules/@ha-bits/bit-sumsub
   ```

3. Install the local AI runtime (optional, for on-device summaries):

   ```bash
   cd local-ai-candle/local-ai-node && npm install && npm run build:metal
   ```

4. Your Sumsub Sandbox level must exist (default: **`id-and-liveness`**).

## Get Sumsub Credentials

1. Sign in to the [Sumsub Dashboard](https://cockpit.sumsub.com/).
2. Copy your **App Token** and **Secret Key** from the API credentials section.
3. Add them to `.env`:

```env
HABITS_SUMSUB_APP_TOKEN=your_app_token
HABITS_SUMSUB_SECRET_KEY=your_secret_key
```

## Configure Webhooks

Sumsub cannot call `localhost` directly. Expose Cortex with a tunnel (ngrok, Cloudflare Tunnel, etc.):

```
https://<your-public-host>/webhook/v/sumsub
```

In **Sumsub Dashboard → Dev space → Webhook manager**:

1. Add the URL above.
2. Enable types: `applicantReviewed`, `applicantPending` (optional: `applicantCreated`).
3. Copy the **Secret key** → `HABITS_SUMSUB_WEBHOOK_SECRET`.

When review completes (`applicantReviewed` with `reviewAnswer: GREEN|RED`), the webhook updates `kyc_customers`:

| Field | Meaning |
|-------|---------|
| `allowNextSteps` | `true` when review is completed and GREEN |
| `blockNextSteps` | `true` when review is completed and RED |

<IntegrationShowcases integration="sumsub" />

## Related Integrations

- [Gmail (IMAP/SMTP)](/integrations/gmail/) — department notification emails
- [OpenAI](/integrations/openai/) — optional cloud AI alternative to local model
