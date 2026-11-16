# Chronos Atlas — GitHub APK Release Guide

Because GitHub restricts pushing CI workflow files (`.github/workflows/*.yml`) unless your Personal Access Token has the `workflow` scope, the cleanest and most reliable way to publish your Android APK on GitHub is using **GitHub Releases**.

## Option 1: Build & Publish via GitHub Releases (Recommended)

1. **Build the Web Assets & Sync Capacitor:**
   ```bash
   npm run build
   npx cap sync android
   ```

2. **Build the APK (locally or via Android Studio):**
   - Open Android Studio (`npx cap open android`), or run Gradle if JDK is installed:
     ```bash
     cd android
     ./gradlew assembleDebug
     ```
   - The compiled APK will be located at:
     `android/app/build/outputs/apk/debug/app-debug.apk`

3. **Upload to GitHub Releases:**
   - Go to your repository: [https://github.com/silentdevisonwork/chronos-atlas/releases](https://github.com/silentdevisonwork/chronos-atlas/releases)
   - Click **Draft a new release**.
   - Create a tag (e.g., `v1.0.0`).
   - Drag and drop `app-debug.apk` into the binaries section.
   - Click **Publish release**.

Users visiting your repository will now see the APK directly under **Releases** on the right sidebar and can download it instantly onto their Android phones!
