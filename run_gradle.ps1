$env:JAVA_HOME = 'C:\Users\PC\.antigravity\extensions\redhat.java-1.51.0-win32-x64\jre\21.0.9-win32-x86_64'
$env:ANDROID_HOME = 'C:\Android\Sdk'
cd android
.\gradlew assembleDebug
