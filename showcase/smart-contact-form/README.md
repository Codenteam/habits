# Smart Contact Form

API-only habit that powers contact forms on the Habits docs site.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/contact-config` | POST | Returns public client config (`recaptchaSiteKey`) |
| `/api/submit-contact` | POST | Validates reCAPTCHA, summarizes, and emails submission |

## Flow

1. Docs `ContactForm` fetches `POST /api/contact-config` for the reCAPTCHA site key
2. User submits → `POST /api/submit-contact` with `referrer`, `recaptchaToken`, `answers`, and `formPurpose`
3. Verify reCAPTCHA Enterprise via Google Cloud assessments API
4. Summarize the submission with OpenAI
5. Email the summary to `HABITS_CONTACT_FORM_RECIPIENT`

## Environment Variables

Copy `.env.example` and fill in values. All secrets use the `HABITS_` prefix.

| Variable | Description |
|----------|-------------|
| `HABITS_OPENAI_API_KEY` | OpenAI API key |
| `HABITS_RECAPTCHA_SITE_KEY` | reCAPTCHA Enterprise site key (public; served via `/api/contact-config`) |
| `HABITS_RECAPTCHA_PROJECT_ID` | Google Cloud project ID |
| `HABITS_RECAPTCHA_API_KEY` | Google Cloud API key with reCAPTCHA Enterprise API enabled |
| `HABITS_CONTACT_FORM_RECIPIENT` | Notification recipient (e.g. `test@codenteam.com`) |
| `HABITS_SMTP_HOST` | SMTP server host |
| `HABITS_SMTP_PORT` | SMTP port (typically 587) |
| `HABITS_SMTP_USER` | SMTP username |
| `HABITS_SMTP_PASSWORD` | SMTP password |
| `HABITS_SMTP_FROM` | Optional From header |

## Test Locally

```bash
pnpm nx run habits pack --format habit --config showcase/smart-contact-form/stack.yaml
pnpm habits cortex showcase/smart-contact-form/stack.yaml
```

```bash
curl -X POST http://localhost:13000/api/contact-config \
  -H "Content-Type: application/json" \
  -d '{}'

curl -X POST http://localhost:13000/api/submit-contact \
  -H "Content-Type: application/json" \
  -d '{
    "referrer": "https://docs.example.com/showcase/hello-world",
    "recaptchaToken": "test-token",
    "formPurpose": "docs-showcase:hello-world",
    "answers": {
      "name": "Jane Doe",
      "email": "jane@example.com",
      "company": "Acme Inc",
      "message": "Interested in automating invoice processing."
    }
  }'
```

## Docs Frontend

The VitePress `ContactForm` component posts to this API. Configure in `docs/.env`:

```
VITE_CONTACT_FORM_API_URL=https://contact-form.<instance>.hub.codenteam.com/api/submit-contact
```

The reCAPTCHA site key is fetched at runtime from `POST /api/contact-config` (set `HABITS_RECAPTCHA_SITE_KEY` on the habit).
