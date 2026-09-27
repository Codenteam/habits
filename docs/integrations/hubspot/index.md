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
| `HABITS_HUBSPOT_ACCESS_TOKEN` | HubSpot private app access token |
| `HABITS_HUBSPOT_CLIENT_SECRET` | HubSpot private app client secret (verifies inbound webhooks) |
| `HUBSPOT_ACCESS_TOKEN` | Alternate naming (lead-generation showcase) |

## Create a Private App

For API calls and webhooks, create one Private App and copy both the access token and client secret.

1. Go to [HubSpot](https://www.hubspot.com) → **Settings → Integrations → Private Apps**.
2. Click **Go to legacy app** (if prompted).
3. Give the app a name (e.g. `Lead Enrichment`).
4. Assign the required scopes:

   | Scope | Purpose |
   |-------|---------|
   | `crm.objects.contacts.read` | Read contacts (required for webhooks) |
   | `crm.objects.contacts.write` | Create/update contacts |
   | `crm.objects.leads.read` | Read leads |
   | `crm.objects.leads.write` | Create/update leads |
   | `crm.schemas.contacts.read` | Read contact property schemas |
   | `crm.schemas.contacts.write` | Create custom contact properties |

5. Click **Create app** and copy the generated **access token** and **client secret**.
6. Add them to `.env`:

```env
HABITS_HUBSPOT_ACCESS_TOKEN=your_token_here
HABITS_HUBSPOT_CLIENT_SECRET=your_client_secret_here
```

## Webhooks (new contact events)

Use webhooks when a Habits workflow should run automatically when a contact is created in HubSpot (for example, the [HubSpot New Lead Slack Notify](/showcase/hubspot-new-lead-notify) showcase).

Habits listens at:

```
/webhook/v/hubspot
```

### 1. Run your habit or showcase

Start the stack that uses the HubSpot `newContact` trigger (default port **13000**):

```bash
pnpm habits dev showcase/hubspot-new-lead-notify/stack.yaml
```

Leave this terminal running.

### 2. Expose the endpoint with ngrok

HubSpot requires a public **HTTPS** URL. In a second terminal:

```bash
ngrok http 13000
```

Copy the **HTTPS** URL ngrok shows (e.g. `https://abc123.ngrok-free.app`).

Your full webhook URL for HubSpot:

```
https://<your-ngrok-host>/webhook/v/hubspot
```

Example:

```
https://abc123.ngrok-free.app/webhook/v/hubspot
```

If you restart ngrok, the URL changes — update the Target URL in HubSpot below.

### 3. Set the webhook Target URL in HubSpot

Use the **same Private App** whose token and client secret you added to `.env`.

1. HubSpot → **Settings** → **Integrations** → **Private Apps** → open your app
2. Open the **Webhooks** tab
3. Click **Edit webhooks**
4. **Target URL:** paste your full ngrok URL including `/webhook/v/hubspot`
5. Save

### 4. Add the Contact → Created subscription

1. On the **Webhooks** tab, click **Create subscription**
2. **Object:** Contact
3. **Event:** Created (`contact.creation`)
4. Click **Subscribe**
5. Confirm the subscription is **active**

If HubSpot asks for a missing scope, go to the app **Scopes** tab and enable `crm.objects.contacts.read`, then save the app.

### 5. Test

1. On **Webhooks**, expand **Contact** → **Created**
2. Click **Test** — ngrok should show a successful `POST` to `/webhook/v/hubspot`
3. Or create a new contact in **CRM → Contacts** and confirm your habit runs

### Webhook signature

Set `HABITS_HUBSPOT_CLIENT_SECRET` to your Private App **client secret** (not the access token). Habits verifies inbound requests using HubSpot’s v3 signature before running the trigger.

See [HubSpot request validation](https://developers.hubspot.com/docs/apps/legacy-apps/authentication/validating-requests#validate-the-v3-request-signature).

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
