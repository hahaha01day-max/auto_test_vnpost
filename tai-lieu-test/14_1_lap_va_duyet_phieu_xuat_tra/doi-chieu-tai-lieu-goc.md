# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 14_1 — Lập và duyệt phiếu xuất trả nhà cung cấp

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 14_1_lap_va_duyet_phieu_xuat_tra`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `14_1_lap_va_duyet_phieu_xuat_tra`
- Tài liệu gốc liên quan: [`uat_vnpost_nha_cung_cap.csv`](../test-case-goc/uat_vnpost_nha_cung_cap.csv) · [`uat_vnpost_quan_ly_kho.csv`](../test-case-goc/uat_vnpost_quan_ly_kho.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **26** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **26** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 144 |
| — **tài liệu gốc KHÔNG có** | 118 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 118 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `14_1_010_001` | Màn Tạo phiếu xuất trả mở đủ trường bắt buộc | HDSD 010 |
| `14_1_010_002` | Nguồn hàng mặc định là Theo phiếu nhập kho | HDSD 010 |
| `14_1_010_003` | Đổi nguồn sang Theo SKU / Mã lô / Serial thì đổi bộ ô nhập | HDSD 010 |
| `14_1_010_004` | Tra mã phiếu nhập hợp lệ nạp đủ sản phẩm và lô còn tồn | HDSD 010 + trace StockReturnRequestFormPage.jsx:1282-1514 |
| `14_1_010_005` | Tra mã phiếu nhập không tồn tại bị chặn | Kỹ thuật 4 - kiểu dữ liệu sai |
| `14_1_010_006` | Tra mã phiếu nhập toàn khoảng trắng không gọi API | Kỹ thuật 2 - khoảng trắng |
| `14_1_010_007` | Tra mã phiếu nhập viết thường vẫn tìm được | Kỹ thuật 8 - tìm kiếm |
| `14_1_010_008` | Tra mã lô còn tồn thêm được sản phẩm của lô | HDSD 010 |
| `14_1_010_009` | Tra mã lô không còn tồn bị chặn | Kỹ thuật 4 - kiểu dữ liệu sai |
| `14_1_010_010` | Bấm Tìm khi ô mã lô rỗng bị chặn | Kỹ thuật 1 - ô bắt buộc |
| `14_1_010_011` | Tra lại lô đã có trong danh sách không nhân đôi dòng | Kỹ thuật 5 - tính duy nhất |
| `14_1_010_012` | Quét serial hợp lệ thêm đúng 1 đơn vị | HDSD 010 |
| `14_1_010_013` | Quét serial không tồn tại bị chặn | Kỹ thuật 4 - kiểu dữ liệu sai |
| `14_1_010_014` | Bấm Tìm khi ô serial rỗng bị chặn | Kỹ thuật 1 - ô bắt buộc |
| `14_1_010_015` | Quét lại serial đã có trong danh sách | Kỹ thuật 5 - tính duy nhất |
| `14_1_010_016` | Bỏ trống Lý do trả hàng bị chặn khi tạo phiếu | Kỹ thuật 1 - ô bắt buộc |
| `14_1_010_017` | Chọn Lý do khác mà bỏ trống Nội dung lý do bị chặn | Kỹ thuật 1 - ô bắt buộc |
| `14_1_010_018` | Nội dung lý do toàn khoảng trắng bị coi là bỏ trống | Kỹ thuật 2 - khoảng trắng |
| `14_1_010_019` | Tạo phiếu khi chưa nhập SL trả cho dòng nào bị chặn | Kỹ thuật 1 - ô bắt buộc |
| `14_1_010_020` | Tạo phiếu nguồn phiếu nhập mà chưa tra mã hợp lệ bị chặn | Kỹ thuật 4 - kiểu dữ liệu sai |
| `14_1_010_021` | Còn dòng chưa nhập SL thì hỏi lại trước khi tạo phiếu | Kỹ thuật 9 - huỷ giữa chừng |
| `14_1_010_022` | SL trả vượt SL khả dụng bị chặn | Kỹ thuật 3 - giá trị biên |
| `14_1_010_023` | SL trả bằng đúng SL khả dụng được chấp nhận | Kỹ thuật 3 - giá trị biên |
| `14_1_010_024` | SL trả âm không nhập được | Kỹ thuật 3 - giá trị biên |
| `14_1_010_025` | SL trả thập phân theo đơn vị quy đổi | Kỹ thuật 3 - giá trị biên |
| `14_1_010_026` | Hàng serial thiếu serial so với SL trả bị chặn | Kỹ thuật 3 - giá trị biên |
| `14_1_010_027` | Hàng serial thừa serial so với SL trả bị chặn | Kỹ thuật 3 - giá trị biên |
| `14_1_010_028` | Hàng nhiều lô mà không nhập SL cho lô nào bị chặn | Kỹ thuật 1 - ô bắt buộc |
| `14_1_010_029` | SL trả của một lô vượt tồn của chính lô đó bị chặn | Kỹ thuật 3 - giá trị biên |
| `14_1_010_030` | Hàng có lô mà không chọn lô bị chặn | Kỹ thuật 1 - ô bắt buộc |
| `14_1_010_036` | Hàng quá thời hạn trả theo hợp đồng bị chặn lúc nộp phiếu | HDSD 010 + ReturnRequestService.java:255 |
| `14_1_010_037` | Lưu nháp bỏ qua mọi phép kiểm tồn và lý do | HDSD 010 |
| `14_1_010_038` | Tạo phiếu chờ duyệt thành công | HDSD 010 |
| `14_1_010_039` | Rời màn tạo phiếu không lưu lại gì | Kỹ thuật 9 - huỷ giữa chừng |
| `14_1_010_040` | Xung đột lô và serial hỏi lại bằng ba lựa chọn | HDSD 010 - mẹo |
| `14_1_010_041` | Lập phiếu chưa khoá tồn hàng vẫn bán được | HDSD 010 - lưu ý |
| `14_1_010_042` | Không có ô nhập giá trên màn tạo phiếu | HDSD 010 - lưu ý |
| `14_1_010_043` | Vai cấp trên điểm bán không thấy nút Tạo phiếu trả | Kỹ thuật 10 - phạm vi theo vai |
| `14_1_010_044` | Vai cấp xã không thấy nút Tạo phiếu trả | Kỹ thuật 10 - phạm vi theo vai |
| `14_1_020_001` | Menu Xử lý của phiếu Nháp có đủ ba việc | HDSD 020 |
| `14_1_020_002` | Màn sửa phiếu nháp mở sẵn nguồn SKU và nút Nộp phiếu | HDSD 020 |
| `14_1_020_003` | Lưu sửa thay toàn bộ danh sách hàng chứ không cộng thêm | HDSD 020 + trace StockReturnRequestFormPage.jsx:1272 |
| `14_1_020_004` | Sửa phiếu Chờ duyệt bị kiểm lại tồn kho | HDSD 020 - lưu ý |
| `14_1_020_005` | Nộp phiếu Nháp chưa có sản phẩm bị chặn | HDSD 020 - lưu ý |
| `14_1_020_006` | Nộp phiếu Nháp từ menu chuyển sang Chờ duyệt | HDSD 020 + trace StockReturnRequestListPage.jsx:240-254 |
| `14_1_020_007` | Nộp lại phiếu đã ở Chờ duyệt không tạo phiếu trùng | Kỹ thuật 6 - trạng thái x hành động |
| `14_1_020_008` | Không sửa được phiếu đã duyệt | Kỹ thuật 6 - trạng thái x hành động |
| `14_1_020_009` | Không sửa được phiếu của điểm bán khác | Kỹ thuật 10 - phạm vi theo vai |
| `14_1_020_010` | Không nộp được phiếu nháp của điểm bán khác | Kỹ thuật 10 - phạm vi theo vai |
| `14_1_020_011` | Rời màn sửa không lưu thay đổi | Kỹ thuật 9 - huỷ giữa chừng |
| `14_1_020_012` | Ma trận trạng thái phiếu và việc Sửa | Kỹ thuật 6 - trạng thái x hành động |
| `14_1_030_001` | Mở danh sách Xuất trả NCC khi có dữ liệu | HDSD 030 |
| `14_1_030_002` | Danh sách hiện đủ 9 cột | HDSD 030 |
| `14_1_030_003` | Lọc theo Trạng thái trả đúng tập phiếu | Kỹ thuật 7 - danh sách |
| `14_1_030_004` | Tìm theo mã phiếu khớp chính xác | Kỹ thuật 8 - tìm kiếm |
| `14_1_030_005` | Tìm theo một phần mã phiếu | Kỹ thuật 8 - tìm kiếm |
| `14_1_030_006` | Tìm mã phiếu không tồn tại ra danh sách rỗng | Kỹ thuật 8 - tìm kiếm |
| `14_1_030_007` | Tìm bằng chuỗi toàn khoảng trắng | Kỹ thuật 2 - khoảng trắng |
| `14_1_030_008` | Tìm bằng ký tự đặc biệt không gây lỗi | Kỹ thuật 8 - tìm kiếm |
| `14_1_030_009` | Tìm không phân biệt hoa thường | Kỹ thuật 8 - tìm kiếm |
| `14_1_030_010` | Lọc theo khoảng ngày tạo | Kỹ thuật 7 - danh sách |
| `14_1_030_011` | Chọn Từ ngày lớn hơn Đến ngày | Kỹ thuật 4 - kiểu dữ liệu sai |
| `14_1_030_012` | Tổ hợp ba bộ lọc cùng lúc | Kỹ thuật 7 - danh sách |
| `14_1_030_013` | Xoá lọc trả về danh sách đầy đủ | Kỹ thuật 7 - danh sách |
| `14_1_030_014` | Phân trang hoạt động đúng | Kỹ thuật 7 - danh sách |
| `14_1_030_015` | Danh sách sắp theo ngày tạo mới nhất trước | HDSD 030 |
| `14_1_030_017` | Bảng Danh sách sản phẩm tính đúng cột Còn lại | HDSD 030 + trace ReturnRequestDetailDrawer.jsx:94-128 |
| `14_1_030_018` | Xem lịch sử xử lý phiếu | HDSD 030 |
| `14_1_030_019` | Mốc Chờ nhập kho về tỉnh không nằm trên trục thời gian | HDSD 030 - lưu ý |
| `14_1_030_020` | Phiếu Đã xử lý xong mà đợt trả chờ NCC xác nhận thì vòng đời dừng | HDSD 030 - lưu ý |
| `14_1_030_021` | Điểm bán chỉ thấy phiếu của chính mình | Kỹ thuật 10 - phạm vi theo vai |
| `14_1_030_022` | Cấp tỉnh thấy phiếu của mọi điểm bán trong tỉnh | Kỹ thuật 10 - phạm vi theo vai |
| `14_1_030_023` | Cấp xã không thấy phiếu của xã khác | Kỹ thuật 10 - phạm vi theo vai |
| `14_1_030_024` | Phiếu con ở TCT có vòng đời rút gọn bốn mốc | statusConfig.js - rrIsTctChild |
| `14_1_030_025` | Phiếu bị từ chối dừng ở mốc duyệt đang dở | statusConfig.js - rrLifecycle |
| `14_1_040_001` | Cấp xã duyệt phiếu Chờ duyệt | HDSD 040 |
| `14_1_040_002` | Cấp tỉnh duyệt phiếu Xã đã duyệt | HDSD 040 |
| `14_1_040_003` | Cấp tỉnh duyệt thẳng phiếu Chờ duyệt khi điểm bán không thuộc xã | HDSD 040 |
| `14_1_040_004` | Cấp tỉnh không duyệt được phiếu Chờ duyệt khi có cấp xã | Kỹ thuật 6 - trạng thái x hành động |
| `14_1_040_005` | Cấp xã không duyệt được phiếu ngoài trạng thái Chờ duyệt | Kỹ thuật 6 - trạng thái x hành động |
| `14_1_040_006` | Vai điểm bán không duyệt được phiếu | Kỹ thuật 10 - phạm vi theo vai |
| `14_1_040_007` | Cấp xã không duyệt được phiếu của xã khác | Kỹ thuật 10 - phạm vi theo vai |
| `14_1_040_008` | Cấp tỉnh không duyệt được phiếu của tỉnh khác | Kỹ thuật 10 - phạm vi theo vai |
| `14_1_040_009` | Tỉnh không duyệt được phiếu đã chuyển Tổng công ty | Kỹ thuật 6 - trạng thái x hành động |
| `14_1_040_010` | TCT không duyệt được phiếu hàng cấp tỉnh | Kỹ thuật 6 - trạng thái x hành động |
| `14_1_040_011` | SL duyệt điền sẵn bằng SL đề nghị | HDSD 040 |
| `14_1_040_012` | Hạ SL duyệt thì phần cắt hoàn về kho điểm bán | HDSD 040 |
| `14_1_040_013` | SL duyệt lớn hơn SL đề nghị bị chặn | Kỹ thuật 3 - giá trị biên |
| `14_1_040_014` | SL duyệt âm bị chặn | Kỹ thuật 3 - giá trị biên |
| `14_1_040_015` | SL duyệt bằng 0 thì hoàn trọn dòng về kho | Kỹ thuật 3 - giá trị biên |
| `14_1_040_016` | SL duyệt bằng đúng SL đề nghị được chấp nhận | Kỹ thuật 3 - giá trị biên |
| `14_1_040_017` | Bỏ bớt serial duyệt thì SL duyệt tự giảm theo | HDSD 040 - mẹo |
| `14_1_040_018` | Chọn Nhập về kho tỉnh ngay mà bỏ trống Kho nhận bị chặn | Kỹ thuật 1 - ô bắt buộc |
| `14_1_040_019` | Chọn Tạm treo nhập kho sau thì hàng chưa vào kho nào | HDSD 040 - lưu ý |
| `14_1_040_020` | Ô chọn cách nhập kho chỉ hiện ở bước tỉnh duyệt | HDSD 040 |
| `14_1_040_021` | Ghi chú khi duyệt là tuỳ chọn | HDSD 040 |
| `14_1_040_022` | Từ chối mà bỏ trống lý do bị chặn | Kỹ thuật 1 - ô bắt buộc |
| `14_1_040_023` | Lý do từ chối toàn khoảng trắng bị coi là bỏ trống | Kỹ thuật 2 - khoảng trắng |
| `14_1_040_024` | Tỉnh duyệt là lúc hàng bị khoá tồn | HDSD 040 - lưu ý |
| `14_1_040_025` | Đóng màn duyệt giữa chừng không ghi gì | Kỹ thuật 9 - huỷ giữa chừng |
| `14_1_040_026` | Ma trận trạng thái phiếu và việc Duyệt | Kỹ thuật 6 - trạng thái x hành động |
| `14_1_050_001` | Điểm bán huỷ phiếu của chính mình | HDSD 050 |
| `14_1_050_002` | Nhãn mục cuối menu đổi theo cấp người đăng nhập | HDSD 050 - lưu ý |
| `14_1_050_003` | Từ chối phiếu Đã duyệt hoàn hàng về kho điểm bán | HDSD 050 - lưu ý |
| `14_1_050_004` | Không huỷ được phiếu đã gom, đã tách hoặc đã xử lý | Kỹ thuật 6 - trạng thái x hành động |
| `14_1_050_005` | Phiếu đã huỷ chỉ còn nút Chi tiết | HDSD 050 |
| `14_1_050_006` | Lý do từ chối hiện lại trên màn chi tiết | HDSD 040 - lưu ý |
| `14_1_050_007` | Đóng hộp xác nhận từ chối không đổi gì | Kỹ thuật 9 - huỷ giữa chừng |
| `14_1_060_021` | Bấm Tìm PO khi chưa chọn nhà cung cấp bị chặn | Kỹ thuật 1 - ô bắt buộc |
| `14_1_060_022` | Tra mã PO không tồn tại bị chặn | Kỹ thuật 4 - kiểu dữ liệu sai |
| `14_1_060_023` | Hoàn tất khi chưa chọn nhà cung cấp bị chặn | Kỹ thuật 1 - ô bắt buộc |
| `14_1_060_024` | Hoàn tất khi chưa nhập SL trả bị chặn | Kỹ thuật 1 - ô bắt buộc |
| `14_1_060_025` | Lưu nháp phiếu trả theo PO | Trace ReturnToSupplierFormPage.jsx:206 |
| `14_1_060_026` | Hoàn tất phiếu trả theo PO | Trace ReturnToSupplierFormPage.jsx:206 |
| `14_1_060_027` | SL trả âm không nhập được ở màn theo PO | Kỹ thuật 3 - giá trị biên |
| `14_1_060_028` | Vai cấp tỉnh xem được màn xuất trả theo PO ở phạm vi tỉnh | Kỹ thuật 10 - phạm vi theo vai |
| `14_1_030_026` | Phiếu chưa duyệt hiện gạch ngang ở cột SL duyệt | Trace ReturnRequestDetailDrawer.jsx:82-93 |
| `14_1_030_027` | Bảng phiếu con ở màn chi tiết hiện đủ sáu cột | Trace ReturnRequestDetailDrawer.jsx:398-456 |

## 5. Bảng đối chiếu đầy đủ 26 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `NCC_109` | Kiểm tra giao diện màn hình danh sách Xuất trả nhà cung cấp | `14_1_060_001` |
| `NCC_110` | Kiểm tra giao diện màn hình Tạo phiếu xuất trả nhà cung cấp | `14_1_060_002` |
| `NCC_111` | Kiểm tra bộ lọc NCC | `14_1_060_003` |
| `NCC_112` | Kiểm tra tìm kiếm theo mã phiếu trả hàng | `14_1_060_004` |
| `NCC_113` | Kiểm tra 1 phiếu PO có thể trả hàng nhiều lần | `14_1_060_005` |
| `NCC_114` | Kiểm tra không cho trả hàng khi PO ở trạng thái Nháp | `14_1_060_006` |
| `NCC_115` | Kiểm tra không cho trả hàng khi PO ở trạng thái Đã duyệt | `14_1_060_007` |
| `NCC_116` | Kiểm tra không cho trả hàng khi PO ở trạng thái Đã gửi NCC | `14_1_060_008` |
| `NCC_117` | Kiểm tra không cho trả hàng khi PO ở trạng thái NCC xác nhận | `14_1_060_009` |
| `NCC_118` | Kiểm tra chỉ cho trả hàng khi PO đã giao (đã nhập kho) | `14_1_060_010` |
| `NCC_119` | Kiểm tra hiển thị số lượng nhận thực tế đối với PO giao một phần | `14_1_060_011` |
| `NCC_120` | Kiểm tra tạo phiếu trả hàng cho PO giao một phần | `14_1_060_012` |
| `NCC_121` | Kiểm tra không cho trả vượt số lượng đã nhập đối với PO giao một phần | `14_1_060_013` |
| `NCC_122` | Kiểm tra công nợ NCC giảm đúng sau khi trả hàng | `14_1_060_014` |
| `NCC_123` | Kiểm tra lịch sử công nợ ghi nhận giao dịch trả hàng | `14_1_060_015` |
| `NCC_124` | Kiểm tra trả hàng nhiều lần đến đúng số lượng tối đa | `14_1_060_016` |
| `NCC_125` | Kiểm tra không cho trả vượt tổng số lượng của PO sau nhiều lần trả | `14_1_060_017` |
| `NCC_126` | Kiểm tra số lượng còn lại được cập nhật sau mỗi lần trả | `14_1_060_018` |
| `NCC_127` | Kiểm tra không hiển thị danh sách sản phẩm PO đã trả hết hàng | `14_1_060_019` |
| `NCC_128` | Kiểm tra nhập ghi chú ghi trả hàng | `14_1_060_020` |
| `NCC_129` | Kiểm tra Xem chi tiết phiếu trả hàng | `14_1_030_016` |
| `FUNC_1_447` | Trả hàng NCC theo lô | `14_1_010_031` |
| `FUNC_1_448` | Trả hàng NCC theo nhiều lô | `14_1_010_032` |
| `FUNC_1_449` | Trả hàng NCC theo mã serial | `14_1_010_033` |
| `FUNC_1_450` | Trả hàng NCC khi tồn = 0 | `14_1_010_034` |
| `FUNC_1_451` | Trả hàng NCC khi tồn âm | `14_1_010_035` |

<!-- NHAN-XET-TAY -->
## 6. Nhận xét thủ công

> Viết 19/09/2026, phiên hoàn thiện tài liệu test case.

### 6.1 Độ phủ 26/26 — nhưng nằm ở HAI màn hình khác nhau

21 case `NCC_109`–`NCC_129` thuộc màn **xuất trả theo PO** (`/inventory/return-to-supplier`), phủ bởi
nhóm `14_1_060_*`. 5 case `FUNC_1_447`–`FUNC_1_451` thuộc màn **đa cấp**
(`/inventory/stock-return-request`), phủ bởi nhóm `14_1_010_*`. Sheet QC 🚫 **không có case nào** cho
luồng duyệt phân cấp điểm bán → xã → tỉnh → TCT, vốn là toàn bộ nội dung HDSD 14_1 — 116/142 case ở
đây là phần sheet QC bỏ trống.

### 6.2 Kỳ vọng đã viết lại, 🚫 không chép nguyên từ sheet

| Mã gốc | Sheet ghi | Đã viết lại thành |
|---|---|---|
| `NCC_121` | *"Hiển thị là số lượng max có thể trả"* | Ô SL trả tự chặn ở `returnableQuantity` (`max` của InputNumber) — **không có thông báo lỗi nào**. Sheet mô tả đúng hành vi nhưng dễ đọc nhầm thành "có báo lỗi" |
| `NCC_125` | *"Hệ thống báo lỗi vượt số lượng còn lại (chỉ còn được trả 10)"* | 🔴 **Không có thông báo lỗi** — cùng cơ chế `max`. Kỳ vọng của sheet **sai so với code** |
| `FUNC_1_450` `FUNC_1_451` | *"Không cho xác nhận"* | Chép nguyên văn thông báo BE dòng 331 để kỳ vọng đo được |
| `NCC_114`–`NCC_117` | *"Không tìm thấy phiếu PO đủ điều kiện trả hàng"* | Thông báo thật của FE là `Không tìm thấy phiếu PO có mã đã nhập` (`ReturnToSupplierFormPage.jsx:161`) |

### 6.3 🔴 Bốn câu hỏi CHẶN sinh ra từ phân hệ này

1. **Màn nào là đường chính thức?** Hai màn xuất trả NCC cùng sống, cùng tên, cùng giảm tồn. Màn theo
   PO `hideInMenu: true` nhưng route vẫn mở được bằng URL và vẫn giảm công nợ NCC.
2. **Phiếu trả đa cấp có giảm công nợ NCC không?** `NCC_122` `NCC_123` đo công nợ, nhưng HDSD 14_1
   (màn đa cấp) 🚫 không nhắc chữ "công nợ" lần nào. Nếu luồng chính không hạch toán thì đây là **sai
   im lặng**: hàng đã trả, công nợ vẫn treo.
3. **`max` của InputNumber có tuyến phòng thủ ở backend không?** Nếu không, gọi thẳng
   `POST /stock/v2/return-to-supplier` với số lượng vượt là trả được nhiều hơn số đã nhập.
4. **Hai phiếu chờ duyệt cho cùng một số hàng có hợp lệ không?** Luồng đa cấp chỉ khoá tồn khi **tỉnh
   duyệt**, nên điểm bán lập được 2 phiếu cùng trả 10 đơn vị của lô còn 10. Tổng SL duyệt có thể vượt
   tồn. Chưa dựng case vì chưa rõ là ý đồ hay lỗ hổng.

### 6.4 Lệch nguyên văn giữa HDSD và code

HDSD 010 viết thông báo serial là `"Sản phẩm quản lý serial: số serial phải bằng số lượng"`. Thực tế
có **hai** chuỗi khác nhau và **không chuỗi nào** giống HDSD:

- FE: `Sản phẩm "<tên>" quản lý serial: cần <n> serial (theo <ĐVC>), đang chọn <m>`
- BE: `Số serial (<n>) phải bằng số lượng trả (<m>)`

Case dựng theo chuỗi của code. 🚫 Không sửa HDSD — báo để user quyết sửa ở đâu.
