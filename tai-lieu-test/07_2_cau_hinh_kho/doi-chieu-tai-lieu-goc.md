# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 07_2 — Cấu hình kho hàng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 07_2_cau_hinh_kho`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `07_2_cau_hinh_kho`
- Tài liệu gốc liên quan: [`uat_vnpost_ban_ton_kho_am.csv`](../test-case-goc/uat_vnpost_ban_ton_kho_am.csv) · [`uat_vnpost_quan_ly_kho.csv`](../test-case-goc/uat_vnpost_quan_ly_kho.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **35** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **35** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 53 |
| — **tài liệu gốc KHÔNG có** | 21 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 21 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `07_2_010_002` | Chưa có cấu hình nào thì báo đúng thông điệp | HDSD 010 |
| `07_2_010_003` | Chặn thêm cấu hình khi chưa chọn phạm vi áp dụng | HDSD 010 |
| `07_2_010_004` | Hình thức khoá mặc định là Theo danh mục | HDSD 010 |
| `07_2_010_005` | Đổi Loại hàng hoá xoá sạch danh mục đã tích | HDSD 010 |
| `07_2_020_002` | Bỏ khoá hỏi xác nhận trước khi thực hiện | HDSD 020 |
| `07_2_020_003` | Huỷ ở hộp xác nhận thì giữ nguyên cấu hình | HDSD 020 |
| `07_2_020_005` | Một sản phẩm bị nhiều cấu hình khoá cùng lúc | HDSD 020 |
| `07_2_030_001` | Chặn lưu cấu hình bán tồn kho âm khi bỏ trống Tên cấu hình | HDSD 030 |
| `07_2_030_002` | Chặn lưu khi chưa chọn phạm vi áp dụng | HDSD 030 |
| `07_2_030_003` | Ô Mô tả giới hạn 200 ký tự | HDSD 030 |
| `07_2_040_001` | Chặn thêm cấu hình cảnh báo hết hạn khi bỏ trống Tên cấu hình | HDSD 040 |
| `07_2_040_002` | Chặn khi bỏ trống Số ngày trước hạn sử dụng | HDSD 040 |
| `07_2_040_003` | Chặn khi chọn đối tượng Ngành hàng mà không chọn ngành nào | HDSD 040 |
| `07_2_040_004` | Chặn khi chọn đối tượng SKU mà chưa thêm sản phẩm | HDSD 040 |
| `07_2_040_005` | Số ngày của từng sản phẩm mặc định lấy theo số ngày chung | HDSD 040 |
| `07_2_050_001` | Lọc cấu hình cảnh báo theo SKU hoặc ngành hàng | HDSD 050 |
| `07_2_050_002` | Bảng cảnh báo hết hạn hiện đủ cột | HDSD 050 |
| `07_2_050_003` | Công tắc Kích hoạt bị vô hiệu với cấu hình mặc định của hệ thống | HDSD 050 |
| `07_2_050_004` | Sửa nhanh số ngày cảnh báo ngay trên dòng | HDSD 050 |
| `07_2_PQ_001` | Vai Bưu điện Tỉnh vào được Khoá kho và Cảnh báo hết hạn | HDSD |
| `07_2_PQ_002` | Vai Bưu điện Tỉnh KHÔNG vào được Bán tồn kho âm | HDSD |

## 5. Bảng đối chiếu đầy đủ 35 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `dong21` | Kiểm tra ghi nhận giá vốn tạm tính khi tồn kho = 0 và bán âm | `07_2_080_001` |
| `dong22` | Kiểm tra ghi nhận giá vốn tạm tính khi bán tồn kho > 0 và bán âm | `07_2_080_002` |
| `dong23` | Kiểm tra ghi nhận giá vốn tạm tính khi bán tồn kho < 0 và bán âm | `07_2_080_003` |
| `dong24` | Kiểm tra chức năng thêm danh mục khi khai báo các trường không hợp lệ | `07_2_080_004` |
| `dong25` |  | `07_2_080_004` |
| `FUNC_1_386` | Kiểm tra giao diện | `07_2_010_001` |
| `FUNC_1_387` | Kiểm tra thêm khoá kho | `07_2_010_006` |
| `FUNC_1_388` | Kiểm tra bộ lọc phạm vi áp dụng | `07_2_010_007` |
| `FUNC_1_389` | Kiểm tra tìm kiếm theo tên Danh mục | `07_2_010_008` |
| `FUNC_1_390` | Kiểm tra tìm kiếm SKU sản phẩm tự doanh | `07_2_010_009` |
| `FUNC_1_391` | Kiểm tra tìm kiếm SKU sản phẩm của tổng công ty | `07_2_010_010` |
| `FUNC_1_392` | Kiểm tra tìm kiếm tên sản phẩm | `07_2_010_011` |
| `FUNC_1_393` | Kiểm tra Xem chi tiết Cấu hình khoá kho | `07_2_020_001` |
| `FUNC_1_394` | Kiểm tra Bỏ khoá kho | `07_2_020_004` |
| `FUNC_1_395` | Kiểm tra hiển thị quyền cài đặt khoá kho | `07_2_010_012` |
| `FUNC_1_396` | Kiểm tra nhập lí do khoá kho | `07_2_010_006` |
| `FUNC_1_397` | Kiểm tra bán hàng với sản phẩm khoá | `07_2_060_001` |
| `FUNC_1_398` | Kiểm tra xuất kho với sản phẩm khoá | `07_2_060_002` |
| `FUNC_1_399` | Kiểm tra nhập sản phẩm khoá kho | `07_2_060_003` |
| `FUNC_1_400` | Kiểm tra chuyển kho sản phẩm khoá | `07_2_060_004` |
| `FUNC_1_401` | Kiểm tra xác nhận chuyển kho sản phẩm khoá | `07_2_060_005` |
| `FUNC_1_402` | Kiểm tra kiểm kho lệch với sản phẩm khoá | `07_2_060_006` |
| `FUNC_1_403` | Kiểm tra bán hàng với sản phẩm bỏ khoá | `07_2_060_007` |
| `FUNC_1_404` | Kiểm tra xuất kho với sản phẩm bỏ khoá | `07_2_060_008` |
| `FUNC_1_405` | Kiểm tra nhập sản phẩm bỏ khoá kho | `07_2_060_009` |
| `FUNC_1_406` | Kiểm tra chuyển kho sản phẩm bỏ khoá | `07_2_060_010` |
| `FUNC_1_407` | Kiểm tra xác nhận chuyển kho sản phẩm bỏ khoá | `07_2_060_011` |
| `FUNC_1_408` | Kiểm tra kiểm kho lệch với sản phẩm bỏ khoá | `07_2_060_012` |
| `FUNC_1_409` | Kiểm tra phạm vi áp dụng là bưu điện tỉnh | `07_2_070_001` |
| `FUNC_1_410` | Kiểm tra phạm vi áp dụng là bưu điện xã | `07_2_070_002` |
| `FUNC_1_411` | Kiểm tra phạm vi áp dụng là điểm bán | `07_2_070_003` |
| `FUNC_1_412` | Kiểm tra hiển thị các đơn vị đã chọn | `07_2_010_013` |
| `FUNC_1_413` | Kiểm tra phạm vi áp dụng là các cấp khác nhau | `07_2_070_004` |
| `FUNC_1_414` | Kiểm tra phạm vi áp dụng là danh mục | `07_2_070_005` |
| `FUNC_1_415` | Kiểm tra phạm vi áp dụng là theo mã SKU | `07_2_010_006` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026. Phủ 35/35 case gốc (trước đó 6), 25 → 53 case._

### 6.1 🔴 Ba lỗi dữ liệu trong sheet QC

1. **`FUNC_1_404` và `FUNC_1_405` bị ĐẢO**: `404` tên là *"xuất kho với sản phẩm bỏ khoá"* nhưng kỳ
   vọng ghi *"Nhập kho thành công, ghi nhận thêm số lượng nhập kho"*; `405` tên *"nhập sản phẩm bỏ
   khoá"* mà kỳ vọng là *"Xuất kho thành công, trừ đi số lượng xuất kho"*. Đã dựng case **theo kỳ
   vọng** (vì kỳ vọng mới là đặc tả) và ghi rõ trong cột `Nguon`.
2. **`dong23` chép nhầm kỳ vọng**: case *"giá vốn tạm tính khi bán tồn kho < 0 và bán âm"* lại mang
   kỳ vọng *"Hiển thị message đỏ dưới trường Nhập tên danh mục"* — kỳ vọng của case thêm danh mục.
3. **`dong24` `dong25` lẫn nội dung**: hai case về **quản lý danh mục sản phẩm** nằm trong nhóm
   *"Kiểm tra chức năng ghi nhận giá vốn tạm"*. Cùng loại lỗi với
   `uat_vnpost_ban_ton_kho_am.csv` (4/9 case bên trong là của danh mục sản phẩm) đã ghi ở bàn giao.

### 6.2 Thêm NỬA CÒN LẠI cho bốn case phạm vi

`FUNC_1_409`–`411` `413` chỉ đòi kiểm *"nơi đã chọn thì bị chặn"*. Đã thêm nửa **"nơi KHÔNG chọn thì
không bị chặn"** vào kỳ vọng — thiếu nửa này thì không phát hiện được phạm vi nở ra toàn hệ thống,
đúng loại lỗi `stock_v2_find_scope_hole` (thiếu filter phạm vi = trả toàn bộ pod, không phải rỗng).

### 6.3 🔴 Tình huống hàng treo giữa đường

`FUNC_1_401` (xác nhận chuyển kho khi sản phẩm bị khoá) chỉ ghi *"hiển thị thông báo"*. Nhưng hàng
**đã rời kho gửi**; bên nhận bị chặn ⇒ hàng không thuộc kho nào. Sheet không nói xử lý thế nào. Đã
ghi rõ vào kỳ vọng `07_2_060_005` và để `BLOCKED`.

### 6.4 Mâu thuẫn quyền giữa sheet và case đã dựng

`FUNC_1_395`: *"Chỉ có role cấp TCT và cấp tỉnh được thực hiện"* cài đặt khoá kho. Case cũ
`07_2_PQ_001` khai *"Vai Bưu điện Tỉnh vào được Khoá kho"* — khớp. Nhưng `07_2_PQ_002` khai vai tỉnh
**không** vào được *Bán tồn kho âm*; sheet không nói gì về giới hạn đó. Cần đối chiếu và chốt cả hai.

### 6.5 Hai câu hỏi giá vốn của bán âm nối sang phân hệ khác

Nhóm `dong21`–`dong23` (giá vốn tạm tính khi bán âm) trùng chủ đề với `04_3_030_009` (xuất kho khi
tồn âm) và `04_4_070_003` (bán hàng khi tồn âm). 🔴 Ba phân hệ đang hỏi **cùng một câu**: *giá vốn lấy
ở đâu khi không còn lô*. Nên trả lời một lần cho cả ba.
