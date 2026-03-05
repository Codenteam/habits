# Supply Chain Integrity

::: warning Intersect Required
This feature requires a cloud or self-hosted [Intersect](https://intersect.site) instance.
:::

Supply chain attacks inject malicious code into dependencies, compromising your workflows without touching your code. This includes npm package hijacking, dependency confusion, and compromised modules.

## How Habits Implements It

Habits uses **Node.js Policy Files** to enforce integrity checks on all loaded modules. The security wrapper automatically applies these policies when starting Cortex.

### Enable Integrity Verification

1. Create a `security` folder next to your config file
2. Add a `policy.json` file with integrity hashes:

```
your-project/
├── config.json
├── security/
│   └── policy.json
└── workflows/
```

```json
// security/policy.json
{
  "onerror": "log",
  "resources": {
    "./node_modules/@activepieces/piece-http/dist/index.js": {
      "integrity": "sha384-ABC123...",
      "dependencies": true
    }
  }
}
```

3. Set the environment variable:

```bash
export HABITS_SECURITY_POLICY_ENABLED=true
```

### Run with Policy Enforcement

```bash
# The security wrapper automatically detects security/policy.json
HABITS_SECURITY_POLICY_ENABLED=true habits cortex --config ./config.json
```

### Generate Integrity Hashes

```bash
habits integrity generate ./node_modules > security/policy.json
```

Node.js will refuse to load any module that doesn't match its declared hash, blocking tampered dependencies at runtime.
