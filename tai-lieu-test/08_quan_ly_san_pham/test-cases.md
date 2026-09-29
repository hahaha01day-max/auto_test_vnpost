# Kịch bản auto test — 08 Quản lý sản phẩm

- **Dựng 18/09/2026:** đối chiếu trọn sheet QC + quét 11 kỹ thuật mục 3.4. **17 → 98 case.**
  Phủ **132/132** case gốc (trước đó 15). Script hiện có 17.

## 1. Task

| Task | Nội dung | Số case |
|---|---|--:|
| `010` | Danh sách sản phẩm | 2 |
| `020` | Thêm sản phẩm — gồm 5 case **SKU/Barcode khi có biến thể** | 20 |
| `030` | Chi tiết · Sửa · Xoá sản phẩm và combo | 22 |
| `040` | Tìm kiếm / lọc sản phẩm và combo | 7 |
| `050` | Kích hoạt / ngừng kích hoạt theo phạm vi | 4 |
| `060` | **Danh mục sản phẩm** — thêm/sửa/xoá/tìm/import/export | 25 |
| `070` | Nhập sản phẩm từ Excel | 2 |
| `080` | In tem nhãn | 2 |
| `090` | Thêm combo | 14 |

## 2. 🔴 Nhóm case sinh ra bẫy ĐƠN VỊ đã gặp thật

Năm case `SANPHAM_3`–`7` (`08_020_005`–`009`) kiểm hành vi **SKU/Barcode khi thêm rồi xoá biến thể**.
Đây chính là chỗ sinh ra hai bẫy đã ghi nhận trong repo:

| Bẫy | Hậu quả |
|---|---|
| **Biến thể không có `parent_id = 0`** | biến thể mồ côi, không gắn sản phẩm cha |
| **Biến thể thiếu `convert_to_main_unit = 1`** | **nhãn đơn vị lệch số tồn** ở mọi màn kho |

⇒ Hai case `08_020_007` `08_020_009` phải kiểm **dữ liệu sinh ra ở tầng DB**, không chỉ giao diện.
Đã ghi `_blocked` là "cần truy vấn SELECT kèm theo".

## 3. 🔴 Mười một case gốc có kỳ vọng KHÔNG dùng được

| Nhóm | Mã gốc | Vấn đề |
|---|---|---|
| Thêm danh mục | `dong21` `dong24` | **trống cột tình huống** — chỉ có mã, không có nội dung |
| Sửa danh mục | `dong27` `dong30` `dong31` `dong32` `dong33` `dong34` | **trống cột tình huống** (6 case) |
| Xoá biến thể đã giao dịch | `dong45` | không có kỳ vọng — **câu hỏi mất dữ liệu** |
| Xoá đơn vị quy đổi đã dùng | `dong48` | không có kỳ vọng — số lượng phiếu cũ đọc thế nào |
| Thêm combo | `SANPHAM_56` | trống cột tình huống |

Đã dựng `08_060_007` và `08_060_009` để **liệt kê đủ ô và ràng buộc thật** của hai drawer danh mục,
làm cơ sở cho user bổ sung. 🚫 Không đoán nội dung case gốc.

## 4. Câu hỏi TOÀN VẸN DỮ LIỆU — nhóm xoá

Mọi case xoá đều là câu hỏi "nếu xoá được thì cái đang tham chiếu tới nó ra sao":

| Xoá gì | Đang bị gì tham chiếu | Case |
|---|---|---|
| Sản phẩm | giao dịch kho · đơn nháp · CTKM · combo · bảng giá | `08_030_014`–`019` |
| Biến thể | phiếu kho đã phát sinh | `08_030_009` |
| Đơn vị quy đổi | số lượng trên phiếu cũ | `08_030_012` |
| Danh mục lá | sản phẩm trong danh mục | `08_060_013` |
| Danh mục cha | cả cây con · CTKM | `08_060_014`–`016` |

