# Creating Habits

This guide covers all the ways to create habits: writing YAML/JSON directly (Habit as Code), using the visual Base editor, or importing from existing n8n/Activepieces workflows.


<script setup>
import helloWorldHabitYaml from '../../examples/hello-world/habit.yaml?raw'
import helloWorldStackYaml from '../../examples/hello-world/stack.yaml?raw'
</script>


## Option #1: HaC/WaC/AaC: Habit as Code

The most powerful way to create habits is writing them directly as YAML or JSON files. This approach, called **Habit as Code (HaC)**, **Workflow as Code (WaC)** or **Automation as Code (AaC)**, gives you:

- **Version control** - Track changes with Git, review PRs, rollback easily
- **Reproducibility** - Same config always produces same behavior
- **Templating** - Use environment variables and dynamic values
- **CI/CD integration** - Deploy habits through your existing pipelines

### Quick Start: Your First WaC Habit

::: code-group

<<< @/../examples/hello-world/habit.yaml [habit.yaml]

<<< @/../examples/hello-world/stack.yaml [stack.yaml]

:::

Run it:

```bash
npx habits cortex --config stack.yaml
```

Test it:

```bash
curl http://localhost:13000/api/hello-world
```

### Key WaC Concepts

| Concept | Description |
|---------|-------------|
| `workflows` | Array of automation workflows or paths to workflow files |
| `nodes` | Sequential steps in the workflow |
| `inputs` | Input parameters with types and defaults |
| `params` | Configuration for each node using <code v-pre>{{habits.input.x}}</code> syntax |

### Using Environment Variables

Reference secrets and config without hardcoding:

::: v-pre
```yaml
Authorization: "Bearer {{habits.env.API_TOKEN}}"
```
:::

Then set in your environment:
```bash
export API_TOKEN=secret123
```

For more details on the schema, see the [Habit Schema](/deep-dive/habit-schema) reference.

---

## Option #2: Visual Builder: Base UI

Base is the visual builder component that allows you to construct habits from individual bits. It provides an intuitive interface for designing automation workflows without writing code.

![Base Overview](/images/base.webp)

---

### Getting Started with Base

### Prerequisites

- **Node.js** 18 or higher
- **pnpm** (recommended) or npm
- **Git**


### Running Base

```bash

# Option #1: Run base using habits if installed globally 
habits base

# Option #2: Run base using npx
npx habits base

# Option #3: Start the Base UI (development mode), after cloning code
pnpm nx dev @ha-bits/base


```

### Access Points

| Endpoint | URL | Description |
|----------|-----|-------------|
| 🎨 **Base UI** | http://localhost:3001 | Visual Workflow Builder |
| 🔧 **Base API** | http://localhost:3001/api (Proxied to http://localhost:3000) | REST API Backend |

### Accessing Base

To access the Base builder:

1. Navigate to http://localhost:3001 in your browser
2. You'll be presented with the habit builder interface

### Creating a New Habit

#### Step 1: Start a New Habit

Click the "Reset" button to create a fresh automation workflow.

<!-- ![New Habit Button](../images/base-new-habit.png) -->
<!-- *Placeholder: Screenshot of the New Habit button* -->


#### Step 2: Add Bits to Your Habit

Bits are the individual nodes that make up your habit. Each bit represents a single action or step in your automation.

1. Browse the available bits in the sidebar
2. Drag and drop bits onto the canvas
3. Connect bits together to define the flow

<!-- ![Adding Bits](../images/base-add-bits.png) -->
<!-- *Placeholder: Screenshot showing the bit library and drag-and-drop interface* -->

#### Step 3: Configure Each Bit

Click on any bit to configure its settings:
- **Select Doer**: Each bit can have multiple Doers/Actions and Watchers/Triggers.
- **Input parameters**: Define what data the bit receives
- **Output mapping**: Specify how the bit's output is used
- **Credentials**: Set up authentication if required

<!-- ![Configuring Bits](../images/base-configure-bit.png) -->
<!-- *Placeholder: Screenshot of bit configuration panel* -->

