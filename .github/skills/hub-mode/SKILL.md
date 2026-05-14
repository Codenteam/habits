---
name: hub-mode
description: 'Development, testing, and deployment for the Codenteam Hub package (packages/manage/hub). Use when: working on hub user auth, service instance management, Docker container lifecycle, Caddy routing, external domain verification, hub UI pages, or deploying the hub. Package name: @codenteam/hub.'
argument-hint: 'Describe the hub feature, user flow, or deployment step you need'
---

# Hub Mode

## Overview

The Hub (`packages/manage/hub`, package `@codenteam/hub`) is a Node.js/TypeScript server that manages product service containers for multiple users. Each user gets their own service container (e.g. a `habits-admin` instance) reachable at a unique subdomain.

```
Host machine
├── hub (Node.js, port 3000)  ←  SQLite + Docker socket
├── Caddy (port 80/443)
│   ├── hub.codenteam.com              → localhost:3000  (hub UI)
│   ├── alice.hub.codenteam.com        → localhost:18000 (Alice's service)
│   ├── bob.hub.codenteam.com          → localhost:18001 (Bob's service)
│   ├── hub.codenteam.localhost        → localhost:3000  (local dev)
│   └── alice.hub.codenteam.localhost  → localhost:18000
└── Docker
    ├── codenteam-service-alice (port 18000, volume: codenteam-service-alice-data)
    └── codenteam-service-bob   (port 18001, volume: codenteam-service-bob-data)
```

---

## Project Structure

```
packages/manage/hub/
├── src/
│   ├── server/
│   │   ├── index.ts         # Express app, middleware, route registration
│   │   └── config.ts        # Env config (dotenv + defaults)
│   ├── auth/                # bcrypt auth, session cookies
│   ├── caddy/               # Caddy Admin API calls (add/remove routes)
│   ├── db/                  # better-sqlite3, schema migrations
│   ├── docker/              # Dockerode wrappers (create/start/stop/remove)
│   ├── email/               # Nodemailer, verification tokens
│   ├── products/            # Product image registry
│   ├── routes/
│   │   ├── auth.ts          # Register, login, logout, email verify
│   │   ├── dashboard.ts     # Dashboard page + instance cards
│   │   ├── instances.ts     # CRUD + lifecycle for service instances
│   │   ├── admin.ts         # Admin UI (users, instances, invite codes)
│   │   ├── settings.ts      # Instance settings (subdomain, password, external domain)
│   │   └── proxy.ts         # Dev proxy for local subdomain routing
│   └── ui/                  # Handlebars templates + Tailwind CSS
├── http/                    # httpyac test files
├── package.json
└── plan.md                  # Architecture reference + phases
```

---

## Database Schema (SQLite via better-sqlite3)

Key tables:

| Table | Purpose |
|---|---|
| `users` | Accounts (username, email, password_hash, role, email_verified) |
| `email_verifications` | One-time email verify tokens (24h expiry) |
| `sessions` | Session tokens (30-day cookie sessions) |
| `admin_instances` | Service containers per user (subdomain, port, Docker status) |
| `invite_codes` | Optional registration gate |

Instance ports are allocated in the range **18000-18999**, one per instance.

Reserved subdomains (cannot be used as instance names): `admin`, `hub`, `www`, `api`, `mail`, `ns1`, `ns2`.

---

## Development Commands

```bash
# Dev mode (TypeScript, tsx)
cd packages/manage/hub
npm run dev

# Build (TS compile + Tailwind CSS)
npm run build

# Build CSS only
npm run build:css

# Start compiled server
npm run start
```

### Environment Variables

```bash
# Copy example and fill in values
cp .env.example .env

# Key variables:
HUB_PORT=3000
HUB_ROOT_DOMAIN=hub.codenteam.localhost   # local dev
HUB_SESSION_SECRET=<long-random-string>
CADDY_ADMIN_URL=http://localhost:2019
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
```

---

## UI Pages

| Route | Purpose |
|---|---|
| `/` | Landing page (hero, feature cards) |
| `/register` | Sign up (username, email, password, optional invite code) |
| `/login` | Login (email + password) |
| `/verify-email` | Email verification gate (shown after registration) |
| `/dashboard` | Service cards (status, Open/Start/Stop/Settings/Delete) |
| `/dashboard/new` | Create new service instance form |
| `/dashboard/instances/:id/settings` | Change subdomain, password, external domain, delete |
| `/admin` | Admin: users table, instances table, invite codes, system stats |
| `/admin/users/:id` | User detail, role toggle, force-stop instances |

---

## Key Flows

### Create Instance

1. Validate subdomain (slug, unique, not a reserved word)
2. Allocate next free port in 18000-18999
3. Generate stable `domain_verify_token` UUID (stored in DB, never changes)
4. `docker run -d --name codenteam-service-<sub> -p <port>:80 -v codenteam-service-<sub>:/data -e SERVICE_ROOT_DOMAIN=<sub>.hub.codenteam.com ... <product-image>:latest`
5. Add two Caddy routes: `<sub>.hub.codenteam.com → localhost:<port>` and `<sub>.hub.codenteam.localhost → localhost:<port>`

