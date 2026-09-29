# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 12_1 — Hồ sơ nhà cung cấp

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 12_1_ho_so_nha_cung_cap`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `12_1_ho_so_nha_cung_cap`
- Tài liệu gốc liên quan: [`uat_vnpost_nha_cung_cap.csv`](../test-case-goc/uat_vnpost_nha_cung_cap.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **25** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **25** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 32 |
| — **tài liệu gốc KHÔNG có** | 7 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 7 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `12_1_070_002` | Thêm nhóm NCC - mở form và validate rỗng | HDSD 070 |
| `12_1_070_003` | Tìm kiếm nhóm NCC | HDSD 070 |
| `12_1_070_005` | Thêm danh mục NCC - mở form và validate rỗng | HDSD 070 |
| `12_1_070_007` | Hien thi danh sach nhom NCC | HDSD 070 |
| `12_1_070_008` | Mo drawer Them nhom nha cung cap | HDSD 070 |
| `12_1_070_011` | Tim kiem nhom NCC vua tao | HDSD 070 |
| `12_1_070_014` | Tim kiem nhom NCC khong co ket qua | HDSD 070 |

## 5. Bảng đối chiếu đầy đủ 25 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `NCC_1` | Kiểm tra user đăng nhập vào hệ thống | `12_1_040_001` |
| `NCC_2` | Kiểm tra hiển thị màn hình | `12_1_010_001` |
| `NCC_3` | Kiểm tra hiển thị danh sách nhà cung cấp | `12_1_010_011` |
| `NCC_4` | Kiểm tra tìm kiếm theo tên NCC | `12_1_010_012` |
| `NCC_5` | Kiểm tra tìm kiếm theo SĐT NCC | `12_1_010_013` |
| `NCC_6` | Kiểm tra tìm kiếm thông tin không có trong danh sách | `12_1_010_002` |
| `NCC_7` | Kiểm tra phân trang | `12_1_010_014` |
| `NCC_8` | Kiểm tra nút 'Quản lý danh mục' | `12_1_070_004` |
| `NCC_9` | Kiểm tra nút 'Quản lý Nhóm NCC' | `12_1_070_006` |
| `NCC_10` | Kiểm tra hiển thị màn hình | `12_1_030_001` |
| `NCC_11` | Kiểm tra thêm mới NCC | `12_1_020_011` |
| `NCC_12` | Kiểm tra xem chi tiết thông tin NCC | `12_1_020_001` |
| `NCC_13` | Kiểm tra chỉnh sửa thông tin NCC | `12_1_020_012` |
| `NCC_14` | Kiểm tra bỏ trống các trường bắt buộc | `12_1_030_002` |
| `NCC_15` | Kiểm tra nhập sai định dang số điện thoại | `12_1_030_003` |
| `NCC_16` | Kiểm tra Xoá NCC | `12_1_020_013` |
| `NCC_17` | Kiểm tra huỷ Xoá NCC | `12_1_020_014` |
| `NCC_18` | Kiểm tra hiển thị màn hình | `12_1_070_001` |
| `NCC_19` | Kiểm tra thêm mới nhóm NCC | `12_1_070_010` |
| `NCC_20` | Kiểm tra thêm mới nhóm NCC trùng tên với nhóm đã tồn tại | `12_1_030_011` |
| `NCC_21` | Kiểm tra chỉnh sửa thông tin nhóm NCC | `12_1_070_012` |
| `NCC_22` | Kiểm tra chỉnh sửa thông tin nhóm NCC thành thông tin nhóm NCC đã tồn tại | `12_1_030_012` |
| `NCC_23` | Kiểm tra bỏ trống các trường bắt buộc | `12_1_070_009` |
| `NCC_24` | Kiểm tra Xoá nhom NCC | `12_1_070_013` |
| `NCC_25` | Kiểm tra huỷ Xoá nhóm NCC | `12_1_070_015` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026. Phủ 25/25 case gốc (trước đó 14), 21 → 32 case._

### 6.1 `NCC_1` có cột nhóm TRỐNG — cùng lỗi với `FUNC_1_1`–`4` ở phân hệ `04_5`

Case đăng nhập nằm ở đầu sheet, cột nhóm để trống nên rơi vào phân hệ mặc định. Nghiệp vụ thật là
**đăng nhập + phạm vi theo vai**, trùng với `31_quan_ly_phan_quyen`, `03b` (màn ca làm việc) và
`04_5_050_*`. Đã dựng `12_1_040_001` để không bỏ lọt, `BLOCKED` chờ user chốt giữ ở đâu.

🔴 Đây là **lần thứ hai** gặp cùng một kiểu lỗi ánh xạ (case đăng nhập ở đầu sheet, nhóm trống). Nên
xử lý một lần cho tất cả sheet trong `goc-mapping.js`.

### 6.2 🚫 Sheet ghi thẳng SECRET

`NCC_1` ghi nguyên số điện thoại và mật khẩu mẫu trong cột bước. Đã **bỏ secret** khi chuyển thể và
ghi rõ trong `Nguon`. Theo luật skill: *"Tuyệt đối không đặt tài khoản/mật khẩu vào `test-input.json`"*.

### 6.3 `CHAIN_SUPPLIER` vs `SHOP_SUPPLIER`

Bẫy đã ghi nhận trong repo: NCC có **hai bảng ở hai cấp**. Case danh sách và tìm kiếm phải ghi rõ
đang đọc cấp nào, nếu không thì số bản ghi lệch mà tưởng lỗi phân trang.
