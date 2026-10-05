# Commit with the Vercel-allowed Hobby team owner author (no git config change).
# Usage:
#   .\scripts\commit-as-deploy.ps1 -Message "fix: whatever"
#   .\scripts\commit-as-deploy.ps1 -Message "fix: whatever" -AddPath "docs/foo.md","apps/..."
param(
  [Parameter(Mandatory = $true)]
  [string] $Message,
  [string[]] $AddPath = @()
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if ($AddPath.Count -gt 0) {
  git add -- @AddPath
}

git -c user.name='tamatoscloud' -c user.email='tamatos.cloud@gmail.com' commit -m $Message
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
git log -1 --format='Committed as %an <%ae>%n%h %s'
