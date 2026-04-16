#!/bin/bash

# Validation script for both local (Husky) and CI (GitHub Actions)
# Single source of truth for build validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Use printf for portable colored output
print_green() { printf "${GREEN}%s${NC}\n" "$1"; }
print_red() { printf "${RED}%s${NC}\n" "$1"; }
print_yellow() { printf "${YELLOW}%s${NC}\n" "$1"; }

echo "🔍 Running build validation with nx affected..."
echo ""

# Parse arguments
BASE_REF=${1:-origin/main}
SKIP_LOCKFILE=${2:-false}

# Check lockfile is in sync with package.json (skip in CI where we use frozen-lockfile already)
if [ "$SKIP_LOCKFILE" != "true" ]; then
    echo "🔒 Verifying lockfile is up to date..."
    if pnpm install --frozen-lockfile --registry=https://registry.npmjs.org > /dev/null 2>&1; then
        print_green "✅ Lockfile is in sync"
        echo ""
    else
        print_red "❌ Lockfile is out of sync with package.json"
        echo "Run 'pnpm install' to update the lockfile before pushing."
        exit 1
    fi
fi

# Check if there are affected projects
AFFECTED=$(pnpm nx show projects --affected --base=$BASE_REF 2>/dev/null || echo "")

if [ -z "$AFFECTED" ]; then
    print_green "✅ No affected projects. Skipping builds..."
else
    echo "📦 Affected packages:"
    echo "$AFFECTED" | sed 's/^/  - /'
    echo ""

    # Check if affected publishable packages need version bumps
    echo "🔢 Checking version requirements for publishable packages..."
    VERSION_ERRORS=()
    
    while IFS= read -r project; do
        # Skip empty lines
        [ -z "$project" ] && continue
        
        # Get project root from nx
        PROJECT_ROOT=$(pnpm nx show project "$project" --json 2>/dev/null | jq -r '.root // empty' 2>/dev/null || echo "")
        
        if [ -z "$PROJECT_ROOT" ]; then
            continue
        fi
        
        # Check for package.json in project root
        PACKAGE_JSON="$PROJECT_ROOT/package.json"
        if [ ! -f "$PACKAGE_JSON" ]; then
            continue
        fi
        
        # Get package name and version
        PKG_NAME=$(jq -r '.name // empty' "$PACKAGE_JSON" 2>/dev/null || echo "")
        PKG_VERSION=$(jq -r '.version // empty' "$PACKAGE_JSON" 2>/dev/null || echo "")
        PKG_PRIVATE=$(jq -r '.private // false' "$PACKAGE_JSON" 2>/dev/null || echo "false")
        
        # Check if project has a publish target in project.json
        PROJECT_JSON="$PROJECT_ROOT/project.json"
        HAS_PUBLISH=$(jq -r '.targets.publish // empty' "$PROJECT_JSON" 2>/dev/null || echo "")
        
        # Skip if no publish target, no name, no version, or private
        if [ -z "$HAS_PUBLISH" ] || [ -z "$PKG_NAME" ] || [ -z "$PKG_VERSION" ] || [ "$PKG_PRIVATE" = "true" ]; then
            continue
        fi
        
        # Check if version exists on npm
        if npm view "${PKG_NAME}@${PKG_VERSION}" version >/dev/null 2>&1; then
            VERSION_ERRORS+=("  - ${PKG_NAME}@${PKG_VERSION} already exists on npm. Bump version in ${PACKAGE_JSON}")
        else
            printf "  ${GREEN}✓${NC} ${PKG_NAME}@${PKG_VERSION} (new version)\n"
        fi
    done <<< "$AFFECTED"
    
    if [ ${#VERSION_ERRORS[@]} -gt 0 ]; then
        echo ""
        print_red "❌ Version bump required for the following packages:"
        for err in "${VERSION_ERRORS[@]}"; do
            print_red "${err}"
        done
        echo ""
        echo "Please bump the version in package.json before pushing."
        exit 1
    fi
    
    print_green "✅ All publishable packages have valid versions"
    echo ""

    echo "🔨 Building affected packages..."
    echo ""
    if pnpm nx affected:build --base=$BASE_REF; then
        echo ""
        print_green "✅ All affected builds passed!"
    else
        echo ""
        print_red "❌ Build validation failed!"
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
# Now the showcase/bits are generated only when needed, not everytime. Because we now persist the pages. 
# npx -y tsx scripts/generate-showcase.ts
# npx -y tsx scripts/generate-bits.ts
# npx -y tsx scripts/update-bits-stats.ts
cd docs
# Install d2
curl -fsSL https://d2lang.com/install.sh | sh -s --
# Install npm deps
pnpm install



if pnpm build; then
    echo ""
    print_green "✅ Documentation build passed!"
else
    echo ""
    print_red "❌ Documentation build failed!"
    echo "Fix the docs build errors above before pushing."
    exit 1
fi

cd ..
echo ""
print_green "🎉 All validations passed successfully!"
exit 0
