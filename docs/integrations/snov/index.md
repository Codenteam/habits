---
title: "Snov.io"
description: "Enrich leads with prospect and company data from Snov.io"
---

# Snov.io

Use `@ha-bits/bit-snov` for email enrichment, prospect lookup, and company data in lead generation workflows.

**Related bit:** [`@ha-bits/bit-snov`](/bits/bit-snov)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SNOV_CLIENT_ID` | Snov.io API client ID |
| `SNOV_CLIENT_SECRET` | Snov.io API client secret |

> The bit uses OAuth2 client credentials to obtain an access token automatically.

## Get API Credentials

1. Sign in to [Snov.io](https://snov.io/).
2. Go to your account API settings (typically under **Account → API** or **Integrations**).
3. Create or copy your **Client ID** and **Client Secret**.
4. Add them to `.env`:

```env
SNOV_CLIENT_ID=your_client_id
SNOV_CLIENT_SECRET=your_client_secret
```

## Example `.env`

```env
SNOV_CLIENT_ID=your_client_id
SNOV_CLIENT_SECRET=your_client_secret
```

<IntegrationShowcases integration="snov" />

## Related Integrations

- [OpenAI](/integrations/openai/) — AI summaries of enriched data
- [HubSpot CRM](/integrations/hubspot/) — sync enriched leads to CRM
