# Checklist dữ liệu test đầu vào còn thiếu

> 🤖 Sinh tự động bởi `tool/bin/thieu-input.js` — 🚫 đừng sửa tay, chạy lại là mất.
> Điền giá trị vào `<phân hệ>/test-input.json` (khoá `data`), hoặc đặt biến môi trường
> `VNPOST_CASE_<MÃ_CASE>_<KHOÁ>` khi chạy. Điền xong chạy lại script này để soát.

**491 case** thiếu dữ liệu đầu vào ở **22 phân hệ**.

## Cách đọc

| Cột | Nghĩa |
|---|---|
| `Khoá còn trống` | tên trường trong `data` đang rỗng mà `required` đòi |
| `Đang bật` | `enabled` của case. Tắt thì điền xong vẫn phải bật mới chạy |
| `Ghi dữ liệu` | case sửa dữ liệu thật — cần `allowMutation: true` và môi trường dựng riêng |

## Tổng quan

| Phân hệ | Case khai | Thiếu input | Tắt | Ghi dữ liệu | Chạy được |
|---|--:|--:|--:|--:|--:|
| `01_quan_ly_diem_ban` | 134 | 13 | 15 | 31 | 83 |
| `02_quan_ly_nhan_vien` | 72 | 2 | 13 | 8 | 51 |
| `03a_quan_ly_ca_lich_lam_viec` | 64 | 24 | 13 | 17 | 24 |
| `03b_ca_lam_viec_nhan_vien` | 48 | 6 | 35 | 1 | 11 |
| `04_1_canh_bao_ton_kho` | 72 | 3 | 5 | 28 | 37 |
| `04_2_ton_kho_dau_ky` | 36 | 17 | 18 | 7 | 8 |
| `04_3_nhap_xuat_chuyen_kho` | 97 | 39 | 76 |  | 19 |
| `04_4_kiem_kho` | 33 | 7 | 28 |  | 3 |
| `04_5_quan_ly_ton_kho` | 46 | 5 | 25 |  | 19 |
| `07_1_cau_hinh_chung` | 29 |  | 13 | 2 | 14 |
| `07_2_cau_hinh_kho` | 53 | 26 | 45 |  | 7 |
| `07_3_don_hang_va_thanh_toan` | 18 | 1 | 10 | 1 | 7 |
| `07_4_van_hanh` | 32 | 5 | 25 |  | 6 |
| `08_quan_ly_san_pham` | 99 | 6 | 75 |  | 21 |
| `09_san_pham_san_xuat` | 23 | 17 | 13 |  | 5 |
| `10_bang_gia_ban_san_pham` | 87 | 25 | 67 |  | 18 |
| `11_khuyen_mai` | 81 | 49 | 63 |  | 18 |
| `12-don-vi-van-tai` | 108 |  | 97 | 6 | 5 |
| `12_1_ho_so_nha_cung_cap` | 32 |  | 11 | 3 | 18 |
| `12_2_san_pham_va_bang_gia_ncc` | 50 | 30 | 48 |  | 2 |
| `12_3_cong_no_nha_cung_cap` | 68 | 67 | 67 |  | 1 |
| `12_4_hop_dong_va_khuyen_mai_ncc` | 60 | 33 | 53 |  | 6 |
| `13-cong-no-diem-ban-tinh` | 40 | 2 | 9 | 7 | 24 |
| `13_1_phieu_de_xuat_va_phe_duyet` | 55 | 23 | 53 |  | 2 |
| `13_2_gop_tach_va_dieu_phoi` | 3 |  | 1 |  | 2 |
| `13_3_dat_hang_va_nhap_hang` | 98 | 91 | 95 |  |  |
| `14_1_lap_va_duyet_phieu_xuat_tra` | 144 |  | 63 |  | 81 |
| `14_2_gom_tach_va_xu_ly_hang_tra` | 108 |  | 69 |  | 39 |
| `14_3_hoa_don_hang_tra_lai` | 89 |  | 48 |  | 41 |
| `16_hang_ky_gui` | 138 |  | 38 |  | 100 |
| `17_quan_ly_quay_thu_ngan` | 64 |  | 46 |  | 18 |
| `18_1_ban_hang_tai_quay` | 131 |  | 13 |  | 118 |
| `18_2_khach_hang_va_uu_dai` | 115 |  | 63 |  | 52 |
| `18_3_thanh_toan_va_bien_lai` | 54 |  | 12 | 7 | 35 |
| `18_4_quan_ly_don_hang` | 70 |  | 13 | 3 | 54 |
| `18_5_doi_tra_hang` | 58 |  | 48 |  | 10 |
| `19_quan_ly_khach_hang` | 70 |  | 44 |  | 26 |
| `20_khach_hang_than_thiet` | 104 |  | 57 |  | 47 |
| `24_cong_no_nhan_vien` | 49 |  | 13 |  | 36 |
| `26_phieu_thu` | 40 |  | 27 |  | 13 |
| `27_doi_soat_hoa_don` | 36 |  | 26 |  | 10 |
| `29_bao_cao` | 77 |  | 47 |  | 30 |
| `30_bao_cao_ctkm` | 20 |  | 9 |  | 11 |
| `31_quan_ly_phan_quyen` | 45 |  | 14 |  | 31 |
| `32_mo_hinh_to_chuc` | 68 |  | 49 |  | 19 |
| `33_lich_su_thao_tac_nguoi_dung` | 24 |  | 9 |  | 15 |
| `34_cong_no_khach_hang` | 28 |  | 10 |  | 18 |
| `35-gia-von-mac-dinh` | 61 |  | 38 | 3 | 20 |

## Chi tiết theo phân hệ

### `01_quan_ly_diem_ban` — 13 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `01_090_001` | Mở wizard Thiết lập điểm bán từ cột Hành động | `shopCode` | ✅ |  |  |
| ☐ | `01_090_002` | Cảnh báo thiếu ca làm việc / quầy thu ngân khi mở wizard | `shopCode` | 🚫 tắt |  | Cần điểm bán chưa khai ca làm việc / chưa có quầy thu ngân — chưa có mã điểm bán nền cho tình huống này trong  |
| ☐ | `01_090_003` | Bước Tồn kho đầu kỳ chỉ nhận file .xlsx / .xls | `shopCode` | ✅ |  |  |
| ☐ | `01_090_004` | Bước Tồn kho đầu kỳ: file có dòng lỗi thì báo đúng số dòng h | `shopCode` | 🚫 tắt | 🔴 có | Cần file Excel tồn đầu kỳ 10 dòng có 3 dòng sai mã sản phẩm; chưa có fixture. Case còn GHI TỒN KHO thật. |
| ☐ | `01_090_005` | Bước Xếp lịch bị khoá khi điểm bán chưa có nhân viên | `shopCode` | ✅ |  |  |
| ☐ | `01_090_006` | Bước Xếp lịch khi mọi nhân viên của điểm bán đều Đã nghỉ | `shopCode` | 🚫 tắt |  | Cần điểm bán mà toàn bộ nhân viên đều Đã nghỉ — chưa có mã điểm bán nền. |
| ☐ | `01_090_007` | Bước Xếp lịch khi điểm bán chưa có ca làm việc | `shopCode` | 🚫 tắt |  | Cần điểm bán có nhân viên đang làm nhưng chưa khai ca nào — chưa có mã điểm bán nền. |
| ☐ | `01_090_008` | Bước Xếp lịch khi mọi nhân viên đã có lịch | `shopCode` | 🚫 tắt |  | Cần điểm bán mà mọi nhân viên đang làm đều đã xếp lịch — chưa có mã điểm bán nền. |
| ☐ | `01_090_009` | Bước Xếp lịch: bỏ trống từng ô bắt buộc khi Áp dụng chung | `shopCode` | ✅ |  |  |
| ☐ | `01_090_010` | Bước Xếp lịch: khai ca riêng cho từng nhân viên | `shopCode` | ✅ |  |  |
| ☐ | `01_090_011` | Nhân viên đã có lịch không xuất hiện trong danh sách xếp lịc | `shopCode` | 🚫 tắt |  | Cần điểm bán có cả nhân viên đã xếp lịch và chưa xếp lịch — chưa có mã điểm bán nền. |
| ☐ | `01_090_012` | Gán thêm nhân viên từ bước Nhân viên thì wizard tự sang bước | `shopCode` | ✅ | 🔴 có |  |
| ☐ | `01_090_013` | Hoàn tất wizard hiện màn kết quả | `shopCode` | 🚫 tắt | 🔴 có | Đi hết wizard là GHI tồn kho + phân công + lịch làm việc thật; chỉ chạy khi user bật cờ và trên môi trường riê |

### `02_quan_ly_nhan_vien` — 2 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `02_020_003` | Thêm trùng mã nhân viên | `employeeCodeTonTai` | ✅ | 🔴 có |  |
| ☐ | `02_020_023` | Thêm nhân viên trùng số điện thoại | `phoneTonTai` | ✅ | 🔴 có |  |

