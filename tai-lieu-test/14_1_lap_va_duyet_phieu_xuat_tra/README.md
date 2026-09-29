# 14_1 — Lập và duyệt phiếu xuất trả nhà cung cấp

Mã phân hệ lấy theo `resource/hdsd/hdsd14_1_*`. Mã test case: `<mã phân hệ>_<mã task>_<STT>` —
ví dụ `14_1_010_001`.

🔴 Phân hệ này phủ **hai màn hình khác nhau cùng tên "Xuất trả nhà cung cấp"** — đọc mục 1 của
[`test-cases.md`](test-cases.md) trước khi viết script, nếu không sẽ trace nhầm màn.

## Task và case

| Mã task | Task (theo HDSD) | Màn hình | Số case |
|---|---|---|--:|
| 010 | tao_phieu_xuat_tra | `/inventory/stock-return-request/create` | 44 |
| 020 | sua_va_nop_phieu | `/inventory/stock-return-request/edit/:id` | 12 |
| 030 | tra_cuu_va_xem_chi_tiet | `/inventory/stock-return-request` | 25 |
| 040 | duyet_phieu | modal "Duyệt phiếu xuất trả NCC" | 26 |
| 050 | tu_choi_hoac_huy_phieu | menu "Xử lý" trên danh sách | 7 |
| 060 | *(không có trong HDSD)* xuất trả theo PO | `/inventory/return-to-supplier` | 28 |
| | | **Tổng** | **142** |

Nhóm `060` 🚫 không có task HDSD tương ứng — dựng từ sheet QC `NCC_109`–`NCC_129` cộng trace code
`ReturnToSupplierFormPage.jsx`.

## Nguồn

- HDSD: `resource/hdsd/hdsd14_1_lap_va_duyet_phieu_xuat_tra/tasks/*.md` (5 task)
- Sheet QC: `uat_vnpost_nha_cung_cap.csv` (`NCC_109`–`NCC_129`) ·
  `uat_vnpost_quan_ly_kho.csv` (`FUNC_1_447`–`FUNC_1_451`)
- Code: `vnpost-web/src/features/returnToSupplier/**` ·
  `vnpost-pod-service/.../modules/stock/return_request/service/ReturnRequestService.java`
- Thư mục này chuyển từ `10-nha-cung-cap`

## Độ phủ tài liệu gốc

26/26 case gốc đã phủ — xem [`doi-chieu-tai-lieu-goc.md`](doi-chieu-tai-lieu-goc.md).

## 🔴 Điều kiện chạy

- **63/142 case ghi dữ liệu**, tất cả đang `enabled: false` + `allowMutation: false`.
  Môi trường trỏ dữ liệu thật — 🚫 không bật khi chưa có lệnh của user.
- Cần **4 tài khoản tách vai**: `shop`, `ward`, `province`, `tct`. Thiếu vai nào thì case của vai đó
  **skip kèm lý do**, 🚫 không được chạy bằng tài khoản quá quyền (xem mục 6 `test-cases.md`).

## Chạy

```bash
npm run test:14_1:list
```
