```bash
# Test a single bit action in Tauri — auto-launches the app, runs the test, then kills it. One-shot, no manual steps.
npx tsx scripts/test-bit-tauri.ts --headless --habit {{habitPath}} {{bit}} {{action}} '{{input}}' --expected '{{expected}}'
```
