# Bộ test case review - Kho và Nhà cung cấp

Nguồn tài liệu:

- `10. Nhà cung cấp.docx`
- `11. Kho.docx`
- `Quy trình Chính v1.pdf`
- `Quy trình Phụ v1.pdf`

Ghi chú: bộ này là danh sách test case để duyệt nghiệp vụ trước. Chưa viết script automation.

## A. Nhà cung cấp

| ID | Nhóm | Test case | Điều kiện | Kết quả kỳ vọng |
| --- | --- | --- | --- | --- |
| NCC-001 | Điều hướng | Mở màn Quản lý nhà cung cấp từ menu Kho hàng > Nhà cung cấp | User có quyền Admin/Quản lý cung ứng/Quản lý tỉnh | Hiển thị màn Quản lý nhà cung cấp, danh sách NCC, nút Thêm mới, Quản lý Nhóm NCC, Quản lý danh mục |
| NCC-002 | Phân quyền | Kiểm tra quyền Tổng công ty | User Tổng công ty Admin/Quản lý cung ứng | Xem/thao tác được Nhóm NCC, Danh mục NCC, NCC, sản phẩm, bảng giá, công nợ, trả hàng theo quyền |
| NCC-003 | Phân quyền | Kiểm tra quyền Tỉnh | User Quản lý cung ứng/Quản lý Tỉnh | Xem/thao tác NCC theo phạm vi tỉnh, không thấy dữ liệu ngoài phạm vi nếu hệ thống giới hạn |
| NCC-004 | Phân quyền | Kiểm tra quyền Xã | User Giám đốc Xã | Với sản phẩm theo NCC chỉ xem danh sách, không thao tác thêm/cập nhật nếu tài liệu giới hạn |
| NCC-005 | Nhóm NCC | Mở màn Nhóm Nhà cung cấp | Tại màn Quản lý nhà cung cấp | Click Quản lý Nhóm NCC, hệ thống điều hướng/mở màn Nhóm Nhà cung cấp |
| NCC-006 | Nhóm NCC | Thêm nhóm NCC thành công | Có quyền tạo | Drawer Thêm nhóm nhà cung cấp mở, nhập dữ liệu hợp lệ, Xác nhận thành công, nhóm xuất hiện trong danh sách |
| NCC-007 | Nhóm NCC | Validate thêm nhóm NCC bỏ trống | Drawer thêm nhóm đang mở | Bấm Xác nhận khi bỏ trống, hiển thị lỗi các trường bắt buộc |
| NCC-008 | Nhóm NCC | Tìm kiếm nhóm NCC | Có dữ liệu nhóm | Nhập từ khóa, danh sách lọc đúng nhóm phù hợp |
| NCC-009 | Nhóm NCC | Sửa nhóm NCC | Có nhóm test | Click chỉnh sửa, cập nhật thông tin, Xác nhận thành công, dữ liệu mới hiển thị |
| NCC-010 | Nhóm NCC | Xem chi tiết nhóm NCC | Có nhóm trong danh sách | Click xem chi tiết, hiển thị đúng thông tin nhóm |
| NCC-011 | Nhóm NCC | Xóa nhóm NCC | Có nhóm không bị ràng buộc | Xác nhận xóa, nhóm không còn trong danh sách |
| NCC-012 | Danh mục NCC | Mở drawer Danh mục nhà cung cấp | Tại màn Quản lý nhà cung cấp | Click Quản lý danh mục, drawer Danh mục nhà cung cấp hiển thị danh sách và nút Thêm mới |
| NCC-013 | Danh mục NCC | Thêm danh mục NCC thành công | Có quyền tạo | Nhập dữ liệu hợp lệ, bấm Thêm/Xác nhận, danh mục xuất hiện |
| NCC-014 | Danh mục NCC | Validate thêm danh mục bỏ trống | Drawer thêm danh mục đang mở | Hiển thị lỗi trường bắt buộc |
| NCC-015 | Danh mục NCC | Tìm kiếm danh mục NCC | Có dữ liệu danh mục | Danh sách lọc đúng theo từ khóa |
| NCC-016 | Danh mục NCC | Sửa danh mục NCC | Có danh mục test | Cập nhật thành công, danh mục mới hiển thị |
| NCC-017 | Danh mục NCC | Xem chi tiết danh mục NCC | Có danh mục | Hiển thị đúng thông tin chi tiết |
| NCC-018 | Danh mục NCC | Xóa danh mục NCC | Có danh mục không bị ràng buộc | Xóa thành công, danh mục biến mất khỏi danh sách |
| NCC-019 | NCC | Mở drawer Thêm nhà cung cấp | Tại màn Quản lý NCC | Click Thêm mới, drawer Thêm nhà cung cấp hiển thị đủ nhóm Thông tin cơ bản, Thông tin đặt hàng, Thông tin xử lý khiếu nại |
| NCC-020 | NCC | Validate thêm NCC bỏ trống | Drawer Thêm NCC đang mở | Bấm Xác nhận, hiển thị lỗi các trường bắt buộc như mã, tên, số điện thoại, địa chỉ/nhóm/danh mục nếu bắt buộc |
| NCC-021 | NCC | Thêm NCC thành công với thông tin cơ bản | Có nhóm/danh mục NCC | Nhập mã, tên, SĐT, tỉnh/xã, nhóm, danh mục, công ty, MST, email, ghi chú; tạo thành công |
| NCC-022 | NCC | Validate định dạng số điện thoại NCC | Drawer Thêm NCC | Nhập SĐT sai định dạng, hệ thống báo lỗi |
| NCC-023 | NCC | Validate định dạng email NCC | Drawer Thêm NCC | Nhập email sai định dạng ở thông tin cơ bản/đặt hàng/khiếu nại, hệ thống báo lỗi |
| NCC-024 | NCC | Validate mã NCC trùng | Đã tồn tại NCC có mã | Tạo NCC với mã trùng, hệ thống báo đã tồn tại |
| NCC-025 | NCC | Tìm kiếm NCC | Có dữ liệu NCC | Nhập từ khóa mã/tên/SĐT, danh sách lọc đúng |
| NCC-026 | NCC | Sửa NCC | Có NCC test | Click chỉnh sửa, cập nhật thông tin, Xác nhận thành công |
| NCC-027 | NCC | Xem chi tiết NCC | Có NCC | Chi tiết hiển thị đủ thông tin cơ bản, đặt hàng, khiếu nại |
| NCC-028 | NCC | Xóa NCC | Có NCC không bị ràng buộc | Xác nhận xóa, NCC không còn trong danh sách |
| NCC-029 | Sản phẩm theo NCC | Mở Danh sách sản phẩm theo NCC | Có NCC trong danh sách | Click link Sản phẩm ở row NCC, mở màn/drawer Danh sách sản phẩm theo nhà cung cấp |
| NCC-030 | Sản phẩm theo NCC | Thêm/Cập nhật sản phẩm NCC thủ công | Có sản phẩm trong hệ thống | Click Thêm mới/Cập nhật SP, tích chọn sản phẩm, Xác nhận, sản phẩm xuất hiện trong danh sách NCC |
| NCC-031 | Sản phẩm theo NCC | Nhập sản phẩm NCC từ Excel | Có file mẫu/file import | Click Nhập từ Excel, upload file, Xác nhận, sản phẩm được ghi nhận hoặc hiển thị lỗi file |
| NCC-032 | Sản phẩm theo NCC | Validate import khi chưa chọn file | Drawer import đang mở | Bấm xác nhận khi chưa chọn file, hệ thống báo chưa chọn file |
| NCC-033 | Sản phẩm theo NCC | Xóa sản phẩm khỏi NCC | Có sản phẩm gắn NCC | Xác nhận xóa, sản phẩm không còn trong danh sách NCC |
| NCC-034 | Sản phẩm theo NCC | Xem lịch sử giá sản phẩm | Có sản phẩm có lịch sử giá | Click Lịch sử giá, hiển thị danh sách biến động giá |
| NCC-035 | Bảng giá NCC | Mở màn Bảng giá NCC | Từ danh sách sản phẩm NCC | Click Bảng giá, mở màn Bảng giá nhà cung cấp |
| NCC-036 | Bảng giá NCC | Tạo bảng giá mới thủ công | Có NCC và sản phẩm | Nhập tên bảng giá, thời gian hiệu lực, ghi chú, thêm dòng sản phẩm, giá nhập, VAT, loại giá, SL tối thiểu, Xác nhận tạo trạng thái Nháp |
| NCC-037 | Bảng giá NCC | Tạo bảng giá không có ngày kết thúc | Có ngày bắt đầu | Bảng giá hiệu lực từ ngày bắt đầu và vô thời hạn |
| NCC-038 | Bảng giá NCC | Nhập bảng giá từ Excel | Có file mẫu | Tải file mẫu, upload file, hệ thống đọc dữ liệu hoặc báo lỗi đúng |
| NCC-039 | Bảng giá NCC | Upload chứng từ đính kèm bảng giá | Có file chứng từ hợp lệ | File được đính kèm/lưu cùng bảng giá |
| NCC-040 | Bảng giá NCC | Sửa bảng giá trạng thái Nháp | Có bảng giá Nháp | Cho phép sửa và lưu cập nhật |
| NCC-041 | Bảng giá NCC | Không cho sửa bảng giá đã ban hành | Có bảng giá Đã ban hành | Nút sửa bị ẩn/disabled hoặc không cho cập nhật |
| NCC-042 | Bảng giá NCC | Ban hành bảng giá | Có bảng giá Nháp | Sau xác nhận, trạng thái chuyển Đã ban hành và bắt đầu có hiệu lực |
| NCC-043 | Bảng giá NCC | Hủy bảng giá đã ban hành | Có bảng giá Đã ban hành | Sau xác nhận, trạng thái chuyển Đã hủy và kết thúc hiệu lực |
| NCC-044 | Bảng giá NCC | Xem chi tiết bảng giá | Có bảng giá | Hiển thị thông tin chung, danh sách sản phẩm, chứng từ, trạng thái |
| NCC-045 | Công nợ NCC | Mở Lịch sử ghi nợ và thanh toán | Có NCC | Click Công nợ, hiển thị phiếu nợ/thanh toán theo thời gian, tổng còn nợ |
| NCC-046 | Công nợ NCC | Ghi nợ NCC thành công | Có NCC | Click Ghi nợ, nhập nhân viên, số tiền, ghi chú, Lưu; tạo phiếu ghi nợ và tăng tổng công nợ |
| NCC-047 | Công nợ NCC | Validate ghi nợ bỏ trống/số tiền không hợp lệ | Drawer Ghi nợ mở | Hiển thị lỗi trường bắt buộc hoặc số tiền không hợp lệ |
| NCC-048 | Công nợ NCC | Gạch nợ cũ nhất | NCC có phiếu nợ | Chọn chế độ Gạch nợ cũ nhất, nhập số tiền/phương thức; hệ thống phân bổ vào phiếu nợ cũ nhất và giảm tổng còn nợ |
| NCC-049 | Công nợ NCC | Gạch nợ mới nhất | NCC có phiếu nợ | Hệ thống phân bổ vào phiếu nợ gần nhất |
| NCC-050 | Công nợ NCC | Gạch nợ trong khoảng thời gian | NCC có phiếu nợ trong kỳ | Chọn kỳ lọc, hệ thống chỉ phân bổ vào phiếu được chọn trong kỳ |
| NCC-051 | Công nợ NCC | Thanh toán nợ NCC | NCC có công nợ | Tạo phiếu thanh toán/phiếu chi tương ứng, giảm tổng công nợ |
| NCC-052 | Trả hàng NCC | Mở Phiếu trả hàng | Có NCC và sản phẩm NCC | Click Trả hàng, mở drawer Phiếu trả hàng |
| NCC-053 | Trả hàng NCC | Tạo phiếu trả hàng thành công | Có sản phẩm có thể trả | Chọn sản phẩm, đơn vị, số lượng, mã hóa đơn/chứng từ, người trả hàng, quỹ thu, ghi chú; tạo phiếu thành công |
| NCC-054 | Trả hàng NCC | Validate trả hàng số lượng không hợp lệ | Drawer trả hàng mở | Nhập số lượng 0/âm/vượt tồn nếu có rule, hệ thống báo lỗi |

