```bash
# Publish Cortex
cd packages/cortex/server && npm version patch --no-git-tag-version && cd ../ui && npm version patch --no-git-tag-version && cd ../../.. && pnpm nx pack @ha-bits/cortex && cd dist/packages/cortex && npm publish --registry https://registry.npmjs.org/
```
