#!/usr/bin/env bash

# Tool tổng chạy test theo từng tài liệu/phân hệ và mở report sau khi chạy.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_ROOT="$PROJECT_ROOT/tai-lieu-test"

"$PROJECT_ROOT/scripts/bootstrap-env.sh"

DOC_DIRS=()

load_doc_dirs() {
  DOC_DIRS=()
  local doc_dir
  while IFS= read -r doc_dir; do
    if [[ -f "$doc_dir/playwright.config.js" ]] ||
      find "$doc_dir" -maxdepth 2 -type f \( -name "*.spec.js" -o -name "*.playwright.js" \) | grep -q .; then
      DOC_DIRS+=("$doc_dir")
    fi
  done < <(find "$TEST_ROOT" -mindepth 1 -maxdepth 1 -type d | sort)
}

doc_slug() {
  basename "$1"
}

doc_name() {
  local doc_dir="$1"
  local readme="$doc_dir/README.md"
  local title=""

  if [[ -f "$readme" ]]; then
    title="$(sed -n 's/^# *//p' "$readme" | head -n 1)"
  fi

  if [[ -n "$title" ]]; then
    echo "$title"
  else
    doc_slug "$doc_dir" | sed -E 's/^[0-9]+-//; s/-/ /g'
  fi
}

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
  echo
  echo "Chọn phân hệ cần chạy test:"
  local i=1
  local doc_dir
  for doc_dir in "${DOC_DIRS[@]}"; do
    echo "  $i) $(doc_name "$doc_dir")"
    i=$((i + 1))
  done
  echo "  all) Chạy tất cả phân hệ"
  cat <<'MENU'

Có thể chạy nhanh:
  ./run-test-tool.sh 7              (Chạy phân hệ 7)
  ./run-test-tool.sh 7 "TC 02"      (Chạy riêng case TC 02 của phân hệ 7)
  ./run-test-tool.sh all            (Chạy tất cả phân hệ)

Windows:
  run-test-tool.cmd 7
  run-test-tool.cmd 7 "TC 02"
  run-test-tool.cmd all

MENU
}

run_doc() {
  local doc_dir="$1"
  shift
  local runner="$doc_dir/scripts/run-playwright-report-tests.sh"
  local config_file="$doc_dir/playwright.config.js"
  local dynamic_config="$PROJECT_ROOT/playwright.dynamic.config.js"

  echo
  echo "==> Chạy test $(doc_name "$doc_dir")"

  if [[ -x "$runner" ]]; then
    "$runner" test "$@"
  elif [[ -f "$config_file" ]]; then
    npx playwright test --config "$config_file" --project=chromium "$@"
  else
    DOC_TEST_DIR="$doc_dir" npx playwright test --config "$dynamic_config" --project=chromium "$@"
  fi

  open_report "$doc_dir/test-output/playwright-report/index.html"
}

load_doc_dirs

if [[ "${#DOC_DIRS[@]}" -eq 0 ]]; then
  echo "Không tìm thấy tài liệu test nào trong $TEST_ROOT"
  echo "Mỗi folder cần có file playwright.config.js"
  exit 1
fi

choice="${1:-}"
is_interactive=false
extra_args=()

if [[ -z "$choice" ]]; then
  is_interactive=true
else
  # non-interactive command line mode
  shift
  if [[ "$#" -eq 1 ]] && [[ ! "$1" =~ ^- ]]; then
    extra_args+=("-g" "$1")
  else
    extra_args+=("$@")
  fi
fi

while true; do
  if [[ -z "$choice" ]]; then
    print_menu
    read -r -p "Nhập số lựa chọn (hoặc 'q' để thoát): " choice
  fi

  choice_lower="$(printf '%s' "$choice" | tr '[:upper:]' '[:lower:]')"

  if [[ "$choice_lower" == "q" || "$choice_lower" == "exit" ]]; then
    echo "Tạm biệt!"
    exit 0
  fi

  if [[ "$choice_lower" == "all" || "$choice_lower" == "tat-ca" ]]; then
    for doc_dir in "${DOC_DIRS[@]}"; do
      run_doc "$doc_dir"
    done
    if [[ "$is_interactive" == "true" ]]; then
      choice=""
      continue
    else
      exit 0
    fi
  fi

  selected_dir=""
  if [[ "$choice_lower" =~ ^[0-9]+$ ]]; then
    index=$((choice_lower - 1))
    if [[ "$index" -ge 0 && "$index" -lt "${#DOC_DIRS[@]}" ]]; then
      selected_dir="${DOC_DIRS[$index]}"
    fi
  else
    for doc_dir in "${DOC_DIRS[@]}"; do
      if [[ "$choice_lower" == "$(doc_slug "$doc_dir" | tr '[:upper:]' '[:lower:]')" ]]; then
        selected_dir="$doc_dir"
        break
      fi
    done
  fi

  if [[ -z "$selected_dir" ]]; then
    echo "Lựa chọn không hợp lệ: $choice"
    choice=""
    continue
  fi

  if [[ "$is_interactive" == "true" ]]; then
    read -r -p "Nhập tên case muốn chạy (ví dụ: TC 02, hoặc nhấn Enter để chạy tất cả): " test_case
    extra_args=()
    if [[ -n "$test_case" ]]; then
      extra_args+=("-g" "$test_case")
    fi
  fi

  # Tạm thời tắt set -u để tránh lỗi unbound variable khi mảng extra_args rỗng trên một số phiên bản Bash
  set +u
  run_doc "$selected_dir" "${extra_args[@]}"
  set -u

  if [[ "$is_interactive" == "true" ]]; then
    while true; do
      echo
      echo "Chạy xong phân hệ '$(doc_name "$selected_dir")'."
      echo "Lựa chọn tiếp theo:"
      echo "  1) Chạy lại phân hệ này (tất cả các case)"
      echo "  2) Chạy lại với một case cụ thể trong phân hệ này"
      echo "  3) Quay lại menu chính"
      echo "  q) Thoát"
      echo
      read -r -p "Nhập lựa chọn của bạn [1/2/3/q, mặc định 1]: " next_action
      next_action="${next_action:-1}"
      
      case "$next_action" in
        1)
          run_doc "$selected_dir"
          ;;
        2)
          read -r -p "Nhập tên case muốn chạy (ví dụ: TC 03): " new_case
          if [[ -n "$new_case" ]]; then
            run_doc "$selected_dir" "-g" "$new_case"
          else
            run_doc "$selected_dir"
          fi
          ;;
        3)
          choice=""
          break 2
          ;;
        q|Q|[eE][xX][iI][tT])
          echo "Tạm biệt!"
          exit 0
          ;;
        *)
          echo "Lựa chọn không hợp lệ."
          ;;
      esac
    done
  else
    exit 0
  fi
done
