@echo off
set JAVA_HOME=C:\Users\PC\.antigravity\extensions\redhat.java-1.51.0-win32-x64\jre\21.0.9-win32-x86_64
set ANDROID_HOME=C:\Android\Sdk
echo Installing Android SDK 35 & build-tools 35...
C:\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat --sdk_root=C:\Android\Sdk "platforms;android-35" "build-tools;35.0.0" "platform-tools"
pause
