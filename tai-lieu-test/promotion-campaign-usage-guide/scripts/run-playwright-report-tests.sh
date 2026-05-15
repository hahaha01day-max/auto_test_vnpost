#!/usr/bin/env bash

# Runner Playwright Test cho tài liệu PROMOTION_CAMPAIGN_USAGE_GUIDE, sinh HTML report và video cả case pass.

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
    npx playwright test --config "$CONFIG_FILE" --project=chromium "$@"
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
Lua chon khong hop le.

Cach dung:
  ./tai-lieu-test/promotion-campaign-usage-guide/scripts/run-playwright-report-tests.sh test
  ./tai-lieu-test/promotion-campaign-usage-guide/scripts/run-playwright-report-tests.sh headed
  ./tai-lieu-test/promotion-campaign-usage-guide/scripts/run-playwright-report-tests.sh report
HELP
    exit 1
    ;;
esac

