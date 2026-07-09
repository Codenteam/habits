---
title: "HubSpot CRM"
description: "Sync contacts and leads to HubSpot with a private app token"
---

# HubSpot CRM

Use `@ha-bits/bit-hubspot` to create contacts, sync leads, and write custom properties.

**Related bit:** [`@ha-bits/bit-hubspot`](/bits/bit-hubspot)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HABITS_HUBSPOT_ACCESS_TOKEN` | HubSpot private app token |
| `HUBSPOT_ACCESS_TOKEN` | Alternate naming (lead-generation showcase) |

## Create a Private App (Access Token)

1. Go to [HubSpot](https://www.hubspot.com) → **Settings → Integrations → Private Apps**.
2. Click **Go to legacy app** (if prompted).
3. Give the app a name (e.g. `Lead Enrichment`).
4. Assign the required scopes:

   | Scope | Purpose |
   |-------|---------|
   | `crm.objects.contacts.read` | Read contacts |
   | `crm.objects.contacts.write` | Create/update contacts |
   | `crm.objects.leads.read` | Read leads |
   | `crm.objects.leads.write` | Create/update leads |
   | `crm.schemas.contacts.read` | Read contact property schemas |
   | `crm.schemas.contacts.write` | Create custom contact properties |

5. Click **Create app** and copy the generated token.
6. Add it to `.env`:

```env
HABITS_HUBSPOT_ACCESS_TOKEN=your_token_here
```

## Custom Contact Properties

Some showcases write custom fields that must exist in HubSpot before data appears in the CRM UI.

For [Real Estate Agent Leads Management](/showcase/real-estate-agent-leads-management), create these contact properties:

| Internal name | Label |
|---------------|-------|
| `reminder` | reminder |
| `status` | status |
| `lastrecord` | lastrecord |
| `submittedat` | submittedat |
| `score` | score |

### Create a Contact Property

1. Open **HubSpot → Settings → Data Management → Properties**.
2. Set **Select an object** to **Contact Properties**.
3. Click **Create property**.
4. Fill in the **Label** and click **Create**.
5. Repeat for each missing property.

### Add Columns to the Contacts Table

1. Go to **CRM → Contacts**.
2. Click **Edit columns** (or **+ Add column**).
3. Search for each property and add it to the table view.

<IntegrationShowcases integration="hubspot" />
