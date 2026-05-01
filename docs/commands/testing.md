### Run Unit Tests

```bash
# Run Unit Tests
pnpm jest
```

### Run HTTP Tests

```bash
# Run HTTP Tests with httpyac
httpyac http/cortex-tests.http --all
```

### Typecheck All

```bash
# Typecheck All
pnpm nx run-many --target=typecheck
```

### Test Habit

```bash
# Run habit tests on a showcase
pnpm nx test-habit @ha-bits/manage --path={{path}}
```

### Test WebDriver

```bash
# Run WebDriver E2E tests
npx tsx packages/testing/src/cli/index.ts webdriver {{testFile}} --platform {{platform}}
```

### Test Bit (Node.js)

```bash
# Test a single bit action in Node.js — smallest possible command. No build required.
npx tsx scripts/test-bit.ts {{bit}} {{action}} '{{input}}' --expected '{{expected}}'
```

### Test Bit (Tauri)

```bash
# Test a single bit action in Tauri via WebDriver. Add --headless --habit <path> to auto-launch and kill the app.
npx tsx scripts/test-bit-tauri.ts {{bit}} {{action}} '{{input}}' --expected '{{expected}}'
```

### Test Bit (Tauri Headless)

```bash
# Test a single bit action in Tauri — auto-launches the app, runs the test, then kills it. One-shot, no manual steps.
npx tsx scripts/test-bit-tauri.ts --headless --habit {{habitPath}} {{bit}} {{action}} '{{input}}' --expected '{{expected}}'
```

### Test Bit (Cross-Platform)

```bash
# Test a single bit action across Node.js and Tauri via the built CLI. Requires pnpm nx build @ha-bits/manage first.
node dist/packages/manage/cli/index.js bit-platform {{bit}} {{action}} --input='{{input}}' --expected='{{expected}}'
```
