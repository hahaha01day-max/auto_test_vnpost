# Test case - C.1 Quản lý nhóm nhà cung cấp

Phạm vi lấy từ tài liệu `10. Nhà cung cấp.docx`, mục `C.1 - Quản lý nhóm NCC`.

| ID | Tên test case | Tiền điều kiện | Bước kiểm thử | Kết quả kỳ vọng |
| --- | --- | --- | --- | --- |
| NCC-C1-001 | Điều hướng từ Quản lý nhà cung cấp sang Nhóm Nhà cung cấp | Account có quyền Admin/Quản lý cung ứng/Quản lý Tỉnh/Giám đốc Xã theo tài liệu | Đăng nhập, vào `Kho hàng > Nhà cung cấp`, click `Quản lý Nhóm NCC` | Điều hướng tới màn `Nhóm Nhà cung cấp` |
| NCC-C1-002 | Hiển thị danh sách nhóm NCC | Đang ở màn `Nhóm Nhà cung cấp` | Quan sát tiêu đề, nút thêm mới, bảng danh sách | Hiển thị `Nhóm Nhà cung cấp`, `Thêm mới`, cột `STT`, `Tên Nhóm nhà cung cấp`, `Ghi chú`, `Hành động` |
| NCC-C1-003 | Mở drawer Thêm nhóm nhà cung cấp | Đang ở màn `Nhóm Nhà cung cấp` | Click `Thêm mới` | Drawer `Thêm nhóm nhà cung cấp` hiển thị, có `Tên nhóm nhà cung cấp`, `Ghi chú`, `Xác nhận` |
| NCC-C1-004 | Validate khi thêm nhóm NCC rỗng | Đang ở drawer thêm nhóm | Không nhập tên, click `Xác nhận` | Hệ thống hiển thị validation trường bắt buộc |
| NCC-C1-005 | Thêm nhóm NCC hợp lệ | Đang ở màn `Nhóm Nhà cung cấp` | Click `Thêm mới`, nhập tên nhóm auto, nhập ghi chú, click `Xác nhận`, tìm lại nhóm vừa tạo | Thêm nhóm NCC thành công, nhóm mới hiển thị trong danh sách |
| NCC-C1-006 | Tìm kiếm nhóm NCC vừa tạo | Đã có nhóm NCC auto từ NCC-C1-005 | Nhập tên nhóm auto vào ô `Tìm kiếm` | Danh sách lọc ra đúng nhóm vừa tạo, hiển thị ghi chú |
| NCC-C1-007 | Chỉnh sửa/Xem chi tiết nhóm NCC vừa tạo | Đã có nhóm NCC auto từ NCC-C1-005 | Tìm nhóm auto, click icon sửa/xem chi tiết, đổi tên, click `Xác nhận`, tìm lại tên mới | Drawer sửa mở đúng và nhóm NCC được cập nhật thành công |
| NCC-C1-008 | Xóa nhóm NCC vừa sửa | Đã có nhóm NCC auto đã sửa từ NCC-C1-007 | Tìm nhóm auto đã sửa, click icon xóa, xác nhận `Đồng ý`, tìm lại | Nhóm NCC bị xóa thành công và không còn trong danh sách |
| NCC-C1-009 | Tìm kiếm nhóm NCC không có kết quả | Đang ở màn `Nhóm Nhà cung cấp` | Nhập keyword auto không tồn tại vào ô `Tìm kiếm` | Danh sách hiển thị trạng thái trống/không có dữ liệu |
| NCC-C1-010 | Hủy popup xóa nhóm NCC có sẵn | Danh sách nhóm NCC có ít nhất một dòng | Click icon xóa dòng đầu, click `Hủy` tại popup xác nhận | Popup đóng, dữ liệu vẫn còn trong danh sách |
