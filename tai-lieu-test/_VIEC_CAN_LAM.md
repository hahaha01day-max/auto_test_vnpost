# Việc cần làm — viết phép kiểm cho case vỏ rỗng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/viec-can-lam.js`
> Cập nhật: 28/09/2026

Case **vỏ rỗng** = đã khai trong `test-cases.csv`, đã có tên trong spec, nhưng thân test 🚫 không có
một `expect` nào (hoặc `test.skip` vô điều kiện) — chạy xong **luôn xanh mà không kiểm gì**.

| Nhóm | Số case | Nghĩa |
|---|--:|---|
| **SẴN SÀNG** | **23** | `enabled: true`, đủ input ⇒ **viết được ngay** |
| THIẾU INPUT | 0 | còn khoá rỗng trong `data` ⇒ rót giá trị từ sổ seed trước |
| KHOÁ GHI | 9 | `mutates: true` + `allowMutation: false` ⇒ phải bật cờ |
| CHỜ TIỀN ĐỀ | 0 | đã khai `canSeed` / `canTienDe` ⇒ dựng dữ liệu theo lệnh ở mục "Chờ tiền đề" rồi viết script |
| TẮT | 54 | `enabled: false` — xem bảng lý do bên dưới |
| **Tổng** | **86** | trên tổng 3152 case đã khai |

Trong đó **46** case còn chưa có một `test()` nào mang mã — số còn lại
(40) đúng bằng cột **Vỏ rỗng** của `_CHECKLIST.md`.

🔴 Con số **SẴN SÀNG** là thứ đáng nhìn nhất: đó là việc làm được ngay hôm nay, 🚫 không chờ ai.

## Chờ tiền đề — 0 case

Mỗi dòng là MỘT tiền đề; dựng xong thì các case trong dòng viết/chạy được. 🔴 Cột "Lệnh" báo *chưa có* nghĩa là
bước seed / spec tiền đề đó chưa ai viết — viết nó trước (khuôn: `00_seed/README.md`, `19_quan_ly_khach_hang/tests/tien-de.gdv.spec.js`).

| Loại | Tiền đề | Phân hệ | Case | Lệnh |
|---|---|---|---|---|
| — | — | — | — | — |

## Vì sao 54 case đang TẮT

🔴 Lý do nằm ở **ba** chỗ: `_blocked` của case · `blockedReason` của case · `_note` cấp file.
🚫 Chỉ đọc `_blocked` là kết luận nhầm "tắt mà không ai biết vì sao".

| Nhóm lý do | Số case | Gỡ bằng cách nào |
|---|--:|---|
| KHÁC | 22 | đọc lý do từng case |
| RỦI RO GHI THẬT | 20 | 🔴 **cần user quyết** — ghi tiền / tồn / chứng từ thật, nhiều thứ không hoàn tác |
| CHƯA CHỐT KỲ VỌNG | 5 | hỏi nghiệp vụ để chốt kỳ vọng trước khi viết assert |
| HẠN CHẾ KỸ THUẬT | 4 | 🚫 không tự động hoá được (SDK bên thứ ba, OTP qua SMS, thiết bị phần cứng) |
| THIẾU DỮ LIỆU NỀN | 3 | seed thêm dữ liệu rồi chạy `bat-case-seed-phu.js` |

## Thứ tự đề nghị — nhiều case SẴN SÀNG nhất trước

| # | Phân hệ | Sẵn sàng | Thiếu input | Khoá ghi | Tắt | Vỏ rỗng | Script thật |
|--:|---|--:|--:|--:|--:|--:|--:|
| 1 | `14_3_hoa_don_hang_tra_lai` | **9** | 0 | 0 | 0 | 9 | 80 |
| 2 | `16_hang_ky_gui` | **6** | 0 | 0 | 10 | 16 | 122 |
| 3 | `18_4_quan_ly_don_hang` | **4** | 0 | 3 | 1 | 8 | 62 |
| 4 | `14_2_gom_tach_va_xu_ly_hang_tra` | **2** | 0 | 0 | 0 | 2 | 106 |
| 5 | `18_1_ban_hang_tai_quay` | **2** | 0 | 0 | 1 | 3 | 128 |
| 6 | `01_quan_ly_diem_ban` | **0** | 0 | 0 | 0 | 0 | 134 |
| 7 | `02_quan_ly_nhan_vien` | **0** | 0 | 0 | 1 | 1 | 71 |
| 8 | `03a_quan_ly_ca_lich_lam_viec` | **0** | 0 | 0 | 2 | 2 | 62 |
| 9 | `03b_ca_lam_viec_nhan_vien` | **0** | 0 | 0 | 5 | 5 | 43 |
| 10 | `04_1_canh_bao_ton_kho` | **0** | 0 | 0 | 0 | 0 | 72 |
| 11 | `04_2_ton_kho_dau_ky` | **0** | 0 | 0 | 3 | 3 | 33 |
| 12 | `04_3_nhap_xuat_chuyen_kho` | **0** | 0 | 0 | 0 | 0 | 97 |
| 13 | `04_4_kiem_kho` | **0** | 0 | 0 | 1 | 1 | 32 |
| 14 | `04_5_quan_ly_ton_kho` | **0** | 0 | 0 | 10 | 10 | 36 |
| 15 | `07_1_cau_hinh_chung` | **0** | 0 | 0 | 1 | 1 | 28 |

