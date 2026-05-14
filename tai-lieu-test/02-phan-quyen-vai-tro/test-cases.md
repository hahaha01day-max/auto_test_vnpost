# Test case - Phân quyền vai trò

| ID | Nhóm | Test case | Kỳ vọng |
| --- | --- | --- | --- |
| PVT-001 | Quản lý vai trò | Mở màn Quản lý vai trò | Admin mở được màn Quản lý vai trò, thấy danh sách vai trò và các control chính |
| PVT-002 | Quản lý vai trò | Kiểm tra control chính trên danh sách vai trò | Có tìm kiếm/lọc, nút thêm mới, bảng danh sách và thao tác theo dòng |
| PVT-003 | Thêm vai trò | Mở form Thêm vai trò và kiểm tra trường bắt buộc | Form có Mã vai trò, Tên vai trò, Phạm vi, Mô tả và nút Xác nhận/Hủy |
| PVT-004 | Thêm vai trò | Validate form thêm vai trò rỗng | Bấm Xác nhận khi chưa nhập bắt buộc phải hiển thị lỗi validation |
| PVT-005 | CRUD vai trò | Thêm vai trò hợp lệ | Nhập Mã vai trò, Tên vai trò, Phạm vi, Mô tả; lưu thành công và thấy vai trò trong danh sách |
| PVT-006 | Quản lý vai trò | Tìm kiếm vai trò theo mã/tên | Nhập từ khóa vai trò vừa tạo và danh sách hiển thị đúng vai trò |
| PVT-007 | Cập nhật vai trò | Cập nhật tên/phạm vi vai trò | Mở form chỉnh sửa, sửa tên/phạm vi, lưu thành công và danh sách cập nhật |
| PVT-008 | Phân quyền chức năng | Mở màn gán quyền chức năng cho vai trò | Từ dòng vai trò mở được màn Phân quyền chức năng, thấy danh sách quyền tick chọn |
| PVT-009 | Phân quyền chức năng | Tick quyền chức năng và hủy | Có thể tick/bỏ tick quyền và bấm Hủy để thu hồi thao tác |
| PVT-010 | Phân quyền chức năng | Tick quyền chức năng và xác nhận | Tick quyền chức năng, bấm Xác nhận, hệ thống lưu thành công hoặc trả lỗi rõ ràng |
| PVT-011 | Xóa vai trò | Hủy thao tác xóa vai trò | Click Xóa, popup xác nhận hiển thị; bấm Hủy thì vai trò vẫn còn |
| PVT-012 | Xóa vai trò | Xóa vai trò vừa tạo | Click Xóa, bấm Đồng ý, hệ thống xóa thành công và vai trò không còn trong danh sách |

