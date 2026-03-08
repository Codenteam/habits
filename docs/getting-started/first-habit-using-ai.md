# Build your first habit in 1 minute (Using AI)

This guide walks you through creating your first habit using the **AI Generator** in Base UI. Simply describe what you want to build, and AI will generate the complete backend workflow and frontend UI for you.

::: tip 🤖 AI-First Approach
The AI generator creates fully functional habits — including workflow logic, node configuration, and frontend UI — from a single text prompt. Perfect for getting started quickly or prototyping ideas!
:::

::: warning Beta Feature
~~AI generation is currently in **Beta** and is available with **Intersect Cloud** or **Intersect Self-hosted** only.~~  
AI generation is now available to everyone!
:::

## Environment Variables

The AI generator requires a few environment variables to be set when starting the Base server.

| Variable | Required | Description |
|----------|----------|-------------|
| `HABITS_AI_GEN` | **Yes** | Set to `true` to enable the AI generation endpoints. Without this the "Generate with AI" feature is disabled. |
| `CLAUDE_API_KEY` | **Yes** | Your Anthropic API key (starts with `sk-ant-…`). Used by the AI agent to generate workflows and UI. |
| `HABITS_AI_DEBUG` | No | Set to `true` to keep the temporary staging directories on disk after the ZIP is sent. Useful for inspecting raw generated files when troubleshooting. |

### When to set them

Pass the variables when you launch Base:

```bash
HABITS_AI_GEN=true \
CLAUDE_API_KEY=sk-ant-… \
npx habits@latest base
```

Or add them to a `.env` file in the server root:

```env
HABITS_AI_GEN=true
CLAUDE_API_KEY=sk-ant-...
# Optional — keep staging files for debugging
# HABITS_AI_DEBUG=true
```

::: tip
On **Intersect Cloud** and **Intersect Self-hosted**, these variables are configured for you automatically — you only need to set them when running Base locally.
:::

## Prerequisites

- Habits Base UI running (see [Setup Base Locally](./first-habit-using-base.md#setup-base-locally))
- The environment variables above configured (at minimum `HABITS_AI_GEN=true` and `CLAUDE_API_KEY`)

## Step 1: Open the Generate Modal

1. Start Base UI:
   ```bash
   npx habits@latest base
   ```
2. Open your browser to `http://localhost:3000/habits/base/`
3. Click the **Generate with AI** button (✨ wand icon) in the toolbar

## Step 2: Describe Your Habit

In the Generate modal, you can choose between two generation types:

- **Create Habit** — Generates a complete workflow with backend logic and frontend UI
- **Create Bit** — Generates a reusable node module (bit) for use in workflows

Select **Create Habit**, then describe what you want to build in the text area. Be as specific as possible about the features, logic, and UI layout you want.

**Example prompts:**

- *"Build an AI-powered image analyzer that describes uploaded photos and stores results in a database"*
- *"User provides a prompt, expand it to a more profressional marketing-toned message, pass the new message to an image creator that creates a poster using AI, and another AI node that generates a website*

![AI Generate Modal - Input](/images/habits-ai-reqs.webp)

## Step 3: Watch the Progress

After clicking **Generate**, the AI agent will start building your habit. You'll see real-time progress updates as it works through each step:

- Analyzing your requirements
- Generating the workflow nodes and configuration
- Creating the frontend UI
- Packaging everything together

![AI Generate Modal - Progress](/images/habits-ai-inprogress.webp)

The generation typically takes 1–2 minutes depending on complexity.

## Step 4: Review the Result

Once generation is complete, you'll see a success message showing:
- How many habits were created
- Whether a frontend UI was included

Click **Done** to close the modal. Your generated habit is now loaded in the Base editor where you can:

- **Inspect the workflow** — View and modify the generated nodes and connections
- **Edit the frontend** — Customize the generated UI in the Frontend panel
- **View the code** — Click the **Code** button to see the generated YAML
- **Test it** — Hit the **Play** button to run the habit immediately

## Step 5: Test Your Habit

1. In the habit editor, click the **Play** button
2. Fill in any required input fields in the test form
3. Click **Run Test**
4. View the results in the output panel

You can also test via the API:

```bash
curl -X POST http://localhost:3000/habits/base/api/habits/<your-habit-id>/execute \
  -H "Content-Type: application/json" \
  -d '{ "your-input": "value" }'
```

## Tips for Better Results

| Tip | Example |
|-----|---------|
| **Be specific about features** | "with search, pagination, and dark mode" |
| **Mention data models** | "store users with name, email, and role" |
| **Describe the UI layout** | "sidebar navigation with a main content area" |
| **Specify integrations** | "use OpenAI for text analysis and store results in the database" |

::: info 💡 Iterate and Refine
The AI-generated habit is a starting point. You can always modify the workflow, tweak the UI, or add more nodes manually after generation. Switch to the [Base UI guide](./first-habit-using-base.md) or [Habit-as-Code guide](./first-habit.md) for manual editing techniques.
:::

## Generating a Bit (Node Module) (Beta)

You can also use the AI generator to create custom **bits** — reusable node modules:

1. Open the Generate modal
2. Switch to **Create Bit** mode
3. Describe the bit (e.g., *"A Slack notification bit that sends messages to a channel"*)
4. Click **Generate**

The generated bit files will be created and ready for use in your workflows.

## Troubleshooting

### Generation Fails or Times Out

- Ensure your Intersect Cloud or Self-hosted instance is running and accessible
- Check that AI generation is enabled in your configuration
- Try simplifying your prompt and generating again

### Generated Habit Doesn't Match Expectations

- Add more detail to your prompt — the more specific, the better
- Try breaking complex ideas into simpler prompts and combining them manually
- Use the generated habit as a starting point and edit it in the Base UI

### No "Generate with AI" Button

- AI generation requires Intersect Cloud or Intersect Self-hosted
- Ensure the feature is enabled (check environment variables)

## Next Steps

- **[First Habit (Base UI)](./first-habit-using-base.md)** — Learn the visual editor for manual habit building
- **[First Habit (Habit-as-Code)](./first-habit.md)** — Build habits using YAML/JSON directly
- **[Examples](/examples/)** — Browse real-world habit examples
- **[Variables & Expressions](../deep-dive/variables.md)** — Learn how to pass data between nodes