## Toàn bộ phân hệ

| Phân hệ | Tổng case | Script thật | Vỏ rỗng | Sẵn sàng | Thiếu input | Khoá ghi | Tắt | Khoá dữ liệu thiếu nhiều nhất |
|---|--:|--:|--:|--:|--:|--:|--:|---|
| `01_quan_ly_diem_ban` | 134 | 134 | 0 | 0 | 0 | 0 | 0 | — |
| `02_quan_ly_nhan_vien` | 72 | 71 | 1 | 0 | 0 | 0 | 1 | — |
| `03a_quan_ly_ca_lich_lam_viec` | 64 | 62 | 2 | 0 | 0 | 0 | 2 | — |
| `03b_ca_lam_viec_nhan_vien` | 48 | 43 | 5 | 0 | 0 | 0 | 5 | — |
| `04_1_canh_bao_ton_kho` | 72 | 72 | 0 | 0 | 0 | 0 | 0 | — |
| `04_2_ton_kho_dau_ky` | 36 | 33 | 3 | 0 | 0 | 0 | 3 | sku(2) · maLo(2) · tenFileExcel(2) |
| `04_3_nhap_xuat_chuyen_kho` | 97 | 97 | 0 | 0 | 0 | 0 | 0 | — |
| `04_4_kiem_kho` | 33 | 32 | 1 | 0 | 0 | 0 | 1 | sku(1) · maPhieu(1) · maLo(1) |
| `04_5_quan_ly_ton_kho` | 46 | 36 | 10 | 0 | 0 | 0 | 10 | — |
| `07_1_cau_hinh_chung` | 29 | 28 | 1 | 0 | 0 | 0 | 1 | — |
| `07_2_cau_hinh_kho` | 53 | 51 | 2 | 0 | 0 | 0 | 2 | tenDanhMuc(2) · sku(1) |
| `07_3_don_hang_va_thanh_toan` | 18 | 16 | 2 | 0 | 0 | 0 | 2 | — |
| `07_4_van_hanh` | 32 | 32 | 0 | 0 | 0 | 0 | 0 | — |
| `08_quan_ly_san_pham` | 99 | 99 | 0 | 0 | 0 | 0 | 0 | — |
| `09_san_pham_san_xuat` | 23 | 23 | 0 | 0 | 0 | 0 | 0 | — |
| `10_bang_gia_ban_san_pham` | 87 | 87 | 0 | 0 | 0 | 0 | 0 | — |
| `11_khuyen_mai` | 81 | 81 | 0 | 0 | 0 | 0 | 0 | — |
| `12_1_ho_so_nha_cung_cap` | 32 | 32 | 0 | 0 | 0 | 0 | 0 | — |
| `12_2_san_pham_va_bang_gia_ncc` | 50 | 50 | 0 | 0 | 0 | 0 | 0 | — |
| `12_3_cong_no_nha_cung_cap` | 68 | 68 | 0 | 0 | 0 | 0 | 0 | — |
| `12_4_hop_dong_va_khuyen_mai_ncc` | 60 | 60 | 0 | 0 | 0 | 0 | 0 | — |
| `12-don-vi-van-tai` | 108 | 102 | 6 | 0 | 0 | 6 | 0 | — |
| `13_1_phieu_de_xuat_va_phe_duyet` | 55 | 55 | 0 | 0 | 0 | 0 | 0 | — |
| `13_2_gop_tach_va_dieu_phoi` | 6 | 6 | 0 | 0 | 0 | 0 | 0 | — |
| `13_3_dat_hang_va_nhap_hang` | 98 | 98 | 0 | 0 | 0 | 0 | 0 | — |
| `13-cong-no-diem-ban-tinh` | 40 | 35 | 5 | 0 | 0 | 0 | 5 | periodId(1) · remittanceId(1) |
| `14_1_lap_va_duyet_phieu_xuat_tra` | 144 | 144 | 0 | 0 | 0 | 0 | 0 | — |
| `14_2_gom_tach_va_xu_ly_hang_tra` | 108 | 106 | 2 | 2 | 0 | 0 | 0 | — |
| `14_3_hoa_don_hang_tra_lai` | 89 | 80 | 9 | 9 | 0 | 0 | 0 | — |
| `16_hang_ky_gui` | 138 | 122 | 16 | 6 | 0 | 0 | 10 | — |
| `17_quan_ly_quay_thu_ngan` | 64 | 63 | 1 | 0 | 0 | 0 | 1 | — |
| `18_1_ban_hang_tai_quay` | 131 | 128 | 3 | 2 | 0 | 0 | 1 | — |
| `18_2_khach_hang_va_uu_dai` | 115 | 114 | 1 | 0 | 0 | 0 | 1 | — |
| `18_3_thanh_toan_va_bien_lai` | 54 | 47 | 7 | 0 | 0 | 0 | 7 | — |
| `18_4_quan_ly_don_hang` | 70 | 62 | 8 | 4 | 0 | 3 | 1 | — |
| `18_5_doi_tra_hang` | 58 | 57 | 1 | 0 | 0 | 0 | 1 | — |
| `19_quan_ly_khach_hang` | 70 | 70 | 0 | 0 | 0 | 0 | 0 | — |
| `20_khach_hang_than_thiet` | 104 | 104 | 0 | 0 | 0 | 0 | 0 | — |
| `24_cong_no_nhan_vien` | 49 | 49 | 0 | 0 | 0 | 0 | 0 | — |
| `26_phieu_thu` | 40 | 40 | 0 | 0 | 0 | 0 | 0 | — |
| `27_doi_soat_hoa_don` | 36 | 36 | 0 | 0 | 0 | 0 | 0 | — |
| `29_bao_cao` | 77 | 77 | 0 | 0 | 0 | 0 | 0 | — |
| `30_bao_cao_ctkm` | 20 | 20 | 0 | 0 | 0 | 0 | 0 | — |
| `31_quan_ly_phan_quyen` | 45 | 45 | 0 | 0 | 0 | 0 | 0 | — |
| `32_mo_hinh_to_chuc` | 68 | 68 | 0 | 0 | 0 | 0 | 0 | — |
| `33_lich_su_thao_tac_nguoi_dung` | 24 | 24 | 0 | 0 | 0 | 0 | 0 | — |
| `34_cong_no_khach_hang` | 28 | 28 | 0 | 0 | 0 | 0 | 0 | — |
| `35-gia-von-mac-dinh` | 61 | 61 | 0 | 0 | 0 | 0 | 0 | — |
| `50_toan_trinh` | 18 | 18 | 0 | 0 | 0 | 0 | 0 | — |

