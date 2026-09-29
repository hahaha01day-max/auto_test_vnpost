# 04_2 — Khai báo tồn kho đầu kỳ

Nguồn: `resource/hdsd/hdsd04_2_ton_kho_dau_ky/` — 3 task.

**Chưa có test case nào.** Khung này dựng sẵn để điền vào.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
| `010` | Tải tệp mẫu và chuẩn bị dữ liệu tồn đầu kỳ | `04_2_010_001` … | — |
| `020` | Khai báo tồn đầu kỳ từ tệp Excel | `04_2_020_001` … | — |
| `030` | Tra cứu lượt khai báo và sản phẩm đã khai báo | `04_2_030_001` … | — |

## Cách điền

1. Đọc `resource/hdsd/hdsd04_2_ton_kho_dau_ky/tasks/<mã task>_*.md` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào `test-cases.csv`, mã đặt theo `04_2_<mã task>_<STT>`.
3. Viết spec trong `tests/`, title là `'<mã> - <tên case>'`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.
