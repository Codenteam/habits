#!/bin/bash
# =============================================================================
# Local npx Package Test Script (Isolated Environment)
# =============================================================================
# Tests the habits package in a completely isolated environment before publishing.
# Copies dist to /tmp to avoid any interference from workspace node_modules.
#
# Usage:
#   ./scripts/test-npx-local.sh           # Full test (build + pack + test)
#   ./scripts/test-npx-local.sh --skip-build  # Skip build, test existing dist
#
# Exit codes:
#   0 - All tests passed
#   1 - Build/pack failed
#   2 - Base mode tests failed
#   3 - Cortex mode tests failed
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory and workspace root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_PATH="$WORKSPACE_ROOT/dist/packages/habits"

# Isolated test environment - completely separate from workspace
ISOLATED_TEST_DIR="/tmp/habits-npx-test-$$"
ISOLATED_PACKAGE_DIR="$ISOLATED_TEST_DIR/pkg"
LOG_DIR="$ISOLATED_TEST_DIR/logs"

# Ports
BASE_PORT=3000
CORTEX_PORT=13000

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
}

cleanup() {
    log_info "Cleaning up processes..."
    pkill -f "habits base" 2>/dev/null || true
    pkill -f "habits cortex" 2>/dev/null || true
    pkill -f "main.cjs base" 2>/dev/null || true
    pkill -f "main.cjs cortex" 2>/dev/null || true
    sleep 2
}

cleanup_all() {
    cleanup
    if [ -n "$ISOLATED_TEST_DIR" ] && [ -d "$ISOLATED_TEST_DIR" ]; then
        log_info "Cleaning up isolated test environment: $ISOLATED_TEST_DIR"
        rm -rf "$ISOLATED_TEST_DIR"
    fi
}

