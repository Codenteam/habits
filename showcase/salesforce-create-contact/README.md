# Salesforce Create Contact

Minimal showcase: OAuth into Salesforce and create a **Contact** via `@ha-bits/bit-salesforce`.

## Salesforce setup

### 1. Create a Developer Edition org

You need your own Salesforce organization. Sign up for a free **Developer Edition** account:

https://developer.salesforce.com/signup

Complete the signup and basic org setup.

### 2. Create a Connected App

1. Open **Setup** (gear icon, top right → **Setup**).
2. In the **Quick Find** box on the left, search for **External Client App** (or **App Manager**).
3. Open **App Manager** → **New Connected App** (or create a new external client app).
4. Fill in the basic app info (name, API name, contact email).
5. Under **OAuth Settings**, enable OAuth and configure:
   - **Callback URL:**
     ```
     http://localhost:13000/oauth/bit-salesforce/callback
     ```
   - **Selected OAuth Scopes** (add both):
     - **Manage user data via APIs (`api`)**
     - **Perform requests at any time (`refresh_token`, `offline_access`)**
6. Click **Save** / **Create**.

> New Connected Apps can take a few minutes to become active.

### 3. Get Consumer Key (Client ID)

1. On the app’s page, open the **Settings** tab (or **Manage** next to Consumer Details).
2. Open **OAuth Settings** (or **Edit Policies** → OAuth policies, depending on your org UI).
3. Click **Consumer Key and Secret** (or **Manage Consumer Details**).
4. Complete verification if prompted.
5. Copy the **Consumer Key** only — this is your `SALESFORCE_CLIENT_ID`. Save it securely.

You do not need the Consumer Secret for this showcase; OAuth uses PKCE with the Client ID only.

### 4. Get your instance URL (`SALESFORCE_INSTANCE_URL`)

While logged into Salesforce, look at the browser address bar. The org host is your instance URL, for example:

```
https://yourcompany-dev-ed.develop.my.salesforce.com
```

Use that full base URL (no path after `.com`) as `SALESFORCE_INSTANCE_URL`. All API requests to Salesforce use this host.

### 5. Open the Contacts table (optional)

To verify created contacts in the UI:

1. Go to **Setup** (gear → **Setup**).
2. Click the **waffle / App Launcher** (nine dots, top left).
3. Search for **Contacts** and open it.
4. You’ll see the Contacts list — new contacts from this showcase appear here after a successful run.

---

## Habits setup

Copy the environment file and add your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
SALESFORCE_CLIENT_ID=your_consumer_key
SALESFORCE_INSTANCE_URL=https://your-org.develop.my.salesforce.com
```

## Run

From the repo root:

```bash
pnpm nx dev @ha-bits/cortex --config showcase/salesforce-create-contact/stack.yaml
```

On startup, the server prints an OAuth URL, or open:

```
http://localhost:13000/oauth/bit-salesforce/init
```

Approve access in Salesforce, then open the UI:

```
http://localhost:13000/
```

Fill the form and submit. The contact should appear under **Contacts** in Salesforce.

## API test (optional)

```bash
curl -X POST http://localhost:13000/api/create-contact \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+1 555 0100",
    "title": "Engineer"
  }'
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `SALESFORCE_CLIENT_ID` | Connected App Consumer Key (Client ID) |
| `SALESFORCE_INSTANCE_URL` | Org base URL from the browser while logged in |
