### Build All

```bash
# Build All (habits + cortex + base)
pnpm nx build habits && pnpm nx build @ha-bits/cortex && pnpm nx build @ha-bits/base
```

### Pack All

```bash
# Pack All (habits + cortex + base)
pnpm nx pack habits && pnpm nx pack @ha-bits/cortex && pnpm nx pack @ha-bits/base
```

### NPM Login

```bash
# NPM Login
npm login --registry https://registry.npmjs.org/
```

### NPM Whoami

```bash
# NPM Whoami
npm whoami --registry https://registry.npmjs.org/
```

### Clean All

```bash
# Clean All (dist + cache)
rm -rf dist && pnpm nx reset
```

### Clean Dist

```bash
# Clean Dist
rm -rf dist
```

### Kill Port 3000

```bash
# Kill Port 3000
lsof -ti:{{port}} | xargs kill -9 2>/dev/null || echo "No process"
```

### Link Local

```bash
# Link cortex into bits, link All Bits into habits, etc
npx tsx scripts/link-local.cts
```

### Unlink Local

```bash
# Unlink
npx tsx scripts/link-local.cts --unlink
```
