#!/usr/bin/env bash
set -euo pipefail

# Publish GSD-PM as @david-xpn/gsd-pm
#
# Usage:
#   ./scripts/publish-fork.sh          # publish current version
#   ./scripts/publish-fork.sh 1.0.0    # publish specific version
#
# After publishing, install with:
#   npx @david-xpn/gsd-pm

SCOPE="@david-xpn"
PKG_NAME="gsd-pm"
FULL_NAME="${SCOPE}/${PKG_NAME}"
VERSION="${1:-}"

# Colors
green='\033[0;32m'
yellow='\033[0;33m'
cyan='\033[0;36m'
reset='\033[0m'

cd "$(dirname "$0")/.."

echo ""
echo -e "${cyan}Publishing ${FULL_NAME}${reset}"
echo ""

# 1. Check npm login
if ! npm whoami &>/dev/null; then
  echo -e "${yellow}Not logged in to npm. Run:${reset}"
  echo "  npm login"
  exit 1
fi

LOGGED_IN_AS=$(npm whoami)
echo -e "  Logged in as: ${green}${LOGGED_IN_AS}${reset}"

# 2. Build hooks and notion-sync (same as prepublishOnly)
echo ""
echo "  Building hooks..."
npm run build:hooks --silent
echo "  Building notion-sync..."
npm run build:notion-sync --silent
echo -e "  ${green}✓${reset} Build complete"

# 3. Create a temporary package.json for publishing
echo ""
echo "  Preparing package..."

# Back up original
cp package.json package.json.bak

# Patch package.json for fork
node -e '
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

const version = process.argv[1] || pkg.version;

pkg.name = "'"${FULL_NAME}"'";
pkg.version = version;
pkg.bin = { "'"${PKG_NAME}"'": "bin/install.js" };
pkg.description = "GSD for PMs — " + pkg.description;
pkg.publishConfig = { access: "public" };

fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
console.log("  Name: " + pkg.name);
console.log("  Version: " + pkg.version);
' "$VERSION"

# 4. Publish
echo ""
echo -e "  ${cyan}Publishing...${reset}"

if npm publish --access public; then
  echo ""
  echo -e "  ${green}✓ Published ${FULL_NAME}${reset}"
  echo ""
  echo "  Install with:"
  echo -e "    ${cyan}npx ${FULL_NAME}${reset}"
  echo ""
else
  echo ""
  echo -e "  ${yellow}Publish failed. Check errors above.${reset}"
fi

# 5. Restore original package.json
mv package.json.bak package.json
echo -e "  ${green}✓${reset} Restored original package.json"
