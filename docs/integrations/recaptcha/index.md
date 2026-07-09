---
title: "reCAPTCHA Enterprise"
description: "Protect contact forms with Google reCAPTCHA Enterprise"
---

# reCAPTCHA Enterprise

The [Smart Contact Form](https://github.com/codenteam/habits/tree/main/showcase/smart-contact-form) showcase verifies submissions with Google reCAPTCHA Enterprise before processing them.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HABITS_RECAPTCHA_SITE_KEY` | reCAPTCHA Enterprise site key (public; served via API) |
| `HABITS_RECAPTCHA_PROJECT_ID` | Google Cloud project ID |
| `HABITS_RECAPTCHA_API_KEY` | Google Cloud API key with reCAPTCHA Enterprise API enabled |
| `HABITS_CONTACT_FORM_RECIPIENT` | Email recipient for form notifications |
| `HABITS_SMTP_HOST` | SMTP server for notification emails |
| `HABITS_SMTP_PORT` | SMTP port |
| `HABITS_SMTP_USER` | SMTP username |
| `HABITS_SMTP_PASSWORD` | SMTP password |
| `HABITS_SMTP_FROM` | Optional From header |

## Setup

### 1. Create a Google Cloud Project

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com).
2. Create a project or select an existing one.

### 2. Enable reCAPTCHA Enterprise API

1. Go to **APIs & Services → Library**.
2. Search for **reCAPTCHA Enterprise API** → click **Enable**.

### 3. Create reCAPTCHA Keys

1. Go to **Security → reCAPTCHA Enterprise**.
2. Create a new key for your site.
3. Copy the **Site key** → `HABITS_RECAPTCHA_SITE_KEY`.
4. Note your **Project ID** → `HABITS_RECAPTCHA_PROJECT_ID`.

### 4. Create an API Key

1. Go to **APIs & Services → Credentials**.
2. Click **+ Create Credentials → API key**.
3. Restrict the key to **reCAPTCHA Enterprise API**.
4. Copy the key → `HABITS_RECAPTCHA_API_KEY`.

## Flow

1. Docs `ContactForm` fetches `POST /api/contact-config` for the reCAPTCHA site key.
2. User submits → `POST /api/submit-contact` with `recaptchaToken`.
3. Server verifies via Google Cloud assessments API.
4. OpenAI summarizes the submission.
5. Summary is emailed to `HABITS_CONTACT_FORM_RECIPIENT`.

## Docs Frontend Configuration

In `docs/.env`:

```env
VITE_CONTACT_FORM_API_URL=https://contact-form.<instance>.hub.codenteam.com/api/submit-contact
```

The reCAPTCHA site key is fetched at runtime from `POST /api/contact-config`.

<IntegrationShowcases integration="recaptcha" />

## Related Integrations

- [OpenAI](/integrations/openai/) — submission summarization
- [Gmail (IMAP/SMTP)](/integrations/gmail/) — notification emails
