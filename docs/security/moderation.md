# Moderation

::: warning Intersect Required
This feature requires a cloud or self-hosted [Intersect](https://intersect.site) instance.
:::

Content moderation filters harmful, inappropriate, or policy-violating content in AI-powered workflows. Essential for user-facing applications to prevent abuse, toxic outputs, or compliance violations.

## How Habits Implements It

Habits uses **Intersect Moderation** to scan inputs and outputs for harmful content.

> **Requires**: Intersect API key

### Enable Moderation

Set up your Intersect credentials in `.env`:

```env
INTERSECT_URL=https://your-tenant.intersect.site
INTERSECT_API_KEY=your_api_key
```

Then configure your workflow:
{
  "id": "moderated-workflow",
  "habits": {
    "moderation": {
      "enabled": true,
    }
  }
}
```

### Stack Configuration

```yaml
# config: stack.yaml (Cortex configuration, not a habit)
security:
  moderation:
    enabled: true
    provider: intersect
    categories:
      - hate
      - violence
      - sexual
      - self-harm
    action: block  # or 'flag'
    threshold: 0.7
```

### Configuration Options

| Option | Values | Description |
|--------|--------|-------------|
| `action` | `block`, `flag` | Block request or flag for review |
| `threshold` | `0.0 - 1.0` | Sensitivity level |
| `categories` | array | Content categories to check |

Flagged or blocked content is logged for audit purposes.
