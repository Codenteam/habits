# DLP and PII Protection

::: warning Intersect Required
This feature requires a cloud or self-hosted [Intersect](https://intersect.site) instance.
:::

Data Loss Prevention (DLP) and Personally Identifiable Information (PII) protection prevents sensitive data from being exposed in workflow inputs, outputs, or logs. Critical for compliance (GDPR, HIPAA) and preventing accidental data leaks.

## How Habits Implements It

- **PII Protection**: Requires only an [intersect.site](https://intersect.site) instance.
- **DLP**: Requires an ICAP server (configuration out of scope for this document).

### Enable PII Protection

Set up your Intersect credentials in `.env`:

```env
INTERSECT_URL=https://your-tenant.intersect.site
INTERSECT_API_KEY=your_api_key

# Optional: DLP ICAP server URL (for enterprise deployments)
HABITS_DLP_ICAP_URL=icap://your-icap-server:1344/scan
HABITS_DLP_ICAP_TIMEOUT=5000
```

Then configure your workflow:
{
  "id": "secure-workflow",
  "habits": {
    "pii": {
      "enabled": true,
      "mode": "redact",
      "targets": ["input", "triggers"]
    }
  }
}
```

### Configuration Options

| Option | Values | Description |
|--------|--------|-------------|
| `mode` | `redact`, `block`, `audit` | Redact PII, block request, or log only |
| `targets` | `input`, `triggers`, `output` | Where to apply scanning |

### DLP with ICAP Integration

For enterprise DLP deployments, configure your ICAP server via environment variables:

```env
HABITS_DLP_ICAP_URL=icap://your-icap-server:1344/scan
HABITS_DLP_ICAP_TIMEOUT=5000
```

| Variable | Default | Description |
|----------|---------|-------------|
| `HABITS_DLP_ICAP_URL` | - | ICAP server URL for enterprise DLP |
| `HABITS_DLP_ICAP_TIMEOUT` | `5000` | Request timeout in milliseconds |

> **Note**: ICAP server setup and configuration is outside the scope of this document.