### `03a_quan_ly_ca_lich_lam_viec` — 24 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `03a_010_011` | Chặn cứng khi trùng KHÍT giờ bắt đầu và kết thúc của ca khác | `caTonTai` · `gioTonTaiTu` · `gioTonTaiDen` | ✅ |  |  |
| ☐ | `03a_010_012` | Ca chồng lấn một phần: chọn Huỷ ở hộp thoại thì không lưu | `caTonTai` · `gioTonTaiTu` · `gioTonTaiDen` | ✅ |  |  |
| ☐ | `03a_010_013` | Ca chồng lấn một phần: chọn Tiếp tục lưu thì lưu được | `caTonTai` · `gioTonTaiTu` · `gioTonTaiDen` | ✅ | 🔴 có |  |
| ☐ | `03a_010_014` | Ca khai ở trạng thái Ngừng hoạt động KHÔNG bị kiểm chồng lấn | `caTonTai` · `gioTonTaiTu` · `gioTonTaiDen` | 🚫 tắt | 🔴 có | Kỳ vọng chưa chốt: chưa có đặc tả nói ca Ngừng hoạt động có được trùng khít giờ với ca đang hoạt động hay khôn |
| ☐ | `03a_020_001` | Sửa tên ca đã khai | `tenCaCanSua` | ✅ | 🔴 có |  |
| ☐ | `03a_020_002` | Chuyển ca sang Ngừng hoạt động thì không xếp lịch được nữa | `tenCaCanSua` | ✅ | 🔴 có |  |
| ☐ | `03a_020_003` | Chặn đổi khung giờ của ca đã có phiên chốt sổ | `tenCaDaChotSo` | 🚫 tắt | 🔴 có | Cần ca đã có phiên chốt sổ; dựng dữ liệu đó phải chạy trọn luồng mở ca - bán hàng - chốt ca trên dữ liệu thật |
| ☐ | `03a_020_004` | Chặn xoá ca đã được sử dụng | `tenCaDaDung` | 🚫 tắt | 🔴 có | Cần ca đã gán nhân viên hoặc đã phát sinh giao dịch |
| ☐ | `03a_020_005` | Xoá được ca chưa từng sử dụng | `tenCaMoiKhai` | ✅ | 🔴 có |  |
| ☐ | `03a_040_001` | Xếp lịch một ngày cho một nhân viên | `tenNhanVien` · `tenCa` | ✅ | 🔴 có |  |
| ☐ | `03a_040_004` | Xếp lịch lặp lại theo thứ trong tuần | `tenNhanVien` · `tenCa` | ✅ | 🔴 có |  |
| ☐ | `03a_040_005` | Xếp lịch một ngày: bỏ trống từng ô bắt buộc | `tenNhanVien` | ✅ |  |  |
| ☐ | `03a_040_006` | Xếp lịch lặp lại: bỏ trống ca hoặc thứ trong tuần | `tenNhanVien` | ✅ |  |  |
| ☐ | `03a_040_007` | Xem lịch làm việc trên giao diện calendar | `tenNhanVien` | ✅ |  |  |
| ☐ | `03a_040_008` | Chế độ lặp: bỏ trống Ngày kết thúc | `tenNhanVien` | 🚫 tắt | 🔴 có | Chưa có đặc tả: không có Ngày kết thúc thì hệ thống xếp lịch đến đâu, và quan hệ với giới hạn 90 ngày ở 03a_04 |
| ☐ | `03a_040_009` | Đóng drawer Xếp lịch giữa chừng thì không lưu gì | `tenNhanVien` | ✅ |  |  |
| ☐ | `03a_050_001` | Huỷ lịch từ một ngày trở đi | `tenNhanVien` · `tuNgay` | ✅ | 🔴 có |  |
| ☐ | `03a_050_002` | Lịch đã chấm công không bị huỷ | `tenNhanVien` | ✅ | 🔴 có |  |
| ☐ | `03a_050_003` | Hộp thoại huỷ lịch có đủ ba phạm vi | `tenNhanVien` | ✅ |  |  |
| ☐ | `03a_050_004` | Chưa chọn nhân viên thì không huỷ được | `tenNhanVien` | ✅ |  |  |
| ☐ | `03a_050_005` | Huỷ phạm vi "Tất cả các lịch" báo đúng SỐ lịch đã huỷ | `tenNhanVien` | 🚫 tắt | 🔴 có | Cần nhân viên nền có đúng N lịch để đối chiếu con số trong thông báo; chưa có điểm bán dựng riêng. 🔴 Huỷ lịch |
| ☐ | `03a_050_006` | Huỷ khi không có lịch nào phù hợp | `tenNhanVien` | 🚫 tắt | 🔴 có | Cần nhân viên nền KHÔNG có lịch nào từ một mốc ngày — chưa có dữ liệu nền. |
| ☐ | `03a_050_007` | Vào từ một ca cụ thể thì ô Nhân viên bị vô hiệu | `tenNhanVien` | ✅ |  |  |
| ☐ | `03a_060_001` | Tra cứu báo cáo chốt ca theo khoảng thời gian | `tuNgay` · `denNgay` | ✅ |  |  |

