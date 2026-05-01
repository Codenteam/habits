```bash
# Publish Habits (latest)
cd packages/habits && npm version patch --no-git-tag-version && cd ../.. && pnpm nx pack habits && cd dist/packages/habits && npm publish --access public --registry https://registry.npmjs.org/
```
