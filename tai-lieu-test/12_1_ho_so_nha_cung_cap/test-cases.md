# Kịch bản auto test — 12_1 Hồ sơ nhà cung cấp

- **Bổ sung 18/09/2026.** **21 → 32 case.** Phủ **25/25** case gốc (trước đó 14).
- **Cập nhật 23/09/2026:** 31/32 case có phép kiểm thật; `12_1_040_001` skip có lý do (xem kết quả chạy bên dưới).

## Cách chuyển thể

Sheet NCC ghi **kỳ vọng đầy đủ**, nên các case bổ sung được **chép nguyên văn** bước và kỳ vọng từ
sheet (cột `Nguon` = *"Sheet QC (chuyển thể nguyên văn)"*), chỉ thêm một dòng 🔴 nhắc bẫy của repo ở
cuối mỗi kỳ vọng. 🚫 Không diễn giải lại — số liệu và nguyên văn thông báo chính là đặc tả.

## Task

`010` danh sách · tìm kiếm · phân trang (13) · `020` thêm/sửa/xoá NCC (14) ·
`030` nhóm NCC (4) · `040` đăng nhập (1)

## 🔴 Điều phải biết

1. **`CHAIN_SUPPLIER` (cấp chuỗi) khác `SHOP_SUPPLIER` (cấp điểm bán)** — đối chiếu dữ liệu phải biết
   đang đọc bảng nào (bẫy đã ghi nhận trong repo).
2. **Xoá NCC khi đã có PO / công nợ phải bị chặn.** Nếu xoá được thì công nợ mất tham chiếu.
3. **`NCC_1` (đăng nhập) có cột nhóm TRỐNG** trong sheet nên rơi vào phân hệ mặc định — nghiệp vụ
   thật là đăng nhập, trùng `31_quan_ly_phan_quyen` và `04_5_050_*`. Cần user chốt giữ ở đâu.
4. 🚫 **Sheet ghi thẳng số điện thoại và mật khẩu mẫu** ở `NCC_1` — KHÔNG chép vào `test-input.json`,
   secret nằm ở `.env` (luật của skill).

## Phân loại: `READY` 11 · `READY_WITH_CODE_LOOKUP` 10 · `BLOCKED` 11 · case ghi **10**

## 🔴 Kết quả chạy script — 23/09/2026 (Server dev, bộ dữ liệu 8)

```bash
VNPOST_LANE=8 VNPOST_SETUP_ROLES=tct \
VNPOST_BASE_URL=https://dev-vnpost.sfin.vn VNPOST_API_BASE_URL=https://vnpost-api.sfin.vn \
npx playwright test --config tai-lieu-test/12_1_ho_so_nha_cung_cap/playwright.config.js
```

**31/32 case có phép kiểm thật** + 1 skip có lý do. Lượt chạy: **29 đạt · 4 đỏ · 1 skip** (bộ đếm gồm
cả test `dọn — ngừng kích hoạt NCC tự tạo` ở cuối `ncc-ghi.tct.spec.js`, không phải case kịch bản).

🔴 Bản ghi 20/09 từng ghi *"32/32 case có script"* — **sai**: 10 case khi đó là vỏ rỗng (`test.skip`
không có phép kiểm, 7 case ở `chua-chay-duoc.tct.spec.js` + 3 case `boQua` ở `nha-cung-cap.tct.spec.js`).
Đã viết thật ngày 23/09.

| Nhóm | Case |
|---|---|
| Đạt | 22 case cũ · `020_011` thêm NCC · `020_001` chi tiết · `020_012` sửa · `070_011` tìm nhóm vừa tạo · `030_012` sửa nhóm trùng tên (hệ thống chặn) |
| 🔴 Đỏ — **lệch đặc tả** | `020_013` Xoá NCC, `020_014` Huỷ xoá: màn `/supplier/list` 🚫 có chức năng xoá, cột Hành động chỉ có Xem · Sửa · Ngừng/Kích hoạt (`features/supplier/pages/TableData.jsx`); API `DELETE /chain-supplier/{id}` chỉ còn ở màn cũ `pages/warehouse/supplier` không vào được. `070_004`, `070_005`: drawer "Danh mục nhà cung cấp" (`CatModalView`) có trong code nhưng 🚫 nút nào mở (không gọi `setOpenViewSelectCat(true)`). Giữ nguyên kỳ vọng, chờ user quyết. |
| Skip | `040_001` — chưa có tài khoản nghiệp vụ NCC, trùng nghiệp vụ phân hệ 31 |

🔴 Kỳ vọng sheet `030_012` (*"Hiển thị và lưu thông tin"*) mâu thuẫn tên case (sửa thành tên đã tồn tại) và
với `030_011` (thêm trùng bị chặn). Script kiểm theo ràng buộc trùng tên: **bị chặn, nhóm giữ tên cũ** — cần user chốt.

Case ghi chạy thật trên dev (`allowMutation: true`) và tự dọn: nhóm `AUTOTEST_NHOM_*` bị xoá ở `070_013`;
NCC `AUTOTEST_NCC_*` 🚫 xoá được nên được **ngừng kích hoạt** ở test dọn cuối file.

Hai spec cũ (`v2.js`, `vnpost-supplier.playwright.spec.js`) đã **xoá** (20/09).

### 🔴 Route đã ĐỔI: `/supplier/list`

Spec cũ viết cứng `https://vnpost.sfin.vn/inventory/warehouse-supplier` — đường đó nay
🚫 **không điều hướng được nữa** (hàm `moTrang` quét hết 13 menu cha rồi bỏ cuộc, dừng ở
`/supplier/list`).

| Thứ | Giá trị đo 20/09/2026 |
|---|---|
| Route | `/supplier/list` — tiêu đề **"Quản lý nhà cung cấp"** |
| API danh sách | `GET /chain-supplier?orgUnitType=…&page&size&status` |
| API nhóm NCC | `GET /chain-supplier-groups` |
| Nút | *Nhập từ Excel · **Quản lý Nhóm NCC** · Thêm mới · Sản phẩm · Công nợ* |
| Cột | … · Trạng thái hoạt động · Liên hệ · Sản phẩm · Công nợ · Hành động |

🔴 Màn **Nhóm NCC** 🚫 không có route riêng — vào bằng nút *"Quản lý Nhóm NCC"*.

### 🔴 Ba case phân loại nhầm là ĐỌC, thực ra là GHI

`12_1_070_010` (thêm nhóm), `12_1_070_012` (sửa nhóm), `12_1_070_013` (xoá nhóm) **tạo/sửa/xoá
nhóm NCC thật**. Đã sửa `test-input.json` thành `mutates: true` (user chốt 22/09 cho ghi trên môi trường test ⇒ `allowMutation: true`).
🔴 Tiêu chí phân loại: **có để lại bản ghi hay không**, 🚫 không phải "có đụng tiền hay không".

### Bẫy khi viết case ở màn này (đo 23/09/2026)

- Ô tìm của màn **Nhóm NCC** lọc NGAY TRÊN TRÌNH DUYỆT, 🚫 gửi request ⇒ 🚫 `waitForResponse` (đợi hết timeout); dùng `expect.poll` trên kết quả.
- Chuỗi case ghi 🚫 `serial`: case đỏ vì lệch đặc tả làm bỏ luôn case sau. Khoá lượt dùng chung qua env `VNPOST_12_1_LUOT` (config đặt).
- Form Thêm NCC: 3 ô "Số điện thoại" trùng placeholder ⇒ bám accessible name; "Dung sai (%)" là `spinbutton`.
