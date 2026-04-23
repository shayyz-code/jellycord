# JellyCord CLI Installer for Windows
# Usage: iex (irm https://raw.githubusercontent.com/shayyz-code/jellycord/main/scripts/install-cli.ps1)

$Owner = "shayyz-code"
$Repo = "jellycord"
$BinaryName = "jellycord.exe"

$ErrorActionPreference = "Stop"

# 1. Detect Architecture
$Arch = "x86_64"
if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") {
    $Arch = "arm64"
}

Write-Host "Fetching latest release from GitHub..." -ForegroundColor Cyan
$Release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Owner/$Repo/releases/latest"
$Tag = $Release.tag_name

# 2. Find Asset
$AssetName = "${Repo}_Windows_$Arch.zip"
$Asset = $Release.assets | Where-Object { $_.name -eq $AssetName }

if (-not $Asset) {
    Write-Error "Could not find asset $AssetName for release $Tag"
}

$DownloadUrl = $Asset.browser_download_url
$TempZip = [System.IO.Path]::GetTempFileName() + ".zip"
$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) "jellycord-install"

if (Test-Path $TempDir) { Remove-Item -Recurse -Force $TempDir }
New-Item -ItemType Directory -Path $TempDir | Out-Null

# 3. Download and Extract
Write-Host "Downloading $AssetName ($Tag)..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $DownloadUrl -OutFile $TempZip

Write-Host "Extracting..." -ForegroundColor Cyan
Expand-Archive -Path $TempZip -DestinationPath $TempDir -Force

# 4. Install
$InstallDir = Join-Path $env:LOCALAPPDATA "JellyCord\bin"
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$ExePath = Join-Path $InstallDir $BinaryName
Move-Item -Path (Join-Path $TempDir "jellycord.exe") -Destination $ExePath -Force

# 5. Update PATH
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
    Write-Host "Adding $InstallDir to User PATH..." -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
    $env:Path += ";$InstallDir"
}

# Cleanup
Remove-Item $TempZip -Force
Remove-Item -Recurse -Force $TempDir

Write-Host "`nSuccessfully installed JellyCord CLI!" -ForegroundColor Green
Write-Host "You may need to restart your terminal for PATH changes to take effect." -ForegroundColor Yellow
Write-Host "Try running: jellycord help" -ForegroundColor Cyan
