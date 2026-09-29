# 17 — Quản lý quầy thu ngân

Nguồn: `resource/hdsd/hdsd17_quan_ly_quay_thu_ngan/` — 5 task.

**Chưa có test case nào.** Khung này dựng sẵn để điền vào.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
| `010` | Khai báo một quầy thu ngân mới | `17_010_001` … | — |
| `020` | Cập nhật tên và mã quầy thu ngân | `17_020_001` … | — |
| `030` | Ngừng hoạt động và kích hoạt lại quầy thu ngân | `17_030_001` … | — |
| `040` | Theo dõi và cấp tiền cho quỹ của quầy | `17_040_001` … | — |
| `050` | Chuyển tiền giữa quỹ của hai quầy | `17_050_001` … | — |

## Cách điền

1. Đọc `resource/hdsd/hdsd17_quan_ly_quay_thu_ngan/tasks/<mã task>_*.md` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào `test-cases.csv`, mã đặt theo `17_<mã task>_<STT>`.
3. Viết spec trong `tests/`, title là `'<mã> - <tên case>'`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.
