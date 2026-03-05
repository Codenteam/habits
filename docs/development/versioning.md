# Versioning

Habits uses GitHub Releases to publish to npm with **Trusted Publisher** (OIDC).

## Release Tags

| GitHub Action | NPM Tag | Version | Install |
|--------------|---------|---------|---------|
| Create release (draft/prerelease) | `@rc` | `x.y.z-rc.{build}` | `npx habits@rc` |
| Publish release | `@latest` | `x.y.z` | `npx habits` |

## How to Release

### Release Candidate (RC)

1. RCs are created when anew release is drafted on Github from Releases → **Draft a new release**
2. Create tag (e.g., `v1.0.0`)
3. Check "Set as a pre-release" or save as draft
4. Click **Save draft** or **Publish as pre-release**
5. CI publishes to npm as `habits@rc`

Test: `npx habits@rc`

### Stable Release

1. Go to GitHub → Releases
2. Find your draft/pre-release
3. Click **Edit** → **Publish release**
4. CI publishes to npm as `habits@latest`

Install: `npx habits` or `npx habits@latest`

## Manual Publish

```bash
# Bump version
cd packages/habits/app
npm version patch --no-git-tag-version

# Build and publish
pnpm nx publish habits
```

## Setup: Trusted Publisher (OIDC)

No NPM_TOKEN needed! Configure trusted publishing on npm:

1. Go to [npmjs.com](https://www.npmjs.com) → Package `habits` → Settings → **Trusted Publishers**
2. Click **Add trusted publisher**
3. Configure:
   - **Repository owner**: `codenteam`
   - **Repository name**: `habits`
   - **Workflow filename**: `npm-publish.yml`
   - **Environment**: (leave empty)
4. Save

This allows GitHub Actions to publish without storing secrets.
