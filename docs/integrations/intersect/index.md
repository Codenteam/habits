---
title: "Intersect AI"
description: "Generate marketing assets through the Intersect AI gateway"
---

# Intersect AI

Use `@ha-bits/bit-intersect` to generate images, posters, landing pages, and documents through the Intersect AI API.

**Related bit:** [`@ha-bits/bit-intersect`](/bits/bit-intersect)

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `INTERSECT_HOST` | Intersect API host URL | `https://intersect.site` |
| `INTERSECT_API_KEY` | Your Intersect API key | `your_api_key_here` |
| `SERVER_PORT` | Cortex server port | `13000` |
| `WEBHOOK_PORT` | Webhook port | `3099` |

## Setup

1. Copy `.env.example` to `.env` in the showcase folder:

   ```bash
   cp .env.example .env
   ```

2. Set your Intersect credentials:

   ```env
   INTERSECT_HOST=https://intersect.site
   INTERSECT_API_KEY=your_api_key_here
   ```

3. Run the server:

   ```bash
   npx @ha-bits/cortex server --config ./stack.yaml
   ```

4. Open the frontend at `http://localhost:13000`.

## What It Generates

The marketing campaign workflow takes a prompt and generates in parallel:

- Expanded concept summary
- Image prompt and marketing image
- Poster/SVG prompt and vector graphic
- Landing page prompt and website
- PR document prompt and campaign document

## API Endpoint

```
POST /api/marketing-campaign?stream=true
```

Request body:

```json
{
  "prompt": "Your marketing campaign description"
}
```

## Used in Showcases

- [Marketing Campaign](/showcase/marketing-campaign)
