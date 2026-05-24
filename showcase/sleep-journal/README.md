# Sleep Journal

Track nightly sleep, review history, and get AI-powered tips and weekly insights.

## Setup

Copy `.env.example` to `.env` in this folder (or set env vars at the repo root when running Cortex):

```env
HABITS_OPENAI_API_KEY=your_openai_api_key_here
```

## Run

```bash
pnpm habits dev showcase/sleep-journal/stack.yaml
```

Open http://localhost:13000/

## Workflows

| ID | Description |
|----|-------------|
| `log-sleep` | Save a sleep entry and get per-night AI tips |
| `get-sleep-history` | List past entries from the database |
| `sleep-insights` | Weekly OpenAI analysis of recent sleep patterns |

## Frontend

YAML UiSpec at `frontend/index.yaml` — tabbed UI with Log Sleep, History, and Insights views.
