---
title: Runtime Dependencies & Supply Chain Security
---

# Runtime Dependencies & Supply Chain Security

Modern automation platforms have become a security blind spot. With hundreds of nodes, thousands of dependencies implementing SBOM, SCA, and SAST becomes nearly impossible.

## Why This Breaks Security Tooling

| Tool | Purpose | Habits (89 deps) | Others (~2,000 deps) |
|------|---------|------------------|----------------------|
| **SBOM** | Catalog dependencies | Seconds, complete | Hours, incomplete |
| **SCA** | Scan for CVEs | Manageable alerts | Alert fatigue |
| **SAST** | Static analysis | Predictable | Defeated by dynamic installs |

**Additional challenges with traditional platforms:**
- Dynamic node installation at runtime
- Arbitrary code execution in Code nodes
- Hidden transitive dependencies from community packages

## How Habits Solves This

1. **Minimal footprint**: minimal auditable dependencies.
2. **Pre-validated modules**: Bits can be compared with hashes in realtime using @codenteam/intersect.
3. **Workflow validation**: Cortex validates workflows before execution with configurable policies
4. **Supply chain verification**: Node.js Policy Files block unauthorized dependencies

Combined with [Supply Chain Integrity](./supply-chain-integrity.md), you get realistic SBOM generation, effective vulnerability scanning, and auditable workflows.

## Quick Start

```bash
# Audit your current stack
npm ls --all | wc -l

# Enable Habits security
export HABITS_SECURITY_POLICY_ENABLED=true
export HABITS_SECURITY_CAPABILITIES_ENABLED=true
```

## Further Reading

- [Supply Chain Integrity](./supply-chain-integrity.md)
- [Capabilities & Permissions](./capabilities-permissions.md)
- [Cortex-Only Deployment](./cortex-deployment.md)
