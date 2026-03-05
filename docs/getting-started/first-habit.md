# Build your first habit in 5 minutes

This guide walks you through creating a multi-module workflow that generates text with OpenAI (Activepieces), converts it to speech with ElevenLabs (n8n), and uploads the audio to S3 (script)

::: tip 📦 Quick Start
Already packed and ready to go! [Download example.zip](/downloads/example.zip) and extract it to get started immediately.
:::

## Workflow

The workflow chains three nodes across different modules: an **Activepieces** node for text generation, an **n8n** node for text-to-speech, and a **script** node for saving locally. Each node references the previous node's output via <code v-pre>{{&lt;id&gt;}}</code>.

<<< @/../examples/mixed/habit.yaml

<HabitViewer :content="mixedHabitYaml" :hide-controls="true" :fit-view="true" :height="800" />

<script setup>
import mixedHabitYaml from '../../examples/mixed/habit.yaml?raw'
</script>

## Configuration

Create `stack.yaml` to define the server settings and workflow paths:

<<< @/../examples/mixed/stack.yaml

## Environment Variables

Create a `.env` file for secrets:

<<< @/../examples/mixed/.env.example

## Run the Habit

```bash
cd path/to/habit
npx @ha-bits/cortex@latest server --config ./stack.yaml
```

## Enabling Features

- **Swagger API**: Set Env var `HABITS_OPENAPI_ENABLED=true` → access at `http://localhost:3000/api/docs`
- **Management Portal**: Set Env var `HABITS_MANAGE_ENABLED=true` to enable the built-in workflow management UI
- **Frontend**: Set `"frontend": "frontend/index.html"` → served at root `/`

## Swagger API Explorer

When `HABITS_OPENAPI_ENABLED=true`, the Swagger UI is available at `/api/docs`. It provides interactive documentation for all workflow endpoints, allowing you to test triggers and inspect request/response schemas directly from the browser.

![Swagger API Explorer](/images/swagger.webp)

## Frontend UI

Set the `frontend` config option to serve a simple web interface at the root path. This is ideal for building custom dashboards or trigger forms that interact with your workflows via the REST API.

![Frontend UI](/images/mixed-frontend.webp)

## Management Portal

Enable `HABITS_MANAGE_ENABLED=true` to access the built-in management portal at `/manage`. This UI lets you view registered workflows, monitor execution status, and inspect node configurations without touching the JSON files.

![Management Portal](/images/cortex.webp)

## Next Steps

Ready to explore more? Check out the [Examples](/examples/) section for real-world use cases including:
- [Email Classification](/examples/email-classification) - AI-powered email categorization
- [Minimal Blog](/examples/minimal-blog) - Full CMS backend with authentication
- [Marketing Campaign](/examples/marketing-campaign) - Multi-channel content generation

### Deployment Options

- [Binary Export](/deep-dive/pack-distribute) - Package your habit as a standalone executable file.
