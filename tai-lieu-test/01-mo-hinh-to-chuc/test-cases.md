# Test case - Mô hình tổ chức

| ID | Nhóm | Test case | Kỳ vọng |
| --- | --- | --- | --- |
| FUNC_THUMUC__1 | Thêm mới đơn vị | Thêm mới đơn vị Tổng công ty với mã hợp lệ '00' | Đơn vị Tổng công ty được tạo thành công với mã '00', hiển thị ở cấp cao nhất trên cây phân cấp bên trái màn hình |
| FUNC_THUMUC__2 | Thêm mới đơn vị | Thêm mới đơn vị Bưu điện Tỉnh với mã hợp lệ trong khoảng 11-97 | Đơn vị Bưu điện Hà Nội (mã 24) được tạo thành công, hiển thị là đơn vị con của Tổng công ty trên cây phân cấp |
| FUNC_THUMUC__3 | Thêm mới đơn vị | Thêm mới đơn vị Bưu điện Xã với mã 4 số hợp lệ | Đơn vị Bưu điện Hoàn Kiếm (mã 2401) được tạo thành công, hiển thị là đơn vị con của Bưu điện Hà Nội |
| FUNC_THUMUC__4 | Thêm mới đơn vị | Thêm mới đơn vị Điểm bán với mã 6 số hợp lệ | Điểm bán Hàng Bài (mã 240101) được tạo thành công, hiển thị là đơn vị con của Bưu điện Hoàn Kiếm ở cấp thấp nhất |
| FUNC_THUMUC__5 | Thêm mới đơn vị | Bỏ trống Mã đơn vị (bắt buộc) khi thêm mới | Hệ thống hiển thị thông báo lỗi yêu cầu nhập Mã đơn vị (bắt buộc); không tạo được đơn vị mới |
| FUNC_THUMUC__6 | Thêm mới đơn vị | Bỏ trống Tên đơn vị (bắt buộc) khi thêm mới | Hệ thống hiển thị thông báo lỗi yêu cầu nhập Tên đơn vị (bắt buộc); không tạo được đơn vị mới |
| FUNC_THUMUC__7 | Thêm mới đơn vị | Nhập mã cấp Tỉnh ngoài khoảng quy định (11-97) | Hệ thống hiển thị thông báo lỗi mã đơn vị không hợp lệ với cấp Tỉnh (phải trong khoảng 11-97); không tạo được đơn vị |
| FUNC_THUMUC__8 | Thêm mới đơn vị | Nhập mã đơn vị bị trùng với mã đã tồn tại | Hệ thống hiển thị thông báo lỗi 'Mã đơn vị đã tồn tại'; không tạo được đơn vị mới, không cho phép trùng mã |
| FUNC_THUMUC__9 | Thêm mới đơn vị | Bỏ trống Đơn vị cha (bắt buộc) khi tạo đơn vị con | Hệ thống hiển thị thông báo lỗi yêu cầu chọn Đơn vị cha (bắt buộc, trừ cấp Tổng công ty); không tạo được đơn vị |
| FUNC_THUMUC__10 | Thêm mới đơn vị | Hủy thao tác thêm đơn vị giữa chừng | Form đóng lại, không có đơn vị mới nào được tạo, dữ liệu vừa nhập bị hủy bỏ |
| FUNC_THUMUC__11 | Thêm mới đơn vị (cách 2) | Thêm đơn vị con qua icon hover trên cây phân cấp - tự động fill Đơn vị cha | Form Thêm mới đơn vị hiển thị, trường 'Đơn vị cha' tự động điền sẵn, không cho phép chỉnh sửa hoặc hiển thị read-only |
| FUNC_THUMUC__12 | Thêm mới đơn vị (cách 2) | Tạo nhanh đơn vị cấp Xã với 2 trường thông tin (Mã + Tên) | Đơn vị con được tạo thành công, hiển thị đúng vị trí trên cây phân cấp |
| FUNC_THUMUC__13 | Thêm mới đơn vị (cách 2) | Bỏ trống Mã đơn vị khi thêm nhanh từ cây phân cấp | Hệ thống hiển thị thông báo lỗi yêu cầu nhập Mã đơn vị (bắt buộc); không tạo được đơn vị mới |
| FUNC_THUMUC__14 | Thêm mới đơn vị (cách 2) | Bỏ trống Tên đơn vị khi thêm nhanh từ cây phân cấp | Hệ thống hiển thị thông báo lỗi yêu cầu nhập Tên đơn vị (bắt buộc); không tạo được đơn vị mới |
| FUNC_THUMUC__15 | Thêm mới đơn vị (cách 2) | Nhập mã cấp Xã trùng với mã đã tồn tại trong cùng đơn vị cha | Hệ thống hiển thị thông báo lỗi 'Mã đơn vị đã tồn tại trong đơn vị cha này'; không tạo được đơn vị mới |
| FUNC_THUMUC__16 | Thêm mới đơn vị (cách 2) | Icon thêm mới không hiển thị khi không hover vào đơn vị | Icon button thêm mới không hiển thị trên bất kỳ đơn vị nào khi không có thao tác hover |
| FUNC_THUMUC__17 | Xem cây phân cấp | Xem cây phân cấp hiển thị đầy đủ 4 cấp sau khi thêm mới thành công | Cây phân cấp hiển thị đúng 4 cấp theo thứ tự: Tổng công ty > Bưu điện Tỉnh > Bưu điện Xã > Điểm bán |
| FUNC_THUMUC__18 | Xem cây phân cấp | Mở rộng (expand) và thu gọn (collapse) một nhánh cây phân cấp | Nhánh con hiển thị thụt lề khi expand và ẩn đi khi collapse |
| FUNC_THUMUC__19 | Xem cây phân cấp | Cây phân cấp hiển thị trạng thái rỗng khi chưa có đơn vị nào | Hiển thị thông báo/trạng thái rỗng phù hợp, không hiển thị lỗi giao diện |
| FUNC_THUMUC__20 | Xem cây phân cấp | Tìm kiếm đơn vị trên cây phân cấp theo tên | Cây phân cấp lọc/highlight đúng đơn vị và hiển thị đường dẫn cha của nó |
| FUNC_THUMUC__21 | Xem cây phân cấp | Tìm kiếm đơn vị với từ khóa không tồn tại | Hệ thống hiển thị thông báo 'Không tìm thấy đơn vị phù hợp'; cây phân cấp không hiển thị kết quả nào |
| FUNC_THUMUC__22 | Xem, chỉnh sửa, xóa | Xem chi tiết đơn vị hiển thị đầy đủ thông tin đã tạo | Màn chi tiết hiển thị đầy đủ và chính xác: Mã đơn vị, Tên đơn vị, Đơn vị cha; có nút 'Cập nhật' và icon 'Xóa' |
| FUNC_THUMUC__23 | Xem, chỉnh sửa, xóa | Chỉnh sửa Tên đơn vị thành công | Tên đơn vị được cập nhật thành tên mới trên cây phân cấp và màn chi tiết |
| FUNC_THUMUC__24 | Xem, chỉnh sửa, xóa | Chỉnh sửa Đơn vị cha - chuyển đơn vị sang nhánh khác | Đơn vị được chuyển sang làm con của đơn vị cha mới trên cây phân cấp |
| FUNC_THUMUC__25 | Xem, chỉnh sửa, xóa | Chỉnh sửa - bỏ trống Mã đơn vị (bắt buộc) | Hệ thống hiển thị lỗi yêu cầu nhập Mã đơn vị (bắt buộc); không lưu được thay đổi |
| FUNC_THUMUC__26 | Xem, chỉnh sửa, xóa | Chỉnh sửa - đổi Mã đơn vị thành mã đã tồn tại của đơn vị khác | Hệ thống hiển thị lỗi 'Mã đơn vị đã tồn tại'; không lưu được thay đổi |
| FUNC_THUMUC__27 | Xem, chỉnh sửa, xóa | Hủy chỉnh sửa - dữ liệu không bị thay đổi | Form đóng lại, dữ liệu cũ giữ nguyên, không lưu thay đổi |
| FUNC_THUMUC__28 | Xem, chỉnh sửa, xóa | Xóa Điểm bán (cấp 4) - chỉ xóa đúng điểm bán được chỉ định | Điểm bán bị xóa khỏi cây phân cấp; các đơn vị khác không bị ảnh hưởng |
| FUNC_THUMUC__29 | Xem, chỉnh sửa, xóa | Xóa cấp Xã - toàn bộ Điểm bán thuộc cấp Xã đó bị xóa theo | Cấp Xã và tất cả điểm bán con bị xóa khỏi cây phân cấp; các nhánh khác không bị ảnh hưởng |
| FUNC_THUMUC__30 | Xem, chỉnh sửa, xóa | Xóa cấp Tỉnh - toàn bộ Xã/Điểm bán thuộc Tỉnh đó bị xóa theo | Cấp Tỉnh cùng tất cả Xã và Điểm bán con bị xóa hoàn toàn |
| FUNC_THUMUC__31 | Xem, chỉnh sửa, xóa | Xóa cấp Tổng công ty - toàn bộ cây phân cấp bị xóa theo | Toàn bộ cây phân cấp bị xóa hoàn toàn khỏi hệ thống; cây phân cấp trở về trạng thái rỗng |
| FUNC_THUMUC__32 | Xem, chỉnh sửa, xóa | Hủy xóa đơn vị tại popup confirm | Đơn vị không bị xóa, vẫn hiển thị nguyên vẹn trên cây phân cấp; popup đóng lại |
| FUNC_THUMUC__33 | Xem, chỉnh sửa, xóa | Nội dung popup confirm xóa hiển thị đúng văn bản theo SRS | Popup hiển thị đúng nội dung: 'Hành động này sẽ không thể hoàn tác, bạn có chắc chắn muốn xóa?' với 2 nút 'Đồng ý' và 'Hủy' |
| FUNC_THUMUC__34 | Nhập, xuất excel | Tải về file mẫu nhập đơn vị tổ chức thành công | File mẫu Excel được tải về máy thành công, đúng định dạng với các cột |
| FUNC_THUMUC__35 | Nhập, xuất excel | Upload file Excel hợp lệ - tạo hàng loạt đơn vị thành công | Tất cả đơn vị trong file được tạo thành công, hiển thị đúng quan hệ cha-con trên cây phân cấp |
| FUNC_THUMUC__36 | Nhập, xuất excel | Upload file sai định dạng (không phải .xlsx/.xls) | Hệ thống hiển thị thông báo lỗi định dạng file không hợp lệ; không thực hiện import |
| FUNC_THUMUC__37 | Nhập, xuất excel | Upload file Excel có dòng dữ liệu mã đơn vị bị trùng | Hệ thống từ chối dòng dữ liệu bị trùng mã và hiển thị thông báo lỗi phù hợp |
| FUNC_THUMUC__38 | Nhập, xuất excel | Upload file Excel với Đơn vị cha không tồn tại trong hệ thống/file | Hệ thống hiển thị lỗi rõ ràng cho dòng dữ liệu có Đơn vị cha không hợp lệ |
| FUNC_THUMUC__39 | Nhập, xuất excel | Upload file Excel rỗng (chỉ có header, không có dữ liệu) | Hệ thống hiển thị thông báo 'File không có dữ liệu để nhập'; không tạo đơn vị nào |
| FUNC_THUMUC__40 | Nhập, xuất excel | Xuất file Excel danh sách toàn bộ đơn vị tổ chức | File Excel được tải về, chứa đầy đủ và chính xác toàn bộ đơn vị hiện có |
| FUNC_THUMUC__41 | Nhập, xuất excel | Xuất Excel khi hệ thống chưa có đơn vị nào | File Excel được tải về chỉ chứa dòng tiêu đề (header), không có dữ liệu |
| FUNC_THUMUC__42 | Điểm bán / Hub | Tạo Điểm bán phân loại 'Pos mini' với đầy đủ trường bắt buộc | Điểm bán được tạo thành công dưới cấp Xã đã chọn, hiển thị trên cây phân cấp và danh sách |
| FUNC_THUMUC__43 | Điểm bán / Hub | Tạo Điểm bán phân loại 'Pos plus' thuộc Tổng công ty | Điểm bán phân loại 'Pos plus' được tạo thành công và hiển thị đúng trong Danh sách điểm bán |
| FUNC_THUMUC__44 | Điểm bán / Hub | Tạo điểm bán phân loại 'Hub' và đánh dấu 'Là cửa hàng mẫu' | Điểm bán phân loại 'Hub' được tạo thành công với cờ 'Là cửa hàng mẫu' = true |
| FUNC_THUMUC__45 | Điểm bán / Hub | Bỏ trống Tên điểm bán (bắt buộc) khi tạo điểm bán | Hệ thống hiển thị lỗi yêu cầu nhập Tên điểm bán (bắt buộc); không tạo được điểm bán mới |
| FUNC_THUMUC__46 | Điểm bán / Hub | Bỏ trống Bưu điện tỉnh/thành phố hoặc Bưu điện xã/phường (bắt buộc) | Hệ thống hiển thị lỗi yêu cầu chọn Bưu điện tỉnh/thành phố và Bưu điện xã/phường |
| FUNC_THUMUC__47 | Điểm bán / Hub | Bỏ trống Tỉnh/thành phố hoặc Xã/phường (địa chỉ hành chính, bắt buộc) | Hệ thống hiển thị lỗi yêu cầu chọn Tỉnh/thành phố và Xã/phường (bắt buộc) |
| FUNC_THUMUC__48 | Điểm bán / Hub | Tạo điểm bán không nhập Địa chỉ chi tiết (trường không bắt buộc) | Điểm bán được tạo thành công dù không có Địa chỉ chi tiết (đây là trường tùy chọn) |
| FUNC_THUMUC__49 | Điểm bán / Hub | Xem danh sách Điểm bán/hub từ màn chi tiết đơn vị | Màn hình chuyển sang module Quản lý điểm bán/hub hiển thị đúng danh sách các điểm bán thuộc đơn vị |
| FUNC_THUMUC__50 | Điểm bán / Hub | Xem chi tiết điểm bán và thực hiện chỉnh sửa thông tin | Màn chi tiết hiển thị đầy đủ thông tin; sau chỉnh sửa tên mới được lưu và cập nhật |
| FUNC_THUMUC__51 | Điểm bán / Hub | Xóa điểm bán/hub từ màn chi tiết | Điểm bán bị xóa khỏi Danh sách điểm bán/hub và khỏi cây phân cấp Mô hình tổ chức |
| FUNC_THUMUC__52 | Điểm bán / Hub | Tạo điểm bán khi danh mục Cửa hàng mẫu đang rỗng | Dropdown 'Cửa hàng mẫu' hiển thị rỗng; hệ thống không cho xác nhận tạo điểm bán |
| FUNC_THUMUC__53 | Gán nhân viên | Mở popup 'Gán nhân viên' từ màn chi tiết đơn vị | Popup 'Gán nhân viên' mở ra với danh sách nhân viên đã gán và các nút thao tác |
| FUNC_THUMUC__54 | Gán nhân viên | Gán mới 1 nhân viên với vai trò 'Giám đốc xã' cho đơn vị cấp Xã | Hệ thống lưu thành công; nhân viên được gán vai trò 'Giám đốc xã' với trạng thái 'Đang làm' |
| FUNC_THUMUC__55 | Gán nhân viên | Gán cùng 1 nhân viên cho nhiều đơn vị/vai trò khác nhau trong cùng 1 lần lưu | Cả 2 bản ghi được lưu thành công; giữ đồng thời 2 vai trò ở 2 đơn vị khác nhau |
| FUNC_THUMUC__56 | Gán nhân viên | Gán nhân viên có trạng thái 'Đã nghỉ' vẫn hiển thị trong danh sách (đọc lịch sử) | Dòng nhân viên vẫn hiển thị trong danh sách với trạng thái 'Đã nghỉ' |
| FUNC_THUMUC__57 | Gán nhân viên | Đổi trạng thái nhân viên từ 'Đang làm' sang 'Đã nghỉ' | Trạng thái nhân viên được cập nhật thành 'Đã nghỉ'; thay đổi được lưu và hiển thị đúng |
| FUNC_THUMUC__58 | Gán nhân viên | Xóa một dòng gán nhân viên bằng nút (x) | Dòng bị xóa khỏi danh sách; bản ghi gán nhân viên bị gỡ bỏ khỏi hệ thống |
| FUNC_THUMUC__59 | Gán nhân viên | Click '+ Thêm nhân viên & vai trò' nhiều lần liên tiếp | Mỗi lần click thêm đúng 1 dòng mới trống, không bị lỗi giao diện |
| FUNC_THUMUC__60 | Gán nhân viên | Click 'Xác nhận' khi dòng mới chưa chọn Nhân viên (bắt buộc) | Hệ thống hiển thị lỗi yêu cầu chọn Nhân viên cho dòng đang trống; không lưu thay đổi |
| FUNC_THUMUC__61 | Gán nhân viên | Click 'Xác nhận' khi dòng mới chưa chọn Vai trò (bắt buộc) | Hệ thống hiển thị lỗi yêu cầu chọn Vai trò (bắt buộc); không lưu được thay đổi |
| FUNC_THUMUC__62 | Gán nhân viên | Gán trùng cùng 1 nhân viên với cùng 1 vai trò tại cùng 1 đơn vị (đã tồn tại) | Hệ thống hiển thị cảnh báo/lỗi 'Nhân viên đã được gán vai trò này tại đơn vị đã chọn' |
| FUNC_THUMUC__63 | Gán nhân viên | Hủy thao tác Gán nhân viên - dữ liệu không bị thay đổi | Popup đóng lại; không có thay đổi nào được lưu |
| FUNC_THUMUC__64 | Gán nhân viên | Tìm kiếm/lọc nhân viên trong dropdown 'Nhân viên' theo tên hoặc SĐT | Dropdown lọc và hiển thị đúng kết quả tìm kiếm |
| FUNC_THUMUC__65 | Gán nhân viên | Đổi Đơn vị của một dòng gán đã tồn tại sang đơn vị khác | Khi đổi Đơn vị, dropdown Vai trò reset hoặc chỉ hiển thị vai trò phù hợp với đơn vị mới |
| FUNC_THUMUC__66 | Gán nhân viên | Số lượng nhân viên gán hiển thị đồng bộ trên cây phân cấp sau khi gán mới | Sau khi gán thành công, badge số nhân viên trên cây phân cấp tăng lên, phản ánh đúng thực tế |
| FUNC_THUMUC__67 | Gán nhân viên | Gán nhân viên cho đơn vị không có quyền (nhân viên thường thao tác) | Nút 'Gán nhân viên' không hiển thị hoặc bị disabled; cố truy cập API sẽ trả về lỗi 403 |
