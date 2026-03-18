# Build your first habit in 5 minutes (Habit-as-Code)

This guide walks you through creating a multi-module workflow that generates text with OpenAI (Activepieces), converts it to speech with ElevenLabs (n8n), and uploads the audio to S3 (script)

::: tip <Icon name="package" /> Quick Start
Already packed and ready to go! [Download example.zip](/downloads/example.zip) and extract it to get started immediately.
:::

<Checklist name="environment-setup" title="Environment Setup Checklist" icon="wrench">

<!--@include: ./checklists/environment-setup.md{3,}-->

</Checklist>

<Checklist name="hac" title="Code-First Approach (HaC) Checklist" icon="monitor">

<!--@include: ./checklists/hac.md{3,}-->

</Checklist>

## Workflow

The workflow chains three nodes across different modules: an **Activepieces** node for text generation, an **n8n** node for text-to-speech, and a **script** node for saving locally. Each node references the previous node's output via <code v-pre>{{&lt;id&gt;}}</code>.

<<< @/../showcase/mixed/habit.yaml

<HabitViewer :content="mixedHabitYaml" :hide-controls="true" :fit-view="true" :height="800" />

<script setup>
import mixedHabitYaml from '../../showcase/mixed/habit.yaml?raw'
</script>

## Configuration

Create `stack.yaml` to define the server settings and workflow paths:

<<< @/../showcase/mixed/stack.yaml

## Environment Variables

Create a `.env` file for secrets:

<<< @/../showcase/mixed/.env.example

## Run the Habit

```bash
cd path/to/habit
npx @ha-bits/cortex@latest server --config ./stack.yaml
```

::: warning n8n License Warning
When running habits that use n8n nodes, you will see this warning in the terminal:

```
================================================================================
⚠️  LICENSE WARNING: n8n is NOT open source!
================================================================================
n8n packages are licensed under the Sustainable Use License (SUL).
You CANNOT redistribute or use n8n commercially without a license.
If you don't have a valid n8n license, you can't use this habit for non-personal usage.
Use Apache 2.0/MIT licensed alternatives: ActivePieces pieces or Habits bits.
================================================================================
```
:::

::: danger Deprecation Notice
**n8n and ActivePieces nodes are being deprecated.** We are removing support for n8n and ActivePieces nodes in favor of native Habits bits, which are fully Apache 2.0 licensed with no commercial restrictions. Migrate your workflows to use Habits bits for long-term compatibility.
:::

## Enabling Features

- **Swagger API**: Set Env var `HABITS_OPENAPI_ENABLED=true` → access at `http://localhost:3000/api/docs`
- **Management Portal**: Set Env var `HABITS_MANAGE_ENABLED=true` to enable the built-in workflow management UI
- **Frontend**: Set `"frontend": "frontend"` in the server block in stack.yaml → served at root `/`

## Swagger API Explorer

When `HABITS_OPENAPI_ENABLED=true`, the Swagger UI is available at `/api/docs`. It provides interactive documentation for all workflow endpoints, allowing you to test triggers and inspect request/response schemas directly from the browser.

![Swagger API Explorer](/images/swagger.webp)

## Frontend UI

Set the `frontend` config option to serve a simple web interface at the root path. This is ideal for building custom dashboards or trigger forms that interact with your workflows via the REST API.

![Frontend UI](/images/mixed-frontend.webp)

## Management Portal

Enable `HABITS_MANAGE_ENABLED=true` to access the built-in management portal at `/manage`. This UI lets you view registered workflows, monitor execution status, and inspect node configurations without touching the JSON files.

![Management Portal](/images/cortex.webp)

<Checklist name="stack-readiness" title="Habits Stack Preparation Checklist" icon="clipboard">

<!--@include: ./checklists/stack-readiness.md{3,}-->

</Checklist>

<Checklist name="exporting" title="Exporting for Production" icon="package">

<!--@include: ./checklists/exporting.md{3,}-->

</Checklist>

## Next Steps

Ready to explore more? Check out the [Examples](/showcase/) section for real-world use cases including:
- [Email Classification](/showcase/email-classification) - AI-powered email categorization
- [Minimal Blog](/showcase/minimal-blog) - Full CMS backend with authentication
- [Marketing Campaign](/showcase/marketing-campaign) - Multi-channel content generation

### Deployment Options

- [Binary Export](/deep-dive/pack-distribute) - Package your habit as a standalone executable file.
