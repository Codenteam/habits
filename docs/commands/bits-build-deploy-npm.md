```bash
# Bump version, build, and publish a specific bit to npm (public registry)
cd nodes/bits/@ha-bits/{{bitName}} && npm version patch --no-git-tag-version && cd ../.. && pnpm nx build @ha-bits/{{bitName}} && cd '@ha-bits/{{bitName}}' && npm publish --access public --registry https://registry.npmjs.org/
```
