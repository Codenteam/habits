# Licensing

This document explains the licensing of Habits and its components.

## Habits Core

Habits is licensed under **AGPL-3.0** (GNU Affero General Public License v3.0), a strong copyleft license that:

- Allows commercial use
- Requires source disclosure for modifications
- Requires network use to provide source (the "network clause")
- Ensures the software stays open source

## Habits Bits

All official Habits bits (modules) are licensed under **MIT**, which is fully permissive and compatible with commercial use.

| Component | License |
|-----------|---------|
| Habits Core | AGPL-3.0 |
| @ha-bits/* packages | MIT |

## What This Means for You

### Commercial Use ✅

You can:
- Use Habits in commercial products
- Distribute Habits to customers
- Charge for services built with Habits

### Source Disclosure Required

AGPL-3.0 requires you to:
- Include the license notice
- Provide attribution
- Make source code available if you distribute modified versions
- Provide source access to users interacting over a network (AGPL network clause)

## Dependency Licensing

When adding npm packages to your workflows, always verify their licenses. The workflow's effective license is the most restrictive of all included dependencies.

::: tip Best Practice
Stick to MIT, BSD, or Apache 2.0-licensed packages for bits to maintain permissive licensing for your integrations.
:::

## Next Steps

- [Getting Started](/getting-started/introduction) - Learn about Habits
- [Creating Habits](/deep-dive/creating) - Build your first workflow
