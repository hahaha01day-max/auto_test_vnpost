# Auto test Đơn vị vận tải

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
