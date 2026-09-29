# 26 — Phiếu thu

Nguồn: `resource/hdsd/hdsd26_phieu_thu/` — 5 task.

**Chưa có test case nào.** Khung này dựng sẵn để điền vào.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
| `10` | Tra cứu, lọc, in và xuất danh sách phiếu thu | `26_10_001` … | — |
| `20` | Lập một phiếu thu mới | `26_20_001` … | — |
| `30` | Xem chi tiết và chỉnh sửa phiếu thu | `26_30_001` … | — |
| `40` | Xoá một phiếu thu lập sai | `26_40_001` … | — |
| `50` | Quản lý danh mục phân loại phiếu thu | `26_50_001` … | — |

## Cách điền

1. Đọc `resource/hdsd/hdsd26_phieu_thu/tasks/<mã task>_*.md` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào `test-cases.csv`, mã đặt theo `26_<mã task>_<STT>`.
3. Viết spec trong `tests/`, title là `'<mã> - <tên case>'`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.

## Trạng thái script (23/09/2026, lane 8)

- Vai chức năng = `shop` (Cửa hàng trưởng): vai `gdv` (SHOP_SALE) bị `SSHOP-401` ở `view_all_receipts`,
  không có `CREATE_EXPENSES_V2` ⇒ chỉ dùng cho case giao diện và `26_PQ_001`.
- Chuỗi ghi: `tests/phieu-thu-ghi.shop.spec.js` (ghi chú/tên `AUTOTEST_26_*`, test cuối `26_DON` dọn).
- Đỏ có chủ đích (lệch đặc tả / lỗi sản phẩm): `26_050_002`, `26_050_004`, `26_070_001`, `26_080_006`, `26_090_004`.
