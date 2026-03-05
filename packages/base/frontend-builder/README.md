# @ha-bits/frontend-builder

A GrapesJS-based visual frontend builder with AI-powered generation through Intersect WebCanvas.

## Features

- **Visual Editor**: Drag-and-drop interface powered by GrapesJS
- **AI Generation**: Generate and refine frontends using natural language prompts
- **Tailwind CSS**: Built-in Tailwind CSS support via grapesjs-tailwind
- **Form Builder**: Easy form creation with grapesjs-plugin-forms
- **Smart Hosting Detection**: Automatically detects if running on intersect.site
- **Multi-Tenant Support**: Works with any Intersect tenant URL

## Installation

```bash
pnpm add @ha-bits/frontend-builder
```

## Usage

### Basic Usage

```tsx
import { FrontendBuilder } from '@ha-bits/frontend-builder';
import '@ha-bits/frontend-builder/styles';

function App() {
  const handleSave = (html: string) => {
    console.log('Saved HTML:', html);
  };

  return (
    <FrontendBuilder
      initialHtml="<div>Hello World</div>"
      onSave={handleSave}
      height="600px"
      showAiPanel={true}
    />
  );
}
```

### With Custom Configuration

```tsx
import { FrontendBuilder, WebCanvasConfig } from '@ha-bits/frontend-builder';

const config: WebCanvasConfig = {
  tenantUrl: 'https://your-tenant.intersect.site',
  apiKey: 'your-api-key',
  provider: 'openai',
  model: 'gpt-4.1-mini',
};

function App() {
  return (
    <FrontendBuilder
      config={config}
      onSave={(html) => console.log(html)}
      onChange={(html) => console.log('Changed:', html)}
    />
  );
}
```

### Hosting Detection

The library automatically detects if it's running on intersect.site:

```tsx
import { detectHostingEnvironment } from '@ha-bits/frontend-builder';

const result = await detectHostingEnvironment();

if (result.isHosted) {
  console.log('Running on intersect.site, API key:', result.apiKey);
} else {
  console.log('Not on intersect.site, need tenant URL and API key');
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialHtml` | `string` | `''` | Initial HTML content |
| `onChange` | `(html: string) => void` | - | Called when content changes |
| `onSave` | `(html: string) => void` | - | Called when user saves |
| `config` | `WebCanvasConfig` | `{}` | WebCanvas API configuration |
| `height` | `string \| number` | `'600px'` | Editor height |
| `showAiPanel` | `boolean` | `true` | Show AI generation panel |
| `className` | `string` | `''` | Additional CSS class |

## WebCanvasConfig

| Property | Type | Description |
|----------|------|-------------|
| `tenantUrl` | `string` | Intersect tenant URL (e.g., https://mytenant.intersect.site) |
| `apiKey` | `string` | API key for authentication |
| `provider` | `'auto' \| 'openai' \| 'anthropic'` | AI provider |
| `model` | `string` | AI model name |

## Plugins Included

- **grapesjs-blocks-basic**: Basic building blocks
- **grapesjs-preset-webpage**: Webpage preset with common components
- **grapesjs-plugin-forms**: Form components (inputs, buttons, etc.)
- **grapesjs-tailwind**: Tailwind CSS integration

## Development

```bash
# Install dependencies
pnpm install

# Build the library
pnpm nx build @ha-bits/frontend-builder

# Watch mode
pnpm nx dev @ha-bits/frontend-builder
```

## License

MIT
