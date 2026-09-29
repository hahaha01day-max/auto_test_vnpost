# 07_1 — Cấu hình chung toàn hệ thống

**29 test case** (23 → 29, bổ sung 18/09/2026) · chưa có script.

🔴 `test-cases.md` có mục **32 nhóm cấu hình trong menu — 8 nhóm KHÔNG có phân hệ nào phủ**, trong đó `roundingAmountStock` (Làm tròn tiền phần kho) đã bổ sung vào task `060` của phân hệ này.

Nguồn: `resource/hdsd/hdsd07_1_cau_hinh_chung/` — 5 task.

**Chưa có test case nào.** Khung này dựng sẵn để điền vào.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
| `10` | Khai báo cách làm tròn tiền | `07_1_10_001` … | — |
| `20` | Khai báo cách làm tròn số lượng | `07_1_20_001` … | — |
| `30` | Khai báo loại tiền tệ của hệ thống | `07_1_30_001` … | — |
| `40` | Khai báo thuế suất VAT mặc định | `07_1_40_001` … | — |
| `50` | Khai báo thời gian chờ tự động đăng xuất | `07_1_50_001` … | — |

## Cách điền

1. Đọc `resource/hdsd/hdsd07_1_cau_hinh_chung/tasks/<mã task>_*.md` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào `test-cases.csv`, mã đặt theo `07_1_<mã task>_<STT>`.
3. Viết spec trong `tests/`, title là `'<mã> - <tên case>'`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.
