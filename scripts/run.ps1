# Usage: scripts/run.ps1 -App customer_app -Flavor dev
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("customer_app", "business_app", "admin_panel", "marketing_website")]
    [string]$App,

    [Parameter(Mandatory = $true)]
    [ValidateSet("dev", "staging", "production")]
    [string]$Flavor
)

$ErrorActionPreference = "Stop"
$appDir = Join-Path "apps" $App
if (-not (Test-Path $appDir)) {
    throw "Unknown app: $App (expected a directory at $appDir)"
}

Push-Location $appDir
try {
    $hasNative = (Test-Path "android") -or (Test-Path "ios")
    if ($hasNative) {
        flutter run --flavor $Flavor -t "lib/main_$Flavor.dart"
    } else {
        flutter run -t "lib/main_$Flavor.dart"
    }
} finally {
    Pop-Location
}
