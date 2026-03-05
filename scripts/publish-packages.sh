#!/bin/bash
# Minimal script to build and publish bit-intersect, cortex, and habits
set -e

TAG=${1:-latest}
echo "Publishing with tag: $TAG"

# 1. bit-intersect (in bits-creator/nodes workspace)
echo "=== Publishing bit-intersect ==="
cd bits-creator/nodes

cd bits/@ha-bits/bit-intersect 
npm version patch --no-git-tag-version
npm run build
npm publish --access public --registry https://registry.npmjs.org/ ${TAG:+--tag $TAG}
cd ../../../../..

# 2. cortex
echo "=== Publishing cortex ==="
cd packages/cortex/server
npm version patch --no-git-tag-version
pnpm nx pack @ha-bits/cortex --skip-nx-cache
cd ../../../
cd dist/packages/cortex 
npm publish --access public --registry https://registry.npmjs.org/ ${TAG:+--tag $TAG}
cd ../../..

# 3. habits
echo "=== Publishing habits ==="
cd packages/habits/app
npm version patch --no-git-tag-version
cd ../../..
pnpm nx pack habits --skip-nx-cache
cd dist/packages/habits && npm publish --access public --registry https://registry.npmjs.org/ ${TAG:+--tag $TAG}

echo "=== Done ==="
