# Licensing & Module Compatibility

Understanding license compatibility is **critical** when building automation workflows with Habits. This guide explains what you can and cannot do while keeping your project open source.

::: tip TL;DR
Habits is Apache 2.0. Stick to **Apache 2.0** or **MIT** licensed modules to keep your project freely distributable.
:::

## Habits License

Habits is released under the **Apache License 2.0**, which means:

- <Icon name="check-circle" /> You can use it commercially
- <Icon name="check-circle" /> You can modify and distribute it
- <Icon name="check-circle" /> You can include it in proprietary software
- <Icon name="check-circle" /> You can ship it to customers without royalties
- <Icon name="warning" /> You must include the license and attribution notices

## The Three Levels of Dependency

When using modules from bits, n8n, ActivePieces, or scripts, you need to understand **what you're actually depending on**:

### Level 1: Specs & Types (<Icon name="check-circle" /> Always Safe)

If you're only relying on:
- **Type definitions** (TypeScript interfaces, schemas)
- **API specifications** (REST endpoints, GraphQL schemas)
- **Protocol documentation** (how something works conceptually)

**You are always allowed to do this.** Specifications, types, and API definitions are not copyrightable code, they're descriptions of interfaces.

#### Examples

| Scenario | Status | Explanation |
|----------|--------|-------------|
| Using a TypeScript interface that describes a Slack message format | <Icon name="check-circle" /> Safe | Types describe a structure, not implementation |
| Following the Stripe API documentation to make HTTP calls | <Icon name="check-circle" /> Safe | API specs are factual descriptions |
| Implementing a webhook handler based on documented payload format | <Icon name="check-circle" /> Safe | You're writing your own code |
| Copying a JSON schema for validation | <Icon name="check-circle" /> Safe | Schemas are specifications |

### Level 2: Open Source Modules (<Icon name="check-circle" /> Check the License)

