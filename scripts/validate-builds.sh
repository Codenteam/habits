#!/bin/bash

# Script to validate all builds locally
# Run this manually: ./scripts/validate-builds.sh

set -e

cd "$(dirname "$0")/.."

echo "🔍 Validating all project builds..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILED=0
PASSED=0

# Function to run a build step
run_build() {
    local name="$1"
    local cmd="$2"
    
    echo -n "  Building $name... "
    if eval "$cmd" > /tmp/build-output.log 2>&1; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        echo -e "${RED}Error building $name:${NC}"
        tail -20 /tmp/build-output.log
        ((FAILED++))
    fi
}

echo "📦 Building packages..."
echo ""

# Build in dependency order
run_build "@ha-bits/core" "pnpm nx build @ha-bits/core --skip-nx-cache"
run_build "@ha-bits/workflow-canvas" "pnpm nx build @ha-bits/workflow-canvas --skip-nx-cache"
run_build "@ha-bits/habit-viewer" "pnpm nx build @ha-bits/habit-viewer --skip-nx-cache"
run_build "@ha-bits/base" "pnpm nx build @ha-bits/base --skip-nx-cache"
run_build "@ha-bits/base-ui" "pnpm nx build @ha-bits/base-ui --skip-nx-cache"
run_build "@ha-bits/frontend-builder (typecheck)" "pnpm nx typecheck @ha-bits/frontend-builder --skip-nx-cache"
run_build "@ha-bits/cortex" "pnpm nx build @ha-bits/cortex --skip-nx-cache"

echo ""
echo "📚 Building documentation..."
echo ""

# Build docs
echo -n "  Building docs... "
if (cd docs && npm run build) > /tmp/build-output.log 2>&1; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo -e "${RED}Error building docs:${NC}"
    tail -20 /tmp/build-output.log
    ((FAILED++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Build validation failed!${NC}"
    echo -e "   ${GREEN}Passed: $PASSED${NC}  ${RED}Failed: $FAILED${NC}"
    exit 1
else
    echo -e "${GREEN}✅ All $PASSED builds passed!${NC}"
    exit 0
fi
