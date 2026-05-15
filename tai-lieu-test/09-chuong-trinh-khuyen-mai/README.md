# Tài liệu 09 - Chương trình khuyến mãi

Folder này chứa test case và Playwright script sinh từ tài liệu `9. Chương trình khuyến mãi.docx`.

## Phạm vi

- Quản lý chương trình khuyến mãi.
- Tạo/cập nhật chiến dịch khuyến mãi.
- Phân loại khuyến mãi theo sản phẩm và theo đơn hàng.
- Phạm vi áp dụng theo tỉnh/xã/điểm bán.
- Quản lý danh sách điều kiện.
- Quản lý danh sách đối tượng.
- Thêm/sửa/xóa cấu hình điều kiện khuyến mãi.
- Thêm/sửa/xóa cấu hình nhóm đối tượng áp dụng.
- Thêm/sửa chương trình khuyến mãi dạng lưu nháp. UI danh sách hiện tại không hiển thị action xóa CTKM.

## Cách chạy

Từ thư mục gốc project:

```bash
./run-test-tool.sh 09-chuong-trinh-khuyen-mai
```

Hoặc chạy trực tiếp:

```bash
npx playwright test --config tai-lieu-test/09-chuong-trinh-khuyen-mai/playwright.config.js --project=chromium
```