If you're using a **fully open source** module where:
- The source code is available
- The license is permissive (Apache 2.0, MIT, BSD)
- The module is **self-contained** (doesn't require external proprietary code)

**You are allowed to use it freely**, subject to the module's license terms.

#### Examples

| Module | License | Status | Explanation |
|--------|---------|--------|-------------|
| `@activepieces/piece-slack` | MIT | <Icon name="check-circle" /> Safe | MIT is permissive, module is self-contained |
| `@activepieces/piece-openai` | MIT | <Icon name="check-circle" /> Safe | Calls an API, doesn't include proprietary code |
| `@activepieces/piece-text-helper` | MIT | <Icon name="check-circle" /> Safe | Pure utility, no external dependencies |
| Community n8n nodes (check each) | Varies | <Icon name="warning" /> Check | Verify the specific license |

### Level 3: Modules with Proprietary Dependencies (<Icon name="warning" /> Problematic)

**This is where it gets tricky.** A module is problematic if it:

1. **Fetches code** from a non-open-source project at runtime
2. **Requires a proprietary engine** to execute
3. **Dynamically loads** closed-source libraries
4. **Is a thin wrapper** around copyleft (AGPL/GPL) or proprietary code

Using such modules **may convert your project to non-open-source** or require you to comply with restrictive licenses. You can still use the module but with more restrictions like not using it in commercial apps.

#### Examples

| Scenario | Limitation | Problem |
|----------|--------|---------|
| Using `n8n-nodes-base` (core n8n nodes) | <Icon name="x-circle" /> Non Commercial | Uses n8n's "Sustainable Use License" (not OSS) |
| A module that requires an AGPL-licensed library | <Icon name="x-circle" /> Requires releasing source code | AGPL requires you to open-source your entire project |
| A wrapper that calls a GPL tool as a subprocess | <Icon name="warning" /> Careful | May trigger copyleft depending on integration (If statically linked)|

## License Compatibility Matrix

| Module License | Compatible with Apache 2.0? | Can Ship Commercially? | Notes |
|----------------|---------------------------|----------------------|-------|
| **MIT** | <Icon name="check-circle" /> Yes | <Icon name="check-circle" /> Yes | Most permissive, prefer this |
| **Apache 2.0** | <Icon name="check-circle" /> Yes | <Icon name="check-circle" /> Yes | Same as Habits, ideal choice |
| **BSD 2/3-Clause** | <Icon name="check-circle" /> Yes | <Icon name="check-circle" /> Yes | Permissive, minimal restrictions |
| **ISC** | <Icon name="check-circle" /> Yes | <Icon name="check-circle" /> Yes | Equivalent to MIT |
| **MPL 2.0** | <Icon name="warning" /> Partially | <Icon name="warning" /> Partially | File-level copyleft, manageable |
| **LGPL** | <Icon name="warning" /> Partially | <Icon name="warning" /> Partially | Dynamic linking usually OK |
| **GPL** | <Icon name="x-circle" /> No | <Icon name="x-circle" /> No | Copyleft infects your project |
| **AGPL** | <Icon name="x-circle" /> No | <Icon name="x-circle" /> No | Network copyleft, avoid completely |
| **Proprietary** | <Icon name="x-circle" /> No | <Icon name="x-circle" /> No | Cannot redistribute |
| **Fair-Code / Sustainable Use** | <Icon name="x-circle" /> No | <Icon name="x-circle" /> No | n8n-nodes-base uses this |

## Real-World Decision Tree

```
Is the module just types/specs/API docs?
├── Yes → <Icon name="check-circle" /> SAFE: Use it freely
└── No → Is it fully open source?
    ├── No → <Icon name="x-circle" /> AVOID: Proprietary dependency
    └── Yes → What's the license?
        ├── MIT, Apache 2.0, BSD → <Icon name="check-circle" /> SAFE: Use freely
        ├── LGPL, MPL → <Icon name="warning" /> CAREFUL: Check integration type
        └── GPL, AGPL → <Icon name="x-circle" /> AVOID: Copyleft will infect your project
```

## Framework-Specific Guidance

### ActivePieces Pieces

**Recommended <Icon name="check-circle" />**:  Most ActivePieces pieces are MIT licensed.

```bash
# Safe to use
npm install @activepieces/piece-slack
npm install @activepieces/piece-openai
npm install @activepieces/piece-google-sheets
```

ActivePieces pieces are:
- MIT licensed (permissive)
- Opensource Engine (no proprietary runtime)
- Well-maintained and documented

### n8n Nodes

**Use with caution <Icon name="warning" />**: Distinguish between core and community nodes.

::: danger Do NOT Use n8n-nodes-base if you want to use the source code commercially.
The core n8n nodes package (`n8n-nodes-base`) is licensed under n8n's "Sustainable Use License," which is **NOT open source**. Using it will:
- Prevent you from distributing your project commercially 
- Require you to purchase an n8n license for production use
:::

::: tip Community Nodes Are Usually Fine
n8n **community** nodes (tagged `n8n-community-node-package`) are typically MIT or Apache 2.0 licensed. Always verify the specific package's license.
:::

```bash
# <Icon name="x-circle" /> AVOID - Proprietary license
npm install n8n-nodes-base  # DO NOT USE

# <Icon name="check-circle" /> Check first - Community nodes (verify license)
npm install n8n-nodes-chatwoot  # MIT <Icon name="check-circle" />
```

### Scripts

**Generally safe <Icon name="check-circle" />** But verify imports.

Scripts are inline code you write yourself. However, be careful about:
- Libraries you import from npm/PyPI
- External services you call
- Code templates you copy from online sources

## Common Pitfalls to Avoid

### Pitfall 1: The "Thin Wrapper" Trap

```
<Icon name="x-circle" /> Bad: Your workflow uses a node that's MIT-licensed,
   but it downloads and executes proprietary code at runtime.
   
<Icon name="check-circle" /> Good: Use a self-contained MIT node that makes API calls
   to external services (calling an API ≠ incorporating code).
```

### Pitfall 2: Transitive Dependencies

```
<Icon name="x-circle" /> Bad: Package A (MIT) depends on Package B (GPL).
   Your project is now GPL-infected.
   
<Icon name="check-circle" /> Good: Before adding a module, check its full dependency tree:
   npm ls --all @some/package
```

### Pitfall 3: Confusing "Free to Use" with "Open Source"

```
<Icon name="x-circle" /> Bad: "It's on npm and I can install it, so it's open source"
   
<Icon name="check-circle" /> Good: Check the LICENSE file. Look for OSI-approved licenses:
   MIT, Apache 2.0, BSD, ISC
```

## Recommended Modules

Here are modules we recommend for keeping your project safely open source:

### Communication
| Service | Recommended Module | License |
|---------|-------------------|---------|
| Slack | `@activepieces/piece-slack` | MIT |
| Discord | `@activepieces/piece-discord` | MIT |
| Email | `@activepieces/piece-smtp` | MIT |
| Telegram | `@activepieces/piece-telegram-bot` | MIT |

### AI & LLMs
| Service | Recommended Module | License |
|---------|-------------------|---------|
| OpenAI | `@activepieces/piece-openai` | MIT |
| Anthropic | `@activepieces/piece-anthropic` | MIT |

### Data & Storage
| Service | Recommended Module | License |
|---------|-------------------|---------|
| Google Sheets | `@activepieces/piece-google-sheets` | MIT |
| Airtable | `@activepieces/piece-airtable` | MIT |
| PostgreSQL | `@activepieces/piece-postgres` | MIT |

### Utilities
| Function | Recommended Module | License |
|----------|-------------------|---------|
| Text manipulation | `@activepieces/piece-text-helper` | MIT |
| Data transformation | `@activepieces/piece-data-mapper` | MIT |
| HTTP requests | `@activepieces/piece-http` | MIT |

## How to Check a Module's License

### Step 1: Check the package.json

```bash
npm view @some/package license
```

### Step 2: Read the LICENSE file

```bash
# After installing
cat node_modules/@some/package/LICENSE
```

### Step 3: Check for problematic dependencies

```bash
# List all dependencies and their licenses
npx license-checker --start ./node_modules/@some/package
```

### Step 4: Verify it's OSI-approved

Visit [opensource.org/licenses](https://opensource.org/licenses) to confirm the license is truly open source.

## Summary

| What You're Using | Your Project Remains Open Source? |
|-------------------|----------------------------------|
| Specs, types, API documentation | <Icon name="check-circle" /> Yes, always |
| MIT/Apache 2.0 self-contained modules | <Icon name="check-circle" /> Yes |
| GPL/AGPL licensed code | <Icon name="x-circle" /> No, copyleft applies |
| n8n-nodes-base (core n8n) | <Icon name="x-circle" /> No, proprietary license |
| Modules that fetch proprietary code | <Icon name="x-circle" /> No |
| Modules with proprietary runtime dependencies | <Icon name="x-circle" /> No |

::: warning When in Doubt
If you're unsure about a module's licensing implications, **don't use it**. There are plenty of MIT/Apache 2.0 alternatives available. Your peace of mind (and legal safety) is worth the extra effort of finding a compatible module.
:::

## Further Reading

- [Apache License 2.0 Full Text](https://www.apache.org/licenses/LICENSE-2.0)
- [OSI Approved Licenses](https://opensource.org/licenses)
- [Choose a License](https://choosealicense.com/)
- [SPDX License List](https://spdx.org/licenses/)
- [ActivePieces GitHub](https://github.com/activepieces/activepieces) (MIT)
- [n8n Fair-Code Explanation](https://docs.n8n.io/hosting/license/)
