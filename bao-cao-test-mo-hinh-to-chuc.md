# Báo cáo test nhanh: Mô hình tổ chức VNPost

Ngày test: 11/05/2026  
URL: `https://vnpost.sfin.vn/`  
Phạm vi test: Smoke test theo tài liệu `phan-tich-mo-hinh-to-chuc.md`  
Nguyên tắc thao tác: chỉ kiểm tra luồng giao diện, không tạo/sửa/xóa dữ liệu thật.

## 1. Kết quả tổng quan

| Hạng mục | Kết quả |
| --- | --- |
| Đăng nhập | Pass |
| Chọn phạm vi trang quản lý | Pass - chọn được `Tổng công ty Bưu Điện Việt Nam` với vai trò `Admin` |
| Truy cập module `Quản lý chuỗi > Mô hình tổ chức` | Pass |
| Hiển thị cây tổ chức | Pass |
| Xem chi tiết đơn vị | Pass |
| Mở màn `Nhập từ excel` | Pass |
| Mở form `Thêm đơn vị tổ chức` | Pass |
| Tạo/sửa/xóa dữ liệu | Không thực hiện để tránh ảnh hưởng dữ liệu thật |

## 2. Luồng đã thao tác

1. Mở trang `https://vnpost.sfin.vn/`.
2. Đăng nhập bằng tài khoản được cung cấp.
3. Sau đăng nhập, hệ thống chuyển tới màn chọn phạm vi làm việc.
4. Chọn `Tổng công ty Bưu Điện Việt Nam - Admin`.
5. Hệ thống chuyển vào trang quản trị.
6. Mở menu `Quản lý chuỗi`.
7. Chọn `Mô hình tổ chức`.
8. Click node `Tổng công ty Bưu Điện Việt Nam` để xem chi tiết.
9. Mở màn `Nhập từ excel`.
10. Mở form `Thêm đơn vị tổ chức`.

## 3. Ảnh minh chứng

### 3.1. Sau đăng nhập - chọn phạm vi quản lý

![Sau đăng nhập](/Users/manhle2001/Desktop/Script_document/vnpost-03-after-login.png)

### 3.2. Màn hình Mô hình tổ chức

![Mô hình tổ chức](/Users/manhle2001/Desktop/Script_document/vnpost-06-org-model.png)

### 3.3. Xem chi tiết đơn vị Tổng công ty

![Chi tiết đơn vị](/Users/manhle2001/Desktop/Script_document/vnpost-07-org-detail.png)

### 3.4. Màn Nhập từ Excel

![Nhập từ Excel](/Users/manhle2001/Desktop/Script_document/vnpost-08-import-excel.png)

### 3.5. Form Thêm đơn vị tổ chức

![Thêm đơn vị](/Users/manhle2001/Desktop/Script_document/vnpost-09-add-form-or-state.png)

## 4. Đối chiếu với tài liệu SRS

| Nội dung trong SRS | Kết quả trên web | Nhận xét |
| --- | --- | --- |
| Admin truy cập `Quản lý chuỗi > Mô hình tổ chức` | Đúng | Menu tồn tại và mở được module |
| Cây tổ chức hiển thị bên trái | Đúng | Có cây phân cấp, có icon expand/collapse, có số lượng con |
| Click đơn vị để xem chi tiết | Đúng | Panel chi tiết hiển thị bên phải |
| Chi tiết có thao tác `Xóa`, `Cập nhật`, `Tạo điểm bán` | Đúng | Các button hiển thị rõ |
| Có `Nhập từ excel` | Đúng | Mở drawer upload file, có `Tải file mẫu` và `Xác nhận` |
| Có `Thêm đơn vị` | Đúng | Mở drawer thêm đơn vị tổ chức |
| Form thêm đơn vị có `Mã đơn vị`, `Tên đơn vị`, `Đơn vị cha` | Đúng | Các trường đều có dấu bắt buộc |
| Tài liệu ghi Tổng công ty mã `00` | Web đang hiển thị mã `VNPOST` | Cần xác nhận lại rule mã cấp Tổng công ty |
| Tài liệu có `Xuất excel` | Chưa thấy trên màn đang test | Cần kiểm tra lại quyền hoặc vị trí chức năng |
| Tài liệu chưa nhắc tìm kiếm cây | Web có ô `Tìm kiếm` | Nên bổ sung vào tài liệu |

## 5. Ghi nhận chi tiết

### 5.1. Màn chọn phạm vi sau đăng nhập

Sau khi đăng nhập, hệ thống không vào thẳng dashboard mà yêu cầu chọn phạm vi:

