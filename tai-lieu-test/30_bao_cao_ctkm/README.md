# 30 — Báo cáo hiệu quả chương trình khuyến mại

Nguồn: `resource/hdsd/hdsd30_bao_cao_ctkm/` — 4 task.

**Chưa có test case nào.** Khung này dựng sẵn để điền vào.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
| `010` | Tra cứu hiệu quả các chương trình khuyến mại trong kỳ | `30_010_001` … | — |
| `020` | Lọc báo cáo theo tiêu chí | `30_020_001` … | — |
| `030` | Xem chi tiết hiệu quả một chương trình | `30_030_001` … | — |
| `040` | Xuất báo cáo hiệu quả ra tệp Excel | `30_040_001` … | — |

## Cách điền

1. Đọc `resource/hdsd/hdsd30_bao_cao_ctkm/tasks/<mã task>_*.md` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào `test-cases.csv`, mã đặt theo `30_<mã task>_<STT>`.
3. Viết spec trong `tests/`, title là `'<mã> - <tên case>'`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.
