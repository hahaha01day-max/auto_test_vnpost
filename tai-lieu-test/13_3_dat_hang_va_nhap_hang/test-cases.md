# Kịch bản auto test — 13_3 Đặt hàng và nhập hàng

- **Bổ sung 18/09/2026.** **3 → 98 case.** Phủ **98/98** case gốc (trước đó 3). Script hiện có 3.

## Cách chuyển thể

Sheet `quan_ly_kho` / `nha_cung_cap` ghi **kỳ vọng đầy đủ**, nên case bổ sung được **chép nguyên văn**
bước và kỳ vọng (cột `Nguon` = *"Sheet QC (chuyển thể nguyên văn)"*), chỉ thêm một dòng 🔴 nhắc bẫy
của repo ở cuối mỗi kỳ vọng. 🚫 Không diễn giải lại.

## Task

| Task | Nội dung | Số case |
|---|---|--:|
| `010` | Tạo phiếu đặt hàng NCC | 12 |
| `030` | Đặt hàng nhà cung cấp | 29 |
| `040` | Phiếu nhập hàng từ NCC thuộc Tổng công ty | 10 |
| `050` | 🔴 **Gửi TCT** (luồng cross-pod) | 7 |

## 🔴 Ràng buộc đến TỪ phân hệ khác

| Nguồn ràng buộc | Nội dung |
|---|---|
| `12_4` task `080` (hợp đồng NCC) | **chiết khấu %** · **hạn mức công nợ** · **hạn thanh toán** · **thời hạn được trả hàng**. Đặt hàng vượt hạn mức công nợ phải bị **chặn**. |
| `12_3` (`NCC_106`) | **nhận giao một phần** ⇒ công nợ NCC ghi **theo phần đã nhận** |
| `04_3` | nhập hàng ghi **tồn kho** và sinh phiếu nhập loại *"Nhập kho thường"* |

## Bẫy đã biết của repo

| Bẫy | Ảnh hưởng |
|---|---|
| **PO giao thẳng chưa atomic** (`direct_receive_serial_atomicity`) | task `040` |
| **Event cross-pod phải mang `sku`/`unitId`** | task `050` Gửi TCT |
| **Forward vào controller công khai = 401** | task `050` |
| **Hàng ký gửi: `import_price` ĐÃ gồm VAT** | task `010`, 🚫 đừng bóc VAT lần nữa |
| **Ký gửi KHÔNG áp CTKM** | task `010` `030` |

## Bảy case mang HAI mã gốc

`FUNC_1_293`–`299` (nhóm *Gửi TCT*) trùng **y hệt** `FUNC_1_300`–`306` (nhóm *Tổng hợp phiếu đề xuất
đặt hàng*, ánh xạ về `13_1`). Chỉ dựng **một** case ở đây, cột `Ma goc` mang cả hai mã — đúng luật 2
của bàn giao.

## Phân loại: `READY_WITH_CODE_LOOKUP` 3 · `BLOCKED` 95 · case ghi **95**

## 🔴 Kết quả chạy script — 20/09/2026

**98/98 case có script.** Lượt chạy: **0 đạt · 0 đỏ · 98 skip**. Spec cũ (URL production viết
cứng) đã xoá.

### Trace đã có — 🚫 đừng tra lại

| Màn | Lối vào |
|---|---|
| Đặt hàng nhà cung cấp | `/inventory/purchase-order` — nút *Đối soát hoá đơn, chứng từ* · **Phiếu nhập hàng từ NCC thuộc TCT** · *Template email đặt hàng* · *Tạo đơn đặt hàng* |
| Đơn giao thẳng cần xác nhận | 🚫 **không có route riêng** — vào bằng nút *"Phiếu nhập hàng từ NCC thuộc TCT"* |

### 🔴 `13_3_040_001` bị chặn bởi chính `test-input.json`

Case chỉ **kiểm giao diện** nhưng khai `required: ["maNCC"]` và ô đó để trống ⇒ `skipReason()`
chặn. **Cần user chốt**: điền mã NCC có thật, hoặc bỏ `required` khỏi case chỉ đọc. 🚫 Tôi không
tự sửa vì `required` là quyết định của kịch bản.

97 case còn lại là case GHI: tạo đơn đặt hàng, gửi NCC, nhận hàng, đối soát hoá đơn — ghi vào
tồn kho và công nợ NCC thật.
