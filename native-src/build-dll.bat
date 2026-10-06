@echo off
rem =========================================================
rem WordLoop - Native C/C++ DLL Suite Build Script
rem Builds WordLoopAudioEngine.dll, WordLoopFastDB.dll, WordLoopSRSNeuralEngine.dll, WordLoopMorphEngine.dll, WordLoopTrayHook.dll
rem Target: Windows x64 Release (AVX2 / MSVC 2022)
rem =========================================================
chcp 65001 > nul
setlocal enabledelayedexpansion

echo =========================================================
echo   WordLoop Native Suite - 64-bit DLL Builder (5 Engines)
echo =========================================================

where cmake >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] CMake is not found in PATH.
    echo Please install CMake and Visual Studio 2022 C++ build tools.
    pause
    exit /b 1
)

if not exist "build" mkdir build
cd build

echo [1/2] Generating Visual Studio 2022 x64 build configuration...
cmake -G "Visual Studio 17 2022" -A x64 ..
if %errorlevel% neq 0 (
    echo [ERROR] CMake configuration failed.
    pause
    exit /b 1
)

echo [2/2] Compiling Release 64-bit DLL binaries...
cmake --build . --config Release
if %errorlevel% neq 0 (
    echo [ERROR] DLL compilation failed.
    pause
    exit /b 1
)

echo =========================================================
echo [SUCCESS] WordLoop 5 Native DLLs built successfully!
echo Binaries located in: native-src\build\bin\Release\
echo   1. WordLoopAudioEngine.dll
echo   2. WordLoopFastDB.dll
echo   3. WordLoopSRSNeuralEngine.dll
echo   4. WordLoopMorphEngine.dll
echo   5. WordLoopTrayHook.dll
echo =========================================================
pause
