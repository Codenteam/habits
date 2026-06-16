# @ha-bits/bit-sumsub

Sumsub identity verification (KYC/KYB) for Habits workflows. This is an **enterprise bit** — source of truth is `packages/manage/ee/bits/@ha-bits/bit-sumsub` in the manage repository.

## Quick start

### 1. Link EE bits into your habits checkout

From the **habits repo root**:

```bash
chmod +x packages/manage/ee/scripts/link-ee-bits.sh
./packages/manage/ee/scripts/link-ee-bits.sh
```

You should see `nodes/bits/ee/@ha-bits/bit-sumsub`.

### 2. Build the bit

```bash
cd nodes/bits/ee/@ha-bits/bit-sumsub
npm run build
```

### 3. Configure credentials

Set these environment variables (or pass them via habit `credentials.sumsub`):

| Variable | Description |
|----------|-------------|
| `HABITS_SUMSUB_APP_TOKEN` | Sumsub app token (`X-App-Token`) |
| `HABITS_SUMSUB_SECRET_KEY` | Secret key for HMAC request signing |
| `HABITS_SUMSUB_BASE_URL` | Optional. Default: `https://api.sumsub.com` |

---

## How to get Sumsub API credentials

### Step 1 — Create a Sumsub account

1. Sign up at [Sumsub](https://sumsub.com/).
2. Open the [Sumsub Dashboard](https://cockpit.sumsub.com/) (Cockpit).

### Step 2 — Choose Sandbox or Production

| Environment | When to use | API base URL |
|-------------|-------------|--------------|
| **Sandbox** | Development and testing | `https://api.sumsub.com` (with Sandbox-mode app token) |
| **Production** | Live customer verification | `https://api.sumsub.com` (with Production-mode app token) |

Sandbox and Production use separate **app token + secret key** pairs. Tokens created in Sandbox mode only work against sandbox applicants; production tokens only work against production applicants.

Enable Sandbox mode from the Dashboard (top bar / environment switcher) before generating sandbox credentials.

### Step 3 — Generate an app token and secret key

1. In the Dashboard, go to **Dev space** (or **Settings → Dev space**).
2. Open **App tokens**.
3. Click **Create app token**.
4. Copy and store both values immediately:
   - **App token** — sent as `X-App-Token` on every API request.
   - **Secret key** — used to sign requests with HMAC-SHA256.

> **Important:** Sumsub shows the full app token and secret key **only once** at creation. Save them in a password manager or secrets store. If you lose the secret key, create a new app token pair.

Reference: [Sumsub authentication docs](https://docs.sumsub.com/reference/authentication)

### Step 4 — Create a verification level

Applicant creation and access tokens require a **verification level** name (`levelName`).

1. In the Dashboard, go to **Application levels** (or **Verification levels**).
2. Create a level for your use case (e.g. `banking-kyc` for individual KYC).
3. Configure required steps (ID document, selfie, proof of address, etc.).
4. Note the **exact level name** — it is **case-sensitive** (`banking-kyc` ≠ `Banking-KYC`).

The finance-banking showcase uses `banking-kyc` as an example level name. You must create a level with that name in Sandbox, or change `levelName` in your habit YAML to match your Dashboard.

### Step 5 — (Optional) Configure webhooks

For real-time status updates (instead of polling `getApplicantStatus`), configure webhooks in **Dev space → Webhooks**. Sign webhook payloads with an HMAC secret in the Dashboard. Webhook triggers are not included in this bit yet; use `getApplicantStatus` or add a webhook trigger later.

---

## Authentication model

Every Sumsub API request is signed:

```
signature = HMAC-SHA256(secretKey, timestamp + METHOD + path + body)
```

Headers:

- `X-App-Token` — your app token
- `X-App-Access-Ts` — Unix timestamp (seconds)
- `X-App-Access-Sig` — lowercase hex HMAC signature

Your server clock must be accurate (within ~1 minute of Sumsub’s servers).

This bit implements signing in `src/driver.ts` and works in Node.js (Cortex server) and browser runtimes (Web Crypto).

---

## Actions

### `createApplicant`

Creates an applicant profile in Sumsub.

**Inputs**

| Field | Required | Notes |
|-------|----------|-------|
| `externalUserId` | Yes | Your unique ID for this person (e.g. application ID or email) |
| `levelName` | Yes | Verification level from Dashboard |
| `email`, `phone` | No | Pre-filled on the applicant |
| `firstName`, `lastName` | No | Added to `info` |
| `country` | No | ISO 3166-1 alpha-3 (e.g. `GBR`, `USA`, `DEU`) |
| `requiredDocuments` | No | Informational only; real requirements come from the level |

**Returns:** `applicantId`, `externalUserId`, `email`, `levelName`

**API:** `POST /resources/applicants?levelName=...`

### `createAccessToken`

Generates a token for the Sumsub WebSDK / Mobile SDK so the user can complete verification in a hosted flow.

**Inputs**

| Field | Required | Notes |
|-------|----------|-------|
| `levelName` | Yes | Same level used when creating the applicant |
| `applicantId` | No* | Sumsub applicant ID from `createApplicant` |
| `userId` | No* | Your `externalUserId`; if omitted, resolved from `applicantId` |
| `email`, `phone` | No | Added to applicant profile via `applicantIdentifiers` |
| `ttlInSecs` | No | Token lifetime in seconds (default 600) |

\* Provide `applicantId` **or** `userId`.

**Returns:** `token`, `userId`, `verificationUrl`, `levelName`

**API:** `POST /resources/accessTokens/sdk`

`verificationUrl` is a convenience link: `https://in.sumsub.com/ids/?accessToken=...` — embed the token in your own WebSDK integration if you prefer.

### `getApplicantStatus`

Returns the current review status for an applicant.

**Inputs:** `applicantId` (required)

**Returns**

| Field | Description |
|-------|-------------|
| `status` | Sumsub `reviewStatus` (`init`, `pending`, `completed`, etc.) |
| `reviewAnswer` | `GREEN` (approved) or `RED` (declined) when completed |
| `approved` | `true` / `false` / `null` (null if not yet completed) |
| `moderationComment`, `rejectLabels`, … | Additional review details |

**API:** `GET /resources/applicants/{applicantId}/status`

---

## Example habit workflow

```yaml
nodes:
  - id: create-sumsub-applicant
    type: action
    data:
      framework: bits
      source: npm
      module: "@ha-bits/bit-sumsub"
      operation: createApplicant
      credentials:
        sumsub:
          appToken: "{{habits.env.HABITS_SUMSUB_APP_TOKEN}}"
          secretKey: "{{habits.env.HABITS_SUMSUB_SECRET_KEY}}"
          baseUrl: "{{habits.env.HABITS_SUMSUB_BASE_URL || 'https://api.sumsub.com'}}"
      params:
        externalUserId: "{{habits.input.email}}"
        email: "{{habits.input.email}}"
        firstName: "{{habits.input.firstName}}"
        lastName: "{{habits.input.lastName}}"
        country: "GBR"
        levelName: banking-kyc

  - id: create-sumsub-access-token
    type: action
    data:
      module: "@ha-bits/bit-sumsub"
      operation: createAccessToken
      credentials:
        sumsub:
          appToken: "{{habits.env.HABITS_SUMSUB_APP_TOKEN}}"
          secretKey: "{{habits.env.HABITS_SUMSUB_SECRET_KEY}}"
      params:
        applicantId: "{{create-sumsub-applicant.applicantId}}"
        levelName: banking-kyc
```

See also: `showcase/finance-banking-customer-onboarding/habits/` in the habits repo.

---

## Webhooks

This bit exposes webhook triggers for Cortex server mode:

| Trigger | URL | When it fires |
|---------|-----|----------------|
| `verificationWebhook` | `POST /webhook/v/sumsub` | `applicantCreated`, `applicantPending`, `applicantReviewed`, etc. |
| `applicantReviewed` | `POST /webhook/v/sumsub/applicantReviewed` | Review completed (GREEN or RED) |

### Setup

1. Expose your Cortex server on a public HTTPS URL (tunnel).
2. In **Sumsub Dashboard → Dev space → Webhook manager**, add:
   - URL: `https://<host>/webhook/v/sumsub`
   - Types: at minimum `applicantReviewed`
3. Set `HABITS_SUMSUB_WEBHOOK_SECRET` to the webhook secret from the Dashboard (used to verify `x-payload-digest`).

### Review result fields

The `parseWebhookEvent` action and webhook triggers normalize payloads into:

- `reviewStatus`, `reviewAnswer`
- `allowNextSteps` — `true` when completed + GREEN
- `blockNextSteps` — `true` when completed + RED

Example workflow: `showcase/sumsub-openai-demo/habits/sumsub-kyc-webhook.yaml`

---

## Local testing

### Validate credentials

Connect credentials in the Habits admin UI, or run a minimal stack that calls `createApplicant` with test data.

### Sandbox limits

- Sandbox allows up to **500 applicant profiles per 24 hours**.
- Use Sandbox app tokens only with Sandbox applicants.

### Common errors

| Error | Likely cause |
|-------|----------------|
| `Request signature mismatch` | Wrong secret key, clock skew, or body altered after signing |
| `app-token-signature mismatch` | Token/secret pair from wrong environment (sandbox vs production) |
| Level not found | `levelName` typo or level created in the other environment |
| 401 / 403 | Expired or revoked app token |

---

## Security

- Never commit app tokens or secret keys to git.
- Rotate keys in the Sumsub Dashboard if exposed.
- Use Sandbox credentials for all non-production environments.
- Restrict app token permissions in the Dashboard to the minimum required scopes.

---

## Links

- [Sumsub API reference](https://docs.sumsub.com/reference/about-sumsub-api)
- [Authentication](https://docs.sumsub.com/reference/authentication)
- [Create applicant](https://docs.sumsub.com/reference/create-applicant)
- [Generate access token](https://docs.sumsub.com/reference/generate-access-token)
- [Get applicant review status](https://docs.sumsub.com/reference/get-applicant-review-status)
- [Sandbox mode](https://docs.sumsub.com/docs/sandbox-mode)
