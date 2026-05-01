```bash
# Test a single bit action across Node.js and Tauri via the built CLI. Requires pnpm nx build @ha-bits/manage first.
node dist/packages/manage/cli/index.js bit-platform {{bit}} {{action}} --input='{{input}}' --expected='{{expected}}'
```
