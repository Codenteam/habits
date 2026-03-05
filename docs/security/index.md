# Security

::: warning Intersect Required
Most security features require a cloud or self-hosted [Intersect](https://intersect.site) instance.
:::

Habits provides multiple security layers to protect your workflows and data.

| Feature | Protection | Implementation |
|---------|------------|----------------|
| [Runtime Dependencies](./runtime-dependencies.md) | Dependency sprawl & SBOM/SCA | Minimal deps (5 vs 99+) |
| [DLP & PII Protection](./dlp-pii-protection.md) | Sensitive data exposure | Intersect for PIIs + ICAP for other DLP related tasks |
| [Supply Chain Integrity](./supply-chain-integrity.md) | Malicious dependencies | Node.js Policy Files |
| [Capabilities & Permissions](./capabilities-permissions.md) | Unauthorized resource access | Node.js Permissions Model |
| [Moderation](./moderation.md) | Harmful content | Intersect Moderation |
| [Cortex-Only Deployment](./cortex-deployment.md) | Reduced attack surface | Minimal runtime package |

## Quick Start

Enable all security features in your stack:

1. Create a `security` folder next to your config:

```
your-project/
├── config.json
├── security/
│   ├── config.json    # Permissions configuration
│   └── policy.json    # Integrity hashes
└── workflows/
```

2. Set environment variables:

```bash
# DLP, PII, and Moderation (scans input data)
HABITS_DLP_ENABLED=true
HABITS_DLP_ICAP_URL=icap://your-icap-server:1344/scan  # Optional: enterprise ICAP
HABITS_PII_PROTECTION=replace  # or 'log', 'eradicate'
HABITS_MODERATION_ENABLED=true

# Supply Chain Integrity (policy enforcement)
HABITS_SECURITY_POLICY_ENABLED=true

# Capabilities & Permissions (Node.js sandbox)
HABITS_SECURITY_CAPABILITIES_ENABLED=true
```

3. Configure permissions in `security/config.json`:

```json
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

4. Run Cortex:

```bash
habits cortex --config ./config.json
```

The security wrapper automatically detects the `security/` folder and applies the appropriate Node.js flags.

## Server Configuration (Export/Deploy)

When deploying Cortex, configure security features via environment variables. All security features are **disabled by default**.

### Environment Variables Reference

| Variable | Default | Values | Description |
|----------|---------|--------|-------------|
| `HABITS_DLP_ENABLED` | `false` | `true`, `false` | Enable Data Loss Prevention scanning |
| `HABITS_DLP_ICAP_URL` | - | URL | ICAP server URL for enterprise DLP |
| `HABITS_DLP_ICAP_TIMEOUT` | `5000` | Number (ms) | ICAP request timeout |
| `HABITS_PII_PROTECTION` | - | `log`, `eradicate`, `replace` | PII protection mode |
| `HABITS_MODERATION_ENABLED` | `false` | `true`, `false` | Enable content moderation |
| `HABITS_SECURITY_POLICY_ENABLED` | `false` | `true`, `false` | Enable supply chain integrity |
| `HABITS_SECURITY_CAPABILITIES_ENABLED` | `false` | `true`, `false` | Enable Node.js permissions model |

### Example `.env` File

```env
# =============================================================================
# SECURITY CONFIGURATION (all disabled by default)
# =============================================================================

# Intersect Connection (required for DLP, PII, Moderation)
INTERSECT_URL=
INTERSECT_API_KEY=

# DLP (Data Loss Prevention)
HABITS_DLP_ENABLED=false
HABITS_DLP_ICAP_URL=
HABITS_DLP_ICAP_TIMEOUT=5000

# PII Protection (leave empty to disable)
# Options: log, eradicate, replace
HABITS_PII_PROTECTION=

# Content Moderation
HABITS_MODERATION_ENABLED=false

# Supply Chain Integrity (requires security/policy.json)
HABITS_SECURITY_POLICY_ENABLED=false

# Capabilities & Permissions (requires security/config.json)
HABITS_SECURITY_CAPABILITIES_ENABLED=false
```

### Docker Compose Example

```yaml
# config: docker-compose.yaml (Docker configuration, not a habit)
services:
  cortex:
    image: habits-cortex:latest
    environment:
      # Intersect connection
      - INTERSECT_URL=${INTERSECT_URL}
      - INTERSECT_API_KEY=${INTERSECT_API_KEY}
      # Security features (all off by default)
      - HABITS_DLP_ENABLED=false
      - HABITS_DLP_ICAP_URL=
      - HABITS_PII_PROTECTION=
      - HABITS_MODERATION_ENABLED=false
      - HABITS_SECURITY_POLICY_ENABLED=false
      - HABITS_SECURITY_CAPABILITIES_ENABLED=false
    volumes:
      - ./security:/app/security:ro
```
