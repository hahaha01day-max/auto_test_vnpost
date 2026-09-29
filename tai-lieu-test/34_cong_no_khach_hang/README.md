# 34 — Công nợ khách hàng

Nguồn: `resource/hdsd/hdsd34_cong_no_khach_hang/` — 4 task.

**Chưa có test case nào.** Khung này dựng sẵn để điền vào.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
| `010` | Tra cứu công nợ khách hàng của đơn vị | `34_010_001` … | — |
| `020` | Xem công nợ chi tiết của một khách hàng | `34_020_001` … | — |
| `030` | Xem lại chi tiết một phiếu công nợ | `34_030_001` … | — |
| `040` | Lập phiếu thanh toán thu hồi nợ khách hàng | `34_040_001` … | — |

## Cách điền

1. Đọc `resource/hdsd/hdsd34_cong_no_khach_hang/tasks/<mã task>_*.md` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào `test-cases.csv`, mã đặt theo `34_<mã task>_<STT>`.
3. Viết spec trong `tests/`, title là `'<mã> - <tên case>'`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.
