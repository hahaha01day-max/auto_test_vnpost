# Kịch bản auto test — 09 Sản phẩm sản xuất

- Ngày dựng: **18/09/2026** · skill `test-scenario` · nguồn `hdsd09_san_pham_san_xuat/tasks/*.md` (4 task)
- **Bổ sung 18/09/2026:** quét 11 kỹ thuật mục 3.4. **15 → 23 case.** CSV nay đủ **7 cột**
  (trước thiếu `Ma goc` và `Nguon`).
- Sheet QC không phủ phân hệ này ⇒ việc duy nhất là quét kỹ thuật.
- 🚫 Chưa viết script.

## 🔴 Bốn điểm bổ sung đáng chú ý

1. **`09_010_006` Nguyên liệu tự điền theo công thức** — đổi số lượng sản xuất thì lượng nguyên liệu
   nhân theo tỉ lệ. `quantity` đã là số theo đơn vị gốc, 🚫 không nhân thêm `convert_to_main_unit`.
2. **`09_010_007` Sửa tay lượng nguyên liệu khác công thức** — chưa có đặc tả. Nếu cho sửa thì
   **giá vốn thành phẩm tính theo lượng đã sửa**, không theo công thức.
3. **`09_040_006` Đối chiếu sau khi xác nhận** — phải sinh **đúng hai chứng từ**: phiếu xuất loại
   *"Xuất kho nguyên liệu sản xuất"* và phiếu nhập loại *"Nhập kho sản phẩm sản xuất"*
   (nhãn trong `IMPORT_TYPE` / `EXPORT_TYPE`).
4. 🔴 **Nhập thành phẩm sản xuất từng bị bóc VAT sai** (bẫy đã ghi nhận trong repo) — case
   `09_040_006` phải đối chiếu cả **giá vốn ghi vào phiếu nhập**, không chỉ số lượng.

## 1. Route

| Màn hình | Route |
|---|---|
| `PRODUCTION` — Kho hàng › Sản xuất sản phẩm | `/inventory/production` |

## 2. Vai

Cả 4 task khai đủ 4 cấp. Dùng `shop` cho luồng chính, `province` cho case chọn điểm bán
(`09_040_002`), `gdv` cho case phạm vi.

## 3. Phân loại

| Nhãn | Số case |
|---|--:|
| `READY_WITH_CODE_LOOKUP` | 7 |
| `BLOCKED` | 8 |

**Lý do BLOCKED:**

- `09_010_002`, `09_010_003` — lập phiếu thật (dù ở trạng thái Nháp vẫn là bản ghi mới).
- 🔴 `09_030_002`…`09_030_006` — cần một phiếu **Nháp** có sẵn; và `09_030_004`, `09_030_005` **xác
  nhận sản xuất thật**: trừ nguyên liệu khỏi kho, nhập thành phẩm, ghi giá vốn. Không hoàn tác được.
- `09_030_006` cần dựng tình huống nguyên liệu bị rút mất giữa chừng — chỉ dựng được bằng cách bán
  hoặc chuyển kho thật.
- `09_020_002` cần đang dở một phiếu với lô nhập thiếu.

## 4. Case ghi dữ liệu — 🔴 chưa ai được phép chạy

`09_010_002` · `09_010_003` · `09_030_003` · `09_030_004` · `09_030_006`

🔴 **Xác nhận sản xuất là bút toán kho hai chiều** (xuất nguyên liệu + nhập thành phẩm) kèm tính lại
giá vốn. Chạy nhầm là sai tồn **và** sai giá vốn, cả hai đều lan sang báo cáo NXT.

## 5. Lỗ hổng đặc tả

- Task 30 nói *"nguyên liệu phải còn đủ tồn tại thời điểm xác nhận"* nhưng **không ghi thông báo lỗi**
  khi không đủ (`09_030_006`).
- Task 10 không nói **thông báo** khi sản phẩm chưa khai công thức (`09_010_002`), chỉ nói "không lưu
  được phiếu".

## 🔴 Kết quả chạy script — 20/09/2026

```bash
npx playwright test --config tai-lieu-test/09_san_pham_san_xuat/playwright.config.js
```

**23/23 case có script.** Lượt chạy: **1 đạt · 1 đỏ · 21 skip**.

### 🔴 Case đỏ `09_PQ_001` — PHÁT HIỆN PHÂN QUYỀN

Vai **Giao dịch viên** vào được màn Sản xuất sản phẩm, **thấy nút "Tạo phiếu sản xuất"** và API
`/production` trả **200**. Kịch bản đòi chặn (cần quyền `create_import_stock`).

### Ghi nhận: API `/production` trả 401 ở lần gọi ĐẦU

Đo cả hai vai: lần nạp trang đầu tiên của một phiên mới trả **401**, các lần sau **200**. Đây là
cú gọi bằng phiên cũ trước khi `moTrang` đăng nhập lại — 🚫 không phải lỗi phân quyền. Script thu
**toàn bộ** dãy mã trạng thái rồi mới kết luận, 🚫 không bắt mỗi response đầu tiên.

### 🔴 Bốn case bị chặn bởi CHÍNH `test-input.json`, không phải bởi sản phẩm

`09_010_001` `09_010_004` `09_020_001` `09_030_001` khai `required: ["thanhPham"]` nhưng ô đó để
trống ⇒ `skipReason()` chặn. Riêng `09_010_001` chỉ mở màn và đọc cột — 🚫 không cần tên thành phẩm.
**Cần user chốt**: điền tên một thành phẩm có thật vào `test-input.json`, hoặc bỏ `required` khỏi
case chỉ đọc. 🚫 Tôi không tự sửa vì `required` là quyết định của kịch bản.

### 17 case còn lại chưa chạy

13 case GHI + 4 case thiếu dữ liệu nền (điểm bán test chưa có phiếu sản xuất nào). 🔴 Xác nhận một
phiếu sản xuất sinh **hai chứng từ kho thật** và ghi giá vốn thành phẩm.
