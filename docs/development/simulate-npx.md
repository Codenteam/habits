# Simulate npx Locally

Test a package locally before publishing to npm.

## Steps

```bash
# 1. Build the package (includes UI dependency)
pnpm nx build @ha-bits/base-server
pnpm nx build @ha-bits/cortex-server

# 2. Pack with ncc
pnpm nx pack @ha-bits/base-server
pnpm nx pack @ha-bits/cortex-server

# 3. Run from dist folder
cd dist/packages/base
node pack/index.cjs
```

## Npx from local directory 

```bash
# Use ./path to local package followed by the bin command name
npx --yes ./dist/packages/base @ha-bits/base
npx --yes ./dist/packages/cortex cortex
```

## Verify

```bash
# API
curl http://localhost:3000/api/

# UI
curl http://localhost:3000/
```

## Publish

```bash
pnpm nx publish @ha-bits/base-server
pnpm nx publish @ha-bits/cortex-server
```
