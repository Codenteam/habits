---
title: "Salesforce CRM"
description: "Create leads and opportunities in Salesforce"
---

# Salesforce CRM

Use `@ha-bits/bit-salesforce` to create leads and opportunities as part of CRM sync workflows.

**Related bit:** [`@ha-bits/bit-salesforce`](/bits/bit-salesforce)

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SALESFORCE_ACCESS_TOKEN` | Salesforce OAuth access token | `00D...` |
| `SALESFORCE_INSTANCE_URL` | Your Salesforce instance URL | `https://your-instance.salesforce.com` |

## Setup

1. Create a Connected App or use an existing integration in your Salesforce org.
2. Complete the OAuth flow to obtain an access token.
3. Note your instance URL (e.g. `https://yourcompany.my.salesforce.com`).
4. Add credentials to `.env`:

```env
SALESFORCE_ACCESS_TOKEN=your_access_token
SALESFORCE_INSTANCE_URL=https://your-instance.salesforce.com
```

## Sync Workflow

The [Lead Generation](https://github.com/codenteam/habits/tree/main/showcase/lead-generation) showcase syncs leads via the `sync-crm` workflow:

```bash
curl -X POST http://localhost:13000/misc/flows/sync-crm/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "lead_123",
    "targetCrm": "salesforce"
  }'
```

<IntegrationShowcases integration="salesforce" />

## Related Integrations

- [Snov.io](/integrations/snov/) — lead enrichment before CRM sync
- [HubSpot CRM](/integrations/hubspot/) — alternative CRM target