### `03b_ca_lam_viec_nhan_vien` — 6 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `03b_030_001` | Mở ca với khai tiền mặt theo mệnh giá | `quayThuNgan` | 🚫 tắt | 🔴 có | Mở ca thật, tạo phiên bán hàng |
| ☐ | `03b_050_005` | Báo cáo ca chỉ hiện số liệu của tài khoản đang đăng nhập | `nhanVienThuHai` | 🚫 tắt |  | Cần hai tài khoản nhân viên cùng điểm bán đều có ca trong ngày; chưa có tài khoản nền thứ hai trong `.env.acco |
| ☐ | `03b_060_001` | Chưa được xếp lịch làm việc thì không vào được màn tạo đơn | `soDienThoaiTaiKhoan` | 🚫 tắt |  | Cần tài khoản cấp điểm bán KHÔNG được xếp ca hôm nay, và phải chắc SĐT không nằm trong danh sách bỏ qua hardco |
| ☐ | `03b_060_002` | Đã xếp lịch nhưng chưa mở ca thì không vào được màn tạo đơn | `soDienThoaiTaiKhoan` | 🚫 tắt |  | Cần tài khoản đã xếp ca nhưng chưa mở ca; cùng ràng buộc SĐT như 03b_060_001. |
| ☐ | `03b_060_003` | 🔴 Tài khoản trong danh sách bỏ qua KHÔNG bị chặn | `soDienThoaiTaiKhoan` | 🚫 tắt |  | Cần biết SĐT của tài khoản test có nằm trong danh sách bỏ qua hardcode ở routes/helpers.js hay không — chưa đố |
| ☐ | `03b_060_004` | Vai không thuộc cấp điểm bán không bị chặn ca | `soDienThoaiTaiKhoan` | ✅ |  |  |

### `04_1_canh_bao_ton_kho` — 3 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `04_1_010_011` | Tìm kiếm SKU và tên sản phẩm ở thẻ Dự báo hết hàng | `sku` | ✅ |  |  |
| ☐ | `04_1_020_015` | Tìm kiếm trong khối Cấu hình Tổng công ty | `sku` | ✅ |  |  |
| ☐ | `04_1_020_016` | Tìm kiếm ở thẻ Theo từng sản phẩm | `sku` | 🚫 tắt |  | 🔴 Kỳ vọng chưa chốt: sheet QC đòi tìm được theo BARCODE, code không khai barcode trong ô tìm kiếm. |

### `04_2_ton_kho_dau_ky` — 17 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `04_2_020_001` | Đọc tệp Excel hợp lệ và hiện năm ô tổng hợp | `fileExcel` | 🚫 tắt |  | Chưa có tệp Excel mẫu trong repo (fixtures/) |
| ☐ | `04_2_020_002` | Bảng xem trước hiện đủ cột và trạng thái từng dòng | `fileExcel` | 🚫 tắt |  | Chưa có tệp Excel mẫu trong repo |
| ☐ | `04_2_020_003` | Dòng thiếu SKU bị đánh Lỗi kèm lý do | `fileExcel` | 🚫 tắt |  | Chưa có tệp Excel dựng sẵn thiếu SKU |
| ☐ | `04_2_020_004` | Dòng có số lượng bằng 0 bị chặn | `fileExcel` | 🚫 tắt |  | Chưa có tệp Excel dựng sẵn số lượng 0 |
| ☐ | `04_2_020_005` | Dòng giá vốn âm bị chặn | `fileExcel` | 🚫 tắt |  | Chưa có tệp Excel dựng sẵn giá vốn âm |
| ☐ | `04_2_020_006` | Bỏ trống mã điểm bán thì ghi vào điểm bán đang chọn | `fileExcel` | 🚫 tắt |  | Chưa có tệp Excel dựng sẵn bỏ trống mã điểm bán |
| ☐ | `04_2_020_007` | Số serial phải bằng số lượng quy về đơn vị chính | `fileExcel` | 🚫 tắt |  | Chưa có tệp Excel dựng sẵn serial lệch số lượng |
| ☐ | `04_2_020_008` | Ghi nhận lượt khai báo đưa hàng vào tồn kho | `fileExcel` | 🚫 tắt | 🔴 có | GHI TỒN KHO THẬT và mỗi điểm bán chỉ khai được một lần |
| ☐ | `04_2_020_010` | Upload SKU không tồn tại | `tenFileExcel` | ✅ | 🔴 có |  |
| ☐ | `04_2_020_011` | Upload SKU của sản phẩm ĐÃ có tồn kho | `tenFileExcel` | 🚫 tắt | 🔴 có | GHI tồn kho thật và phải đo cộng dồn — cần điểm bán dựng riêng vì mỗi điểm bán chỉ khai được một lần. |
| ☐ | `04_2_020_014` | Mã lô đã tồn tại | `tenFileExcel` | 🚫 tắt | 🔴 có | 🔴 Kỳ vọng gốc CỤT ("Hiển thị Mã lô đã tồn tại:"), chưa rõ chặn hay cộng dồn vào lô có sẵn. Case còn GHI tồn k |
| ☐ | `04_2_020_016` | Upload file Excel rỗng | `tenFileExcel` | ✅ | 🔴 có |  |
| ☐ | `04_2_020_022` | Khai báo tồn đầu kỳ cho sản phẩm chưa từng khai | `tenFileExcel` | 🚫 tắt | 🔴 có | GHI tồn kho thật; cần điểm bán CHƯA khai báo tồn đầu kỳ lần nào. |
| ☐ | `04_2_020_023` | Upload file lớn | `tenFileExcel` | 🚫 tắt | 🔴 có | Cần file Excel ≥1.000 dòng chưa có fixture; và GHI tồn kho thật. |
| ☐ | `04_2_030_001` | Lọc danh sách lượt khai báo theo kho hoặc điểm bán | `maDiemBan` | ✅ |  |  |
| ☐ | `04_2_030_002` | Tìm lượt khai báo theo mã preview hoặc tên file | `maPreview` | ✅ |  |  |
| ☐ | `04_2_PQ_001` | Vai Bưu điện Tỉnh xem được lượt khai báo của điểm bán trực t | `maDiemBan` | ✅ |  |  |

### `04_3_nhap_xuat_chuyen_kho` — 39 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `04_3_010_003` | Tìm kiếm theo mã phiếu | `maPhieu` | ✅ |  |  |
| ☐ | `04_3_010_004` | Tìm kiếm mã phiếu không tồn tại | `maPhieu` | ✅ |  |  |
| ☐ | `04_3_020_001` | Mở Phiếu nhập kho và validate rỗng | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_020_002` | Tạo phiếu nhập kho nháp | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_020_003` | Chỉnh sửa phiếu nhập kho nháp | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_020_004` | Duyệt phiếu nháp thành phiếu nhập chính thức | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_020_005` | Thông tin tự điền khi mở form tạo phiếu nhập | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_020_006` | Nhập kho từ nhà cung cấp | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_020_007` | Nhập kho từ mã phiếu đặt hàng | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_020_008` | Nhập kho từ nội bộ cửa hàng | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_020_009` | Sửa phiếu nhập khi sản phẩm CHƯA phát sinh xuất kho | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_020_010` | Sửa phiếu nhập khi sản phẩm ĐÃ phát sinh xuất kho | `sku` | 🚫 tắt | 🔴 có | 🔴 Kỳ vọng chưa chốt: sheet không nói hệ thống chặn gì khi sửa phiếu nhập của sản phẩm ĐÃ xuất, và giá vốn phi |
| ☐ | `04_3_020_011` | Thanh toán một phần phiếu nhập kho | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_020_012` | Thanh toán toàn bộ phiếu nhập kho | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_020_013` | Giá vốn sau nhập kho sản phẩm MAC | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_020_014` | Giá vốn sau nhập kho sản phẩm FIFO | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_020_015` | Giá vốn sau nhập kho sản phẩm thực tế đích danh | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_020_016` | Giá vốn sau nhập kho sản phẩm giá tiêu chuẩn | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_020_017` | Lô hàng khi nhập kho | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_030_001` | Mở Phiếu xuất kho và validate rỗng | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_030_002` | Tạo phiếu xuất kho nháp | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_030_003` | Sửa số lượng trên phiếu xuất | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_030_004` | Xuất kho từ một lô hàng xác định | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_030_005` | Xuất kho từ nhiều lô khác nhau | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_030_006` | Xuất toàn bộ số lượng của một lô | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_030_007` | Xuất vượt tồn kho của lô | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_030_008` | Xuất kho khi tồn bằng 0 | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_030_009` | Xuất kho khi tồn đang ÂM | `sku` | 🚫 tắt | 🔴 có | 🔴 Kỳ vọng chưa chốt: phụ thuộc chính sách tồn âm của điểm bán, và chưa rõ giá vốn lấy ở đâu khi không còn lô. |
| ☐ | `04_3_030_010` | Xuất kho chọn mã serial | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_050_001` | Nhập thêm lô mới không ảnh hưởng lô cũ | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_050_002` | Nhập kho từ đơn đặt hàng nhà cung cấp | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_050_003` | Nhập lô mới TRÙNG mã lô đã có — chọn gộp lô | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_050_004` | Nhập lô mới trùng mã lô — chọn đổi tên lô mới | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_050_005` | Nhập kho sản phẩm có 1 lô từ đơn hoàn trả | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_050_006` | Nhập kho sản phẩm có nhiều lô từ đơn hoàn trả | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_050_007` | Sửa phiếu nhập của lô CHƯA phát sinh xuất | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_050_008` | Sửa phiếu nhập của lô ĐÃ phát sinh xuất | `sku` | 🚫 tắt | 🔴 có | 🔴 Kỳ vọng chưa chốt, cùng vấn đề 04_3_020_010 ở mức LÔ. Case còn GHI thật. |
| ☐ | `04_3_050_009` | Theo dõi lịch sử lô hàng | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |
| ☐ | `04_3_050_010` | Nhập kho khi tồn đang ÂM | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO / GIÁ VỐN / CÔNG NỢ thật. Cần điểm bán + kho dựng riêng cho test và bộ sản phẩm đủ 4 phương phá |

### `04_4_kiem_kho` — 7 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `04_4_050_002` | Tìm kiếm theo mã phiếu kiểm kho đúng | `maPhieu` | ✅ |  |  |
| ☐ | `04_4_050_003` | Tìm kiếm mã phiếu không tồn tại | `maPhieu` | ✅ |  |  |
| ☐ | `04_4_060_001` | Kiểm kê THIẾU hàng của một lô | `maLo` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO thật qua phiếu kiểm kho (điều chỉnh tồn không hoàn tác được bằng UI). Cần kho dựng riêng + sản  |
| ☐ | `04_4_060_002` | Kiểm kê THỪA hàng của một lô | `maLo` | 🚫 tắt | 🔴 có | Cần chốt giá vốn của phần hàng thừa lấy từ đâu — đặc tả không nói. Case còn GHI thật. |
| ☐ | `04_4_060_003` | Kiểm kho GIẢM khi tồn đang bằng 0 | `maLo` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO thật qua phiếu kiểm kho (điều chỉnh tồn không hoàn tác được bằng UI). Cần kho dựng riêng + sản  |
| ☐ | `04_4_060_004` | Kiểm kho GIẢM khi tồn đang âm | `maLo` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO thật qua phiếu kiểm kho (điều chỉnh tồn không hoàn tác được bằng UI). Cần kho dựng riêng + sản  |
| ☐ | `04_4_060_005` | Kiểm kho TĂNG khi tồn đang âm | `maLo` | 🚫 tắt | 🔴 có | 🔴 GHI TỒN KHO thật qua phiếu kiểm kho (điều chỉnh tồn không hoàn tác được bằng UI). Cần kho dựng riêng + sản  |

### `04_5_quan_ly_ton_kho` — 5 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `04_5_030_004` | Tìm kiếm theo Tên sản phẩm ở Thẻ kho | `sku` | ✅ |  |  |
| ☐ | `04_5_030_005` | Tìm kiếm theo SKU ở Thẻ kho | `sku` | ✅ |  |  |
| ☐ | `04_5_030_006` | Tìm kiếm theo Barcode ở Thẻ kho | `sku` | 🚫 tắt |  | Cần biết ô tìm ở Thẻ kho có nhận barcode hay không — cùng vấn đề FUNC_1_202 của phân hệ 04_1. |
| ☐ | `04_5_030_010` | Số liệu Tổng xuất ở Thẻ kho | `sku` | 🚫 tắt |  | Cùng lý do 04_5_030_009 cho Tổng xuất. |
| ☐ | `04_5_030_011` | Số liệu Tồn cuối kỳ ở Thẻ kho | `sku` | 🚫 tắt |  | Đẳng thức Tồn đầu + Nhập − Xuất = Tồn cuối phải đối chiếu cả với tồn thật; cần dữ liệu nền ổn định và cách đo  |

### `07_2_cau_hinh_kho` — 26 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `07_2_010_006` | Tạo cấu hình khoá kho theo SKU | `sku` · `maDonVi` | 🚫 tắt | 🔴 có | 🔴 GHI: cài/bỏ cấu hình khoá kho (chặn ngay nghiệp vụ kho của cả phạm vi đã chọn), hoặc lập chứng từ kho/bán h |
| ☐ | `07_2_010_009` | Tìm kiếm SKU sản phẩm tự doanh ở màn Khoá kho | `sku` | 🚫 tắt | 🔴 có | Cần sản phẩm tự doanh (của tỉnh/xã) — chưa có dữ liệu nền. |
| ☐ | `07_2_010_010` | Tìm kiếm SKU sản phẩm của Tổng công ty ở màn Khoá kho | `sku` | 🚫 tắt | 🔴 có | Cần sản phẩm thuộc Tổng công ty — chưa có dữ liệu nền. |
| ☐ | `07_2_040_005` | Số ngày của từng sản phẩm mặc định lấy theo số ngày chung | `sku1` · `sku2` | 🚫 tắt | 🔴 có | 🔴 GHI: cài/bỏ cấu hình khoá kho (chặn ngay nghiệp vụ kho của cả phạm vi đã chọn), hoặc lập chứng từ kho/bán h |
| ☐ | `07_2_050_001` | Lọc cấu hình cảnh báo theo SKU hoặc ngành hàng | `sku` | ✅ |  |  |
| ☐ | `07_2_060_001` | Bán hàng với sản phẩm đang bị khoá kho | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: cài/bỏ cấu hình khoá kho (chặn ngay nghiệp vụ kho của cả phạm vi đã chọn), hoặc lập chứng từ kho/bán h |
| ☐ | `07_2_060_002` | Xuất kho với sản phẩm đang bị khoá | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: cài/bỏ cấu hình khoá kho (chặn ngay nghiệp vụ kho của cả phạm vi đã chọn), hoặc lập chứng từ kho/bán h |
| ☐ | `07_2_060_003` | Nhập kho với sản phẩm đang bị khoá | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: cài/bỏ cấu hình khoá kho (chặn ngay nghiệp vụ kho của cả phạm vi đã chọn), hoặc lập chứng từ kho/bán h |
| ☐ | `07_2_060_004` | Chuyển kho sản phẩm đang bị khoá | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: cài/bỏ cấu hình khoá kho (chặn ngay nghiệp vụ kho của cả phạm vi đã chọn), hoặc lập chứng từ kho/bán h |
| ☐ | `07_2_060_005` | Xác nhận nhận hàng chuyển kho khi sản phẩm bị khoá | `sku` | 🚫 tắt | 🔴 có | 🔴 Tình huống nguy hiểm: hàng đã rời kho gửi mà bên nhận bị chặn ⇒ hàng treo giữa đường. Cần user chốt hệ thốn |
| ☐ | `07_2_060_006` | Kiểm kho lệch với sản phẩm bị khoá | `sku` | 🚫 tắt | 🔴 có | 🔴 Sheet không phân biệt chênh lệch TĂNG và GIẢM khi sản phẩm bị khoá — cần user chốt. Case còn GHI tồn kho. |
| ☐ | `07_2_060_007` | Bán hàng với sản phẩm đã bỏ khoá | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: cài/bỏ cấu hình khoá kho (chặn ngay nghiệp vụ kho của cả phạm vi đã chọn), hoặc lập chứng từ kho/bán h |
| ☐ | `07_2_060_008` | Nhập kho với sản phẩm đã bỏ khoá | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: cài/bỏ cấu hình khoá kho (chặn ngay nghiệp vụ kho của cả phạm vi đã chọn), hoặc lập chứng từ kho/bán h |
| ☐ | `07_2_060_009` | Xuất kho với sản phẩm đã bỏ khoá | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: cài/bỏ cấu hình khoá kho (chặn ngay nghiệp vụ kho của cả phạm vi đã chọn), hoặc lập chứng từ kho/bán h |
| ☐ | `07_2_060_010` | Chuyển kho sản phẩm đã bỏ khoá | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: cài/bỏ cấu hình khoá kho (chặn ngay nghiệp vụ kho của cả phạm vi đã chọn), hoặc lập chứng từ kho/bán h |
| ☐ | `07_2_060_011` | Xác nhận chuyển kho sản phẩm đã bỏ khoá | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: cài/bỏ cấu hình khoá kho (chặn ngay nghiệp vụ kho của cả phạm vi đã chọn), hoặc lập chứng từ kho/bán h |
| ☐ | `07_2_060_012` | Kiểm kho lệch với sản phẩm đã bỏ khoá | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: cài/bỏ cấu hình khoá kho (chặn ngay nghiệp vụ kho của cả phạm vi đã chọn), hoặc lập chứng từ kho/bán h |
| ☐ | `07_2_070_001` | Khoá kho với phạm vi áp dụng là Bưu điện tỉnh | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: cài/bỏ cấu hình khoá kho (chặn ngay nghiệp vụ kho của cả phạm vi đã chọn), hoặc lập chứng từ kho/bán h |
| ☐ | `07_2_070_002` | Khoá kho với phạm vi áp dụng là Bưu điện xã | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: cài/bỏ cấu hình khoá kho (chặn ngay nghiệp vụ kho của cả phạm vi đã chọn), hoặc lập chứng từ kho/bán h |
| ☐ | `07_2_070_003` | Khoá kho với phạm vi áp dụng là điểm bán | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: cài/bỏ cấu hình khoá kho (chặn ngay nghiệp vụ kho của cả phạm vi đã chọn), hoặc lập chứng từ kho/bán h |
| ☐ | `07_2_070_004` | Khoá kho áp cho nhiều cấp cùng lúc | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: cài/bỏ cấu hình khoá kho (chặn ngay nghiệp vụ kho của cả phạm vi đã chọn), hoặc lập chứng từ kho/bán h |
| ☐ | `07_2_070_005` | Khoá kho theo DANH MỤC thay vì theo SKU | `sku` | 🚫 tắt | 🔴 có | 🔴 Chưa có đặc tả: sản phẩm thêm vào danh mục SAU khi khoá có bị chặn không. Case còn GHI thật. |
| ☐ | `07_2_080_001` | Giá vốn tạm tính khi tồn = 0 và bán âm | `sku` | 🚫 tắt | 🔴 có | 🔴 Câu hỏi giá vốn của bán âm — cần dữ liệu nền tồn = 0 và chính sách bán âm bật; GHI đơn bán thật. |
| ☐ | `07_2_080_002` | Giá vốn tạm tính khi tồn > 0 rồi bán vượt thành âm | `sku` | 🚫 tắt | 🔴 có | Như 07_2_080_001, cần tồn dương nhỏ hơn số bán. |
| ☐ | `07_2_080_003` | Giá vốn tạm tính khi tồn đang âm rồi bán tiếp | `sku` | 🚫 tắt | 🔴 có | 🔴 Kỳ vọng gốc (`dong23`) CHÉP NHẦM của case thêm danh mục. Cần user chốt giá vốn tạm tính khi tồn đã âm sẵn. |
| ☐ | `07_2_080_004` | Thêm danh mục với các trường không hợp lệ | `sku` | 🚫 tắt | 🔴 có | Case thuộc quản lý DANH MỤC sản phẩm, bị đặt nhầm nhóm trong sheet — cần user chốt giữ ở phân hệ nào (08 quản  |

### `07_3_don_hang_va_thanh_toan` — 1 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `07_3_020_003` | Chặn tải logo sai định dạng hoặc quá 5 MB | `fileLogoSai` | 🚫 tắt | 🔴 có | Chưa có tệp logo sai định dạng / quá 5MB dựng sẵn trong repo |

### `07_4_van_hanh` — 5 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `07_4_030_001` | Tìm loại thông báo theo tính năng | `tuKhoa` | ✅ |  |  |
| ☐ | `07_4_050_012` | Thứ tự duyệt: vai bước 2 chưa thấy phiếu khi bước 1 chưa xon | `vaiBuoc1` · `vaiBuoc2` | 🚫 tắt | 🔴 có | Cần tài khoản đúng vai của bước 2 trong luồng duyệt — chưa có tài khoản nền. |
| ☐ | `07_4_050_013` | Bước 2 được duyệt sau khi bước 1 hoàn thành | `vaiBuoc1` · `vaiBuoc2` | 🚫 tắt | 🔴 có | Cần tài khoản vai bước 1 và bước 2 để chạy tuần tự — chưa có tài khoản nền. |
| ☐ | `07_4_050_014` | Từ chối tại bước 1 | `vaiBuoc1` · `vaiBuoc2` | 🚫 tắt | 🔴 có | Cần tài khoản vai bước 1; và từ chối phiếu là GHI trạng thái phiếu thật. |
| ☐ | `07_4_050_015` | Từ chối phiếu khi không có quyền duyệt | `vaiBuoc1` · `vaiBuoc2` | 🚫 tắt | 🔴 có | Cần tài khoản vai NGOÀI luồng duyệt — chưa có tài khoản nền. |

### `08_quan_ly_san_pham` — 6 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `08_020_010` | Tính duy nhất của SKU khi thêm sản phẩm | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: tạo/sửa/xoá sản phẩm, combo, danh mục hoặc cấu hình ngừng kích hoạt. Sản phẩm và danh mục dùng chung t |
| ☐ | `08_030_005` | Sửa SKU trùng với SKU đã có trên hệ thống | `sku` · `barcode` | 🚫 tắt | 🔴 có | 🔴 GHI: tạo/sửa/xoá sản phẩm, combo, danh mục hoặc cấu hình ngừng kích hoạt. Sản phẩm và danh mục dùng chung t |
| ☐ | `08_030_006` | Sửa Barcode trùng với Barcode đã có trên hệ thống | `sku` · `barcode` | 🚫 tắt | 🔴 có | 🔴 GHI: tạo/sửa/xoá sản phẩm, combo, danh mục hoặc cấu hình ngừng kích hoạt. Sản phẩm và danh mục dùng chung t |
| ☐ | `08_040_001` | Tìm sản phẩm theo tên tương đối | `sku` | ✅ |  |  |
| ☐ | `08_040_003` | Tìm sản phẩm theo SKU tương đối | `sku` | ✅ |  |  |
| ☐ | `08_040_004` | Tìm sản phẩm theo SKU không tồn tại | `sku` | ✅ |  |  |

### `09_san_pham_san_xuat` — 17 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `09_010_001` | Màn Sản xuất sản phẩm mở được và hiện danh sách phiếu | `thanhPham` | ✅ |  |  |
| ☐ | `09_010_002` | Chặn lập phiếu cho sản phẩm chưa khai công thức nguyên liệu | `thanhPham` | 🚫 tắt | 🔴 có | Phải mở màn lập phiếu thật; cần sản phẩm chế biến CHƯA khai công thức |
| ☐ | `09_010_003` | Lập phiếu sản xuất ở trạng thái Nháp | `thanhPham` | 🚫 tắt | 🔴 có | Lập phiếu sản xuất thật (bản ghi mới dù ở trạng thái Nháp) |
| ☐ | `09_010_004` | Bỏ trống từng ô bắt buộc khi lập phiếu sản xuất | `thanhPham` | ✅ |  |  |
| ☐ | `09_010_005` | Số lượng sản xuất: biên 0, số âm, số thập phân | `thanhPham` | 🚫 tắt | 🔴 có | Cần biết min/max/precision thật của ô số lượng sản xuất — chưa trace. Case còn GHI phiếu. |
| ☐ | `09_010_006` | Nguyên liệu tự điền theo công thức khi chọn thành phẩm | `thanhPham` | 🚫 tắt | 🔴 có | Cần thành phẩm đã khai công thức nguyên liệu — chưa có dữ liệu nền; và GHI phiếu nháp. |
| ☐ | `09_010_007` | Sửa tay lượng nguyên liệu khác công thức | `thanhPham` | 🚫 tắt | 🔴 có | 🔴 Chưa có đặc tả: hệ thống cho sửa tay lượng nguyên liệu khác công thức hay khoá theo công thức. Nếu cho sửa  |
| ☐ | `09_020_001` | Nút Lô serial có ở hai chỗ với hai nhiệm vụ khác nhau | `thanhPham` | ✅ |  |  |
| ☐ | `09_020_002` | Màu chữ nút Lô serial phản ánh tình trạng nhập | `thanhPham` | 🚫 tắt |  | Cần đang dở một phiếu với lô nhập thiếu |
| ☐ | `09_020_003` | Bỏ trống lô / serial khi thành phẩm yêu cầu | `thanhPham` | 🚫 tắt | 🔴 có | Cần thành phẩm quản lý theo lô/serial — chưa có dữ liệu nền. |
| ☐ | `09_030_001` | Nút Xác nhận chỉ hiện với phiếu Nháp | `thanhPham` | ✅ |  |  |
| ☐ | `09_030_002` | Hộp xác nhận sản xuất hỏi đúng nguyên văn | `thanhPham` | 🚫 tắt |  | Cần có sẵn 1 phiếu Nháp |
| ☐ | `09_030_003` | Huỷ ở hộp xác nhận thì phiếu giữ nguyên trạng thái Nháp | `thanhPham` | 🚫 tắt | 🔴 có | Cần có sẵn 1 phiếu Nháp; thao tác chạm nút xác nhận thật |
| ☐ | `09_030_004` | Xác nhận sản xuất trừ nguyên liệu và nhập thành phẩm | `thanhPham` | 🚫 tắt | 🔴 có | XÁC NHẬN SẢN XUẤT THẬT — trừ nguyên liệu, nhập thành phẩm, ghi giá vốn |
| ☐ | `09_030_005` | Giá vốn thành phẩm bằng tổng chi phí nguyên liệu chia số lượ | `thanhPham` | 🚫 tắt | 🔴 có | Cần một phiếu vừa hoàn thành để đối chiếu công thức giá vốn |
| ☐ | `09_030_006` | Chặn xác nhận khi nguyên liệu không còn đủ tồn tại thời điểm | `thanhPham` | 🚫 tắt | 🔴 có | Dựng tình huống phải bán/chuyển kho thật để rút nguyên liệu |
| ☐ | `09_040_002` | Cấp trên điểm bán phải chọn điểm bán trước mới thấy phiếu | `maDiemBan` | ✅ |  |  |

### `10_bang_gia_ban_san_pham` — 25 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `10_010_003` | Lọc theo phạm vi áp dụng chọn đơn vị trong cây tổ chức | `maDonVi` | ✅ |  |  |
| ☐ | `10_020_001` | Chặn lập bảng giá trùng tên | `tenBangGiaDaCo` | 🚫 tắt | 🔴 có | Phải mở màn lập bảng giá thật và bấm lưu |
| ☐ | `10_020_003` | Lập bảng giá mới đầy đủ ba thẻ | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/sửa/phê duyệt/xoá bảng giá hoặc đổi giá sản phẩm. Bảng giá quyết định GIÁ BÁN ở quầy — sai là bán  |
| ☐ | `10_030_002` | Không sửa được bảng giá của đơn vị khác | `tenBangGiaDonViKhac` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/sửa/phê duyệt/xoá bảng giá hoặc đổi giá sản phẩm. Bảng giá quyết định GIÁ BÁN ở quầy — sai là bán  |
| ☐ | `10_040_002` | Thẻ Sản phẩm lọc được theo mã tên và danh mục | `sku` | ✅ |  |  |
| ☐ | `10_090_001` | Thêm sản phẩm Mua bán theo danh mục | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/sửa/phê duyệt/xoá bảng giá hoặc đổi giá sản phẩm. Bảng giá quyết định GIÁ BÁN ở quầy — sai là bán  |
| ☐ | `10_090_002` | Thêm sản phẩm Mua bán theo SKU | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/sửa/phê duyệt/xoá bảng giá hoặc đổi giá sản phẩm. Bảng giá quyết định GIÁ BÁN ở quầy — sai là bán  |
| ☐ | `10_090_003` | Nhập SKU sản phẩm KÝ GỬI vào bảng giá Mua bán | `sku` | 🚫 tắt | 🔴 có | Cần sản phẩm ký gửi để thử nhập vào bảng giá mua bán — chưa có dữ liệu nền. |
| ☐ | `10_090_004` | Thêm Combo Mua bán theo danh mục | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/sửa/phê duyệt/xoá bảng giá hoặc đổi giá sản phẩm. Bảng giá quyết định GIÁ BÁN ở quầy — sai là bán  |
| ☐ | `10_090_005` | Thêm Combo Mua bán theo SKU | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/sửa/phê duyệt/xoá bảng giá hoặc đổi giá sản phẩm. Bảng giá quyết định GIÁ BÁN ở quầy — sai là bán  |
| ☐ | `10_090_006` | Nhập SKU combo KÝ GỬI vào bảng giá Mua bán | `sku` | 🚫 tắt | 🔴 có | Cần combo ký gửi — chưa có dữ liệu nền. |
| ☐ | `10_110_001` | Thêm sản phẩm Ký gửi theo danh mục | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/sửa/phê duyệt/xoá bảng giá hoặc đổi giá sản phẩm. Bảng giá quyết định GIÁ BÁN ở quầy — sai là bán  |
| ☐ | `10_110_002` | Thêm sản phẩm Ký gửi theo SKU | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/sửa/phê duyệt/xoá bảng giá hoặc đổi giá sản phẩm. Bảng giá quyết định GIÁ BÁN ở quầy — sai là bán  |
| ☐ | `10_110_003` | Nhập SKU sản phẩm MUA BÁN vào bảng giá Ký gửi | `sku` | 🚫 tắt | 🔴 có | Cần sản phẩm mua bán để thử nhập vào bảng giá ký gửi. |
| ☐ | `10_110_004` | Thêm Combo Ký gửi theo danh mục | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/sửa/phê duyệt/xoá bảng giá hoặc đổi giá sản phẩm. Bảng giá quyết định GIÁ BÁN ở quầy — sai là bán  |
| ☐ | `10_110_005` | Thêm Combo Ký gửi theo SKU | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/sửa/phê duyệt/xoá bảng giá hoặc đổi giá sản phẩm. Bảng giá quyết định GIÁ BÁN ở quầy — sai là bán  |
| ☐ | `10_110_006` | Thêm sản phẩm Ký gửi từ file Excel | `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/sửa/phê duyệt/xoá bảng giá hoặc đổi giá sản phẩm. Bảng giá quyết định GIÁ BÁN ở quầy — sai là bán  |
| ☐ | `10_130_001` | Giá bán khi sản phẩm nằm trong bảng giá CHƯA gồm VAT, có hiệ | `sku` | 🚫 tắt |  | Cần sản phẩm thuộc bảng giá chưa gồm VAT đang hiệu lực + ca bán hàng đang mở (GHI đơn bán). |
| ☐ | `10_130_002` | Giá bán khi sản phẩm nằm trong bảng giá ĐÃ gồm VAT, có hiệu  | `sku` | 🚫 tắt |  | Cần bảng giá đã gồm VAT đang hiệu lực + ca đang mở (GHI đơn bán). |
| ☐ | `10_130_003` | Sản phẩm KHÔNG nằm trong bảng giá nào tại điểm bán | `sku` | 🚫 tắt |  | Cần sản phẩm KHÔNG thuộc bảng giá nào — khó dựng trên dữ liệu thật. |
| ☐ | `10_130_004` | Sản phẩm nằm trong nhiều bảng giá nhưng CHƯA có hiệu lực | `sku` | 🚫 tắt |  | Cần bảng giá chưa tới ngày hiệu lực — phải lập bảng giá (GHI). |
| ☐ | `10_130_005` | Nhiều bảng giá hiệu lực, khác NGÀY bắt đầu | `sku` | 🚫 tắt |  | 🔴 Quy tắc chọn bảng giá khi nhiều bảng cùng hiệu lực (ngày bắt đầu muộn nhất thắng) CHƯA được xác nhận từ hệ  |
| ☐ | `10_130_006` | Nhiều bảng giá hiệu lực, cùng ngày nhưng khác GIỜ bắt đầu | `sku` | 🚫 tắt |  | Cùng lý do 10_130_005, ở mức GIỜ bắt đầu. |
| ☐ | `10_130_007` | Sản phẩm nằm trong bảng giá hiệu lực tại ĐIỂM BÁN KHÁC | `sku` | 🚫 tắt |  | Cần bảng giá áp cho điểm bán khác — phải lập bảng giá (GHI). |
| ☐ | `10_130_008` | Giá bán combo khi nằm trong bảng giá hiệu lực tại điểm bán | `sku` | 🚫 tắt |  | Cần combo thuộc bảng giá đang hiệu lực + ca đang mở (GHI đơn bán). |

