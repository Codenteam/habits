### Build One Bit

```bash
# Build One Bit (e.g., bit-example)
pnpm nx build @ha-bits/{{bitName}}
```

### Publish Bit to Verdaccio

```bash
# Publish Bits to Verdaccio (local registry)
pnpm nx publish-verdaccio @ha-bits/{{bitName}}
```

### Publish Bit to npm

```bash
# Publish Bits to npm
cd nodes/bits/@ha-bits/{{bitName}} && npm version patch --no-git-tag-version && cd ../../../../.. && pnpm nx build @ha-bits/{{bitName}} && cd nodes/bits/@ha-bits/{{bitName}} && npm publish --access public --registry https://registry.npmjs.org/
```

### Bits Converter CLI

```bash
# Bits Converter CLI
npx tsx bits-creator/src/cli.ts
```

### Bits Creator Server (AI)

```bash
# Bits Creator Server (AI mode)
npx tsx bits-creator/server/src/main.ts
```

### Bits Creator Server (Mock)

```bash
# Bits Creator Server (Mock)
MOCK_MODE=true npx tsx bits-creator/server/src/main.ts
```
