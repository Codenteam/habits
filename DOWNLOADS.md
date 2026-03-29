# Downloads Distribution - Quick Reference

This is a quick reference for the downloads distribution system. For detailed documentation, see [downloads-distribution.md](./development/downloads-distribution.md).

## System Overview

The downloads system manages two types of files:

1. **Cortex App Binaries** → GitHub Releases (DMG, APK, EXE, AppImage, IPA)
2. **Habit Bundles** → `docs/public/downloads/` (`.habit` and `.zip` files)

Both are unified via `downloads-manifest.json` and displayed on the downloads page.

## Quick Actions

### Release a New Version

```bash
# Tag and push
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions automatically builds and releases
```

### Add a Habit Bundle

```bash
# Generate .habit file
npx habits pack --format habit --config showcase/your-habit/stack.yaml \
  -o docs/public/downloads/your-habit.habit

# Or create ZIP
cd showcase/your-habit && zip -r ../../docs/public/downloads/your-habit.zip .

# Commit and push
git add docs/public/downloads/
git commit -m "Add your-habit bundle"
git push origin main
```

### Test Locally

```bash
# Generate manifest
npx tsx scripts/generate-downloads-manifest.ts

# View output
cat docs/public/downloads-manifest.json | jq

# Test download page
cd docs && npm run dev
# Visit http://localhost:5173/downloads
```

## File Structure

```
habits/
├── .github/workflows/
│   ├── create-habits-cortex-app.yml   # Builds & releases binaries
│   └── deploy-docs.yml                # Deploys docs + generates manifest
├── scripts/
│   └── generate-downloads-manifest.ts # Creates downloads-manifest.json
├── docs/
│   ├── downloads.md                   # Download page (Vue component)
│   └── public/
│       ├── downloads/                 # Static habit bundles
│       └── downloads-manifest.json    # Generated manifest API
└── habits-cortex/
    └── build-release.ts               # Cross-platform build script
```

## Key URLs

- **Download Page:** `https://your-domain.com/downloads`
- **Manifest API:** `https://your-domain.com/downloads-manifest.json`
- **GitHub Releases:** `https://github.com/org/repo/releases`
- **Habit Bundles:** `https://your-domain.com/downloads/*.{zip,habit}`

## Configuration

### Update Repository Info

Edit `scripts/generate-downloads-manifest.ts`:

```typescript
const REPO_OWNER = 'your-org';  // Change this
const REPO_NAME = 'habits';     // Change this
```

### Add/Remove Platforms

Edit `PLATFORM_CONFIGS` in `scripts/generate-downloads-manifest.ts`:

```typescript
const PLATFORM_CONFIGS = {
  android: { description: 'Android 8.0+', icon: 'android' },
  // ... add more platforms
};
```

## Secrets Required

Set these in GitHub: **Settings → Secrets and variables → Actions**

| Secret | Purpose | Platforms |
|--------|---------|-----------|
| `APPLE_SIGNING_IDENTITY` | Certificate name | macOS, iOS |
| `APPLE_CERTIFICATE_BASE64` | .p12 file | macOS, iOS |
| `APPLE_CERTIFICATE_PASSWORD` | Cert password | macOS, iOS |
| `ANDROID_KEYSTORE_BASE64` | Keystore file | Android |
| `ANDROID_KEY_PASSWORD` | Key password | Android |
| `WINDOWS_CERTIFICATE_BASE64` | .pfx file | Windows |
| `WINDOWS_CERTIFICATE_PASSWORD` | Cert password | Windows |

For complete list, see [downloads-distribution.md](./development/downloads-distribution.md#environment-variables).

## Workflow Diagram

```
Tag Push (v*) ──┐
                │
                ▼
        ┌───────────────┐
        │  Build & Sign │
        │  All Platforms│
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ GitHub Release│
        │  (Binaries)   │
        └───────┬───────┘
                │
Push to main ───┤
                │
                ▼
        ┌───────────────┐
        │  Deploy Docs  │
        │  + Generate   │
        │   Manifest    │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Download Page │
        │  (Fetches via │
        │   Manifest)   │
        └───────────────┘
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No releases found | Create first release or push a tag |
| "Coming Soon" for all platforms | Verify build artifacts uploaded correctly |
| Page shows loading forever | Check browser console, verify manifest exists |
| Build fails | Review logs, verify secrets are set |
| Rate limit exceeded | Set `GITHUB_TOKEN` environment variable |

## Learn More

- **Full Documentation:** [downloads-distribution.md](./development/downloads-distribution.md)
- **Build Script:** [habits-cortex/build-release.md](../habits-cortex/build-release.md)
- **CI/CD Workflows:** [.github/workflows/](.github/workflows/)
