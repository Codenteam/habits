# Cortex-Only Deployment

For production environments with strict security requirements, use `npx @ha-bits/cortex` directly instead of the full `npx habits` CLI package, preferably in a docker. 

## Why Use Cortex Directly?

The `habits` package includes development tools, CLI utilities, base, and the full codebase needed for authoring and testing workflows. While convenient for development, this increases the attack surface in production and bloat the binaries:

| Package | Purpose | Includes |
|---------|---------|----------|
| `habits` | Development & authoring | CLI, dev tools, templates, full source |
| `@ha-bits/cortex` | Production runtime | Execution engine only |

### Security Benefits

1. **Reduced Attack Surface** – Cortex ships only the execution engine, eliminating unnecessary code paths that could be exploited
2. **Smaller Dependency Tree** – Fewer dependencies means fewer potential vulnerabilities to track and patch
3. **No Development Tools** – Debugging utilities, template generators, and authoring tools aren't exposed in production
4. **Faster Security Audits** – Smaller codebase is easier to audit and certify for compliance

## Installation

Install only the Cortex runtime for production:

```bash
# Production deployment
npm install @ha-bits/cortex

# Or with pnpm
pnpm add @ha-bits/cortex
```

### Binary

```bash
npx @ha-bits/cortex server --config ./config.json
```

## Docker Deployment

For containerized deployments, create a minimal production image:

```dockerfile
FROM node:20-slim

WORKDIR /app

# Install only production runtime
RUN npm install @ha-bits/cortex

# Copy only required files
COPY config.json .
COPY security/ ./security/
COPY workflows/ ./workflows/

# Run Cortex
CMD ["npx", "@ha-bits/cortex", "server", "--config", "./config.json"]
```

### Multi-Stage Build

Separate development and production stages:

```dockerfile
# Build stage (with full habits for validation)
FROM node:20 AS build
WORKDIR /app
RUN npm install habits
COPY . .
RUN habits validate ./workflows/

# Production stage (minimal runtime)
FROM node:20-slim AS production
WORKDIR /app
RUN npm install @ha-bits/cortex
COPY --from=build /app/config.json .
COPY --from=build /app/workflows/ ./workflows/
COPY --from=build /app/security/ ./security/
CMD ["npx", "cortex", "serve", "--config", "./config.json"]
```

## Comparison

| Aspect | `habits` | `@ha-bits/cortex` |
|--------|----------|-------------------|
| Package size | ~50MB | ~15MB |
| Dependencies | ~200 | ~50 |
| CLI tools | ✓ | ✗ |
| Template authoring | ✓ | ✗ |
| Workflow execution | ✓ | ✓ |
| Security features | ✓ | ✓ |
| Recommended for | Development | Production |

## Best Practices

1. **Use `habits` in development** – Take advantage of the full toolset for authoring, testing, and debugging workflows including base builder.
2. **Deploy `@ha-bits/cortex` in production** – Minimize the runtime footprint and attack surface
3. **Validate before deployment** – Use the `habits validate` command in your CI/CD pipeline before deploying Cortex
4. **Combine with other security features** – Cortex supports all security features (DLP, capabilities, integrity policies)

::: tip
Using Cortex doesn't reduce functionality, it only removes development-time tooling. All runtime capabilities remain fully available.
:::