### `11_khuyen_mai` — 49 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `11_090_001` | Kiểm tra mua sản phẩm áp dụng CT Giảm theo % | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_090_002` | Kiểm tra mua combo áp dụng CT Giảm theo % | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_090_003` | Kiểm tra mua sản phẩm áp dụng CT Giảm theo tiền cố định | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_090_004` | Kiểm tra mua combo áp dụng CT Giảm theo tiền cố định | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_090_005` | Kiểm tra Áp dụng CT Giảm theo tiền cố định đúng bằng giá trị | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_090_006` | Kiểm tra Áp dụng CT Giảm theo tiền cố định lớn hơn giá trị đ | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_090_007` | Case gốc dong103 — sheet TRỐNG cột tình huống | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_090_008` | Kiểm tra Áp dụng CT giảm giá kèm quà tặng | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_090_009` | Kiểm tra Áp dụng CT giảm giá kèm quà tặng hết hàng | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_100_001` | Kiểm tra tự động áp dụng CTKM Giảm giá bán sản phẩm theo số  | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_100_002` | Kiểm tra tự động áp dụng CTKM Giảm giá bán sản phẩm theo % | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_100_003` | Kiểm tra tự động áp dụng CTKM Giảm giá bán combo theo số tiề | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_100_004` | Kiểm tra tự động áp dụng CTKM Giảm giá bán combo theo % | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_100_005` | Kiểm tra tự động áp dụng mức điều kiện số lượng lớn hơn tron | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_100_006` | Kiểm tra tự động áp dụng CTKM Tặng kèm sản phẩm khác (Mua A  | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_100_007` | Kiểm tra tự động áp dụng CTKM Tặng kèm sản phẩm trong danh m | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_100_008` | Kiểm tra tự động áp dụng CTKM Mua sản phẩm A được giảm giá c | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_100_009` | Kiểm tra tự động áp dụng CTKM Giảm giá sản phẩm trong danh m | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_100_010` | Kiểm tra tự động áp dụng CTKM Tặng kèm sản phẩm danh mục khá | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_100_011` | Kiểm tra tự động áp dụng CTKM Tặng kèm sản phẩm chỉ định the | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_100_012` | Kiểm tra tự động áp dụng CTKM Giảm giá sản phẩm thuộc danh m | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_100_013` | Kiểm tra tự động áp dụng CTKM Giảm giá cho sản phẩm khác chỉ | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_110_001` | Kiểm tra tự động áp dụng CTKM Giảm giá bán sản phẩm theo số  | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_110_002` | Kiểm tra tự động áp dụng CTKM Giảm giá theo % (hoặc theo cấu | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_110_003` | Kiểm tra tự động áp dụng CTKM Mua sản phẩm danh mục A giảm g | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_110_004` | Kiểm tra tự động áp dụng CTKM Mua sản phẩm danh mục A giảm g | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_110_005` | Kiểm tra áp dụng CTKM danh mục A giảm giá sản phẩm danh mục  | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_110_006` | Kiểm tra áp dụng CTKM Mua sản phẩm danh mục A được tặng sản  | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_110_007` | Kiểm tra áp dụng CTKM Mua sản phẩm danh mục A tặng sản phẩm  | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_110_008` | Kiểm tra áp dụng CTKM Giảm giá cho mỗi combo cùng danh mục | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_110_009` | Kiểm tra áp dụng CTKM Mua danh mục combo A được giảm giá dan | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_110_010` | Kiểm tra áp dụng CTKM Mua danh mục A tặng quà danh mục B nhâ | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_110_011` | Kiểm tra áp dụng CTKM Mua danh mục A tặng quà chỉ định nhân  | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_120_001` | Kiểm tra Áp dụng cùng lúc nhiều CTKM giảm % | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_120_002` | Kiểm tra Áp dụng cùng lúc nhiều CTKM giảm theo số tiền cố đị | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_120_003` | Kiểm tra Áp dụng cùng lúc nhiều CTKM giảm theo số tiền cố đị | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_120_004` | Kiểm tra Áp dụng cùng lúc CT giảm toàn đơn và CT giảm sau CT | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_120_005` | Kiểm tra Áp dụng cùng lúc nhiều CT giảm sau CT khác | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_120_006` | Kiểm tra áp dụng song song KM Sản phẩm và KM Đơn hàng độc lậ | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_120_007` | Kiểm tra KM Sản phẩm làm giảm tổng tiền đơn hàng xuống dưới  | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_120_008` | Kiểm tra áp dụng song song KM Danh mục và KM Đơn hàng độc lậ | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_120_009` | Kiểm tra KM Danh mục làm giảm tổng tiền đơn hàng xuống dưới  | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_120_010` | Kiểm tra áp dụng đồng thời cả 3 loại: KM Sản phẩm, KM Danh m | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_120_011` | Kiểm tra đồng thời nhận nhiều quà tặng từ KM Sản phẩm, KM Da | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_120_012` | Kiểm tra mua sản phẩm A giảm giá sản phẩm B kết hợp mua danh | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_120_013` | Kiểm tra giới hạn áp dụng: Đơn hàng thỏa mãn đồng thời 2 CTK | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_120_014` | Kiểm tra khách hàng thuộc nhóm VIP được hưởng KM VIP + mua s | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_120_015` | Kiểm tra KM Đơn hàng có điều kiện quà tặng (mua sản phẩm X)  | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |
| ☐ | `11_130_001` | Kiểm tra CTKM giảm giá theo DM sản phẩm loại trừ CTKM theo đ | `tenCTKM` | 🚫 tắt | 🔴 có | 🔴 Case đo CHIẾT KHẤU trên đơn bán THẬT: phải mở ca, tạo đơn và thanh toán. Cần điểm bán dựng riêng + bộ CTKM  |

