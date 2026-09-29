# 04_4 — Kiểm kho

**33 test case** · phủ **31/31** case gốc sheet QC · script hiện có 2.

🔴 **Đọc `test-cases.md` mục 2 TRƯỚC MỌI VIỆC KHÁC.** Câu hỏi ở đó — *dòng bỏ trống số lượng thực tế
có bị coi là "đếm 0" hay không* — nếu trả lời là "có" thì việc áp dụng phiếu kiểm kho sẽ **xoá sạch
tồn kho của mọi sản phẩm chưa kiểm**. Sheet QC không có case nào cho nó; đã tự dựng `04_4_030_006`.

22/33 case GHI tồn kho. Áp dụng phiếu kiểm kho **không hoàn tác được bằng UI** — chỉ sửa được bằng
phiếu kiểm kho mới, mà lại chỉ được có một phiếu nháp tại một thời điểm.

## Task

`010` form lập phiếu (1) · `020` file mẫu + upload (5) · `030` tính chênh lệch (6) ·
`040` nháp → áp dụng (5) · `050` danh sách + chi tiết (6) · `060` kiểm kê theo lô, tồn 0 / âm (5) ·
`070` kỳ kế toán và bán âm (5)
