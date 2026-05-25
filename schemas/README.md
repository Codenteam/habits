# Habits Schemas

Authoritative JSON Schemas for the file formats used across Habits.

| Schema                   | Applies to                                       | Notes                                                       |
| ------------------------ | ------------------------------------------------ | ----------------------------------------------------------- |
| `stack.schema.yaml`      | `stack.yaml` at the root of every habit package  | Workflows, server config, and metadata.                     |
| `habits.schema.yaml`     | Individual workflow files (`habits/*.yaml`)      | Steps, bits, env, triggers.                                 |
| `showcase.schema.yaml`   | `showcase.yaml` inside `showcase/*` directories  | Marketing metadata used by the docs site.                   |
| `ui-spec.schema.yaml`    | `frontend/index.yaml` inside any habit           | **Declarative UI** compiled to HTML by `@ha-bits/cortex-core`. |
| `marketplace.schema.yaml`| Marketplace listings                             |                                                             |
| `test.schema.yaml`       | `test.yaml` files                                | Workflow assertions.                                        |
| `activepieces.schema.json` / `n8n.schema.json` | Importers for external automation platforms. |                                                             |

## Validating a UiSpec

Most editors accept either an inline `# yaml-language-server` directive
or a project-level mapping. To opt a single file in, prepend:

```yaml
# yaml-language-server: $schema=../../../schemas/ui-spec.schema.yaml
version: 1
meta:
  id: my-habit
  title: My Habit
  ...
```

Or, for a workspace-wide mapping in `.vscode/settings.json`:

```json
{
  "yaml.schemas": {
    "./schemas/ui-spec.schema.yaml": [
      "showcase/*/frontend/index.yaml",
      "showcase/*/frontend/ui.yaml"
    ],
    "./schemas/stack.schema.yaml": ["**/stack.yaml"],
    "./schemas/showcase.schema.yaml": ["showcase/**/showcase.yaml"]
  }
}
```

CLI validation with `ajv` (or any JSON Schema validator) is also fine:

```bash
pnpm dlx ajv-cli validate -s schemas/ui-spec.schema.yaml \
  -d "showcase/*/frontend/index.yaml"
```

For the canonical source of widget shapes referenced by the UiSpec, see
`packages/cortex/core/src/ui/types.ts`.
