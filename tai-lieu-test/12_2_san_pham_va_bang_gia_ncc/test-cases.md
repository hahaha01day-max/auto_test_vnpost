# Kịch bản auto test — 12_2 Sản phẩm và bảng giá nhà cung cấp

- **Bổ sung 18/09/2026.** **2 → 50 case.** Phủ **50/50** case gốc (trước đó 2). Script hiện có 2.

## Cách chuyển thể

Sheet NCC ghi **kỳ vọng đầy đủ**, nên các case bổ sung được **chép nguyên văn** bước và kỳ vọng từ
sheet (cột `Nguon` = *"Sheet QC (chuyển thể nguyên văn)"*), chỉ thêm một dòng 🔴 nhắc bẫy của repo ở
cuối mỗi kỳ vọng. 🚫 Không diễn giải lại — số liệu và nguyên văn thông báo chính là đặc tả.

## Task

`010` danh sách sản phẩm theo NCC · lịch sử giá (5) · `020` thêm/cập nhật sản phẩm NCC, import Excel,
mapping SKU, biên giá/VAT/số lượng (30) · `040` bảng giá NCC (15)

## 🔴 Bốn điều phải biết

1. **Bảng giá NCC quyết định GIÁ NHẬP** ⇒ sai là sai **giá vốn** của mọi phiếu nhập sau đó.
2. **Bảng giá NHÁP chưa có hiệu lực** — chỉ bảng **đã ban hành** mới được áp (`NCC_65` `NCC_66`).
3. **Lịch sử giá là bằng chứng kế toán** — sửa giá phải **sinh dòng mới**, 🚫 không ghi đè
   (`NCC_28` `NCC_29`).
4. Với **hàng ký gửi**, `import_price` **ĐÃ gồm VAT** — 🚫 đừng bóc VAT lần nữa; và giá NCC phải lọc
   theo **khu vực shop** (hai bẫy đã ghi nhận).

## Nhóm biên giá trị sheet đòi kiểm (`NCC_50`–`NCC_59`)

giá nhập = 0 · giá nhập âm · giá nhập số lẻ · VAT = 0% · VAT = 100% · VAT âm · SL tối thiểu = 0 ·
SL tối thiểu âm · SL tặng âm · loại giá *"Giá gốc"*. 🔴 Đây là bộ biên đầy đủ nhất trong các sheet —
giữ nguyên, 🚫 đừng gộp.

## Nhóm mapping SKU khi import (`NCC_40`–`NCC_49`)

SKU **đã mapping** · **chưa mapping** · **chưa khai báo** · **trùng nhau trong file** · xác nhận
import khi *có* / *không có* dòng hợp lệ. 🔴 Bốn trạng thái SKU này là gốc của lỗi import hàng loạt.

## Phân loại: `READY` 2 · `BLOCKED` 48 · case ghi **48**

## 🔴 Kết quả chạy script — 20/09/2026

**50/50 case có script.** Lượt chạy: **2 đạt · 0 đỏ · 48 skip**. Hai spec cũ (URL production viết
cứng) đã xoá.

### Trace đã có — 🚫 đừng tra lại

Màn 🚫 KHÔNG có route đi thẳng: vào từ **Quản lý nhà cung cấp** (`/supplier/list`) bằng nút
**Sản phẩm** của dòng NCC ⇒ URL đổi sang **`/supplier/<id>/products`**, tiêu đề *"Danh sách sản
phẩm theo nhà cung cấp"*.

| Thứ | Giá trị |
|---|---|
| API | `GET /supplier-products/by-supplier?supplierId=…&page&size` |
| Cột | Tên sản phẩm · SKU · Hình thức · Đơn vị tính · Nguồn cung cấp · **Giá nhập** · Mặc định · Cập nhật lần cuối · Hành động |
| Ô tìm | `Tìm theo SKU / tên sản phẩm` |

**Bảng giá NCC chính là cột "Giá nhập"** của màn này, 🚫 không phải một màn riêng.

### 48 case chưa chạy

Toàn bộ là case GHI: gán sản phẩm cho NCC, đặt giá nhập, đặt NCC mặc định, nhập giá từ Excel.
🔴 Giá nhập NCC quyết định **giá vốn hàng nhập** — sai một lần là sai giá vốn của mọi phiếu nhập
sau đó.