## B. Kho

| ID | Nhóm | Test case | Điều kiện | Kết quả kỳ vọng |
| --- | --- | --- | --- | --- |
| KHO-001 | Phiếu đề xuất đặt hàng | Mở màn Phiếu đề xuất đặt hàng | User có quyền theo tài liệu | Hiển thị danh sách phiếu, nút Tạo phiếu đề xuất, bộ lọc/trạng thái nếu có |
| KHO-002 | Phiếu đề xuất đặt hàng | Tạo phiếu đề xuất lưu nháp | Có sản phẩm | Nhập thông tin chung, chọn sản phẩm, đơn vị, số lượng, bấm Lưu; phiếu ở trạng thái Phiếu nháp |
| KHO-003 | Phiếu đề xuất đặt hàng | Tạo phiếu đề xuất gửi phê duyệt | Có sản phẩm | Bấm Gửi phê duyệt, phiếu ở trạng thái Chờ duyệt |
| KHO-004 | Phiếu đề xuất đặt hàng | Validate tạo phiếu đề xuất bỏ trống sản phẩm | Form tạo phiếu mở | Hệ thống báo lỗi chưa chọn sản phẩm/số lượng |
| KHO-005 | Phiếu đề xuất đặt hàng | Sửa phiếu trạng thái Phiếu nháp | Có phiếu nháp | Cho phép sửa, Cập nhật thành công, vẫn ở trạng thái Phiếu nháp |
| KHO-006 | Phiếu đề xuất đặt hàng | Sửa phiếu trạng thái Từ chối | Có phiếu bị từ chối | Cho phép sửa và gửi lại phê duyệt |
| KHO-007 | Phiếu đề xuất đặt hàng | Không cho sửa phiếu không hợp lệ trạng thái | Phiếu Đã duyệt/Đã gộp/Đã tách | Nút sửa ẩn/disabled hoặc hệ thống chặn |
| KHO-008 | Phiếu đề xuất đặt hàng | Xem chi tiết phiếu đề xuất | Có phiếu | Mở chi tiết, hiển thị thông tin chung, danh sách sản phẩm, trạng thái, nút thao tác theo quyền/trạng thái |
| KHO-009 | Phiếu đề xuất đặt hàng | Duyệt phiếu chờ duyệt | User có quyền duyệt | Mở chi tiết phiếu Chờ duyệt, bấm Xác nhận, nhập SL duyệt, xác nhận duyệt; phiếu chuyển Đã duyệt |
| KHO-010 | Phiếu đề xuất đặt hàng | Từ chối phiếu chờ duyệt | User có quyền duyệt | Nhập lý do từ chối, phiếu chuyển Từ chối |
| KHO-011 | Phiếu đề xuất đặt hàng | Gộp tối thiểu 2 phiếu | Có ít nhất 2 phiếu Chờ duyệt/Đã duyệt | Chọn phiếu, nút Gộp phiếu(n) active, lưu gộp thành phiếu mới Chờ duyệt, phiếu nguồn Đã gộp |
| KHO-012 | Phiếu đề xuất đặt hàng | Không cho gộp dưới 2 phiếu | Chọn 0/1 phiếu | Nút Gộp phiếu không hiển thị/disabled |
| KHO-013 | Phiếu đề xuất đặt hàng | Tách phiếu | Có phiếu Chờ duyệt/Đã duyệt | Mở tách phiếu, phân bổ số lượng hợp lệ, lưu nháp/gửi duyệt; phiếu nguồn Đã tách, phiếu kết quả đúng trạng thái |
| KHO-014 | Phiếu đề xuất đặt hàng | Validate tách phiếu vượt số lượng | Form tách phiếu | Tổng số lượng phân bổ vượt tổng đề xuất, hệ thống báo lỗi |
| KHO-015 | Phiếu đề xuất đặt hàng | Xem lịch sử gộp/tách | Phiếu có lịch sử | Drawer Lịch sử gộp/tách hiển thị phiếu nguồn/kết quả, trạng thái, highlight phiếu hiện tại |
| KHO-016 | Đặt hàng NCC | Mở màn Đặt hàng nhà cung cấp | User có quyền | Hiển thị danh sách phiếu đặt hàng, nút Tạo đơn đặt hàng |
| KHO-017 | Đặt hàng NCC | Tạo phiếu đặt hàng NCC thủ công lưu nháp | Có NCC, sản phẩm, bảng giá | Nhập thông tin phiếu và sản phẩm, Lưu nháp; phiếu trạng thái Bản nháp |
| KHO-018 | Đặt hàng NCC | Tạo phiếu đặt hàng NCC lưu duyệt | Có dữ liệu hợp lệ | Bấm Lưu, phiếu trạng thái Đã duyệt |
| KHO-019 | Đặt hàng NCC | Tạo phiếu đặt hàng NCC gửi NCC | Có dữ liệu hợp lệ | Bấm Gửi nhà cung cấp, phiếu trạng thái Đã gửi NCC |
| KHO-020 | Đặt hàng NCC | Tạo phiếu đặt hàng từ phiếu đề xuất | Có phiếu đề xuất phù hợp | Từ chi tiết phiếu đề xuất bấm Tạo phiếu đặt hàng NCC, dữ liệu phiếu đề xuất được fill/không cho sửa, phiếu gốc chuyển Đã đặt hàng |
| KHO-021 | Đặt hàng NCC | Sản phẩm chưa gắn NCC khi tạo đặt hàng | Sản phẩm chưa gắn NCC/bảng giá | Hệ thống hiển thị popup loại bỏ sản phẩm khỏi phiếu |
| KHO-022 | Đặt hàng NCC | Chọn mức giá theo bảng giá hiệu lực | Sản phẩm có bảng giá | Mức giá hiển thị đúng danh sách giá hiệu lực |
| KHO-023 | Đặt hàng NCC | Xem chi tiết phiếu đặt hàng NCC | Có phiếu đặt hàng | Hiển thị thông tin phiếu, sản phẩm, trạng thái, nút thao tác theo quyền/trạng thái |
| KHO-024 | Đặt hàng NCC | Hủy phiếu chưa gửi NCC | Phiếu chưa gửi NCC | Bấm Hủy phiếu, trạng thái Đã hủy |
| KHO-025 | Đặt hàng NCC | Không cho hủy phiếu đã gửi NCC | Phiếu Đã gửi NCC hoặc sau đó | Nút hủy ẩn/disabled hoặc hệ thống chặn |
| KHO-026 | Đặt hàng NCC | NCC xác nhận phiếu đã gửi | Phiếu Đã gửi NCC | Nhập số lượng xác nhận, bấm Xác nhận, trạng thái NCC xác nhận |
| KHO-027 | Đặt hàng NCC | Nhập kho từ đơn đặt hàng NCC | Phiếu NCC xác nhận | Mở Phiếu nhập kho, sản phẩm/NCC được fill, bấm Nhập kho, phiếu chuyển Đã giao |
| KHO-028 | Xuất nhập kho | Mở màn Lịch sử xuất nhập kho | User có quyền | Hiển thị tab lịch sử, nút Nhập kho, Xuất kho, tab Báo cáo nhập/xuất |
| KHO-029 | Nhập kho | Mở drawer Phiếu nhập kho | Màn xuất nhập kho | Click Nhập kho, drawer Phiếu nhập kho hiển thị |
| KHO-030 | Nhập kho | Tạo phiếu nhập kho thành công | Có sản phẩm, NCC, kho | Chọn sản phẩm, đơn vị, số lượng, đơn giá, giảm giá, kho, chứng từ, nguồn nhập, NCC, người nhập; bấm Nhập kho, tồn kho tăng, giá vốn/công nợ ghi nhận |
| KHO-031 | Nhập kho | Validate nhập kho bỏ trống sản phẩm | Drawer nhập kho | Hiển thị lỗi bắt buộc |
| KHO-032 | Nhập kho | Validate số lượng/đơn giá nhập kho | Drawer nhập kho | Số lượng/đơn giá 0/âm/sai định dạng bị chặn |
| KHO-033 | Nhập kho | Xem chi tiết phiếu nhập kho | Có phiếu nhập | Drawer chi tiết hiển thị thông tin phiếu, sản phẩm, công nợ |
| KHO-034 | Nhập kho | Chỉnh sửa phiếu nhập chưa thanh toán hết | Phiếu nhập còn công nợ | Cho phép chỉnh sửa, Cập nhật thành công, tồn kho/công nợ/giá xuất kho cập nhật |
| KHO-035 | Nhập kho | Không cho chỉnh sửa phiếu nhập đã thanh toán hết | Phiếu đã thanh toán hết | Chức năng chỉnh sửa inactive/ẩn |
| KHO-036 | Nhập kho | Thanh toán phiếu nhập | Phiếu nhập còn nợ | Mở Phiếu chi tiền, chọn quỹ chi, số tiền, phương thức, ghi chú, Hoàn thành; công nợ giảm |
| KHO-037 | Nhập kho | Validate thanh toán vượt số tiền nhập kho | Phiếu nhập còn nợ | Nhập số tiền vượt quá cần chi, hệ thống báo lỗi |
| KHO-038 | Báo cáo nhập | Xem tab Báo cáo nhập theo sản phẩm | Có dữ liệu nhập | Hiển thị số lần nhập, số lượng, số tiền theo sản phẩm |
| KHO-039 | Báo cáo nhập | Xem chi tiết từng lần nhập theo sản phẩm | Có dòng sản phẩm | Click Chi tiết, hiển thị danh sách phiếu nhập theo thời gian |
| KHO-040 | Báo cáo nhập | Xem báo cáo nhập theo nguồn nhập | Có dữ liệu | Hiển thị thống kê theo nguồn nhập kho |
| KHO-041 | Xuất kho | Mở drawer Phiếu xuất kho | Màn xuất nhập kho | Click Xuất kho, drawer Phiếu xuất kho hiển thị |
| KHO-042 | Xuất kho | Tạo phiếu xuất kho thành công | Có tồn kho | Chọn sản phẩm, đơn vị, số lượng, chứng từ, xuất cho, NCC, người xuất, ghi chú; bấm Xuất kho, tồn kho giảm |
| KHO-043 | Xuất kho | Validate xuất kho vượt tồn | Sản phẩm tồn thấp | Nhập số lượng vượt tồn, hệ thống chặn/báo lỗi |
| KHO-044 | Xuất kho | Validate xuất kho bỏ trống | Drawer xuất kho | Hiển thị lỗi bắt buộc |
| KHO-045 | Báo cáo xuất | Xem tab Báo cáo xuất theo sản phẩm | Có dữ liệu xuất | Hiển thị số lần xuất, số lượng, số tiền |
| KHO-046 | Báo cáo xuất | Xem chi tiết từng lần xuất theo sản phẩm | Có dòng sản phẩm | Click Chi tiết, hiển thị danh sách phiếu xuất theo thời gian |
| KHO-047 | Báo cáo xuất | Xem báo cáo xuất theo nguồn xuất | Có dữ liệu | Hiển thị thống kê theo nguồn xuất |
| KHO-048 | Kiểm kho | Mở màn Phiếu kiểm kho | User có quyền Admin/Quản lý tỉnh/Cửa hàng trưởng | Hiển thị danh sách phiếu kiểm kho và nút Thêm phiếu kiểm kho |
| KHO-049 | Kiểm kho | Tạo phiếu kiểm kho thủ công | Có sản phẩm | Chọn sản phẩm, nhập số lượng kiểm thực tế, thông tin phiếu, Cập nhật kho; tồn kho cập nhật |
| KHO-050 | Kiểm kho | Tạo phiếu kiểm kho bằng import Excel | Có file import | Upload file kiểm kho, dữ liệu sản phẩm hiển thị đúng hoặc báo lỗi file |
| KHO-051 | Kiểm kho | Xem chi tiết phiếu kiểm kho | Có phiếu kiểm kho | Drawer Chi tiết phiếu kiểm kho hiển thị thông tin và danh sách sản phẩm |
| KHO-052 | Kiểm kho | Lọc sản phẩm kiểm khớp/chênh lệch tăng/chênh lệch giảm | Phiếu có nhiều trạng thái lệch | Bộ lọc trả đúng danh sách theo trạng thái kiểm |
| KHO-053 | Kiểm kho | Xuất báo cáo kiểm kê | Có phiếu kiểm kho | Xuất được báo cáo chi tiết phân loại tồn kho khớp/lệch và giá trị chênh lệch |
| KHO-054 | Cảnh báo tồn kho | Mở màn Cảnh báo tồn kho | User có quyền | Hiển thị đủ 6 tab cảnh báo theo tài liệu |
| KHO-055 | Cảnh báo tồn kho | Cài đặt cảnh báo nhanh | Có sản phẩm | Chọn phạm vi áp dụng, nhập min/max, lưu thành công |
| KHO-056 | Cảnh báo tồn kho | Cài đặt cảnh báo theo từng sản phẩm | Có danh sách sản phẩm | Nhập min/max từng sản phẩm, lưu thành công |
| KHO-057 | Cảnh báo tồn kho | Validate min/max không hợp lệ | Form cài đặt cảnh báo | Min/Max âm hoặc Min > Max bị chặn/báo lỗi |
| KHO-058 | Cảnh báo tồn kho | Xem tab Dưới định mức Min | Có sản phẩm dưới min | Danh sách hiển thị đúng sản phẩm dưới min |
| KHO-059 | Cảnh báo tồn kho | Xem tab Vượt định mức Max | Có sản phẩm vượt max | Danh sách hiển thị đúng sản phẩm vượt max |
| KHO-060 | Cảnh báo tồn kho | Xem cảnh báo hàng sắp hết | Có dữ liệu cảnh báo | Tab hiển thị danh sách hàng sắp hết |
| KHO-061 | Cảnh báo tồn kho | Xem dự báo hết hàng | Có dữ liệu dự báo | Tab Dự báo hết hàng hiển thị danh sách/ước tính |
| KHO-062 | Tổng quan kho | Mở màn Tổng quan kho tab Tồn kho | User có quyền | Hiển thị danh sách sản phẩm tồn, giá vốn, số lượng tồn, giá trị tồn |
| KHO-063 | Tổng quan kho | Xem Thẻ kho | Có sản phẩm tồn | Click Xem chi tiết tại cột Thẻ kho, drawer Thẻ kho hiển thị lịch sử biến động |
| KHO-064 | Tổng quan kho | Xem Báo cáo xuất nhập tồn | Có dữ liệu | Hiển thị tồn đầu kỳ, tổng nhập, kiểm nhập, tổng xuất, kiểm xuất theo sản phẩm |
| KHO-065 | Chuyển kho | Mở màn Chuyển kho | User có quyền | Hiển thị danh sách phiếu chuyển kho và nút Chuyển kho |
| KHO-066 | Chuyển kho | Tạo phiếu chuyển kho | Có sản phẩm tồn và 2 kho | Chọn sản phẩm, số lượng, kho chuyển, kho nhận, chứng từ, người tạo, ghi chú; bấm Tạo phiếu, chi nhánh chuyển trạng thái Đã chuyển, chi nhánh nhận Chờ xác nhận |
| KHO-067 | Chuyển kho | Validate kho chuyển trùng kho nhận | Form chuyển kho | Hệ thống chặn/báo lỗi không cho chọn cùng kho |
| KHO-068 | Chuyển kho | Validate chuyển vượt tồn | Sản phẩm tồn thấp | Hệ thống chặn/báo lỗi |
| KHO-069 | Chuyển kho | Xác nhận phiếu chuyển ở kho nhận | Có phiếu Chờ xác nhận | Chi nhánh nhận mở chi tiết, bấm Xác nhận; trạng thái Đã nhận, tồn kho nhận tăng, kho chuyển giảm |

