# 27 — Đối soát hoá đơn

Nguồn: `resource/hdsd/hdsd27_doi_soat_hoa_don/` — 6 task.

**Chưa có test case nào.** Khung này dựng sẵn để điền vào.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
| `010` | Tải hoá đơn điện tử của nhà cung cấp lên hệ thống | `27_010_001` … | — |
| `020` | Tra cứu tình trạng đối soát hoá đơn | `27_020_001` … | — |
| `030` | Xem nội dung một hoá đơn và các hoá đơn cùng phiếu | `27_030_001` … | — |
| `040` | Tìm chỗ lệch giữa hoá đơn, phiếu đặt hàng và phiếu nhập kho | `27_040_001` … | — |
| `050` | Sửa lại thông tin hoá đơn và cho đối chiếu lại | `27_050_001` … | — |
| `060` | Xác nhận hạch toán công nợ cho phiếu đặt hàng | `27_060_001` … | — |

## Cách điền

1. Đọc `resource/hdsd/hdsd27_doi_soat_hoa_don/tasks/<mã task>_*.md` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào `test-cases.csv`, mã đặt theo `27_<mã task>_<STT>`.
3. Viết spec trong `tests/`, title là `'<mã> - <tên case>'`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.