### `12_2_san_pham_va_bang_gia_ncc` — 30 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `12_2_020_001` | Kiểm tra hiển thị màn hình | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_002` | Kiểm tra Thêm / Cập nhật sản phẩm NCC | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_003` | Kiểm tra Tìm kiếm sản phẩm bằng tên sản phẩm | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_004` | Kiểm tra Tìm kiếm sản phẩm bằng mã SKU | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_005` | Kiểm tra Tìm kiếm sản phẩm bằng mã Barcode | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_006` | Kiểm tra ghi nhận thông tin từ file excel tải lên | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_007` | Kiểm tra thêm sản phầm từ file excel | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_008` | Kiểm tra tải về file excel mẫu | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_009` | Upload file chứa SKU đã mapping | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_010` | Upload file chứa SKU chưa mapping | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_011` | Upload file chứa SKU chưa khai báo | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_012` | Xác nhận import khi có SKU hợp lệ | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_013` | Xác nhận khi không có dữ liệu hợp lệ | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_014` | Upload file chứa SKU có mã trùng nhau | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_015` | Kiểm tra xoá sản phẩm trong danh sách | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_016` | Kiểm tra ghi nhận thông tin từ file excel tải lên | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_017` | Mapping đúng SKU chưa liên kết NCC | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_018` | Mapping đúng SKU đã liên kết NCC | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_019` | Kiểm tra giá nhập bằng 0 | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_020` | Kiểm tra giá nhập âm | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_021` | Kiểm tra VAT = 0% | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_022` | Kiểm tra VAT = 100% | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_023` | Kiểm tra VAT âm | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_024` | Kiểm tra giá nhập có số lẻ | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_025` | Kiểm tra loại giá "Giá gốc" | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_026` | Kiểm tra SL tối thiểu = 0 | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_027` | Kiểm tra SL tối thiểu âm | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_028` | Kiểm tra SL tặng âm | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_029` | Xác nhận import thành công | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |
| ☐ | `12_2_020_030` | Xác nhận khi tồn tại dòng lỗi | `maNCC` · `sku` | 🚫 tắt | 🔴 có | 🔴 GHI: mapping sản phẩm–NCC, khai giá nhập, tạo/ban hành/huỷ bảng giá NCC. Ban hành bảng giá là đổi GIÁ NHẬP  |

