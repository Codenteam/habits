---
title: "Google Calendar"
description: "Sync calendar events with Google OAuth and the Calendar API"
---

# Google Calendar

Use `@ha-bits/bit-google-calendar` to fetch events, manage OAuth tokens, and power calendar-aware workflows.

**Related bit:** [`@ha-bits/bit-google-calendar`](/bits/bit-google-calendar)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HABITS_GOOGLE_CALENDAR_CLIENT_ID` | OAuth 2.0 Client ID |
| `HABITS_GOOGLE_CALENDAR_CLIENT_SECRET` | OAuth 2.0 Client Secret |

> The [Brieflens Calendar Assistant](https://github.com/codenteam/habits/tree/main/showcase/brieflens-habits) showcase also uses Gmail (SMTP) and OpenAI alongside Google Calendar.

## Step 1: Create a Google Cloud Project and Enable the API

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com).
2. Create a new project (e.g. `Calendar Assistant`).
3. Go to **APIs & Services → Library**.
4. Search for **Google Calendar API** → click **Enable**.

## Step 2: Configure the OAuth Consent Screen

1. Navigate to **APIs & Services → OAuth consent screen**.
2. Configure app name, support email, and developer contact.
3. Choose **External** audience.
4. Add test users — the Google accounts that will authorize calendar access.

## Step 3: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services → Credentials**.
2. Click **+ Create Credentials → OAuth client ID**.
3. Set **Application type** to **Web application**.
4. Add the redirect URI for your Cortex OAuth callback (check your bit configuration; typically `http://localhost:13000/oauth/bit-google-calendar/callback` or your showcase's auth callback endpoint).
5. Copy the **Client ID** and **Client Secret** into `.env`.

## Step 4: Authorize Users

On first run, users visit the generated OAuth URL, grant calendar access, and receive access/refresh tokens stored for subsequent syncs.

## OAuth Scopes

The bit supports scopes such as:

- `https://www.googleapis.com/auth/calendar.readonly` — read events
- `https://www.googleapis.com/auth/calendar` — read and write events

<IntegrationShowcases integration="google-calendar" />

## Related Integrations

- [Gmail (IMAP/SMTP)](/integrations/gmail/) — for digest and alert emails
- [Snov.io](/integrations/snov/) — participant enrichment
- [OpenAI](/integrations/openai/) — meeting summaries
