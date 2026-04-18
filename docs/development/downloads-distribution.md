# Downloads Distribution System

This document describes how the downloads distribution system works for the Habits project.

## Overview

The distribution system manages two types of downloads:

1. **Cortex App Binaries** - Native desktop and mobile applications (DMG, EXE, APK, AppImage, IPA)
2. **Habit Bundles** - Pre-packaged habit files (`.habit` and `.zip` files)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Actions CI/CD                     │
└─────────────────────────────────────────────────────────────┘
           │                                    │
           │ Push Tag (v=release/*)                      │ Push to main
           ▼                                    ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│  create-habits-cortex-   │      │     deploy-docs.yml      │
│       app.yml            │      │                          │
├──────────────────────────┤      ├──────────────────────────┤
│ • Build macOS/iOS        │      │ • Build documentation    │
│ • Build Android          │      │ • Generate showcase      │
│ • Build Windows          │      │ • Generate .habit files  │
│ • Build Linux            │      │ • Generate manifest      │
│ • Create GitHub Release  │      │ • Deploy to server       │
└──────────────────────────┘      └──────────────────────────┘
           │                                    │
           │ Upload artifacts                   │ Generate manifest
           ▼                                    ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│   GitHub Releases API    │◄─────┤  downloads-manifest.json │
│  (versioned binaries)    │ Fetch├──────────────────────────┤
└──────────────────────────┘      │ docs/public/downloads/   │
           │                      │  ├─ mixed.zip            │
           │                      │  ├─ ai-journal.zip       │
           │                      │  └─ ...                  │
           │                      └──────────────────────────┘
           │                                    │
           └────────────────┬───────────────────┘
                            │ Referenced by
                            ▼
                 ┌────────────────────┐
                 │  docs/downloads.md │
                 │  (Download Page)   │
                 └────────────────────┘
```

## Components

### 1. CI/CD Workflows

#### `create-habits-cortex-app.yml`
**Purpose:** Build and release Cortex app binaries for all platforms

**Triggers:**
- Tag push matching `release/*` (e.g., `release/1.0.0`)
- Manual workflow dispatch with version input

**Jobs:**
- `build-macos-ios` - Builds macOS (.dmg) and iOS (.ipa) on macOS runner
- `build-android` - Builds Android (.apk) on Ubuntu runner
- `build-windows` - Builds Windows (.exe/.msi) on Windows runner
- `build-linux` - Builds Linux (.AppImage) on Ubuntu runner
- `create-release` - Collects all artifacts and creates GitHub Release

**Output:** GitHub Release with attached binary files

#### `deploy-docs.yml`
**Purpose:** Build and deploy documentation site

**Triggers:**
- Push to `main` branch
- Changes in `docs/**`, `showcase/**`, or related packages

**Key Steps:**
1. Build habit-viewer component
2. Build cortex (for .habit file generation)
3. Generate showcase .habit bundles
4. **Generate downloads manifest** (new step)
5. Build VitePress documentation
6. Deploy to hosting server

**Output:** Updated website with fresh downloads manifest

### 2. Downloads Manifest Generator

**File:** `scripts/generate-downloads-manifest.ts`

**Purpose:** Creates a JSON manifest with information about all available downloads

**Features:**
- Fetches latest release from GitHub API
- Scans `docs/public/downloads/` for habit bundles
- Generates `docs/public/downloads-manifest.json` with metadata
- Supports higher rate limits via `GITHUB_TOKEN` env variable

**Manifest Structure:**
```json
{
  "cortexApp": [
    {
      "platform": "macOS",
      "filename": "habits-cortex.dmg",
      "url": "https://github.com/.../releases/download/v1.0.0/habits-cortex.dmg",
      "version": "1.0.0",
      "size": "45.2 MB",
      "description": "macOS 11+ (Intel & Apple Silicon)",
      "available": true,
      "publishedAt": "2024-03-15T10:30:00Z"
    }
    // ... other platforms
  ],
  "habitBundles": [
    {
      "name": "Mixed",
      "filename": "mixed.zip",
      "url": "/downloads/mixed.zip",
      "size": "2.3 MB",
      "description": "Self-contained ZIP bundle"
    }
    // ... other bundles
  ],
  "lastUpdated": "2024-03-15T12:00:00Z"
}
```

### 3. Download Page

**File:** `docs/downloads.md`

**Features:**
- Vue 3 component with reactive data
- Fetches manifest on mount
- Displays loading/error states
- Dynamic rendering of Cortex app downloads
- Lists available habit bundles
- Platform-specific icons (SVG)

**User Experience:**
- Shows "Coming Soon" for unreleased platforms
- Direct download links for available releases
- Responsive grid layout
- Hover effects and transitions

## File Locations

### Source Files
```
habits/
├── .github/workflows/
│   ├── create-habits-cortex-app.yml    # Binary builds
│   └── deploy-docs.yml                  # Docs deployment
├── scripts/
│   └── generate-downloads-manifest.ts   # Manifest generator
├── docs/
│   ├── downloads.md                     # Download page
│   └── public/
│       ├── downloads/                   # Habit bundles (static)
│       │   ├── mixed.zip
│       │   ├── ai-journal.zip
│       │   └── ...
│       └── downloads-manifest.json      # Generated manifest
└── habits-cortex/
    ├── build-release.ts                 # Cross-platform build script
    └── release/                         # Build output (gitignored)
```

### Published Locations
```
Website (https://your-domain.com)
├── /downloads/                          # Habit bundles
│   ├── mixed.zip
│   └── ...
├── /downloads-manifest.json             # Manifest API
└── /downloads                           # Download page

GitHub Releases (https://github.com/org/repo/releases)
└── v1.0.0/
    ├── habits-cortex.dmg               # macOS
    ├── habits-cortex.ipa               # iOS
    ├── habits-cortex.apk               # Android
    ├── habits-cortex.exe               # Windows
    └── habits-cortex.AppImage          # Linux
```

## Workflows

### Releasing a New Version

1. **Prepare the release:**
   ```bash
   # Ensure all changes are committed
   git status
   
   # Update version in relevant files
   # (package.json, tauri.conf.json, etc.)
   ```

2. **Create and push tag:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **GitHub Actions automatically:**
   - Builds binaries for all platforms
   - Signs and notarizes (using secrets)
   - Creates GitHub Release
   - Uploads all artifacts

4. **On next docs deployment:**
   - Manifest generator fetches latest release
   - Updates `downloads-manifest.json`
   - Download page shows new version

### Manual Release Workflow

Trigger a release without pushing a tag:

1. Go to GitHub Actions
2. Select "Build Release" workflow
3. Click "Run workflow"
4. Enter version (e.g., `1.0.0`)
5. Click "Run workflow"

### Adding a New Habit Bundle

1. **Generate the .habit file:**
   ```bash
   npx habits pack --format habit --config showcase/your-habit/stack.yaml -o docs/public/downloads/your-habit.habit
   ```

2. **Or create a ZIP bundle:**
   ```bash
   cd showcase/your-habit
   zip -r ../../docs/public/downloads/your-habit.zip .
   ```

3. **Commit and push:**
   ```bash
   git add docs/public/downloads/
   git commit -m "Add your-habit bundle"
   git push origin main
   ```

4. **Auto-updates on deploy:**
   - Manifest generator scans downloads directory
   - Adds new bundle to manifest
   - Download page displays it automatically

## Environment Variables

### Required Secrets (GitHub Actions)

Set these in: **Settings → Secrets and variables → Actions**

#### macOS/iOS
- `APPLE_SIGNING_IDENTITY` - Certificate name (e.g., "Apple Distribution: Company (TEAMID)")
- `APPLE_CERTIFICATE_BASE64` - Base64-encoded .p12 certificate
- `APPLE_CERTIFICATE_PASSWORD` - Certificate password
- `APPLE_ID` - Apple ID email (for notarization)
- `APPLE_TEAM_ID` - 10-character Team ID
- `APPLE_APP_SPECIFIC_PASSWORD` - App-specific password for notarization
- `IOS_PROVISIONING_PROFILE_BASE64` - Base64-encoded .mobileprovision
- `IOS_EXPORT_METHOD` - Export method (app-store, ad-hoc, enterprise, development)

#### Android
- `ANDROID_KEYSTORE_BASE64` - Base64-encoded keystore file
- `ANDROID_KEYSTORE_PASSWORD` - Keystore password
- `ANDROID_KEY_ALIAS` - Key alias
- `ANDROID_KEY_PASSWORD` - Key password

#### Windows
- `WINDOWS_CERTIFICATE_BASE64` - Base64-encoded .pfx certificate
- `WINDOWS_CERTIFICATE_PASSWORD` - Certificate password

#### Linux
- `APPIMAGE_GPG_PRIVATE_KEY_BASE64` - Base64-encoded GPG private key (optional)
- `APPIMAGE_GPG_PASSPHRASE` - GPG passphrase (optional)

#### Deployment
- `SCP_HOST` - SCP server host
- `SCP_USERNAME` - SCP username
- `SCP_KEY` - SSH private key
- `SCP_PASSPHRASE` - SSH key passphrase (if applicable)
- `SCP_PORT` - SSH port
- `SCP_PATH` - Remote path for deployment

#### Optional
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions (for higher API rate limits)

## Maintenance

### Updating the Manifest Generator

Edit `scripts/generate-downloads-manifest.ts` to:
- Change repository information (`REPO_OWNER`, `REPO_NAME`)
- Add/remove platform configurations
- Modify file size formatting
- Adjust bundle scanning logic

### Updating the Download Page

Edit `docs/downloads.md` to:
- Update platform descriptions
- Change styling (CSS section)
- Modify layout or icons
- Add new sections

### Testing Locally

1. **Generate manifest locally:**
   ```bash
   # Optional: Set GitHub token for higher rate limits
   export GITHUB_TOKEN=your_token_here
   
   npx tsx scripts/generate-downloads-manifest.ts
   ```

2. **Check output:**
   ```bash
   cat docs/public/downloads-manifest.json | jq
   ```

3. **Test download page:**
   ```bash
   cd docs
   npm run dev
   # Visit http://localhost:5173/downloads
   ```

## Troubleshooting

### No releases found
- **Cause:** No GitHub releases exist yet
- **Solution:** Create first release manually or push a tag

### Manifest shows "Coming Soon" for all platforms
- **Cause:** Latest release has no matching asset files
- **Solution:** Ensure build artifacts are properly uploaded

### Download page shows loading forever
- **Cause:** Manifest file not found or malformed
- **Solution:** Check browser console, verify manifest generation

### Build fails on specific platform
- **Cause:** Missing secrets or build dependencies
- **Solution:** Review build logs, verify secrets are set correctly

### GitHub API rate limit exceeded
- **Cause:** Too many unauthenticated requests
- **Solution:** Set `GITHUB_TOKEN` in workflow or locally

## Best Practices

1. **Versioning**
   - Use semantic versioning (e.g., `v1.2.3`)
   - Tag releases consistently
   - Update version in all relevant files

2. **Testing**
   - Test builds locally before tagging
   - Verify signatures and notarization
   - Download and test binaries after release

3. **Security**
   - Never commit certificates or keys
   - Rotate secrets periodically
   - Use app-specific passwords for Apple services
   - Verify download URLs use HTTPS

4. **Performance**
   - Keep habit bundles reasonably sized
   - Compress assets when possible
   - Use CDN for large files if needed

5. **Documentation**
   - Keep this doc updated with changes
   - Document new platforms or build types
   - Maintain changelog for releases

## Future Enhancements

- [ ] Automatic changelog generation
- [ ] Download analytics tracking
- [ ] Delta updates for faster downloads
- [ ] Code signing verification instructions
- [ ] Auto-update mechanism in app
- [ ] Release notes preview in download page
- [ ] Platform-specific installation guides
- [ ] Checksums (SHA256) for verification
- [ ] Mirror hosting for redundancy
