@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo  FlashLog - Android Debug APK Build
echo ========================================
echo.

echo [1/4] Building frontend (npm run build)...
call npm run build
if errorlevel 1 (
  echo.
  echo ERROR: Frontend build failed.
  exit /b 1
)
echo.

echo [2/4] Syncing web assets to Android (npx cap sync android)...
call npx cap sync android
if errorlevel 1 (
  echo.
  echo ERROR: Capacitor sync failed.
  exit /b 1
)
echo.

echo [3/4] Entering android directory...
cd android
if errorlevel 1 (
  echo.
  echo ERROR: android directory not found. Run: npx cap add android
  exit /b 1
)

echo [4/4] Building debug APK (gradlew assembleDebug)...
call gradlew.bat assembleDebug
if errorlevel 1 (
  echo.
  echo ERROR: Gradle build failed.
  exit /b 1
)

set "APK_REL=app\build\outputs\apk\debug\app-debug.apk"
set "APK_ABS=%CD%\%APK_REL%"

echo.
echo ========================================
echo  Build succeeded
echo ========================================
echo.
echo Debug APK:
echo   %APK_ABS%
echo.
echo Install on device: adb install -r "%APK_ABS%"
echo.

endlocal
exit /b 0
