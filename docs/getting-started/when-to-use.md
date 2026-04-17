# When to Use Habits

Habits is a **lightweight runtime engine** designed for specific scenarios where you need a minimal, embeddable, or serverless-friendly execution layer.

## <Icon name="check-circle" /> When to Use Habits

### Serverless & Edge Deployments

You need to run automations in lightweight environments:
- AWS Lambda, Google Cloud Functions, Azure Functions
- Cloudflare Workers, Vercel Edge Functions
- Docker containers with minimal footprint
- IoT devices or embedded systems

### Building SaaS Products

You want to bundle automation with a frontend to create complete web applications:
- Ship automation as a product feature
- White-label workflow execution
- Embed automation in your existing app

### Fully Open-Source Stack

You need a 100% open-source solution:
- Habits (AGPL-3.0) + Bits (MIT) = fully open-source
- Strong copyleft ensures modifications stay open
- Complete freedom to modify and distribute

### Combining Bits and Scripts

You want to combine pre-built integrations with custom logic:

```json
{
  "nodes": [
    { "type": "bits", "data": { "module": "@ha-bits/bit-http" } },
    { "type": "bits", "data": { "module": "@ha-bits/bit-openai" } },
    { "type": "script", "data": { "params": { "language": "python3" } } }
  ]
}
```

### License Freedom

You need a fully **AGPL-3.0 licensed** runner that you can:
- Use in commercial products (with source disclosure)
- Distribute to customers with the same license
- Modify with source-available obligations

### Distribution to Customers

You want to ship automation workflows to your customers:
- No per-seat licensing concerns
- Full control over the runtime
- White-label capability

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

---

## <Icon name="x-circle" /> When NOT to Use Habits

### You Need a Full Visual Builder

If you're starting from scratch and need a complete visual workflow designer with all the bells and whistles, Habits' Base is experimental and may not have all features of mature workflow builders.

### You Want a Managed Platform

If you prefer a hosted solution with built-in monitoring, user management, and team features, consider cloud automation platforms.

### You Don't Need Lightweight Deployment

If you're running on traditional servers with plenty of resources, full automation platforms may be more suitable.

---

## License Considerations

All Habits core and Bits are open-source:

| Module Source | License | Distribution Impact |
|--------------|---------|---------------------|
| Habits core | AGPL-3.0 | Source disclosure required |
| Habits bits | MIT | No restrictions |

## Next Steps

- [Running Habits](/deep-dive/running): Get Habits up and running
- [Creating Habits](/deep-dive/creating): Build your own automation workflows
