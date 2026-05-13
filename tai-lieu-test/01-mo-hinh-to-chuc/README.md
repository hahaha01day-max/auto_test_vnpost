# Tài liệu 01 - Mô hình tổ chức

Nguồn tài liệu:

- `1. Mô hình tổ chức.docx`

## Cấu trúc

- `scripts/`: script thật của tài liệu 01
- `tests/`: Playwright Test spec của tài liệu 01
- `test-output/`: output chạy tự động của tài liệu 01

## Cách chạy

Chạy wrapper chính:

```bash
cd /Users/manhle2001/Desktop/Script_document
./tai-lieu-test/01-mo-hinh-to-chuc/scripts/run-vnpost-test-tool.sh smoke
```

Lệnh cũ vẫn dùng được vì `scripts/` ở root đã được giữ lại như wrapper:

```bash
./scripts/run-vnpost-test-tool.sh smoke
```

## Output

- Smoke: `tai-lieu-test/01-mo-hinh-to-chuc/test-output/smoke/`
- Full E2E: `tai-lieu-test/01-mo-hinh-to-chuc/test-output/full/`
- Inspect: `tai-lieu-test/01-mo-hinh-to-chuc/test-output/inspect/`
- Playwright report: `tai-lieu-test/01-mo-hinh-to-chuc/test-output/playwright-report/`
- Playwright results: `tai-lieu-test/01-mo-hinh-to-chuc/test-output/playwright-results/`

## Test case

- `/Users/manhle2001/Desktop/Script_document/test-output/testcase/mo-hinh-to-chuc-testcases.md`
- `/Users/manhle2001/Desktop/Script_document/test-output/testcase/mo-hinh-to-chuc-testcases.csv`
