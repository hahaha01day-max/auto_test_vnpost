# 09 — Sản xuất sản phẩm

**23 test case** (15 → 23, bổ sung 18/09/2026) · chưa có script. Sheet QC không phủ phân hệ này.

🔴 `test-cases.md` có 4 điểm bổ sung, quan trọng nhất: `09_040_006` phải đối chiếu **giá vốn** của phiếu nhập thành phẩm — nhập thành phẩm sản xuất từng bị **bóc VAT sai**.

Nguồn: `resource/hdsd/hdsd09_san_pham_san_xuat/` — 4 task.

**Chưa có test case nào.** Khung này dựng sẵn để điền vào.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
| `010` | Tạo phiếu sản xuất | `09_010_001` … | — |
| `020` | Ghi mã lô, serial và phân bổ lô nguyên liệu | `09_020_001` … | — |
| `030` | Xác nhận sản xuất | `09_030_001` … | — |
| `040` | Tra cứu và xem chi tiết phiếu sản xuất | `09_040_001` … | — |

## Cách điền

1. Đọc `resource/hdsd/hdsd09_san_pham_san_xuat/tasks/<mã task>_*.md` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào `test-cases.csv`, mã đặt theo `09_<mã task>_<STT>`.
3. Viết spec trong `tests/`, title là `'<mã> - <tên case>'`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.
