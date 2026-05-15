# Test case - Chương trình khuyến mãi trong POS

| ID | Tên test case | Tiền điều kiện | Bước kiểm thử | Kết quả kỳ vọng |
| --- | --- | --- | --- | --- |
| PROMO-001 | Mở màn POS và kiểm tra khu vực CTKM | Account có quyền Giao dịch viên | Đăng nhập, chọn role bán hàng, vào màn tạo đơn | Có khu vực `Chương trình khuyến mãi (n)` trong tổng quan đơn hàng |
| PROMO-002 | Mở modal CTKM khi đơn chưa có sản phẩm | Đang ở màn POS | Click `Chương trình khuyến mãi (n)` khi giỏ hàng rỗng | Modal CTKM mở hoặc hệ thống hiển thị thông báo không đủ điều kiện rõ ràng |
| PROMO-003 | Mở modal CTKM sau khi thêm sản phẩm | Đang ở màn POS | Thêm sản phẩm, click `Chương trình khuyến mãi (n)` | Modal `Chương trình khuyến mãi` mở và tải danh sách chương trình |
| PROMO-004 | Kiểm tra tab Theo đơn hàng | Modal CTKM đã mở | Click tab `Theo đơn hàng` | Hiển thị danh sách/điều kiện CTKM theo đơn hàng |
| PROMO-005 | Kiểm tra tab Theo sản phẩm | Modal CTKM đã mở | Click tab `Theo sản phẩm` | Hiển thị danh sách CTKM theo từng sản phẩm, có thể tìm theo sản phẩm nếu có dữ liệu |
| PROMO-006 | Kiểm tra trạng thái điều kiện CTKM | Modal CTKM đã mở | Quan sát biểu tượng/text điều kiện | Điều kiện có trạng thái thỏa/chưa thỏa, chương trình chưa đủ điều kiện không được chọn |
| PROMO-007 | Áp dụng CTKM theo đơn hàng nếu đủ điều kiện | Có CTKM theo đơn hàng đủ điều kiện | Tick CTKM theo đơn hàng, bấm `Áp dụng` | `Chiết khấu khuyến mãi` hoặc `Quà tặng đơn hàng` cập nhật trên tổng quan |
| PROMO-008 | Áp dụng CTKM theo sản phẩm nếu đủ điều kiện | Có CTKM theo sản phẩm đủ điều kiện | Chọn tab theo sản phẩm, tick CTKM, bấm `Áp dụng` | Sản phẩm/dòng khuyến mãi có tag `KM`, giá/chiết khấu được cập nhật |
| PROMO-009 | Không tự động tick CTKM theo sản phẩm | Đơn hàng có sản phẩm đủ điều kiện | Mở tab theo sản phẩm | Hệ thống không tự tick CTKM; người dùng phải tick thủ công |
| PROMO-010 | Tách chiết khấu nhập tay và chiết khấu khuyến mãi | Có CTKM áp dụng hoặc modal CTKM | Nhập chiết khấu đơn hàng, quan sát tổng quan | `Chiết khấu đơn hàng` và `Chiết khấu khuyến mãi` hiển thị tách riêng |
| PROMO-011 | Gỡ CTKM khi đơn hàng không còn đủ điều kiện | Đã áp dụng CTKM nếu có | Xóa sản phẩm hoặc đổi số lượng không đủ điều kiện | CTKM/quà tặng/dòng KM bị gỡ hoặc hệ thống yêu cầu chọn lại |
| PROMO-012 | Mở thanh toán sau khi áp dụng/kiểm tra CTKM | Đơn có sản phẩm | Mở thanh toán | Tổng giảm giá gửi thanh toán phản ánh chiết khấu đơn hàng và CTKM; nếu không có CTKM thì không tạo dữ liệu giả |

