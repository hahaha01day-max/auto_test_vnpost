# Kịch bản auto test — 07_2 Cấu hình kho

- **Bổ sung 18/09/2026:** đối chiếu trọn sheet QC + quét 11 kỹ thuật mục 3.4. **25 → 53 case.**
  Phủ **35/35** case gốc (trước đó 6). 🚫 Chưa có script.

## 1. Task

`010` Khoá kho — cài đặt, lọc, tìm kiếm, quyền (13) · `020` chi tiết và bỏ khoá (5) ·
`030` Bán tồn kho âm (3) · `040` Cảnh báo hết hạn — thêm cấu hình (5) · `050` Cảnh báo hết hạn —
danh sách (4) · `060` **hành vi khi sản phẩm bị khoá / bỏ khoá** (12) · `070` **phạm vi áp dụng của
khoá kho** (5) · `080` **giá vốn tạm tính khi bán âm** (4) · `PQ` phân quyền (2)

## 2. 🔴 Thông báo chặn — hai câu KHÁC nhau, 🚫 không dùng lẫn

| Nghiệp vụ | Thông báo |
|---|---|
| Bán hàng · xuất kho · chuyển kho · xác nhận chuyển · kiểm kho lệch | **"Không thể xuất kho. Sản phẩm đang bị …"** |
| Nhập kho | **"Không thể nhập kho. Sản phẩm đang bị …"** |

## 3. 🔴 Tình huống nguy hiểm: `07_2_060_005`

Phiếu chuyển kho lập **trước** khi khoá, hàng **đã rời kho gửi**, rồi sản phẩm bị khoá ⇒ bên nhận
**không xác nhận được**. Hàng treo giữa đường, không thuộc kho nào. Sheet QC (`FUNC_1_401`) chỉ ghi
"hiển thị thông báo" mà không nói xử lý hàng treo.

## 4. Phạm vi áp dụng — nửa quan trọng sheet KHÔNG nói

Sheet chỉ đòi kiểm "nơi đã chọn thì bị chặn". Bốn case `07_2_070_001`–`004` đã thêm **nửa còn lại**:
**nơi KHÔNG chọn thì không được bị chặn**. Thiếu nửa này thì không biết phạm vi có nở ra toàn hệ
thống hay không — đúng loại lỗi đã gặp ở `stock_v2_find_scope_hole` (thiếu filter phạm vi = trả toàn
bộ pod).

Còn một câu chưa có đặc tả: khoá theo **danh mục** thì sản phẩm **thêm vào danh mục SAU khi khoá** có
bị chặn không (`07_2_070_005`).

## 5. Nhóm `080` — câu hỏi GIÁ VỐN của bán âm

| Case | Tình huống | Kỳ vọng theo sheet |
|---|---|---|
| `07_2_080_001` | tồn = 0, bán âm | giá vốn tạm tính = **giá vốn đơn vị thời điểm trước đó** |
| `07_2_080_002` | tồn > 0, bán vượt thành âm | = **giá vốn phần còn tồn + giá vốn tạm tính phần bán âm** |
| `07_2_080_003` | tồn đã âm, bán tiếp | 🔴 kỳ vọng trong sheet **chép nhầm** của case thêm danh mục |

## 6. Phân loại: `READY_WITH_CODE_LOOKUP` 8 · `BLOCKED` 45 · case ghi **43**

🔴 Cài một cấu hình khoá kho là **chặn ngay** nghiệp vụ nhập/xuất/chuyển/kiểm kho của **toàn bộ phạm
vi đã chọn** — chạy nhầm là đóng băng kho thật của người đang bán hàng.

## 7. Lỗ hổng và mâu thuẫn đặc tả