🔴 Với danh mục, thêm một biên **không có trong sheet**: đặt danh mục cha là **chính nó** hoặc **con
của nó** ⇒ cây thành vòng lặp, mọi màn đọc cây sẽ treo (`08_060_011`).

## 5. Ràng buộc SKU — câu hỏi phạm vi duy nhất

`08_090_008`: SKU combo trùng SKU **sản phẩm thường** phải bị chặn không? 🔴 Nếu chỉ chặn trong cùng
loại thì **quét mã vạch ở quầy sẽ nhập nhằng**. Cùng câu hỏi cho Barcode ở `08_030_006`.

## 6. Nửa còn lại của các case phạm vi

Ba case ngừng kích hoạt (`08_050_001` `003`) đã thêm nửa sheet không nói: **phạm vi KHÔNG chọn thì
vẫn bán được**. Thiếu nửa này thì không phát hiện phạm vi nở ra toàn hệ thống.

## 7. Phân loại: `READY_WITH_CODE_LOOKUP` 23 · `BLOCKED` 75 · case ghi **74**

## 8. Việc còn lại

1. 🔴 User bổ sung nội dung cho **9 case gốc trống** và kỳ vọng cho `dong45` `dong48` (mục 3).
2. Chốt 4 câu hỏi: trùng sản phẩm trong combo · xoá danh mục cha khi cây con rỗng · import file lẫn
   dòng lỗi · phạm vi duy nhất của SKU/Barcode.
3. Dựng fixture Excel danh mục (hợp lệ · toàn lỗi · lẫn) và dữ liệu nền: sản phẩm ký gửi, sản phẩm
   trong CTKM, sản phẩm trong bảng giá.
4. Bổ sung truy vấn SELECT để kiểm `parent_id` / `convert_to_main_unit` cho `08_020_007` `009`.

## 🔴 Kết quả chạy script — 20/09/2026

```bash
npx playwright test --config tai-lieu-test/08_quan_ly_san_pham/playwright.config.js
```

**99/99 case có script.** Lượt chạy: **21 đạt · 0 đỏ · 78 skip**. Spec cũ
`vnpost-product-category.playwright.spec.js` đã **xoá** (đăng nhập bằng URL production viết cứng).

### 🔴 Bẫy đã trả giá: bảng sản phẩm GỘP NHÓM theo danh mục

Dòng đầu mỗi nhóm là **dòng tiêu đề chỉ có 2 ô** (`''` và `Thời trang > Quần`), vẫn mang class
`.ant-table-row`. Lấy `.ant-table-row` trần là trúng ngay dòng nhóm, rồi `td.nth(9)` không tồn tại
và test đỏ với `locator.innerText: Timeout 15000ms` — lý do đọc hệt lỗi mạng.
⇒ Helper `dongSanPham()` lọc `has: td:nth-child(9)`.

Cột đầu của bảng là **`#`** (số thứ tự) ⇒ bảng có **10** cột, 🚫 không phải 9 như kịch bản liệt kê.

### Trace đã có — 🚫 đừng tra lại

| Màn | Route | API |
|---|---|---|
| Quản lý sản phẩm | `/product/normal` | `GET /chain/products/get-all` |
| Quản lý danh mục | `/product/category?type=0` | `GET /chain/product-categories?type=0` |

Ba thẻ: *Sản phẩm · Sản phẩm sản xuất · Sản phẩm tự doanh*. Bộ lọc: *Tên* · *Tìm kiếm theo mã, tên
danh mục* · *Trạng thái* · *Thương hiệu* · *Hình thức phân phối* · *Phân loại*.

### 78 case chưa chạy

74 case GHI (thêm/sửa/xoá sản phẩm, đơn vị quy đổi, biến thể, danh mục, thương hiệu) + 4 case thiếu
dữ liệu nền (combo, ảnh, sản phẩm sản xuất). 🔴 Sản phẩm và danh mục là **khoá phân loại của toàn hệ
thống** — sửa nhầm ảnh hưởng mọi báo cáo và mọi điểm bán.
