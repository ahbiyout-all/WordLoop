@echo off
rem =========================================================
rem WordLoop - PC Desktop App (Electron) Build Script
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

title WordLoop PC Build Pipeline - v%APP_VER%

echo =========================================================
echo   WordLoop - PC Desktop App (Windows .exe) Builder
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

echo [2/4] Building Web Application (Vite)...
call node scripts\build-web.js
if %errorlevel% neq 0 (
    echo [ERROR] Web Build Failed!
    pause
    exit /b %errorlevel%
)
echo [OK] Web build completed!

echo [3/4] Checking Electron Dependencies...
call npm list electron >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installing Electron and Electron-Builder...
    call npm install --save-dev electron electron-builder --no-audit --no-fund
)

echo [4/4] Packaging PC Executable File (.exe) for v%APP_VER%...
call node scripts\build-electron.js

if %errorlevel% equ 0 (
    echo =========================================================
    echo [SUCCESS] PC Desktop App build completed successfully!
    echo Output directory: dist_electron\
    echo Application Version: v%APP_VER%
    echo =========================================================
) else (
    echo [ERROR] Packaging failed.
)

pause
