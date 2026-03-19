#!/bin/bash
# Install codex-gemini-mcp (Byun-jinyoung fork)
# Usage: curl -sL https://raw.githubusercontent.com/Byun-jinyoung/codex-gemini-mcp/main/install.sh | bash
set -e

REPO="https://github.com/Byun-jinyoung/codex-gemini-mcp.git"
TMPDIR="/tmp/codex-gemini-mcp-install"
ERRORS=0

echo "=== Installing codex-gemini-mcp (fork with session resume + gemini -y) ==="

# Prerequisites check
echo "[0/6] Checking prerequisites..."
for cmd in git node npm; do
  if ! command -v $cmd &>/dev/null; then
    echo "ERROR: $cmd is required but not found."
    exit 1
  fi
done
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 20 ]; then
  echo "ERROR: Node.js >= 20 required (found: $(node -v))"
  exit 1
fi
echo "  node $(node -v), npm $(npm -v)"

# Clean previous install attempts
rm -rf "$TMPDIR"

# Clone
echo "[1/6] Cloning..."
git clone --depth 1 "$REPO" "$TMPDIR"
cd "$TMPDIR"

# Install dependencies
echo "[2/6] Installing dependencies..."
npm install --ignore-scripts

# Pack into tarball (guarantees file copy, no symlinks)
echo "[3/6] Packing..."
TARBALL=$(npm pack --pack-destination . 2>/dev/null | tail -1)
if [ ! -f "$TARBALL" ]; then
  echo "ERROR: npm pack failed"
  exit 1
fi
echo "  Created: $TARBALL"

# Global install from tarball (3-step fallback)
echo "[4/6] Installing globally..."
USE_SUDO=""
NPM_PREFIX=$(npm prefix -g 2>/dev/null)

INSTALLED=false

# Step 1: Try without sudo
if npm install -g "./$TARBALL" 2>/dev/null; then
  INSTALLED=true
  echo "  Installed to: $(npm prefix -g)"
fi

# Step 2: Try with sudo
if [ "$INSTALLED" = false ]; then
  echo "  Permission denied. Trying sudo..."
  if sudo npm install -g "./$TARBALL" 2>/dev/null; then
    INSTALLED=true
    USE_SUDO="sudo"
    echo "  Installed with sudo to: $(sudo npm prefix -g)"
  fi
fi

# Step 3: Fallback to user-local prefix
if [ "$INSTALLED" = false ]; then
  echo "  sudo unavailable. Installing to ~/.npm-global..."
  mkdir -p "$HOME/.npm-global"
  npm config set prefix "$HOME/.npm-global"
  npm install -g "./$TARBALL"
  INSTALLED=true
  NPM_PREFIX="$HOME/.npm-global"
  echo "  Installed to: $NPM_PREFIX"
  echo ""
  echo "  NOTE: Add to your shell profile if not already done:"
  echo "    export PATH=\"\$HOME/.npm-global/bin:\$PATH\""
fi

# Verify binaries
echo "[5/6] Verifying binaries..."
hash -r 2>/dev/null || true
for bin in codex-mcp gemini-mcp; do
  if command -v $bin &>/dev/null; then
    echo "  $bin: $(which $bin)"
  else
    echo "  ERROR: $bin not found on PATH"
    ERRORS=$((ERRORS + 1))
  fi
done

# Verify fork features
echo "[6/6] Verifying fork features..."

INSTALL_PATH=""
for candidate in \
  "$NPM_PREFIX/lib/node_modules/@donghae0414/codex-gemini-mcp/dist" \
  "/usr/local/lib/node_modules/@donghae0414/codex-gemini-mcp/dist" \
  "/usr/lib/node_modules/@donghae0414/codex-gemini-mcp/dist" \
  "$(npm root -g 2>/dev/null)/@donghae0414/codex-gemini-mcp/dist"; do
  if [ -d "$candidate" ] 2>/dev/null; then
    INSTALL_PATH="$candidate"
    break
  fi
done

if [ -z "$INSTALL_PATH" ]; then
  echo "  ERROR: Could not locate installed dist/ directory"
  ERRORS=$((ERRORS + 1))
else
  echo "  Install path: $INSTALL_PATH"

  if grep -q "session_id" "$INSTALL_PATH/tools/schema.js" 2>/dev/null; then
    echo "  session_id parameter: OK"
  else
    echo "  ERROR: session_id parameter missing"
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q '"-y"' "$INSTALL_PATH/providers/gemini.js" 2>/dev/null; then
    echo "  gemini -y flag: OK"
  else
    echo "  ERROR: gemini -y flag missing"
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q '"resume"' "$INSTALL_PATH/providers/codex.js" 2>/dev/null; then
    echo "  codex resume: OK"
  else
    echo "  ERROR: codex resume missing"
    ERRORS=$((ERRORS + 1))
  fi
fi

# Cleanup
rm -rf "$TMPDIR"

# Result
echo ""
if [ $ERRORS -eq 0 ]; then
  echo "=== Installation successful (all checks passed) ==="
  echo "  Features: session_id resume, gemini -y (swarm support)"
else
  echo "=== Installation completed with $ERRORS error(s) ==="
  echo "  Try: $USE_SUDO npm uninstall -g @donghae0414/codex-gemini-mcp"
  echo "  Then re-run this script."
  exit 1
fi
