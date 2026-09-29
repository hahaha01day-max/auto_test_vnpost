# 33 — Lịch sử thao tác người dùng

Nguồn: `resource/hdsd/hdsd33_lich_su_thao_tac_nguoi_dung/` — 5 task.

**Chưa có test case nào.** Khung này dựng sẵn để điền vào.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
| `010` | Mở màn hình lịch sử và đọc hiểu bảng kết quả | `33_010_001` … | — |
| `020` | Lọc để tìm đúng thao tác cần kiểm tra | `33_020_001` … | — |
| `030` | Xem chi tiết một thao tác và đối chiếu thuộc tính đã đổi | `33_030_001` … | — |
| `040` | Đối chiếu toàn văn dữ liệu trước và sau thay đổi | `33_040_001` … | — |
| `050` | Theo dõi nhanh nhật ký thao tác ở Trang chủ | `33_050_001` … | — |

## Cách điền

1. Đọc `resource/hdsd/hdsd33_lich_su_thao_tac_nguoi_dung/tasks/<mã task>_*.md` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào `test-cases.csv`, mã đặt theo `33_<mã task>_<STT>`.
3. Viết spec trong `tests/`, title là `'<mã> - <tên case>'`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.
