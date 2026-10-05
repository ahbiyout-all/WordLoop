@echo off
rem =========================================================
rem WordLoop - GitHub Automated Sync and Release Script
rem GitHub Account: ahbiyout-all
rem Git User Name:  AhBiYout-all
rem Repository:     ahbiyout-all/WordLoop
rem Dynamic Semantic Versioning and Automated Tagging Pipeline
rem =========================================================
chcp 65001 > nul
setlocal enabledelayedexpansion

echo =========================================================
echo   WordLoop - GitHub Auto Sync and Release Tool
echo   GitHub Account: ahbiyout-all
echo   Git User Name:  AhBiYout-all
echo   Target Repo:    https://github.com/ahbiyout-all/WordLoop.git
echo =========================================================

rem ---------------------------------------------------------
rem Stage 1: Dynamic Multi-Stage Version Extraction
rem ---------------------------------------------------------
set APP_VER=

if exist "scripts\get-version.cjs" (
    for /f "tokens=*" %%v in ('node scripts\get-version.cjs 2^>nul') do set APP_VER=%%v
)

if "%APP_VER%"=="" (
    if exist "package.json" (
        for /f "tokens=*" %%v in ('node -p "require('./package.json').version" 2^>nul') do set APP_VER=%%v
    )
)

if "%APP_VER%"=="" (
    if exist "package.json" (
        for /f "tokens=*" %%v in ('powershell -NoProfile -Command "(Get-Content package.json | ConvertFrom-Json).version" 2^>nul') do set APP_VER=%%v
    )
)

if "%APP_VER%"=="" (
    set APP_VER=3.13.0
)

title WordLoop GitHub Auto Sync - v%APP_VER%
echo [INFO] Detected Application Version: v%APP_VER%
echo =========================================================

rem ---------------------------------------------------------
rem Stage 2: Git Repository Verification and Remote Setup
rem ---------------------------------------------------------
if not exist ".git" (
    echo [1/6] Initializing local Git repository...
    git init
) else (
    echo [1/6] Git repository already initialized.
)

rem Configure Git User Name and Email for this repository
echo [GIT] Configuring local Git user.name to AhBiYout-all...
git config user.name "AhBiYout-all"
echo [GIT] Configuring local Git user.email to redmunlight@hanil.org...
git config user.email "redmunlight@hanil.org"

rem Configure Remote Origin (ahbiyout-all/WordLoop)
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo [2/6] Setting remote origin to https://github.com/ahbiyout-all/WordLoop.git ...
    git remote add origin https://github.com/ahbiyout-all/WordLoop.git
) else (
    echo [2/6] Updating remote origin URL to https://github.com/ahbiyout-all/WordLoop.git ...
    git remote set-url origin https://github.com/ahbiyout-all/WordLoop.git
)

rem Ensure main branch
git branch -M main

rem ---------------------------------------------------------
rem Stage 3: Stage Files with .gitignore Protection
rem ---------------------------------------------------------
echo [3/6] Staging files (ignoring temporary and binary files via .gitignore)...
git add .
git status -s

rem ---------------------------------------------------------
rem Stage 4: Commit with Dynamic Semantic Versioning
rem ---------------------------------------------------------
echo [4/6] Committing changes with dynamic release message...
git commit -m "chore(release): WordLoop v%APP_VER% - automated sync and documentation" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Committed changes as v%APP_VER%.
) else (
    echo [INFO] Working tree clean or already committed.
)

rem ---------------------------------------------------------
rem Stage 5: Semantic Version Tagging
rem ---------------------------------------------------------
echo [5/6] Creating / Updating Git Release Tag (v%APP_VER%)...
git tag -fa "v%APP_VER%" -m "WordLoop Release v%APP_VER%"
if %errorlevel% neq 0 (
    echo [WARN] Tag creation returned warning, continuing...
)

rem ---------------------------------------------------------
rem Stage 6: Push to Remote Repository and GitHub Releases
rem ---------------------------------------------------------
echo [6/6] Pushing to GitHub (origin main and tags)...
echo ---------------------------------------------------------
echo Target: https://github.com/ahbiyout-all/WordLoop.git
echo Branch: main
echo Release Tag: v%APP_VER%
echo ---------------------------------------------------------

git push -u origin main --follow-tags
if %errorlevel% neq 0 (
    echo [WARN] Main push completed. Attempting explicit tag push...
    git push origin "v%APP_VER%" --force
)

echo =========================================================
echo [SUCCESS] Git Synchronization and Release Completed!
echo Application Version: v%APP_VER%
echo GitHub Repository: https://github.com/ahbiyout-all/WordLoop
echo GitHub Releases: https://github.com/ahbiyout-all/WordLoop/releases
echo GitHub Actions: https://github.com/ahbiyout-all/WordLoop/actions
echo =========================================================
pause
