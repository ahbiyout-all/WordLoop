@echo off
rem =========================================================
rem WordLoop - Android App (APK / Studio) Build Script
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
    set APP_VER=3.13.0
)

title WordLoop Android Build Pipeline - v%APP_VER%

echo =========================================================
echo   WordLoop - Android APK and Native Project Builder
echo   Detected Application Version: v%APP_VER%
echo =========================================================

echo [1/4] Checking Node.js dependencies...
if not exist "node_modules\vite\bin\vite.js" (
    echo [INFO] Project dependencies not found. Installing packages...
    echo [INFO] This initial install may take 1-2 minutes, please wait...
    call npm install --no-audit --no-fund
    if %errorlevel% neq 0 (
        echo [ERROR] 'npm install' failed!
        pause
        exit /b %errorlevel%
    )
)
echo [OK] Node.js dependencies verified.

echo [2/4] Building Web Application Assets...
call node scripts\build-web.js
if %errorlevel% neq 0 (
    echo [ERROR] Web Build Failed!
    pause
    exit /b %errorlevel%
)

echo [3/4] Checking Capacitor Android dependencies...
call npm list @capacitor/core >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installing Capacitor Core and Android packages...
    call npm install @capacitor/core --save --no-audit --no-fund
    call npm install --save-dev @capacitor/cli @capacitor/android --no-audit --no-fund
)

echo [4/4] Syncing Web Assets to Android project...
call node scripts\sync-android.js auto

echo =========================================================
echo [SUCCESS] Android Project Synced for v%APP_VER%!
echo.
echo Options to build APK:
echo 1) Open in Android Studio:
echo    node scripts\sync-android.js open
echo.
echo 2) Command-line APK build (Requires Android SDK & Java 17):
echo    cd android ^&^& gradlew.bat assembleDebug
echo    (Output: android\app\build\outputs\apk\debug\app-debug.apk)
echo =========================================================
pause