## Khoá dữ liệu đang thiếu — bộ seed đã có chưa

Sổ seed: `tai-lieu-test/00_seed/seed-state.json` (lượt 51793667).
Cột **Seed có** = sổ đã có khoá cùng tên; 🔴 không có nghĩa là phải seed thêm hoặc khai tay.

| Khoá | Số case chờ | Seed có |
|---|--:|---|
| `sku` | 4 | ✅ |
| `maLo` | 3 | 🔴 chưa |
| `tenFileExcel` | 2 | 🔴 chưa |
| `tenDanhMuc` | 2 | ✅ |
| `maPhieu` | 1 | 🔴 chưa |
| `periodId` | 1 | 🔴 chưa |
| `remittanceId` | 1 | 🔴 chưa |

## Cách làm một phân hệ

1. Đọc `<phân hệ>/test-cases.md` để biết route và API thật của từng task.
2. Mở `chua-chay-duoc*.spec.js` — mỗi case vỏ rỗng là một `test()` chỉ có `chanNeuTat(id)`.
3. Viết thao tác + `expect` vào case **SẴN SÀNG** trước; case ghi thì lấy dữ liệu từ sổ seed,
   🚫 đừng tạo dữ liệu mới trong spec kiểm thử.
4. Chạy lại `node tool/bin/checklist.js` và `node tool/bin/viec-can-lam.js` để thấy tiến độ thật.

🚫 **Đừng để case chạy xong mà không kiểm gì** — đó chính là cách 2472 case này ra đời.
