# 18_2 — Khách hàng và ưu đãi tại quầy

Mã phân hệ lấy theo `resource/hdsd/hdsd18_2_*`. Mã test case: `<mã phân hệ>_<mã task>_<STT>`.

## Task và case

| Mã task | Task (theo HDSD) | Số case |
|---|---|--:|
| 010 | chon_khach_hang (+ ghi chú đơn) | 18 |
| 020 | ap_dung_khuyen_mai | 46 |
| 030 | ap_dung_coupon | 17 |
| 040 | xuat_hoa_don_dien_tu | 22 |
| 050 | *(từ sheet QC)* đổi điểm thưởng khi thanh toán | 12 |
| | **Tổng** | **115** |

Độ phủ sheet QC: **10/10** — xem [`doi-chieu-tai-lieu-goc.md`](doi-chieu-tai-lieu-goc.md).

## 🔴 Hai điều phải đọc trước khi chạy

1. **46 case nhóm `020` đều kết thúc bằng `checkoutAndPay`** — chạy là **tạo 46 đơn hàng thật** và
   trừ tồn kho thật. Script đã có sẵn (`tests/vnpost-promotion-pos.playwright.spec.js`), nên kiểm
   cấu hình môi trường trước khi bật. Toàn bộ đang `enabled: false` + `allowMutation: false`.
2. **Kỳ vọng của 45/46 case `020` trích từ assertion của spec, chưa đối chiếu cấu hình CTKM thật**
   trong `MARKETING_CAMPAIGN`. Xem mục 1 và lỗ hổng (a) ở [`test-cases.md`](test-cases.md).

## Nguồn

- HDSD: `resource/hdsd/hdsd18_2_khach_hang_va_uu_dai/tasks/*.md` (đọc trọn 4/4)
- Sheet QC: `FUNC_LOYALTY__30`–`FUNC_LOYALTY__39`
- Code FE: `vnpost-web/src/features/order/**`
- Spec sẵn có: `tests/vnpost-promotion-pos.playwright.spec.js` (45 khối `test()` parse được)

## Vai

Cả 4 task chỉ khai `DIEM_BAN` ⇒ dùng **`gdv`**. Task 020 cần thêm quyền `adjust_order_campaign`.
🔴 Chưa có tài khoản **thiếu** quyền này nên chưa dựng được case ô chọn CTKM bị mờ.

## Chạy

```bash
npm run test:18_2:list
```
