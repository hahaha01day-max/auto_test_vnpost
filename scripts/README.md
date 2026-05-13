# Scripts compatibility wrappers

Các script thật đã được tách theo tài liệu.

Tài liệu 01 - Mô hình tổ chức:

- `/Users/manhle2001/Desktop/Script_document/tai-lieu-test/01-mo-hinh-to-chuc/scripts`

Tài liệu 04 - Quản lý sản phẩm / Danh mục sản phẩm:

- `/Users/manhle2001/Desktop/Script_document/tai-lieu-test/04-quan-ly-san-pham-danh-muc-san-pham/scripts`

Các file trong thư mục `scripts/` chỉ là wrapper tương thích để lệnh cũ như `./scripts/run-vnpost-test-tool.sh smoke` vẫn chạy được.

## Chạy tool tổng

macOS/Linux/Git Bash/WSL:

```bash
./run-test-tool.sh
./run-test-tool.sh 1
./run-test-tool.sh 2
./run-test-tool.sh all
```

Windows:

```bat
run-test-tool.cmd
run-test-tool.cmd 1
run-test-tool.cmd 2
run-test-tool.cmd all
```

Lần chạy đầu tiên tool sẽ tự kiểm tra/cài:

- Node.js LTS nếu Windows có `winget`.
- npm packages trong `package.json`.
- Chromium browser cho Playwright.

Nếu Windows chặn PowerShell script, vẫn chạy bằng `run-test-tool.cmd` vì file này đã bật `ExecutionPolicy Bypass` cho đúng lần chạy tool.

## Tự nhận diện tài liệu mới

Tool tổng tự quét các folder con trong `tai-lieu-test/`.

Một tài liệu mới sẽ tự hiện thành option nếu có cấu trúc tối thiểu:

```text
tai-lieu-test/quan-ly-nhan-vien/
  test/
    *.spec.js
```

Tool cũng nhận `tests/*.spec.js`. Nếu folder có `playwright.config.js` riêng thì tool dùng config riêng; nếu chưa có thì dùng `playwright.dynamic.config.js` ở root.

Nếu có thêm file này thì macOS/Linux sẽ ưu tiên chạy runner riêng:

```text
tai-lieu-test/quan-ly-nhan-vien/scripts/run-playwright-report-tests.sh
```

Trên Windows, tool sẽ chạy trực tiếp:

```bat
npx playwright test --config tai-lieu-test/quan-ly-nhan-vien/playwright.config.js --project=chromium
```

Sau khi thêm folder mới, có thể chạy ngay:

```bat
run-test-tool.cmd quan-ly-nhan-vien
```

Hoặc mở menu:

```bat
run-test-tool.cmd
```
