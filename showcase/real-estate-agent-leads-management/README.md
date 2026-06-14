# Real State Agent Leads Management

Lead intake and processing for real-estate agents: OpenAI enrichment, call analysis, HubSpot contact sync, and SQL storage. Workflows write custom fields on **HubSpot contacts**; those properties must exist (and appear in your contacts table) before data shows up correctly in the CRM UI.

## Environment

Create a `.env` file in this folder (see `showcase.yaml` requirements):

> **Note:** On first launch you choose **HubSpot + Database** or **Database only**. Set `HABITS_HUBSPOT_ACCESS_TOKEN` if you use HubSpot sync; database-only mode does not require it.

```env
HABITS_OPENAI_API_KEY=your_openai_api_key
HABITS_HUBSPOT_ACCESS_TOKEN=your_hubspot_private_app_token
```

The HubSpot token needs scopes to read/write contacts and contact properties, for example:

- `crm.objects.contacts.read`
- `crm.objects.contacts.write`
- `crm.schemas.contacts.read`
- `crm.schemas.contacts.write`

Create a **Private App** under **Settings → Integrations → Private Apps**, copy the token, and set `HABITS_HUBSPOT_ACCESS_TOKEN`.

## Custom contact properties

The showcase syncs these fields via `@ha-bits/bit-hubspot` (`createOrUpdate`). HubSpot stores them using the **internal property name** (lowercase, no spaces):

| HubSpot internal name | 
|----------------|
| `reminder` |
| `status` | 
| `lastrecord` | 
| `submittedat` | 
| `score` | 

---

## HubSpot: create a contact property (repeat for each field)

Do this once per property that does not already exist.

1. Open **HubSpot** and go to **Settings** (gear icon).
2. In the left sidebar, open **Data Management → Properties**.
3. At the top, set **Select an object** to **Contact Properties**.
4. Click **Create property**.
5. Fill in the form:
   - **Label** — (e.g. `reminder`, `status`, `lastrecord`, `submittedat`, `score`).
6. Click **Create** (or **Save**).

Repeat steps 4–6 for each missing property: `reminder`, `status`, `lastrecord`, `submittedat`, and `score`

---

## HubSpot: add columns to the Contacts table

After properties exist, add them to the contacts list view:

1. Go to **CRM → Contacts** (contacts index / table view).
2. Click **Edit columns** (or **+ Add column** at the right edge of the table header).
3. In the column picker, search for each property by label:
   - `reminder`
   - `status`
   - `lastrecord`
   - `submittedat`
   - `score`
4. Choose each property you want visible.


If a property does not appear in the picker, it was not created yet — go back to [Create a contact property](#hubspot-create-a-contact-property-repeat-for-each-field) for that field, then return and add the column.

---

## Quick checklist

- [ ] Private app token in `.env` as `HABITS_HUBSPOT_ACCESS_TOKEN`
- [ ] Contact properties: `reminder`, `status`, `lastrecord`, `submittedat`, `score`
- [ ] Contacts table columns added for the same five fields
