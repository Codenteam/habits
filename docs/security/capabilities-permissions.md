# Capabilities and Permissions

::: warning Intersect Required
This feature requires a cloud or self-hosted [Intersect](https://intersect.site) instance.
:::

Capabilities restrict what workflows can access: filesystem, network, child processes, environment variables. Prevents malicious or buggy nodes from accessing resources they shouldn't.

## How Habits Implements It

Habits uses the **Node.js Permissions Model** to sandbox workflow execution. The security wrapper automatically applies these permissions when starting Cortex.

### Enable Permissions

1. Create a `security` folder next to your config file
2. Add a `config.json` file with permissions:

```
your-project/
├── config.json
├── security/
│   └── config.json
└── workflows/
```

```json
// security/config.json
{
  "permission": {
    "allow-fs-read": ["./foo"],
    "allow-fs-write": ["./bar"],
    "allow-child-process": true,
    "allow-worker": true,
    "allow-net": true,
    "allow-addons": false
  }
} 
```

3. Set the environment variable:

```bash
export HABITS_SECURITY_CAPABILITIES_ENABLED=true
```

### Run with Permissions

```bash
# The security wrapper automatically detects security/config.json
HABITS_SECURITY_CAPABILITIES_ENABLED=true habits cortex --config ./config.json
```

### Configuration Options

| Flag | Description |
|------|-------------|
| `allow-fs-read=<path>` | Allow reading from specific paths |
| `allow-fs-write=<path>` | Allow writing to specific paths |
| `allow-net=<host>` | Allow network access to specific hosts |
| `allow-child-process` | Allow spawning child processes |
| `allow-worker` | Allow worker threads |

Without explicit permission, operations are denied at runtime.
