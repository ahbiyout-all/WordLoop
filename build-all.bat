@echo off
rem =========================================================
rem WordLoop - Cross-Platform Auto Build Tool for Windows
rem =========================================================
chcp 65001 > nul

echo =========================================================
echo   WordLoop - Cross-Platform Build Menu (Windows CMD)
echo =========================================================
echo  1. Build PC Desktop App (Windows .exe - Electron)
echo  2. Build Android App (Android Studio / APK - Capacitor)
echo  3. Build BOTH PC and Android
echo  4. Sync iOS Project (Capacitor iOS)
echo =========================================================
set /p CHOICE="Select build option (1-4): "

if "%CHOICE%"=="1" goto BUILD_PC
if "%CHOICE%"=="2" goto BUILD_ANDROID
if "%CHOICE%"=="3" goto BUILD_BOTH
if "%CHOICE%"=="4" goto BUILD_IOS

echo [ERROR] Invalid choice. Exiting...
pause
exit /b 1

:BUILD_PC
call build-pc.bat
goto END

:BUILD_ANDROID
call build-android.bat
goto END

:BUILD_BOTH
echo [INFO] Step 1: Building PC Desktop App...
call build-pc.bat
echo.
echo [INFO] Step 2: Building Android App...
call build-android.bat
goto END

:BUILD_IOS
call build-ios.bat
goto END

:END
