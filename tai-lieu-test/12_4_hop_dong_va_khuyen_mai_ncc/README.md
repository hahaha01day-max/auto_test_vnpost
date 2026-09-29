# 12_4 — Hợp đồng và khuyến mãi nhà cung cấp

**60 test case** (20 → 60) · phủ **65/65** case gốc.

🔴 Hợp đồng NCC chi phối tiền của **mọi PO**: chiết khấu % · hạn mức công nợ · hạn thanh toán · thời hạn được trả hàng. CTKM cấp NCC áp ở **mức RULE**, không phải mức sản phẩm.

Nguồn: `resource/hdsd/hdsd12_4_hop_dong_va_khuyen_mai_ncc/` — 7 task.

**Chưa có test case nào.** Khung này dựng sẵn để điền vào.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
| `010` | Tra cứu hợp đồng nhà cung cấp | `12_4_010_001` … | — |
| `020` | Khai báo hợp đồng nhà cung cấp mới | `12_4_020_001` … | — |
| `030` | Phê duyệt, ngừng kích hoạt và kích hoạt lại hợp đồng | `12_4_030_001` … | — |
| `040` | Xem chi tiết hợp đồng và các đơn đặt hàng theo hợp đồng | `12_4_040_001` … | — |
| `050` | Tra cứu chương trình khuyến mãi đặt hàng | `12_4_050_001` … | — |
| `060` | Lập chương trình khuyến mãi đặt hàng | `12_4_060_001` … | — |
| `070` | Kích hoạt, ngừng và huỷ chương trình khuyến mãi | `12_4_070_001` … | — |

## Cách điền

1. Đọc `resource/hdsd/hdsd12_4_hop_dong_va_khuyen_mai_ncc/tasks/<mã task>_*.md` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào `test-cases.csv`, mã đặt theo `12_4_<mã task>_<STT>`.
3. Viết spec trong `tests/`, title là `'<mã> - <tên case>'`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.
