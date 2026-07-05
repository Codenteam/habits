# Pack & Distribute (.habit)

Export your habits as a `.habit` file for import into **Habits Cortex** on desktop and mobile.

## Overview

The pack command packages your `stack.yaml`, habit workflows, optional frontend, and an embedded `cortex-bundle.js` into a single portable ZIP archive.

| Format | Description | Status |
|--------|-------------|--------|
| `habit` | Self-contained `.habit` ZIP for Habits Cortex | Available |

For server-side hosting, run `npx habits cortex --config ./stack.yaml` instead of exporting from Base.

See the [`.habit` format specification](/dot-habit) for archive layout details.

---

## Using the Base UI

1. Open the **Export/Deploy** modal in Habits Base UI
2. Click **Generate .habit File**
3. Import the downloaded file into Habits Cortex

![Binary Export UI](/images/export.webp)

---

## Using the CLI

```bash
npx habits pack --config ./stack.yaml --format habit
```

**CLI options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--config` | Path to `stack.yaml` | Required |
| `--output` | Output path for `.habit` file | `./dist/<name>.habit` |
| `--format` | Must be `habit` | `habit` |
| `--include-env` | Include `.env` values in bundle | `false` |
| `--skip-bundle` | Skip `cortex-bundle.js` generation | `false` |

---

## Distribution workflow

1. **Author** — Build habits in Base (`npx habits base`) or edit `stack.yaml` directly
2. **Pack** — `habits pack --format habit`
3. **Import** — Open Habits Cortex and import the `.habit` file
4. **Run** — Execute workflows offline in the Cortex app

For programmatic server execution, use `npx habits cortex` with your `stack.yaml` or Cortex Docker images.

---

## Related

- [`.habit` format](/dot-habit) — Full archive specification
- [Running habits](/deep-dive/running) — Cortex server and CLI execution
- [Mobile app recipe](/recipes/mobile-app) — Importing `.habit` files on device
