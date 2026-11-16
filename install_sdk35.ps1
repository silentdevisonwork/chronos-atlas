$env:ANDROID_HOME = "C:\Android\Sdk"
$sdkManager = "C:\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat"
& $sdkManager "--sdk_root=C:\Android\Sdk" "platforms;android-35" "build-tools;35.0.0" "platform-tools"
