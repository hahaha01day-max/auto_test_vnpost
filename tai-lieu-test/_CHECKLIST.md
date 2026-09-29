# Checklist tiến độ auto test

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/checklist.js`
> Cập nhật: 29/09/2026

- **Kịch bản đã khai:** 3152 case ở 49/49 phân hệ
- **Script THẬT** (có phép kiểm, không skip vô điều kiện): 3066 case (**97%**)
- 🔴 **Vỏ rỗng** (`test.skip` cứng, không một phép kiểm nào): 40 case (**1%**) — `chua-chay-duoc*.spec.js`
- Tổng có mã trong spec (thật + vỏ): 3106
- **Case mồ côi** (có spec, tài liệu chưa khai): 0
- **Kết quả chạy thật:** ✅ Đạt 1828 (**58%**) · ❌ Không đạt 890 (**28%**) · ⏸ Chưa chạy 434 (**14%**) — cột `Trang thai chay` của `test-cases.csv`, ghi bằng `node tool/bin/cap-nhat-trang-thai.js <phân hệ>` sau mỗi lượt chạy
- **Tài liệu gốc (19 sheet QC):** 1607 case — đã phủ 1549, **còn thiếu 28**
- 🔴 **Vì sao từng case chưa xong + ai gỡ + đã xử lý tới đâu:** `_VUONG_MAC.md` (sổ ghi tay) — đọc trước khi khảo sát lại

## Cách đọc

| Cột | Nghĩa |
|---|---|
| `Kịch bản` | số dòng trong `test-cases.csv` |
| `Script thật` | case có `expect(` và **không** `test.skip` vô điều kiện — thật sự kiểm được gì |
| `Vỏ rỗng` | 🔴 case chỉ có dòng `test.skip(... || true)`, chạy xong **luôn xanh mà không kiểm gì** |
| `Mồ côi` | spec có mã mà CSV chưa khai — 🔴 tài liệu đang thiếu, không phải script thừa |
| `Đạt` / `Không đạt` | kết quả lượt chạy GẦN NHẤT của từng case (cột `Trang thai chay`) |
| `Chưa chạy` | case chưa từng chạy, bị skip, hoặc phân hệ chưa ghi kết quả (`*` = CSV chưa có cột `Trang thai chay`) |
| `Input` | số case trong `test-input.json`; `tắt` = `enabled:false` (BLOCKED) |
| `Ghi` | số case `mutates:true`; `(N bật)` = còn `allowMutation:true` |
| `Case gốc` | số case của phân hệ này trong 19 sheet QC ở `test-case-goc/` |
| `Đã phủ` | số case gốc đã được khai ở cột `Ma goc` |
| `Còn thiếu` | 🔴 **việc phải làm cho TÀI LIỆU** — đã trừ các bản trùng trong chính sheet |
| `—` ở ba cột cuối | sheet QC không phủ phân hệ này; việc duy nhất là quét kỹ thuật mục 3.4 của skill |

| Phân hệ | Kịch bản | Script thật | Vỏ rỗng | Mồ côi | File spec | Input | Ghi | Trạng thái | ✅ Đạt | ❌ Không đạt | ⏸ Chưa chạy | Case gốc | Đã phủ | **Còn thiếu** |
|---|--:|--:|--:|--:|--:|---|---|---|--:|--:|--:|--:|--:|--:|
| `01_quan_ly_diem_ban` | 134 | 134 |  |  | 19 | 134 (0 tắt) | 38 (🔴 38 bật) | ✅ đủ script | 100 | **15** | 19 | 54 | 50 | ✅ 0 |
| `02_quan_ly_nhan_vien` | 72 | 71 | **1** |  | 9 | 72 (1 tắt) | 15 (🔴 8 bật) | 🔧 đang viết script (99%) | 56 | **6** | 10 | 26 | 26 | ✅ 0 |
| `03a_quan_ly_ca_lich_lam_viec` | 64 | 62 | **2** |  | 10 | 64 (2 tắt) | 29 (🔴 19 bật) | 🔧 đang viết script (97%) | 42 | **8** | 14 | 19 | 19 | ✅ 0 |
| `03b_ca_lam_viec_nhan_vien` | 48 | 43 | **5** |  | 10 | 48 (6 tắt) | 22 (🔴 19 bật) | 🔧 đang viết script (90%) | 18 | **1** | 29 | 23 | 23 | ✅ 0 |
| `04_1_canh_bao_ton_kho` | 72 | 72 |  |  | 11 | 72 (1 tắt) | 28 (🔴 2 bật) | ✅ đủ script | 47 | **2** | 23 | 30 | 30 | ✅ 0 |
| `04_2_ton_kho_dau_ky` | 36 | 33 | **2** |  | 3 | 36 (3 tắt) | 16 (🔴 11 bật) | 🔧 đang viết script (92%) | 14 | **7** | 15 | 25 | 25 | ✅ 0 |
| `04_3_nhap_xuat_chuyen_kho` | 97 | 97 |  |  | 20 | 97 (0 tắt) | 68 (🔴 68 bật) | ✅ đủ script | 60 | **32** | 5 | 107 | 95 | ✅ 0 |
| `04_4_kiem_kho` | 33 | 32 | **1** |  | 10 | 33 (1 tắt) | 22 (🔴 21 bật) | 🔧 đang viết script (97%) | 23 | **7** | 3 | 31 | 31 | ✅ 0 |
| `04_5_quan_ly_ton_kho` | 46 | 36 | **10** |  | 9 | 46 (10 tắt) | 13 (🔴 8 bật) | 🔧 đang viết script (78%) | 19 | **6** | 21 | 45 | 45 | ✅ 0 |
| `07_1_cau_hinh_chung` | 29 | 28 | **1** |  | 5 | 29 (1 tắt) | 8 (🔴 7 bật) | 🔧 đang viết script (97%) | 23 | **2** | 4 | — | — | — |
| `07_2_cau_hinh_kho` | 53 | 51 | **2** |  | 16 | 53 (2 tắt) | 29 (🔴 28 bật) | 🔧 đang viết script (96%) | 37 | **14** | 2 | 35 | 35 | ✅ 0 |
| `07_3_don_hang_va_thanh_toan` | 18 | 16 | **2** |  | 8 | 18 (2 tắt) | 7 (🔴 5 bật) | 🔧 đang viết script (89%) | 13 | **2** | 3 | — | — | — |
| `07_4_van_hanh` | 32 | 32 |  |  | 6 | 32 (0 tắt) | 21 (🔴 21 bật) | ✅ đủ script | 16 | **14** | 2 | 20 | 20 | ✅ 0 |
| `08_quan_ly_san_pham` | 99 | 99 |  |  | 9 | 99 (0 tắt) | 74 (🔴 74 bật) | ✅ đủ script | 75 | **22** | 2 | 132 | 132 | ✅ 0 |
| `09_san_pham_san_xuat` | 23 | 23 |  |  | 6 | 23 (0 tắt) | 11 (🔴 11 bật) | ✅ đủ script | 15 | **6** | 2 | — | — | — |
| `10_bang_gia_ban_san_pham` | 87 | 87 |  |  | 14 | 87 (0 tắt) | 56 (🔴 56 bật) | ✅ đủ script | 48 | **35** | 4 | 82 | 81 | ✅ 0 |
| `11_khuyen_mai` | 81 | 81 |  |  | 6 | 81 (0 tắt) | 63 (🔴 63 bật) | ✅ đủ script | 52 | **28** | 1 | 50 | 49 | ✅ 0 |
| `12_1_ho_so_nha_cung_cap` | 32 | 32 |  |  | 5 | 32 (0 tắt) | 13 (🔴 13 bật) | ✅ đủ script | 28 | **4** |  | 25 | 25 | ✅ 0 |
| `12_2_san_pham_va_bang_gia_ncc` | 50 | 50 |  |  | 3 | 50 (0 tắt) | 48 (🔴 48 bật) | ✅ đủ script | 39 | **11** |  | 50 | 50 | ✅ 0 |
| `12_3_cong_no_nha_cung_cap` | 68 | 68 |  |  | 3 | 68 (0 tắt) | 67 (🔴 67 bật) | ✅ đủ script | 12 | **56** |  | 68 | 68 | ✅ 0 |
| `12_4_hop_dong_va_khuyen_mai_ncc` | 60 | 60 |  |  | 4 | 60 (0 tắt) | 50 (🔴 50 bật) | ✅ đủ script | 52 | **8** |  | 65 | 65 | ✅ 0 |
| `12-don-vi-van-tai` | 108 | 102 | **6** |  | 4 | 108 (1 tắt) | 103 (🔴 96 bật) | 🔧 đang viết script (94%) | 45 | **32** | 31 | 12 | 12 | ✅ 0 |
| `13_1_phieu_de_xuat_va_phe_duyet` | 55 | 55 |  |  | 8 | 55 (0 tắt) | 47 (🔴 47 bật) | ✅ đủ script | 40 | **15** |  | 60 | 53 | ✅ 0 |
| `13_2_gop_tach_va_dieu_phoi` | 6 | 6 |  |  | 2 | 6 (0 tắt) | 4 (🔴 4 bật) | ✅ đủ script | 3 |  | 3 | 2 | 2 | ✅ 0 |
| `13_3_dat_hang_va_nhap_hang` | 98 | 98 |  |  | 7 | 98 (0 tắt) | 97 (🔴 97 bật) | ✅ đủ script | 44 | **54** |  | 98 | 98 | ✅ 0 |
| `13-cong-no-diem-ban-tinh` | 40 | 35 | **5** |  | 9 | 40 (5 tắt) | 15 (🔴 3 bật) | 🔧 đang viết script (88%) | 10 | **4** | 26 | — | — | — |
| `14_1_lap_va_duyet_phieu_xuat_tra` | 144 | 144 |  |  | 14 | 144 (0 tắt) | 63 (🔴 63 bật) | ✅ đủ script | 89 | **54** | 1 | 26 | 26 | ✅ 0 |
| `14_2_gom_tach_va_xu_ly_hang_tra` | 108 | 106 | **2** |  | 12 | 108 (0 tắt) | 69 (🔴 69 bật) | 🔧 đang viết script (98%) | 28 | **77** | 3 | — | — | — |
| `14_3_hoa_don_hang_tra_lai` | 89 | 80 | **9** |  | 6 | 89 (0 tắt) | 48 (🔴 48 bật) | 🔧 đang viết script (90%) | 50 | **30** | 9 | — | — | — |
| `16_hang_ky_gui` | 138 | 122 | **16** |  | 19 | 138 (10 tắt) | 41 (🔴 32 bật) | 🔧 đang viết script (88%) | 89 | **15** | 34 | — | — | — |
| `17_quan_ly_quay_thu_ngan` | 64 | 63 | **1** |  | 8 | 64 (1 tắt) | 34 (🔴 33 bật) | 🔧 đang viết script (98%) | 52 | **10** | 2 | 28 | 25 | **3** |
| `18_1_ban_hang_tai_quay` | 131 | 128 | **3** |  | 13 | 131 (1 tắt) | 14 (🔴 13 bật) | 🔧 đang viết script (98%) | 100 | **20** | 11 | 56 | 56 | ✅ 0 |
| `18_2_khach_hang_va_uu_dai` | 115 | 114 | **-44** |  | 14 | 115 (46 tắt) | 61 (🔴 15 bật) | 🔧 đang viết script (99%) | 52 | **16** | 47 | 10 | 10 | ✅ 0 |
| `18_3_thanh_toan_va_bien_lai` | 54 | 47 | **7** |  | 8 | 54 (7 tắt) | 11 (🔴 9 bật) | 🔧 đang viết script (87%) | 18 | **26** | 10 | 10 | 10 | ✅ 0 |
| `18_4_quan_ly_don_hang` | 70 | 62 | **8** |  | 12 | 70 (1 tắt) | 10 (🔴 7 bật) | 🔧 đang viết script (89%) | 27 | **31** | 12 | — | — | — |
| `18_5_doi_tra_hang` | 58 | 57 | **1** |  | 18 | 58 (1 tắt) | 20 (🔴 20 bật) | 🔧 đang viết script (98%) | 30 | **21** | 7 | 25 | 25 | ✅ 0 |
| `19_quan_ly_khach_hang` | 70 | 70 |  |  | 19 | 70 (0 tắt) | 32 (🔴 32 bật) | ✅ đủ script | 34 | **19** | 17 | 46 | 46 | ✅ 0 |
| `20_khach_hang_than_thiet` | 104 | 104 |  |  | 13 | 104 (0 tắt) | 57 (🔴 57 bật) | ✅ đủ script | 79 | **23** | 2 | 52 | 47 | **5** |
| `24_cong_no_nhan_vien` | 49 | 49 |  |  | 11 | 49 (0 tắt) | 13 (🔴 13 bật) | ✅ đủ script | 29 | **8** | 12 | 15 | 14 | ✅ 0 |
| `26_phieu_thu` | 40 | 40 |  |  | 8 | 40 (0 tắt) | 12 (🔴 12 bật) | ✅ đủ script | 15 | **24** | 1 | 15 | 12 | ✅ 0 |
| `27_doi_soat_hoa_don` | 36 | 36 |  |  | 10 | 36 (0 tắt) | 8 (🔴 8 bật) | ✅ đủ script | 23 | **10** | 3 | 38 | 31 | **7** |
| `29_bao_cao` | 77 | 77 |  |  | 11 | 77 (0 tắt) | 17 (🔴 17 bật) | ✅ đủ script | 48 | **17** | 12 | 51 | 51 | ✅ 0 |
| `30_bao_cao_ctkm` | 20 | 20 |  |  | 3 | 20 (0 tắt) | — | ✅ đủ script | 8 | **12** |  | — | — | — |
| `31_quan_ly_phan_quyen` | 45 | 45 |  |  | 4 | 45 (0 tắt) | 12 (🔴 12 bật) | ✅ đủ script | 36 | **8** | 1 | 45 | 44 | ✅ 0 |
| `32_mo_hinh_to_chuc` | 68 | 68 |  |  | 9 | 68 (0 tắt) | 44 (🔴 44 bật) | ✅ đủ script | 34 | **25** | 9 | 67 | 67 | ✅ 0 |
| `33_lich_su_thao_tac_nguoi_dung` | 24 | 24 |  |  | 4 | 24 (0 tắt) | 1 (🔴 1 bật) | ✅ đủ script | 8 | **15** | 1 | — | — | — |
| `34_cong_no_khach_hang` | 28 | 28 |  |  | 3 | 28 (0 tắt) | 4 (🔴 4 bật) | ✅ đủ script | 12 | **5** | 11 | 13 | 13 | ✅ 0 |
| `35-gia-von-mac-dinh` | 61 | 61 |  |  | 10 | 61 (0 tắt) | 38 (🔴 35 bật) | ✅ đủ script | 30 | **27** | 4 | 51 | 38 | **13** |
| `50_toan_trinh` | 18 | 18 |  |  | 2 | 18 (0 tắt) | 18 (🔴 18 bật) | ✅ đủ script | 6 | **6** | 6 | — | — | — |

## 🔴 Phân hệ còn cho phép ghi dữ liệu thật

- `01_quan_ly_diem_ban` — 38 case đang bật `allowMutation`
- `02_quan_ly_nhan_vien` — 8 case đang bật `allowMutation`
- `03a_quan_ly_ca_lich_lam_viec` — 19 case đang bật `allowMutation`
- `03b_ca_lam_viec_nhan_vien` — 19 case đang bật `allowMutation`
- `04_1_canh_bao_ton_kho` — 2 case đang bật `allowMutation`
- `04_2_ton_kho_dau_ky` — 11 case đang bật `allowMutation`
- `04_3_nhap_xuat_chuyen_kho` — 68 case đang bật `allowMutation`
- `04_4_kiem_kho` — 21 case đang bật `allowMutation`
- `04_5_quan_ly_ton_kho` — 8 case đang bật `allowMutation`
- `07_1_cau_hinh_chung` — 7 case đang bật `allowMutation`
- `07_2_cau_hinh_kho` — 28 case đang bật `allowMutation`
- `07_3_don_hang_va_thanh_toan` — 5 case đang bật `allowMutation`
- `07_4_van_hanh` — 21 case đang bật `allowMutation`
- `08_quan_ly_san_pham` — 74 case đang bật `allowMutation`
- `09_san_pham_san_xuat` — 11 case đang bật `allowMutation`
- `10_bang_gia_ban_san_pham` — 56 case đang bật `allowMutation`
- `11_khuyen_mai` — 63 case đang bật `allowMutation`
- `12_1_ho_so_nha_cung_cap` — 13 case đang bật `allowMutation`
- `12_2_san_pham_va_bang_gia_ncc` — 48 case đang bật `allowMutation`
- `12_3_cong_no_nha_cung_cap` — 67 case đang bật `allowMutation`
- `12_4_hop_dong_va_khuyen_mai_ncc` — 50 case đang bật `allowMutation`
- `12-don-vi-van-tai` — 96 case đang bật `allowMutation`
- `13_1_phieu_de_xuat_va_phe_duyet` — 47 case đang bật `allowMutation`
- `13_2_gop_tach_va_dieu_phoi` — 4 case đang bật `allowMutation`
- `13_3_dat_hang_va_nhap_hang` — 97 case đang bật `allowMutation`
- `13-cong-no-diem-ban-tinh` — 3 case đang bật `allowMutation`
- `14_1_lap_va_duyet_phieu_xuat_tra` — 63 case đang bật `allowMutation`
- `14_2_gom_tach_va_xu_ly_hang_tra` — 69 case đang bật `allowMutation`
- `14_3_hoa_don_hang_tra_lai` — 48 case đang bật `allowMutation`
- `16_hang_ky_gui` — 32 case đang bật `allowMutation`
- `17_quan_ly_quay_thu_ngan` — 33 case đang bật `allowMutation`
- `18_1_ban_hang_tai_quay` — 13 case đang bật `allowMutation`
- `18_2_khach_hang_va_uu_dai` — 15 case đang bật `allowMutation`
- `18_3_thanh_toan_va_bien_lai` — 9 case đang bật `allowMutation`
- `18_4_quan_ly_don_hang` — 7 case đang bật `allowMutation`
- `18_5_doi_tra_hang` — 20 case đang bật `allowMutation`
- `19_quan_ly_khach_hang` — 32 case đang bật `allowMutation`
- `20_khach_hang_than_thiet` — 57 case đang bật `allowMutation`
- `24_cong_no_nhan_vien` — 13 case đang bật `allowMutation`
- `26_phieu_thu` — 12 case đang bật `allowMutation`
- `27_doi_soat_hoa_don` — 8 case đang bật `allowMutation`
- `29_bao_cao` — 17 case đang bật `allowMutation`
- `31_quan_ly_phan_quyen` — 12 case đang bật `allowMutation`
- `32_mo_hinh_to_chuc` — 44 case đang bật `allowMutation`
- `33_lich_su_thao_tac_nguoi_dung` — 1 case đang bật `allowMutation`
- `34_cong_no_khach_hang` — 4 case đang bật `allowMutation`
- `35-gia-von-mac-dinh` — 35 case đang bật `allowMutation`
- `50_toan_trinh` — 18 case đang bật `allowMutation`

## Việc tiếp theo, theo thứ tự

1. Phân hệ **⬜ chưa có kịch bản** → chạy skill `test-scenario`.
2. Phân hệ **📝 có kịch bản, chưa có script** → chạy skill `auto-test`.
3. Phân hệ có **case mồ côi** → bổ sung dòng vào `test-cases.csv` cho khớp spec đã có.

🚫 Đừng đọc cột `Script thật` như độ phủ chất lượng: nó chỉ nói case có **ít nhất một** `expect`,
không nói phép kiểm đó đo đúng nghiệp vụ.

🔴 Cột **Vỏ rỗng** là case đã khai, đã có tên trong spec, nhưng **chưa có thao tác nào** — phần lớn là
case GHI (thêm/sửa/xoá) để trống có chủ ý vì môi trường test không có dữ liệu nền. Gỡ bằng bộ seed
`tai-lieu-test/00_seed` rồi viết thao tác vào chính các case đó.

🔴 Và đừng đọc **✅ đủ script** như "phân hệ đã xong": nó chỉ so với số case ĐÃ KHAI. Nhìn cột
**Còn thiếu** mới biết tài liệu còn nợ bao nhiêu.