### Stop / Start Instance

- **Stop**: `docker stop`, remove all Caddy routes (primary + local + external if set), status=`stopped` (volume + container kept)
- **Start**: `docker start`, re-add all applicable Caddy routes, status=`running`

### Link External Domain

1. User provides domain (e.g. `app.acme.com`) in instance settings
2. Hub shows required TXT record:
   - Type: `TXT`
   - Host: `_codenteam-hub-verify.app.acme.com`
   - Value: `codenteam-hub-verify=<domain_verify_token>`
3. User clicks **Verify** → hub does `dns.resolveTxt('_codenteam-hub-verify.<domain>')`
4. On match: `external_domain_verified=1`, add Caddy route for the custom domain
5. To remove: delete Caddy route, clear `external_domain` + `external_domain_verified`

---

## API Endpoints (Hub Server)

| Endpoint | Method | Purpose |
|---|---|---|
| `/auth/register` | POST | Create account |
| `/auth/login` | POST | Login, set session cookie |
| `/auth/logout` | POST | Clear session |
| `/auth/verify-email` | GET | Verify email token |
| `/api/instances` | GET | List user's instances |
| `/api/instances` | POST | Create new instance |
| `/api/instances/:id` | GET | Instance detail |
| `/api/instances/:id/start` | POST | Start Docker container + add Caddy routes |
| `/api/instances/:id/stop` | POST | Stop Docker container + remove Caddy routes |
| `/api/instances/:id` | DELETE | Delete instance + container + Caddy routes |
| `/api/instances/:id/subdomain` | PATCH | Change subdomain (re-creates container) |
| `/api/instances/:id/password` | PATCH | Change service password |
| `/api/instances/:id/external-domain` | PUT | Set/update external domain |
| `/api/instances/:id/external-domain/verify` | POST | Trigger TXT DNS verification |
| `/api/instances/:id/external-domain` | DELETE | Remove external domain |
| `/api/admin/users` | GET | List all users (admin only) |
| `/api/admin/users/:id/role` | PATCH | Toggle user role (admin only) |
| `/api/admin/invite-codes` | POST | Create invite code (admin only) |

---

## Testing

### httpyac Tests

```bash
# Run httpyac tests from workspace root (hub must be running)
cd packages/manage/hub
httpyac http/auth-tests.http --all
httpyac http/instances-tests.http --all
```

### Manual Testing with curl

```bash
# Register a user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"secure123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secure123"}'

# Create an instance
curl -X POST http://localhost:3000/api/instances \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"My Admin","product":"habits-admin","subdomain":"alice","servicePassword":"pass123"}'

# List instances
curl http://localhost:3000/api/instances -b cookies.txt

# Verify Caddy routes were added
curl http://localhost:2019/config/apps/http/servers/main/routes
```

---

## Production Deployment

### Prerequisites

- Linux server with Docker installed
- Wildcard DNS: `*.hub.codenteam.com → server-ip` (set once at registrar)
- Caddy running on port 80/443 with Admin API on 2019

### Build and Run

```bash
cd packages/manage/hub

# Build
npm run build

# Run with production env
NODE_ENV=production \
HUB_ROOT_DOMAIN=hub.codenteam.com \
HUB_SESSION_SECRET=<long-secret> \
CADDY_ADMIN_URL=http://localhost:2019 \
  npm run start
```

### Phases (Implementation Status)

- **Phase 1**: Auth and user accounts (register, login, email verify, admin users, invite codes) - DONE
- **Phase 2**: Service instances (create, start, stop, delete, change subdomain/password, Caddy routing) - DONE
- **Phase 3**: External domain linking (TXT DNS verification, custom Caddy routes)

---

## Code Conventions

- Framework: **Express** (with `express-handlebars`)
- Templating: **Handlebars** (`.hbs` files in `src/ui/`)
- Styles: **Tailwind CSS** (dark mode, mobile-first, no gradients)
- Auth: **bcrypt** (cost 12) + session cookies (cookie-parser)
- Database: **better-sqlite3** (synchronous SQLite)
- Container management: **Dockerode**
- Proxy: Caddy Admin API on port 2019
- Logging: **pino** + pino-pretty, not `console.log`
- Input validation: **Zod**
- No gradients in UI, solid colors only, dark mode preferred

### Common Pitfalls

- Never allocate ports outside 18000-18999 for service instances.
- Always check subdomain uniqueness and reserved words before creating an instance.
- When stopping an instance, remove ALL Caddy routes (primary `.com`, local `.localhost`, and external domain if set) before updating DB status.
- `domain_verify_token` is generated once at instance creation and never changes (even when subdomain changes).
- Email verification must be complete before a user can create instances.
