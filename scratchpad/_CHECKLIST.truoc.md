# Checklist tiến độ auto test

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/checklist.js`
> Cập nhật: 22/09/2026

- **Kịch bản đã khai:** 3131 case ở 48/48 phân hệ
- **Script THẬT** (có phép kiểm, không skip vô điều kiện): 810 case (**26%**)
- 🔴 **Vỏ rỗng** (`test.skip` cứng, không một phép kiểm nào): 2321 case (**74%**) — `chua-chay-duoc*.spec.js`
- Tổng có mã trong spec (thật + vỏ): 3131
- **Case mồ côi** (có spec, tài liệu chưa khai): 0
- **Tài liệu gốc (19 sheet QC):** 1607 case — đã phủ 1549, **còn thiếu 28**

## Cách đọc

| Cột | Nghĩa |
|---|---|
| `Kịch bản` | số dòng trong `test-cases.csv` |
| `Script thật` | case có `expect(` và **không** `test.skip` vô điều kiện — thật sự kiểm được gì |
| `Vỏ rỗng` | 🔴 case chỉ có dòng `test.skip(... || true)`, chạy xong **luôn xanh mà không kiểm gì** |
| `Mồ côi` | spec có mã mà CSV chưa khai — 🔴 tài liệu đang thiếu, không phải script thừa |
| `Input` | số case trong `test-input.json`; `tắt` = `enabled:false` (BLOCKED) |
| `Ghi` | số case `mutates:true`; `(N bật)` = còn `allowMutation:true` |
| `Case gốc` | số case của phân hệ này trong 19 sheet QC ở `test-case-goc/` |
| `Đã phủ` | số case gốc đã được khai ở cột `Ma goc` |
| `Còn thiếu` | 🔴 **việc phải làm cho TÀI LIỆU** — đã trừ các bản trùng trong chính sheet |
| `—` ở ba cột cuối | sheet QC không phủ phân hệ này; việc duy nhất là quét kỹ thuật mục 3.4 của skill |

| Phân hệ | Kịch bản | Script thật | Vỏ rỗng | Mồ côi | File spec | Input | Ghi | Trạng thái | Case gốc | Đã phủ | **Còn thiếu** |
|---|--:|--:|--:|--:|--:|---|---|---|--:|--:|--:|
| `01_quan_ly_diem_ban` | 134 | 134 |  |  | 19 | 134 (0 tắt) | 38 (🔴 38 bật) | ✅ đủ script | 54 | 50 | ✅ 0 |
| `02_quan_ly_nhan_vien` | 72 | 54 | **18** |  | 5 | 72 (13 tắt) | 13 | 🔧 đang viết script (75%) | 26 | 26 | ✅ 0 |
| `03a_quan_ly_ca_lich_lam_viec` | 64 | 42 | **22** |  | 6 | 64 (12 tắt) | 29 | 🔧 đang viết script (66%) | 19 | 19 | ✅ 0 |
| `03b_ca_lam_viec_nhan_vien` | 48 | 12 | **36** |  | 2 | 48 (35 tắt) | 23 | 🔧 đang viết script (25%) | 23 | 23 | ✅ 0 |
| `04_1_canh_bao_ton_kho` | 72 | 66 | **6** |  | 10 | 72 (5 tắt) | 30 | 🔧 đang viết script (92%) | 30 | 30 | ✅ 0 |
| `04_2_ton_kho_dau_ky` | 36 | 12 | **24** |  | 2 | 36 (18 tắt) | 14 | 🔧 đang viết script (33%) | 25 | 25 | ✅ 0 |
| `04_3_nhap_xuat_chuyen_kho` | 97 | 18 | **79** |  | 8 | 97 (7 tắt) | 70 | 🔧 đang viết script (19%) | 107 | 95 | ✅ 0 |
| `04_4_kiem_kho` | 33 | 5 | **28** |  | 3 | 33 (28 tắt) | 22 | 🔧 đang viết script (15%) | 31 | 31 | ✅ 0 |
| `04_5_quan_ly_ton_kho` | 46 | 21 | **25** |  | 6 | 46 (25 tắt) | 13 | 🔧 đang viết script (46%) | 45 | 45 | ✅ 0 |
| `07_1_cau_hinh_chung` | 29 | 14 | **15** |  | 3 | 29 (13 tắt) | 14 | 🔧 đang viết script (48%) | — | — | — |
| `07_2_cau_hinh_kho` | 53 | 7 | **46** |  | 7 | 53 (45 tắt) | 43 | 🔧 đang viết script (13%) | 35 | 35 | ✅ 0 |
| `07_3_don_hang_va_thanh_toan` | 18 | 7 | **11** |  | 5 | 18 (10 tắt) | 9 | 🔧 đang viết script (39%) | — | — | — |
| `07_4_van_hanh` | 32 | 7 | **25** |  | 3 | 32 (25 tắt) | 22 | 🔧 đang viết script (22%) | 20 | 20 | ✅ 0 |
| `08_quan_ly_san_pham` | 99 | 16 | **83** |  | 3 | 99 (75 tắt) | 74 | 🔧 đang viết script (16%) | 132 | 132 | ✅ 0 |
| `09_san_pham_san_xuat` | 23 | 9 | **14** |  | 4 | 23 (13 tắt) | 11 | 🔧 đang viết script (39%) | — | — | — |
| `10_bang_gia_ban_san_pham` | 87 | 14 | **73** |  | 7 | 87 (67 tắt) | 56 | 🔧 đang viết script (16%) | 82 | 81 | ✅ 0 |
| `11_khuyen_mai` | 81 | 9 | **72** |  | 3 | 81 (63 tắt) | 63 | 🔧 đang viết script (11%) | 50 | 49 | ✅ 0 |
| `12_1_ho_so_nha_cung_cap` | 32 | 22 | **10** |  | 3 | 32 (1 tắt) | 13 (🔴 13 bật) | 🔧 đang viết script (69%) | 25 | 25 | ✅ 0 |
| `12_2_san_pham_va_bang_gia_ncc` | 50 | 2 | **48** |  | 2 | 50 (48 tắt) | 48 | 🔧 đang viết script (4%) | 50 | 50 | ✅ 0 |
| `12_3_cong_no_nha_cung_cap` | 68 | 1 | **67** |  | 2 | 68 (67 tắt) | 67 | 🔧 đang viết script (1%) | 68 | 68 | ✅ 0 |
| `12_4_hop_dong_va_khuyen_mai_ncc` | 60 | 7 | **53** |  | 3 | 60 (53 tắt) | 50 | 🔧 đang viết script (12%) | 65 | 65 | ✅ 0 |
| `12-don-vi-van-tai` | 108 | 62 | **46** |  | 6 | 108 (97 tắt) | 103 | 🔧 đang viết script (57%) | 12 | 12 | ✅ 0 |
| `13_1_phieu_de_xuat_va_phe_duyet` | 55 | 3 | **52** |  | 2 | 55 (53 tắt) | 53 | 🔧 đang viết script (5%) | 60 | 53 | ✅ 0 |
| `13_2_gop_tach_va_dieu_phoi` | 3 | 1 | **2** |  | 2 | 3 (1 tắt) | 1 | 🔧 đang viết script (33%) | 2 | 2 | ✅ 0 |
| `13_3_dat_hang_va_nhap_hang` | 98 | 1 | **97** |  | 2 | 98 (95 tắt) | 95 | 🔧 đang viết script (1%) | 98 | 98 | ✅ 0 |
| `13-cong-no-diem-ban-tinh` | 40 | 31 | **9** |  | 9 | 40 (9 tắt) | 15 | 🔧 đang viết script (78%) | — | — | — |
| `14_1_lap_va_duyet_phieu_xuat_tra` | 144 | 5 | **139** |  | 5 | 144 (63 tắt) | 63 | 🔧 đang viết script (3%) | 26 | 26 | ✅ 0 |
| `14_2_gom_tach_va_xu_ly_hang_tra` | 108 | 4 | **104** |  | 5 | 108 (69 tắt) | 69 | 🔧 đang viết script (4%) | — | — | — |
| `14_3_hoa_don_hang_tra_lai` | 89 | 1 | **88** |  | 4 | 89 (48 tắt) | 48 | 🔧 đang viết script (1%) | — | — | — |
| `16_hang_ky_gui` | 138 | 4 | **134** |  | 5 | 138 (38 tắt) | 38 | 🔧 đang viết script (3%) | — | — | — |
| `17_quan_ly_quay_thu_ngan` | 64 | 5 | **59** |  | 4 | 64 (46 tắt) | 34 | 🔧 đang viết script (8%) | 28 | 25 | **3** |
| `18_1_ban_hang_tai_quay` | 131 | 3 | **128** |  | 3 | 131 (13 tắt) | 13 | 🔧 đang viết script (2%) | 56 | 56 | ✅ 0 |
| `18_2_khach_hang_va_uu_dai` | 115 | 29 | **86** |  | 4 | 115 (63 tắt) | 63 | 🔧 đang viết script (25%) | 10 | 10 | ✅ 0 |
| `18_3_thanh_toan_va_bien_lai` | 54 | 2 | **52** |  | 5 | 54 (12 tắt) | 11 | 🔧 đang viết script (4%) | 10 | 10 | ✅ 0 |
| `18_4_quan_ly_don_hang` | 70 | 10 | **60** |  | 6 | 70 (13 tắt) | 8 | 🔧 đang viết script (14%) | — | — | — |
| `18_5_doi_tra_hang` | 58 | 7 | **51** |  | 5 | 58 (48 tắt) | 19 | 🔧 đang viết script (12%) | 25 | 25 | ✅ 0 |
| `19_quan_ly_khach_hang` | 70 | 23 | **47** |  | 8 | 70 (44 tắt) | 32 | 🔧 đang viết script (33%) | 46 | 46 | ✅ 0 |
| `20_khach_hang_than_thiet` | 104 | 17 | **87** |  | 7 | 104 (57 tắt) | 57 | 🔧 đang viết script (16%) | 52 | 47 | **5** |
| `24_cong_no_nhan_vien` | 49 | 13 | **36** |  | 6 | 49 (13 tắt) | 13 | 🔧 đang viết script (27%) | 15 | 14 | ✅ 0 |
| `26_phieu_thu` | 40 | 10 | **30** |  | 6 | 40 (27 tắt) | 18 | 🔧 đang viết script (25%) | 15 | 12 | ✅ 0 |
| `27_doi_soat_hoa_don` | 36 | 10 | **26** |  | 5 | 36 (26 tắt) | 11 | 🔧 đang viết script (28%) | 38 | 31 | **7** |
| `29_bao_cao` | 77 | 13 | **64** |  | 6 | 77 (37 tắt) | 17 | 🔧 đang viết script (17%) | 51 | 51 | ✅ 0 |
| `30_bao_cao_ctkm` | 20 | 5 | **15** |  | 4 | 20 (9 tắt) | — | 🔧 đang viết script (25%) | — | — | — |
| `31_quan_ly_phan_quyen` | 45 | 14 | **31** |  | 4 | 45 (14 tắt) | 11 | 🔧 đang viết script (31%) | 45 | 44 | ✅ 0 |
| `32_mo_hinh_to_chuc` | 68 | 16 | **52** |  | 6 | 68 (49 tắt) | 44 | 🔧 đang viết script (24%) | 67 | 67 | ✅ 0 |
| `33_lich_su_thao_tac_nguoi_dung` | 24 | 11 | **13** |  | 5 | 24 (9 tắt) | 1 | 🔧 đang viết script (46%) | — | — | — |
| `34_cong_no_khach_hang` | 28 | 8 | **20** |  | 5 | 28 (10 tắt) | 4 | 🔧 đang viết script (29%) | 13 | 13 | ✅ 0 |
| `35-gia-von-mac-dinh` | 61 | 23 | **38** |  | 11 | 61 (38 tắt) | 38 | 🔧 đang viết script (38%) | 51 | 38 | **13** |

## 🔴 Phân hệ còn cho phép ghi dữ liệu thật

- `01_quan_ly_diem_ban` — 38 case đang bật `allowMutation`
- `12_1_ho_so_nha_cung_cap` — 13 case đang bật `allowMutation`

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
