#!/usr/bin/env bash

# Tool chạy các script test VNPost dễ hơn.
# Mục tiêu:
# - Không cần nhớ đường dẫn Node dài.
# - Không bị lỗi chạy nhầm scripts/scripts khi đang đứng trong thư mục scripts.
# - Tự fill account/password test mặc định để chạy nhanh.
# - Tool này dùng nội bộ; các script Playwright chính vẫn nhận stdin để tester đổi credential khi cần.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOC_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$DOC_ROOT/../.." && pwd)"
SCRIPT_BASE="tai-lieu-test/01-mo-hinh-to-chuc/scripts"
VNPOST_ACCOUNT_DEFAULT="84862036990"
VNPOST_PASSWORD_DEFAULT="123456"

cd "$PROJECT_ROOT"
"$PROJECT_ROOT/scripts/bootstrap-env.sh"

print_menu() {
  cat <<'MENU'

Chọn script cần chạy:
  1) Full E2E test Mô hình tổ chức
  2) Smoke test an toàn
  3) Inspect UI/network
  4) List frontend scripts
  5) API cleanup theo unitCode
  6) Full E2E headed, nhìn browser chạy thật
  7) Full E2E debug: headed + slowMo + trace + video
  8) Full E2E trace/video, chạy headless nhưng lưu bằng chứng
  9) Playwright Test HTML report

MENU
}

run_with_credentials() {
  local script_path="$1"
  shift || true

  echo "Dùng account mặc định: $VNPOST_ACCOUNT_DEFAULT"
  printf "%s\n%s\n" "$VNPOST_ACCOUNT_DEFAULT" "$VNPOST_PASSWORD_DEFAULT" | node "$script_path" "$@"
}

run_full_with_playwright_mode() {
  local mode="$1"

  case "$mode" in
    headed)
      PW_HEADED=1 run_with_credentials "$SCRIPT_BASE/vnpost-org-full-e2e-test.js"
      ;;
    trace)
      PW_TRACE=1 PW_VIDEO=1 run_with_credentials "$SCRIPT_BASE/vnpost-org-full-e2e-test.js"
      ;;
    debug)
      PW_HEADED=1 PW_SLOWMO=400 PW_TRACE=1 PW_VIDEO=1 PW_SCREENSHOT_ALL=1 run_with_credentials "$SCRIPT_BASE/vnpost-org-full-e2e-test.js"
      ;;
    screenshots)
      PW_SCREENSHOT_ALL=1 run_with_credentials "$SCRIPT_BASE/vnpost-org-full-e2e-test.js"
      ;;
    firefox)
      PW_BROWSER=firefox PW_TRACE=1 PW_VIDEO=1 run_with_credentials "$SCRIPT_BASE/vnpost-org-full-e2e-test.js"
      ;;
    webkit)
      PW_BROWSER=webkit PW_TRACE=1 PW_VIDEO=1 run_with_credentials "$SCRIPT_BASE/vnpost-org-full-e2e-test.js"
      ;;
    *)
      echo "Playwright mode không hợp lệ: $mode"
      exit 1
      ;;
  esac
}

run_selected() {
  local choice="${1:-}"

  if [[ -z "$choice" ]]; then
    print_menu
    read -r -p "Nhập số lựa chọn: " choice
  fi

  case "$choice" in
    1|full|full-e2e)
      echo "Chạy Full E2E test..."
      run_with_credentials "$SCRIPT_BASE/vnpost-org-full-e2e-test.js"
      ;;
    full-headed|headed|6)
      echo "Chạy Full E2E headed..."
      run_full_with_playwright_mode headed
      ;;
    full-trace|trace|video|full-video|8)
      echo "Chạy Full E2E trace/video..."
      run_full_with_playwright_mode trace
      ;;
    full-debug|debug|7)
      echo "Chạy Full E2E debug..."
      run_full_with_playwright_mode debug
      ;;
    full-screenshots|screenshots)
      echo "Chạy Full E2E và chụp ảnh cả PASS..."
      run_full_with_playwright_mode screenshots
      ;;
    full-firefox|firefox)
      echo "Chạy Full E2E bằng Firefox..."
      run_full_with_playwright_mode firefox
      ;;
    full-webkit|webkit)
      echo "Chạy Full E2E bằng WebKit..."
      run_full_with_playwright_mode webkit
      ;;
    9|pw|playwright|playwright-report)
      echo "Chạy Playwright Test để sinh HTML report..."
      "$SCRIPT_BASE/run-playwright-report-tests.sh" test
      ;;
    pw-report|show-report)
      echo "Mở Playwright HTML report..."
      "$SCRIPT_BASE/run-playwright-report-tests.sh" report
      ;;
    pw-ui)
      echo "Mở Playwright UI mode..."
      "$SCRIPT_BASE/run-playwright-report-tests.sh" ui
      ;;
    2|smoke)
      echo "Chạy Smoke test..."
      run_with_credentials "$SCRIPT_BASE/vnpost-org-smoke-test.js"
      ;;
    3|inspect)
      echo "Chạy Inspect UI/network..."
      run_with_credentials "$SCRIPT_BASE/vnpost-org-inspect.js"
      ;;
    4|list)
      echo "Chạy List frontend scripts..."
      run_with_credentials "$SCRIPT_BASE/vnpost-list-scripts.js"
      ;;
    5|cleanup)
      read -r -p "Nhập unitCode cần cleanup: " UNIT_CODE
      if [[ -z "$UNIT_CODE" ]]; then
        echo "Thiếu unitCode. Dừng chạy."
        exit 1
      fi
      echo "Chạy API cleanup cho unitCode=$UNIT_CODE..."
      run_with_credentials "$SCRIPT_BASE/vnpost-org-api-cleanup.js" "$UNIT_CODE"
      ;;
    *)
      echo "Lựa chọn không hợp lệ: $choice"
      print_menu
      exit 1
      ;;
  esac
}

run_selected "${1:-}"
