@echo off
cd /d "%~dp0"
echo Setting up local.properties...
echo sdk.dir=C:\\Android\\Sdk > android\local.properties

echo Building web assets...
call npm run build

echo Syncing Capacitor Android...
npx cap sync android

echo Compiling Android APK with Gradle...
cd android
call gradlew.bat assembleDebug

echo ========================================================
echo BUILD COMPLETE!
echo APK Path: chronos-atlas\android\app\build\outputs\apk\debug\app-debug.apk
echo ========================================================
pause