## C. Quy trình liên phòng ban từ PDF

| ID | Nhóm | Test case | Điều kiện | Kết quả kỳ vọng |
| --- | --- | --- | --- | --- |
| QT-001 | POS Mini yêu cầu hàng | NV POS Mini lập phiếu yêu cầu mặt hàng | User NV POS Mini/BĐX | Phiếu yêu cầu mặt hàng được tạo với mục đích chuyển kho nội bộ |
| QT-002 | POS Mini phê duyệt yêu cầu | Giám đốc xã duyệt phiếu yêu cầu | Phiếu yêu cầu đang chờ duyệt | Phiếu chuyển trạng thái được duyệt |
| QT-003 | POS Mini đủ hàng | NV Tỉnh xử lý khi kho tỉnh đủ hàng | Phiếu được duyệt, tồn kho đủ | Tạo phiếu xuất kho từ kho tỉnh sang kho trung chuyển |
| QT-004 | POS Mini không đủ hàng | NV Tỉnh xử lý khi kho tỉnh không đủ hàng | Tồn kho không đủ | Điều hướng/kích hoạt quy trình mua hàng TCT-NCC trước khi xuất kho |
| QT-005 | POS Mini nhập kho POS | NV POS Mini nhận hàng | Hàng đã giao từ kho trung chuyển | Tạo phiếu nhập kho POS, liên kết với phiếu yêu cầu/xuất kho |
| QT-006 | POS Plus yêu cầu hàng | NV POS Plus lập yêu cầu | User POS Plus | Phiếu yêu cầu, phiếu xuất kho/nhập kho liên quan được ghi nhận theo quy trình |
| QT-007 | Mua hàng NCC | Lập kế hoạch mua hàng bổ sung | Có nhu cầu/tồn kho thực tế | Tạo/cập nhật đơn mua hàng NCC/PO |
| QT-008 | Nhận và nhập kho | Đối chiếu hàng thực nhận với phiếu giao nhận | Có hàng giao | Nếu khớp, hoàn thành chứng từ và nhập kho; nếu lệch/hỏng, ghi nhận chênh lệch và xử lý |
| QT-009 | Xuất kho theo phiếu lấy hàng | NV kho Hub tạo/lấy hàng xuất | Có yêu cầu xuất kho | Phiếu lấy hàng và phiếu xuất kho được kết xuất, số lượng xuất khớp phiếu |
| QT-010 | Bàn giao vận chuyển | Bàn giao hàng cho đơn vị vận chuyển | Có phiếu xuất kho | In/xác nhận biên bản bàn giao, cập nhật trạng thái giao hàng |
| QT-011 | Đối soát thanh quyết toán | Đối soát sản lượng và thanh toán | Có giao dịch với NCC/BĐT/TP | Số liệu đối soát, hóa đơn, thanh toán phải thu/phải trả được ghi nhận đúng |

## D. Ưu tiên automation đề xuất

| Mức | Phạm vi nên làm trước |
| --- | --- |
| P0 | Mở màn, phân quyền, validate form rỗng, tìm kiếm, xem danh sách/xem chi tiết cho NCC, Phiếu đề xuất, Đặt hàng NCC, Xuất nhập kho |
| P1 | CRUD dữ liệu test: Nhóm NCC, Danh mục NCC, NCC, Phiếu đề xuất nháp, Nhập kho/Xuất kho test, Kiểm kho, Chuyển kho |
| P2 | Luồng có trạng thái phức tạp: duyệt/từ chối, gộp/tách phiếu, ban hành/hủy bảng giá, công nợ/gạch nợ/thanh toán, nhập kho từ đặt hàng NCC |
| P3 | Quy trình liên phòng ban theo PDF, báo cáo xuất nhập tồn, cảnh báo tồn kho, đối soát thanh quyết toán |
