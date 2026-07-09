---
title: "GoHighLevel CRM"
description: "Sync contacts and workflows to GoHighLevel"
---

# GoHighLevel CRM

Use `@ha-bits/bit-gohighlevel` to create contacts, add tags, and trigger workflows in GoHighLevel.

**Related bit:** [`@ha-bits/bit-gohighlevel`](/bits/bit-gohighlevel)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GHL_ACCESS_TOKEN` | GoHighLevel API access token |
| `GHL_LOCATION_ID` | GoHighLevel location (sub-account) ID |

## Setup

1. Sign in to your [GoHighLevel](https://www.gohighlevel.com/) account.
2. Go to **Settings → API** (or your sub-account's API settings).
3. Generate or copy your **API access token**.
4. Find your **Location ID** for the sub-account you want to sync to.
5. Add credentials to `.env`:

```env
GHL_ACCESS_TOKEN=your_access_token
GHL_LOCATION_ID=your_location_id
```

## Sync Workflow

The [Lead Generation](https://github.com/codenteam/habits/tree/main/showcase/lead-generation) showcase syncs leads via the `sync-crm` workflow:

```bash
curl -X POST http://localhost:13000/misc/flows/sync-crm/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "lead_123",
    "targetCrm": "gohighlevel"
  }'
```

<IntegrationShowcases integration="gohighlevel" />

## Related Integrations

- [Snov.io](/integrations/snov/) — lead enrichment before CRM sync
- [HubSpot CRM](/integrations/hubspot/) — alternative CRM target