- `Bưu điện Hưng Yên - Quản lý tỉnh`
- `Tổng công ty Bưu Điện Việt Nam - Admin`
- `Bưu điện Hoàn Kiếm - Giám đốc xã`
- `Bưu điện Hà Nội - Quản lý tỉnh`
- Các điểm bán/cửa hàng phía dưới

Điều này nên được bổ sung vào tài liệu hướng dẫn nếu user có nhiều vai trò/phạm vi.

### 5.2. Màn Mô hình tổ chức

Màn hình có:

- Sidebar module.
- Menu `Quản lý chuỗi` đang mở.
- Submenu `Mô hình tổ chức` đang active.
- Ô tìm kiếm cây tổ chức.
- Cây tổ chức có node root `Tổng công ty Bưu Điện Việt Nam`.
- Các node tỉnh/thành như Hà Nội, Hà Giang, Cao Bằng, Bắc Kạn, Tuyên Quang...
- Button `Nhập từ excel`.
- Button `Thêm đơn vị`.

### 5.3. Chi tiết đơn vị

Khi chọn `Tổng công ty Bưu Điện Việt Nam`, panel chi tiết hiển thị:

| Trường | Giá trị quan sát |
| --- | --- |
| Tên đơn vị | Tổng công ty Bưu Điện Việt Nam |
| Mã đơn vị | VNPOST |
| Bưu điện tỉnh | -- |
| Bưu điện xã | -- |
| Điểm bán | 4, có link `Xem danh sách` |
| Kho hub | 1, có link `Xem danh sách` |

Button thao tác:

- `Xóa`
- `Cập nhật`
- `Tạo điểm bán`

### 5.4. Nhập từ Excel

Màn `Nhập từ Excel` mở dạng drawer bên phải, có:

- Button `Tải file mẫu`.
- Button `Xác nhận`.
- Vùng kéo thả hoặc bấm để chọn file.
- Hỗ trợ file `.xls`, `.xlsx`.
- Khi chưa chọn file, hệ thống hiển thị lỗi `Vui lòng chọn file excel`.

Gợi ý kiểm thử tiếp:

- Tải file mẫu và kiểm tra cấu trúc cột.
- Upload file hợp lệ.
- Upload file sai định dạng.
- Upload file có mã trùng.
- Upload file có đơn vị cha không tồn tại.

### 5.5. Thêm đơn vị tổ chức

Form `Thêm đơn vị tổ chức` mở dạng drawer bên phải, có:

| Trường | Trạng thái |
| --- | --- |
| Mã đơn vị | Bắt buộc |
| Tên đơn vị | Bắt buộc |
| Đơn vị cha | Bắt buộc |

Button:

- `Xác nhận`
- Có icon `X` để đóng drawer

Nhận xét:

- Không thấy button `Hủy` dạng text trong drawer, khác kỳ vọng thường gặp ở form nhập liệu.
- Chưa test bấm `Xác nhận` vì sẽ tạo dữ liệu thật.

## 6. Vấn đề/cần xác nhận

| Mức độ | Nội dung | Ghi chú |
| --- | --- | --- |
| Medium | Mã Tổng công ty trên web là `VNPOST`, trong tài liệu ghi mã cấp 1 là `00` | Cần BA/PO xác nhận rule đúng |
| Medium | Chưa thấy chức năng `Xuất excel` trên màn đã test | Có thể do quyền, vị trí khác, hoặc tài liệu chưa khớp UI |
| Low | Tài liệu chưa mô tả bước chọn phạm vi sau đăng nhập | Nên bổ sung vào hướng dẫn sử dụng |
| Low | Tài liệu chưa mô tả ô tìm kiếm cây tổ chức | Web đã có chức năng tìm kiếm |
| Low | Drawer thêm đơn vị không có nút `Hủy`, chỉ có icon đóng | Không lỗi, nhưng nên thống nhất UX |
| Low | Console có ghi nhận `Failed to load resource: net::ERR_FAILED` và `Page error: Response` | Chưa thấy ảnh hưởng luồng test, cần dev kiểm tra log chi tiết nếu cần |

## 7. Kết luận

Các luồng chính theo tài liệu đều truy cập được: đăng nhập, chọn phạm vi Admin, mở `Quản lý chuỗi > Mô hình tổ chức`, xem cây tổ chức, xem chi tiết đơn vị, mở `Nhập từ Excel`, mở `Thêm đơn vị tổ chức`.

Chưa thực hiện thao tác tạo/sửa/xóa/import thật để tránh thay đổi dữ liệu trên hệ thống. Điểm cần ưu tiên xác nhận là rule mã Tổng công ty vì tài liệu ghi `00` nhưng web đang hiển thị `VNPOST`.
