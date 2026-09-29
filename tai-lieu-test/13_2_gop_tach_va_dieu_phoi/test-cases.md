# Kịch bản auto test — 13_2 Gộp / tách và điều phối

- **Bổ sung 18/09/2026.** **1 → 3 case.** Phủ **2/2** case gốc (trước đó 0). Script hiện có 1.

## Cách chuyển thể

Sheet `quan_ly_kho` / `nha_cung_cap` ghi **kỳ vọng đầy đủ**, nên case bổ sung được **chép nguyên văn**
bước và kỳ vọng (cột `Nguon` = *"Sheet QC (chuyển thể nguyên văn)"*), chỉ thêm một dòng 🔴 nhắc bẫy
của repo ở cuối mỗi kỳ vọng. 🚫 Không diễn giải lại.

## Phạm vi sheet QC rất nhỏ — nhưng nghiệp vụ thì không

Sheet chỉ có **2 case** (nhóm *Xem lịch sử gộp/tách phiếu*), trong khi nghiệp vụ gộp/tách thực sự nằm
ở phân hệ `13_1` task `070` `080` (15 case). Phân hệ này là **vế truy nguyên**:

🔴 Từ phiếu tổng phải tra ngược ra **đủ** các phiếu con, và từ phiếu con tra được phiếu tổng. **Tổng
số lượng hai chiều phải khớp** — đây là chốt chặn chống hụt hàng khi gộp/tách.

## Phân loại: `READY` 1 · `READY_WITH_CODE_LOOKUP` 1 · `BLOCKED` 1 · case ghi **1**

⚠️ Bàn giao nêu `13_2` là ví dụ cột "Có script" gây hiểu nhầm: *"khai đúng 1 case và case đó có
script, trong khi sheet QC có 2 case"*. Nay đã phủ đủ 2/2.

## 🔴 Kết quả chạy script — 20/09/2026

**3/3 case có script.** Lượt chạy: **1 đạt · 0 đỏ · 2 skip**. Spec cũ (URL production viết cứng)
đã xoá.

🔴 `13_2_030_001` skip kèm lý do: màn *Phiếu đề xuất đặt hàng* của vai điểm bán 🚫 **không có phần
lịch sử gộp/tách**. Tiền điều kiện của kịch bản (*"đã có ít nhất một lượt gộp và một lượt tách"*)
cũng không dựng được bằng auto test — gộp/tách là điều phối hàng thật giữa các đơn vị.
**Cần user chỉ đúng lối vào màn lịch sử gộp/tách.**
