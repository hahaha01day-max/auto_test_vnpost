# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 19 — Quản lý khách hàng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 19_quan_ly_khach_hang`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `19_quan_ly_khach_hang`
- Tài liệu gốc liên quan: [`uat_vnpost_khach_hang.csv`](../test-case-goc/uat_vnpost_khach_hang.csv) · [`uat_vnpost_realtime.csv`](../test-case-goc/uat_vnpost_realtime.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **46** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **46** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 70 |
| — **tài liệu gốc KHÔNG có** | 27 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 27 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `19_010_001` | Tìm khách tự lọc khi ngừng gõ và quay về trang đầu | HDSD 010 |
| `19_010_002` | Bốn ô lọc chỉ hiện với cấp trên điểm bán | HDSD 010 |
| `19_010_003` | Tuỳ chỉnh cột hiển thị bật được cột đang tắt | HDSD 010 |
| `19_020_002` | Sinh mã khách hàng ngẫu nhiên | HDSD 020 |
| `19_040_002` | Trường chưa khai hiển thị dấu hiệu rõ ràng | HDSD 040 |
| `19_050_001` | Ngừng hoạt động khách hàng | HDSD 050 |
| `19_050_002` | Kích hoạt lại khách đã ngừng | HDSD 050 |
| `19_060_002` | Đơn trả một phần vẫn hiện Chưa thanh toán | HDSD 060 |
| `19_070_001` | Ô Phân loại chỉ chọn được sau khi chọn Hình thức | HDSD 070 |
| `19_070_002` | Điểm còn lại đọc ở dòng gần nhất không phải cộng gộp | HDSD 070 |
| `19_080_002` | Cột Loại chỉ có Sản phẩm hoặc Combo | HDSD 080 |
| `19_100_001` | Nhập khách hàng từ Excel chạy nền và báo kết quả | HDSD 100 |
| `19_100_002` | Tải được file lỗi của lần nhập có dòng sai | HDSD 100 |
| `19_110_001` | Xuất Excel theo bộ lọc hiện tại | HDSD 110 |
| `19_110_002` | Chặn xuất khi chưa chọn điểm bán | HDSD 110 |
| `19_110_003` | Tệp xuất chỉ lưu trong 7 ngày | HDSD 110 |
| `19_PQ_001` | Giao dịch viên chỉ thấy khách trong phạm vi điểm bán | HDSD |
| `19_020_011` | Số điện thoại toàn khoảng trắng | Kỹ thuật 3.4 #2 — khoảng trắng |
| `19_020_012` | Tên khách hàng có khoảng trắng đầu cuối | Kỹ thuật 3.4 #2 — trim |
| `19_090_006` | Thanh toán công nợ với số tiền bằng 0 | Code FE pages/customer/customerDebt + kỹ thuật 3.4 #3 |
| `19_120_001` | Phân trang danh sách khách hàng | Kỹ thuật 3.4 #7 — phân trang |
| `19_120_002` | Tìm khách bằng ký tự đặc biệt | Kỹ thuật 3.4 #8 — ký tự đặc biệt |
| `19_120_003` | Tìm khách không dấu ra khách có dấu | Kỹ thuật 3.4 #8 — không dấu |
| `19_120_004` | Tìm khách bằng chuỗi toàn khoảng trắng | Kỹ thuật 3.4 #2 — khoảng trắng |
| `19_120_005` | Tổ hợp nhiều bộ lọc khách hàng | Kỹ thuật 3.4 #7 — tổ hợp bộ lọc |
| `19_120_006` | Tải ảnh vượt giới hạn dung lượng | Code FE pages/customer + kỹ thuật 3.4 #3 |
| `19_120_007` | Tải tệp sai định dạng vào ô ảnh | Code FE pages/customer + kỹ thuật 3.4 #4 |

## 5. Bảng đối chiếu đầy đủ 46 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `FUNC_KHACHHANG__1` | Thêm mới khách hàng thành công với 2 trường bắt buộc (Tên + SĐT) | `19_020_001` |
| `FUNC_KHACHHANG__2` | Thêm khách hàng với đầy đủ Thông tin cơ bản, Thông tin xuất hóa đơn và Địa chỉ liên hệ | `19_020_001` |
| `FUNC_KHACHHANG__3` | Tạo khách hàng tại cấp Tổng công ty - áp dụng đồng bộ xuống tất cả điểm bán | `19_020_004` |
| `FUNC_KHACHHANG__4` | Tạo khách hàng tại cửa hàng - đồng bộ đẩy lên danh sách khách hàng cấp TCT và các cửa hàng khác | `19_020_005` |
| `FUNC_KHACHHANG__5` | Hủy thao tác thêm khách hàng giữa chừng - không tạo bản ghi mới | `19_020_006` |
| `FUNC_KHACHHANG__6` | Bỏ trống Tên khách hàng (bắt buộc) khi thêm mới | `19_020_007` |
| `FUNC_KHACHHANG__7` | Bỏ trống Số điện thoại (bắt buộc) khi thêm mới | `19_020_008` |
| `FUNC_KHACHHANG__8` | Thêm khách hàng với Số điện thoại đã tồn tại trong hệ thống | `19_020_003` |
| `FUNC_KHACHHANG__9` | Thêm khách hàng với Số điện thoại sai định dạng | `19_020_009` |
| `FUNC_KHACHHANG__10` | Thêm khách hàng với Email sai định dạng | `19_020_010` |
| `FUNC_KHACHHANG__11` | Xem danh sách khách hàng hiển thị đúng sau khi thêm mới thành công | `19_010_004` |
| `FUNC_KHACHHANG__12` | Xem danh sách khách hàng khi hệ thống chưa có khách hàng nào | `19_010_005` |
| `FUNC_KHACHHANG__13` | Danh sách khách hàng đồng bộ hiển thị khách hàng được tạo từ cửa hàng khác | `19_010_006` |
| `FUNC_KHACHHANG__14` | Click vào Tên khách hàng trong danh sách để chuyển sang màn chi tiết | `19_010_007` |
| `FUNC_KHACHHANG__15` | Xem chi tiết khách hàng - Tab 1 Thông tin cá nhân hiển thị đầy đủ | `19_040_001` |
| `FUNC_KHACHHANG__16` | Xem chi tiết khách hàng - Tab 2 Đơn hàng hiển thị danh sách đơn đã mua | `19_060_001` |
| `FUNC_KHACHHANG__17` | Xem Tab 2 Đơn hàng khi khách hàng chưa có đơn hàng nào | `19_060_003` |
| `FUNC_KHACHHANG__18` | Xem chi tiết khách hàng - Tab 3 Sản phẩm đã mua hiển thị đúng dữ liệu | `19_080_001` |
| `FUNC_KHACHHANG__19` | Tab 4 Công nợ khách hàng - thực hiện 'Thanh toán' 1 đơn hàng còn nợ | `19_090_001` |
| `FUNC_KHACHHANG__20` | Tab 4 Công nợ - thực hiện 'Thanh toán' hàng loạt nhiều đơn hàng còn nợ | `19_090_001` |
| `FUNC_KHACHHANG__21` | Tab 4 Công nợ - thực hiện 'Gạch nợ' không tạo phiếu thu hồi nợ | `19_090_002` |
| `FUNC_KHACHHANG__22` | Tab 4 Công nợ - thực hiện 'Ghi nợ' thủ công cho khách hàng | `19_090_003` |
| `FUNC_KHACHHANG__23` | Tab 4 Công nợ - click 'Thanh toán' khi không chọn đơn hàng nào | `19_090_004` |
| `FUNC_KHACHHANG__24` | Tab 4 Công nợ - 'Ghi nợ' với số tiền không hợp lệ (âm hoặc bằng 0) | `19_090_005` |
| `FUNC_KHACHHANG__25` | Truy cập trực tiếp link chi tiết của khách hàng đã bị xóa | `19_010_008` |
| `FUNC_KHACHHANG__26` | Chỉnh sửa thông tin cơ bản (Tên, Email) của khách hàng thành công | `19_030_001` |
| `FUNC_KHACHHANG__27` | Chỉnh sửa Thông tin xuất hóa đơn và Địa chỉ liên hệ thành công | `19_030_001` |
| `FUNC_KHACHHANG__28` | Hủy chỉnh sửa khách hàng - dữ liệu không bị thay đổi | `19_030_003` |
| `FUNC_KHACHHANG__29` | Chỉnh sửa - bỏ trống Tên khách hàng (bắt buộc) | `19_030_004` |
| `FUNC_KHACHHANG__30` | Chỉnh sửa - bỏ trống Số điện thoại (bắt buộc) | `19_030_005` |
| `FUNC_KHACHHANG__31` | Chỉnh sửa - đổi Số điện thoại thành SĐT đã tồn tại của khách hàng khác | `19_030_002` |
| `FUNC_KHACHHANG__32` | Chỉnh sửa - nhập Email sai định dạng | `19_030_006` |
| `FUNC_KHACHHANG__33` | Xóa khách hàng thành công - xác nhận 'Đồng ý' tại popup | `19_050_004` |
| `FUNC_KHACHHANG__34` | Hủy xóa khách hàng - chọn 'Hủy' tại popup confirm | `19_050_006` |
| `FUNC_KHACHHANG__35` | Nội dung popup confirm xóa hiển thị đúng văn bản theo SRS | `19_050_007` |
| `FUNC_KHACHHANG__36` | Xóa khách hàng đang có đơn hàng/công nợ chưa thanh toán | `19_050_003` |
| `FUNC_KHACHHANG__37` | Xóa khách hàng khi user không có quyền 'xóa' | `19_050_005` |
| `FUNC_KHACHHANG__38` | Xóa khách hàng được tạo từ chuỗi (TCT) - kiểm tra đồng bộ xóa toàn Tổng công ty | `19_050_008` |
| `REALTIME__1` | Kiểm tra tạo điều kiện theo nhóm khách hàng thành công | `19_130_001` |
| `REALTIME__2` | Kiểm tra thêm mới CTKM theo nhóm đối tượng - cập nhật realtime trên toàn bộ giá trị đơn hàng | `19_130_002` |
| `REALTIME__3` | Kiểm tra nâng hạng realtime khi thanh toán - tiền mặt (toàn bộ) | `19_130_003` |
| `REALTIME__4` | Kiểm tra nâng hạng realtime khi thanh toán sau (thanh toán nợ đơn hàng) | `19_130_004` |
| `REALTIME__5` | Kiểm tra nâng hạng realtime khi đơn hàng lưu nháp | `19_130_005` |
| `REALTIME__6` | Kiểm tra nâng hạng realtime khi đơn hàng thanh toán trả góp | `19_130_006` |
| `dong22` | Kiểm tra nâng hạng realtime khi đơn hàng thanh toán hết bằng chuyển khoản | `19_130_007` |
| `dong23` | Kiểm tra nâng hạng realtime khi đơn hàng thanh toán bằng QR | `19_130_008` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_(Viết vào đây. Phần từ dòng `<!-- NHAN-XET-TAY -->` trở xuống KHÔNG bị ghi đè khi sinh lại.)_
