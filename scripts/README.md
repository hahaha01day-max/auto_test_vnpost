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
