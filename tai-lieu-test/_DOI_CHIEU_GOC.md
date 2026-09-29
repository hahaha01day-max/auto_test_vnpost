# Đối chiếu tài liệu gốc ↔ kịch bản — tổng hợp

> 🤖 **Sinh tự động.** Chạy lại: `node tool/bin/doi-chieu-goc.js --tong-hop`
> Cập nhật: 19/09/2026

- Case trong 19 tài liệu gốc: **1644**
- Đã gán được phân hệ: **1607** · chưa gán: **37**
- Case gốc **đã dựng**: **1553** · **chưa dựng**: **28**
- Phân hệ **chưa có cột `Ma goc`** nên chưa đối chiếu được: **0/38**

## 1. Theo phân hệ

| Phân hệ | Case gốc | Đã dựng | Chưa dựng | Ngoài gốc | Nối được? |
|---|--:|--:|--:|--:|---|
| `08_quan_ly_san_pham` | 132 | 132 | 0 | 9 | ✅ |
| `04_3_nhap_xuat_chuyen_kho` | 107 | 95 | 0 | 4 | ✅ |
| `13_3_dat_hang_va_nhap_hang` | 98 | 98 | 0 | 0 | ✅ |
| `10_bang_gia_ban_san_pham` | 82 | 81 | 0 | 8 | ✅ |
| `12_3_cong_no_nha_cung_cap` | 68 | 68 | 0 | 0 | ✅ |
| `32_mo_hinh_to_chuc` | 67 | 67 | 0 | 5 | ✅ |
| `12_4_hop_dong_va_khuyen_mai_ncc` | 65 | 65 | 0 | 6 | ✅ |
| `13_1_phieu_de_xuat_va_phe_duyet` | 60 | 53 | 7 | 2 | ✅ |
| `18_1_ban_hang_tai_quay` | 56 | 56 | 0 | 82 | ✅ |
| `01_quan_ly_diem_ban` | 54 | 50 | 0 | 84 | ✅ |
| `20_khach_hang_than_thiet` | 52 | 47 | 5 | 52 | ✅ |
| `29_bao_cao` | 51 | 51 | 0 | 27 | ✅ |
| `35-gia-von-mac-dinh` | 51 | 38 | 13 | 23 | ✅ |
| `11_khuyen_mai` | 50 | 49 | 0 | 32 | ✅ |
| `12_2_san_pham_va_bang_gia_ncc` | 50 | 50 | 0 | 1 | ✅ |
| `19_quan_ly_khach_hang` | 46 | 46 | 0 | 27 | ✅ |
| `31_quan_ly_phan_quyen` | 45 | 44 | 0 | 6 | ✅ |
| `04_5_quan_ly_ton_kho` | 45 | 45 | 0 | 1 | ✅ |
| `27_doi_soat_hoa_don` | 38 | 31 | 0 | 18 | ✅ |
| `07_2_cau_hinh_kho` | 35 | 35 | 0 | 21 | ✅ |
| `04_4_kiem_kho` | 31 | 31 | 0 | 2 | ✅ |
| `04_1_canh_bao_ton_kho` | 30 | 30 | 0 | 46 | ✅ |
| `17_quan_ly_quay_thu_ngan` | 28 | 25 | 3 | 43 | ✅ |
| `14_1_lap_va_duyet_phieu_xuat_tra` | 26 | 26 | 0 | 118 | ✅ |
| `02_quan_ly_nhan_vien` | 26 | 26 | 0 | 47 | ✅ |
| `18_5_doi_tra_hang` | 25 | 25 | 0 | 37 | ✅ |
| `12_1_ho_so_nha_cung_cap` | 25 | 25 | 0 | 7 | ✅ |
| `04_2_ton_kho_dau_ky` | 25 | 25 | 0 | 11 | ✅ |
| `03b_ca_lam_viec_nhan_vien` | 23 | 23 | 0 | 31 | ✅ |
| `07_4_van_hanh` | 20 | 20 | 0 | 12 | ✅ |
| `03a_quan_ly_ca_lich_lam_viec` | 19 | 19 | 0 | 47 | ✅ |
| `24_cong_no_nhan_vien` | 15 | 15 | 0 | 35 | ✅ |
| `26_phieu_thu` | 15 | 15 | 0 | 25 | ✅ |
| `34_cong_no_khach_hang` | 13 | 13 | 0 | 17 | ✅ |
| `12-don-vi-van-tai` | 12 | 12 | 0 | 96 | ✅ |
| `18_3_thanh_toan_va_bien_lai` | 10 | 10 | 0 | 43 | ✅ |
| `18_2_khach_hang_va_uu_dai` | 10 | 10 | 0 | 105 | ✅ |
| `13_2_gop_tach_va_dieu_phoi` | 2 | 2 | 0 | 1 | ✅ |

