# 19 — Quản lý khách hàng

Nguồn: `resource/hdsd/hdsd19_quan_ly_khach_hang/` — 11 task.

**Chưa có test case nào.** Khung này dựng sẵn để điền vào.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
| `010` | Tra cứu và tìm kiếm khách hàng | `19_010_001` … | — |
| `020` | Thêm khách hàng mới | `19_020_001` … | — |
| `030` | Cập nhật hồ sơ khách hàng | `19_030_001` … | — |
| `040` | Xem hồ sơ và số liệu tổng hợp của khách hàng | `19_040_001` … | — |
| `050` | Ngừng hoạt động, kích hoạt lại và xoá khách hàng | `19_050_001` … | — |
| `060` | Xem đơn hàng của khách hàng | `19_060_001` … | — |
| `070` | Xem ví điểm và lịch sử tích điểm của khách hàng | `19_070_001` … | — |
| `080` | Xem sản phẩm khách hàng đã mua | `19_080_001` … | — |
| `090` | Theo dõi và thu hồi công nợ khách hàng | `19_090_001` … | — |
| `100` | Nhập khách hàng từ tệp Excel | `19_100_001` … | — |
| `110` | Xuất danh sách khách hàng ra tệp Excel | `19_110_001` … | — |

## Cách điền

1. Đọc `resource/hdsd/hdsd19_quan_ly_khach_hang/tasks/<mã task>_*.md` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào `test-cases.csv`, mã đặt theo `19_<mã task>_<STT>`.
3. Viết spec trong `tests/`, title là `'<mã> - <tên case>'`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.
