# 07_3 — Cấu hình đơn hàng và thanh toán

**18 test case** (13 → 18) · chưa có script.

🔴 Hai câu hỏi chặn ở `test-cases.md` mục 2: nghĩa của giá trị **0** ở ô giới hạn thời gian trả hàng (không cho đổi trả hay không giới hạn — trái ngược nhau), và **tắt hết phương thức thanh toán**.

Nguồn: `resource/hdsd/hdsd07_3_don_hang_va_thanh_toan/` — 4 task.

**Chưa có test case nào.** Khung này dựng sẵn để điền vào.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
| `10` | Khai báo chính sách đổi trả và ngưỡng hoàn trả bất thường | `07_3_10_001` … | — |
| `20` | Khai báo nội dung in trên hoá đơn bán hàng | `07_3_20_001` … | — |
| `30` | Liên kết và quản lý tài khoản thanh toán | `07_3_30_001` … | — |
| `40` | Bật tắt các phương thức thanh toán được phép dùng | `07_3_40_001` … | — |

## Cách điền

1. Đọc `resource/hdsd/hdsd07_3_don_hang_va_thanh_toan/tasks/<mã task>_*.md` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào `test-cases.csv`, mã đặt theo `07_3_<mã task>_<STT>`.
3. Viết spec trong `tests/`, title là `'<mã> - <tên case>'`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.
