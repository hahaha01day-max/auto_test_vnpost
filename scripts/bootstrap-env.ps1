param(
  [switch]$SkipBrowserInstall
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $ProjectRoot

function Test-CommandExists {
  param([string]$Command)
  $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

function Refresh-Path {
  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machinePath;$userPath"
}

if (-not (Test-CommandExists "node") -or -not (Test-CommandExists "npm")) {
  Write-Host "Chua tim thay Node.js/npm."

  if (Test-CommandExists "winget") {
    Write-Host "Dang cai Node.js LTS bang winget..."
    winget install --id OpenJS.NodeJS.LTS --source winget --accept-package-agreements --accept-source-agreements
    Refresh-Path
  } else {
    throw "Khong the tu cai Node.js vi Windows chua co winget. Hay cai Node.js LTS tu https://nodejs.org/ roi chay lai tool."
  }
}

if (-not (Test-Path (Join-Path $ProjectRoot "node_modules/@playwright/test"))) {
  Write-Host "Dang cai npm packages..."
  npm install
}

if (-not $SkipBrowserInstall) {
  $chromiumPath = node -e "const { chromium } = require('playwright'); console.log(chromium.executablePath())" 2>$null
  if (-not [string]::IsNullOrWhiteSpace($chromiumPath) -and (Test-Path $chromiumPath)) {
    Write-Host "Chromium cho Playwright da san sang."
  } else {
    Write-Host "Dang kiem tra/cai Chromium cho Playwright..."
    npx playwright install chromium
  }
}

Write-Host "Moi truong da san sang."
