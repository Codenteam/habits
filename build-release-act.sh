#!/bin/bash
# Test Android and Linux builds locally using act
# Uses catthehacker/ubuntu:full-22.04 for Java/SDK support

set -e

cd "$(dirname "$0")"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing Android and Linux builds with act"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check act is installed
if ! command -v act &> /dev/null; then
    echo "Error: act is not installed. Install with: brew install act"
    exit 1
fi

# Image: full-22.04 required for Java + Android SDK
IMAGE="catthehacker/ubuntu:full-22.04"

echo ""
echo "Using image: $IMAGE"
echo "Secrets file: .secrets"
echo ""

# Common act flags
ACT_FLAGS=(
    --secret-file=.secrets
    -P ubuntu-latest=$IMAGE
    --pull=false
    --action-offline-mode
    -W .github/workflows/create-habits-cortex-app.yml
)

# Test Linux build first (simpler, faster)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Building Linux..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
act "${ACT_FLAGS[@]}" -j build-linux

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Building Android..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
act "${ACT_FLAGS[@]}" -j build-android

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ All builds completed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"