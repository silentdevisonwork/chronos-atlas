@echo off
title Chronos Atlas - Wireless APK Installer
color 0b
echo ========================================================
echo     CHRONOS ATLAS - WIRELESS APK SHARING & INSTALLER
echo ========================================================
echo.

REM Ensure web build and apk sync are fresh
echo [1/3] Building production assets...
call npm run build
call npx cap sync android

echo.
echo [2/3] Preparing APK build...
cd android
call gradlew.bat assembleDebug
cd ..

echo.
echo ========================================================
echo [3/3] READY TO TRANSFER OVER WIFI (NO USB NEEDED!)
echo ========================================================
echo.
echo To install on your phone without a USB cable:
echo 1. Make sure your phone and this PC are on the SAME Wi-Fi network.
echo 2. Open your phone camera or QR scanner.
echo 3. Run a local sharing method below or open the address in your phone browser:
echo.
echo Your APK is located at:
echo %CD%\android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo Starting local web server to let your phone download the APK directly...
echo.

REM Start a quick python or node server hosting the apk output folder
python -c "import http.server, socket; hostname = socket.gethostbyname(socket.gethostname()); port = 8080; print(f'>>> Open http://{hostname}:{port}/android/app/build/outputs/apk/debug/app-debug.apk on your phone browser!'); http.server.HTTPServer(('', port), http.server.SimpleHTTPRequestHandler).serve_forever()"

pause
