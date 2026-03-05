# Publishing @ha-bits/cortex

This guide covers how to publish the `@ha-bits/cortex` package to npm.

## Prerequisites

- Node.js 18+ installed
- pnpm installed
- npm account with access to the `@ha-bits` organization
- Authenticated with npm (`npm login`)

## Publishing Steps

### 1. Update the Version

Before publishing, bump the version in the package.json file:

```bash
# Edit packages/cortex/server/package.json
# Update the "version" field (e.g., from "1.0.4" to "1.0.5")
```

The package.json is located at:
```
packages/cortex/server/package.json
```

Follow [semantic versioning](https://semver.org/):
- **Patch** (1.0.x): Bug fixes, minor changes
- **Minor** (1.x.0): New features, backward compatible
- **Major** (x.0.0): Breaking changes

### 2. Build the Package

Run the build command from the repository root:

```bash
pnpm build:cortex
```

This will:
- Build dependent packages (`@ha-bits/cortex-ui`)
- Bundle the cortex server using esbuild
- Output the built package to `dist/packages/cortex/`

### 3. Publish to npm

Navigate to the dist folder and publish:

```bash
cd dist/packages/cortex
npm publish --access public
```

Or run it all in one command:

```bash
pnpm build:cortex && cd dist/packages/cortex && npm publish --access public
```

### 4. Verify the Publication

After publishing, verify the package is available:

```bash
npm view @ha-bits/cortex
```

Or check on npmjs.com:
```
https://www.npmjs.com/package/@ha-bits/cortex
```

## Package Contents

The published package includes:

| File/Folder | Description |
|-------------|-------------|
| `pack/index.cjs` | Bundled CLI executable |
| `ui/` | Built UI assets for the playground |
| `package.json` | Package metadata |
| `README.md` | Package documentation |

## Troubleshooting

### Error: "You cannot publish over the previously published versions"

You need to bump the version number. npm does not allow republishing the same version.

### Error: "403 Forbidden"

Make sure you are:
1. Logged in to npm (`npm login`)
2. Have publish access to the `@ha-bits` organization
3. Using the correct registry

### Build Failures

If the build fails, try:

```bash
# Clean nx cache
nx reset

# Rebuild
pnpm build:cortex
```

## Automated Publishing (CI/CD)

For automated publishing via GitHub Actions, you'll need:

1. An npm token with publish permissions
2. Add the token as a GitHub secret (`NPM_TOKEN`)
3. Use the token in your workflow:

```yaml
# config: GitHub Actions workflow (CI/CD configuration, not a habit)
- name: Publish to npm
  run: |
    pnpm build:cortex
    cd dist/packages/cortex
    npm publish --access public
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```
