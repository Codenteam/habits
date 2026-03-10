# Marketing Campaign Workflow

This workflow creates a complete marketing campaign from a single prompt using `@ha-bits/piece-intersect`.

## Workflow Structure

```
                    ┌─────────────────┐
                    │ Prompt Expander │
                    │  (ask_chatgpt)  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Image Prompt    │ │ Poster Prompt   │ │ Landing Page    │
│ Generator       │ │ Generator       │ │ Prompt Generator│
│ (ask_chatgpt)   │ │ (ask_chatgpt)   │ │ (ask_chatgpt)   │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Image Generator │ │ Vector Graphic  │ │ Website Creator │
│ (generate_image)│ │ Creator (SVG)   │ │ (create_website)│
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Setup

1. Fill in your Intersect credentials in `.env`:
   ```bash
   INTERSECT_HOST=your-tenant.intersect.site
   INTERSECT_API_KEY=your-api-key
   ```

2. Start the server:
   ```bash
   cd /path/to/habits
   npx tsx src/executer.ts server --config test/business-intersect/config.json
   ```

3. Test with curl:
   ```bash
   curl -X POST http://localhost:13000/workflow/business-intersect/execute \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Launch campaign for an eco-friendly water bottle"}'
   ```

## Expected Output

The workflow returns a JSON object with:
- `originalPrompt`: The original marketing idea
- `expandedConcept`: The expanded marketing concept
- `imagePrompt`: Prompt generated for image creation
- `posterPrompt`: Description for the vector graphic
- `landingPagePrompt`: Prompt for the landing page
- `generatedImage`: The generated marketing image (URL)
- `vectorGraphic`: The created SVG poster (URL)
- `landingPage`: The created landing page

## Nodes Used

1. **Prompt Expander** - `ask_chatgpt`: Expands the initial idea into a full marketing concept
2. **Image Prompt Generator** - `ask_chatgpt`: Creates a DALL-E prompt from the concept
3. **Poster Prompt Generator** - `ask_chatgpt`: Describes what the SVG poster should contain
4. **Landing Page Prompt Generator** - `ask_chatgpt`: Describes the landing page structure
5. **Image Generator** - `generate_image`: Creates marketing image with DALL-E 3
6. **Vector Graphic Creator** - `create_vector_graphic`: Creates the SVG poster
7. **Website Creator** - `create_website`: Creates the landing page
