# AI Agent Lead Enrichment

## 0. Setup Environment Variables

Before running the workflow, make sure your `.env` file contains the following variables:

```env
HABITS_OPENAI_API_KEY=your_openai_api_key_here
HABITS_HUBSPOT_ACCESS_TOKEN=your_hubspot_access_token_here
```

- `HABITS_OPENAI_API_KEY`, your OpenAI API key, used for AI-powered lead scoring and enrichment.
- `HABITS_HUBSPOT_ACCESS_TOKEN`, your HubSpot private app token (see section 1 below for how to generate it).

---

## 1. Create a HubSpot Legacy App (Access Token)

To connect this workflow to HubSpot, you need to create a **Private App** on your hubspot account to generate an access token.

### Steps

1. **Open HubSpot Settings**
   - Go to [HubSpot](https://www.hubspot.com) and navigate to **Settings → Integrations → Private Apps**.

2. **Go to Legacy Apps**
   - Click **"Go to legacy app"**.

3. **Name the App & Assign Scopes**
   - Give the app a name (e.g. `Lead Enrichment`).
   - Assign the following scopes:
     - `crm.objects.contacts.write`
     - `crm.objects.contacts.read`
     - `crm.objects.leads.write`
     - `crm.objects.leads.read`
     - `crm.schemas.contacts.write`
     - `crm.schemas.contacts.read`

4. **Generate and Save the Token**
   - Click **Create app** and then copy the generated token.
   - Paste it into your `.env` file as the value for:
     ```
     HABITS_HUBSPOT_ACCESS_TOKEN=your_token_here
     ```

---

## 2. Viewing the Score in the Contacts Table

After a contact record is saved and enriched, the **Score (1-100)** property may not appear in the contacts table by default. To make it visible:

1. Open the **Contacts** table in HubSpot.
2. Click **"Add column"** (usually found at the far right of the table header).
3. Search for and select the **Score** property, it should already exist in the property list after any submission happened.

The Score column will now appear in the table for all enriched contacts.
