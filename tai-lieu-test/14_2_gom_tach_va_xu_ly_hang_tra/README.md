# 14_2 — Gom, tách và xử lý hàng trả

Mã phân hệ lấy theo `resource/hdsd/hdsd14_2_*`. Mã test case: `<mã phân hệ>_<mã task>_<STT>`.

🔴 **Route đúng là `/inventory/stock-return-request`** — bản 18/09 ghi nhầm `/inventory/return-to-supplier`
(đó là màn xuất trả theo PO, thuộc `14_1` nhóm `060`). Đọc mục 1 [`test-cases.md`](test-cases.md).

## Task và case

| Mã task | Task (theo HDSD) | Vai | Số case |
|---|---|---|--:|
| 010 | gom_phieu | tỉnh · TCT | 17 |
| 020 | tach_phieu_theo_ncc | tỉnh · TCT | 17 |
| 030 | nhap_hang_ve_kho_tinh | **chỉ tỉnh** | 13 |
| 040 | xu_ly_hang_cho_tra | tỉnh · TCT | 25 |
| 050 | gui_phieu_len_tct | **chỉ tỉnh** | 11 |
| 060 | theo_doi_dot_tra | tỉnh · TCT | 25 |
| | | **Tổng** | **108** |

## Nguồn

- HDSD: `resource/hdsd/hdsd14_2_gom_tach_va_xu_ly_hang_tra/tasks/*.md` (đọc trọn 6/6)
- Sheet QC: 🚫 **không phủ** phân hệ này ⇒ cột `Ma goc` trống toàn bộ
- Code FE: `vnpost-web/src/features/returnToSupplier/{pages,components/returnRequest}/**`
- Code BE: `vnpost-pod-service/.../stock/return_request/{ReturnRequestController,service/ReturnRequestService}.java`

## 🔴 Điều kiện chạy

**Đây là phân hệ nguy hiểm nhất trong cả bộ** — 69/108 case ghi dữ liệu, tất cả `enabled: false` +
`allowMutation: false`. Không thao tác nào hoàn tác được bằng UI: gom và tách đổi cấu trúc chứng từ
vĩnh viễn; nhập lại kho và hoàn về điểm bán **tăng tồn thật**; huỷ vỡ hỏng **xoá hàng khỏi sổ**;
xác nhận đợt trả khởi động chuỗi **ghi giảm công nợ NCC**. Xem mục 7 `test-cases.md`.

Cần **4 tài khoản tách vai**: `province` và `tct` là bắt buộc (nhóm `060` có nhánh chỉ hiện đúng cấp
giữ hàng); `shop` và `ward` cho case phạm vi.

## Chạy

```bash
npm run test:14_2:list
```
