#!/usr/bin/env bash
set -euo pipefail

# Deploy gsd-pm to npm
# Usage: npm run deploy [-- patch|minor|major]

BUMP="${1:-patch}"

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Usage: npm run deploy [-- patch|minor|major]"
  echo "  Default: patch"
  exit 1
fi

# Ensure clean working tree (allow untracked files)
if [[ -n "$(git diff --cached --name-only)" ]] || [[ -n "$(git diff --name-only)" ]]; then
  echo "Error: Working tree has uncommitted changes. Commit or stash first."
  exit 1
fi

# Run tests
echo "Running tests..."
npm test

# Build
echo "Building..."
npm run build:hooks
npm run build:notion-sync

# Bump version (creates commit + tag)
echo "Bumping $BUMP version..."
NEW_VERSION=$(npm version "$BUMP" -m "release: v%s")
echo "Version: $NEW_VERSION"

# Publish to npm
echo "Publishing to npm..."
npm publish --access public

# Push commit and tag
echo "Pushing to git..."
git push && git push --tags

echo "Deployed $NEW_VERSION"
