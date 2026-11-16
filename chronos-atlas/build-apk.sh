#!/usr/bin/env bash
set -e
echo "Building Chronos Atlas Web Assets..."
npm run build
echo "Syncing with Android Capacitor..."
npx cap sync android
echo "Building Android APK..."
cd android
if [ -f "./gradlew" ]; then
  chmod +x ./gradlew
  ./gradlew assembleDebug
  echo "=================================================="
  echo "APK successfully built!"
  echo "Location: android/app/build/outputs/apk/debug/app-debug.apk"
  echo "=================================================="
else
  echo "Gradle wrapper not found. Please open the 'android' folder in Android Studio to build your APK."
fi
