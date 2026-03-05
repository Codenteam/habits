# Business Intersect Embedded

This example demonstrates a marketing campaign workflow that is designed to be standalone outside intersect.site. Unlike the standard `business-intersect` example, this version:

1. **Uses environment variables** for Intersect credentials (`INTERSECT_HOST` and `INTERSECT_API_KEY`) instead of accepting them as input
2. **Communicates directly to the API** at `/api` endpoints without requiring API key management in the frontend
3. **Simplified frontend** that doesn't include API key fetching functionality

## Setup

1. Copy `.env` and configure your Intersect credentials:
   ```bash
   cp .env.example .env
   # Edit .env with your INTERSECT_HOST and INTERSECT_API_KEY
   ```

2. Run the server:
   ```bash
   npx @ha-bits/cortex server --config ./config.json
   ```

3. Open the frontend at `http://localhost:13000`

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `INTERSECT_HOST` | The Intersect API host URL | `https://intersect.site` |
| `INTERSECT_API_KEY` | Your Intersect API key | `your_api_key_here` |
| `SERVER_PORT` | Port for the Cortex server | `13000` |
| `WEBHOOK_PORT` | Port for webhooks | `3099` |

## Workflow

The workflow takes a marketing prompt and generates:
- Expanded concept summary
- Image prompt and generated marketing image
- Poster/SVG prompt and vector graphic
- Landing page prompt and website
- PR document prompt and campaign document

## API Endpoints

The frontend communicates with:
- `POST /api/marketing-campaign?stream=true` - Execute the workflow with streaming results

Input body:
```json
{
  "prompt": "Your marketing campaign description"
}
```
