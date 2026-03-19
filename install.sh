#!/bin/bash
# Install codex-gemini-mcp (Byun-jinyoung fork)
# Usage: curl -sL https://raw.githubusercontent.com/Byun-jinyoung/codex-gemini-mcp/main/install.sh | bash
set -e

REPO="https://github.com/Byun-jinyoung/codex-gemini-mcp.git"
TMPDIR="/tmp/codex-gemini-mcp-install"

echo "=== Installing codex-gemini-mcp (fork with session resume + gemini -y) ==="

# Clean previous install attempts
rm -rf "$TMPDIR"

# Clone
echo "[1/4] Cloning..."
git clone --depth 1 "$REPO" "$TMPDIR"

cd "$TMPDIR"

# Install dependencies
echo "[2/4] Installing dependencies..."
npm install --ignore-scripts

# Global install
echo "[3/4] Installing globally (may require sudo)..."
if npm install -g . 2>/dev/null; then
  echo "[4/4] Verifying..."
else
  echo "[3/4] Retrying with sudo..."
  sudo npm install -g .
  echo "[4/4] Verifying..."
fi

# Verify
if command -v codex-mcp &>/dev/null && command -v gemini-mcp &>/dev/null; then
  echo ""
  echo "=== Installation successful ==="
  echo "  codex-mcp: $(which codex-mcp)"
  echo "  gemini-mcp: $(which gemini-mcp)"
  echo ""
  echo "Features: session_id resume, gemini -y (swarm support)"
else
  echo "WARNING: binaries not found on PATH. You may need to restart your shell."
fi

# Cleanup
rm -rf "$TMPDIR"
