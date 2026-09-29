#!/usr/bin/env bash

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
  *)
    echo "Lựa chọn không hợp lệ: $COMMAND"
    exit 1
    ;;
esac