| # | Vấn đề |
|---|---|
| 1 | 🔴 **`FUNC_1_404` và `FUNC_1_405` bị ĐẢO tên/kỳ vọng**: case tên *"xuất kho với sản phẩm bỏ khoá"* lại có kỳ vọng *"Nhập kho thành công"*, và ngược lại. Đã viết lại theo kỳ vọng. |
| 2 | 🔴 **`dong23` chép nhầm kỳ vọng**: case *"giá vốn tạm tính khi tồn < 0 và bán âm"* mang kỳ vọng *"Hiển thị message đỏ dưới trường Nhập tên danh mục"*. |
| 3 | 🔴 **`dong24` `dong25` lẫn nội dung**: hai case **quản lý danh mục sản phẩm** bị đặt trong nhóm *"ghi nhận giá vốn tạm"*. Cần user chốt chuyển sang phân hệ `08` hay giữ. |
| 4 | 🔴 **`FUNC_1_395` vs `07_2_PQ_001`**: sheet nói *chỉ TCT và tỉnh* được cài khoá kho; case `PQ_001` đang khai vai tỉnh **vào được** — phải đối chiếu và chốt. |
| 5 | **`FUNC_1_402` không phân biệt chênh lệch TĂNG và GIẢM** khi kiểm kho sản phẩm bị khoá. |
| 6 | **Hành vi khi hàng treo giữa đường** (mục 3) không có đặc tả. |

## 8. Việc còn lại

1. Trả lời mục 7 — số 1, 2, 3 là lỗi dữ liệu sheet; số 4 là mâu thuẫn quyền.
2. Xin điểm bán + sản phẩm dựng riêng cho nhóm `060` `070` `080`.
3. Chốt giá vốn tạm tính khi tồn đã âm sẵn (`07_2_080_003`).

## 🔴 Kết quả chạy script — 20/09/2026

```bash
npx playwright test --config tai-lieu-test/07_2_cau_hinh_kho/playwright.config.js
```

**53/53 case có script.** Lượt chạy: **9 đạt · 0 đỏ · 44 skip**.

### Trace đã có — 🚫 đừng tra lại

Ba nhóm đều nằm trong màn `/settings`, mở bằng `?setting=<key>`:

| Nhóm | key | Đo được 20/09/2026 |
|---|---|---|
| Khoá kho | `stockFreeze` | bảng 5 cột *STT · Đối tượng khoá · Phạm vi áp dụng · Lý do · Hành động*, đang có 3 cấu hình; mỗi dòng có *Xem chi tiết* + *Bỏ khoá* |
| Bán tồn kho âm | `negativeStock` | chỉ vai Tổng công ty |
| Cảnh báo hết hạn | `expiryAlert` | bảng *Tên cấu hình · Đối tượng áp dụng · Chi tiết · Số ngày cảnh báo · Kích hoạt · Thao tác*, đang có 11 cấu hình |

Form **"Thêm cấu hình khoá kho"** là drawer ba bước: *Phạm vi áp dụng* → *Danh mục / SKU* →
*Thông tin khác*, với ba lựa chọn phạm vi **Bưu điện tỉnh / Bưu điện xã / Điểm bán** và cây đơn vị
có ô *Lọc theo vùng*.

### Phân quyền — cả hai case ĐẠT

- `07_2_PQ_001`: vai tỉnh **mở được** cả `stockFreeze` lẫn `expiryAlert`.
- `07_2_PQ_002`: vai tỉnh **bị chặn** ở `negativeStock`. Phép kiểm chấp nhận hai hình thức chặn —
  không có mục menu, hoặc mở được nhưng 0 nút *Sửa* và 0 công tắc **bấm được**.

### 44 case chưa chạy

43 case GHI + 1 case (`07_2_010_005`) cần đi sâu vào bước *Danh mục / SKU* của form thêm cấu hình —
🚫 chưa probe được lối vào ổn định, 🚫 không đoán locator.

🔴 Lý do giữ `allowMutation: false` nghiêm ngặt ở phân hệ này: **một cấu hình khoá kho chặn cả
nhập, xuất, chuyển kho và bán hàng** của mọi đơn vị trong phạm vi đã chọn — bật nhầm là cả mạng
lưới ngừng giao dịch mặt hàng đó.
