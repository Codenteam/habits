---
name: manage-admin-mode
description: 'Development, testing, and deployment for the Habits Admin package (packages/manage/admin). Use when: working on the admin UI or server, managing Docker deployment, handling DNS/Caddy/PowerDNS config, working on habit service lifecycle (run/pause/stop/delete), editing subdomain routing, or deploying admin to production. Package name: @ha-bits/admin.'
argument-hint: 'Describe the admin feature, deployment step, or Docker change you need'
---

# Manage Admin Mode

## Overview

The Admin (`packages/manage/admin`, package `@ha-bits/admin`) is a Node.js/TypeScript server that manages habits as web services. It runs inside a single Docker container that bundles:

- **Caddy** - reverse proxy + TLS termination
- **PowerDNS** - authoritative DNS for habit subdomains
- **s6-overlay** - per-habit process supervision
- **Admin app** - thin Fastify server serving a Handlebars UI

Each habit gets its own subdomain, process, and URL with zero manual server config.

---

## Project Structure

```
packages/manage/admin/
├── src/
│   ├── server/          # Fastify server entry point
│   ├── auth/            # Password auth (bcrypt)
│   ├── integrations/    # Caddy, PowerDNS, metrics integrations
│   ├── services/        # Habit service lifecycle (run/pause/stop/delete)
│   ├── storage/         # File storage, .habit uploads
│   └── ui/              # Handlebars templates + Tailwind CSS
├── docker/
│   ├── allinone/        # Single Docker image (Caddy+PowerDNS+s6+app)
│   └── caddy/           # Caddy config fragments
├── scripts/
│   ├── test-stack.sh    # Integration test runner (15 checks)
│   ├── test-admin.sh    # Admin-only tests
│   └── dns-bootstrap.sh # DNS seeding script
├── Dockerfile
├── compose.local.yaml   # Local dev compose file
├── STRUCTURE.md         # Architecture reference
├── INSTRUCTIONS.md      # Production deployment guide
└── PLAN.md              # Design decisions
```

---

## Key Source Directories

```
src/
├── server/
│   ├── index.ts         # Fastify app, route registration
│   └── routes/
│       ├── services.ts  # CRUD + lifecycle for habit services
│       ├── auth.ts      # Login/logout
│       └── metrics.ts   # CPU/RAM metrics endpoint
├── integrations/
│   ├── caddy.ts         # Caddy Admin API calls (add/remove routes)
│   ├── powerdns.ts      # PowerDNS API calls (DNS records)
│   └── metrics.ts       # In-memory metrics ring (30-min window)
├── services/
│   └── lifecycle.ts     # Start/pause/stop/delete habit processes
└── storage/
    └── habits.ts        # .habit file upload, directory management
```

---

## Development Commands

```bash
# Dev mode (TypeScript, hot-reload via tsx)
cd packages/manage/admin
npm run dev
# or from workspace root:
npx tsx packages/manage/admin/src/server/index.ts

# Build (compile TS + copy UI assets + build Tailwind CSS)
cd packages/manage/admin
npm run build

# Build CSS only
npm run build:css

# Start compiled server
npm run start
```

### Environment Variables (for local dev)

```bash
# Minimal local dev env
DATA_DIR=/tmp/ha-bits-test
NS_MANAGER_PDNS_API_KEY=test-key-123
NS_MANAGER_ROOT_DOMAIN=habits.localhost
NS_MANAGER_PASSWORD_HASH=<bcrypt-hash>   # generate below
NS_MANAGER_PUBLIC_IPV4=127.0.0.1

# Generate password hash (no install needed):
npx -y -p bcryptjs bcrypt 'your-password' 14
```

**IMPORTANT:** In `admin.env` (compose env file), escape `$` as `$$` in bcrypt hashes because Docker Compose interpolates `$VAR` sequences. Example: `$$2b$$14$$abc...`

---

## Docker / Local Stack

```bash
cd packages/manage/admin

# Copy and fill in env
cp .env.example admin.env   # edit admin.env with your values

# Start the full stack (Caddy + PowerDNS + s6 + admin app)
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down

# Quick integration test (15 checks)
DATA_DIR=/tmp/ha-bits-test \
NS_MANAGER_PDNS_API_KEY=test-key-123 \
NS_MANAGER_ROOT_DOMAIN=habits.localhost \
  bash scripts/test-stack.sh
```

