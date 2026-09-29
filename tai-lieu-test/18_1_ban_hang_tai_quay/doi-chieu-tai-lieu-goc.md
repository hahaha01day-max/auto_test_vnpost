# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 18_1 — Bán hàng tại quầy (POS)

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 18_1_ban_hang_tai_quay`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `18_1_ban_hang_tai_quay`
- Tài liệu gốc liên quan: [`uat_vnpost_ban_hang.csv`](../test-case-goc/uat_vnpost_ban_hang.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **56** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **56** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 131 |
| — **tài liệu gốc KHÔNG có** | 82 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 82 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `18_1_010_001` | Từ danh sách đơn hàng mở màn Bán hàng | HDSD 010 |
| `18_1_010_003` | Chưa mở ca thì chặn vào màn bán hàng | HDSD 010 |
| `18_1_010_005` | Phím F1 mở tab đơn mới | HDSD 070 |
| `18_1_010_008` | Phím F2 đóng tab đang mở | HDSD 070 |
| `18_1_010_021` | Phím F11 đưa con trỏ vào ô tìm khách hàng | HDSD 070 |
| `18_1_010_022` | Đóng tab đơn RỖNG không hỏi xác nhận | Kỹ thuật 9 - huỷ giữa chừng |
| `18_1_010_023` | Từ chối hộp xác nhận đóng tab thì giữ nguyên giỏ | Kỹ thuật 9 - huỷ giữa chừng |
| `18_1_020_002` | Tạo đơn bằng cách chọn trong danh sách sản phẩm | HDSD 020 |
| `18_1_020_003` | Tạo đơn bằng cách lọc sản phẩm theo danh mục | HDSD 020 |
| `18_1_020_004` | Ba tiêu chí tìm kiếm chuyển đổi được | HDSD 020 |
| `18_1_020_005` | Đổi tiêu chí tìm thì xoá từ khoá và kết quả cũ | HDSD 020 |
| `18_1_020_008` | Tìm sản phẩm bằng một phần tên | HDSD 020 + Kỹ thuật 8 - tìm kiếm |
| `18_1_020_009` | Tìm sản phẩm không dấu | Kỹ thuật 8 - tìm kiếm |
| `18_1_020_010` | Tìm sản phẩm bằng chuỗi toàn khoảng trắng | Kỹ thuật 2 - khoảng trắng |
| `18_1_020_011` | Tìm sản phẩm bằng ký tự đặc biệt | Kỹ thuật 8 - tìm kiếm |
| `18_1_020_016` | Ẩn hiện khối Sản phẩm bán chạy | HDSD 020 - mẹo |
| `18_1_020_017` | Hàng hết tồn chỉ CẢNH BÁO chứ không chặn thêm vào giỏ | HDSD 020 - lưu ý + trace CreateOrderPage.jsx:1122 |
| `18_1_020_018` | Số lượng vượt tồn kho chỉ CẢNH BÁO | HDSD 020 - lưu ý + trace CreateOrderPage.jsx:1137 |
| `18_1_020_019` | 🔴 Thanh toán mới thật sự chặn khi không đủ hàng | HDSD 020 - lưu ý |
| `18_1_020_020` | Hàng ngừng kinh doanh KHÔNG thêm được vào đơn | HDSD 020 - lưu ý + trace CreateOrderPage.jsx:92 |
| `18_1_020_021` | Hàng không nằm trong bảng giá nào KHÔNG thêm được | HDSD 020 - lưu ý |
| `18_1_020_022` | Không bán dịch vụ nhiều buổi cho khách lẻ | HDSD 020 - lưu ý |
| `18_1_020_023` | Không bán combo liệu trình cho khách lẻ | HDSD 020 - lưu ý |
| `18_1_020_024` | Gắn khách rồi thì bán được dịch vụ nhiều buổi | HDSD 020 - lưu ý |
| `18_1_020_025` | Khối tiền cập nhật ngay theo từng lần thêm hàng | HDSD 020 |
| `18_1_020_026` | Phím F3 F4 F6 đưa con trỏ vào ô tìm theo từng tiêu chí | HDSD 070 |
| `18_1_030_009` | Quét barcode khớp nhiều mặt hàng | HDSD 030 - mẹo + trace SearchProduct.jsx:1034 |
| `18_1_030_012` | Quét kèm số lượng bằng cú pháp N*mã | HDSD 030 |
| `18_1_030_013` | Số lượng trong cú pháp N*mã phải là số nguyên 1–999 | Kỹ thuật 3 - giá trị biên + HDSD 030 |
| `18_1_030_014` | Quét mã vạch hàng cân tách đúng mã hàng và khối lượng | HDSD 030 |
| `18_1_030_015` | Mã vạch hàng cân sai checksum bị chặn | HDSD 030 - lưu ý + trace CreateOrderPage.jsx:538 |
| `18_1_030_016` | Mã vạch hàng cân thiếu checksum bị chặn | HDSD 030 - lưu ý |
| `18_1_030_017` | Mã vạch hàng cân có trọng lượng bằng 0 bị chặn | HDSD 030 - lưu ý + Kỹ thuật 3 - giá trị biên |
| `18_1_030_018` | Tự gõ mã vạch bằng tiêu chí Barcode | HDSD 030 |
| `18_1_030_019` | 🔴 Màn thanh toán đang mở thì NGỪNG nhận mã vạch | HDSD 030 - lưu ý |
| `18_1_030_020` | Quét liên tiếp nhiều mặt hàng khác nhau | HDSD 030 |
| `18_1_040_001` | Bật Tự động mở chọn lô | HDSD 040 |
| `18_1_040_002` | Màn Chọn sản phẩm có đủ trường | HDSD 040 |
| `18_1_040_003` | Hết lô thì bảng lô hiện Không có lô nào | HDSD 040 |
| `18_1_040_004` | Đổi đơn vị thì tồn kho và giá bán tính lại | HDSD 040 + HDSD 050 |
| `18_1_040_005` | Phân bổ đủ số lượng qua nhiều lô | HDSD 040 |
| `18_1_040_006` | Phân bổ vượt số lượng bán bị chặn | HDSD 040 - lưu ý + Kỹ thuật 3 - giá trị biên |
| `18_1_040_007` | Phân bổ THIẾU so với số lượng bán bị chặn | HDSD 040 - lưu ý + Kỹ thuật 3 - giá trị biên |
| `18_1_040_008` | 🔴 Bỏ trống Số lượng thì tự phân bổ TOÀN BỘ tồn kho | HDSD 040 - lưu ý |
| `18_1_040_009` | Số lượng phải lớn hơn 0 | Kỹ thuật 3 - giá trị biên + HDSD 040 |
| `18_1_040_010` | Hàng cân nhận số lượng lẻ | HDSD 040 |
| `18_1_040_011` | Giảm giá (%) chỉ nhận 0 đến 100 | Kỹ thuật 3 - giá trị biên + HDSD 040 |
| `18_1_040_012` | Xoá một lô khỏi bảng phân bổ | HDSD 040 |
| `18_1_040_013` | Ô + Thêm lô chỉ hiện khi còn lô chưa dùng | HDSD 040 |
| `18_1_040_014` | Hàng quản lý serial BẮT BUỘC chọn serial | HDSD 040 - lưu ý |
| `18_1_040_015` | Số lượng bán phải ≥ số serial đã chọn | HDSD 040 - lưu ý |
| `18_1_040_016` | 🔴 Không trộn lô xả kho với lô thường trong cùng dòng hàng | HDSD 040 - lưu ý |
| `18_1_040_017` | Đổi lô được ghi vào nhật ký thao tác | HDSD 040 - mẹo |
| `18_1_040_018` | Đóng màn Chọn sản phẩm giữa chừng | Kỹ thuật 9 - huỷ giữa chừng |
| `18_1_050_001` | Sửa số lượng ngay trên dòng hàng | HDSD 050 |
| `18_1_050_002` | Cột Đơn vị trên bảng hàng chỉ để xem | HDSD 050 |
| `18_1_050_003` | Sửa giá bán của dòng hàng | HDSD 050 |
| `18_1_050_004` | Giá bán âm hoặc bằng 0 | Kỹ thuật 3 - giá trị biên |
| `18_1_050_005` | Số lượng bằng 0 hoặc âm trên dòng hàng | Kỹ thuật 3 - giá trị biên |
| `18_1_050_006` | Số lượng rất lớn | Kỹ thuật 3 - giá trị biên |
| `18_1_050_007` | Nhập chiết khấu, đổi VNĐ/% và ghi chú đơn | HDSD 050 |
| `18_1_050_008` | Xoá một dòng hàng khỏi đơn | HDSD 050 |
| `18_1_050_009` | Xoá tất cả sản phẩm trong đơn | HDSD 050 - lưu ý |
| `18_1_050_010` | Từ chối hộp xác nhận Xoá tất cả | Kỹ thuật 9 - huỷ giữa chừng |
| `18_1_050_011` | 🔴 Dòng quà tặng khuyến mại không sửa được số lượng | HDSD 050 - lưu ý |
| `18_1_050_012` | Phím Home và mũi tên điều khiển dòng hàng | HDSD 050 - mẹo + HDSD 070 |
| `18_1_060_002` | Phím F9 làm cùng việc kết nối cân | HDSD 060 + HDSD 070 |
| `18_1_060_003` | Đóng hộp chọn cổng mà chưa chọn | HDSD 060 - mẹo |
| `18_1_060_005` | Lần sau tự nối lại cổng đã cấp quyền | HDSD 060 |
| `18_1_060_011` | 🔴 Chưa chọn dòng hàng thì số cân vào DÒNG CUỐI | HDSD 060 - lưu ý |
| `18_1_060_012` | Đơn chưa có mặt hàng nào thì bỏ qua lần cân | HDSD 060 - lưu ý |
| `18_1_060_013` | 🔴 Màn thanh toán đang mở thì NGỪNG nhận số cân | HDSD 060 - lưu ý |
| `18_1_060_014` | Dòng quà tặng khuyến mại không nhận số cân | HDSD 060 - lưu ý |
| `18_1_060_024` | Quét liên tiếp nhiều sản phẩm cân ký | HDSD 060 |
| `18_1_070_001` | Bảng Phím tắt liệt kê đủ 14 phím | HDSD 070 |
| `18_1_070_002` | Phím F7 lưu đơn nháp | HDSD 070 |
| `18_1_070_003` | Phím F8 tạo đơn thanh toán sau | HDSD 070 |
| `18_1_070_004` | Phím F10 mở danh sách khuyến mại | HDSD 070 |
| `18_1_070_005` | Phím Enter mở màn thanh toán | HDSD 070 |
| `18_1_070_006` | 🔴 Enter KHÔNG mở thanh toán khi con trỏ trong ô nhập | HDSD 070 - lưu ý |
| `18_1_070_007` | 🔴 Phím tắt tạm ngưng khi đang mở cửa sổ | HDSD 070 - lưu ý |
| `18_1_070_008` | Phím tắt chỉ có tác dụng trên màn bán hàng | HDSD 070 |

## 5. Bảng đối chiếu đầy đủ 56 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `dong65` | Kiểm tra khi vào màn bán hàng | `18_1_010_002` |
| `dong66` | Kiểm tra khi thêm mới tab đơn hàng | `18_1_010_004` |
| `dong67` | Kiểm tra khi đóng tab đơn hàng khi có duy nhất 1 tab | `18_1_010_006` |
| `dong68` | Kiểm tra khi đóng 1 tab đơn hàng khi có >1 tab | `18_1_010_007` |
| `dong69` | Kiểm tra khi nhập dữ liệu sản phẩm khác nhau trên các tab | `18_1_020_001` |
| `dong70` | Kiểm tra khi chọn khách hàng khác nhau cho từng tab | `18_1_010_011` |
| `dong71` | Kiểm tra khi thực hiện thanh toán một tab bất kỳ | `18_1_010_012` |
| `dong72` | Kiểm tra khi đóng tab đang có dữ liệu | `18_1_010_009` |
| `dong73` | Kiểm tra khi chuyển đổi qua lại giữa các tab | `18_1_010_010` |
| `dong74` | Kiểm tra chọn khách hàng đã có trong danh sách khách hàng | `18_1_010_017` |
| `dong75` | Kiểm tra tìm kiếm khách hàng đã có trong danh sách | `18_1_010_018` |
| `dong76` | Kiểm tra tìm kiếm khách hàng chưa có trong danh sách | `18_1_010_019` |
| `dong77` | Kiểm tra thêm khách hàng mới | `18_1_010_020` |
| `dong78` | Kiểm tra thêm sản phẩm vào giỏ hàng bằng cách quét mã vạch sản phẩm chưa tồn tại trên hệ thống | `18_1_030_007` |
| `dong79` | Kiểm tra thêm sản phẩm vào giỏ hàng bằng cách quét mã vạch lần đầu | `18_1_030_002` |
| `dong80` | Kiểm tra số lượng sản phẩm trong giỏ hàng khi quét mã vạch nhiều lần | `18_1_030_005` |
| `dong81` | Kiểm tra khi quét mã vạch quá số lượng tồn kho | `18_1_030_006` |
| `dong82` | Kiểm tra tìm kiếm sản phẩm tồn tại trong danh sách | `18_1_020_006` |
| `dong83` | Kiểm tra tìm kiếm sản phẩm không tồn tại trong danh sách | `18_1_020_007` |
| `dong84` | Kiểm tra khi thêm sản phẩm vào giỏ hàng thủ công bằng cách click chọn sản phẩm 1 lần trong danh sách sản phẩm hoặc danh sách tìm kiếm | `18_1_020_012` |
| `dong85` | Kiểm tra khi thêm sản phẩm vào giỏ hàng thủ công bằng cách click chọn sản phẩm nhiều lần trong danh sách sản phẩm hoặc danh sách tìm kiếm | `18_1_020_013` |
| `dong86` | Kiểm tra khi thêm sản phẩm vào giỏ hàng thủ công bằng cách click chọn sản phẩm trong danh sách sản phẩm hoặc danh sách tìm kiếm quá số lượng tồn kho | `18_1_020_014` |
| `dong87` | Kiểm tra khi thêm sản phẩm vào giỏ hàng bằng cách kết hợp phương thức quét mã vạch và chọn thủ công | `18_1_020_015` |
| `dong88` | Kiểm tra tạo và thanh toán đơn mới khi đang treo đơn cũ | `18_1_010_013` |
| `dong89` | Kiểm tra khi quay lại xử lý đơn hàng đang treo | `18_1_010_014` |
| `dong90` | Kiểm tra khi tải lại trang (F5) khi đang có các tab treo | `18_1_010_015` |
| `dong91` | Kiểm tra mở đồng thời nhiều tab treo cho cùng một khách hàng | `18_1_010_016` |
| `BANHANG_135` | Kiểm tra kết nối cân | `18_1_060_001` |
| `BANHANG_136` | Kiểm tra kết nối máy barcode | `18_1_030_001` |
| `BANHANG_137` | Quét barcode sản phẩm còn tồn | `18_1_030_002` |
| `BANHANG_138` | Quét barcode sản phẩm hết tồn | `18_1_030_003` |
| `BANHANG_139` | Quét barcode sản phẩm tồn âm | `18_1_030_004` |
| `BANHANG_140` | Quét liên tiếp cùng barcode | `18_1_030_005` |
| `BANHANG_141` | Quét barcode không tồn tại | `18_1_030_007` |
| `BANHANG_142` | Quét barcode đã ngừng kinh doanh | `18_1_030_008` |
| `BANHANG_143` | Quét barcode có nhiều đơn vị tính | `18_1_030_010` |
| `BANHANG_144` | Quét barcode khi mất kết nối máy quét | `18_1_030_011` |
| `BANHANG_145` | Cân sản phẩm theo kg | `18_1_060_006` |
| `BANHANG_146` | Cân sản phẩm tồn kho = 0 | `18_1_060_007` |
| `BANHANG_147` | Cân sản phẩm tồn âm | `18_1_060_008` |
| `BANHANG_148` | Cân trọng lượng lẻ | `18_1_060_006` |
| `BANHANG_149` | Cân nhiều lần liên tiếp | `18_1_060_009` |
| `BANHANG_150` | Mất kết nối cân điện tử | `18_1_060_004` |
| `BANHANG_151` | Trọng lượng bằng 0 | `18_1_060_010` |
| `BANHANG_152` | Tính tiền sản phẩm cân ký | `18_1_060_015` |
| `BANHANG_153` | Quét barcode sau đó cân thành công | `18_1_060_017` |
| `BANHANG_154` | Quét barcode sản phẩm cân ký khi tồn kho = 0 | `18_1_060_020` |
| `BANHANG_155` | Quét barcode sản phẩm cân ký khi tồn kho âm | `18_1_060_020` |
| `BANHANG_156` | Quét barcode nhưng không đặt hàng lên cân | `18_1_060_018` |
| `BANHANG_157` | Đặt hàng lên cân trước rồi mới quét barcode | `18_1_060_017` |
| `BANHANG_158` | Quét liên tiếp nhiều sản phẩm cân ký | `18_1_060_009` |
| `BANHANG_159` | Quét barcode sai sản phẩm sau đó cân | `18_1_060_019` |
| `BANHANG_160` | Cân thay đổi liên tục trong lúc quét | `18_1_060_021` |
| `BANHANG_161` | Mất kết nối cân sau khi quét barcode | `18_1_060_022` |
| `BANHANG_162` | Quét barcode và cân trọng lượng lẻ | `18_1_060_016` |
| `BANHANG_163` | Nhấc sản phẩm cuối cùng khỏi cân trước khi thanh toán | `18_1_060_023` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_(Viết vào đây. Phần từ dòng `<!-- NHAN-XET-TAY -->` trở xuống KHÔNG bị ghi đè khi sinh lại.)_
