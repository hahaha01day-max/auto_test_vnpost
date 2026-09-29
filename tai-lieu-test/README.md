# tai-lieu-test — cây thư mục theo mã HDSD

Mỗi thư mục là **một phân hệ HDSD**, tên = mã + slug lấy nguyên từ `resource/hdsd/hdsd<mã>_<slug>/`
(bỏ tiền tố `hdsd`).

## Quy ước mã test case

```
<mã phân hệ>_<mã task>_<STT>
   02      _  020   _ 001     → 02_020_001
   04_3    _  060   _ 002     → 04_3_060_002   (phân hệ có mã con)
```

- **mã phân hệ** — thư mục trong `resource/hdsd/`.
- **mã task** — file trong `resource/hdsd/<phân hệ>/tasks/<mã task>_<slug>.md`.
- **STT** — tự tăng, đếm riêng trong từng cặp (phân hệ, task).
- Title spec: `test('<mã> - <tên case>', ...)`. Tên case để ở cột riêng, KHÔNG nhét vào mã.

🔴 Mã này nằm trong `--grep` khi chạy và trong `runs.module_id` của web công cụ.
Đổi tên thư mục phải chạy `node tool/bin/migrate-run-history.js`, nếu không lịch sử chạy mồ côi.

## Danh mục

| Thư mục | Task HDSD | Task đã có case | Case | Có script |
|---|--:|--:|--:|--:|
| `01_quan_ly_diem_ban` | 8 | 0 | 0 | 0 |
| `02_quan_ly_nhan_vien` | 9 | 1 | 4 | 4 |
| `03a_quan_ly_ca_lich_lam_viec` | 6 | 0 | 0 | 0 |
| `03b_ca_lam_viec_nhan_vien` | 5 | 0 | 0 | 0 |
| `04_1_canh_bao_ton_kho` | 6 | 2 | 2 | 2 |
| `04_2_ton_kho_dau_ky` | 3 | 0 | 0 | 0 |
| `04_3_nhap_xuat_chuyen_kho` | 8 | 5 | 5 | 5 |
| `04_4_kiem_kho` | 5 | 2 | 2 | 2 |
| `04_5_quan_ly_ton_kho` | 8 | 3 | 3 | 3 |
| `07_1_cau_hinh_chung` | 5 | 0 | 0 | 0 |
| `07_2_cau_hinh_kho` | 5 | 0 | 0 | 0 |
| `07_3_don_hang_va_thanh_toan` | 4 | 0 | 0 | 0 |
| `07_4_van_hanh` | 4 | 0 | 0 | 0 |
| `08_quan_ly_san_pham` | 9 | 6 | 17 | 17 |
| `09_san_pham_san_xuat` | 4 | 0 | 0 | 0 |
| `10_bang_gia_ban_san_pham` | 6 | 0 | 0 | 0 |
| `11_khuyen_mai` | 10 | 7 | 32 | 0 |
| `12_1_ho_so_nha_cung_cap` | 7 | 4 | 21 | 11 |
| `12_2_san_pham_va_bang_gia_ncc` | 6 | 2 | 2 | 2 |
| `12_3_cong_no_nha_cung_cap` | 6 | 1 | 1 | 1 |
| `12_4_hop_dong_va_khuyen_mai_ncc` | 7 | 0 | 0 | 0 |
| `12-don-vi-van-tai` | — | — | 72 | 72 |
| `13_1_phieu_de_xuat_va_phe_duyet` | 5 | 2 | 3 | 3 |
| `13_2_gop_tach_va_dieu_phoi` | 5 | 1 | 1 | 1 |
| `13_3_dat_hang_va_nhap_hang` | 5 | 2 | 3 | 3 |
| `13-cong-no-diem-ban-tinh` | — | — | 31 | 28 |
| `14_1_lap_va_duyet_phieu_xuat_tra` | 5 | 1 | 1 | 1 |
| `14_2_gom_tach_va_xu_ly_hang_tra` | 6 | 0 | 0 | 0 |
| `14_3_hoa_don_hang_tra_lai` | 4 | 0 | 0 | 0 |
| `35-gia-von-mac-dinh` | — | — | 23 | 23 |
| `16_hang_ky_gui` | 6 | 0 | 0 | 0 |
| `17_quan_ly_quay_thu_ngan` | 5 | 0 | 0 | 0 |
| `18_1_ban_hang_tai_quay` | 7 | 3 | 6 | 6 |
| `18_2_khach_hang_va_uu_dai` | 4 | 2 | 49 | 49 |
| `18_3_thanh_toan_va_bien_lai` | 9 | 3 | 3 | 3 |
| `18_4_quan_ly_don_hang` | 7 | 3 | 4 | 4 |
| `18_5_doi_tra_hang` | 8 | 0 | 0 | 0 |
| `19_quan_ly_khach_hang` | 11 | 0 | 0 | 0 |
| `20_khach_hang_than_thiet` | 4 | 3 | 10 | 10 |
| `24_cong_no_nhan_vien` | 7 | 0 | 0 | 0 |
| `26_phieu_thu` | 5 | 0 | 0 | 0 |
| `27_doi_soat_hoa_don` | 6 | 0 | 0 | 0 |
| `29_bao_cao` | 14 | 0 | 0 | 0 |
| `30_bao_cao_ctkm` | 4 | 0 | 0 | 0 |
| `31_quan_ly_phan_quyen` | 10 | 2 | 12 | 12 |
| `32_mo_hinh_to_chuc` | 8 | 4 | 12 | 3 |
| `33_lich_su_thao_tac_nguoi_dung` | 5 | 0 | 0 | 0 |
| `34_cong_no_khach_hang` | 4 | 0 | 0 | 0 |
| **TỔNG** | **285** | **59** | **319** | **265** |

- **48 thư mục** = 45 phân hệ HDSD + 3 module chưa có HDSD (`12-don-vi-van-tai`,
  `13-cong-no-diem-ban-tinh`, `35-gia-von-mac-dinh`).
- Thư mục có `Case = 0` là **khung rỗng** — README của nó liệt kê đủ task cần phủ.
- Độ phủ hiện tại: **59/285 task** có ít nhất một case.
- Dựng lại khung khi HDSD thêm phân hệ: `node tool/bin/scaffold-hdsd.js` (không đụng thư mục đã có).

## Tra cứu

- Mã case cũ → mã mới: [`_MA_CU_SANG_MA_MOI.md`](_MA_CU_SANG_MA_MOI.md)
- Bản đồ module → phân hệ: [`_MAPPING_HDSD.md`](_MAPPING_HDSD.md)
- Bảng mã trong code: `tool/bin/hdsd-mapping.js`
