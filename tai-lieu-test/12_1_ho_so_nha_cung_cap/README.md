# 12_1 — Hồ sơ nhà cung cấp

**32 test case** (21 → 32) · phủ **25/25** case gốc · **31/32 có phép kiểm thật** + 1 skip có lý do (23/09/2026, xem `test-cases.md`).

🔴 `CHAIN_SUPPLIER` (cấp chuỗi) khác `SHOP_SUPPLIER` (cấp điểm bán) — đối chiếu phải biết đang đọc bảng nào. Xoá NCC đã có PO/công nợ phải bị chặn.

Mã phân hệ lấy theo `resource/hdsd/hdsd12_1_*`.

Mã test case: `<mã phân hệ>_<mã task>_<STT>` — ví dụ `12_1_010_001`.

## Task và case

| Mã task | Task (theo HDSD) | Số case |
|---|---|--:|
| 010 | tra_cuu_nha_cung_cap | 2 |
| 020 | xem_chi_tiet_nha_cung_cap | 1 |
| 030 | them_nha_cung_cap | 3 |
| 070 | quan_ly_nhom_ncc | 15 |

## Nguồn

- chuyển từ `10-nha-cung-cap`
