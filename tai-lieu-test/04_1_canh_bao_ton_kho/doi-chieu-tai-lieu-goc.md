# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 04_1 — Cảnh báo tồn kho và đề xuất nhập hàng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 04_1_canh_bao_ton_kho`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `04_1_canh_bao_ton_kho`
- Tài liệu gốc liên quan: [`uat_vnpost_quan_ly_kho.csv`](../test-case-goc/uat_vnpost_quan_ly_kho.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **30** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **30** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 72 |
| — **tài liệu gốc KHÔNG có** | 46 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 46 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `04_1_010_002` | Vai cấp trên chưa chọn điểm bán thì bảng trống, không báo lỗi | HDSD 010 |
| `04_1_010_005` | Nhóm Tồn lâu ngày ẩn cột Nguồn cấu hình và thêm cột tuổi tồn | HDSD 010 |
| `04_1_010_007` | Hai nhóm hạn sử dụng đổi nút thao tác, không có nút tạo yêu cầu nhập | HDSD 010 |
| `04_1_010_009` | Đổi nhóm cảnh báo thì bỏ chọn dòng đã tích | HDSD 010 |
| `04_1_010_016` | Chín thẻ cảnh báo hiển thị đủ và đúng nhãn | Quét kỹ thuật 3.4 #7 — trace features/stockAlert/StockAlertDashboard.jsx |
| `04_1_020_002` | Ba thẻ số đầu màn hiển thị Tổng phân loại SP, Đã cài ngưỡng, Chưa cài ngưỡng | HDSD 020 |
| `04_1_020_003` | Chọn Áp dụng cho = Sản phẩm chưa cài mức Max thì khoá ô Ngưỡng Min | HDSD 020 |
| `04_1_020_004` | Chọn Áp dụng cho = Sản phẩm chưa cài mức Min thì khoá ô Ngưỡng Max | HDSD 020 |
| `04_1_020_005` | Nhãn nút áp dụng đổi theo lựa chọn Áp dụng cho | HDSD 020 |
| `04_1_020_008` | Áp dụng cho tất cả sản phẩm phải qua màn xác nhận | HDSD 020 |
| `04_1_020_010` | Thẻ Theo từng sản phẩm: tìm và thêm sản phẩm cần cài ngưỡng | HDSD 020 |
| `04_1_020_019` | Phạm vi Nhiều tỉnh chỉ cấu hình được sản phẩm Tổng công ty | Quét kỹ thuật 3.4 #10 — trace features/stockAlert/components/CoreStockWarningConfigTab.jsx |
| `04_1_020_021` | Biên giá trị Min / Max và ô số ngày | Quét kỹ thuật 3.4 #3 — trace features/stockAlert/components/CoreStockWarningConfigTab.jsx |
| `04_1_020_022` | Min lớn hơn Max — phơi hành vi thật | Quét kỹ thuật 3.4 #4 — trace features/stockAlert/components/CoreStockWarningConfigTab.jsx |
| `04_1_020_023` | Huỷ hộp thoại xoá cấu hình thì không xoá gì | Quét kỹ thuật 3.4 #9 — trace features/stockAlert/components/CoreStockWarningConfigTab.jsx |
| `04_1_030_001` | Mở màn Import Excel từ thẻ Theo từng sản phẩm | HDSD 030 |
| `04_1_030_002` | Tải file mẫu thành công | HDSD 030 |
| `04_1_030_003` | File sai định dạng bị chặn, không gửi lên server | HDSD 030 |
| `04_1_030_004` | Nạp file hợp lệ: ba số Tổng dòng, Đã áp dụng, Dòng lỗi đúng | HDSD 030 |
| `04_1_030_005` | File có dòng lỗi hiện bảng Danh sách dòng lỗi kèm lý do | HDSD 030 |
| `04_1_030_006` | Dòng có Min lớn hơn Max bị tính là dòng lỗi | HDSD 030 |
| `04_1_030_007` | Nạp từng dòng độc lập: dòng đúng vẫn được áp khi có dòng sai | HDSD 030 |
| `04_1_030_008` | Nạp lại tệp đã sửa không tạo bản ghi trùng | HDSD 030 |
| `04_1_040_001` | Vai cấp điểm bán không thấy thẻ Cảnh báo hết hạn | HDSD 040 |
| `04_1_040_002` | Vai TCT thấy thẻ Cảnh báo hết hạn và danh sách cấu hình | HDSD 040 |
| `04_1_040_003` | Mở màn Thêm cấu hình có hai thẻ Cấu hình và Phạm vi khu vực | HDSD 040 |
| `04_1_040_004` | Số ngày trước hạn mặc định là 30 | HDSD 040 |
| `04_1_040_005` | Đối tượng áp dụng mặc định Toàn bộ sản phẩm, không hiện trường phụ | HDSD 040 |
| `04_1_040_006` | Chọn Ngành hàng thì hiện ô chọn ngành hàng | HDSD 040 |
| `04_1_040_007` | Chọn Sản phẩm (SKU) thì hiện ô tìm sản phẩm và cột số ngày riêng | HDSD 040 |
| `04_1_040_008` | Bỏ trống Tên cấu hình thì bị chặn, không gửi request | HDSD 040 |
| `04_1_040_009` | Tạo cấu hình cảnh báo hết hạn thành công | HDSD 040 |
| `04_1_040_010` | Xoá cấu hình vừa tạo | HDSD 040 |
| `04_1_050_001` | Mở màn Đề xuất nhập hàng từ nút trên màn Cảnh báo tồn kho | HDSD 050 |
| `04_1_050_002` | Chưa chọn điểm bán thì không tính được gợi ý | HDSD 050 |
| `04_1_050_004` | Cột Lý do hiển thị đúng nhóm lý do của hệ thống | HDSD 050 |
| `04_1_050_005` | Mặt hàng chưa đủ lịch sử bán hiện dấu gạch ở cột Bán/ngày | HDSD 050 |
| `04_1_050_006` | Đổi điểm bán sau khi tính gợi ý thì xoá kết quả cũ | HDSD 050 |
| `04_1_050_007` | Sửa được Số lượng đề xuất trực tiếp trong ô | HDSD 050 |
| `04_1_050_008` | Bỏ tích dòng thì dòng đó không vào phiếu | HDSD 050 |
| `04_1_050_009` | Tạo phiếu đề xuất thành công | HDSD 050 |
| `04_1_060_001` | Mở màn danh sách Phiếu đề xuất đặt hàng | HDSD 060 |
| `04_1_060_003` | Lọc theo Mã phiếu | HDSD 060 |
| `04_1_060_004` | Lọc theo Trạng thái | HDSD 060 |
| `04_1_060_005` | Lọc theo Khoảng thời gian | HDSD 060 |
| `04_1_060_006` | Mở chi tiết phiếu xem mặt hàng và số lượng | HDSD 060 |

## 5. Bảng đối chiếu đầy đủ 30 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `FUNC_1_181` | Kiểm tra giao diện | `04_1_010_001` |
| `FUNC_1_182` | Kiểm tra bộ lọc chọn điểm bán/kho | `04_1_010_003` |
| `FUNC_1_183` | Kiểm tra tab Dưới định mức Min | `04_1_010_004` |
| `FUNC_1_184` | Kiểm tra tab Vượt định mức Min | `04_1_010_004` |
| `FUNC_1_185` | Kiểm tra tab Sắp hết (7 ngày) | `04_1_010_006` |
| `FUNC_1_186` | Kiểm tra tab Sắp hết( 30 ngày) | `04_1_010_006` |
| `FUNC_1_187` | Kiểm tra tab Dự báo hết hàng | `04_1_050_003` |
| `FUNC_1_188` | Kiểm tra tìm kiếm mã SKU, tên sản phẩm ở tab Dự báo hết hàng | `04_1_010_011` |
| `FUNC_1_189` | Kiểm tra phân trang | `04_1_010_012` |
| `FUNC_1_190` | Kiểm tra làm mới trang | `04_1_010_013` |
| `FUNC_1_191` | Kiểm tra cài đặt hiển thị | `04_1_010_014` |
| `FUNC_1_192` | Kiểm tra phóng to/ thu nhỏ | `04_1_010_015` |
| `FUNC_1_193` | Kiểm tra chọn sản phẩm tạo phiếu đề xuất đặt hàng | `04_1_010_008` |
| `FUNC_1_194` | Kiểm tra số lượng sản phẩm trong phiếu đề xuất đặt hàng | `04_1_010_010` |
| `FUNC_1_195` | Kiểm tra sinh phiếu đề xuất đặt hàng tự động | `04_1_060_002` |
| `FUNC_1_196` | Kiểm tra giao diện | `04_1_020_001` |
| `FUNC_1_197` | Kiểm tra hiển thiển tab sản phẩm của tỉnh, sản phẩm của Tổng công ty với role cấp tỉnh | `04_1_020_013` |
| `FUNC_1_198` | Kiểm tra tab tham khảo cấu hình từ Tổng công ty | `04_1_020_014` |
| `FUNC_1_199` | Kiểm tra tìm kiếm SKU , tên sản phẩm trong tab tham khảo cấu hình từ Tổng công ty | `04_1_020_015` |
| `FUNC_1_200` | Kiểm tra cài đặt nhanh | `04_1_020_009` |
| `FUNC_1_201` | Kiểm tra cài đặt mức theo từng sản phẩm | `04_1_020_011` |
| `FUNC_1_202` | Kiểm tra tìm kiểm theo mã SKU, tên sản phẩm, barcode ở tab theo từng sản phẩm | `04_1_020_016` |
| `FUNC_1_203` | Kiểm tra tab hiển thị Đã cài đặt | `04_1_020_012` |
| `FUNC_1_204` | Kiểm tra báo cáo số lượng | `04_1_020_017` |
| `FUNC_1_205` | Kiểm tra xoá sản phẩm trong danh sách đã cài đặt | `04_1_020_018` |
| `FUNC_1_206` | Kiểm tra nhập Min <= Max | `04_1_020_006` |
| `FUNC_1_207` | Kiểm tra nhập số âm ở trường Min và Max | `04_1_020_007` |
| `FUNC_1_208` | Kiểm tra nhập chữ vào ô Min, Max | `04_1_020_020` |
| `FUNC_1_209` | Kiểm tra hiển thị danh sách sản phẩm của tab Sản phẩm của tỉnh | `04_1_020_013` |
| `FUNC_1_210` | Kiểm tra hiển thị danh sách sản phẩm của tab Sản phẩm của tổng công ty | `04_1_020_013` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026. Phủ 30/30 case gốc, 55 → 72 case._

### 6.1 Bốn case gốc có kỳ vọng KHÔNG khớp code — để BLOCKED chờ user

| Mã gốc | Sheet đòi | Code thật |
|---|---|---|
| `FUNC_1_192` | nút phóng to / thu nhỏ bảng | bảng chỉ bật `options: { reload, setting }`, **không** có `fullScreen` |
| `FUNC_1_208` | nhập chữ vào Min/Max thì "về số 0" | `InputNumber` bỏ qua ký tự không phải số — giữ giá trị cũ hoặc thành rỗng |
| `FUNC_1_202` | tìm được theo **barcode** | ô tìm chỉ khai SKU và tên sản phẩm |
| `FUNC_1_197` `209` `210` | chỉ nói cấp **tỉnh** | còn nhánh cấp **xã**, nhãn đổi thành *"Sản phẩm của xã"* |

### 6.2 🔴 Lỗi nghiệp vụ thật: không có phép kiểm Min ≤ Max

Cả hai ô chỉ ràng buộc `min={0}`. Đặt Min = 100 và Max = 10 cho cùng một SKU thì thẻ *"Dưới định mức
Min"* và *"Vượt định mức Max"* cùng nổ cho một sản phẩm — hai cảnh báo loại trừ nhau về mặt nghiệp vụ.
Đã dựng `04_1_020_022` để phơi; đây là mục đáng báo nhất của phân hệ.

### 6.3 Phạm vi "Nhiều tỉnh" bị giới hạn mà tài liệu không nói

Chọn phạm vi nhiều tỉnh thì **chỉ** cấu hình được sản phẩm cấp TCT (`productOrgUnitType="TONG_CONG_TY"`),
không có thẻ *"Sản phẩm của tỉnh"*, và ba thẻ số liệu tổng hợp cũng ẩn. Lý do ghi ngay trong code:
*"sản phẩm của tỉnh" là tập khác nhau ở mỗi tỉnh nên không có danh sách chung để cấu hình hàng loạt
(BE cũng chặn)*. Hợp lý, nhưng người dùng không được báo — đáng đưa vào HDSD.

### 6.4 Hai bẫy script

1. Ô tìm ở bảng *Dự báo hết hàng* chạy theo **debounce 500ms**, không có nút tìm và không theo Enter.
2. Màn Cài đặt có **nhiều ô cùng placeholder** `"Tìm SKU, tên sản phẩm..."` — phải bám theo khối bao
   ngoài (khối *Cấu hình Tổng công ty* vs thẻ *Theo từng sản phẩm*).
