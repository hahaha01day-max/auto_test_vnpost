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

function ConvertTo-AsciiText {
  param([string]$Text)

  if ([string]::IsNullOrWhiteSpace($Text)) {
    return $Text
  }

  $normalized = $Text.Replace("Đ", "D").Replace("đ", "d").Normalize([Text.NormalizationForm]::FormD)
  $builder = New-Object Text.StringBuilder
  foreach ($char in $normalized.ToCharArray()) {
    $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($char)
    if ($category -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$builder.Append($char)
    }
  }

  return $builder.ToString().Normalize([Text.NormalizationForm]::FormC)
}

function Get-DocName {
  param([string]$DocDir)

  $readme = Join-Path $DocDir "README.md"
  if (Test-Path $readme) {
    $title = Get-Content $readme -Encoding UTF8 |
      Where-Object { $_ -match "^#\s+" } |
      Select-Object -First 1

    if (-not [string]::IsNullOrWhiteSpace($title)) {
      return ConvertTo-AsciiText (($title -replace "^#\s+", ""))
    }
  }

  return ConvertTo-AsciiText ((Get-DocSlug $DocDir) -replace "^[0-9]+-", "" -replace "-", " ")
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
  Write-Host "  all) Chay tat ca phan he (chay dong lenh + xuat report)"
  Write-Host ""
  Write-Host "Mac dinh cac lenh duoi day se mo giao dien Playwright UI Mode de chay/debug truc quan."
  Write-Host "De chay dong lenh (CLI + xuat file report) ma khong mo UI, hay them --cli o cuoi lenh."
  Write-Host ""
  Write-Host "Co the chay nhanh:"
  Write-Host "  .\run-test-tool.cmd 7              (Mo UI Mode cua phan he 7)"
  Write-Host "  .\run-test-tool.cmd 7 --cli        (Chay dong lenh toan bo phan he 7)"
  Write-Host "  .\run-test-tool.cmd 7 `"TC 02`" --cli (Chay dong lenh rieng case TC 02)"
  Write-Host "  .\run-test-tool.cmd all            (Chay dong lenh tat ca phan he)"
  Write-Host ""
}

function Run-Doc {
  param(
    [string]$DocDir,
    [string[]]$ExtraArgs
  )

  $configFile = Join-Path $DocDir "playwright.config.js"
  $dynamicConfig = Join-Path $ProjectRoot "playwright.dynamic.config.js"

  Write-Host ""
  Write-Host "==> Chay test $(Get-DocName $DocDir)"

  if (Test-Path $configFile) {
    if ($ExtraArgs -and $ExtraArgs.Count -gt 0) {
      npx playwright test --config $configFile --project=chromium @ExtraArgs
    } else {
      npx playwright test --config $configFile --project=chromium
    }
  } else {
    $env:DOC_TEST_DIR = $DocDir
    try {
      if ($ExtraArgs -and $ExtraArgs.Count -gt 0) {
        npx playwright test --config $dynamicConfig --project=chromium @ExtraArgs
      } else {
        npx playwright test --config $dynamicConfig --project=chromium
      }
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

$isInteractive = $false
$ExtraArgs = @()

if ([string]::IsNullOrWhiteSpace($Choice)) {
  $isInteractive = $true
} else {
  if ($args.Count -eq 1 -and -not $args[0].StartsWith("-")) {
    $ExtraArgs = @("-g", $args[0])
  } else {
    $ExtraArgs = $args
  }
}

while ($true) {
  if ([string]::IsNullOrWhiteSpace($Choice)) {
    Print-Menu $DocDirs
    $Choice = Read-Host "Nhap so lua chon (hoac 'q' de thoat)"
  }

  $choiceLower = $Choice.ToLowerInvariant()

  if ($choiceLower -eq "q" -or $choiceLower -eq "exit") {
    Write-Host "Tam biet!"
    exit 0
  }

  if ($choiceLower -eq "all" -or $choiceLower -eq "tat-ca") {
    foreach ($docDir in $DocDirs) {
      Run-Doc $docDir
    }
    if ($isInteractive) {
      $Choice = $null
      continue
    } else {
      exit 0
    }
  }

  $selectedDir = $null
  $numericChoice = 0
  if ([int]::TryParse($choiceLower, [ref]$numericChoice)) {
    $index = $numericChoice - 1
    if ($index -ge 0 -and $index -lt $DocDirs.Count) {
      $selectedDir = $DocDirs[$index]
    }
  } else {
    foreach ($docDir in $DocDirs) {
      if ($choiceLower -eq (Get-DocSlug $docDir).ToLowerInvariant()) {
        $selectedDir = $docDir
        break
      }
    }
  }

  if ($null -eq $selectedDir) {
    Write-Host "Lua chon khong hop le: $Choice"
    $Choice = $null
    continue
  }

  if ($isInteractive) {
    $testCase = Read-Host "Nhap ten case muon chay (vi du: TC 02, hoac nhan Enter de chay tat ca)"
    $ExtraArgs = @()
    if (-not [string]::IsNullOrWhiteSpace($testCase)) {
      $ExtraArgs = @("-g", $testCase)
    }
  }

  Run-Doc $selectedDir $ExtraArgs

  if ($isInteractive) {
    while ($true) {
      Write-Host ""
      Write-Host "Chay xong phan he '$(Get-DocName $selectedDir)'."
      Write-Host "Lua chon tiep theo:"
      Write-Host "  1) Chay lai phan he nay (tat ca cac case)"
      Write-Host "  2) Chay lai voi mot case cu the trong phan he nay"
      Write-Host "  3) Quay lai menu chinh"
      Write-Host "  q) Thoat"
      Write-Host ""
      $nextAction = Read-Host "Nhap lua chon cua ban [1/2/3/q, mac dinh 1]"
      if ([string]::IsNullOrWhiteSpace($nextAction)) {
        $nextAction = "1"
      }

      switch ($nextAction) {
        "1" {
          Run-Doc $selectedDir
        }
        "2" {
          $newCase = Read-Host "Nhap ten case muon chay (vi du: TC 03)"
          if (-not [string]::IsNullOrWhiteSpace($newCase)) {
            Run-Doc $selectedDir @("-g", $newCase)
          } else {
            Run-Doc $selectedDir
          }
        }
        "3" {
          $Choice = $null
          break
        }
        "q" {
          Write-Host "Tam biet!"
          exit 0
        }
        default {
          Write-Host "Lua chon khong hop le."
        }
      }
      
      if ($null -eq $Choice) {
        break
      }
    }
  } else {
    exit 0
  }
}
