```bash
# Publish Bits to npm
cd nodes/bits/@ha-bits/{{bitName}} && npm version patch --no-git-tag-version && cd ../../../../.. && pnpm nx build @ha-bits/{{bitName}} && cd nodes/bits/@ha-bits/{{bitName}} && npm publish --access public --registry https://registry.npmjs.org/
```
