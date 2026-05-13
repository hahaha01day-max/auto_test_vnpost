#!/usr/bin/env bash

# Cài/kiểm tra công cụ cần thiết cho macOS/Linux/Git Bash/WSL.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

ensure_node() {
  if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    return 0
  fi

  echo "Chưa tìm thấy Node.js/npm."
  if command -v brew >/dev/null 2>&1; then
    echo "Đang cài Node.js bằng Homebrew..."
    brew install node
    return 0
  fi

  if command -v winget.exe >/dev/null 2>&1; then
    echo "Đang cài Node.js bằng winget..."
    winget.exe install --id OpenJS.NodeJS.LTS --source winget --accept-package-agreements --accept-source-agreements
    return 0
  fi

  echo "Không thể tự cài Node.js vì máy chưa có brew/winget."
  echo "Hãy cài Node.js LTS rồi chạy lại tool: https://nodejs.org/"
  exit 1
}

ensure_node

if [[ ! -d "$PROJECT_ROOT/node_modules/@playwright/test" ]]; then
  echo "Đang cài npm packages..."
  npm install
fi

CHROMIUM_PATH="$(node -e "const { chromium } = require('playwright'); console.log(chromium.executablePath())" 2>/dev/null || true)"
if [[ -n "$CHROMIUM_PATH" && -x "$CHROMIUM_PATH" ]]; then
  echo "Chromium cho Playwright đã sẵn sàng."
else
  echo "Đang kiểm tra/cài Chromium cho Playwright..."
  npx playwright install chromium
fi

echo "Môi trường đã sẵn sàng."
