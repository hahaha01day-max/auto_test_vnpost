# 16 — Hàng ký gửi

Mã phân hệ lấy theo `resource/hdsd/hdsd16_hang_ky_gui`. Mã test case: `<mã phân hệ>_<mã task>_<STT>`.

🔴 **Phân hệ này gọi API của HAI service** — pod-service (không prefix) và report-service (prefix
`/report`). Đọc mục 2 [`test-cases.md`](test-cases.md) trước khi viết script.

## Task và case

| Mã task | Task (theo HDSD) | Màn hình | Số case |
|---|---|---|--:|
| 010 | tra_cuu_cong_no_ky_gui | `/debt-reconciliation/consignment-debt` | 22 |
| 020 | sinh_ky_doi_soat | `/debt-reconciliation/consignment-recon` | 17 |
| 030 | ra_soat_va_chot_ky | `.../consignment-recon/:id` | 28 |
| 040 | ghi_nhan_hoa_don_ncc | thẻ "Hoá đơn NCC" của kỳ | 19 |
| 050 | ghi_no_chinh_thuc | thẻ "Hoá đơn NCC" của kỳ | 20 |
| 060 | xem_bao_cao_ky_gui | `/report/consignment` | 28 |
| 070 | *(không có trong HDSD)* ghi nợ nội bộ TCT↔BĐT | API | 4 |
| | | **Tổng** | **138** |

🔴 Nhóm `070` dựng từ code — HDSD 🚫 không nhắc luồng này. Xem lỗ hổng (a) ở `test-cases.md`.

## Nguồn

- HDSD: `resource/hdsd/hdsd16_hang_ky_gui/tasks/*.md` (đọc trọn 6/6)
- Sheet QC: 🚫 **không phủ** phân hệ này
- Code FE: `vnpost-web/src/features/consignment{Debt,Recon,Invoice,Report}/**`
- Code BE: `vnpost-pod-service/.../modules/consignment_{recon,invoice,debt}/**` ·
  `vnpost-report-service/.../modules/consignment/**`

## 🔴 Điều kiện chạy

**38/138 case ghi dữ liệu**, tất cả `enabled: false` + `allowMutation: false`.

- **Chốt kỳ là một chiều** — biên bản đóng băng, không mở lại được, không xoá được.
- **Ghi nợ chính thức** sinh bút toán vào sổ công nợ NCC và **mở khoá lệnh chi tiền**. Bút toán không
  sửa trực tiếp được, chỉ điều chỉnh bằng chứng từ điều chỉnh.

⚠️ Cần tệp XML hoá đơn mẫu cho nhóm `040` — UI có sẵn nút **"Tải XML mẫu để test"** sinh tệp tại máy.

## Chạy

```bash
npm run test:16:list
```
