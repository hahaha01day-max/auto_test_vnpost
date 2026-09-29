# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 04_3 — Nhập / xuất / chuyển kho

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 04_3_nhap_xuat_chuyen_kho`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `04_3_nhap_xuat_chuyen_kho`
- Tài liệu gốc liên quan: [`uat_vnpost_quan_ly_kho.csv`](../test-case-goc/uat_vnpost_quan_ly_kho.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **107** |
| — trong đó **trùng lặp** trong chính sheet gốc | 12 |
| **Case gốc đã dựng** | **95** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 97 |
| — **tài liệu gốc KHÔNG có** | 4 |

**Độ phủ tài liệu gốc: 89%**

## 2. 🔴 Case trùng lặp trong sheet gốc — 🚫 KHÔNG dựng thêm

So **toàn bộ** nội dung (tình huống, điều kiện, các bước, kết quả mong muốn), giống nhau từng ký tự.
Dựng thêm là chạy hai lần cùng một thao tác, làm độ phủ ảo và nhân đôi rủi ro ghi dữ liệu.

| Giữ lại | Bản trùng | Tình huống |
|---|---|---|
| `FUNC_1_52` | `FUNC_1_69` | Kiểm tra nhập kho từ NCC |
| `FUNC_1_53` | `FUNC_1_70` | Kiểm tra nhập kho từ Mã phiếu đặt hàng |
| `FUNC_1_54` | `FUNC_1_71` | Kiểm tra nhập kho từ nội bộ cửa hàng |
| `FUNC_1_55` | `FUNC_1_72` | Kiểm tra chỉnh sửa phiếu nhập kho khi sản phẩm trong phiếu chưa phát sinh xuất kho |
| `FUNC_1_56` | `FUNC_1_73` | Kiểm tra chỉnh sửa phiếu nhập kho khi sản phẩm trong đã phát sinh xuất kho |
| `FUNC_1_57` | `FUNC_1_74` | Kiểm tra thanh toán 1 phần phiếu nhập kho |
| `FUNC_1_58` | `FUNC_1_75` | Kiểm tra thanh toán phiếu nhập kho |
| `FUNC_1_59` | `FUNC_1_76` | Kiểm tra giá vốn sau nhập kho sản phẩm MAC |
| `FUNC_1_60` | `FUNC_1_77` | Kiểm tra giá vốn sau nhập kho sản phẩm FIFO |
| `FUNC_1_61` | `FUNC_1_78` | Kiểm tra giá vốn sau nhập kho sản phẩm thực tế đích danh |
| `FUNC_1_62` | `FUNC_1_79` | Kiểm tra giá vốn sau nhập kho sản phẩm giá tiêu chuẩn |
| `FUNC_1_63` | `FUNC_1_80` | Kiểm tra lô hàng |

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 4 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `04_3_020_001` | Mở Phiếu nhập kho và validate rỗng | HDSD 020 |
| `04_3_030_001` | Mở Phiếu xuất kho và validate rỗng | HDSD 030 |
| `04_3_060_001` | Tạo phiếu chuyển kho - mở form và validate | HDSD 060 |
| `04_3_080_001` | Mở màn Chuyển kho | HDSD 080 |

## 5. Bảng đối chiếu đầy đủ 107 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `FUNC_1_26` | Kiểm tra giao diện | `04_3_010_001` |
| `FUNC_1_27` | Kiểm tra bộ lọc điểm bán | `04_3_010_002` |
| `FUNC_1_28` | Kiểm tra tìm kiếm theo mã phiếu | `04_3_010_003` |
| `FUNC_1_29` | Kiểm tra tìm kiếm mã không tồn tại | `04_3_010_004` |
| `FUNC_1_30` | Kiểm tra xuất excel ở Thẻ kho | `04_3_010_005` |
| `FUNC_1_31` | Kiểm tra xuất excel danh sách phiếu nhập | `04_3_010_006` |
| `FUNC_1_32` | Kiểm tra xuất excel danh sách phiếu xuất | `04_3_010_007` |
| `FUNC_1_33` | Kiểm tra bộ lọc Phân loại sản phẩm | `04_3_010_008` |
| `FUNC_1_34` | Kiểm tra lọc theo Nguồn nhập/xuất | `04_3_010_009` |
| `FUNC_1_35` | Kiểm tra Lọc theo Phân loại phiếu nhập | `04_3_010_010` |
| `FUNC_1_36` | Kiểm tra Lọc theo Phân loại phiếu xuất | `04_3_010_011` |
| `FUNC_1_37` | Kiểm tra Xem chi tiết phiếu nhập kho | `04_3_010_012` |
| `FUNC_1_38` | Kiểm tra Xem chi tiết phiếu xuất kho | `04_3_010_013` |
| `FUNC_1_39` | Kiểm tra upload chứng từ đi kèm | `04_3_010_014` |
| `FUNC_1_40` | Kiểm tra upload vượt giới hạn ảnh chứng từ đi kèm | `04_3_010_015` |
| `FUNC_1_41` | Kiểm tra tải xuống ảnh chứng từ | `04_3_010_016` |
| `FUNC_1_42` | Kiểm tra xoá ảnh chứng từ | `04_3_010_017` |
| `FUNC_1_43` | Kiểm tra upload đúng số hạn ảnh chứng từ | `04_3_010_018` |
| `FUNC_1_44` | Kiểm tra giá vốn khi xuất kho sản phẩm BQGQ | `04_3_010_019` |
| `FUNC_1_45` | Kiểm tra giá vốn khi xuất kho sản phẩm FIFO | `04_3_010_020` |
| `FUNC_1_46` | Kiểm tra hiển thị thông tin lô sản phẩm thực tế đích danh | `04_3_010_021` |
| `FUNC_1_47` | Kiểm tra giá vốn khi xuất kho sản phẩm giá tiêu chuẩn | `04_3_010_022` |
| `FUNC_1_48` | Kiểm tra tạo phiếu nhập kho nháp | `04_3_020_002` |
| `FUNC_1_49` | Kiểm tra chỉnh sửa phiếu nhập kho nháp | `04_3_020_003` |
| `FUNC_1_50` | Kiểm tra duyệt phiếu nháp | `04_3_020_004` |
| `FUNC_1_51` | Kiểm tra thông tin tự động fill khi tạo phiếu nhập kho | `04_3_020_005` |
| `FUNC_1_52` | Kiểm tra nhập kho từ NCC | `04_3_020_006` |
| `FUNC_1_53` | Kiểm tra nhập kho từ Mã phiếu đặt hàng | `04_3_020_007` |
| `FUNC_1_54` | Kiểm tra nhập kho từ nội bộ cửa hàng | `04_3_020_008` |
| `FUNC_1_55` | Kiểm tra chỉnh sửa phiếu nhập kho khi sản phẩm trong phiếu chưa phát sinh xuất kho | `04_3_020_009` |
| `FUNC_1_56` | Kiểm tra chỉnh sửa phiếu nhập kho khi sản phẩm trong đã phát sinh xuất kho | `04_3_020_010` |
| `FUNC_1_57` | Kiểm tra thanh toán 1 phần phiếu nhập kho | `04_3_020_011` |
| `FUNC_1_58` | Kiểm tra thanh toán phiếu nhập kho | `04_3_020_012` |
| `FUNC_1_59` | Kiểm tra giá vốn sau nhập kho sản phẩm MAC | `04_3_020_013` |
| `FUNC_1_60` | Kiểm tra giá vốn sau nhập kho sản phẩm FIFO | `04_3_020_014` |
| `FUNC_1_61` | Kiểm tra giá vốn sau nhập kho sản phẩm thực tế đích danh | `04_3_020_015` |
| `FUNC_1_62` | Kiểm tra giá vốn sau nhập kho sản phẩm giá tiêu chuẩn | `04_3_020_016` |
| `FUNC_1_63` | Kiểm tra lô hàng | `04_3_020_017` |
| `FUNC_1_64` | Kiểm tra giao diện màn hình | `04_3_040_001` |
| `FUNC_1_65` | Kiểm tra lập chứng từ huỷ phiếu nhập kho | `04_3_040_002` |
| `FUNC_1_66` | Kiểm tra chi tiết thông tin phiếu đã huỷ | `04_3_040_003` |
| `FUNC_1_67` | Kiểm tra không nhập lí do huỷ phiếu | `04_3_040_004` |
| `FUNC_1_68` | Kiểm tra công nợ NCC | `04_3_040_005` |
| `FUNC_1_69` | Kiểm tra nhập kho từ NCC | — **chưa dựng** |
| `FUNC_1_70` | Kiểm tra nhập kho từ Mã phiếu đặt hàng | — **chưa dựng** |
| `FUNC_1_71` | Kiểm tra nhập kho từ nội bộ cửa hàng | — **chưa dựng** |
| `FUNC_1_72` | Kiểm tra chỉnh sửa phiếu nhập kho khi sản phẩm trong phiếu chưa phát sinh xuất kho | — **chưa dựng** |
| `FUNC_1_73` | Kiểm tra chỉnh sửa phiếu nhập kho khi sản phẩm trong đã phát sinh xuất kho | — **chưa dựng** |
| `FUNC_1_74` | Kiểm tra thanh toán 1 phần phiếu nhập kho | — **chưa dựng** |
| `FUNC_1_75` | Kiểm tra thanh toán phiếu nhập kho | — **chưa dựng** |
| `FUNC_1_76` | Kiểm tra giá vốn sau nhập kho sản phẩm MAC | — **chưa dựng** |
| `FUNC_1_77` | Kiểm tra giá vốn sau nhập kho sản phẩm FIFO | — **chưa dựng** |
| `FUNC_1_78` | Kiểm tra giá vốn sau nhập kho sản phẩm thực tế đích danh | — **chưa dựng** |
| `FUNC_1_79` | Kiểm tra giá vốn sau nhập kho sản phẩm giá tiêu chuẩn | — **chưa dựng** |
| `FUNC_1_80` | Kiểm tra lô hàng | — **chưa dựng** |
| `FUNC_1_144` | Kiểm tra giao diện | `04_3_060_002` |
| `FUNC_1_145` | Kiểm tra tìm kiếm mã chuyển kho | `04_3_060_003` |
| `FUNC_1_146` | Kiểm tra bộ lọc khoảng thời gian | `04_3_060_004` |
| `FUNC_1_147` | Kiểm tra bộ lọc chọn điểm bán/kho | `04_3_060_005` |
| `FUNC_1_148` | Kiểm tra tạo phiếu chuyển kho TCT xuống Tỉnh | `04_3_070_001` |
| `FUNC_1_149` | Kiểm tra tồn kho của TCT | `04_3_070_002` |
| `FUNC_1_150` | Kiểm tra tỉnh xác nhận chuyển kho từ TCT | `04_3_070_003` |
| `FUNC_1_151` | Kiểm tra tồn kho của tỉnh | `04_3_070_004` |
| `FUNC_1_152` | Kiểm tra nhập kho của tỉnh | `04_3_070_005` |
| `FUNC_1_153` | Kiểm tra công nợ Tỉnh và TCT | `04_3_070_006` |
| `FUNC_1_154` | Kiểm tra chọn các trường bắt buộc | `04_3_060_006` |
| `FUNC_1_155` | Kiểm tra nhập đầy đủ thông tin phiếu chuyển kho | `04_3_060_007` |
| `FUNC_1_156` | Kiểm tra nhập số lượng chuyển kho nhỏ hơn hoặc bằng số lượng trong kho | `04_3_060_008` |
| `FUNC_1_157` | Kiểm tra nhập số lượng lớn hơn số lượng trong kho | `04_3_060_009` |
| `FUNC_1_158` | Kiểm tra tạo phiếu chuyển kho tỉnh xuống điểm bán/kho | `04_3_070_007` |
| `FUNC_1_159` | Kiểm tra tồn kho của tỉnh | `04_3_070_008` |
| `FUNC_1_160` | Kiểm tra điểm bán/kho xác nhận chuyển kho từ tỉnh | `04_3_070_009` |
| `FUNC_1_161` | Kiểm tra tồn kho của điểm bán/kho | `04_3_070_010` |
| `FUNC_1_162` | Kiểm tra nhập kho của điểm bán/kho | `04_3_070_011` |
| `FUNC_1_163` | Kiểm tra công nợ khi tỉnh chuyển kho về điểm bán | `04_3_070_012` |
| `FUNC_1_164` | Kiểm tra tải ảnh khi tạo phiếu | `04_3_060_016` |
| `FUNC_1_165` | Kiểm tra in phiếu lấy hàng | `04_3_060_017` |
| `FUNC_1_166` | Kiểm tra in biên bản bàn giao | `04_3_060_018` |
| `FUNC_1_167` | Kiểm tra thay đổi giá vốn khi xuất kho ngay khi chuyển kho | `04_3_060_014` |
| `FUNC_1_168` | Kiểm tra thay đổi giá vốn khi không xuất kho ngay khi chuyển kho | `04_3_060_015` |
| `FUNC_1_420` | Tạo phiếu xuất kho nháp | `04_3_030_002` |
| `FUNC_1_421` | Sửa số lượng trên phiếu xuất | `04_3_030_003` |
| `FUNC_1_422` | Xuất kho từ 1 lô hàng xác định | `04_3_030_004` |
| `FUNC_1_423` | Xuất kho từ nhiều lô khác nhau | `04_3_030_005` |
| `FUNC_1_424` | Xuất toàn bộ số lượng của lô | `04_3_030_006` |
| `FUNC_1_425` | Xuất vượt tồn kho của lô | `04_3_030_007` |
| `FUNC_1_426` | Xuất kho khi tồn = 0 | `04_3_030_008` |
| `FUNC_1_427` | Xuất kho khi tồn âm | `04_3_030_009` |
| `FUNC_1_428` | Xuất kho chọn mã serial | `04_3_030_010` |
| `FUNC_1_429` | Nhập thêm lô mới không ảnh hưởng lô cũ | `04_3_050_001` |
| `FUNC_1_430` | Nhập kho từ đơn đặt hàng nhà cung cấp | `04_3_050_002` |
| `FUNC_1_431` | Nhập kho có lô mới trùng với lô đã có, xác nhận gộp lô | `04_3_050_003` |
| `FUNC_1_432` | Nhập kho có lô mới trùng với lô đã có, chỉnh sửa tên của lô mới | `04_3_050_004` |
| `FUNC_1_433` | Nhập kho sản phẩm có 1 lô từ đơn hoàn trả | `04_3_050_005` |
| `FUNC_1_434` | Nhập kho sản phẩm có nhiều lô từ đơn hoàn trả | `04_3_050_006` |
| `FUNC_1_435` | Chỉnh sửa phiếu nhập của lô chưa phát sinh xuất | `04_3_050_007` |
| `FUNC_1_436` | Chỉnh sửa phiếu nhập của lô đã phát sinh xuất kho | `04_3_050_008` |
| `FUNC_1_437` | Theo dõi lịch sử lô hàng | `04_3_050_009` |
| `FUNC_1_438` | Nhập kho khi tồn âm | `04_3_050_010` |
| `FUNC_1_439` | Chuyển kho xuất ngay | `04_3_060_014` |
| `FUNC_1_440` | Chuyển kho không xuất ngay | `04_3_060_015` |
| `FUNC_1_441` | Chuyển kho khi tồn = 0 | `04_3_060_010` |
| `FUNC_1_442` | Chuyển kho khi tồn âm | `04_3_060_011` |
| `FUNC_1_443` | Chuyển kho nhiều lô trên một lần chuyển | `04_3_060_012` |
| `FUNC_1_444` | Chuyển kho lần 2, cùng 1 lô, cùng 1 điểm nhận, có gộp lô | `04_3_070_013` |
| `FUNC_1_445` | Chuyển kho lần 2, cùng 1 lô, cùng 1 điểm nhận, không gộp lô | `04_3_070_014` |
| `FUNC_1_446` | Chuyển kho theo mã serial | `04_3_060_013` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026. Phủ 107/107 case gốc (trước đó 1), 5 → 97 case._

### 6.1 Đây là phân hệ ghi nặng nhất — 70/97 case chạm tồn kho, giá vốn hoặc công nợ

Không có cách nào kiểm giá vốn MAC / FIFO / đích danh / giá tiêu chuẩn mà không **nhập kho thật rồi
xuất kho thật**; không có cách nào kiểm chuyển kho đa cấp mà không **chuyển hàng thật giữa ba cấp**.
Vì thế 76/97 case để `enabled:false`. 🚫 Đã KHÔNG hạ kỳ vọng xuống "màn hình không báo lỗi" để lấy
case chạy được — làm vậy là đóng băng luôn cả lỗi giá vốn đang có.

Điều kiện mở khoá liệt kê ở `test-cases.md` mục 6 (kho dựng riêng · bộ sản phẩm đủ 4 phương pháp tính
giá · ba cấp đơn vị liên thông · chính sách tồn âm khai rõ).

### 6.2 🔴 Bốn nhóm câu hỏi SỐ TIỀN sheet QC không trả lời

1. **Sửa phiếu nhập khi đã phát sinh xuất** (`FUNC_1_56` `FUNC_1_436`): sheet chỉ ghi tình huống,
   không ghi kỳ vọng. Hai câu chưa có đáp: có chặn giảm số lượng dưới số đã xuất, và giá vốn các
   phiếu xuất đã phát sinh có được tính lại.
2. **Tồn âm** (`FUNC_1_427` `FUNC_1_442`): chặn hay cho đi tiếp, và nếu cho thì lấy giá vốn ở đâu khi
   không còn lô. Đây chính là gốc của sai số giá vốn.
3. **Tồn = 0** (`FUNC_1_426` `FUNC_1_441`): kỳ vọng phụ thuộc **chính sách tồn âm của từng điểm bán**
   — cùng một case cho hai kết quả khác nhau tuỳ cấu hình. Script phải đọc cấu hình trước.
4. **Giới hạn số ảnh chứng từ** (`FUNC_1_40` `FUNC_1_43`): sheet đòi kiểm biên trên và biên vượt
   nhưng **không nói con số**. Nếu màn hình cũng không ghi ra thì đó là lỗ hổng UX, đáng báo.

### 6.3 Hai case là CHỐT CHẶN cho một lỗi đã xảy ra thật

`04_3_070_005` và `04_3_070_011` kiểm *"phiếu nhập kho được sinh ở cấp nhận"*. Repo đã từng gặp lỗi
**thiếu phiếu IMPORT ở cấp trên gây tồn âm** trong luồng trả hàng nhiều cấp. Hai case này giữ đúng
chỗ đó khỏi vỡ lại — 🚫 đừng bỏ vì "trùng với case xác nhận nhận hàng".

### 6.4 Huỷ phiếu nhập là BÚT TOÁN ĐẢO, không phải xoá

`FUNC_1_65`–`68` mô tả đúng nghiệp vụ: huỷ phiếu sinh một chứng từ ở danh sách phiếu **xuất** loại
*"Điều chỉnh phiếu nhập"*, phiếu gốc mang nhãn *"Đã huỷ (chứng từ đảo)"* và **giữ nguyên các dòng**,
sổ công nợ NCC có **thêm một dòng cấn trừ** chứ không sửa dòng cũ. Đã dựng đủ 5 case và ghi rõ cấm
sửa/xoá dòng công nợ cũ.

### 6.5 Trạng thái nháp là mốc quan trọng nhất khi viết assert

`FUNC_1_48` `FUNC_1_420` cho thấy phiếu **nháp KHÔNG ghi tồn**; chỉ khi **duyệt** (`FUNC_1_50`) tồn
mới đổi. Mọi case ghi phải nói rõ đang ở mốc nào, nếu không thì đo tồn ra số sai mà tưởng lỗi hệ thống.

### 6.6 Chuyển kho: "xuất ngay" đổi hẳn mốc ghi tồn

`FUNC_1_439` `440` `167` `168` chia hai nhánh theo cấu hình **xuất ngay khi chuyển kho**: bật thì tồn
bên chuyển giảm **lúc lập phiếu**, tắt thì giảm ở mốc sau. Giá vốn cũng chốt ở đúng mốc đó. Script
phải đọc cấu hình trước khi đo, 🚫 không giả định.
