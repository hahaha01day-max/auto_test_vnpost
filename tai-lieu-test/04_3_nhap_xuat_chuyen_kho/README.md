# 04_3 — Nhập / xuất / chuyển kho

**97 test case** · phủ **107/107** case gốc sheet QC · script hiện có 5.

🔴 **Phân hệ GHI nặng nhất hệ thống: 70/97 case chạm tồn kho, giá vốn hoặc công nợ.**
76 case `enabled:false` — không phải làm tắt, mà vì không thể kiểm giá vốn hay chuyển kho đa cấp
mà không ghi dữ liệu thật. Điều kiện mở khoá ở `test-cases.md` mục 6.

**Đọc `test-cases.md` trước khi làm gì:**
- mục 2: danh mục 8 nhãn phiếu nhập + 6 nhãn phiếu xuất đang bật (nhiều nhãn khác đã comment out)
- mục 3: **4 nhóm câu hỏi số tiền chưa có đặc tả** — quyết định kỳ vọng của 8 case
- mục 4: **13 bẫy đã biết của repo** áp vào từng case (quantity đã là đơn vị gốc · MAC vẫn có lô ·
  scale 6 · thẻ kho đo bằng post−pre · id kho khác nhau mỗi pod…)

## Task

`010` lịch sử XNK (22) · `020` phiếu nhập (17) · `030` phiếu xuất (10) · `040` huỷ phiếu nhập —
bút toán đảo (5) · `050` lô hàng (10) · `060` chuyển kho (18) · `070` chuyển kho đa cấp TCT→Tỉnh→Điểm
bán + công nợ (14) · `080` màn chuyển kho (1)
