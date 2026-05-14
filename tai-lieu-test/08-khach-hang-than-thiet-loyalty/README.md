# Tài liệu 08 - Khách hàng thân thiết (Loyalty)

Folder này chứa test case và Playwright script sinh từ tài liệu `8. Khách hàng thân thiết (Loyalty).docx`.

## Phạm vi

- Quản lý chiến dịch Loyalty.
- Thêm chương trình tích điểm.
- Thêm chương trình đổi điểm.
- Xem chi tiết chương trình.
- Kiểm tra luồng bán hàng POS có áp dụng điểm thưởng.

## Cách chạy

Từ thư mục gốc project:

```bash
./run-test-tool.sh 08-khach-hang-than-thiet-loyalty
```

Hoặc chạy riêng folder:

```bash
npx playwright test --config tai-lieu-test/08-khach-hang-than-thiet-loyalty/playwright.config.js --project=chromium
```

