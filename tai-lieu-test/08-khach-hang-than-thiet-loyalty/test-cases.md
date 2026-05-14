# Test case - Khách hàng thân thiết (Loyalty)

| ID | Tên test case | Tiền điều kiện | Bước kiểm thử | Kết quả kỳ vọng |
| --- | --- | --- | --- | --- |
| LOY-001 | Mở màn Quản lý chiến dịch Loyalty | Account Admin cấp Tổng công ty | Đăng nhập, chọn role Admin, vào menu Chiến dịch Loyalty | Hiển thị màn Quản lý chiến dịch Loyalty, có thông tin chương trình tích điểm/đổi điểm |
| LOY-002 | Kiểm tra control chính màn Loyalty | Đang ở màn Loyalty | Quan sát các nút Thêm mới chương trình tích điểm, Thêm mới chương trình đổi điểm, danh sách/trạng thái | Các control chính hiển thị đúng theo tài liệu |
| LOY-003 | Mở form Thêm chương trình tích điểm | Đang ở màn Loyalty | Click Thêm mới chương trình tích điểm | Mở form/drawer Chương trình tích điểm, có cấu hình tỷ lệ, thời gian, điều kiện, phạm vi |
| LOY-004 | Validate rỗng chương trình tích điểm | Đang ở form thêm tích điểm | Không nhập dữ liệu, click Xác nhận | Hệ thống báo trường bắt buộc/validation |
| LOY-005 | Tạo chương trình tích điểm theo đơn hàng | Đang ở form thêm tích điểm | Bật chương trình, chọn Đơn hàng, nhập tỷ lệ, thời gian hiện tại/tương lai, giá trị tối thiểu, xác nhận | Hệ thống lưu thành công hoặc trả lỗi nghiệp vụ rõ ràng |
| LOY-006 | Mở form Thêm chương trình đổi điểm | Đang ở màn Loyalty | Click Thêm mới chương trình đổi điểm | Mở form/drawer Chương trình đổi điểm, có tỷ lệ đổi điểm, thời gian, giá trị tối thiểu |
| LOY-007 | Validate rỗng chương trình đổi điểm | Đang ở form thêm đổi điểm | Không nhập dữ liệu, click Xác nhận | Hệ thống báo trường bắt buộc/validation |
| LOY-008 | Tạo chương trình đổi điểm | Đang ở form thêm đổi điểm | Bật chương trình, nhập tỷ lệ đổi điểm, thời gian, giá trị tối thiểu, xác nhận | Hệ thống lưu thành công hoặc trả lỗi nghiệp vụ rõ ràng |
| LOY-009 | Xem chi tiết chương trình tích điểm/đổi điểm | Danh sách có chương trình | Click vào bản ghi hoặc icon chi tiết | Hiển thị chi tiết chương trình, cấu hình tỷ lệ/thời gian/điều kiện |
| LOY-010 | Kiểm tra trạng thái chương trình | Danh sách có chương trình | Quan sát trạng thái khi thời gian áp dụng hiện tại/tương lai | Chương trình hiện Đang hoạt động hoặc Ngừng hoạt động đúng tài liệu |
| LOY-011 | POS hiển thị thông tin điểm sau khi chọn khách | Account có quyền bán hàng | Vào POS, chọn khách hàng | Màn POS hiển thị thông tin điểm tích lũy/điểm thưởng nếu hệ thống có dữ liệu |
| LOY-012 | POS thanh toán bằng điểm | POS có khách hàng và sản phẩm | Chọn khách hàng, thêm sản phẩm, mở thanh toán, tick Đổi điểm | Có control Đổi điểm/thanh toán bằng điểm; nếu không đủ điều kiện phải báo lý do |

