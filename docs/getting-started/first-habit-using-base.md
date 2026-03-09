# Build your first habit in 5 minutes (Using Base UI)

This guide walks you through creating your first habit using the **Base UI** - a visual, no-code interface for building logic and UI. You'll create a simple workflow that analyzes images and calculates their calorie content using OpenAI's vision API.

::: tip 🎨 GUI-First Approach
Base mode provides a visual interface for creating habits (Both Logic and UI) without writing code. Perfect for rapid prototyping and users who prefer GUI tools!
:::

<Checklist name="environment-setup" title="Environment Setup Checklist" icon="🛠️">

<!--@include: ./checklists/environment-setup.md{3,}-->

</Checklist>

## Video Tutorial

<ClientOnly>
  <iframe 
    height="600" 
    src="https://www.youtube.com/embed/uhim-Y7b1vA" 
    title="YouTube video player" 
    frameborder="0" 
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
    style="margin: auto; width: 100%;"
    allowfullscreen>
  </iframe>
</ClientOnly>

## What is Base Mode?

Base is the visual builder for Habits. It provides:
- **Visual Workflow Editor** - Drag and drop interface for creating habits
- **Module Browser** - Browse and install available bits (workflow nodes)
- **Form Builder** - Create custom forms for habit inputs
- **Export Options** - Package your habits for deployment
- **Testing Tools** - Test your workflows directly in the browser

## Setup Base Locally

### Option 1: Using npx (Recommended)

The quickest way to start is using npx:

```bash
npx habits@latest base
```

This will:
- Download the latest version of Habits 
- Start the Base UI server
- Open your browser to `http://localhost:3000/habits/base/`

### Option 2: Using NPM Global Installation

Install Habits globally for faster startup:

```bash
npm install -g habits
# or with pnpm
pnpm add -g habits
# or with yarn
yarn global add habits
```

Then run:

```bash
# If you haven't initialized base bafore, run:
habits init

# Start serving the base:
habits base
```

<Checklist name="prepare-base" title="Prepare Base Directory Checklist" icon="🚀">

<!--@include: ./checklists/prepare-base.md{3,}-->

</Checklist>


## Creating Your First Habit

Once Base is running, you'll see the main interface with several tabs. Let's create a simple calorie calculator habit.



### Step 1: Create a New Habit

1. Go to the **Habits** tab
2. Click **+ New Habit** button
3. Name the habit `Calculate Calories in Images`
4. Optionally, you can set the description to `Analyze food images and estimates calorie content`
5. Set the Stack Name to the project name, like `Calories Manager`

### Step 2: Add Nodes to the Workflow

#### Add OpenAI Vision Node

1. In the Node Palette, activate **Bits** as the node type if not active
3. Choose `@ha-bits/bit-openai` from the module dropdown
4. Select `Vision Prompt` as the operation
5. Configure the node:
   - **ID**: `analysis`
   - Set OpenAI key.
   - **Params**:
     - **image**: Click the small variable picker icon and choose input with value imageBase64, this will translate to <code v-pre>{{habits.input.imageBase64}}</code>
     - **prompt**: `You are a knowledgable nutritionist who can guess the amounts of ingredients in the picture in oz, bowls, plates, pieces or in weight. Then know the calories, if you don't know something try to guess it as close as possible. Don't say I don't know.`
   - **Credentials**:
     - **apiKey**:  <code v-pre>{{habits.env.OPENAI_API_KEY}}</code>


🧩 Missing a module?
If you don't see a required bit, piece, or node in the palette, use the **Add Module** button to install it. This lets you quickly add missing modules directly from the UI before using them in your workflow.

#### Add Database Storage Node

1. Click **+ Add Node** again
2. Select **Bits** as the node type
3. Choose `@ha-bits/bit-database` from the module dropdown
4. Select `insert` as the operation
5. Configure the node:
   - **ID**: `store-analysis`
   - **Label**: `Store Analysis`
   - **Params**:
     - **collection**: `calories-diary`
     - **document**: <code v-pre>{{analysis}}</code>

### Step 3: Connect the Nodes

1. Click and drag from the **output port** of the `analysis` node
2. Connect it to the **input port** of the `store-analysis` node
3. The edge will be created automatically

### Step 4: Define Habit Output

1. Click the small output icon in the habit panel.
2. Add an output field:
   - **Key**: `analysis`
   - **Value**: <code v-pre>{{analysis}}</code>


## Generate UI

Go to the UI panel and either create the UI manually or use the AI for that. 

## Testing Your Habit

### Option 1: Using the Built-in Test Form

1. In the habit editor, click the **Play** button
2. The test form will appear with input fields
3. For `imageBase64`, you can either:
   - Upload an image (will be converted to base64)
   - Paste a base64 string directly
