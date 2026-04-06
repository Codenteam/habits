#!/bin/sh
set -e

echo "🔗 Setting up local bits..."

# Create the directory where habits server looks for modules
mkdir -p /tmp/habits-nodes/node_modules/@ha-bits

# Symlink each local bit to where the server expects them
for dir in /bits/@ha-bits/*/; do
  if [ -f "$dir/package.json" ]; then
    bitname=$(basename "$dir")
    echo "  Linking $bitname"
    ln -sf "$dir" "/tmp/habits-nodes/node_modules/@ha-bits/$bitname"
  fi
done

echo "✅ Local bits linked to /tmp/habits-nodes/node_modules/@ha-bits"

# Install habits package globally from local mount
echo "📦 Installing habits from local package..."
cd /habits-pkg && npm link --force

# Run the habits commands
cd /app
habits init
habits base
