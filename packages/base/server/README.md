# @ha-bits/base

Base - Habits Workflow Builder API Server with integrated UI

## Installation

```bash
npm install -g @ha-bits/base
# or
npx @ha-bits/base
```

## Usage

Start the server:

```bash
npx @ha-bits/base
```

### Local Development

```bash
pnpm nx dev @ha-bits/base
```

### Environment Variables

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `HABITS_NODES_PATH` - Custom path for downloaded modules
- `HABITS_TEMPLATES_PATH` - Custom path for workflow templates

## Features

- **Module Management**: Install, list, and manage workflow modules
- **Module Execution**: Test module actions directly
- **Schema Extraction**: Get action schemas for UI rendering
- **Form Validation**: Validate workflow configuration forms
- **Workflow Templates**: Access pre-built workflow templates
- **Serve API**: Start/stop workflow servers for testing
- **Integrated UI**: Built-in React web interface at `/habits/base`

## API Endpoints

All API endpoints are prefixed with `/api` (or `/habits/base/api` for UI compatibility).

### Core
- `GET /api/` - API info and status

### Modules
- `GET /api/modules` - List all available modules
- `POST /api/modules/install` - Install a module
- `POST /api/modules/add` - Add module to configuration
- `GET /api/modules/check/:framework/:moduleName` - Check if module is installed
- `GET /api/modules/schema/:framework/:moduleName` - Get module schema

### Execution
- `POST /api/execute` - Execute a module action
- `GET /api/status/:execution_id` - Get execution status

### Forms
- `POST /api/forms/validate` - Validate form data
- `POST /api/forms/verify-auth` - Verify authentication credentials
- `POST /api/forms/dynamic-options` - Get dynamic dropdown options

### Templates
- `GET /api/templates/:templateName/{*filePath}` - Get template files

### Serve (Workflow Server Management)
- `POST /api/serve/start` - Start a workflow server
- `POST /api/serve/stop` - Stop running workflow server
- `GET /api/serve/status` - Get server status
- `GET /api/serve/check` - Check server health
- `POST /api/serve/kill-process` - Kill process by PID
- `POST /api/serve/kill-port` - Kill process on port
- `POST /api/serve/openapi` - Get OpenAPI spec for running server

### Security
- `GET /api/security/capabilities` - Get security capabilities
- `POST /api/security/generate-policy` - Generate security policy

## UI Access

The integrated UI is served at `/habits/base`. It provides:
- Visual workflow builder
- Module browser and installer
- Form-based action configuration
- Template gallery
- Workflow server management

## Technical Notes

### Dynamic Module Loading

Base uses `createRequire` from Node.js's `module` API for loading modules at runtime, enabling compatibility with bundled code and dynamic path resolution.

### Supported Frameworks

- **Bits**: Custom lightweight modules
- **Script**: Inline script execution

## License

Apache-2.0

## Repository

https://github.com/codenteam/habits
