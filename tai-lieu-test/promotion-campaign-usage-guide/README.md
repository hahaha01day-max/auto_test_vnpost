# Promotion Campaign Usage Guide

Folder này chứa test case và Playwright script sinh từ tài liệu `PROMOTION_CAMPAIGN_USAGE_GUIDE.md`.

## Phạm vi

- Mở modal `Chương trình khuyến mãi` trong màn POS.
- Kiểm tra tab `Theo đơn hàng` và `Theo sản phẩm`.
- Kiểm tra điều kiện áp dụng, đối tượng khách hàng, tick chọn CTKM.
- Kiểm tra hiển thị chiết khấu khuyến mãi, quà tặng/dòng sản phẩm `KM`.
- Kiểm tra luồng thay đổi đơn hàng sau khi áp dụng CTKM.

## Cách chạy

Từ thư mục gốc project:

```bash
./run-test-tool.sh promotion-campaign-usage-guide
```

Hoặc chạy trực tiếp:

```bash
npx playwright test --config tai-lieu-test/promotion-campaign-usage-guide/playwright.config.js --project=chromium
```

