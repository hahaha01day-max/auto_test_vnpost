# 10 — Quản lý bảng giá sản phẩm

Nguồn: `resource/hdsd/hdsd10_bang_gia_ban_san_pham/` — 6 task.

**Chưa có test case nào.** Khung này dựng sẵn để điền vào.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
| `010` | Tra cứu, lọc danh sách bảng giá và xuất ra tệp Excel | `10_010_001` … | — |
| `020` | Lập bảng giá mới | `10_020_001` … | — |
| `030` | Cập nhật bảng giá đã lập | `10_030_001` … | — |
| `040` | Xem chi tiết bảng giá và lịch sử cập nhật | `10_040_001` … | — |
| `050` | Phê duyệt bảng giá, kích hoạt và ngừng kích hoạt | `10_050_001` … | — |
| `060` | Xoá bảng giá không còn dùng | `10_060_001` … | — |

## Cách điền

1. Đọc `resource/hdsd/hdsd10_bang_gia_ban_san_pham/tasks/<mã task>_*.md` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào `test-cases.csv`, mã đặt theo `10_<mã task>_<STT>`.
3. Viết spec trong `tests/`, title là `'<mã> - <tên case>'`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.
