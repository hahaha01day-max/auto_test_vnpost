#!/usr/bin/env bash

# Runner chuẩn Playwright Test để sinh HTML report.
# Dùng khi muốn có report mở bằng `playwright show-report`.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOC_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$DOC_ROOT/../.." && pwd)"
CONFIG_FILE="$DOC_ROOT/playwright.config.js"

cd "$PROJECT_ROOT"

"$PROJECT_ROOT/scripts/bootstrap-env.sh"

COMMAND="${1:-test}"
shift || true

case "$COMMAND" in
  test)
    # Chạy project chromium mặc định để nhanh và ổn định.
    npx playwright test --config "$CONFIG_FILE" --project=chromium "$@"
    ;;
  all)
    # Chạy đủ chromium/firefox/webkit theo config.
    npx playwright test --config "$CONFIG_FILE" "$@"
    ;;
  headed)
    npx playwright test --config "$CONFIG_FILE" --project=chromium --headed "$@"
    ;;
  debug)
    PWDEBUG=1 npx playwright test --config "$CONFIG_FILE" --project=chromium --headed "$@"
    ;;
  ui)
    npx playwright test --config "$CONFIG_FILE" --ui "$@"
    ;;
  report|show-report)
    npx playwright show-report "$DOC_ROOT/test-output/playwright-report" "$@"
    ;;
  trace|show-trace)
    npx playwright show-trace "$DOC_ROOT"/test-output/playwright-results/**/trace.zip "$@"
    ;;
  *)
    cat <<'HELP'
Lựa chọn không hợp lệ.

Cách dùng:
  ./scripts/run-playwright-report-tests.sh test        # chạy chromium và sinh HTML report
  ./scripts/run-playwright-report-tests.sh all         # chạy chromium/firefox/webkit
  ./scripts/run-playwright-report-tests.sh headed      # mở browser thật
  ./scripts/run-playwright-report-tests.sh debug       # Playwright debug mode
  ./scripts/run-playwright-report-tests.sh ui          # Playwright UI mode
  ./scripts/run-playwright-report-tests.sh report      # mở HTML report
  ./scripts/run-playwright-report-tests.sh trace       # mở trace nếu có

Có thể truyền thêm args Playwright phía sau, ví dụ:
  ./scripts/run-playwright-report-tests.sh test -g "CRUD"
HELP
    exit 1
    ;;
esac
