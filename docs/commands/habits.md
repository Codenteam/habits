### Pack to .habit

```bash
# Pack a showcase to .habit file
pnpm nx run habits pack --format habit --config {{config}}
```

### Pack with .env

```bash
# Pack with .env values included (YOU MUST KNOW WHAT YOU ARE DOING!!!)
pnpm nx dev habits pack --format habit --config {{config}} --include-env
```

### Build Habits

```bash
# Build Habits
pnpm nx build habits
```

### Pack Habits

```bash
# Pack Habits
pnpm nx pack habits
```

### Publish Habits (latest)

```bash
# Publish Habits (latest)
cd packages/habits && npm version patch --no-git-tag-version && cd ../.. && pnpm nx pack habits && cd dist/packages/habits && npm publish --access public --registry https://registry.npmjs.org/
```

### Publish Habits @next

```bash
# Publish Habits @next
cd packages/habits && npm version patch --no-git-tag-version && cd ../.. && pnpm nx pack habits && cd dist/packages/habits && npm publish --access public --registry https://registry.npmjs.org/ --tag next
```

### Run Example

```bash
# Run Example (e.g., hello-world)
pnpm nx cortex habits --config {{config}}
```