### `12_3_cong_no_nha_cung_cap` — 67 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `12_3_020_002` | Thanh toán công nợ thành công | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_003` | Thanh toán sinh phiếu thu | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_004` | Thanh toán lớn hơn số nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_005` | Thanh toán bằng đúng số nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_006` | Thanh toán nhiều lần cho 1 PO | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_007` | Lưu lịch sử từng lần thanh toán | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_008` | Kiểm tra tổng công nợ sau nhiều lần thanh toán | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_009` | Gạch nợ thành công | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_010` | Gạch nợ không sinh phiếu thu | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_011` | Gạch nợ vượt số nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_012` | Lưu lịch sử gạch nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_013` | Ghi nợ thành công | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_014` | Ghi nợ không sinh phiếu chi | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_015` | Ghi nợ số tiền âm | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_016` | Ghi nợ số tiền bằng 0 | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_017` | Lưu lịch sử ghi nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_018` | Kiểm tra tab Lịch sử thanh toán | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_019` | Kiểm tra tab Lịch sử ghi nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_020` | Kiểm tra tab Lịch sử trả hàng NCC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_021` | Đối chiếu tổng còn nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_022` | Thanh toán một phần PO | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_023` | Thanh toán nhiều lần đến hết nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_024` | Kiểm tra lịch sử khi thanh toán nhiều lần | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_025` | Gạch nợ một phần công nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_026` | Ghi nợ bổ sung sau khi đã thanh toán | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_027` | Xuất Excel lịch sử công nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_028` | Kiểm tra ghi nhận công nợ khi TCT đặt hàng thẳng về tỉnh | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_029` | Kiểm tra trừ nợ khi xuất trả hàng NCC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_030` | Kiểm tra ghi nhận công nợ NCC của tỉnh | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_031` | Kiểm tra ghi nhận công nợ NCC khi nhận giao 1 phần | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_032` | Kiểm tra ghi nhận công nợ NCC với sản phẩm có VAT | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_020_033` | Kiểm tra ghi nhận công nợ NCC với sản phẩm có khuyến mãi, qu | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_001` | Kiểm tra giao diện | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_002` | Kiểm tra tìm kiếm tên NCC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_003` | Kiểm tra phân trang | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_004` | Thanh toán công nợ thành công | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_005` | Thanh toán sinh phiếu thu | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_006` | Thanh toán lớn hơn số nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_007` | Thanh toán bằng đúng số nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_008` | Thanh toán nhiều lần cho 1 PO | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_009` | Lưu lịch sử từng lần thanh toán | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_010` | Kiểm tra tổng công nợ sau nhiều lần thanh toán | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_011` | Gạch nợ thành công | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_012` | Gạch nợ không sinh phiếu thu | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_013` | Gạch nợ vượt số nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_014` | Lưu lịch sử gạch nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_015` | Ghi nợ thành công | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_016` | Ghi nợ không sinh phiếu chi | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_017` | Ghi nợ số tiền âm | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_018` | Ghi nợ số tiền bằng 0 | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_019` | Lưu lịch sử ghi nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_020` | Kiểm tra tab Lịch sử thanh toán | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_021` | Kiểm tra tab Lịch sử ghi nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_022` | Kiểm tra tab Lịch sử trả hàng NCC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_023` | Đối chiếu tổng còn nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_024` | Thanh toán một phần PO | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_025` | Thanh toán nhiều lần đến hết nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_026` | Kiểm tra lịch sử khi thanh toán nhiều lần | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_027` | Gạch nợ một phần công nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_028` | Ghi nợ bổ sung sau khi đã thanh toán | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_029` | Xuất Excel lịch sử công nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_030` | Kiểm tra ghi nhận công nợ khi TCT đặt hàng thẳng về tỉnh | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_031` | Kiểm tra trừ nợ khi xuất trả hàng NCC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_032` | Kiểm tra ghi nhận công nợ NCC của tỉnh | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_033` | Kiểm tra ghi nhận công nợ NCC khi nhận giao 1 phần | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_034` | Kiểm tra ghi nhận công nợ NCC với sản phẩm có VAT | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |
| ☐ | `12_3_030_035` | Kiểm tra ghi nhận công nợ NCC với sản phẩm có khuyến mãi, qu | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI TIỀN vào sổ công nợ NCC — không hoàn tác được. Cần NCC + PO dựng riêng cho test, và quyền kế toán. |

