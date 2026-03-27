# Lead Generation Showcase

This showcase demonstrates a complete lead generation and CRM synchronization workflow using the habits framework.

## Overview

The lead-generation habit consists of three interconnected workflows:

1. **capture-lead** - Captures incoming leads from form webhooks
2. **enrich-lead** - Enriches lead data using Snov.io
3. **sync-crm** - Syncs leads to CRM systems (HubSpot, Salesforce, GoHighLevel)

## Bits Used

| Bit | Operations | Purpose |
|-----|------------|---------|
| `@ha-bits/bit-crm` | createLead, updateLead, getLead | Generic CRM operations (L0 base) |
| `@ha-bits/bit-hubspot` | createContact, createDeal, addTag | HubSpot CRM integration |
| `@ha-bits/bit-salesforce` | createLead, createOpportunity | Salesforce CRM integration |
| `@ha-bits/bit-gohighlevel` | createContact, addTag, addToWorkflow | GoHighLevel CRM integration |
| `@ha-bits/bit-snov` | getProspectByEmail, getCompanyByDomain | Lead enrichment |
| `@ha-bits/bit-database-sql` | insert, query | Local lead storage |
| `@ha-bits/bit-web-scraper` | scrapeUrl, extractEmails | Web scraping for leads |

## Setup

### 1. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:

```
# Snov.io for enrichment
SNOV_CLIENT_ID=your_client_id
SNOV_CLIENT_SECRET=your_client_secret

# HubSpot (if using)
HUBSPOT_ACCESS_TOKEN=your_access_token

# Salesforce (if using)
SALESFORCE_ACCESS_TOKEN=your_access_token
SALESFORCE_INSTANCE_URL=https://your-instance.salesforce.com

# GoHighLevel (if using)
GHL_ACCESS_TOKEN=your_access_token
GHL_LOCATION_ID=your_location_id
```

### 2. Run the Showcase

```bash
# From workspace root
pnpm nx dev @ha-bits/cortex --config showcase/lead-generation/stack.yaml
```

### 3. Test Endpoints

```bash
# Capture a lead
curl -X POST http://localhost:13000/misc/flows/capture-lead/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@acme.com",
    "firstName": "John",
    "lastName": "Doe",
    "company": "Acme Inc",
    "source": "website"
  }'

# Enrich a lead
curl -X POST http://localhost:13000/misc/flows/enrich-lead/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@acme.com"
  }'

# Sync to CRM
curl -X POST http://localhost:13000/misc/flows/sync-crm/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "lead_123",
    "targetCrm": "hubspot"
  }'
```

## Workflow Details

### capture-lead.yaml

Receives lead data from form webhooks and stores it locally:

```
HTTP Trigger → Validate → Create Lead → Store in DB → Return Lead ID
```

### enrich-lead.yaml

Enriches lead data using Snov.io:

```
Input Lead → Get Prospect Info → Get Company Info → Update Lead → Return Enriched Data
```

### sync-crm.yaml

Syncs leads to configured CRM systems:

```
Input Lead → Branch by CRM → Create in HubSpot/Salesforce/GHL → Add Tags → Return Result
```

## CRM Level Architecture

This showcase uses a tiered bit architecture:

- **L0 (bit-crm)**: Abstract base with in-memory demo implementation
- **L1 (bit-hubspot, bit-salesforce, bit-gohighlevel)**: Concrete CRM implementations

The L1 bits inherit the interface from L0 and can replace `bit-crm` using the `replaces` property.
