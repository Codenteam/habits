# DevOps/GitHub Alerts

Monitors a GitHub repository for **failed GitHub Actions** runs, uses **OpenAI** to pick an issue label, creates a **GitHub issue**, sends a **Slack** alert, and stores each event in a **local database** shown on the dashboard UI.

## Quick start

```bash
cp .env.example .env
# Edit .env with your credentials (see below)

npx habits cortex --config showcase/devops-github-alerts/stack.yaml
```

- **API / automation**: `http://localhost:13000`
- **Dashboard UI**: served from `./frontend` (same port)
- **Polling**: CI monitor runs every **1 minute**; the UI refreshes the list every **30 seconds**

## GitHub setup

### Owner and repo

From your repository URL:

```text
https://github.com/OWNER/REPO
```

Example:

```text
https://github.com/your-org/your-repo
```

Set these in `.env`:

```env
HABITS_GITHUB_OWNER=your-org
HABITS_GITHUB_REPO=your-repo
```

- **Owner** — user or organization name (first path segment)
- **Repo** — repository name only (second segment, no `.git`)

Works for **public and private** repos as long as your token has access.

### Fine-grained Personal Access Token (PAT)

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**
2. Click **Generate new token**
3. Configure the token:
   - **Repository access**: **Only select repositories** — choose **only the repository you monitor** (the same repo as `HABITS_GITHUB_REPO`)
   - **Repository permissions**:
     - **Metadata**: Read
     - **Actions**: Read
     - **Issues**: Read and write
   - **Account permissions**: leave all **No access** (not needed)
4. Generate the token and copy it into `.env`:

```env
HABITS_GITHUB_TOKEN=github_pat_xxxxxxxxxxxx
```

Never commit `.env` or share the token.

### GitHub environment variables

| Variable | Purpose |
|----------|---------|
| `HABITS_GITHUB_TOKEN` | Fine-grained PAT with access to the monitored repo |
| `HABITS_GITHUB_OWNER` | Repository owner (user or organization) |
| `HABITS_GITHUB_REPO` | Repository name to monitor |
| `HABITS_GITHUB_ISSUE_LABELS` | Comma-separated allowed issue labels (must already exist in the repo) |

Example `.env` snippet:

```env
HABITS_GITHUB_TOKEN=github_pat_xxxxxxxxxxxx
HABITS_GITHUB_OWNER=your-org
HABITS_GITHUB_REPO=your-repo
HABITS_GITHUB_ISSUE_LABELS=bug,ci-failure,devops,enhancement
```

### Verify token access (optional)

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/OWNER/REPO/actions/runs?status=failure&per_page=1"
```

Replace `YOUR_TOKEN`, `OWNER`, and `REPO` with your values. A `200` response means owner, repo, and token are correct.

## GitHub issue labels — what are they?

**Labels** are tags on GitHub Issues (and pull requests) used to categorize work — for example `bug`, `ci-failure`, `devops`, `enhancement`.

This showcase does **not** create labels automatically. You must create them on your repo first:

1. Open the repo on GitHub → **Issues** → **Labels**
2. Create each label listed in your `.env`:

```env
HABITS_GITHUB_ISSUE_LABELS=bug,ci-failure,devops,enhancement
```

OpenAI picks **one** label from this list for each failed run. If a label name does not exist on GitHub, GitHub may silently ignore it when creating the issue.

| Label | Typical use in this showcase |
|-------|------------------------------|
| `ci-failure` | Failed GitHub Actions / pipeline run |
| `bug` | Failure likely caused by application code |
| `devops` | Deploy / infra / release workflow failure |
| `enhancement` | Non-critical or tooling-related failure |

## Other environment variables

| Variable | Purpose |
|----------|---------|
| `HABITS_OPENAI_API_KEY` | OpenAI key for label + issue + Slack text generation |
| `HABITS_SLACK_BOT_TOKEN` | Slack bot token (`xoxb-...`) with `chat:write` |
| `HABITS_SLACK_ALERTS_CHANNEL` | Slack channel **ID** (e.g. `C0123456789`), not `#name` |

## Workflows

| Habit | Role |
|-------|------|
| `ci-failure-monitor` | Polls failed Actions runs every minute |
| `process-ci-failure` | OpenAI triage → issue → Slack → **save to database** |
| `list-ci-failures` | Returns stored records for the UI |

## Database

Processed runs are saved to collection `ci_failure_actions` (SQLite via `@ha-bits/bit-database-sql`), including workflow name, branch, label, issue URL, run URL, and timestamp.

The frontend calls `POST /api/list-ci-failures` on load and every **30 seconds** to update the table.

## Test a failure

1. Add a workflow that exits with code `1`, or use an existing failing CI job.
2. Run it on GitHub Actions.
3. Within ~1 minute the monitor should process it (check server logs for `[DEVOPS-CI-FAILURES]` and `[DEVOPS-AI-TRIAGE]`).
4. Confirm a new GitHub issue, Slack message, and a row on the dashboard.
