# Kịch bản auto test — 13_1 Phiếu đề xuất và phê duyệt

- **Bổ sung 18/09/2026.** **3 → 55 case.** Phủ **53/60** case gốc (trước đó 1); 7 case còn lại là
  **bản trùng** đã dựng ở phân hệ `13_3` — xem `doi-chieu-tai-lieu-goc.md` mục 6.1. Script hiện có 3.

## Cách chuyển thể

Sheet `quan_ly_kho` / `nha_cung_cap` ghi **kỳ vọng đầy đủ**, nên case bổ sung được **chép nguyên văn**
bước và kỳ vọng (cột `Nguon` = *"Sheet QC (chuyển thể nguyên văn)"*), chỉ thêm một dòng 🔴 nhắc bẫy
của repo ở cuối mỗi kỳ vọng. 🚫 Không diễn giải lại.

## Task

| Task | Nội dung | Số case |
|---|---|--:|
| `030` | Tạo phiếu đề xuất | 9 |
| `040` | Danh sách / chi tiết phiếu đề xuất đặt hàng | 14 |
| `050` | Chọn điểm bán | 2 |
| `060` | Chỉnh sửa phiếu đề xuất | 7 |
| `070` | 🔴 **Gộp** phiếu đề xuất nhập hàng | 6 |
| `080` | 🔴 **Tách** phiếu đề xuất nhập hàng | 9 |
| `090` | 🔴 **Phê duyệt** phiếu đề xuất | 8 |

## 🔴 Gộp / tách: tổng số lượng là chốt chặn chống mất hàng

- **Gộp** (`070`): tổng số lượng sau gộp phải **bằng** tổng các phiếu con, và giữ được **dấu vết**
  phiếu gốc (tra ngược ở `13_2`).
- **Tách** (`080`): tổng sau tách phải **bằng** phiếu gốc — 🚫 không hụt, không dư.

## Bẫy đã biết của repo áp vào phân hệ này

| Bẫy | Ảnh hưởng |
|---|---|
| **`builder()` làm mất cờ `enableVat`** | phiếu đề xuất dựng bằng builder ra sai VAT |
| **`shopId` là MÃ, không phải số** | bộ chọn điểm bán (`050`) |
| **Callback TCT→tỉnh so pod SAI** | phê duyệt ở `090` có thể không ăn |
| **Thiếu filter phạm vi = trả TOÀN BỘ pod** | danh sách ở `040`, không phải rỗng |
| **Đề xuất phân cấp + cross-pod** | `stock_request_po_flow_doc` — đọc trước khi viết script |

## Phân loại: `READY_WITH_CODE_LOOKUP` 2 · `BLOCKED` 53 · case ghi **53**

## 🔴 Kết quả chạy script — 20/09/2026

**55/55 case có script.** Lượt chạy: **2 đạt · 0 đỏ · 53 skip**. Spec cũ
`vnpost-warehouse.playwright.spec.js` đã **xoá** — nó đăng nhập bằng URL production viết cứng và
dò **6 route ứng viên** cho mỗi màn.

🔴 **Route thật: `/inventory/purchase-request`** (*Phiếu đề xuất đặt hàng*), lấy từ link menu.

53 case chưa chạy đều là case GHI: duyệt phiếu đề xuất, gộp/tách, gửi PO cho NCC — 🚫 không hoàn
tác được bằng giao diện.