## 2. Sức khoẻ từng tài liệu gốc

| Tài liệu | Case đọc được | Sheet tự khai | Trùng lặp | Ghi chú |
|---|--:|--:|--:|---|
| `uat_vnpost_ban_hang.csv` | 163 | 163 | 1 |  |
| `uat_vnpost_ban_ton_kho_am.csv` | 9 | 9 |  |  |
| `uat_vnpost_bang_gia.csv` | 82 | 81 | 1 | ⚠️ lệch so với tổng sheet tự khai |
| `uat_vnpost_bao_cao.csv` | 38 | 38 |  |  |
| `uat_vnpost_bao_cao_cong_no_khach_hang.csv` | 13 | 13 |  |  |
| `uat_vnpost_ct_loyalty.csv` | 39 | 39 |  |  |
| `uat_vnpost_danh_muc_san_pham.csv` | 32 | 32 |  |  |
| `uat_vnpost_doi_tra_hang.csv` | 30 | 30 |  |  |
| `uat_vnpost_khach_hang.csv` | 38 | 38 |  |  |
| `uat_vnpost_loyalty.csv` | 18 | 18 |  |  |
| `uat_vnpost_mo_hinh_to_chuc.csv` | 67 | 67 |  |  |
| `uat_vnpost_nha_cung_cap.csv` | 253 | 253 |  |  |
| `uat_vnpost_nhan_vien.csv` | 54 | 54 | 1 |  |
| `uat_vnpost_phan_quyen_vai_tro.csv` | 45 | 45 | 1 |  |
| `uat_vnpost_quan_ly_diem_ban_hub.csv` | 54 | 54 | 4 |  |
| `uat_vnpost_quan_ly_kho.csv` | 508 | 506 | 19 | ⚠️ lệch so với tổng sheet tự khai |
| `uat_vnpost_realtime.csv` | 8 | 8 |  |  |
| `uat_vnpost_san_pham.csv` | 96 | 96 |  |  |
| `uat_vnpost_tai_chinh.csv` | 97 | 97 | 3 |  |

## 3. 🔴 Case gốc CHƯA có phân hệ nào nhận — 37 case

Không phải lỗi công cụ: nghiệp vụ này chưa có thư mục trong `tai-lieu-test/`.

| Tài liệu | Nhóm | Số case |
|---|---|--:|
| `uat_vnpost_tai_chinh.csv` | Phiếu chi | 14 |
| `uat_vnpost_tai_chinh.csv` | Công nợ Tỉnh - TCT | 23 |

## 4. Việc tiếp theo

1. Phân hệ còn **🔴 thiếu `Ma goc`** → điền cột đó rồi chạy lại. Chưa điền thì mọi con số độ phủ của
   phân hệ đó là vô nghĩa.
2. Phân hệ có **Chưa dựng > 0** → bổ sung case vào `test-cases.csv` (skill `test-scenario`).
3. Nhóm ở mục 3 → quyết định lập thư mục phân hệ mới hay gộp vào phân hệ đã có, rồi khai vào
   `tool/core/goc-mapping.js`.
