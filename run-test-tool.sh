#!/usr/bin/env bash

# Tool tổng chạy test theo từng tài liệu/phân hệ và mở report sau khi chạy.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ORG_ROOT="$PROJECT_ROOT/tai-lieu-test/01-mo-hinh-to-chuc"
PRODUCT_ROOT="$PROJECT_ROOT/tai-lieu-test/04-quan-ly-san-pham-danh-muc-san-pham"

"$PROJECT_ROOT/scripts/bootstrap-env.sh"

open_report() {
  local report_file="$1"
  if [[ ! -f "$report_file" ]]; then
    echo "Không tìm thấy report: $report_file"
    return 1
  fi

  echo "Mở report: $report_file"
  if command -v open >/dev/null 2>&1; then
    open "$report_file"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$report_file"
  elif command -v start >/dev/null 2>&1; then
    start "$report_file"
  else
    echo "Máy không có lệnh mở report tự động. Mở thủ công file:"
    echo "$report_file"
  fi
}

print_menu() {
  cat <<'MENU'

Chọn phân hệ cần chạy test:
  1) Mô hình kinh doanh / Mô hình tổ chức
  2) Danh mục sản phẩm / Quản lý sản phẩm
  3) Chạy cả 2 phân hệ

Có thể chạy nhanh:
  ./run-test-tool.sh 1
  ./run-test-tool.sh 2
  ./run-test-tool.sh all

Windows:
  run-test-tool.cmd 1
  run-test-tool.cmd 2
  run-test-tool.cmd all

MENU
}

run_org() {
  echo
  echo "==> Chạy test Mô hình kinh doanh / Mô hình tổ chức"
  "$ORG_ROOT/scripts/run-playwright-report-tests.sh" test
  open_report "$ORG_ROOT/test-output/playwright-report/index.html"
}

run_product() {
  echo
  echo "==> Chạy test Danh mục sản phẩm / Quản lý sản phẩm"
  "$PRODUCT_ROOT/scripts/run-playwright-report-tests.sh" test
  open_report "$PRODUCT_ROOT/test-output/playwright-report/index.html"
}

choice="${1:-}"
if [[ -z "$choice" ]]; then
  print_menu
  read -r -p "Nhập số lựa chọn: " choice
fi

case "$choice" in
  1|org|mo-hinh|mo-hinh-kinh-doanh|mo-hinh-to-chuc)
    run_org
    ;;
  2|product|category|danh-muc|danh-muc-san-pham|san-pham)
    run_product
    ;;
  3|all|tat-ca)
    run_org
    run_product
    ;;
  *)
    echo "Lựa chọn không hợp lệ: $choice"
    print_menu
    exit 1
    ;;
esac
