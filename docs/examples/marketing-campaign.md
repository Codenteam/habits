# Marketing Campaign Generation using AI

AI-powered marketing campaign generator built on the [Intersect platform](https://codenteam.com/intersect).

<DownloadExample examplePath="business-intersect-standalone" fileName="intersect.zip" />

## What It Does

Takes a marketing prompt and generates:
1. **Expanded prompt** → AI summarizes the idea
2. **Image prompt** → For image generation
3. **Poster/SVG prompt** → For vector graphics
4. **Landing page prompt** → For web copy
5. **Final assets** → Generated in parallel

## Why It's Included

Shows parallel execution, fan-out patterns, and integration with Intersect's AI gateway for unified model access.

## Screenshots

<script setup>
const screenshots = [
  { img: '/images/webcanvas.jpeg', caption: 'WebCanvas - Landing Page Generation' },
  { img: '/images/frontend.png', caption: 'Frontend - Generated Landing Page' },
  { img: '/images/poster.png', caption: 'Generated Poster Output' },
  { img: '/images/draftcanvas.jpeg', caption: 'DraftCanvas - Workflow Design' },
]
</script>

<ScreenshotGallery :screenshots="screenshots" layout="rows" :columns="2" />

## Workflow Visualization

<HabitViewer url="https://codenteam.com/intersect/habits/examples/business-intersect-standalone/habit.yaml" :hide-controls="true" :fit-view="true" :height="600" />

## Quick Start

<ExampleRunner examplePath="business-intersect-standalone" />

::: code-group
```bash [Execute]
curl -X POST http://localhost:13000/api/marketing-campaign \
  -H "Content-Type: application/json" \
  -d '{"input": {"prompt": "Launch a sustainable coffee brand"}}'
```
:::

## Key Files

::: code-group

<<< @/../examples/business-intersect-standalone/.env.example [.env.example]

<<< @/../examples/business-intersect-standalone/stack.yaml [stack.yaml]

<<< @/../examples/business-intersect-standalone/habit.yaml [habit.yaml]

:::
