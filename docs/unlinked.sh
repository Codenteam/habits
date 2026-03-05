#!/bin/bash

# Script to find unused markdown files in the docs directory
# These are files not referenced in config.ts sidebar and not linked from other markdown files

set -e

DOCS_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DOCS_DIR"

echo "=== Finding Unused Markdown Files ==="
echo ""

# Get all markdown files (excluding node_modules, UNUSED_FILES.md, and index.md)
ALL_MD_FILES=$(find . -name "*.md" -not -path "*/node_modules/*" -not -name "UNUSED_FILES.md" -not -name "index.md" | sed 's|^\./||' | sort)

# Get files referenced in config.ts sidebar (convert link paths to file paths)
CONFIG_REFS=$(grep -oE "link: '[^']+'" .vitepress/config.ts 2>/dev/null | sed "s/link: '//;s/'$//" | sed 's|^/||' | sed 's|$|.md|' | sort -u)

# Get files linked from other markdown files (both /path and ./path formats)
MD_REFS=$(grep -roh --include="*.md" '\[.*\](/[^)]*)\|\[.*\](\./[^)]*)' . 2>/dev/null | \
  grep -v node_modules | \
  grep -oE '\(/[^)]+\)|\(\./[^)]+\)' | \
  tr -d '()' | \
  sed 's|^/||' | \
  sed 's|^\./||' | \
  grep -E '\.md$|^[^.]+$' | \
  sed 's|$|.md|' | \
  sed 's|\.md\.md$|.md|' | \
  sort -u)

# Combine all references
ALL_REFS=$(echo -e "${CONFIG_REFS}\n${MD_REFS}" | sort -u | grep -v '^$')

echo "Files in config.ts sidebar:"
echo "$CONFIG_REFS" | sed 's/^/  /'
echo ""

echo "Files linked from markdown:"
echo "$MD_REFS" | sed 's/^/  /'
echo ""

echo "=== UNUSED FILES ==="
echo ""

UNUSED_COUNT=0
for file in $ALL_MD_FILES; do
  # Check if file is referenced (with or without .md extension)
  file_no_ext="${file%.md}"
  
  is_used=false
  
  # Check in config refs
  if echo "$CONFIG_REFS" | grep -qx "$file" 2>/dev/null; then
    is_used=true
  fi
  if echo "$CONFIG_REFS" | grep -qx "${file_no_ext}" 2>/dev/null; then
    is_used=true
  fi
  
  # Check in markdown refs
  if echo "$MD_REFS" | grep -qx "$file" 2>/dev/null; then
    is_used=true
  fi
  if echo "$MD_REFS" | grep -qx "${file_no_ext}" 2>/dev/null; then
    is_used=true
  fi
  
  # Also check for relative references like ./running.md
  basename_file=$(basename "$file")
  basename_no_ext=$(basename "$file_no_ext")
  if echo "$MD_REFS" | grep -q "$basename_file" 2>/dev/null; then
    is_used=true
  fi
  if echo "$MD_REFS" | grep -q "$basename_no_ext" 2>/dev/null; then
    is_used=true
  fi
  
  if [ "$is_used" = false ]; then
    echo "  ❌ $file"
    UNUSED_COUNT=$((UNUSED_COUNT + 1))
  fi
done

echo ""
if [ $UNUSED_COUNT -eq 0 ]; then
  echo "✅ All markdown files are referenced!"
else
  echo "Found $UNUSED_COUNT unused file(s)"
fi
