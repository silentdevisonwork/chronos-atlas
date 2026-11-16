@echo off
set JAVA_HOME=C:\Users\PC\.antigravity\extensions\redhat.java-1.51.0-win32-x64\jre\21.0.9-win32-x86_64
set ANDROID_HOME=C:\Android\Sdk
echo Building web assets...
call npm run build
echo Syncing Capacitor...
npx cap sync android
echo Building APK...
cd android
call gradlew.bat assembleDebug
pause
