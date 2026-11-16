@echo off
echo Building Chronos Atlas Web Assets...
npm run build
echo Syncing with Android Capacitor...
npx cap sync android
echo Building Android APK...
cd android
if exist gradlew.bat (
  call gradlew.bat assembleDebug
  echo ==================================================
  echo APK successfully built!
  echo Location: android/app/build/outputs/apk/debug/app-debug.apk
  echo ==================================================
) else (
  echo Please open the 'android' folder in Android Studio to build your APK.
)
pause
