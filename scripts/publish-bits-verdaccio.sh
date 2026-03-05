#!/bin/bash
# Publish all bits to Verdaccio private registry
# 
# Usage:
#   ./scripts/publish-bits-verdaccio.sh
#
# Prerequisites:
#   1. Start Verdaccio: docker compose -f docker-compose.verdaccio.yml up -d
#   2. Create a user: npm adduser --registry http://localhost:4873
#   3. Build bits: pnpm nx run-many --target=build --projects='@ha-bits/*'
#
# Environment Variables:
#   VERDACCIO_REGISTRY_URL - Registry URL (default: http://localhost:4873)

set -e

REGISTRY_URL="${VERDACCIO_REGISTRY_URL:-http://localhost:4873}"
BITS_DIR="bits-creator/nodes/bits/@ha-bits"

echo "📦 Publishing bits to Verdaccio: $REGISTRY_URL"
echo ""

# Check if Verdaccio is running
if ! curl -s "$REGISTRY_URL/-/ping" > /dev/null 2>&1; then
    echo "❌ Verdaccio is not running at $REGISTRY_URL"
    echo "   Start it with: docker compose -f docker-compose.verdaccio.yml up -d"
    exit 1
fi

echo "✓ Verdaccio is running"
echo ""

# Find all bit directories
for bit_dir in "$BITS_DIR"/*/; do
    if [ -d "$bit_dir" ]; then
        bit_name=$(basename "$bit_dir")
        package_json="$bit_dir/package.json"
        
        if [ -f "$package_json" ]; then
            echo "📦 Publishing @ha-bits/$bit_name..."
            
            # Build if dist doesn't exist
            if [ ! -d "$bit_dir/dist" ]; then
                echo "   Building..."
                (cd "$bit_dir" && npm run build 2>/dev/null || tsc 2>/dev/null || echo "Build skipped")
            fi
            
            # Publish to Verdaccio
            (cd "$bit_dir" && npm publish --registry "$REGISTRY_URL" 2>&1) || {
                echo "   ⚠️  Failed to publish (may already exist)"
            }
            echo ""
        fi
    fi
done

echo "✅ Done!"
echo ""
echo "To install a bit from the private registry:"
echo "  npm install @ha-bits/bit-email --registry $REGISTRY_URL"
echo ""
echo "Or set HABITS_NPM_REGISTRY_URL environment variable for habits to use this registry."