4. Click **Run Test**
5. View the results in the output panel

### Option 2: Using the API

Base automatically generates REST API endpoints for your habits:

```bash
curl -X POST http://localhost:3000/habits/base/api/habits/calculate-calories-in-images/execute \
  -H "Content-Type: application/json" \
  -d '{
    "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }'
```

## Viewing Your Habit as Code

Want to see what you built? Click the **< > Code** button in the habit editor to view the generated habit YAML, stack YAML and .env:

::: code-group

<<< @/../examples/image-calories-calculator/calculate-calories-in-images.yaml [calculate-calories-in-images.yaml]

<<< @/../examples/image-calories-calculator/.env.example [.env.example]

<<< @/../examples/image-calories-calculator/stack.yaml [stack.yaml]


<<< @/../examples/image-calories-calculator/frontend/index.html [Frontend (frontend/index.html)]

:::


<Checklist name="stack-readiness" title="Habits Stack Preparation Checklist" icon="📋">

<!--@include: ./checklists/stack-readiness.md{3,}-->

</Checklist>

## Exporting Your Habit

Once your habit is working, you can export it for deployment:

### Export as Single Executable, Docker Container or just download the raw files

1. Go to the **Export** tab
2. Select **Docker** as the export type
3. Click **Export**
4. Download the ZIP file
5. Extract and run:

```bash
unzip stack-docker.zip
cd stack-docker
docker-compose up -d
```

### Export as Binary

1. Go to the **Export** tab
2. Select **Binary** as the export type
3. Choose your target platform (Windows, macOS, Linux)
4. Click **Export**
5. Download the executable
6. Run it on your target machine:

```bash
./habits-bundle
# or on Windows
habits-bundle.exe
```

### Export as Desktop App (Experimental)

1. Go to the **Export** tab
2. Select **Desktop** as the export type
3. Choose framework (Tauri recommended) and platform
4. Click **Export**
5. Download and install the app on your target platform

### Export as Mobile App (Experimental)

1. Go to the **Export** tab
2. Select **Mobile** as the export type
3. Choose framework (Tauri recommended) and target (iOS/Android)
4. Configure backend URL
5. Click **Export**
6. Download APK (Android) or IPA (iOS)

<Checklist name="exporting" title="Exporting for Production Checklist" icon="📦">

<!--@include: ./checklists/exporting.md{3,}-->

</Checklist>

## Next Steps

Now that you've built your first habit using Base, here are some things to explore:

### Learn More Features

- **[Variables & Expressions](../deep-dive/variables.md)** - Learn how to pass data between nodes
- **[Habit Schema](../deep-dive/habit-schema.md)** - Full schema reference
- **[Security Best Practices](../security/)** - Keep your habits secure

### Try More Examples

- **[Email Classification](../showcase/email-classification.md)** - AI-powered email categorization
- **[Minimal Blog](../showcase/minimal-blog.md)** - Full CMS backend with authentication
- **[AI Cookbook](../showcase/ai-cookbook.md)** - Generate recipes from ingredients

### Switch to Code-First Approach

Ready to work with code directly? Check out:
- **[First Habit (Code-First)](./first-habit.md)** - Build habits using YAML/JSON
- **[Creating Habits](../deep-dive/creating.md)** - Advanced creation techniques

### Explore More Modules

Base comes with many pre-built modules (bits). Browse the **Modules** tab to discover:
- **AI/LLM**: OpenAI, Anthropic, Cohere, local LLMs
- **Communication**: Email, SMS, Discord, Slack
- **Data**: Database, file storage, APIs
- **Workflows**: Activepieces, n8n nodes
- **And many more...**

## Troubleshooting

### Base UI Won't Start

If you see "Port already in use":
```bash
# Use a different port
npx habits@latest base --port 8080

# Or kill the process using port 3000
lsof -ti:3000 | xargs kill
```

### Module Installation Fails

1. Check your internet connection
2. Try clearing the npm cache: `npm cache clean --force`
3. Check the module name is correct
4. Try installing again

### Habit Execution Fails

1. Check all required environment variables are set
2. Verify node connections are correct
3. Check the execution logs in the **Logs** tab
4. Test each node individually to isolate the issue

### Can't See My Changes

If changes aren't reflected:
1. Hard refresh your browser (Cmd+Shift+R / Ctrl+Shift+R)
2. Clear browser cache
3. Restart the Base server

## Getting Help

- **[Examples Directory](../showcase/)** - Working example stacks

---

::: tip 💡 Pro Tip
You can switch between GUI (Base) and code editing at any time. Changes made in Base are immediately reflected in the underlying YAML files, and vice versa!
:::
