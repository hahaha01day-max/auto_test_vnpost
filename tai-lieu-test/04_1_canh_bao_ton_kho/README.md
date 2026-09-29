# 04_1 — Cảnh báo tồn kho và đề xuất nhập hàng

Mã phân hệ lấy theo `resource/hdsd/hdsd04_1_*`. Mã test case: `04_1_<mã task>_<STT>`.

**72 test case** · đã có script **52** · phủ **30/30** case gốc sheet QC.

🔴 **Đọc `test-cases.md` trước khi viết script** — mục 2 có sơ đồ phân nhánh màn Cài đặt theo cấp
đơn vị và theo phạm vi (cấp xã có nhãn riêng; phạm vi nhiều tỉnh mất hẳn một thẻ), mục 4 có hai bẫy
locator đã trả giá.

## Task và case

| Mã task | Task (theo HDSD) | Số case |
|---|---|--:|
| 010 | theo_doi_canh_bao | 16 |
| 020 | cau_hinh_dinh_muc | 23 |
| 030 | nhap_cau_hinh_excel | 8 |
| 040 | de_xuat_nhap_hang | 10 |
| 050 | phieu_tu_dong | 9 |
| 060 | canh_bao_han_su_dung | 6 |

## 🔴 Case ghi dữ liệu — 30 case, `allowMutation: false`

Cài / xoá ngưỡng ảnh hưởng cảnh báo của **cả đơn vị**; nhập Excel ghi hàng loạt; đề xuất tự động
**sinh phiếu đề xuất thật**.

## Nguồn

- Sheet QC `test-case-goc/` nhóm *Cảnh báo tồn kho* + *Cài đặt cảnh báo* (30 case, phủ hết)
- Trace code `vnpost-web/src/features/stockAlert/**`
- Quét 11 kỹ thuật mục 3.4 skill `test-scenario`
