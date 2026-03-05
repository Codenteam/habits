# When to Use Habits

Habits is a **lightweight runtime engine**, not a full automation platform like n8n or ActivePieces. It's designed for specific scenarios where you need a minimal, embeddable, or serverless-friendly execution layer.

## ✅ When to Use Habits

### Serverless & Edge Deployments

You need to run automations in lightweight environments:
- AWS Lambda, Google Cloud Functions, Azure Functions
- Cloudflare Workers, Vercel Edge Functions
- Docker containers with minimal footprint
- IoT devices or embedded systems

### Building SaaS Products

You want to bundle automation with a frontend to create complete web applications:
- Ship automation as a product feature
- White-label workflow execution (Make sure all used nodes and depedencies licenses allow that)
- Embed automation in your existing app

### Fully Open-Source Stack

You need a 100% open-source solution:
- Habits (Apache 2.0) + ActivePieces pieces (MIT) = fully open-source
- No fair-code or AGPL restrictions
- Complete freedom to modify and distribute

### Mixed Framework Workflows

You want to combine modules from different automation frameworks:

```json
{
  "nodes": [
    { "type": "activepieces", "data": { "module": "@activepieces/piece-http" } },
    { "type": "n8n", "data": { "module": "n8n-nodes-text-manipulation" } },
    { "type": "script", "data": { "params": { "language": "python3" } } }
  ]
}
```

### License Freedom

You need a fully **Apache 2.0 licensed** runner that you can:
- Embed in commercial products
- Distribute to customers without restrictions
- Modify without source-available obligations

::: info License Comparison
| Platform | License |
|----------|---------|
| **Habits** | Apache 2.0 ✅ |
| ActivePieces | MIT ✅ |
| n8n | Sustainable Use License (fair-code) |
:::

### Distribution to Customers

You want to ship automation workflows to your customers:
- No per-seat licensing concerns
- Full control over the runtime
- White-label capability

### Multiple Triggers in ActivePieces

You need ActivePieces workflows with multiple webhook or scheduled triggers (not supported natively in ActivePieces).

### Custom Execution Flow

You need:
- Out-of-order node execution
- Conditional branching based on runtime data
- Custom retry and error handling logic

### Automation with REST and CLI support

You want to run workflows as CLI commands for:
- CI/CD pipelines
- Cron jobs
- Shell scripts

### Native Execution Mode

Habits runs n8n or ActivePieces modules using their actual runtime dependencies — useful when you need exact behavior matching with the original platforms.

---

## ❌ When NOT to Use Habits

### You Need a Full Visual Builder

If you're starting from scratch and need a complete visual workflow designer with all the bells and whistles, use **n8n** or **ActivePieces** directly. Habits' Base is experimental and not meant to replace mature workflow builders.

### You Want a Managed Platform

If you prefer a hosted solution with built-in monitoring, user management, and team features, use the cloud offerings from n8n or ActivePieces.

### You Don't Need Lightweight Deployment

If you're running on traditional servers with plenty of resources, the full n8n or ActivePieces platforms may be more suitable.

---

## License Mixing Considerations

When combining modules from different sources, the **most restrictive license applies** to your distribution:

| Module Source | License | Distribution Impact |
|--------------|---------|---------------------|
| Habits core | Apache 2.0 | No restrictions |
| ActivePieces pieces | MIT | No restrictions |
| Community n8n nodes | Usually MIT | Check each package |
| n8n-nodes-base | SUL | Cannot redistribute |

::: danger License Warning
Using non-Apache/MIT modules may impose license restrictions on your entire solution. Always verify the license of each module you use.
:::


## Next Steps

- [Running Habits](/deep-dive/running): Get Habits up and running
- [Creating Habits](/deep-dive/creating): Build your own automation workflows
- [Licensing](/extra-reading/licensing): Understanding module licenses
