# 07_4 — Cấu hình vận hành

**32 test case** (13 → 32) · phủ **20/20** case gốc · chưa có script.

🔴 `test-cases.md` mục 3 có **5 câu hỏi đều dẫn tới phiếu treo** — đổi cấu hình hạn mức duyệt mà không biết phiếu đang chờ dở sẽ ra sao.

Nguồn: `resource/hdsd/hdsd07_4_van_hanh/` — 4 task.

**Chưa có test case nào.** Khung này dựng sẵn để điền vào.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
| `10` | Khai báo cho phép nhận đặt hàng trước | `07_4_10_001` … | — |
| `20` | Khai báo hạn mức duyệt và các bước duyệt theo khoảng tiền | `07_4_20_001` … | — |
| `30` | Khai báo nội dung, kênh gửi và vai trò nhận thông báo | `07_4_30_001` … | — |
| `40` | Khai báo và kiểm tra hòm mail nhận hoá đơn nhà cung cấp | `07_4_40_001` … | — |

## Cách điền

1. Đọc `resource/hdsd/hdsd07_4_van_hanh/tasks/<mã task>_*.md` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào `test-cases.csv`, mã đặt theo `07_4_<mã task>_<STT>`.
3. Viết spec trong `tests/`, title là `'<mã> - <tên case>'`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.