#### Step 4: Connect Bits Together

Create connections between bits to define the execution flow:

1. Click on a bit's output handle
2. Drag to another bit's input handle
3. Release to create the connection

<!-- ![Connecting Bits](../images/base-connect-bits.png) -->
<!-- *Placeholder: Screenshot showing bit connections* -->

---

### Editing Existing Habits

#### Opening a Habit for Editing

1. Navigate to your habits list
2. Click on the habit you want to edit
3. The habit will open in the Base editor


#### Modifying Bits

- **Edit**: Click on a bit to modify its configuration
- **Delete**: Select a bit and press Delete or use the context menu
- **Move**: Drag bits to reposition them on the canvas
- **Delete Edge**: Click on a connection and press Delete
- **Reroute Edge**: Delete the existing connection and create a new one

### Creating Frontend

You can use base also to edit UI of the habit by clicking the UI button. This is still **experimental**. 
<div id="habits-base-frontend-screenshot">

![Habits Base UI Editor](/images/base-frontend.webp)
*Habits Base UI Editor - Automation Frontend Builder*

</div>

## Option #3: Importing from n8n and Activepieces

Already have workflows in n8n or Activepieces? Import them directly into Habits.

> ⚠️ **Note:** Both Activepieces and n8n workflow importing is currently **experimental**.

### Exporting from n8n

1. Open your workflow in n8n
2. Click the **⋮** (three dots) menu
3. Select **Download**
4. Save the JSON file

### Exporting from Activepieces

1. Open your flow in Activepieces
2. Click the **⋮** menu in the toolbar
3. Select **Export Flow**
4. Save the JSON file

### Importing via GUI (Base)

1. Start Base: `npx habits edit`
2. Click **Import & Convert** in the toolbar
3. Select your exported JSON file
4. Habits auto-detects the format and converts it
5. Review and adjust the converted workflow

### Importing via CLI

```bash
# Convert an n8n workflow
habits convert --input ./n8n-workflow.json --output ./habits-workflow.json

# Convert an Activepieces workflow  
habits convert --input ./activepieces-flow.json --output ./habits-workflow.json

# Generate .env template for credentials
habits convert --input ./workflow.json --output ./habits.json --env
```

### CLI Options

| Option | Description |
|--------|-------------|
| `--input`, `-i` | Path to input workflow JSON (required) |
| `--output`, `-o` | Path to output file |
| `--env`, `-e` | Generate .env file for credentials |

### What Gets Converted

| Component | n8n | Activepieces |
|-----------|-----|--------------|
| Nodes/Actions | ⚠️ Experimental | ✅ Full support |
| Triggers | ⚠️ Experimental | ✅ Full support |
| Connections | ⚠️ Experimental | ⚠️ Partial |
| Parameters | ⚠️ Experimental | ✅ Full support |
| Credentials | ⚠️ Experimental | ⚠️ Env var refs |

### Credential Handling

Credentials are converted to environment variable references:

::: v-pre
```json
{
  "params": {
    "apiKey": "{{habits.env.OPENAI_API_KEY}}"
  }
}
```
:::




Use the `--env` flag to generate a template file for these variables.

### Post-Import Steps

1. **Review nodes** - Verify all nodes converted correctly
2. **Configure credentials** - Fill in the generated `.env` file
3. **Test** - Run the workflow to verify behavior
4. **Adjust** - Fine-tune parameters as needed



## Best Practices

1. **Start Simple**: Begin with small habits and gradually add complexity
2. **Name Your Bits**: Use descriptive names to make your habit readable
3. **Test Incrementally**: Test each bit as you add it to catch issues early
4. **Document Your Habits**: Add comments or descriptions to explain the workflow purpose


## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Bits not connecting | Ensure you're connecting output to input handles |
| Configuration not saving | Check for validation errors in the bit settings |
| Habit not appearing in list | Refresh the page and try saving again |

---

## Next Steps

Once you've created your habit, learn how to run it using Cortex in the [Running Automations](/deep-dive/running) guide.

