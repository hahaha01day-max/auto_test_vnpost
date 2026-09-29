# 14_3 — Hoá đơn cho hàng trả lại nhà cung cấp

Mã phân hệ lấy theo `resource/hdsd/hdsd14_3_*`. Mã test case: `<mã phân hệ>_<mã task>_<STT>`.

🔴 **Không có route riêng** — toàn bộ nằm trong khối `Các đợt trả nhà cung cấp` của drawer chi tiết
phiếu xuất trả (`/inventory/stock-return-request` › Chi tiết). Đọc mục 1 [`test-cases.md`](test-cases.md).

## Task và case

| Mã task | Task (theo HDSD) | Nhánh | Số case |
|---|---|---|--:|
| 010 | tiep_nhan_hoa_don_ncc | NCC lập hoá đơn | 21 |
| 020 | doi_soat_va_chot_chung_tu | NCC lập hoá đơn | 25 |
| 030 | xu_ly_khi_lech_hoac_chua_ro | NCC lập hoá đơn | 22 |
| 040 | phat_hanh_hoa_don_xuat_tra | **VNPost lập hoá đơn** | 21 |
| | | **Tổng** | **89** |

## Luật đối soát — con số chốt được

| Vế | Luật |
|---|---|
| Số lượng | khớp **tuyệt đối** sau quy đổi về đơn vị gốc |
| Tiền | lệch **≤ 10 đồng** vẫn khớp (`MONEY_TOLERANCE = BigDecimal.TEN`) |

## Nguồn

- HDSD: `resource/hdsd/hdsd14_3_hoa_don_hang_tra_lai/tasks/*.md` (đọc trọn 4/4)
- Sheet QC: 🚫 **không phủ** phân hệ này
- Code FE: `vnpost-web/src/features/returnToSupplier/components/returnRequest/CreditNote*.jsx`,
  `IssueReturnInvoiceDrawer.jsx`, `services/returnCreditNoteApi.js`
- Code BE: `vnpost-pod-service/.../stock/return_credit_note/**`

## 🔴 Điều kiện chạy

**48/89 case ghi dữ liệu**, tất cả `enabled: false` + `allowMutation: false`. Chốt chứng từ sinh
**bút toán ghi giảm công nợ NCC** không gỡ được; phát hành hoá đơn đẩy chứng từ ra **cơ quan thuế**
và **không thu hồi được**.

⚠️ **Chặn lớn nhất: chưa có bộ tệp XML mẫu.** Phần lớn case nhóm `010` cần tệp hoá đơn điện tử ở
nhiều biến thể (khớp · lệch 8đ · lệch 10đ · lệch 11đ · điều chỉnh tăng · không dòng hàng · >10MB ·
XML hỏng). Dựng từ `vnpost-web/src/features/returnToSupplier/utils/buildSampleCreditNoteXml.js`.

## Chạy

```bash
npm run test:14_3:list
```
