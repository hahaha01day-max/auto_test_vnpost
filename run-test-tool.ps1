param(
  [string]$Choice
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$OrgRoot = Join-Path $ProjectRoot "tai-lieu-test/01-mo-hinh-to-chuc"
$ProductRoot = Join-Path $ProjectRoot "tai-lieu-test/04-quan-ly-san-pham-danh-muc-san-pham"

Set-Location $ProjectRoot

& (Join-Path $ProjectRoot "scripts/bootstrap-env.ps1")

function Open-Report {
  param([string]$ReportFile)

  if (-not (Test-Path $ReportFile)) {
    throw "Khong tim thay report: $ReportFile"
  }

  Write-Host "Mo report: $ReportFile"
  Start-Process $ReportFile
}

function Print-Menu {
  Write-Host ""
  Write-Host "Chon phan he can chay test:"
  Write-Host "  1) Mo hinh kinh doanh / Mo hinh to chuc"
  Write-Host "  2) Danh muc san pham / Quan ly san pham"
  Write-Host "  3) Chay ca 2 phan he"
  Write-Host ""
  Write-Host "Co the chay nhanh:"
  Write-Host "  .\run-test-tool.cmd 1"
  Write-Host "  .\run-test-tool.cmd 2"
  Write-Host "  .\run-test-tool.cmd all"
  Write-Host ""
}

function Run-Org {
  Write-Host ""
  Write-Host "==> Chay test Mo hinh kinh doanh / Mo hinh to chuc"
  npx playwright test --config (Join-Path $OrgRoot "playwright.config.js") --project=chromium
  Open-Report (Join-Path $OrgRoot "test-output/playwright-report/index.html")
}

function Run-Product {
  Write-Host ""
  Write-Host "==> Chay test Danh muc san pham / Quan ly san pham"
  npx playwright test --config (Join-Path $ProductRoot "playwright.config.js") --project=chromium
  Open-Report (Join-Path $ProductRoot "test-output/playwright-report/index.html")
}

if ([string]::IsNullOrWhiteSpace($Choice)) {
  Print-Menu
  $Choice = Read-Host "Nhap so lua chon"
}

switch -Regex ($Choice.ToLowerInvariant()) {
  "^(1|org|mo-hinh|mo-hinh-kinh-doanh|mo-hinh-to-chuc)$" { Run-Org; break }
  "^(2|product|category|danh-muc|danh-muc-san-pham|san-pham)$" { Run-Product; break }
  "^(3|all|tat-ca)$" { Run-Org; Run-Product; break }
  default {
    Write-Host "Lua chon khong hop le: $Choice"
    Print-Menu
    exit 1
  }
}
