# Habit Viewer

The Habit Viewer is a standalone web application for visualizing habit workflows. It can render habits as interactive diagrams or export them as images.

## Live Viewer


The viewer is available at: [https://codenteam.com/intersect/habits/viewer/](https://codenteam.com/intersect/habits/viewer/)

## URL Parameters

Pass habit content and rendering options via URL query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `habit` | string | *required* | URL-encoded YAML or JSON habit content. Use `\n` for newlines. |
| `format` | string | `interactive` | Render format: `interactive`, `svg`, `png`, or `html` |
| `download` | boolean | `false` | Auto-download the rendered output when `format` is not `interactive` |
| `filename` | string | `habit-workflow` | Filename for downloaded exports (without extension) |
| `hideControls` | boolean | `false` | Hide zoom controls and minimap |
| `bgColor` | string | `#0f172a` | Background color (hex format) |
| `fitView` | boolean | `true` | Automatically fit the view to show all nodes |

## Examples

### Basic Interactive View

```
/viewer/?habit=id%3A%20my-habit%0Aname%3A%20My%20Habit%0Anodes%3A%0A%20%20-%20id%3A%20node1%0A%20%20%20%20type%3A%20bits%0A%20%20%20%20data%3A%0A%20%20%20%20%20%20framework%3A%20bits%0A%20%20%20%20%20%20module%3A%20%40ha-bits%2Fbit-http%0A%20%20%20%20%20%20label%3A%20HTTP%20Request
```

### Export as PNG with Auto-Download

```
/viewer/?habit=<encoded-yaml>&format=png&download=true&filename=my-workflow
```

### Minimal View (No Controls)

```
/viewer/?habit=<encoded-yaml>&hideControls=true
```

### Custom Background Color

```
/viewer/?habit=<encoded-yaml>&bgColor=%231e293b
```

## Habit Content Format

The viewer accepts habits in YAML or JSON format. Here's a minimal example:

<<< @/../examples/docs/example-habit/habit.yaml

<HabitViewer :content="exampleHabitYaml" :hide-controls="false" :fit-view="true" :height="400" />

## Encoding Habit Content

To pass habit content via URL, you need to:

1. Replace newlines with `\n` (literal backslash-n)
2. URL-encode the result

### JavaScript Example

```javascript
const habitYaml = `id: my-habit
name: My Habit
nodes:
  - id: node1
    type: bits
    data:
      framework: bits
      module: "@ha-bits/bit-http"
      label: HTTP Request`;

const encoded = encodeURIComponent(habitYaml);
const viewerUrl = `https://your-domain.com/viewer/?habit=${encoded}`;
```

### Using from Habits Base UI

The Habits Base UI includes a "Share Habit Link" button in the toolbar that automatically generates a viewer URL for the current habit.

## Export Formats

| Format | Description |
|--------|-------------|
| `interactive` | Fully interactive canvas with pan, zoom, and node selection |
| `svg` | Scalable vector graphic - best for embedding in documents |
| `png` | Raster image - best for sharing on social media |
| `html` | Standalone HTML file with embedded styles |

> **Note:** The `svg` and `png` formats are rendered client-side using JavaScript (React Flow). This means the viewer URL cannot be used directly as an `<img src="...">` since there is no server-side rendering. To embed these formats, you must either:
> - Save the file locally, then host it
> - Use an `<iframe>` to embed the interactive viewer
> - Use a headless browser (e.g., Puppeteer) to capture the rendered output

## Node Colors

Nodes are colored based on their framework and type:

| Framework | Trigger Color | Action Color |
|-----------|---------------|--------------|
| n8n | Green | Red |
| activepieces | Blue | Purple |
| script | Orange | Cyan |
| bits | Teal | Emerald |

### Node Colors Example

<<< @/../examples/docs/framework-colors-demo/habit.yaml

<HabitViewer :content="frameworkColorsDemoYaml" :hide-controls="false" :fit-view="true" :height="500" />

## Embedding

You can embed the viewer in an iframe:

```html
<iframe 
  src="/viewer/?habit=<encoded-yaml>&hideControls=true" 
  width="800" 
  height="600" 
  frameborder="0"
></iframe>
```

### Embedded Example (Hidden Controls)

This example shows the viewer embedded with `hideControls=true` for a cleaner look:

<HabitViewer :content="embeddedDemoYaml" :hide-controls="true" :fit-view="true" :height="300" />


<script setup>
import exampleHabitYaml from '../../examples/docs/example-habit/habit.yaml?raw'
import frameworkColorsDemoYaml from '../../examples/docs/framework-colors-demo/habit.yaml?raw'
import embeddedDemoYaml from '../../examples/docs/embedded-demo/habit.yaml?raw'
</script>
