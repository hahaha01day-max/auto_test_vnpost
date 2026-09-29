# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 10 — Quản lý bảng giá sản phẩm

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 10_bang_gia_ban_san_pham`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `10_bang_gia_ban_san_pham`
- Tài liệu gốc liên quan: [`uat_vnpost_bang_gia.csv`](../test-case-goc/uat_vnpost_bang_gia.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **82** |
| — trong đó **trùng lặp** trong chính sheet gốc | 1 |
| **Case gốc đã dựng** | **81** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 87 |
| — **tài liệu gốc KHÔNG có** | 8 |

**Độ phủ tài liệu gốc: 99%**

## 2. 🔴 Case trùng lặp trong sheet gốc — 🚫 KHÔNG dựng thêm

So **toàn bộ** nội dung (tình huống, điều kiện, các bước, kết quả mong muốn), giống nhau từng ký tự.
Dựng thêm là chạy hai lần cùng một thao tác, làm độ phủ ảo và nhân đôi rủi ro ghi dữ liệu.

| Giữ lại | Bản trùng | Tình huống |
|---|---|---|
| `dong50` | `dong69` | Kiểm tra thêm lại sản phẩm đã tồn tại trong bảng |

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 8 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `10_010_004` | Xuất danh sách bảng giá ra Excel | HDSD 010 |
| `10_030_002` | Không sửa được bảng giá của đơn vị khác | HDSD 030 |
| `10_040_001` | Chi tiết bảng giá mở ở thẻ Thông tin chung | HDSD 040 |
| `10_040_003` | Thẻ Lịch sử cập nhật ghi đủ dấu vết thao tác | HDSD 040 |
| `10_040_004` | Xem được nội dung đã thay đổi của một lần thao tác | HDSD 040 |
| `10_040_005` | Màn chi tiết là chỉ đọc | HDSD 040 |
| `10_050_003` | Biểu tượng đổi trạng thái thay đổi theo trạng thái hiện tại | HDSD 050 |
| `10_PQ_001` | Vai điểm bán xem được bảng giá nhưng không phê duyệt được | HDSD |

## 5. Bảng đối chiếu đầy đủ 82 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `BANGGIA_1` | Kiểm tra các trường mặc định | `10_020_002` |
| `BANGGIA_2` | Kiểm tra giao diện và các giá trị mặc định khi Phương thức tính thuế VAT là Đơn giá đã bao gồm VAT (Giá sau thuế) | `10_080_001` |
| `BANGGIA_3` | Kiểm tra giao diện và các giá trị mặc định khi Phương thức tính thuế VAT là Đơn giá chưa bao gồm VAT (Giá trước thuế) | `10_080_002` |
| `BANGGIA_4` | Kiểm tra giao diện khi hình thức là Ký gửi | `10_080_003` |
| `dong18` | Kiểm tra hiển thị dòng note khi thêm Combo vào bảng giá có Phương thức tính thuế VAT là Đơn giá đã bao gồm VAT (Giá sau thuế) | `10_080_004` |
| `dong19` | Kiểm tra giá trị bộ lọc theo danh mục khi thay đổi giá trị bộ lọc Loại sản phẩm | `10_080_005` |
| `dong20` | Kiểm tra clear dữ liệu bộ lọc danh mục khi thay đổi giá trị bộ lọc Loại sản phẩm | `10_080_006` |
| `BANGGIA_8` | Kiểm tra bảng sản phẩm tại tab Sản phẩm | `10_080_007` |
| `BANGGIA_9` | Kiểm tra tạo bảng giá mới thành công với đầy đủ thông tin | `10_020_003` |
| `BANGGIA_10` | Kiểm tra tạo bảng giá – không nhập các trường bắt buộc | `10_020_004` |
| `BANGGIA_11` | Kiểm tra tạo bảng giá nhập ngày kết thúc trước ngày bắt đầu | `10_020_005` |
| `BANGGIA_12` | Kiểm tra nhập tên bảng giá trùng với bảng giá đã tồn tại | `10_020_001` |
| `BANGGIA_13` | Kiểm tra chọn giờ kết thúc trước giờ bắt đầu | `10_020_006` |
| `BANGGIA_14` | Kiểm tra tạo bảng giá với trạng thái Ngừng kích hoạt | `10_020_007` |
| `BANGGIA_15` | Kiểm tra tạo bảng giá chưa bao gồm thuế VAT | `10_020_008` |
| `BANGGIA_16` | Kiểm tra nhấn "Hủy" khi đang nhập thông tin bảng giá | `10_020_009` |
| `BANGGIA_17` | Chọn phạm vi áp dụng theo Điểm bán – chọn ít nhất 1 điểm | `10_070_001` |
| `BANGGIA_18` | Tick checkbox cấp Tỉnh → tự động chọn tất cả Xã/Phường và Điểm bán bên dưới | `10_070_002` |
| `BANGGIA_19` | Áp dụng cho Bưu điện xã – chọn đúng cấp | `10_070_003` |
| `BANGGIA_20` | Áp dụng cho Bưu điện tỉnh – chọn đúng cấp | `10_070_004` |
| `BANGGIA_21` | Kiểm tra tạo bảng giá không chọn bất kỳ điểm nào ở Tab Phạm vi khu vực | `10_070_005` |
| `BANGGIA_22` | Kiểm tra chức năng Hiển thị các đơn vị đã chọn | `10_070_006` |
| `BANGGIA_23` | Tìm kiếm điểm bán theo tên trong Tab Phạm vi khu vực | `10_010_003` |
| `BANGGIA_24` | Kiểm tra thêm sản phẩm hình thức mua bán theo danh mục | `10_090_001` |
| `BANGGIA_25` | Kiểm tra thêm sản phẩm hình thức mua bán theo SKU | `10_090_002` |
| `BANGGIA_26` | Kiểm tra nhập SKU của sản phẩm Ký gửi vào bảng giá Mua bán | `10_090_003` |
| `BANGGIA_27` | Kiểm tra thêm Combo Mua bán vào bảng giá Mua bán theo danh mục | `10_090_004` |
| `BANGGIA_28` | Thêm Combo Mua bán vào bảng giá Mua bán theo SKU | `10_090_005` |
| `BANGGIA_29` | Kiểm tra nhập SKU của combo sản phẩm Ký gửi vào bảng giá Mua bán | `10_090_006` |
| `dong50` | Kiểm tra thêm lại sản phẩm đã tồn tại trong bảng | `10_090_007` |
| `dong51` | Kiểm tra nhập giá bán > giá niêm yết | `10_100_001` |
| `dong52` | Kiểm tra nhập giá niếm yết < giá bán | `10_100_002` |
| `BANGGIA_35` | Kiểm tra trường tỷ lệ chiết khấu tự động tính khi nhập Giá niêm yết và giá bán | `10_090_010`, `10_100_003` |
| `BANGGIA_34` | Kiểm tra thêm sản phẩm Mua bán từ file Excel | `10_090_009` |
| `BANGGIA_35` | Upload file Excel chứa SKU của sản phẩm Ký gửi vào bảng giá Mua bán → bị loại bỏ / báo lỗi | `10_090_010`, `10_100_003` |
| `BANGGIA_36` | Kiểm tạo bảng giá khi không thêm sản phẩm nào vào bảng giá | `10_090_011` |
| `dong57` | Kiểm tạo Bảng giá mua bán thành công khi khai báo hợp lệ | `10_020_003` |
| `BANGGIA_38` | Kiểm tra thêm sản phẩm hình thức ký gửi theo danh mục | `10_110_001` |
| `BANGGIA_39` | Kiểm tra thêm sản phẩm hình thức ký gửi theo SKU | `10_110_002` |
| `BANGGIA_40` | Kiểm tra nhập SKU của sản phẩm Mua bán vào bảng giá Ký gửi | `10_110_003` |
| `BANGGIA_41` | Kiểm tra thêm Combo Ký gửi vào bảng giá Ký gửi theo danh mục | `10_110_004` |
| `BANGGIA_42` | Thêm Combo Ký gửi vào bảng giá Ký gửi theo SKU | `10_110_005` |
| `BANGGIA_43` | Thêm sản phẩm Ký gửi từ file Excel – thành công | `10_110_006` |
| `BANGGIA_44` | Kiểm tra nhập Giá bán và Tỷ lệ chiết khấu thủ công cho sản phẩm Ký gửi | `10_100_006` |
| `dong66` | Kiểm tra nhập Tỷ lệ chiết khấu > 100 | `10_100_004` |
| `dong67` | Kiểm tạo Bảng giá ký gửi thành công khi khai báo hợp lệ | `10_110_007` |
| `dong69` | Kiểm tra thêm lại sản phẩm đã tồn tại trong bảng | — **chưa dựng** |
| `BANGGIA_48` | Xóa hàng loạt sản phẩm khỏi bảng giá | `10_120_001` |
| `dong71` | Kiểm tra nhập số âm cho các trường cần nhập số | `10_100_005` |
| `dong72` | Kiểm tra khi thêm sản phẩm theo danh mục hoặc SKU nhưng sản phẩm không tồn tại | `10_090_008` |
| `dong73` | Kiểm tra khi đã tồn tại combo trong bảng sản phẩm sau đó thay đổi "Phương thức tính thuế VAT " thành "Đơn giá chưa bao gồm VAT (Giá trước thuế)" | `10_080_008` |
| `dong74` | Kiểm tra tìm kiếm sản phẩm trong danh sách theo mã SKU hoặc tên | `10_040_002` |
| `dong75` | Kiểm tra tìm kiếm sản phẩm trong danh sách theo loại sản phẩm | `10_040_002` |
| `dong76` | Kiểm tra tìm kiếm sản phẩm trong danh sách theo danh mục | `10_040_002` |
| `BANGGIA_55` | Màn hình Quản lý bảng giá hiển thị đúng các cột thông tin | `10_010_001` |
| `BANGGIA_56` | Tìm kiếm bảng giá theo tên – kết quả đúng | `10_010_002` |
| `BANGGIA_57` | Tìm kiếm bảng giá theo Trạng thái | `10_010_005` |
| `BANGGIA_58` | Tìm kiếm bảng giá theo Hình thức | `10_010_006` |
| `BANGGIA_59` | Tìm kiếm bảng giá theo Thời gian hiệu lực (khoảng ngày) | `10_010_007` |
| `BANGGIA_60` | Tìm kiếm kết hợp nhiều bộ lọc cùng lúc | `10_010_008` |
| `BANGGIA_61` | Tìm kiếm không có kết quả → hiển thị thông báo phù hợp | `10_010_009` |
| `BANGGIA_62` | Kiểm tra sửa Tên bảng giá không trùng với tên đã tồn tại trong hệ thống | `10_030_003` |
| `BANGGIA_63` | Kiểm tra sửa bảng giá – thêm sản phẩm mới chưa nằm trong bảng giá vào Tab Sản phẩm | `10_030_004` |
| `BANGGIA_64` | Sửa bảng giá – xóa sản phẩm khỏi Tab Sản phẩm | `10_120_002` |
| `BANGGIA_65` | Sửa bảng giá – cập nhật phạm vi khu vực | `10_030_005` |
| `BANGGIA_66` | Không thể sửa Hình thức (Mua bán / Ký gửi) của bảng giá đã tồn tại | `10_030_006` |
| `BANGGIA_67` | Bảng giá mới tạo có Trạng thái phê duyệt = Chờ phê duyệt | `10_050_004` |
| `BANGGIA_68` | Phê duyệt bảng giá – Trạng thái phê duyệt chuyển thành Đã phê duyệt | `10_050_002` |
| `BANGGIA_69` | Bảng giá đã phê duyệt không thể phê duyệt lại | `10_050_005` |
| `BANGGIA_70` | Sửa bảng giá đã phê duyệt → Trạng thái phê duyệt quay về Chờ phê duyệt | `10_030_001` |
| `BANGGIA_71` | Xóa bảng giá – hiển thị popup xác nhận trước khi xóa | `10_050_001`, `10_060_001` |
| `BANGGIA_72` | Xóa bảng giá – xác nhận xóa → xóa thành công | `10_060_002` |
| `BANGGIA_73` | Xóa bảng giá – nhấn Hủy → bảng giá không bị xóa | `10_060_003` |
| `BANGGIA_74` | Không thể xóa bảng giá đang Kích hoạt và đã Phê duyệt (đang áp dụng) | `10_060_004` |
| `dong103` | Kiểm tra giá bán sản phẩm khi nằm trong 1 bảng giá chưa bao gồm VAT, có hiệu lực tại điểm bán | `10_130_001` |
| `dong104` | Kiểm tra giá bán sản phẩm khi nằm trong 1 bảng giá gồm VAT, có hiệu lực tại điểm bán | `10_130_002` |
| `dong105` | Kiểm tra giá bán sản phẩm khi không nằm trong bảng giá nào tại điểm bán | `10_130_003` |
| `dong106` | Kiểm tra giá bán sản phẩm khi nằm trong nhiều bảng giá tại điểm bán nhưng chưa có hiệu lực | `10_130_004` |
| `dong107` | Kiểm tra giá bán sản phẩm khi nằm trong nhiều bảng giá đang có hiệu lực tại điểm bán nhưng có ngày bắt đầu khác nhau | `10_130_005` |
| `dong108` | Kiểm tra giá bán sản phẩm khi nằm trong nhiều bảng giá đang có hiệu lực tại điểm bán, có cùng ngày bắt đầu nhưng khác giờ bắt đầu | `10_130_006` |
| `dong109` | Kiểm tra giá bán sản phẩm khi nằm trong bảng giá có hiệu lực tại điểm bán khác | `10_130_007` |
| `dong110` | Kiểm tra giá bán combo khi nằm trong 1 bảng giá có hiệu lực tại điểm bán | `10_130_008` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026. Phủ 82/82 case gốc (trước đó 14), 20 → 87 case._

### 6.1 Sheet này là sheet TỐT NHẤT trong 19 file

Khác hẳn các sheet khác, `bang_gia` ghi **kỳ vọng nguyên văn đầy đủ**: toast message
(`Đã thêm x sản phẩm mới`, `Không tìm thấy sản phẩm nào`), công thức (`(Giá niêm yết − Giá bán) /
Giá niêm yết`), hành vi tự sửa giá trị (`tự động nhảy về 0`, `tự động nhảy xuống 100`), và cả tiêu đề
popup (`Cảnh báo hình thức phân phối`, `Thay đổi Phương thức tính thuế VAT`). Đã chép đúng nguyên văn
vào kỳ vọng — 🚫 không viết lại bằng lời khác.

### 6.2 🔴 Nhóm `dong103`–`dong110` là ràng buộc nền của cả hệ thống bán hàng

Tám case này không kiểm màn bảng giá mà kiểm hệ quả ở POS. Điều quan trọng nhất rút ra:
**không có bảng giá hiệu lực tại điểm bán thì KHÔNG bán được sản phẩm** (`dong105`). Đây là ràng buộc
cần biết khi làm mọi phân hệ bán hàng (`18_1`, `18_3`) — thiếu bảng giá là nguyên nhân số một của
"không thêm được sản phẩm vào bill".

Quy tắc **"bảng giá muộn nhất thắng"** (theo ngày rồi tới giờ bắt đầu) chỉ suy được từ kỳ vọng sheet;
🚫 chưa xác nhận từ code nên `10_130_005` `006` để `BLOCKED`.

### 6.3 Hai phương thức VAT cho hai con số DOANH THU khác nhau

`dong103` vs `dong104`: hai bảng giá có thể cho **cùng số tiền trên bill** nhưng **doanh thu ghi nhận
khác nhau**, vì doanh thu tính **trước VAT**. Đây là bẫy đã ghi nhận trong repo
(`revenue_post_vat_combo`). Cặp case này đo đúng chỗ đó.

### 6.4 Bốn quy tắc "tự sửa giá trị" mà người dùng không được cảnh báo

Giá niêm yết tự nhảy lên bằng giá bán (`dong51` `dong52`), tỷ lệ chiết khấu > 100 tự về 100
(`dong66`), số âm tự về 0 (`dong71`). Hệ thống **im lặng sửa số người dùng vừa nhập**. Hợp lý về mặt
ràng buộc, nhưng đáng có thông báo — đã ghi vào kỳ vọng để người test biết là hành vi cố ý.

### 6.5 Sheet dùng TRÙNG mã `BANGGIA_35`

Một lần cho *"trường tỷ lệ chiết khấu tự động tính"*, một lần cho *"Upload file Excel chứa SKU của sản
phẩm Ký gửi"*. Đã dựng đủ **hai case** (`10_100_003` và `10_090_010`), cả hai mang mã gốc
`BANGGIA_35` — công cụ đối chiếu **không khớp mã có hậu tố** (đã thử `BANGGIA_35#excel-ky-gui` và bị
báo chưa dựng, giống trường hợp `04_4`).

### 6.6 Khác biệt Mua bán / Ký gửi cần nhớ khi làm phân hệ 16 và 12_x

- Hai tập sản phẩm **tách biệt**: SKU sai hình thức ⇒ *"Không tìm thấy sản phẩm nào"*.
- Hình thức **không sửa được** sau khi lưu bảng giá.
- Ký gửi: giá bán và tỷ lệ chiết khấu **nhập tay**, không tự tính lẫn nhau.
- Ký gửi: `import_price` **đã gồm VAT**, và giá phải lọc theo **khu vực shop** — hai bẫy đã ghi nhận.