setup_isolated_environment() {
    log_section "Setting Up Isolated Test Environment"
    
    # Clean any previous test artifacts
    rm -rf /tmp/habits-npx-test-* 2>/dev/null || true
    rm -rf /tmp/habits-nodes 2>/dev/null || true
    
    # Create isolated directory structure
    mkdir -p "$ISOLATED_TEST_DIR"
    mkdir -p "$ISOLATED_PACKAGE_DIR"
    mkdir -p "$LOG_DIR"
    
    log_info "Isolated test directory: $ISOLATED_TEST_DIR"
    
    # Copy dist package to isolated location
    log_info "Copying package to isolated environment..."
    cp -r "$DIST_PATH"/* "$ISOLATED_PACKAGE_DIR/"
    
    # Verify copy
    if [ -f "$ISOLATED_PACKAGE_DIR/app/main.cjs" ]; then
        log_success "Package copied to $ISOLATED_PACKAGE_DIR"
    else
        log_error "Failed to copy package"
        exit 1
    fi
    
    # Show package.json to verify it's clean
    log_info "Package dependencies:"
    if command -v jq &> /dev/null; then
        jq '.dependencies' "$ISOLATED_PACKAGE_DIR/package.json" | head -20
    else
        grep -A20 '"dependencies"' "$ISOLATED_PACKAGE_DIR/package.json" | head -20
    fi
    
    # Install dependencies in isolation (like npm does when it unpacks a tarball)
    log_info "Installing package dependencies (simulates npm install on npx)..."
    cd "$ISOLATED_PACKAGE_DIR"
    if npm install --omit=dev > "$LOG_DIR/npm-install.log" 2>&1; then
        log_success "Dependencies installed"
    else
        log_error "Failed to install dependencies"
        cat "$LOG_DIR/npm-install.log" | tail -20
        exit 1
    fi
}

wait_for_port() {
    local port=$1
    local timeout=${2:-30}
    local elapsed=0
    
    while ! nc -z localhost $port 2>/dev/null; do
        sleep 1
        ((elapsed++))
        if [ $elapsed -ge $timeout ]; then
            return 1
        fi
    done
    return 0
}

test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    local expected_content="$4"
    
    local response
    local status
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo -e "\n000")
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status" = "$expected_status" ]; then
        if [ -n "$expected_content" ]; then
            if echo "$body" | grep -q "$expected_content"; then
                log_success "$name (status=$status, content match)"
                return 0
            else
                log_error "$name (status=$status, content mismatch)"
                return 1
            fi
        else
            log_success "$name (status=$status)"
            return 0
        fi
    else
        log_error "$name (expected=$expected_status, got=$status)"
        return 1
    fi
}

# =============================================================================
# Build & Pack
# =============================================================================

build_and_pack() {
    log_section "Building and Packing"
    
    cd "$WORKSPACE_ROOT"
    
    # Use a temporary log location for build (isolated dir doesn't exist yet)
    local BUILD_LOG="/tmp/habits-build-$$.log"
    
    log_info "Running: pnpm nx pack habits --skip-nx-cache"
    if pnpm nx pack habits --skip-nx-cache > "$BUILD_LOG" 2>&1; then
        log_success "Build and pack completed"
    else
        log_error "Build failed. Check $BUILD_LOG"
        cat "$BUILD_LOG" | tail -30
        exit 1
    fi
    
    # Verify dist exists
    if [ -d "$DIST_PATH" ] && [ -f "$DIST_PATH/app/main.cjs" ]; then
        log_success "Dist package verified at $DIST_PATH"
    else
        log_error "Dist package not found at $DIST_PATH"
        exit 1
    fi
    
    # Clean up build log
    rm -f "$BUILD_LOG"
}

# =============================================================================
# Base Mode Tests
# =============================================================================

test_base_mode() {
    log_section "Testing Base Mode (Isolated)"
    
    cleanup
    
    log_info "Starting base server from isolated package (emulates npx habits@latest)..."
    log_info "Package location: $ISOLATED_PACKAGE_DIR"
    
    # Run from /tmp with HOME override to prevent any local config interference
    cd /tmp
    HOME="$ISOLATED_TEST_DIR" nohup node "$ISOLATED_PACKAGE_DIR/app/main.cjs" base > "$LOG_DIR/base.log" 2>&1 &
    BASE_PID=$!
    
    log_info "Waiting for server to start on port $BASE_PORT..."
    if ! wait_for_port $BASE_PORT 15; then
        log_error "Base server failed to start"
        cat "$LOG_DIR/base.log" | tail -30
        return 1
    fi
    
    log_success "Base server started (PID: $BASE_PID)"
    sleep 2
    
    # Test endpoints
    log_info "Testing Base Mode Endpoints..."
    
    test_endpoint "Base UI" "http://localhost:$BASE_PORT/habits/base/" 200 "<!doctype html>"
    test_endpoint "Base API" "http://localhost:$BASE_PORT/habits/base/api" 200 "Habits API"
    test_endpoint "Templates API (mixed)" "http://localhost:$BASE_PORT/habits/base/api/templates/mixed/stack.yaml" 200 "workflows"
    
    cleanup
}

# =============================================================================
# Cortex Mode Tests
# =============================================================================

test_cortex_mode() {
    log_section "Testing Cortex Mode (Isolated, JIT)"
    
    cleanup
    
    local CONFIG_PATH="$ISOLATED_PACKAGE_DIR/showcase/mixed/stack.yaml"
    
    if [ ! -f "$CONFIG_PATH" ]; then
        log_error "Config not found: $CONFIG_PATH"
        return 1
    fi
    
    log_info "Starting cortex server from isolated package with mixed config..."
    log_info "Package location: $ISOLATED_PACKAGE_DIR"
    log_info "Config: $CONFIG_PATH"
    
    # Run from /tmp with HOME override to prevent any local config interference
    cd /tmp
    HOME="$ISOLATED_TEST_DIR" nohup node "$ISOLATED_PACKAGE_DIR/app/main.cjs" cortex --config "$CONFIG_PATH" > "$LOG_DIR/cortex.log" 2>&1 &
    CORTEX_PID=$!
    
    log_info "Waiting for server to start on port $CORTEX_PORT (may take time for module install)..."
    if ! wait_for_port $CORTEX_PORT 120; then
        log_error "Cortex server failed to start within 120s"
        log_warn "Server log:"
        cat "$LOG_DIR/cortex.log" | tail -50
        return 1
    fi
    
    log_success "Cortex server started (PID: $CORTEX_PID)"
    sleep 3
    
    # Test endpoints
    log_info "Testing Cortex Mode Endpoints..."
    
    test_endpoint "Frontend" "http://localhost:$CORTEX_PORT/" 200 "<!DOCTYPE html>"
    test_endpoint "Workflows API" "http://localhost:$CORTEX_PORT/misc/workflows" 200 "workflows"
    test_endpoint "Health" "http://localhost:$CORTEX_PORT/health" 200
    test_endpoint "Cortex UI" "http://localhost:$CORTEX_PORT/habits/cortex/" 200 "<!DOCTYPE html>"
    test_endpoint "Base UI (embedded)" "http://localhost:$CORTEX_PORT/habits/base/" 200 "<!doctype html>"
    

    
    cleanup
}

# =============================================================================
# Main
# =============================================================================

main() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║    Habits NPX Package Local Test Suite (Isolated)             ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Initial cleanup
    cleanup
    
    # Parse args
    SKIP_BUILD=false
    KEEP_ISOLATED=false
    for arg in "$@"; do
        case $arg in
            --skip-build)
                SKIP_BUILD=true
                ;;
            --keep)
                KEEP_ISOLATED=true
                ;;
        esac
    done
    
    # Build if needed
    if [ "$SKIP_BUILD" = false ]; then
        build_and_pack
    else
        log_info "Skipping build (--skip-build)"
        if [ ! -d "$DIST_PATH" ]; then
            log_error "Dist not found. Run without --skip-build first."
            exit 1
        fi
    fi
    
    # Setup isolated environment (copies dist to /tmp)
    setup_isolated_environment
    
    # Run tests
    test_base_mode
    test_cortex_mode
    
    # Summary
    log_section "Test Summary"
    echo ""
    echo -e "  ${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "  ${RED}Failed: $TESTS_FAILED${NC}"
    echo ""
    echo -e "  Isolated test dir: $ISOLATED_TEST_DIR"
    echo -e "  Logs: $LOG_DIR/"
    echo ""
    
    if [ $TESTS_FAILED -gt 0 ]; then
        log_error "Some tests failed!"
        echo ""
        echo "Logs available at: $LOG_DIR/"
        echo "  - build.log"
        echo "  - base.log"
        echo "  - cortex.log"
        exit 2
    else
        log_success "All tests passed!"
        if [ "$KEEP_ISOLATED" = false ]; then
            log_info "Cleaning up isolated test directory..."
            rm -rf "$ISOLATED_TEST_DIR"
        else
            log_info "Keeping isolated test directory (--keep): $ISOLATED_TEST_DIR"
        fi
        exit 0
    fi
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

main "$@"
