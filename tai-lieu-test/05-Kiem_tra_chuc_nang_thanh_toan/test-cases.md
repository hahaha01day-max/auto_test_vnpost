# Test case - Bán hàng (POS)

| ID | Nhóm | Test case | Kỳ vọng |
| --- | --- | --- | --- |
| POS-001 | Quản lý đơn hàng | Mở màn Quản lý đơn hàng đã tạo | Hiển thị tiêu đề, nút Bán hàng, Xuất excel, thống kê và bảng danh sách đơn hàng |
| POS-002 | Quản lý đơn hàng | Từ danh sách đơn hàng click Bán hàng | Điều hướng sang màn Bán hàng POS |
| POS-003 | POS | Mở trực tiếp màn Bán hàng | Hiển thị tìm kiếm sản phẩm, bảng sản phẩm đã chọn, tổng quan, khách hàng, chiết khấu và nút thanh toán |
| POS-004 | POS | Thanh toán khi chưa có sản phẩm | Hệ thống cảnh báo đơn hàng chưa có sản phẩm |
| POS-005 | POS | Thanh toán sau khi chưa có sản phẩm | Hệ thống cảnh báo đơn hàng chưa có sản phẩm |
| POS-006 | POS | Mở chương trình khuyến mãi | Modal/drawer khuyến mãi hiển thị tab Theo đơn hàng/Theo sản phẩm và nút Hủy/Áp dụng |
| POS-007 | POS | Nhập chiết khấu, đổi VNĐ/% và ghi chú | Trường chiết khấu/ghi chú thao tác được, tổng tiền vẫn hiển thị |
| POS-008 | POS | Tạo đơn hàng từ tìm kiếm sau đó chọn khách | Tìm kiếm sản phẩm, chọn vào giỏ, chọn khách hàng, thanh toán thành công và thấy đơn ở danh sách |
| POS-009 | POS | Tạo đơn hàng từ Chọn sản phẩm từ phần tìm kiếm | Tìm kiếm sản phẩm, chọn sản phẩm vào giỏ, lưu nháp thành công và thấy mã đơn ở danh sách |
| POS-010 | POS | Quay lại danh sách đơn hàng từ POS | Điều hướng về màn Quản lý đơn hàng |
| POS-011 | Quản lý đơn hàng | Kiểm tra chức năng Xuất excel | Click Xuất excel phải phát sinh file tải xuống định dạng excel/csv |
| POS-012 | Quản lý đơn hàng | Xem chi tiết đơn hàng khi có dữ liệu | Click mã đơn, điều hướng vào detail và thấy thông tin chung/lịch sử thanh toán/danh sách sản phẩm |
| POS-013 | POS | Tạo đơn hàng từ Chọn sản phẩm trong danh sách sản phẩm | Mở danh sách sản phẩm, chọn sản phẩm còn tồn, lưu nháp thành công và thấy mã đơn ở danh sách |
| POS-014 | POS | Tạo đơn hàng từ Chọn sản phẩm, chọn khách hàng, nhập giảm giá, thanh toán thành công, ghi nhận ở danh sách đơn hàng | Thanh toán phải báo thành công và đơn vừa tạo phải ghi nhận ở danh sách đơn hàng |
| POS-015 | POS | Tạo đơn hàng từ chọn sản phẩm từ Lọc sản phẩm theo danh mục | Lọc danh mục, chọn sản phẩm còn tồn, chọn khách hàng, thanh toán thành công và thấy đơn ở danh sách |
| POS-016 | POS / Thanh toán | Kiểm tra thanh toán bằng phương thức Tiền mặt | Hệ thống tính chính xác tiền thừa (nếu có), đóng đơn hàng và chuyển trạng thái thành "Đã thanh toán" |
| POS-017 | POS / Thanh toán | Kiểm tra thanh toán bằng phương thức Quẹt thẻ | Hệ thống đóng đơn hàng và chuyển trạng thái thành "Đã thanh toán" |
| POS-018 | POS / Thanh toán | Kiểm tra thanh toán bằng phương thức Chuyển khoản | Hệ thống đóng đơn hàng và chuyển trạng thái thành "Đã thanh toán" |
| POS-019 | POS / Thanh toán | Kiểm tra thanh toán bằng mã QR động thành công | Hệ thống đóng đơn hàng và chuyển trạng thái thành "Đã thanh toán" |
| POS-020 | POS / Thanh toán | Kiểm tra chức năng Tra soát khi gặp lỗi mạng/Timeout giao dịch QR | Hệ thống trả về trạng thái của giao dịch để GDV nắm được |
| POS-021 | POS / Thanh toán | Kiểm tra thanh toán bằng điểm Loyalty và xác thực OTP thành công | Hệ thống đóng đơn hàng và chuyển trạng thái thành "Đã thanh toán" |
| POS-022 | POS / Thanh toán | Kiểm tra chặn thanh toán bằng điểm khi nhập sai mã OTP | Hệ thống hiển thị thông báo "Sai mã OTP, vui lòng thử lại", đơn ở trạng thái treo |
| POS-023 | POS / Thanh toán | Kiểm tra thanh toán đa phương thức | Hệ thống thực hiện thanh toán lần lượt các phương thức và chuyển trạng thái thành "Đã thanh toán" |
| POS-024 | POS / Thanh toán | Kiểm tra chặn hình thức "Thanh toán sau" đối với Khách lẻ | Hệ thống hiển thị thông báo "Thanh toán sau hoặc một phần không thể áp dụng cho khách vãng lai" |
| POS-025 | POS / Thanh toán | Kiểm tra chặn "Thanh toán 1 phần" đối với Khách lẻ | Hệ thống hiển thị thông báo "Thanh toán sau hoặc một phần không thể áp dụng cho khách vãng lai" |
| POS-026 | POS / Thanh toán | Kiểm tra hình thức "Thanh toán sau" đối với khách đã có trên hệ thống | Hệ thống ghi nhận đơn hàng mua nợ thành công, đóng đơn và chuyển sang trạng thái tương ứng |
| POS-027 | POS / Thanh toán | Kiểm tra hình thức "Thanh toán 1 phần" đối với khách đã có trên hệ thống | Hệ thống đóng đơn hàng và ghi nhận thanh toán 1 phần, còn nợ phần còn lại |
| POS-028 | Quản lý đơn hàng | Kiểm tra chức năng Cập nhật thanh toán trên đơn hàng còn nợ | Cập nhật thành công, đơn hàng chuyển trạng thái đã thanh toán hoặc giảm trừ nợ tương ứng |
| POS-029 | Quản lý đơn hàng | Kiểm tra ẩn nút "Cập nhật thanh toán" trên đơn hàng đã thu đủ tiền | Không hiển thị nút "Cập nhật thanh toán" khi xem chi tiết đơn hàng đã thu đủ tiền |
| POS-030 | POS / Thanh toán | Kiểm tra hủy giao dịch QR động khi đang chờ khách quét mã | Quay trở lại giao diện chọn phương thức thanh toán ban đầu |

