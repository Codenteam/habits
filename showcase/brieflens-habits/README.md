# Brieflens - Calendar Assistant (Habits Version)

A habits-based implementation of the brieflens calendar assistant. This version demonstrates:
- **Custom bits**: Google Calendar OAuth, Snov.io enrichment
- **Native cortex iteration**: Built-in `foreach` operation for sub-workflow invocation
- **Scheduled workflows**: Cron-based triggers for periodic tasks
- **Sub-habit pattern**: Modular workflows called via native cortex `foreach`
- **SQLite storage**: Lightweight database with `bit-database-sql`

## Features

- 📅 **Calendar Sync**: Fetches events from Google Calendar every 3 hours
- 🔍 **Participant Research**: Enriches meeting attendees with Snov.io + OpenAI
- 📧 **Daily Digest**: Sends morning briefing emails with meeting summaries
- ⏰ **Urgent Alerts**: Notifies about meetings starting in the next 30 minutes

## Architecture

```
brieflens-habits/
├── stack.yaml                     # Main configuration
├── .env.example                   # Environment template
├── frontend/index.html            # Settings/status UI
└── workflows/
    ├── auth-callback.yaml         # OAuth callback handler
    ├── sync-events.yaml           # Orchestrator: sync all users
    ├── sync-user.yaml             # Sub-habit: sync single user
    ├── research-participants.yaml # Orchestrator: research all
    ├── research-single.yaml       # Sub-habit: research single participant
    ├── send-digest.yaml           # Orchestrator: send all digests
    ├── send-user-digest.yaml      # Sub-habit: digest for one user
    ├── send-urgent.yaml           # Orchestrator: urgent alerts
    └── send-urgent-alert.yaml     # Sub-habit: send single alert
```

## Custom Bits Used

| Bit | Purpose |
|-----|---------|
| `@ha-bits/bit-google-calendar` | Google OAuth2 + Calendar API |
| `@ha-bits/bit-snov` | Snov.io email enrichment |
| `@ha-bits/bit-database-sql` | SQLite storage |
| `@ha-bits/bit-email` | SMTP email sending |
| `@ha-bits/bit-openai` | AI-powered summaries |
| `@activepieces/piece-schedule` | Cron triggers |

### Native Cortex Operations

Instead of using a separate bit for iteration, this implementation uses native cortex operations:

| Operation | Description |
|-----------|-------------|
| `forEach` | Sequential iteration over items, calling a sub-workflow for each |
| `forEachParallel` | Parallel iteration with concurrency control |
| `forEachBatch` | Batch iteration, passing chunks of items |

Example usage in YAML:
```yaml
- id: process-items
  type: bits
  data:
    framework: bits
    source: npm
    module: "@ha-bits/bit-loop"
    operation: forEach
    params:
      items: "{{get-data.results}}"
      habitId: process-single      # ID of sub-workflow to call
      inputKey: item               # Key name for item in sub-workflow input
      delayMs: 1000                # Delay between iterations (ms)
      continueOnError: true        # Don't stop on failures
      collectResults: true         # Aggregate results from all iterations
```

## Setup

1. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Configure credentials** in `.env`:
   - Google OAuth (Cloud Console → APIs → Credentials)
   - OpenAI API key
   - Snov.io API credentials
   - SMTP settings (e.g., Gmail app password)

3. **Build custom bits** (from workspace root):
   ```bash
   cd nodes/bits/@ha-bits/bit-google-calendar && pnpm install && pnpm build
   cd ../bit-snov && pnpm install && pnpm build
   ```

4. **Run the stack**:
   ```bash
   npx habits cortex --config showcase/brieflens-habits/stack.yaml
   ```

5. **Open the UI**: http://localhost:3000

## Workflows

### Scheduled (via Cron)

| Workflow | Schedule | Description |
|----------|----------|-------------|
| `sync-events` | `0 */3 * * *` (every 3h) | Syncs calendar for all users |
| `research-participants` | `0 1 * * *` (1 AM daily) | Researches new participants |
| `send-digest` | `0 7 * * *` (7 AM daily) | Sends daily meeting briefings |
| `send-urgent` | `*/15 * * * *` (every 15min) | Checks for imminent meetings |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth-callback` | POST | Handle OAuth code exchange |
| `/api/sync-events` | POST | Trigger manual sync |
| `/api/send-user-digest` | POST | Send test digest to user |

## ForEach Habit Pattern

Instead of using HTTP-based iteration or loop constructs, this implementation uses `@ha-bits/bit-loop` which directly invokes sub-workflows within the executor:

```yaml
- id: sync-all-users
  type: bits
  data:
    framework: bits
    source: npm
    module: "@ha-bits/bit-loop"
    operation: forEach
    params:
      items: "{{get-users.keys}}"
      habitId: sync-user            # Sub-workflow to call
      inputKey: userEmail           # Pass item as this key
      delayMs: 1000                 # Rate limiting
      continueOnError: true         # Don't stop on failures
```

**Benefits**:
- **No HTTP overhead**: Direct workflow invocation within the executor
- **Better performance**: No network latency between iterations
- **Simpler setup**: No server URLs to configure
- **Built-in logging**: Each sub-workflow execution is tracked
- **Error handling**: `continueOnError` and result collection built-in

## Database Schema (SQLite)

```sql
-- Users (OAuth tokens)
users: { email, name, accessToken, refreshToken, expiryDate }

-- Calendar events
events: { eventId, userEmail, title, startTime, endTime, attendees, notified }

-- Event participants
participants: { eventId, email, name, researched, researchData }

-- Monthly research quota
research_usage: { month, count }

-- Email log
emails: { userEmail, type, subject, sentAt }
```

## Comparison with Original

| Aspect | Original (Python/Flask) | Habits Version |
|--------|------------------------|----------------|
| Runtime | Python + Flask + APScheduler | Node.js + Habits |
| Database | MongoDB | SQLite |
| HTTP Client | requests + axios | Native fetch |
| Scheduling | APScheduler cron | @activepieces/piece-schedule |
| Iteration | Python loops | bit-loop |
| Configuration | Python code | Declarative YAML |

## Development

To modify workflows:
1. Edit the relevant `.yaml` file
2. Restart the server (hot reload not supported for YAML changes)

To add new bits:
1. Create bit in `nodes/bits/@ha-bits/`
2. Build with `pnpm build`
3. Reference in workflow with `source: npm`
