#!/bin/bash

# Validation script for both local (Husky) and CI (GitHub Actions)
# Single source of truth for build validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Running build validation with nx affected..."
echo ""

# Parse arguments
BASE_REF=${1:-origin/main}
SKIP_LOCKFILE=${2:-false}

# Check lockfile is in sync with package.json (skip in CI where we use frozen-lockfile already)
if [ "$SKIP_LOCKFILE" != "true" ]; then
    echo "🔒 Verifying lockfile is up to date..."
    if pnpm install --frozen-lockfile --registry=https://registry.npmjs.org > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Lockfile is in sync${NC}"
        echo ""
    else
        echo -e "${RED}❌ Lockfile is out of sync with package.json${NC}"
        echo "Run 'pnpm install' to update the lockfile before pushing."
        exit 1
    fi
fi

# Check if there are affected projects
AFFECTED=$(pnpm nx show projects --affected --base=$BASE_REF 2>/dev/null || echo "")

if [ -z "$AFFECTED" ]; then
    echo -e "${GREEN}✅ No affected projects. Skipping builds...${NC}"
else
    echo "📦 Affected packages:"
    echo "$AFFECTED" | sed 's/^/  - /'
    echo ""

    echo "🔨 Building affected packages..."
    echo ""
    if pnpm nx affected:build --base=$BASE_REF --skip-nx-cache; then
        echo ""
        echo -e "${GREEN}✅ All affected builds passed!${NC}"
    else
        echo ""
        echo -e "${RED}❌ Build validation failed!${NC}"
        echo "Fix the build errors above before pushing."
        exit 1
    fi

    # Skipping tests for now
    # TODO: Fix tests
    # echo -e "${YELLOW}⚠️  Skipping affected tests as requested.${NC}"
    # echo ""
    # echo "🧪 Testing affected packages..."
    # echo ""
    # if pnpm nx affected:test --base=$BASE_REF --skip-nx-cache; then
    #     echo ""
    #     echo -e "${GREEN}✅ All affected tests passed!${NC}"
    # else
    #     echo ""
    #     echo -e "${RED}❌ Test validation failed!${NC}"
    #     echo "Fix the test errors above before pushing."
    #     exit 1
    # fi


    # TODO: restore linting
    # echo ""
    # echo "🔍 Linting affected packages..."
    # echo ""
    # if pnpm nx affected:lint --base=$BASE_REF --skip-nx-cache; then
    #     echo ""
    #     echo -e "${GREEN}✅ All affected lint checks passed!${NC}"
    # else
    #     echo ""
    #     echo -e "${RED}❌ Lint validation failed!${NC}"
    #     echo "Fix the lint errors above before pushing."
    #     exit 1
    # fi
fi

echo ""
echo "📚 Building documentation..."
echo ""

# Build docs
cd docs
# Install d2
curl -fsSL https://d2lang.com/install.sh | sh -s --
# Install npm deps
pnpm install

if pnpm build; then
    echo ""
    echo -e "${GREEN}✅ Documentation build passed!${NC}"
else
    echo ""
    echo -e "${RED}❌ Documentation build failed!${NC}"
    echo "Fix the docs build errors above before pushing."
    exit 1
fi

cd ..
echo ""
echo -e "${GREEN}🎉 All validations passed successfully!${NC}"
exit 0
