param(
  [string]$Choice
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$TestRoot = Join-Path $ProjectRoot "tai-lieu-test"

Set-Location $ProjectRoot

& (Join-Path $ProjectRoot "scripts/bootstrap-env.ps1")

function Get-DocDirs {
  Get-ChildItem -Path $TestRoot -Directory |
    Where-Object {
      (Test-Path (Join-Path $_.FullName "playwright.config.js")) -or
      ($null -ne (Get-ChildItem -Path $_.FullName -Recurse -Depth 2 -File -Include "*.spec.js","*.playwright.js" -ErrorAction SilentlyContinue | Select-Object -First 1))
    } |
    Sort-Object Name |
    ForEach-Object { $_.FullName }
}

function Get-DocSlug {
  param([string]$DocDir)
  Split-Path $DocDir -Leaf
}

function Get-DocName {
  param([string]$DocDir)

  $readme = Join-Path $DocDir "README.md"
  if (Test-Path $readme) {
    $title = Get-Content $readme |
      Where-Object { $_ -match "^#\s+" } |
      Select-Object -First 1

    if (-not [string]::IsNullOrWhiteSpace($title)) {
      return ($title -replace "^#\s+", "")
    }
  }

  return ((Get-DocSlug $DocDir) -replace "^[0-9]+-", "" -replace "-", " ")
}

function Open-Report {
  param([string]$ReportFile)

  if (-not (Test-Path $ReportFile)) {
    throw "Khong tim thay report: $ReportFile"
  }

  Write-Host "Mo report: $ReportFile"
  Start-Process $ReportFile
}

function Print-Menu {
  param([string[]]$DocDirs)

  Write-Host ""
  Write-Host "Chon phan he can chay test:"
  for ($i = 0; $i -lt $DocDirs.Count; $i++) {
    $number = $i + 1
    Write-Host "  $number) $(Get-DocName $DocDirs[$i])"
  }
  Write-Host "  all) Chay tat ca phan he"
  Write-Host ""
  Write-Host "Co the chay nhanh:"
  Write-Host "  .\run-test-tool.cmd 1"
  Write-Host "  .\run-test-tool.cmd all"
  Write-Host "  .\run-test-tool.cmd quan-ly-nhan-vien"
  Write-Host ""
}

function Run-Doc {
  param([string]$DocDir)

  $runner = Join-Path $DocDir "scripts/run-playwright-report-tests.sh"
  $configFile = Join-Path $DocDir "playwright.config.js"
  $dynamicConfig = Join-Path $ProjectRoot "playwright.dynamic.config.js"

  Write-Host ""
  Write-Host "==> Chay test $(Get-DocName $DocDir)"

  if (Test-Path $configFile) {
    npx playwright test --config $configFile --project=chromium
  } else {
    $env:DOC_TEST_DIR = $DocDir
    try {
      npx playwright test --config $dynamicConfig --project=chromium
    } finally {
      Remove-Item Env:DOC_TEST_DIR -ErrorAction SilentlyContinue
    }
  }
  Open-Report (Join-Path $DocDir "test-output/playwright-report/index.html")
}

$DocDirs = @(Get-DocDirs)
if ($DocDirs.Count -eq 0) {
  throw "Khong tim thay tai lieu test nao trong $TestRoot. Moi folder can co playwright.config.js"
}

if ([string]::IsNullOrWhiteSpace($Choice)) {
  Print-Menu $DocDirs
  $Choice = Read-Host "Nhap so lua chon"
}

$choiceLower = $Choice.ToLowerInvariant()

if ($choiceLower -eq "all" -or $choiceLower -eq "tat-ca") {
  foreach ($docDir in $DocDirs) {
    Run-Doc $docDir
  }
  exit 0
}

$numericChoice = 0
if ([int]::TryParse($choiceLower, [ref]$numericChoice)) {
  $index = $numericChoice - 1
  if ($index -ge 0 -and $index -lt $DocDirs.Count) {
    Run-Doc $DocDirs[$index]
    exit 0
  }
}

foreach ($docDir in $DocDirs) {
  if ($choiceLower -eq (Get-DocSlug $docDir).ToLowerInvariant()) {
    Run-Doc $docDir
    exit 0
  }
}

Write-Host "Lua chon khong hop le: $Choice"
Print-Menu $DocDirs
exit 1
