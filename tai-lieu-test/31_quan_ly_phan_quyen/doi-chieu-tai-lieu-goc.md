# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 31 — Quản lý phân quyền, chức năng, vai trò

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 31_quan_ly_phan_quyen`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `31_quan_ly_phan_quyen`
- Tài liệu gốc liên quan: [`uat_vnpost_phan_quyen_vai_tro.csv`](../test-case-goc/uat_vnpost_phan_quyen_vai_tro.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **45** |
| — trong đó **trùng lặp** trong chính sheet gốc | 1 |
| **Case gốc đã dựng** | **44** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 45 |
| — **tài liệu gốc KHÔNG có** | 6 |

**Độ phủ tài liệu gốc: 98%**

## 2. 🔴 Case trùng lặp trong sheet gốc — 🚫 KHÔNG dựng thêm

So **toàn bộ** nội dung (tình huống, điều kiện, các bước, kết quả mong muốn), giống nhau từng ký tự.
Dựng thêm là chạy hai lần cùng một thao tác, làm độ phủ ảo và nhân đôi rủi ro ghi dữ liệu.

| Giữ lại | Bản trùng | Tình huống |
|---|---|---|
| `FUNC_VAITRO__20` | `FUNC_VAITRO__41` | Kiểm tra nhập khoảng trắng liên tiếp vào ô tìm kiếm |

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 6 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `31_020_002` | Tick quyền chức năng và hủy | HDSD 020 |
| `31_080_009` | Gán chức năng thành công cho vai trò | Code FE features/role |
| `31_080_010` | Xoá vai trò thành công | Code FE features/role |
| `31_080_011` | Gán nhân viên khi chưa chọn ai | Code FE features/role + kỹ thuật 3.4 #1 |
| `31_090_001` | Vai điểm bán không vào được màn quản lý vai trò | Kỹ thuật 3.4 #10 — phạm vi theo vai |
| `31_090_002` | Phân trang danh sách vai trò | Kỹ thuật 3.4 #7 — phân trang |

## 5. Bảng đối chiếu đầy đủ 45 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `FUNC_VAITRO__1` | Kiểm tra hiển thị màn hình Quản lý vai trò | `31_010_001` |
| `FUNC_VAITRO__2` | Kiểm tra giao diện chung | `31_010_002` |
| `FUNC_VAITRO__3` | Kiểm tra tiêu đề cột trong bảng | `31_010_002` |
| `FUNC_VAITRO__4` | Kiểm tra dữ liệu hiển thị trong bảng | `31_030_001` |
| `FUNC_VAITRO__5` | Kiểm tra ô Tìm kiếm hiển thị đầy đủ | `31_030_002` |
| `FUNC_VAITRO__6` | Kiểm tra nút "Thêm vai trò" hiển thị đúng | `31_030_003` |
| `FUNC_VAITRO__7` | Kiểm tra nút thu gọn tất cả hiển thị đúng | `31_030_004` |
| `FUNC_VAITRO__8` | Kiểm tra cột Thao tác hiển thị đủ nút | `31_010_002` |
| `FUNC_VAITRO__9` | Kiểm tra phản hồi UI khi thu nhỏ màn hình | `31_030_008` |
| `FUNC_VAITRO__10` | Kiểm tra font chữ và khoảng cách hiển thị | `31_030_009` |
| `FUNC_VAITRO__11` | Kiểm tra hiển thị nút "Chỉnh sửa" | `31_030_005` |
| `FUNC_VAITRO__12` | Kiểm tra hiển thị nút "Xóa" | `31_030_006` |
| `FUNC_VAITRO__13` | Kiểm tra hiển thị nút "Phân quyền chức năng" | `31_030_007` |
| `FUNC_VAITRO__14` | Kiểm tra tìm kiếm với từ khóa hợp lệ | `31_010_006` |
| `FUNC_VAITRO__15` | Kiểm tra tìm kiếm với từ khóa không tồn tại | `31_040_001` |
| `FUNC_VAITRO__16` | Kiểm tra tìm kiếm với ký tự đặc biệt | `31_040_002` |
| `FUNC_VAITRO__17` | Kiểm tra tìm kiếm với từ khóa có khoảng trắng | `31_040_003` |
| `FUNC_VAITRO__18` | Kiểm tra tìm kiếm với phân biệt chữ hoa và chữ thường, không dấu | `31_040_004` |
| `FUNC_VAITRO__19` | Kiểm tra tìm kiếm khi để trống ô tìm kiếm | `31_040_005` |
| `FUNC_VAITRO__20` | Kiểm tra nhập khoảng trắng liên tiếp vào ô tìm kiếm | `31_040_006` |
| `FUNC_VAITRO__21` | Kiểm tra khi mở màn Thêm vai trò | `31_010_003` |
| `FUNC_VAITRO__22` | Kiểm tra khi thêm vai trò thành công | `31_010_005` |
| `FUNC_VAITRO__23` | Kiểm tra thêm vai trò thiếu trường bắt buộc | `31_010_004` |
| `FUNC_VAITRO__24` | Kiểm tra thêm vai trò thiếu trường bắt buộc | `31_010_004` |
| `FUNC_VAITRO__25` | Kiểm tra thêm vai trò thiếu trường bắt buộc | `31_010_004` |
| `FUNC_VAITRO__26` | Kiểm tra thêm vai trò bị trùng tên vai trò | `31_050_001` |
| `FUNC_VAITRO__27` | Kiểm tra khi mở màn chỉnh sửa thông tin | `31_060_001` |
| `FUNC_VAITRO__28` | Kiểm tra khi sửa Tên vai trò | `31_010_007` |
| `FUNC_VAITRO__29` | Kiểm tra khi sửa Phạm vi | `31_010_007` |
| `FUNC_VAITRO__30` | Kiểm tra lỗi để trống những trường bắt buộc khi sửa (Tên vai trò, Phạm vi) | `31_060_002` |
| `FUNC_VAITRO__31` | Kiểm tra khi hủy thao tác sửa thông tin | `31_060_003` |
| `FUNC_VAITRO__32` | Kiểm tra khi mở màn Xóa vai trò | `31_070_001` |
| `FUNC_VAITRO__33` | Kiểm tra khi xác nhận xóa vai trò | `31_010_009` |
| `FUNC_VAITRO__34` | Kiểm tra khi hủy vai trò | `31_010_008` |
| `FUNC_VAITRO__35` | Kiểm tra khi mở màn Phân quyền chức năng | `31_020_001` |
| `FUNC_VAITRO__36` | Kiểm tra khi tìm kiếm với từ khóa hợp lệ | `31_080_001` |
| `FUNC_VAITRO__37` | Kiểm tra tìm kiếm với ký tự đặc biệt | `31_080_002` |
| `FUNC_VAITRO__38` | Kiểm tra tìm kiếm với từ khóa có khoảng trắng | `31_080_003` |
| `FUNC_VAITRO__39` | Kiểm tra tìm kiếm với phân biệt chữ hoa và chữ thường, không dấu | `31_080_004` |
| `FUNC_VAITRO__40` | Kiểm tra tìm kiếm khi để trống ô tìm kiếm | `31_080_005` |
| `FUNC_VAITRO__41` | Kiểm tra nhập khoảng trắng liên tiếp vào ô tìm kiếm | — **chưa dựng** |
| `FUNC_VAITRO__42` | Kiểm tra khi chọn tất cả chức năng cho vai trò | `31_080_006` |
| `FUNC_VAITRO__43` | Kiểm tra khi chọn từng chức năng cho vai trò | `31_020_003` |
| `FUNC_VAITRO__44` | Kiểm tra khi chọn chỉ hiển thị mục đã chọn | `31_080_007` |
| `FUNC_VAITRO__45` | Kiểm tra khi làm mới chức năng đã chọn | `31_080_008` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_(Viết vào đây. Phần từ dòng `<!-- NHAN-XET-TAY -->` trở xuống KHÔNG bị ghi đè khi sinh lại.)_
