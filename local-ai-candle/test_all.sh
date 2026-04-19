#!/bin/bash
# Compatibility wrapper: test script moved to packages/manage/tests/rust/local-ai/test_all.sh

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NEW_SCRIPT="$ROOT_DIR/packages/manage/tests/rust/local-ai/test_all.sh"

echo "[local-ai-candle/test_all.sh] moved to: $NEW_SCRIPT"
exec "$NEW_SCRIPT" "$@"
