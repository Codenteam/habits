# Habits Workflow Editor UI

A visual workflow builder for creating automation workflows with n8n and Activepieces nodes.

## Features

- **Visual Workflow Builder**: Drag-and-drop interface powered by React Flow
- **Multi-Framework Support**: Create workflows with both n8n and Activepieces nodes
- **Node Configuration**: Configure each node with resource, operation, credentials, and parameters
- **Import/Export**: Save and load workflows in a neutral JSON format
- **Live Execution**: Execute workflows directly against your Habits API backend
- **Auto-Discovery**: Automatically loads available modules from the backend

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Habits API backend running on http://localhost:3000

### Installation

```bash
cd ui
npm install
```

### Development

```bash
npm run dev
```

The UI will be available at http://localhost:3001

### Building

```bash
npm run build
```

## Usage

### Creating a Workflow

1. **Add Nodes**: Click on nodes in the left palette to add them to the canvas
2. **Connect Nodes**: Drag from one node's output handle to another's input handle
3. **Configure Nodes**: Click on a node to open the configuration panel
4. **Execute**: Click the "Execute" button to run your workflow

### Node Configuration

#### n8n Chatwoot Node
- **Resource**: contact, conversation, message, account
- **Operation**: get, getAll, create, update, delete, send
- **Credentials**: Chatwoot URL and API token
- **Account ID**: Your Chatwoot account ID

#### Activepieces Google Sheets
- **Action**: append_row, get_values, update_values, etc.
- **Spreadsheet ID**: Google Sheets spreadsheet ID
- **Range**: Sheet range (e.g., Sheet1!A1:Z)

### Workflow JSON Format

Workflows are exported in a neutral JSON format:

```json
{
  "id": "uuid",
  "name": "My Workflow",
  "description": "Workflow description",
  "version": "1.0.0",
  "nodes": [
    {
      "id": "node-1",
      "type": "n8n",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Get Contacts",
        "framework": "n8n",
        "module": "n8n-nodes-chatwoot",
        "resource": "contact",
        "operation": "getAll",
        "credentials": {
          "url": "https://app.chatwoot.com",
          "token": "your-token"
        },
        "params": {
          "accountId": "1"
        }
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2"
    }
  ]
}
```

## Architecture

### Components

- **WorkflowEditor**: Main container with React Flow canvas
- **NodePalette**: Sidebar showing available modules
- **CustomNode**: Visual representation of workflow nodes
- **NodeConfigPanel**: Configuration panel for node settings
- **Toolbar**: Top toolbar with workflow actions

### State Management

Uses Redux Toolkit for state management:
- Workflow metadata (name, description)
- Nodes and edges
- Selected node
- Available modules
- Form field states and validation
- UI state for panels and dialogs

### API Integration

Communicates with the Habits API backend:
- `GET /api/modules` - Load available modules
- `POST /api/execute` - Execute workflow nodes
- `GET /api/status/:id` - Check execution status

## Customization

### Adding New Node Types

1. Update the node palette in `NodePalette.tsx`
2. Add configuration options in `NodeConfigPanel.tsx`
3. Update the CustomNode styling in `CustomNode.tsx`

### Styling

Uses Tailwind CSS for styling. Customize colors and themes in `tailwind.config.js`.

## License

MIT
