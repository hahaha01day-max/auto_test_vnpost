# Test case - Chương trình khuyến mãi

| ID | Tên test case | Tiền điều kiện | Bước kiểm thử | Kết quả kỳ vọng |
| --- | --- | --- | --- | --- |
| CTKM-001 | Mở danh sách chương trình khuyến mãi | Account Admin/Marketing cấp Tổng công ty | Đăng nhập, vào Khuyến mãi > Danh sách chương trình | Hiển thị `Quản lý chương trình khuyến mãi`, thống kê trạng thái và bảng danh sách |
| CTKM-002 | Kiểm tra bộ lọc danh sách CTKM | Đang ở danh sách CTKM | Quan sát bộ lọc mã/tên, trạng thái, nhóm khách hàng, phạm vi | Bộ lọc theo tài liệu hiển thị |
| CTKM-003 | Mở màn Thêm mới CTKM | Đang ở danh sách CTKM | Click `Thêm mới chương trình` | Điều hướng sang màn `Thêm mới chương trình khuyến mãi` |
| CTKM-004 | Validate khi lưu CTKM rỗng | Đang ở màn thêm CTKM | Không nhập dữ liệu, click `Lưu` | Hiển thị validation trường bắt buộc |
| CTKM-005 | Kiểm tra tab Thông tin chung | Đang ở màn thêm CTKM | Quan sát tab Thông tin chung | Có tên chương trình, điều kiện, đối tượng, mô tả, thời gian, phân loại |
| CTKM-006 | Kiểm tra thời gian áp dụng | Đang ở màn thêm CTKM | Quan sát checkbox không ngày kết thúc/khung giờ | Có checkbox và trường ngày/giờ theo tài liệu |
| CTKM-007 | Kiểm tra phân loại Theo sản phẩm - Giảm giá bán | Đang ở màn thêm CTKM | Chọn `Theo sản phẩm`, `Giảm giá bán` | Có mua sản phẩm, số lượng từ, giảm giá mỗi sản phẩm, giảm giá sản phẩm tiếp theo |
| CTKM-008 | Kiểm tra phân loại Theo sản phẩm - Tặng kèm sản phẩm khác | Đang ở màn thêm CTKM | Chọn `Tặng kèm sản phẩm khác` | Có hình thức tặng kèm, thêm sản phẩm khuyến mãi, nhân số lượng nếu có |
| CTKM-009 | Kiểm tra phân loại Theo sản phẩm - Được mua sản phẩm khác giá thấp | Đang ở màn thêm CTKM | Chọn `Được mua sản phẩm khác giá thấp` | Có cấu hình sản phẩm mua kèm/giảm giá |
| CTKM-010 | Kiểm tra phân loại Theo đơn hàng | Đang ở màn thêm CTKM | Chọn `Theo đơn hàng` | Có cấu hình giảm giá hóa đơn và quà tặng |
| CTKM-011 | Kiểm tra tab Phạm vi áp dụng | Đang ở màn thêm CTKM | Mở tab `Phạm vi áp dụng` | Có lựa chọn phạm vi tỉnh/xã/điểm bán và danh sách điểm áp dụng |
| CTKM-012 | Mở cập nhật CTKM từ danh sách | Danh sách có dữ liệu | Click action sửa trên dòng đầu tiên | Mở màn cập nhật CTKM, có thông tin chung/phạm vi |
| CTKM-013 | Kiểm tra action dừng/tiếp tục/bắt đầu không xác nhận | Danh sách có dữ liệu | Quan sát/click action nếu có rồi hủy popup | Popup xác nhận hiển thị đúng, không xác nhận thay đổi trạng thái |
| CTKM-014 | Mở danh sách điều kiện | Account Admin/Marketing | Vào Khuyến mãi > Danh sách điều kiện | Hiển thị danh sách điều kiện, nút thêm điều kiện |
| CTKM-015 | Mở form thêm điều kiện | Đang ở danh sách điều kiện | Click `Thêm điều kiện` | Popup `Thêm mới điều kiện đơn hàng` hiển thị |
| CTKM-016 | Validate thêm điều kiện rỗng | Đang ở form thêm điều kiện | Không nhập tên, click `Xác nhận` | Hiển thị validation trường bắt buộc |
| CTKM-017 | Kiểm tra các loại điều kiện | Đang ở form thêm điều kiện | Quan sát điều kiện giá trị đơn hàng và sản phẩm ràng buộc | Có tối thiểu tổng đơn, tổng tiền sản phẩm cài đặt, cần sản phẩm hoặc không yêu cầu |
| CTKM-018 | Mở form sửa điều kiện | Danh sách điều kiện có dữ liệu | Click icon sửa dòng đầu tiên | Popup cập nhật điều kiện hiển thị, có các trường cấu hình |
| CTKM-019 | Mở danh sách đối tượng | Account Admin/Marketing | Vào Khuyến mãi > Danh sách đối tượng | Hiển thị danh sách nhóm đối tượng, nút thêm nhóm |
| CTKM-020 | Mở form thêm nhóm đối tượng | Đang ở danh sách đối tượng | Click `Thêm nhóm đối tượng` | Drawer `Thêm nhóm đối tượng khách hàng áp dụng` hiển thị |
| CTKM-021 | Validate thêm nhóm đối tượng rỗng | Đang ở drawer thêm đối tượng | Không nhập tên, click `Xác nhận` | Hiển thị validation trường bắt buộc |
| CTKM-022 | Kiểm tra các loại nhóm đối tượng | Đang ở drawer thêm đối tượng | Quan sát các lựa chọn nhóm khách | Có nhóm khách hàng, khách hàng tùy chỉnh, khách mới và điều kiện tự động |
| CTKM-023 | Mở form sửa nhóm đối tượng | Danh sách đối tượng có dữ liệu | Click icon sửa dòng đầu tiên | Drawer cập nhật nhóm đối tượng hiển thị |
| CTKM-024 | Thêm điều kiện khuyến mãi hợp lệ | Account Admin/Marketing, đang ở danh sách điều kiện | Click `Thêm điều kiện`, nhập tên auto, nhập giá trị tối thiểu, chọn `Không yêu cầu`, click `Xác nhận`, tìm lại bản ghi | Điều kiện được thêm thành công và hiển thị trong danh sách |
| CTKM-025 | Sửa điều kiện khuyến mãi vừa tạo | Đã có điều kiện auto từ CTKM-024 | Tìm điều kiện auto, click icon sửa, đổi tên, click `Xác nhận`, tìm lại theo tên mới | Điều kiện được cập nhật thành công |
| CTKM-026 | Xóa điều kiện khuyến mãi vừa tạo | Đã có điều kiện auto đã sửa từ CTKM-025 | Tìm điều kiện auto, click icon xóa, xác nhận popup xóa, tìm lại | Điều kiện không còn trong danh sách |
| CTKM-027 | Thêm nhóm đối tượng áp dụng hợp lệ | Account Admin/Marketing, đang ở danh sách đối tượng | Click `Thêm nhóm đối tượng`, nhập tên auto, nhập ghi chú, click `Xác nhận`, tìm lại bản ghi | Nhóm đối tượng được thêm thành công và hiển thị trong danh sách |
| CTKM-028 | Sửa nhóm đối tượng áp dụng vừa tạo | Đã có nhóm đối tượng auto từ CTKM-027 | Tìm nhóm đối tượng auto, click icon sửa, đổi tên, click `Xác nhận`, tìm lại theo tên mới | Nhóm đối tượng được cập nhật thành công |
| CTKM-029 | Xóa nhóm đối tượng áp dụng vừa tạo | Đã có nhóm đối tượng auto đã sửa từ CTKM-028 | Tìm nhóm đối tượng auto, click icon xóa, xác nhận popup xóa, tìm lại | Nhóm đối tượng không còn trong danh sách |
| CTKM-030 | Thêm chương trình khuyến mãi dạng lưu nháp | Có sẵn ít nhất một điều kiện và một nhóm đối tượng | Mở thêm mới CTKM, nhập tên, chọn điều kiện/đối tượng, cấu hình theo đơn hàng, chọn phạm vi áp dụng, click `Lưu nháp` | CTKM lưu nháp được tạo và hiển thị trong danh sách |
| CTKM-031 | Sửa chương trình khuyến mãi dạng lưu nháp | Đã có CTKM lưu nháp auto từ CTKM-030 | Tìm CTKM auto, click icon sửa, đổi tên, click `Lưu`, tìm lại theo tên mới | CTKM được cập nhật thành công |
| CTKM-032 | Kiểm tra danh sách CTKM không có action xóa trên UI hiện tại | Đã có CTKM lưu nháp auto từ CTKM-031 | Quan sát cột thao tác của dòng CTKM auto | UI hiện tại chỉ có sửa/action trạng thái, không có nút xóa CTKM |
