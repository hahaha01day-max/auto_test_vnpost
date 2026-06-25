# Tài liệu 01 - Mô hình tổ chức

Nguồn tài liệu:

- `1. Mô hình tổ chức.docx`

## Cấu trúc

- `scripts/`: script thật của tài liệu 01
- `tests/`: Playwright Test spec của tài liệu 01
- `test-output/`: output chạy tự động của tài liệu 01

## Chuẩn bị

Từ thư mục `auto_test_vnpost`:

```bash
cp .env.example .env
```

Điền tối thiểu:

```dotenv
VNPOST_BASE_URL=http://localhost:3000
VNPOST_API_BASE_URL=http://localhost:3000
VNPOST_ACCOUNT=
VNPOST_PASSWORD=
VNPOST_SCOPE_LABEL=Admin
VNPOST_ORG_PARENT_NAME=Bưu điện Thành phố Hà Nội
```

Nếu chạy với web production, đặt `VNPOST_BASE_URL` là URL web và
`VNPOST_API_BASE_URL` là API gateway tương ứng.

File `.env` và session `.auth/` đã được loại khỏi Git.

## Standard suite

Suite mới tại `tests/org.standard.spec.js` áp dụng:

- Đăng nhập một lần và lưu `storageState`.
- Không có credential mặc định trong source.
- Route và endpoint khớp code `sofin-business`.
- Chờ đúng API thay vì `networkidle`/timeout cố định.
- Kiểm tra `status.code` dạng chuỗi.
- Tạo từ UI, verify detail và cleanup bằng API.

Chạy:

```bash
npm run test:org
```

Xem danh sách test mà không mở browser:

```bash
npm run test:org:list
```

Mở browser:

```bash
npm run test:org:headed
```

## Cách chạy legacy

Chạy wrapper chính:

```bash
cd /duong-dan/toi/auto_test_vnpost
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

Tiêu chuẩn đầu vào và cách thiết kế test mới nằm tại
`AUTO_TEST_SCRIPT_STANDARD.md`.
