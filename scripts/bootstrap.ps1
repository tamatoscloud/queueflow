# One-time (and after-pulling-changes) workspace setup.
$ErrorActionPreference = "Stop"

if (-not (Get-Command melos -ErrorAction SilentlyContinue)) {
    Write-Host "Melos not found - activating globally via dart pub..."
    dart pub global activate melos
}

melos bootstrap
melos run gen

Write-Host ""
Write-Host "Workspace ready. See docs/SETUP.md for how to run each app."
