@echo off
rem =========================================================
rem WordLoop - Android APK One-Click Build & Sync
rem =========================================================
chcp 65001 > nul

echo =========================================================
echo   WordLoop - Android APK One-Click Build (Windows .bat)
echo =========================================================
echo.

echo [1/4] Checking project packages (npm install)...
if not exist "node_modules\vite\bin\vite.js" (
    echo [INFO] Installing project dependencies (1-2 minutes on first run)...
    call npm install --no-audit --no-fund
    if %errorlevel% neq 0 (
        echo [ERROR] 'npm install' failed! Please ensure Node.js is installed.
        pause
        exit /b %errorlevel%
    )
)
echo [OK] Node.js dependencies verified.
echo.

echo [2/4] Building Vite Web Application...
call node scripts\build-web.js
if %errorlevel% neq 0 (
    echo [ERROR] Web build failed!
    pause
    exit /b %errorlevel%
)
echo [OK] Web build completed.
echo.

echo [3/4] Checking Capacitor Android packages...
call npm list @capacitor/core >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installing Capacitor Core and Android modules...
    call npm install @capacitor/core --save --no-audit --no-fund
    call npm install --save-dev @capacitor/cli @capacitor/android --no-audit --no-fund
)

echo.
echo [4/4] Syncing web assets to Android (node scripts\sync-android.js)...
call node scripts\sync-android.js auto

echo.
echo =========================================================
echo   Android build & sync completed successfully!
echo =========================================================
echo.
echo Next steps:
echo 1) Open project in Android Studio (Recommended):
echo    node scripts\sync-android.js open
echo.
echo 2) Build Debug APK directly via Command Line (Requires Android SDK):
echo    cd android ^&^& gradlew.bat assembleDebug
echo    (Output: android\app\build\outputs\apk\debug\app-debug.apk)
echo.
echo =========================================================
pause
