# 13_3 — Đặt hàng nhà cung cấp và nhập hàng

**98 test case** (3 → 98) · phủ **98/98** case gốc · script hiện có 3.

🔴 Ràng buộc quan trọng nhất **không nằm trong phân hệ này**: hợp đồng NCC (`12_4` task `080`) quyết định chiết khấu, **hạn mức công nợ**, hạn thanh toán, thời hạn trả hàng.

🔴 Một lượt nhập hàng ghi vào **ba nơi**: tồn kho (`04_3`) · công nợ NCC (`12_3`) · trạng thái PO. Đối chiếu phải làm cả ba.

Mã phân hệ lấy theo `resource/hdsd/hdsd13_3_*`.

Mã test case: `<mã phân hệ>_<mã task>_<STT>` — ví dụ `13_3_010_001`.

## Task và case

| Mã task | Task (theo HDSD) | Số case |
|---|---|--:|
| 010 | tao_don_dat_hang | 1 |
| 030 | theo_doi_don_dat_hang | 2 |

## Nguồn

- chuyển từ `11-kho`
