#!/usr/bin/env bash
# =========================================================
# WordLoop - GitHub Automated Sync & Release Script (Bash)
# GitHub Account: AhBiYout
# Git User Name:  AhBiYout-all
# Repository:     AhBiYout/WordLoop
# =========================================================
set -e

echo "========================================================="
echo "  WordLoop - GitHub Auto Sync & Release Tool (Bash)"
echo "  GitHub Account: AhBiYout"
echo "  Git User Name:  AhBiYout-all"
echo "  Target Repo:    https://github.com/AhBiYout/WordLoop.git"
echo "========================================================="

# 1. Dynamic Version Extraction (Single Source of Truth)
APP_VER=""

if [ -f "package.json" ]; then
  APP_VER=$(node -p "try { require('./package.json').version } catch(e) {}" 2>/dev/null || true)
fi

if [ -z "$APP_VER" ] && [ -f "docs/PATCH_NOTES.md" ]; then
  APP_VER=$(grep -E '##\s*🚀\s*Version\s*[0-9]+\.[0-9]+\.[0-9]+' docs/PATCH_NOTES.md | head -n 1 | sed -E 's/.*Version\s*([0-9]+\.[0-9]+\.[0-9]+).*/\1/' || true)
fi

if [ -z "$APP_VER" ]; then
  APP_VER="3.13.0"
fi

echo "[INFO] Detected Application Version: v${APP_VER}"

# 2. Git Setup
if [ ! -d ".git" ]; then
  echo "[1/6] Initializing Git repository..."
  git init
fi

# Configure Git user.name and email
echo "[GIT] Setting local Git user.name to AhBiYout-all..."
git config user.name "AhBiYout-all"
echo "[GIT] Setting local Git user.email to redmunlight@hanil.org..."
git config user.email "redmunlight@hanil.org"

echo "[2/6] Configuring remote origin (AhBiYout/WordLoop)..."
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin https://github.com/AhBiYout/WordLoop.git
else
  git remote add origin https://github.com/AhBiYout/WordLoop.git
fi

git branch -M main

# 3. Stage Files
echo "[3/6] Staging files..."
git add .
git status -s

# 4. Commit
echo "[4/6] Committing changes..."
git commit -m "chore(release): WordLoop v${APP_VER} - automated sync & release" || echo "[INFO] Working tree clean"

# 5. Tagging
echo "[5/6] Creating Release Tag v${APP_VER}..."
git tag -fa "v${APP_VER}" -m "WordLoop Release v${APP_VER}" || true

# 6. Push
echo "[6/6] Pushing to GitHub..."
git push -u origin main --follow-tags || git push origin "v${APP_VER}" --force

echo "========================================================="
echo "🎉 [SUCCESS] Git Synchronization & Release Completed!"
echo "Version: v${APP_VER}"
echo "URL: https://github.com/AhBiYout/WordLoop"
echo "Releases: https://github.com/AhBiYout/WordLoop/releases"
echo "Actions: https://github.com/AhBiYout/WordLoop/actions"
echo "========================================================="
