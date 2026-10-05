@echo off
rem =========================================================
rem WordLoop - iOS Platform Sync & Builder
rem Multi-Stage Dynamic Version Extraction Pipeline
rem =========================================================
chcp 65001 > nul
setlocal enabledelayedexpansion

rem ---------------------------------------------------------
rem Dynamic Multi-Stage Version Extraction (Single Source of Truth)
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
    set APP_VER=3.12.0
)

title WordLoop iOS Build Pipeline - v%APP_VER%

echo =========================================================
echo   WordLoop - iOS (iPhone / iPad) Project Builder
echo   Detected Application Version: v%APP_VER%
echo =========================================================

echo [1/3] Building Web Assets...
call node scripts\build-web.js
if %errorlevel% neq 0 (
    echo [ERROR] Web Build Failed!
    pause
    exit /b %errorlevel%
)

echo [2/3] Syncing to iOS (Capacitor)...
call node scripts\sync-ios.js auto

echo =========================================================
echo [SUCCESS] iOS Assets Synced!
echo Note: iOS native compilation (.ipa) requires Xcode on macOS.
echo On macOS, run: npx cap open ios
echo On iPhone without Mac: Use Safari 'Add to Home Screen' (PWA)
echo =========================================================
pause
