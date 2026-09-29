# Auto test Đơn vị vận tải

**108 test case** (58 → 108) · phủ **12/12** case gốc sheet QC · script hiện có **73**.

🔴 **CSV đã được DỰNG LẠI TỪ ĐẦU 18/09/2026** từ `resource/don_vi_van_tai.xlsx` (96 case). Bản trước lấy kỳ vọng từ **assertion của script** — vi phạm luật *không dùng kết quả thi hành làm đặc tả*.

🔴 **Việc quan trọng nhất: rà lại 73 script hiện có** với kỳ vọng mới. Script viết theo tài liệu cũ, mà tài liệu cũ sinh ra từ chính script — vòng lặp đó có thể đang che một assertion sai.

Nguồn test case: `resource/don_vi_van_tai.xlsx`.

## Case mẫu

`Vantai_10 - Kiểm tra giao diện Quản lý đơn vận chuyển`

- Route `/delivery/orders`.
- API `GET /delivery-orders` và `GET /delivery-units`.
- Bộ lọc, nút thao tác và các cột theo test case.
- Hiện có `SRS_GAP`: test case yêu cầu nút `Thêm mới`, nhưng nút đang bị comment trong
  `DeliveryOrderPage.jsx`. Script giữ assertion này để phát hiện đúng khác biệt.

`Vantai_31 - Kiểm tra giao diện Quản lý đơn vị vận chuyển`

Script kiểm tra:

- Route `/delivery/units`.
- API `GET /delivery-units` thành công với `status.code = "200"`.
- Tiêu đề màn hình.
- Ô tìm kiếm theo tên/mã.
- Bộ lọc loại và trạng thái.
- Nút Thêm mới.
- Các cột Mã, Tên đơn vị, Loại, Trạng thái, Tổng còn nợ, Hành động.
- Phân trang khi tổng dữ liệu lớn hơn 20.

## Chạy test

Tạo `.env` ở thư mục `auto_test_vnpost` theo `.env.example`, sau đó:

```bash
npm run test:delivery-unit
```

Chỉ kiểm tra danh sách test:

```bash
npm run test:delivery-unit:list
```

## Chạy một case đang viết

Khi viết case mới, đặt file tạm trong `case-tests/`, chạy riêng file đó trước:

```bash
npm run test:delivery-unit:case -- Vantai_50.spec.js
```

Sau khi file case lẻ pass, copy nội dung test vào `tests/delivery-unit.standard.spec.js`.
