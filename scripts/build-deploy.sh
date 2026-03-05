# Build habits (separate Nx workspace)
echo "Building habits..."
pnpm install --frozen-lockfile
pnpm build
cd ..



./scripts/sync-directory.sh "habits/dist/packages/base/ui" "intersect-dev_intersect-dev-frontend" "habits/base"
./scripts/sync-directory.sh "habits/dist/packages/base/server" "intersect-dev_intersect-habits-base" ""


./scripts/sync-directory.sh "habits/dist/packages/cortex" "intersect-dev_intersect-habits-business" ""
./scripts/sync-directory.sh "habits/examples/business-intersect-embed" "intersect-dev_intersect-habits-business" ""