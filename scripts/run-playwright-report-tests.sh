#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "$PROJECT_ROOT/tai-lieu-test/01-mo-hinh-to-chuc/scripts/run-playwright-report-tests.sh" "$@"
