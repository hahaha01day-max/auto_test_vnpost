# 18_5 — Đổi trả hàng

Nguồn: `resource/hdsd/hdsd18_5_doi_tra_hang/` — 8 task.

**Chưa có test case nào.** Khung này dựng sẵn để điền vào.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
| `010` | Bắt đầu một đơn đổi trả từ đơn gốc | `18_5_010_001` … | — |
| `020` | Chọn hàng khách trả lại và lý do trả | `18_5_020_001` … | — |
| `030` | Thêm hàng đổi mới và nhập phí trả hàng | `18_5_030_001` … | — |
| `040` | Xử lý quà tặng khuyến mại khi khách trả hàng | `18_5_040_001` … | — |
| `050` | Hoàn tiền cho khách và chốt đơn hoàn trả | `18_5_050_001` … | — |
| `060` | Tra cứu danh sách đơn hàng hoàn trả | `18_5_060_001` … | — |
| `070` | Duyệt hoặc từ chối đơn hoàn trả quá hạn | `18_5_070_001` … | — |
| `080` | Xem chi tiết một đơn hoàn trả | `18_5_080_001` … | — |

## Cách điền

1. Đọc `resource/hdsd/hdsd18_5_doi_tra_hang/tasks/<mã task>_*.md` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào `test-cases.csv`, mã đặt theo `18_5_<mã task>_<STT>`.
3. Viết spec trong `tests/`, title là `'<mã> - <tên case>'`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.
