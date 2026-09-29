# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 08 — Quản lý sản phẩm

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 08_quan_ly_san_pham`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `08_quan_ly_san_pham`
- Tài liệu gốc liên quan: [`uat_vnpost_ban_ton_kho_am.csv`](../test-case-goc/uat_vnpost_ban_ton_kho_am.csv) · [`uat_vnpost_danh_muc_san_pham.csv`](../test-case-goc/uat_vnpost_danh_muc_san_pham.csv) · [`uat_vnpost_san_pham.csv`](../test-case-goc/uat_vnpost_san_pham.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **132** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **132** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 99 |
| — **tài liệu gốc KHÔNG có** | 9 |

**Độ phủ tài liệu gốc: 100%**

## 2. 🔴 Case trùng lặp trong sheet gốc — 🚫 KHÔNG dựng thêm

So **toàn bộ** nội dung (tình huống, điều kiện, các bước, kết quả mong muốn), giống nhau từng ký tự.
Dựng thêm là chạy hai lần cùng một thao tác, làm độ phủ ảo và nhân đôi rủi ro ghi dữ liệu.

| Giữ lại | Bản trùng | Tình huống |
|---|---|---|
| `dong12` | `dong12` | Kiểm tra hiển thị màn hình Thêm danh mục |
| `dong13` | `dong13` | Kiểm tra dữ liệu trường Danh mục cha |
| `dong15` | `dong15` | Kiểm tra hiển thị màn hình Sửa danh mục |
| `dong17` | `dong17` | Kiểm tra hiển thị bảng danh sách danh mục |

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 9 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `08_010_001` | Mở màn danh sách sản phẩm | HDSD 010 |
| `08_020_002` | Thêm sản phẩm - kiểm tra thông tin vật lý, giá bán, kho hàng | HDSD 020 |
| `08_020_004` | Thêm sản phẩm - chọn Ký gửi hiển thị Loại hàng ký gửi | HDSD 020 |
| `08_060_004` | Nhập danh mục từ Excel - validate chưa chọn file | HDSD 060 |
| `08_060_005` | Nhập danh mục từ Excel - hiển thị tải file mẫu | HDSD 060 |
| `08_070_001` | Nhập sản phẩm từ Excel - mở drawer import | HDSD 070 |
| `08_070_002` | Nhập sản phẩm từ Excel - validate chưa chọn file | HDSD 070 |
| `08_080_001` | In tem nhãn - mở drawer cấu hình | HDSD 080 |
| `08_080_002` | In tem nhãn - hiển thị tùy chọn mẫu giấy và mã vạch | HDSD 080 |

## 5. Bảng đối chiếu đầy đủ 132 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `dong12` | Kiểm tra hiển thị màn hình Thêm danh mục | `08_060_002` |
| `dong13` | Kiểm tra dữ liệu trường Danh mục cha | `08_060_002` |
| `dong15` | Kiểm tra hiển thị màn hình Sửa danh mục | `08_060_026` |
| `dong17` | Kiểm tra hiển thị bảng danh sách danh mục | `08_060_001` |
| `dong12` | Kiểm tra hiển thị màn hình Thêm danh mục | `08_060_002` |
| `dong13` | Kiểm tra dữ liệu trường Danh mục cha | `08_060_002` |
| `dong15` | Kiểm tra hiển thị màn hình Sửa danh mục | `08_060_026` |
| `dong17` | Kiểm tra hiển thị bảng danh sách danh mục | `08_060_001` |
| `dong20` | Kiểm tra chức năng thêm danh mục thành công với các trường thông tin hợp lệ | `08_060_006` |
| `dong21` |  | `08_060_007` |
| `dong22` | Kiểm tra chức năng thêm danh mục khi bỏ trống các trường bắt buộc | `08_060_003` |
| `dong23` | Kiểm tra chức năng thêm danh mục khi khai báo các trường không hợp lệ | `08_060_008` |
| `dong24` |  | `08_060_007` |
| `dong26` | Kiểm tra khi sửa trường tên danh mục | `08_060_006` |
| `dong27` |  | `08_060_009` |
| `dong28` | Kiểm tra để trống các trường bắt buộc khi sửa | `08_060_010` |
| `dong29` | Kiểm tra khi sửa trường Danh mục cha | `08_060_011` |
| `dong30` |  | `08_060_009` |
| `dong31` |  | `08_060_009` |
| `dong32` |  | `08_060_009` |
| `dong33` |  | `08_060_009` |
| `dong34` |  | `08_060_009` |
| `dong36` | Kiểm tra Xóa danh mục cấp nhỏ nhất không chứa sản phẩm nào | `08_060_012` |
| `dong37` | Kiểm tra Xóa danh mục cấp nhỏ nhất có chứa sản phẩm | `08_060_013` |
| `dong38` | Kiểm tra Xóa danh mục cấp cha, trong đó danh mục cấp nhỏ nhất trong cây danh mục không chứa sản phẩm | `08_060_014` |
| `dong39` | Kiểm tra Xóa danh mục cấp cha, trong đó danh mục cấp nhỏ nhất trong cây danh mục có chứa sản phẩm | `08_060_015` |
| `dong40` | Kiểm tra Xóa danh mục khi đang nằm trong CTKM | `08_060_016` |
| `dong42` | Kiểm tra Tìm kiếm danh mục chứa 1 phần từ khóa | `08_060_017` |
| `dong43` | Kiểm tra Tìm kiếm danh mục chứa full từ khóa | `08_060_018` |
| `dong44` | Kiểm tra Tìm kiếm danh mục không chứa từ khóa | `08_060_019` |
| `dong45` | Kiểm tra Tìm kiếm sau đó xóa tìm kiếm | `08_030_009`, `08_060_020` |
| `dong47` | Kiểm tra Import file chức các danh mục hợp lệ | `08_060_021` |
| `dong48` | Kiểm tra Import file chức các danh mục không hợp lệ | `08_030_012`, `08_060_022` |
| `dong49` | Kiểm tra Import file chức cả danh mục hợp lệ và không hợp lệ | `08_060_023` |
| `dong50` | Kiểm tra tải file Import mẫu | `08_060_024` |
| `dong52` | Kiểm tra tải file excel danh mục hiện có | `08_060_025` |
| `dong13` | Kiểm tra giao diện tiêu đề và tên các trường | `08_060_002` |
| `SANPHAM_1` | Kiểm tra giao diện trường SKU và Barcode trên phần Thông tin cơ bản khi bỏ trống và thêm biến thể | `08_020_001` |
| `SANPHAM_2` | Kiểm tra giao diện trường SKU và Barcode trên phần Thông tin cơ bản khi nhập và sau đó thêm biến thể | `08_020_001` |
| `SANPHAM_3` | Kiểm tra giao diện trường SKU và Barcode trên phần Thông tin cơ bản khi thêm biến thể sau đó xóa biến thể | `08_020_005` |
| `SANPHAM_4` | Kiểm tra giao diện trường SKU và Barcode trên phần Thông tin cơ bản khi nhập và xóa, sau đó thêm biến thể | `08_020_006` |
| `SANPHAM_5` | Kiểm tra giao diện cột/trường SKU và Barcode của bảng Bảng quy đổi đơn vị khi bỏ trống và thêm biến thể | `08_020_007` |
| `SANPHAM_6` | Kiểm tra giao diện cột/trường SKU và Barcode của bảng Bảng quy đổi đơn vị khi nhập sau đó thêm biến thể | `08_020_008` |
| `SANPHAM_7` | Kiểm tra giao diện cột/trường SKU và Barcode của bảng Bảng quy đổi đơn vị khi thêm biến thể và xóa biến thể | `08_020_009` |
| `SANPHAM_8` | Kiểm tra thêm sản phẩm khi bỏ trống toàn bộ các trường bắt buộc | `08_020_003` |
| `SANPHAM_9` | Thêm mới sản phẩm thủ công với đầy đủ các thông tin bắt buộc | `08_030_001` |
| `SANPHAM_10` | Kiểm tra tính duy nhất của SKU | `08_020_010` |
| `SANPHAM_11` | Kiểm tra validate các trường cần nhập số (Khối lượng, Thể tích, Kích thước) | `08_020_011` |
| `SANPHAM_12` | Kiểm tra tính năng thêm nhanh danh mục | `08_020_012` |
| `SANPHAM_13` | Thêm sản phẩm có cấu hình Đơn vị quy đổi (Không có biến thể) thành công. | `08_020_013` |
| `SANPHAM_14` | Tạo sản phẩm có biến thể nhưng không có đơn vị quy đổi thành công. | `08_020_014` |
| `SANPHAM_15` | Tạo sản phẩm có biến thể đồng thời áp dụng đơn vị quy đổi thành công. | `08_020_015` |
| `SANPHAM_16` | Kiểm tra thêm mới sản phẩm công khi chọn danh mục cha trong cây danh mục | `08_020_016` |
| `SANPHAM_17` | Kiểm tra thêm thuộc tính bổ sung | `08_020_017` |
| `SANPHAM_18` | Kiểm tra tải lên hình ảnh minh họa | `08_020_018` |
| `SANPHAM_19` | Kiểm tra tải lên ảnh sai định dạng hoặc quá dung lượng | `08_020_019` |
| `SANPHAM_20` | Kiểm tra thêm mới sản phẩm thủ công với đầy đủ các thông tin (bao gồm cả thông tin không bắt buộc) | `08_020_020` |
| `SANPHAM_21` | Kiểm tra chức năng xem chi tiết sản phẩm | `08_030_002` |
| `SANPHAM_22` | Kiểm tra đóng pop up chi tiết sản phẩm | `08_030_003` |
| `SANPHAM_23` | Kiểm tra chỉnh sửa sản phẩm khi xóa các trường bắt buộc | `08_030_004` |
| `SANPHAM_24` | Kiểm tra chỉnh sửa sản phẩm khi sửa SKU trùng với SKU đã có trên hệ thống | `08_030_005` |
| `SANPHAM_25` | Kiểm tra chỉnh sửa sản phẩm khi sửa Barcode trùng với Barcode đã có trên hệ thống | `08_030_006` |
| `SANPHAM_26` | Kiểm tra chỉnh sửa sản phẩm khi xóa 1 vài biến thể (các biến thể được xóa chưa phát sinh giao dịch) | `08_030_007` |
| `SANPHAM_27` | Kiểm tra chỉnh sửa sản phẩm khi xóa tất cả biến thể (các biến thể được xóa chưa phát sinh giao dịch) | `08_030_008` |
| `dong45` | Kiểm tra chỉnh sửa sản phẩm khi xóa các biến thể (các biến thể được xóa đã phát sinh giao dịch) | `08_030_009`, `08_060_020` |
| `SANPHAM_28` | Kiểm tra chỉnh sửa sản phẩm khi xóa 1 vài đơn vị quy đổi (đơn vị quy đổi chưa phát sinh giao dịch) | `08_030_010` |
| `SANPHAM_29` | Kiểm tra chỉnh sửa sản phẩm khi xóa tất cả đơn vị quy đổi (đơn vị quy đổi chưa phát sinh giao dịch) | `08_030_011` |
| `dong48` | Kiểm tra chỉnh sửa sản phẩm khi xóa các đơn vị quy đổi (đơn vị quy đổi đã phát sinh giao dịch) | `08_030_012`, `08_060_022` |
| `SANPHAM_30` | Kiểm tra chỉnh sửa sản phẩm thành công | `08_030_001` |
| `SANPHAM_31` | Kiểm tra hủy chỉnh sửa sản phẩm | `08_030_013` |
| `SANPHAM_32` | Kiểm tra xóa sản phẩm thành công với sản phẩm chưa phát sinh giao dịch | `08_030_001` |
| `SANPHAM_33` | Kiểm tra xóa sản phẩm khi đã phát sinh giao dịch | `08_030_014` |
| `dong53` | Kiểm tra xóa sản phẩm khi đang nằm trong đơn nháp và chưa phát sinh phiếu kho | `08_030_015` |
| `dong54` | Kiểm tra xóa sản phẩm thành công với các sản phẩm khi đang nằm trong đơn nháp và chưa phát sinh phiếu kho, sau đó xóa đơn nháp | `08_030_016` |
| `dong55` | Kiểm tra xóa sản phẩm khi đang nằm trong CTKM | `08_030_017` |
| `dong56` | Kiểm tra xóa sản phẩm khi đang nằm trong combo | `08_030_018` |
| `dong57` | Kiểm tra xóa sản phẩm khi đang nằm trong bảng giá | `08_030_019` |
| `SANPHAM_35` | Kiểm tra tìm kiếm theo tên chính xác | `08_010_002` |
| `SANPHAM_36` | Kiểm tra tìm kiếm theo tên tương đối | `08_040_001` |
| `SANPHAM_37` | Kiểm tra tìm kiếm tên không tồn tại | `08_040_002` |
| `SANPHAM_38` | Kiểm tra tìm kiếm theo SKU chính xác | `08_010_002` |
| `SANPHAM_39` | Kiểm tra tìm kiếm theo SKU tương đối | `08_040_003` |
| `SANPHAM_40` | Kiểm tra tìm kiếm SKU không tồn tại | `08_040_004` |
| `SANPHAM_41` | Kiểm tra lọc theo mã, tên danh mục | `08_010_002` |
| `SANPHAM_42` | Kiểm tra lọc theo trạng thái | `08_040_005` |
| `SANPHAM_43` | Kiểm tra lọc theo hình thức phân phối | `08_040_006` |
| `SANPHAM_45` | Kiểm tra chức năng Cấu hình ngừng kích hoạt sản phẩm khi nhập đày đủ thông tin | `08_050_001` |
| `SANPHAM_46` | Kiểm tra chức năng ngừng kích hoạt sản phẩm khi không chọn phạm vi áp dụng nào | `08_050_002` |
| `SANPHAM_47` | Kiểm tra chức năng Cập nhật cấu hình ngừng kích hoạt sản phẩm | `08_050_003` |
| `SANPHAM_48` | Kiểm tra chức năng Kích hoạt lại sản phẩm | `08_050_004` |
| `SANPHAM_50` | Kiểm tra thêm combo khi bỏ trống toàn bộ các trường bắt buộc | `08_090_001` |
| `SANPHAM_51` | Kiểm tra thêm mới combo thủ công với đầy đủ các thông tin bắt buộc | `08_090_002` |
| `SANPHAM_52` | Kiểm tra thêm mới combo thủ công khi chọn danh mục cha trong cây danh mục | `08_090_003` |
| `SANPHAM_53` | Kiểm tra bỏ trống sản phẩm trong danh sách | `08_090_004` |
| `SANPHAM_54` | Kiểm tra thêm sản phẩm mặc định trùng với sản phẩm đã có trong bảng | `08_090_005` |
| `SANPHAM_55` | Kiểm tra thêm sản phẩm có biến thể | `08_090_006` |
| `SANPHAM_56` |  | `08_090_006` |
| `SANPHAM_57` | Kiểm tra thêm trùng biến thể trùng với sản phẩm đã có trong bảng | `08_090_007` |
| `SANPHAM_58` | Kiểm tra tính duy nhất của SKU | `08_090_008` |
| `SANPHAM_59` | Kiểm tra validate các trường cần nhập số (Khối lượng, Thể tích, Kích thước) | `08_090_009` |
| `SANPHAM_60` | Kiểm tra tính năng thêm nhanh danh mục | `08_090_010` |
| `SANPHAM_61` | Kiểm tra thêm thuộc tính bổ sung | `08_090_011` |
| `SANPHAM_62` | Kiểm tra tải lên hình ảnh minh họa | `08_090_012` |
| `SANPHAM_63` | Kiểm tra tải lên ảnh sai định dạng hoặc quá dung lượng | `08_090_013` |
| `SANPHAM_64` | Kiểm tra thêm mới sản phẩm thủ công với đầy đủ các thông tin (bao gồm cả thông tin không bắt buộc) | `08_090_014` |
| `SANPHAM_66` | Kiểm tra chức năng xem chi tiết sản phẩm | `08_030_002` |
| `SANPHAM_67` | Kiểm tra đóng drawer "Chi tiết sản phẩm gộp" | `08_030_003` |
| `SANPHAM_68` | Kiểm tra chỉnh sửa combo sản phẩm khi xóa các trường bắt buộc | `08_030_004` |
| `SANPHAM_69` | Kiểm tra chỉnh sửa sản phẩm khi sửa SKU trùng với SKU đã có trên hệ thống | `08_030_005` |
| `SANPHAM_70` | Kiểm tra chỉnh sửa sản phẩm khi sửa Barcode trùng với Barcode đã có trên hệ thống | `08_030_006` |
| `SANPHAM_71` | Kiểm tra chỉnh sửa combo sản phẩm khi xóa hết các sản phẩm trong bảng danh sách | `08_030_020` |
| `SANPHAM_72` | Kiểm tra chỉnh sửa sản phẩm thành công | `08_030_021` |
| `SANPHAM_73` | Kiểm tra hủy chỉnh sửa sản phẩm | `08_030_013` |
| `SANPHAM_74` | Kiểm tra xóa combo sản phẩm chưa phát sinh giao dịch | `08_030_022` |
| `SANPHAM_75` | Kiểm tra xóa sản phẩm thành công với các combo sản phẩm khi đã phát sinh giao dịch | `08_030_014` |
| `SANPHAM_76` | Kiểm tra xóa sản phẩm thành công với các combo sản phẩm khi đang nằm trong đơn nháp và chưa phát sinh phiếu kho | `08_030_015` |
| `SANPHAM_77` | Kiểm tra xóa sản phẩm thành công với các combo sản phẩm khi đang nằm trong đơn nháp và chưa phát sinh phiếu kho, sau đó xóa đơn nháp | `08_030_016` |
| `dong102` | Kiểm tra xóa combo sản phẩm khi đang nằm trong CTKM | `08_030_017` |
| `dong103` | Kiểm tra xóa combo sản phẩm khi đang nằm trong bảng giá | `08_030_019` |
| `SANPHAM_79` | Kiểm tra tìm kiếm theo tên chính xác | `08_040_007` |
| `SANPHAM_80` | Kiểm tra tìm kiếm theo tên tương đối | `08_040_001` |
| `SANPHAM_81` | Kiểm tra tìm kiếm tên không tồn tại | `08_040_002` |
| `SANPHAM_82` | Kiểm tra tìm kiếm theo SKU chính xác | `08_040_007` |
| `SANPHAM_83` | Kiểm tra tìm kiếm theo SKU tương đối | `08_040_003` |
| `SANPHAM_84` | Kiểm tra tìm kiếm SKU không tồn tại | `08_040_004` |
| `SANPHAM_85` | Kiểm tra lọc theo mã, tên danh mục | `08_040_007` |
| `SANPHAM_86` | Kiểm tra lọc theo trạng thái | `08_040_005` |
| `SANPHAM_87` | Kiểm tra lọc theo hình thức phân phối | `08_040_006` |
| `SANPHAM_89` | Kiểm tra chức năng Cấu hình ngừng kích hoạt sản phẩm khi nhập đày đủ thông tin | `08_050_001` |
| `SANPHAM_90` | Kiểm tra chức năng ngừng kích hoạt sản phẩm khi không chọn phạm vi áp dụng nào | `08_050_002` |
| `SANPHAM_91` | Kiểm tra chức năng Cập nhật cấu hình ngừng kích hoạt sản phẩm | `08_050_003` |
| `SANPHAM_92` | Kiểm tra chức năng Kích hoạt lại sản phẩm | `08_050_004` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026. Phủ 132/132 case gốc (trước đó 15), 17 → 98 case._

### 6.1 🔴 Chín case gốc TRỐNG cột tình huống

`dong21` `dong24` (thêm danh mục), `dong27` `dong30` `dong31` `dong32` `dong33` `dong34` (sửa danh
mục), `SANPHAM_56` (thêm combo) — chỉ có mã, **không có nội dung mô tả**. Không có cách nào biết
chúng kiểm gì.

Đã xử lý bằng hai case thay thế (`08_060_007` `08_060_009`) liệt kê **đủ ô và ràng buộc thật** của
drawer thêm / sửa danh mục, để user đối chiếu và bổ sung. `SANPHAM_56` gộp vào `08_090_006` (thêm sản
phẩm có biến thể vào combo) vì nằm ngay sau `SANPHAM_55` cùng chủ đề. 🚫 Không đoán nội dung.

### 6.2 🔴 Hai case gốc là câu hỏi MẤT DỮ LIỆU, không có kỳ vọng

- `dong45` — xoá biến thể **đã phát sinh giao dịch**: tồn kho và các phiếu cũ của biến thể đó đi đâu?
- `dong48` — xoá đơn vị quy đổi **đã dùng trong phiếu kho**: số lượng trên phiếu cũ còn đọc đúng không?

Cả hai đều để `BLOCKED`. Đây là loại câu hỏi phải trả lời trước khi ai chạy case, vì nếu hệ thống cho
xoá thì dữ liệu lịch sử vỡ mà không có cảnh báo.

### 6.3 Năm case gốc chạm đúng hai bẫy ĐƠN VỊ đã gặp thật

`SANPHAM_3`–`7` kiểm SKU/Barcode khi thêm rồi xoá biến thể. Đây chính là chỗ sinh:

- **biến thể không có `parent_id = 0`** (biến thể mồ côi),
- **biến thể thiếu `convert_to_main_unit = 1`** ⇒ **nhãn đơn vị lệch số tồn** ở mọi màn kho.

Hai bẫy này đã được ghi nhận trong repo. Vì thế `08_020_007` và `08_020_009` **không thể kiểm bằng UI
đơn thuần** — phải kèm truy vấn SELECT để soi dữ liệu sinh ra. Đã ghi rõ trong `_blocked`.

### 6.4 Một biên quan trọng sheet KHÔNG có: cây danh mục vòng lặp

`dong29` chỉ kiểm "sửa trường Danh mục cha". Đã thêm vào `08_060_011` biên: đặt danh mục cha là
**chính nó** hoặc **con của nó**. Nếu không chặn thì cây danh mục thành vòng lặp và mọi màn đọc cây
(form sản phẩm, bộ lọc, CTKM) sẽ treo. Đây là lỗi kiểu treo hệ thống, không phải lỗi hiển thị.

### 6.5 Câu hỏi phạm vi duy nhất của SKU / Barcode

`SANPHAM_58` chỉ nói "tính duy nhất của SKU" trong phạm vi combo. Đã mở rộng `08_090_008`: SKU combo
trùng SKU **sản phẩm thường** có bị chặn không. Nếu không, quét mã vạch ở quầy sẽ nhập nhằng giữa
combo và sản phẩm. Cùng câu cho Barcode ở `08_030_006`.

### 6.6 Nhiều case gốc là bản SONG SINH cho combo

Sheet có hai dãy gần như y hệt: `SANPHAM_21`–`33` (sản phẩm) và `SANPHAM_66`–`77` (combo); tương tự
`SANPHAM_36`–`43` và `SANPHAM_79`–`87`; `SANPHAM_45`–`48` và `SANPHAM_89`–`92`. Đã **gộp cặp song
sinh vào một case** với hai mã gốc ngăn bằng `;` khi kỳ vọng giống nhau, và **tách riêng** khi combo
có ràng buộc riêng (`08_030_020` xoá hết thành phần combo). 🚫 Không dựng hai case chạy y hệt nhau —
đúng luật 2 của bàn giao.