### `12_4_hop_dong_va_khuyen_mai_ncc` — 33 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `12_4_020_001` | Khai báo hợp đồng NCC mới | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_020_002` | Chặn khai hợp đồng khi bỏ trống trường bắt buộc | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_050_002` | Lọc chương trình theo nhà cung cấp | `tenNCC` | ✅ |  |  |
| ☐ | `12_4_080_011` | Kiểm tra sửa thông tin hợp đồng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_012` | Kiểm tra kích hoạt hợp đồng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_013` | Kiểm tra loại hợp đồng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_014` | Kiểm tra chiết khấu % | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_015` | Kiểm tra theo hạn mức công nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_016` | Kiểm tra hạn thanh toán | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_017` | Kiểm tra thời hạn được trả hàng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_018` | Tìm kiếm không tồn tại | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_019` | Xóa bộ lọc | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_020` | Refresh danh sách | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_021` | Phân trang | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_022` | Mở popup thêm hợp đồng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_023` | Ngày kết thúc nhỏ hơn ngày bắt đầu | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_024` | Trùng số hợp đồng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_025` | Upload tài liệu hợp đồng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_026` | Upload file sai định dạng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_027` | Upload file vượt dung lượng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_028` | Hủy thêm mới | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_029` | Xem tài liệu hợp đồng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_030` | Hiển thị đúng trạng thái hợp đồng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_031` | Kích hoạt hợp đồng đang Ngừng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_032` | Hủy thao tác kích hoạt | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_033` | Hủy thao tác ngừng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_034` | Kiểm tra tổng giá trị hợp đồng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_035` | Đóng popup chi tiết | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_036` | Kiểm tra dữ liệu sau khi reload | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_037` | Kiểm tra hiệu lực theo ngày hiện tại | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_038` | Kiểm tra khoảng trắng đầu/cuối khi nhập số HĐ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_039` | Nhập giá trị âm cho hạn mức công nợ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |
| ☐ | `12_4_080_040` | Nhập chiết khấu >100% | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: khai/phê duyệt/ngừng hợp đồng NCC hoặc CTKM đặt hàng. Hợp đồng đang hiệu lực chi phối chiết khấu và hạ |

### `13-cong-no-diem-ban-tinh` — 2 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `CNDB-KY-009` | Kỳ vẫn ký được khi còn phiếu đã giao mà Tỉnh chưa xác nhận | `periodId` | 🚫 tắt | 🔴 có | Ghi dữ liệu: KÝ biên bản kỳ — không hoàn tác được |
| ☐ | `CNDB-PQ-002` | Duong xac nhan le tung phieu da bi khoa o may chu | `remittanceId` | 🚫 tắt | 🔴 có | Nếu bản deploy chưa có bản khoá 15/09 thì thao tác này ĐÓNG PHIẾU THẬT |

### `13_1_phieu_de_xuat_va_phe_duyet` — 23 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `13_1_070_001` | Kiểm tra hiển thị màn hình | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_070_002` | Kiểm tra Gộp phiếu đề xuất nhập hàng | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_070_003` | Kiểm tra Gộp phiếu các phiếu khác vào phiếu đã gộp | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_070_004` | Kiểm tra nút Huỷ | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_070_005` | Kiểm tra nút Xoá phiếu khi có 2 phiếu | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_070_006` | Kiểm tra nút Xoá phiếu khi có nhiều hơn 2 phiếu | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_080_001` | Kiểm tra hiển thị màn hình | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_080_002` | Kiểm tra Tách phiếu đề xuất nhập hàng nháp | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_080_003` | Kiểm tra Tách phiếu đề xuất nhập hàng | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_080_004` | Kiểm tra nút tách thêm phiếu | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_080_005` | Kiểm tra nút Huỷ | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_080_006` | Kiểm tra nút Xoá phiếu khi có 2 phiếu | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_080_007` | Kiểm tra nút Xoá phiếu khi có nhiều hơn 2 phiếu | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_080_008` | Kiểm tra chỉnh sửa thông tin phiếu | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_080_009` | Kiểm tra tự đồng điền số lượng còn lại vào phiếu bên cạnh | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_090_001` | Kiểm tra vai trò Giám đốc xã duyệt tất cả số lượng trong phi | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_090_002` | Kiểm tra vai trò Giám đốc xã duyệt một phần số lượng trong p | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_090_003` | Kiểm tra vai trò Giám đốc xã huỷ phiếu | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_090_004` | Kiểm tra vai trò Giám đốc xã huỷ phiếu bỏ trống trường lí do | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_090_005` | Kiểm tra cấp Tỉnh gửi phiếu lên cấp TCT | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_090_006` | Kiểm tra cấu hình hạn mức một bước duyệt | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_090_007` | Kiểm tra cấu hình hạn mức nhiều bước duyệt, bước 1 đồng ý ph | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |
| ☐ | `13_1_090_008` | Kiểm tra cấu hình hạn mức nhiều bước duyệt, bước 1 từ chối p | `maPhieuDeXuat` | 🚫 tắt | 🔴 có | 🔴 GHI: lập / sửa / gộp / tách / phê duyệt phiếu đề xuất đặt hàng. Phiếu đi lên cấp trên và có thể sinh PO thậ |

### `13_3_dat_hang_va_nhap_hang` — 91 case

