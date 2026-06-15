# Sumsub + OpenAI Demo

End-to-end KYC demo with a **3-step YAML UI**, **SQLite persistence**, and **Sumsub webhooks**:

| Step | Tab | Workflows / bit actions |
|------|-----|-------------------------|
| 1 | **Start** | `start-kyc` → `createApplicant` + DB insert |
| 2 | **Documents** | `submit-kyc-documents` → uploads + review request + DB update |
| 3 | **Results** | `refresh-kyc-status` → status + OpenAI + DB; `get-kyc-customer` |
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

3. Configure `.env` in this folder (see `.env.example`):

   - `HABITS_SUMSUB_APP_TOKEN` / `HABITS_SUMSUB_SECRET_KEY`
   - `HABITS_SUMSUB_WEBHOOK_SECRET` (from Sumsub Dashboard → Webhook manager)
   - `HABITS_KYC_DATABASE` (default: `showcase/sumsub-openai-demo/sumsub-kyc.db`)
   - `OPENAI_API_KEY`

4. Your Sumsub Sandbox level must exist (default: **`id-and-liveness`**).

## Run

```bash
pnpm nx dev @ha-bits/cortex --config showcase/sumsub-openai-demo/stack.yaml
```

Open **http://localhost:13042** for the UI.

### Flow

1. **Start** — enter name/email → creates Sumsub applicant and saves a `kyc_customers` row in SQLite.
2. **Documents** — upload ID card (front) + selfie → Sumsub review requested; submission status saved to DB.
3. **Results** — refresh status or load from DB → see **Allow next steps** / **Block next steps** for banking onboarding.

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
  -d '{"email":"jane@example.com","firstName":"Jane","lastName":"Doe","country":"GBR"}'

# Load persisted customer
curl -X POST http://localhost:13042/api/get-kyc-customer -H "Content-Type: application/json" \
  -d '{"applicantId":"..."}'

# Step 3 (after documents)
curl -X POST http://localhost:13042/api/refresh-kyc-status -H "Content-Type: application/json" \
  -d '{"applicantId":"...","firstName":"Jane","lastName":"Doe","email":"jane@example.com"}'
```

The one-shot workflow `kyc-status-summary` (create + status + OpenAI in one call) remains available at `/api/kyc-status-summary`.