### Docker Validation (cheap checks before full build)

```bash
# Validate compose config
docker compose -f packages/manage/admin/docker-compose.yaml config

# Build only (no start)
docker compose build

# Check TypeScript compiles
cd packages/manage/admin && npm run build
```

---

## Services & Ports

| Service | Port | Notes |
|---|---|---|
| Admin UI (HTTP) | `:80` | Behind Caddy |
| Admin UI (HTTPS) | `:443` | TLS via Caddy |
| Caddy Admin API | `:2019` | No auth in dev, do not expose publicly |
| PowerDNS API | `:8081` | Requires `X-API-Key` header |
| PowerDNS DNS | `127.0.0.1:5354` | UDP+TCP (macOS uses `/etc/resolver/`) |

---

## API Endpoints (Admin Server)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/services` | GET | List all habit services |
| `/api/services` | POST | Add a new habit (upload .habit) |
| `/api/services/:sub` | GET | Get service details |
| `/api/services/:sub/start` | POST | Start the habit process |
| `/api/services/:sub/pause` | POST | Pause the habit process |
| `/api/services/:sub/stop` | POST | Stop the habit process |
| `/api/services/:sub` | DELETE | Delete service + files |
| `/api/services/:sub/metrics` | GET | CPU/RAM metrics (5-min avg) |
| `/api/services/:sub/logs` | GET | Tail process logs |

---

## Testing

### Integration Test Script

```bash
cd packages/manage/admin

# Full stack test (starts Docker, runs 15 checks)
DATA_DIR=/tmp/ha-bits-test \
NS_MANAGER_PDNS_API_KEY=test-key-123 \
NS_MANAGER_ROOT_DOMAIN=habits.localhost \
  bash scripts/test-stack.sh

# Admin-only tests (admin server must already be running)
bash scripts/test-admin.sh
```

### Manual API Testing

```bash
# List services
curl http://localhost:3000/api/services

# Upload a habit
curl -X POST http://localhost:3000/api/services \
  -F "file=@showcase/hello-world/hello-world.habit"

# Start a service
curl -X POST http://localhost:3000/api/services/hello-world/start

# Check Caddy routes
curl http://localhost:2019/config/apps/http/servers/main/routes

# Check PowerDNS zones
curl -H "X-API-Key: test-key-123" \
  http://localhost:8081/api/v1/servers/localhost/zones
```

---

## Production Deployment

Full guide: `packages/manage/admin/INSTRUCTIONS.md`

### Summary (AWS Route 53 + Docker example)

1. Provision server with static IP
2. In Route 53 hosted zone, add:
   - A records: `ns1.habits.<domain>` and `ns2.habits.<domain>` → server IP
   - NS record: `habits.<domain>` → `ns1.habits.<domain>.` + `ns2.habits.<domain>.`
3. Create data directory on server: `sudo mkdir -p /data/admin && sudo chown -R "$USER":"$USER" /data`
4. Build Docker image and push to registry (or build on server)
5. Run container with `.env` mounted at `/data/admin/.env`
6. Verify DNS propagation and access admin UI at `admin.<root-domain>`

### Build Docker Image

```bash
cd packages/manage/admin

# Build image
docker build -t ha-bits-admin .

# Run with env
docker run -d \
  --name ha-bits-admin \
  -p 80:80 -p 443:443 -p 5354:5354/udp \
  -v /data/admin:/data/admin \
  --env-file /data/admin/.env \
  ha-bits-admin
```

---

## Code Conventions

- Framework: **Fastify** (not Express)
- Templating: **Handlebars** (`.hbs` files in `src/ui/`)
- Styles: **Tailwind CSS** (dark mode, mobile-first, no gradients)
- Auth: **bcrypt** password hash in `.env`
- DNS: PowerDNS API (never edit SQLite directly)
- Proxy: Caddy Admin API (never edit `Caddyfile` directly)
- Logging: Use `pino` (already a dependency), not `console.log`
- No gradients in UI, solid colors only, dark mode preferred

### Common Pitfalls

- When editing `src/server/routes/services.ts` broadly, prefer a single clean full-file replacement over incremental patches to avoid content duplication.
- The compose env file (`admin.env`) requires `$$` for every `$` in bcrypt hashes.
- Do not edit PowerDNS SQLite directly; always go through the REST API on port 8081.
- Caddy Admin API is on port 2019 (no auth in dev); never expose this publicly.
