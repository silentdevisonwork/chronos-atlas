$sdkDir = "C:\Android\Sdk"
if (!(Test-Path $sdkDir)) {
    New-Item -ItemType Directory -Force -Path $sdkDir | Out-Null
    Write-Host "Downloading Android Command Line Tools..."
    $url = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    $zipPath = "C:\Android\cmdtools.zip"
    Invoke-WebRequest -Uri $url -OutFile $zipPath
    Write-Host "Extracting Tools..."
    Expand-Archive -Path $zipPath -DestinationPath "C:\Android\temp_tools" -Force
    New-Item -ItemType Directory -Force -Path "$sdkDir\cmdline-tools\latest" | Out-Null
    Move-Item -Force "C:\Android\temp_tools\cmdline-tools\*" "$sdkDir\cmdline-tools\latest\"
    Remove-Item $zipPath -ErrorAction SilentlyContinue
    Remove-Item "C:\Android\temp_tools" -Recurse -ErrorAction SilentlyContinue
}
Write-Host "Android SDK base structure ready at C:\Android\Sdk"
