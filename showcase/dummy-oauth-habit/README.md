# Dummy OAuth Habit — Tauri dev test checklist

Minimal habit for verifying OAuth **Connect** and **API access** against `@ha-bits/mock-oauth` (`http://localhost:9999`).

## Prerequisites

| Step | Command |
|------|---------|
| 1. Mock OAuth server | `cd packages/manage/mock-oauth && cp .env.example .env && pnpm dev` |
| 2. Cortex dev app | `cd habits-cortex && pnpm dev` |
| 3. Import habit | Pack `stack.yaml` and import into the app (forge MCP `pack_and_import_habit` or UI) |

**Before packing:** rebuild the bit so the bundle includes latest OAuth URLs:

```bash
cd nodes/bits/@ha-bits/bit-oauth-mock && npm run build
pnpm nx run habits pack --format habit --config showcase/dummy-oauth-habit/stack.yaml
```

## In-app steps

1. Open **Dummy OAuth Habit** in Cortex Dev.
2. Habit card **⋮ → Secrets**.
3. Set **MOCK_OAUTH_CLIENT_ID** = `mock-client-id`.
4. Under **Connections**, click **Connect** on Mock OAuth.
5. System browser opens `http://localhost:9999/authorize?...`.
6. Mock server redirects to `https://habits.codenteam.com/oauth.html?code=...&state=...`.

## oauth.html (dev build)

**`habits-cortex-dev://` URLs may not open the app on macOS during `tauri dev`** — Launch Services often has no handler for cargo-run dev binaries. Use a **debug build** (`pnpm build:debug` in `habits-cortex`) or the local redirect page below.

### Option A — local redirect page

```bash
cd habits-cortex/sitelinks && python3 -m http.server 9876
```

Set mock OAuth redirect to `http://localhost:9876/oauth.html` **or** after authorize, open:

`http://localhost:9876/oauth.html?code=...&state=...` (use the `code` and `state` from the mock server redirect).

Click **Open Cortex Dev** on the page (or press Ctrl+D) if the automatic deep link does not open the app.

Return to Cortex Dev — Secrets should show **Connected** for Mock OAuth.

## Verify connection

### UI (Cortex server or packed habit with frontend)

1. Open the habit frontend.
2. Confirm the OAuth status card shows **Connected**.
3. Click **Test Mock OAuth**.
4. **Success:** green banner + userinfo (`sub`, `name`, `email`) from `http://localhost:9999/userinfo`.
5. **Failure:** red banner — *"Mock OAuth is not connected…"* if you skipped Connect or the token is missing/expired.

### API

```bash
curl -X POST http://localhost:13000/api/dummy-oauth-habit
```

When connected:

```json
{
  "output": {
    "success": {
      "ok": true,
      "status": "success",
      "message": "Mock OAuth is connected. Fetched userinfo from http://localhost:9999.",
      "profile": { "sub": "...", "name": "...", "email": "..." }
    }
  }
}
```

When not connected:

```json
{
  "output": {
    "failure": {
      "ok": false,
      "status": "failure",
      "message": "Mock OAuth is not connected. Connect Mock OAuth in Secrets, then try again."
    }
  }
}
```

## Cortex server mode (optional)

```bash
# Terminal 1
cd packages/manage/mock-oauth && pnpm dev

# Terminal 2
pnpm nx dev @ha-bits/cortex --config showcase/dummy-oauth-habit/stack.yaml
```

Set `MOCK_OAUTH_CLIENT_ID=mock-client-id` in `.env`, open `http://localhost:13000/habits/cortex` (or the compiled frontend), connect via `/oauth/bit-oauth-mock/init`, then run **Test Mock OAuth**.
