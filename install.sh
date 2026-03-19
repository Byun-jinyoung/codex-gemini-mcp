#!/bin/bash
# Install codex-gemini-mcp (Byun-jinyoung fork)
# Usage: curl -sL https://raw.githubusercontent.com/Byun-jinyoung/codex-gemini-mcp/main/install.sh | bash
set -e

REPO="https://github.com/Byun-jinyoung/codex-gemini-mcp.git"
TMPDIR="/tmp/codex-gemini-mcp-install"
ERRORS=0

echo "=== Installing codex-gemini-mcp (fork with session resume + gemini -y) ==="

# Prerequisites check
echo "[0/5] Checking prerequisites..."
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
echo "[1/5] Cloning..."
git clone --depth 1 "$REPO" "$TMPDIR"
cd "$TMPDIR"

# Install dependencies
echo "[2/5] Installing dependencies..."
npm install --ignore-scripts

# Global install (detect if sudo is needed)
echo "[3/5] Installing globally..."
USE_SUDO=""
# Test if we can write to global npm prefix
NPM_PREFIX=$(npm prefix -g 2>/dev/null)
if [ ! -w "$NPM_PREFIX/lib" ] 2>/dev/null; then
  USE_SUDO="sudo"
  echo "  Using sudo (global prefix: $NPM_PREFIX)"
fi
$USE_SUDO npm install -g .

# Verify binaries
echo "[4/5] Verifying binaries..."
# Refresh PATH to pick up newly installed binaries
hash -r 2>/dev/null || true
for bin in codex-mcp gemini-mcp; do
  if command -v $bin &>/dev/null; then
    echo "  $bin: $(which $bin)"
  else
    echo "  ERROR: $bin not found on PATH"
    ERRORS=$((ERRORS + 1))
  fi
done

# Verify fork features (session_id + -y flag)
echo "[5/5] Verifying fork features..."

# Find actual install path (works on both local and server environments)
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

  # Check session_id in schema
  if grep -q "session_id" "$INSTALL_PATH/tools/schema.js" 2>/dev/null; then
    echo "  session_id parameter: OK"
  else
    echo "  ERROR: session_id parameter missing (not fork version)"
    ERRORS=$((ERRORS + 1))
  fi

  # Check -y flag in gemini provider
  if grep -q '"-y"' "$INSTALL_PATH/providers/gemini.js" 2>/dev/null; then
    echo "  gemini -y flag: OK"
  else
    echo "  ERROR: gemini -y flag missing (not fork version)"
    ERRORS=$((ERRORS + 1))
  fi

  # Check resume in codex provider
  if grep -q '"resume"' "$INSTALL_PATH/providers/codex.js" 2>/dev/null; then
    echo "  codex resume: OK"
  else
    echo "  ERROR: codex resume missing (not fork version)"
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
