# 08 — Quản lý sản phẩm

**98 test case** (17 → 98, bổ sung 18/09/2026) · phủ **132/132** case gốc · script hiện có 17.

🔴 **Đọc `test-cases.md` trước khi viết script.** Ba điểm quan trọng:
1. **Mục 2** — năm case `08_020_005`–`009` chạm đúng hai bẫy đơn vị đã gặp thật (`parent_id = 0`, `convert_to_main_unit = 1`), phải kiểm bằng SELECT chứ không chỉ UI.
2. **Mục 3** — 9 case gốc **trống nội dung** và 2 case gốc **không có kỳ vọng** (câu hỏi mất dữ liệu).
3. **Mục 4** — mọi case xoá là câu hỏi toàn vẹn dữ liệu; 74/98 case ghi dữ liệu.

Mã phân hệ lấy theo `resource/hdsd/hdsd08_*`.

Mã test case: `<mã phân hệ>_<mã task>_<STT>` — ví dụ `08_010_001`.

## Task và case

| Mã task | Task (theo HDSD) | Số case |
|---|---|--:|
| 010 | tra_cuu_san_pham | 2 |
| 020 | them_san_pham | 4 |
| 030 | cap_nhat_san_pham | 1 |
| 060 | quan_ly_danh_muc | 6 |
| 070 | nhap_excel | 2 |
| 080 | in_tem_nhan | 2 |

## Nguồn

- chuyển từ `04-quan-ly-san-pham-danh-muc-san-pham`
