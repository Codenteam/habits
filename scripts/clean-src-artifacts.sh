#!/bin/bash

# Clean up TypeScript/JavaScript build artifacts in packages/**/src/
# Removes: .js, .d.ts, .d.ts.map, .js.map files (only in src directories, excludes node_modules)
# Usage: ./clean-src-artifacts.sh [--dry-run]

DRY_RUN=false
if [[ "$1" == "--dry-run" || "$1" == "-n" ]]; then
    DRY_RUN=true
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
PACKAGES_DIR="$ROOT_DIR/packages"

cd "$ROOT_DIR" || exit 1

if $DRY_RUN; then
    echo "[DRY RUN] Would clean build artifacts in packages/**/src/..."
else
    echo "Cleaning build artifacts in packages/**/src/..."
fi

# Find files only in src directories, excluding node_modules
files=""
while IFS= read -r -d '' file; do
    files="$files$file"$'\n'
done < <(find "$PACKAGES_DIR" -path "*/node_modules" -prune -o -type d -name "src" -exec find {} -type f \( -name "*.js" -o -name "*.d.ts" -o -name "*.d.ts.map" -o -name "*.js.map" \) -print0 \;)

# Remove trailing newline
files="${files%$'\n'}"

if [ -z "$files" ]; then
    echo "No build artifacts found."
    exit 0
fi

count=$(echo "$files" | wc -l | tr -d ' ')
echo "Found $count build artifact(s)"

if $DRY_RUN; then
    echo ""
    echo "Files that would be deleted:"
    echo "$files"
    echo ""
    echo "[DRY RUN] No files were deleted. Run without --dry-run to delete."
else
    echo "$files" | while IFS= read -r file; do
        rm -f "$file"
    done
    echo "✓ Cleaned up $count file(s)"
fi

