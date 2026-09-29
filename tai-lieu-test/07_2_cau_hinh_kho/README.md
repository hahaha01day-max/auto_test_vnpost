# 07_2 — Cấu hình kho hàng

**53 test case** (25 → 53) · phủ **35/35** case gốc · chưa có script.

🔴 Cài một cấu hình khoá kho là **chặn ngay** nghiệp vụ nhập/xuất/chuyển/kiểm kho của toàn bộ phạm vi đã chọn. 43/53 case ghi dữ liệu. `test-cases.md` mục 7 có **3 lỗi dữ liệu sheet** (hai case bị đảo tên/kỳ vọng, hai case lẫn nội dung sang quản lý danh mục).

Nguồn: `resource/hdsd/hdsd07_2_cau_hinh_kho/` — 5 task.

**Chưa có test case nào.** Khung này dựng sẵn để điền vào.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
| `10` | Thêm một cấu hình khoá kho | `07_2_10_001` … | — |
| `20` | Xem chi tiết và bỏ khoá một cấu hình khoá kho | `07_2_20_001` … | — |
| `30` | Khai báo cho phép bán tồn kho âm | `07_2_30_001` … | — |
| `40` | Thêm một cấu hình cảnh báo hàng sắp hết hạn | `07_2_40_001` … | — |
| `50` | Tra cứu, sửa nhanh và xoá cấu hình cảnh báo hết hạn | `07_2_50_001` … | — |

## Cách điền

1. Đọc `resource/hdsd/hdsd07_2_cau_hinh_kho/tasks/<mã task>_*.md` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào `test-cases.csv`, mã đặt theo `07_2_<mã task>_<STT>`.
3. Viết spec trong `tests/`, title là `'<mã> - <tên case>'`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.
