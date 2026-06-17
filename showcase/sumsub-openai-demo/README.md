# Sumsub + Local AI Demo

End-to-end KYC demo with a **YAML UI**, **SQLite persistence**, **Sumsub webhooks**, and **local AI (Qwen3.5)**:

| Step | Tab | Workflows / bit actions |
|------|-----|-------------------------|
| 1 | **Start** | `start-kyc` → `createApplicant` + DB insert (with your **Person ID**) |
| 2 | **Documents** | `submit-kyc-documents` → uploads + review request + DB update |
| **People** | **People table** | `list-people` · row actions: `fetch-sumsub-results`, `send-results-to-department` |
| 3 | **Results** | `refresh-kyc-status` → status + local AI + DB; `get-kyc-customer` |
| — | **Webhook** | `sumsub-kyc-webhook` → `/webhook/v/sumsub` persists review result |

## Prerequisites

1. Link enterprise bits and build `bit-sumsub`:

   ```bash
   ./packages/manage/ee/scripts/link-ee-bits.sh
   cd nodes/bits/ee/@ha-bits/bit-sumsub && npm install && npm run build
   ```

2. If Cortex cached an older npm copy of `bit-sumsub`, remove it so the local EE bit is used:

   ```bash
   rm -rf /tmp/habits-nodes/node_modules/@ha-bits/bit-sumsub
   ```

3. Install the local AI runtime and model:

   ```bash
   cd local-ai-candle/local-ai-node && npm install && npm run build:metal
   ```

   Set `LOCAL_AI_NODE_PATH` in `.env` to that directory. The vendored candle fork must be on branch `feat/quantized-qwen35` from [latentcollapse/candle](https://github.com/latentcollapse/candle) (already under `local-ai-candle/candle`). Install the Qwen 3.5 model:

   ```bash
   mkdir -p ~/.habits/models/text-gen/qwen3.5-0.8b
   curl -L -o ~/.habits/models/text-gen/qwen3.5-0.8b/model.gguf \
     "https://huggingface.co/unsloth/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q4_K_M.gguf"
   curl -L -o ~/.habits/models/text-gen/qwen3.5-0.8b/tokenizer.json \
     "https://huggingface.co/Qwen/Qwen3.5-0.8B/resolve/main/tokenizer.json"
   ```

4. Configure `.env` in this folder (see `.env.example`):

   - `HABITS_SUMSUB_APP_TOKEN` / `HABITS_SUMSUB_SECRET_KEY`
   - `HABITS_SUMSUB_WEBHOOK_SECRET` (from Sumsub Dashboard → Webhook manager)
   - `HABITS_KYC_DATABASE` (default: `showcase/sumsub-openai-demo/sumsub-kyc.db`)
   - `HABITS_LOCAL_AI_MODEL=qwen3.5-0.8b`
   - `LOCAL_AI_NODE_PATH` — path to built `local-ai-candle/local-ai-node`
   - `EMAIL_USER` / `EMAIL_PASSWORD` (Gmail app password for department emails)

5. Your Sumsub Sandbox level must exist (default: **`id-and-liveness`**).

## Run

```bash
pnpm nx dev @ha-bits/cortex --config showcase/sumsub-openai-demo/stack.yaml
```

Open **http://localhost:13042** for the UI.

### Flow

1. **Start** — enter **Person ID** (any unique ref), name, email → creates Sumsub applicant and saves a `kyc_customers` row in SQLite.
2. **Documents** — upload ID card (front) + selfie → Sumsub review requested; submission status saved to DB.
3. **People** — table of all people with **Fetch Sumsub** (uses Sumsub applicant ID), **Send to dept** (local AI drafts email with 3-day deadline, sends via `bit-email`), and **Chat** (opens case chat).
4. **Case chat** — multi-turn Qwen3.5 conversation scoped to a person; sidebar shows Person ID, Sumsub applicant ID, and the uploaded ID image; every API call resends those identifiers plus the image reference.
5. **Results** — refresh status or load from DB → see **Allow next steps** / **Block next steps** for banking onboarding.

### Sumsub webhook (review completed)

Sumsub cannot call `localhost` directly. Expose Cortex with a tunnel (ngrok, Cloudflare Tunnel, etc.), then register:

```
https://<your-public-host>/webhook/v/sumsub
```

In **Sumsub Dashboard → Dev space → Webhook manager**:

- Add the URL above
- Enable types: `applicantReviewed`, `applicantPending` (optional: `applicantCreated`)
- Copy the **Secret key** into `HABITS_SUMSUB_WEBHOOK_SECRET`

When review completes (`applicantReviewed` with `reviewAnswer: GREEN|RED`), the webhook workflow updates `kyc_customers`:

| Field | Meaning |
|-------|---------|
| `allowNextSteps` | `true` when review is completed and GREEN |
| `blockNextSteps` | `true` when review is completed and RED |

### API (optional)

```bash
# Step 1
curl -X POST http://localhost:13042/api/start-kyc -H "Content-Type: application/json" \
  -d '{"personId":"EMP-1001","email":"jane@example.com","firstName":"Jane","lastName":"Doe","country":"GBR"}'

# List all people
curl -X POST http://localhost:13042/api/list-people -H "Content-Type: application/json" -d '{}'

# Fetch Sumsub results for a person
curl -X POST http://localhost:13042/api/fetch-sumsub-results -H "Content-Type: application/json" \
  -d '{"personId":"EMP-1001"}'

# Send department email (local AI + bit-email)
curl -X POST http://localhost:13042/api/send-results-to-department -H "Content-Type: application/json" \
  -d '{"personId":"EMP-1001"}'

# Step 3 (after documents)
curl -X POST http://localhost:13042/api/refresh-kyc-status -H "Content-Type: application/json" \
  -d '{"applicantId":"...","firstName":"Jane","lastName":"Doe","email":"jane@example.com"}'
```

The one-shot workflow `kyc-status-summary` (create + status + local AI in one call) remains available at `/api/kyc-status-summary`.
