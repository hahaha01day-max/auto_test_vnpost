# Kịch bản auto test — 12_4 Hợp đồng và khuyến mãi nhà cung cấp

- **Bổ sung 18/09/2026.** **20 → 60 case.** Phủ **65/65** case gốc (trước đó 25).

## Cách chuyển thể

Sheet NCC ghi **kỳ vọng đầy đủ**, nên các case bổ sung được **chép nguyên văn** bước và kỳ vọng từ
sheet (cột `Nguon` = *"Sheet QC (chuyển thể nguyên văn)"*), chỉ thêm một dòng 🔴 nhắc bẫy của repo ở
cuối mỗi kỳ vọng. 🚫 Không diễn giải lại — số liệu và nguyên văn thông báo chính là đặc tả.

## Task

`010`–`040` hợp đồng: danh sách · khai báo · phê duyệt/ngừng · chi tiết (đã có) ·
`050`–`070` CTKM đặt hàng (đã có) · `080` **điều khoản hợp đồng** (30 case mới) ·
`090` CTKM đặt hàng — bổ sung (10 case mới)

## 🔴 Hợp đồng NCC chi phối TIỀN của mọi PO

Bốn điều khoản sheet đòi kiểm riêng:

| Case gốc | Điều khoản | Ảnh hưởng |
|---|---|---|
| `NCC_198` | **chiết khấu %** | giá nhập thực tế của PO |
| `NCC_199` | **hạn mức công nợ** | chặn đặt hàng khi vượt hạn mức |
| `NCC_200` | **hạn thanh toán** | tính nợ quá hạn |
| `NCC_201` | **thời hạn được trả hàng** | chặn trả hàng NCC quá hạn |

⇒ Sai một điều khoản là sai tiền ở **mọi PO sau đó**. `NCC_197` kiểm **loại hợp đồng**;
`NCC_193` `NCC_196` kiểm sửa và kích hoạt.

## CTKM cấp NCC áp ở mức RULE

🔴 Khuyến mãi đặt hàng NCC **không áp ở mức sản phẩm** mà ở **mức rule** (bẫy đã ghi nhận:
`supplier_promotion_ctkm`). Đối chiếu phải theo rule đã khai, 🚫 không theo từng dòng sản phẩm.

## Phân loại: `BLOCKED` 53 · case ghi **50**

## 🔴 Kết quả chạy script — 20/09/2026

**60/60 case có script.** Lượt chạy: **7 đạt · 0 đỏ · 53 skip**.

### Trace đã có — 🚫 đừng tra lại

| Màn | Route | API | Tiêu đề |
|---|---|---|---|
| Hợp đồng NCC | `/supplier/contracts` | `GET /chain-supplier-contract` | *Hợp đồng nhà cung cấp* |
| Khuyến mãi đặt hàng NCC | `/supplier/promotions` | — | *Khuyến mãi đặt hàng NCC* |

- Hợp đồng: ô tìm **`Tìm số HĐ / tên / mã NCC`**, ô lọc **Hiệu lực** đúng 3 mức
  *Còn hiệu lực · Sắp hết hạn (30 ngày) · Hết hiệu lực*; nút dòng *Xem · Ngừng KH · Sửa · Xoá*.
- Khuyến mãi NCC: ô **`Tìm theo mã / tên chương trình`**, ba ô lọc *Nhà cung cấp · Trạng thái ·
  Hình thức ưu đãi*, khoảng ngày; nút dòng *Xem · Sửa · Ngừng · Hủy*.

🔴 Chi tiết hợp đồng dùng **"Ngày bắt đầu / Ngày kết thúc"**, 🚫 không có chữ *"thời hạn"* như
tài liệu viết — assert theo nhiều cách viết, đừng bắt đúng một từ khoá.

### 53 case chưa chạy

50 case GHI (tạo/sửa/ngừng/xoá hợp đồng, khai điều khoản chiết khấu, tạo chương trình KM NCC) và
3 case phụ thuộc. 🔴 Hợp đồng NCC là căn cứ của **chiết khấu và điều khoản thanh toán** khi đặt
hàng — sai một điều khoản là sai tiền của mọi đơn đặt hàng theo hợp đồng đó.
