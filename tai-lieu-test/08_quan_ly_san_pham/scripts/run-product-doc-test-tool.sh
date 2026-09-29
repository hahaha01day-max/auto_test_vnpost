#!/usr/bin/env bash

# Tool chạy script riêng cho tài liệu 04 - Quản lý sản phẩm / Danh mục sản phẩm.
# Script nhận credential qua stdin, wrapper này tự truyền account mặc định để chạy nhanh nội bộ.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOC_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$DOC_ROOT/../.." && pwd)"
VNPOST_ACCOUNT_DEFAULT="${VNPOST_ACCOUNT:-84862036990}"
VNPOST_PASSWORD_DEFAULT="${VNPOST_PASSWORD:-123456}"

cd "$PROJECT_ROOT"
"$PROJECT_ROOT/scripts/bootstrap-env.sh"

print_menu() {
  cat <<'MENU'

Tài liệu 04 - Quản lý sản phẩm / Danh mục sản phẩm

Chọn script cần chạy:
  1) smoke           Smoke test an toàn, headless
  2) smoke-headed    Smoke test có mở browser thật
  3) smoke-debug     Smoke test headed + slow motion

MENU
}

run_with_credentials() {
  local script_path="$1"
  shift || true

  echo "Dùng account: $VNPOST_ACCOUNT_DEFAULT"
  printf "%s\n%s\n" "$VNPOST_ACCOUNT_DEFAULT" "$VNPOST_PASSWORD_DEFAULT" | node "$script_path" "$@"
}

choice="${1:-}"
if [[ -z "$choice" ]]; then
  print_menu
  read -r -p "Nhập số lựa chọn: " choice
fi

case "$choice" in
  1|smoke)
    run_with_credentials "tai-lieu-test/04-quan-ly-san-pham-danh-muc-san-pham/scripts/vnpost-product-category-smoke-test.js"
    ;;
  2|smoke-headed|headed)
    PW_HEADED=1 run_with_credentials "tai-lieu-test/04-quan-ly-san-pham-danh-muc-san-pham/scripts/vnpost-product-category-smoke-test.js"
    ;;
  3|smoke-debug|debug)
    PW_HEADED=1 PW_SLOWMO=400 run_with_credentials "tai-lieu-test/04-quan-ly-san-pham-danh-muc-san-pham/scripts/vnpost-product-category-smoke-test.js"
    ;;
  *)
    echo "Lựa chọn không hợp lệ: $choice"
    print_menu
    exit 1
    ;;
esac
