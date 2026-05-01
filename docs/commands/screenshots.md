### Generate Store Screenshots

```bash
# Capture and process Tauri app store screenshots (automate + frame)
npx tsx packages/manage/forge/run-all.cts
```

### Generate Docs Screenshots

```bash
# Capture Base, Cortex, Admin screenshots for the docs site
npx tsx packages/manage/forge/generate-docs-screenshots.ts {{extra}}
```

### Generate Get-Started Screenshots

```bash
# Capture all "Get Started" screenshots used in the landing page
npx tsx packages/manage/forge/generate-get-started-shots.ts {{extra}}
```

### Start Base Server

```bash
# Start the Base UI server on port 3000
pnpm nx dev @ha-bits/base
```

### Start Cortex Server

```bash
# Start a Cortex server with a given config
pnpm nx dev @ha-bits/cortex --config {{config}}
```

### Start Tauri Dev (webdriver)

```bash
# Start habits-cortex in dev mode (exposes webdriver on port 9987)
cd habits-cortex && npm run dev
```

### Screenshot Webpage

```bash
# Take a screenshot of any URL and save as .webp
npx tsx packages/manage/forge/src/screenshots/cli.ts webpage --url {{url}} --out {{out}}
```

### Screenshot HTML Template

```bash
# Render a local HTML template and save as .webp
npx tsx packages/manage/forge/src/screenshots/cli.ts template --path {{path}} --out {{out}}
```

### Screenshot Code Snippet

```bash
# Render a code snippet with syntax highlighting and save as .webp
npx tsx packages/manage/forge/src/screenshots/cli.ts code-snippet --lang {{lang}} --code {{code}} --out {{out}}
```

### Screenshot Store Listing

```bash
# Screenshot an app store listing page (e.g. Google Play) and save as .webp
npx tsx packages/manage/forge/src/screenshots/cli.ts store-listing --url {{url}} --out {{out}}
```
