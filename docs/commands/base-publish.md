```bash
# Publish Base
cd packages/base/server && npm version patch --no-git-tag-version && cd ../ui && npm version patch --no-git-tag-version && cd ../../.. && pnpm nx pack @ha-bits/base && cd dist/packages/base && npm publish --registry https://registry.npmjs.org/
```
