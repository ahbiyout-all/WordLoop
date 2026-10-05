#!/usr/bin/env bash
# =========================================================
# WordLoop - iOS Platform Sync & Builder (Bash)
# =========================================================
set -e

APP_VER=$(node -p "try { require('./package.json').version } catch(e) { '3.11.0' }" 2>/dev/null || echo "3.11.0")

echo "========================================================="
echo "  WordLoop - iOS Project Builder (v${APP_VER})"
echo "========================================================="

echo "[1/3] Building Web Application..."
node scripts/build-web.js

echo "[2/3] Syncing Capacitor iOS..."
node scripts/sync-ios.js auto

echo "[3/3] Opening Xcode (if on macOS)..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  npx cap open ios || true
else
  echo "[INFO] Running on non-macOS. Xcode compilation must be run on macOS."
fi

echo "========================================================="
echo "🎉 iOS Project Synced for v${APP_VER}!"
echo "========================================================="
