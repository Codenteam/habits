#!/bin/bash
# Remove rebuildable local artifacts to free disk space.
# All targets are gitignored; nothing here affects tracked source.
#
# Usage:
#   bash scripts/clean-artifacts.sh              # Tier 1 (~42GB)
#   bash scripts/clean-artifacts.sh --optional   # Tier 1 + Tier 2 (+ ~2.4GB)
#   bash scripts/clean-artifacts.sh --all        # Tier 1 + 2 + 3, then pnpm install

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TIER_OPTIONAL=false
TIER_NODE_MODULES=false

for arg in "$@"; do
  case "$arg" in
    --optional) TIER_OPTIONAL=true ;;
    --all) TIER_OPTIONAL=true; TIER_NODE_MODULES=true ;;
    -h|--help)
      echo "Usage: bash scripts/clean-artifacts.sh [--optional] [--all]"
      echo "  (default)   Tier 1: Rust target/, Android/iOS build outputs, Nx, docs/showcase artifacts"
      echo "  --optional  Also remove deprecated/, local-ai models, old-showcases, scratch dirs"
      echo "  --all       Also remove all node_modules and run pnpm install"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

echo "Cleaning Tier 1 artifacts..."
find . -name target -type d -prune -exec rm -rf {} +
rm -rf habits-cortex/src-tauri/gen/android/app/build
rm -rf habits-cortex/src-tauri/gen/apple/build habits-cortex/src-tauri/gen/apple/Externals
rm -rf .nx dist docs/.vitepress/dist docs/.vitepress/cache docs/public/showcase
find showcase -name dist -type d -prune -exec rm -rf {} +
rm -rf habits-cortex/release
echo "Tier 1 done."

if [ "$TIER_OPTIONAL" = true ]; then
  echo "Cleaning Tier 2 optional artifacts..."
  rm -rf deprecated/ local-ai-candle/models/ old-showcases/ tmp/ untracked/ staging/
  echo "Tier 2 done."
fi

if [ "$TIER_NODE_MODULES" = true ]; then
  echo "Cleaning Tier 3 node_modules..."
  find . -name node_modules -type d -prune -exec rm -rf {} +
  echo "Running pnpm install..."
  pnpm install
  echo "Tier 3 done."
fi

echo "Cleanup complete. Current workspace size:"
du -sh .