| | Mã case | Tình huống | Khoá còn trống | Đang bật | Ghi dữ liệu | Ghi chú của phân hệ |
|---|---|---|---|---|---|---|
| ☐ | `13_3_010_001` | Tạo phiếu đặt hàng NCC - mở form và validate rỗng | `maNCC` | ✅ |  |  |
| ☐ | `13_3_010_002` | Kiểm tra hiển thị màn hình với tạo phiếu đặt hàng trạng thái | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_010_003` | Kiểm tra Tạo phiếu đặt hàng NCC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_010_004` | Kiểm tra để trống danh sách sản phẩm | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_010_005` | Kiểm tra chọn nhà cung cấp không cung cấp sản phẩm trong dan | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_010_006` | Kiểm tra loại loại bỏ sản phẩm không thuộc nhà cung cấp | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_010_007` | Kiểm tra Bỏ trống trường bắt buộc | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_010_008` | Kiểm tra chỉnh sửa thông tin phiếu | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_010_009` | Kiểm tra lưu nháp phiếu | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_010_010` | Kiểm tra nút huỷ | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_010_011` | Kiểm tra lưu phiếu | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_010_012` | Kiểm tra danh sách phiếu đề xuất sau tạo đơn | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_001` | Mở màn Đặt hàng NCC | `maNCC` | ✅ |  |  |
| ☐ | `13_3_030_002` | Xem chi tiết phiếu đặt hàng NCC khi có dữ liệu | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_003` | Tạo phiếu đặt hàng NCC nháp | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_004` | Chỉnh sửa phiếu đặt hàng nháp | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_005` | Huỷ phiếu đặt hàng nháp | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_006` | Huỷ phiếu đặt hàng NCC chưa xác nhận | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_007` | Kiểm tra in phiếu đặt hàng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_008` | Kiểm tra xác nhận phiếu đặt hàng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_009` | Kiểm tra nhập kho từ phiếu đặt hàng NCC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_010` | Kiểm tra nhập kho từ mã phiếu PO | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_011` | Kiểm tra không cho sửa PO NCC xác nhận | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_012` | Kiểm tra tìm kiếm mã phiếu | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_013` | Kiểm tra tìm kiếm ghi chú | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_014` | Kiểm tra bộ lọc theo trạng thái | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_015` | Kiểm tra bộ lọc PO theo NCC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_016` | Kiểm tra lọc PO theo khoảng thời gian | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_017` | Kiểm tra Xoá bộ lọc | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_018` | Kiểm tra phân trang | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_019` | Kiểm tra đặt hàng nhà cung cấp với sản phẩm có phân loại | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_020` | Kiểm tra nhận hàng số lượng khác dung sai | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_021` | Kiểm tra chỉnh sửa giá sản phẩm | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_022` | Kiểm tra đặt hàng nhà cung cấp với giá gốc, giá khuyến mãi,  | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_023` | Tạo phiếu đặt hàng NCC tại cấp Tỉnh | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_024` | Phiếu đặt hàng sản phẩm tự doanh của tỉnh không hiển thị ở T | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_025` | Kiểm tra cấp tỉnh chỉ được đặt hàng sản phẩm tự doanh | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_026` | Kiểm tra không cho đặt hàng khi sản phẩm chưa có bảng giá ma | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_027` | Kiểm tra xuất trả hàng toàn phần NCC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_028` | Kiểm tra xuất trả hàng nhiều lần trong 1 đơn PO cho NCC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_029` | Kiểm tra công nợ giữ TCT và NCC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_030` | Kiểm tra giao diện | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_031` | Tạo phiếu đặt hàng NCC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_032` | Tạo phiếu đặt hàng NCC nháp | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_033` | Chỉnh sửa phiếu đặt hàng nháp | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_034` | Huỷ phiếu đặt hàng nháp | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_035` | Xem chi tiết phiếu đặt hàng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_036` | Huỷ phiếu đặt hàng NCC chưa xác nhận | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_037` | Kiểm tra in phiếu đặt hàng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_038` | Kiểm tra xác nhận phiếu đặt hàng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_039` | Kiểm tra nhập kho từ phiếu đặt hàng NCC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_040` | Kiểm tra nhập kho từ mã phiếu PO | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_041` | Kiểm tra không cho sửa PO NCC xác nhận | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_042` | Kiểm tra tìm kiếm mã phiếu | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_043` | Kiểm tra tìm kiếm ghi chú | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_044` | Kiểm tra bộ lọc theo trạng thái | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_045` | Kiểm tra bộ lọc PO theo NCC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_046` | Kiểm tra lọc PO theo khoảng thời gian | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_047` | Kiểm tra Xoá bộ lọc | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_048` | Kiểm tra phân trang | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_049` | Kiểm tra đặt hàng nhà cung cấp với sản phẩm có phân loại | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_050` | Kiểm tra nhận hàng số lượng khác dung sai | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_051` | Kiểm tra chỉnh sửa giá sản phẩm | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_052` | Kiểm tra đặt hàng nhà cung cấp với giá gốc, giá khuyến mãi,  | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_053` | Tạo phiếu đặt hàng NCC tại cấp Tỉnh | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_054` | Phiếu đặt hàng sản phẩm tự doanh của tỉnh không hiển thị ở T | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_055` | Kiểm tra cấp tỉnh chỉ được đặt hàng sản phẩm tự doanh | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_056` | Kiểm tra không cho đặt hàng khi sản phẩm chưa có bảng giá ma | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_057` | Kiểm tra xuất trả hàng toàn phần NCC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_058` | Kiểm tra xuất trả hàng nhiều lần trong 1 đơn PO cho NCC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_030_059` | Kiểm tra công nợ giữ TCT và NCC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_040_001` | Kiểm tra giao diện | `maNCC` | ✅ |  |  |
| ☐ | `13_3_040_002` | Kiểm tra tìm kiểm theo mã PO | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_040_003` | Kiểm tra bộ lọc trạng thái phiếu | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_040_004` | Kiểm tra xem chi tiết phiếu PO | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_040_005` | Kiểm tra xác nhận phiếu đặt hàng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_040_006` | Kiểm tra xác nhận phiếu đặt hàng sản phẩm MAC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_040_007` | Kiểm tra xác nhận phiếu đặt hàng sản phẩm FIFO | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_040_008` | Kiểm tra xác nhận nhận hàng 1 phần | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_040_009` | Kiểm tra ghi nhận công nợ nội bộ giữa TCT và tỉnh | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_040_010` | Kiểm tra không hiển thị phiếu tỉnh tự đặt hàng NCC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_040_011` | Kiểm tra giao diện | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_040_012` | Kiểm tra tìm kiểm theo mã PO | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_040_013` | Kiểm tra bộ lọc trạng thái phiếu | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_040_014` | Kiểm tra xem chi tiết phiếu PO | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_040_015` | Kiểm tra xác nhận phiếu đặt hàng | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_040_016` | Kiểm tra xác nhận phiếu đặt hàng sản phẩm MAC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_040_017` | Kiểm tra xác nhận phiếu đặt hàng sản phẩm FIFO | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_040_018` | Kiểm tra xác nhận nhận hàng 1 phần | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_040_019` | Kiểm tra ghi nhận công nợ nội bộ giữa TCT và tỉnh | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |
| ☐ | `13_3_040_020` | Kiểm tra không hiển thị phiếu tỉnh tự đặt hàng NCC | `maNCC` | 🚫 tắt | 🔴 có | 🔴 GHI: lập/gửi phiếu đặt hàng NCC, nhập hàng (sinh công nợ NCC + ghi tồn kho). Cần NCC có hợp đồng, kho dựng  |

## Khoá dữ liệu cần chuẩn bị

| Khoá | Số case cần | Phân hệ dùng |
|---|--:|---|
| `maNCC` | 220 | `12_2_san_pham_va_bang_gia_ncc` · `12_3_cong_no_nha_cung_cap` · `12_4_hop_dong_va_khuyen_mai_ncc` · `13_3_dat_hang_va_nhap_hang` |
| `sku` | 128 | `04_1_canh_bao_ton_kho` · `04_3_nhap_xuat_chuyen_kho` · `04_5_quan_ly_ton_kho` · `07_2_cau_hinh_kho` · `08_quan_ly_san_pham` · `10_bang_gia_ban_san_pham` +1 |
| `tenCTKM` | 49 | `11_khuyen_mai` |
| `maPhieuDeXuat` | 23 | `13_1_phieu_de_xuat_va_phe_duyet` |
| `thanhPham` | 16 | `09_san_pham_san_xuat` |
| `tenNhanVien` | 14 | `03a_quan_ly_ca_lich_lam_viec` |
| `shopCode` | 13 | `01_quan_ly_diem_ban` |
| `fileExcel` | 8 | `04_2_ton_kho_dau_ky` |
| `tenFileExcel` | 6 | `04_2_ton_kho_dau_ky` |
| `maLo` | 5 | `04_4_kiem_kho` |
| `caTonTai` | 4 | `03a_quan_ly_ca_lich_lam_viec` |
| `gioTonTaiTu` | 4 | `03a_quan_ly_ca_lich_lam_viec` |
| `gioTonTaiDen` | 4 | `03a_quan_ly_ca_lich_lam_viec` |
| `soDienThoaiTaiKhoan` | 4 | `03b_ca_lam_viec_nhan_vien` |
| `maPhieu` | 4 | `04_3_nhap_xuat_chuyen_kho` · `04_4_kiem_kho` |
| `vaiBuoc1` | 4 | `07_4_van_hanh` |
| `vaiBuoc2` | 4 | `07_4_van_hanh` |
| `maDiemBan` | 3 | `04_2_ton_kho_dau_ky` · `09_san_pham_san_xuat` |
| `tenCaCanSua` | 2 | `03a_quan_ly_ca_lich_lam_viec` |
| `tenCa` | 2 | `03a_quan_ly_ca_lich_lam_viec` |
| `tuNgay` | 2 | `03a_quan_ly_ca_lich_lam_viec` |
| `maDonVi` | 2 | `07_2_cau_hinh_kho` · `10_bang_gia_ban_san_pham` |
| `barcode` | 2 | `08_quan_ly_san_pham` |
| `employeeCodeTonTai` | 1 | `02_quan_ly_nhan_vien` |
| `phoneTonTai` | 1 | `02_quan_ly_nhan_vien` |
| `tenCaDaChotSo` | 1 | `03a_quan_ly_ca_lich_lam_viec` |
| `tenCaDaDung` | 1 | `03a_quan_ly_ca_lich_lam_viec` |
| `tenCaMoiKhai` | 1 | `03a_quan_ly_ca_lich_lam_viec` |
| `denNgay` | 1 | `03a_quan_ly_ca_lich_lam_viec` |
| `quayThuNgan` | 1 | `03b_ca_lam_viec_nhan_vien` |
| `nhanVienThuHai` | 1 | `03b_ca_lam_viec_nhan_vien` |
| `maPreview` | 1 | `04_2_ton_kho_dau_ky` |
| `sku1` | 1 | `07_2_cau_hinh_kho` |
| `sku2` | 1 | `07_2_cau_hinh_kho` |
| `fileLogoSai` | 1 | `07_3_don_hang_va_thanh_toan` |
| `tuKhoa` | 1 | `07_4_van_hanh` |
| `tenBangGiaDaCo` | 1 | `10_bang_gia_ban_san_pham` |
| `tenBangGiaDonViKhac` | 1 | `10_bang_gia_ban_san_pham` |
| `tenNCC` | 1 | `12_4_hop_dong_va_khuyen_mai_ncc` |
| `periodId` | 1 | `13-cong-no-diem-ban-tinh` |
| `remittanceId` | 1 | `13-cong-no-diem-ban-tinh` |
