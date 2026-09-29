# Case CHƯA CHỐT kỳ vọng — toàn bộ kho

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Cập nhật: 19/9/2026

🔴 **Vì sao có file này.** Một case mà kỳ vọng còn là *"ghi lại hành vi thật"* thì 🚫 **không so
được pass/fail** — chạy nó chỉ để quan sát. Trộn lẫn những case đó vào bảng độ phủ chung làm con số
nhìn đẹp hơn sự thật. Đây là danh sách việc còn nợ, tách riêng ra để đếm được.

## 1. Tổng hợp

| Chỉ tiêu | Số |
|---|--:|
| Case chưa chốt kỳ vọng | **168** |
| Phân hệ có case chưa chốt | **29** |

### Theo loại vướng

| Vướng gì | Số case |
|---|--:|
| Thiếu nguyên văn thông báo | 88 |
| Chờ chạy để lấy hành vi thật | 68 |
| Điều kiện chưa xác định | 6 |
| Chờ user quyết | 6 |
| Chờ chốt với QC | 4 |
| Chưa rõ | 3 |
| Chưa đo được | 3 |

### Theo phân hệ

| Phân hệ | Chưa chốt | Tổng case | Tỷ lệ |
|---|--:|--:|--:|
| `32_mo_hinh_to_chuc` | 24 | 68 | 35.3% |
| `19_quan_ly_khach_hang` | 17 | 70 | 24.3% |
| `18_1_ban_hang_tai_quay` | 13 | 131 | 9.9% |
| `18_2_khach_hang_va_uu_dai` | 12 | 115 | 10.4% |
| `29_bao_cao` | 11 | 77 | 14.3% |
| `31_quan_ly_phan_quyen` | 10 | 45 | 22.2% |
| `18_3_thanh_toan_va_bien_lai` | 9 | 54 | 16.7% |
| `18_4_quan_ly_don_hang` | 9 | 70 | 12.9% |
| `26_phieu_thu` | 7 | 40 | 17.5% |
| `34_cong_no_khach_hang` | 7 | 28 | 25.0% |
| `18_5_doi_tra_hang` | 6 | 58 | 10.3% |
| `33_lich_su_thao_tac_nguoi_dung` | 6 | 24 | 25.0% |
| `35-gia-von-mac-dinh` | 5 | 61 | 8.2% |
| `04_5_quan_ly_ton_kho` | 4 | 46 | 8.7% |
| `27_doi_soat_hoa_don` | 4 | 36 | 11.1% |
| `30_bao_cao_ctkm` | 4 | 20 | 20.0% |
| `01_quan_ly_diem_ban` | 3 | 134 | 2.2% |
| `14_1_lap_va_duyet_phieu_xuat_tra` | 3 | 144 | 2.1% |
| `14_3_hoa_don_hang_tra_lai` | 3 | 89 | 3.4% |
| `17_quan_ly_quay_thu_ngan` | 2 | 64 | 3.1% |
| `02_quan_ly_nhan_vien` | 1 | 72 | 1.4% |
| `03a_quan_ly_ca_lich_lam_viec` | 1 | 64 | 1.6% |
| `04_1_canh_bao_ton_kho` | 1 | 72 | 1.4% |
| `04_2_ton_kho_dau_ky` | 1 | 36 | 2.8% |
| `04_3_nhap_xuat_chuyen_kho` | 1 | 97 | 1.0% |
| `14_2_gom_tach_va_xu_ly_hang_tra` | 1 | 108 | 0.9% |
| `16_hang_ky_gui` | 1 | 138 | 0.7% |
| `20_khach_hang_than_thiet` | 1 | 104 | 1.0% |
| `24_cong_no_nhan_vien` | 1 | 49 | 2.0% |

## 2. Chi tiết từng case

### `32_mo_hinh_to_chuc` — 24 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `32_100_004` | Nhập mã cấp Tỉnh ngoài khoảng quy định | Thiếu nguyên văn thông báo | Bị chặn, không tạo đơn vị. Ghi lại nguyên văn thông báo và khoảng mã hợp lệ |
| `32_100_005` | Nhập mã đơn vị trùng mã đã tồn tại | Thiếu nguyên văn thông báo | Bị chặn, không tạo đơn vị. Ghi lại nguyên văn thông báo trùng mã |
| `32_100_006` | Bỏ trống Đơn vị cha khi thêm mới | Thiếu nguyên văn thông báo | Bị chặn, không tạo đơn vị. Ghi lại nguyên văn thông báo lỗi ở ô Đơn vị cha |
| `32_110_003` | Bỏ trống Mã đơn vị khi thêm nhanh từ cây | Thiếu nguyên văn thông báo | Bị chặn. Ghi lại nguyên văn thông báo lỗi |
| `32_110_004` | Bỏ trống Tên đơn vị khi thêm nhanh từ cây | Thiếu nguyên văn thông báo | Bị chặn. Ghi lại nguyên văn thông báo lỗi |
| `32_110_005` | Nhập mã cấp Xã trùng mã đã tồn tại khi thêm nhanh | Thiếu nguyên văn thông báo | Bị chặn. Ghi lại nguyên văn thông báo trùng mã |
| `32_120_001` | Cây phân cấp hiển thị trạng thái rỗng khi chưa có đơn vị | Thiếu nguyên văn thông báo | Cây hiện trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `32_130_002` | Chỉnh sửa bỏ trống Mã đơn vị | Thiếu nguyên văn thông báo | Bị chặn, không lưu. Ghi lại nguyên văn thông báo lỗi |
| `32_130_003` | Chỉnh sửa đổi Mã đơn vị thành mã đã tồn tại | Thiếu nguyên văn thông báo | Bị chặn, không lưu. Ghi lại nguyên văn thông báo trùng mã |
| `32_140_005` | Nội dung popup xác nhận xoá đơn vị | Thiếu nguyên văn thông báo | Popup nêu rõ hậu quả xoá lan xuống cấp dưới. Ghi lại nguyên văn nội dung |
| `32_150_002` | Nhập tệp sai định dạng | Thiếu nguyên văn thông báo | Bị chặn, không tạo đơn vị nào. Ghi lại nguyên văn thông báo |
| `32_150_003` | Nhập Excel có dòng mã đơn vị trùng | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: nhận phần hợp lệ và báo dòng lỗi, hay từ chối cả tệp. Nếu có tệp lỗi tải về thì kiểm nội dung |
| `32_150_005` | Nhập Excel rỗng chỉ có dòng tiêu đề | Thiếu nguyên văn thông báo | Không tạo đơn vị nào; báo rõ tệp không có dữ liệu. Ghi lại nguyên văn thông báo |
| `32_150_007` | Xuất Excel khi chưa có đơn vị nào | Chờ chạy để lấy hành vi thật | Không lỗi kỹ thuật. Ghi lại hành vi thật: sinh tệp chỉ có header hay báo không có dữ liệu |
| `32_160_004` | Bỏ trống Tên điểm bán khi tạo | Thiếu nguyên văn thông báo | Bị chặn. Ghi lại nguyên văn thông báo lỗi |
| `32_160_005` | Bỏ trống Bưu điện tỉnh hoặc xã khi tạo điểm bán | Thiếu nguyên văn thông báo | Bị chặn. Ghi lại nguyên văn thông báo lỗi |
| `32_160_006` | Bỏ trống Tỉnh thành phố hoặc Xã phường khi tạo điểm bán | Thiếu nguyên văn thông báo | Bị chặn. Ghi lại nguyên văn thông báo lỗi |
| `32_160_007` | Tạo điểm bán không nhập Địa chỉ chi tiết | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: Địa chỉ chi tiết có bắt buộc không |
| `32_170_004` | Gán nhân viên có trạng thái Đã nghỉ | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: nhân viên đã nghỉ có xuất hiện trong dropdown không, và gán được không |
| `32_170_005` | Đổi trạng thái nhân viên từ Đang làm sang Đã nghỉ | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: chỉ dòng vừa đổi bị ảnh hưởng hay toàn bộ phân công của nhân viên đó cùng đổi |
| `32_170_008` | Xác nhận khi dòng mới chưa chọn nhân viên | Thiếu nguyên văn thông báo | Bị chặn. Ghi lại nguyên văn thông báo |
| `32_170_009` | Xác nhận khi dòng mới chưa chọn vai trò | Thiếu nguyên văn thông báo | Bị chặn. Ghi lại nguyên văn thông báo |
| `32_170_010` | Gán trùng cùng nhân viên với cùng vai trò | Thiếu nguyên văn thông báo | Bị chặn hoặc không nhân đôi dòng. Ghi lại nguyên văn thông báo |
| `32_170_015` | Gán nhân viên cho đơn vị không có quyền | Thiếu nguyên văn thông báo | Bị chặn. Ghi lại nguyên văn thông báo hoặc hành vi ẩn đơn vị đó khỏi danh sách |

### `19_quan_ly_khach_hang` — 17 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `19_020_007` | Bỏ trống Tên khách hàng khi thêm mới | Thiếu nguyên văn thông báo | Bị chặn, không tạo khách. Ghi lại nguyên văn thông báo lỗi ở ô Tên khách hàng |
| `19_020_008` | Bỏ trống Số điện thoại khi thêm mới | Thiếu nguyên văn thông báo | Bị chặn, không tạo khách. Ghi lại nguyên văn thông báo lỗi ở ô Số điện thoại |
| `19_020_009` | Thêm khách hàng với số điện thoại sai định dạng | Thiếu nguyên văn thông báo | Bị chặn, không tạo khách. Ghi lại nguyên văn thông báo lỗi định dạng |
| `19_020_010` | Thêm khách hàng với email sai định dạng | Thiếu nguyên văn thông báo | Bị chặn, không tạo khách. Ghi lại nguyên văn thông báo lỗi định dạng email |
| `19_020_011` | Số điện thoại toàn khoảng trắng | Chờ chạy để lấy hành vi thật | Bị chặn như bỏ trống, KHÔNG được coi là đã nhập. Ghi lại hành vi thật |
| `19_020_012` | Tên khách hàng có khoảng trắng đầu cuối | Chờ chạy để lấy hành vi thật | Tên được cắt khoảng trắng thừa (trim). Ghi lại hành vi thật nếu không trim |
| `19_010_005` | Danh sách khách hàng khi chưa có khách nào | Thiếu nguyên văn thông báo | Hiện trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `19_060_003` | Tab Đơn hàng khi khách chưa có đơn nào | Thiếu nguyên văn thông báo | Hiện trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `19_090_004` | Bấm Thanh toán khi chưa chọn đơn hàng nào | Thiếu nguyên văn thông báo | Bị chặn. Ghi lại nguyên văn thông báo yêu cầu chọn đơn hàng |
| `19_030_004` | Chỉnh sửa bỏ trống Tên khách hàng | Thiếu nguyên văn thông báo | Bị chặn, không lưu. Ghi lại nguyên văn thông báo lỗi |
| `19_030_005` | Chỉnh sửa bỏ trống Số điện thoại | Thiếu nguyên văn thông báo | Bị chặn, không lưu. Ghi lại nguyên văn thông báo lỗi |
| `19_030_006` | Chỉnh sửa nhập email sai định dạng | Thiếu nguyên văn thông báo | Bị chặn, không lưu. Ghi lại nguyên văn thông báo lỗi định dạng email |
| `19_050_007` | Nội dung popup xác nhận xoá khách hàng | Thiếu nguyên văn thông báo | Ghi lại nguyên văn nội dung popup. Sheet QC đòi chuỗi bắt đầu bằng "Hành động này sẽ" — cần đối chiếu với chuỗi thật trong code |
| `19_130_006` | Nâng hạng realtime khi thanh toán trả góp | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: hạng nâng theo phần đã trả hay chờ tất toán |
| `19_120_002` | Tìm khách bằng ký tự đặc biệt | Chờ chạy để lấy hành vi thật | Không lỗi 500; không trả về toàn bộ khách. Ghi lại hành vi thật |
| `19_120_003` | Tìm khách không dấu ra khách có dấu | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: có tìm ra khách tên có dấu hay không |
| `19_120_004` | Tìm khách bằng chuỗi toàn khoảng trắng | Chờ chạy để lấy hành vi thật | Coi như không lọc hoặc trả rỗng, không lỗi. Ghi lại hành vi thật |

### `18_1_ban_hang_tai_quay` — 13 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `18_1_010_006` | Đóng tab đơn khi chỉ có duy nhất 1 tab | Chờ chạy để lấy hành vi thật · Chờ chốt với QC | Tab rỗng: đóng rồi hệ thống mở lại một tab tạm mới (🚫 không để màn trống). Tab đang có hàng: hỏi xác nhận trước. Ghi lại hành vi thật để chốt với QC |
| `18_1_010_015` | Tải lại trang F5 khi đang có tab treo | Điều kiện chưa xác định | Hệ thống tự khôi phục lại các tab treo kèm dữ liệu. 🔴 Nếu mất thì là lỗ hổng nghiêm trọng — mất đơn của khách đang đứng chờ |
| `18_1_010_019` | Tìm kiếm khách hàng chưa có trong danh sách | Thiếu nguyên văn thông báo | Hiện thông báo chưa có khách hàng kèm lối thêm mới. Ghi lại nguyên văn thông báo thật |
| `18_1_020_009` | Tìm sản phẩm không dấu | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật. 🔴 Dữ liệu VNPost trộn Anh–Việt nên tìm không dấu là thao tác thường ngày của giao dịch viên |
| `18_1_030_011` | Quét barcode khi mất kết nối máy quét | Chờ chạy để lấy hành vi thật | 🚫 Không hiển thị sản phẩm nào, 🚫 không có dòng hàng mới. Ghi lại xem hệ thống có cảnh báo gì không |
| `18_1_040_007` | Phân bổ THIẾU so với số lượng bán bị chặn | Thiếu nguyên văn thông báo | Bị chặn ở nút "Cập nhật"; dòng "Đã phân bổ" hiện 3/5. Ghi lại nguyên văn thông báo thật |
| `18_1_050_003` | Sửa giá bán của dòng hàng | Chờ chạy để lấy hành vi thật | Tổng tiền dòng và khối tiền đổi theo ngay. 🔴 Ghi lại xem hệ thống có chặn giá thấp hơn giá vốn hay giá sàn không |
| `18_1_050_004` | Giá bán âm hoặc bằng 0 | Chờ chạy để lấy hành vi thật · Điều kiện chưa xác định | Ghi lại hành vi thật. 🔴 Nếu cho phép giá âm thì đơn hàng trả tiền cho khách — lỗ hổng nghiêm trọng |
| `18_1_050_005` | Số lượng bằng 0 hoặc âm trên dòng hàng | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: dòng hàng bị xoá, hay giữ ở 1, hay báo lỗi |
| `18_1_050_006` | Số lượng rất lớn | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật; khối tiền 🚫 không được tràn số hay hiện NaN |
| `18_1_060_019` | Quét barcode SAI sản phẩm rồi mới cân | Chờ chạy để lấy hành vi thật · Chờ chốt với QC | 🔴 Khối lượng vào dòng vừa quét (sai sản phẩm). Ghi lại số lượng thật để chốt với QC — đây là chỗ dễ sai tiền nhất |
| `18_1_060_022` | Mất kết nối cân sau khi quét barcode | Thiếu nguyên văn thông báo | Hiển thị thông báo lỗi cân. Ghi lại nguyên văn — HDSD chỉ nêu "Không thể kết nối cân, vui lòng thử lại" |
| `18_1_060_023` | Nhấc sản phẩm cuối cùng khỏi cân trước khi thanh toán | Chờ chạy để lấy hành vi thật | 🔴 Số lượng đã ghi 🚫 KHÔNG bị xoá về 0 khi nhấc hàng. Ghi lại hành vi thật — nếu bị reset thì mất tiền của khách |

### `18_2_khach_hang_va_uu_dai` — 12 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `18_2_010_016` | Tìm khách bằng số điện thoại một phần | Chờ chạy để lấy hành vi thật | Gợi ý hiện khách có SĐT chứa chuỗi đó; nếu rỗng thì ghi nhận hệ thống chỉ khớp từ đầu |
| `18_2_010_017` | Tìm khách không dấu | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật — 🔴 giao dịch viên gõ không dấu là thao tác thường ngày |
| `18_2_030_006` | Mã coupon không tồn tại bị chặn | Thiếu nguyên văn thông báo | Báo lỗi và 🚫 **KHÔNG** ghi mã vào đơn; "Cần thanh toán" không đổi. Ghi lại nguyên văn thông báo |
| `18_2_030_013` | Mã coupon khác hoa thường | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật — 🔴 nếu phân biệt hoa thường thì khách gõ tay dễ bị từ chối oan |
| `18_2_030_014` | Áp hai mã coupon liên tiếp | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: mã B thay mã A, hay cộng dồn, hay bị chặn. HDSD 🚫 không nói |
| `18_2_030_016` | 🔴 Huỷ đơn sau khi đã dùng coupon | Chưa rõ · Chưa đo được · Chờ chạy để lấy hành vi thật · Chờ user quyết | 🔴 CHƯA CHỐT ĐƯỢC: HDSD chỉ khuyên "hãy kiểm lại tình trạng mã trước khi hứa với khách là dùng lại được" ⇒ **chưa rõ mã có được hoàn không**. Ghi lại hành vi thật — cần user quyết |
| `18_2_040_016` | Các ô bắt buộc toàn khoảng trắng bị coi là rỗng | Chờ chạy để lấy hành vi thật | Bị chặn như khi để trống. Ghi lại nếu ô nào KHÔNG trim — đó là lỗ hổng |
| `18_2_050_007` | Không có chương trình đổi điểm nào đang hiệu lực | Thiếu nguyên văn thông báo | Tuỳ chọn đổi điểm 🚫 không dùng được; hệ thống nêu rõ không có chương trình đổi điểm. Ghi lại nguyên văn thông báo |
| `18_2_050_008` | Khách không đủ điểm để đổi cho đơn hàng | Thiếu nguyên văn thông báo | Hệ thống chặn và nêu số điểm khách đang có. Ghi lại nguyên văn thông báo |
| `18_2_050_009` | Giá trị đơn hàng không đạt tối thiểu để đổi điểm | Thiếu nguyên văn thông báo | Hệ thống chặn và nêu ngưỡng tối thiểu. Ghi lại nguyên văn thông báo |
| `18_2_050_010` | Chọn khách KHÔNG có điểm tích luỹ và cố đổi điểm | Thiếu nguyên văn thông báo | Hệ thống chặn; dòng "Điểm hiện tại" hiện 0 hoặc 🚫 không hiện. Ghi lại nguyên văn thông báo |
| `18_2_050_011` | Đổi số điểm bằng 0 hoặc âm | Chờ chạy để lấy hành vi thật | Cả hai bị chặn. Ghi lại hành vi thật |

### `29_bao_cao` — 11 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `29_210_001` | Chốt tồn kho khi còn đơn phát sinh | Thiếu nguyên văn thông báo | Hiện cảnh báo phù hợp hoặc không cho chốt. Ghi lại nguyên văn thông báo |
| `29_210_012` | Chốt kho tháng sau khi tháng trước chưa chốt | Thiếu nguyên văn thông báo | Bị chặn, không chốt được. Ghi lại nguyên văn thông báo |
| `29_210_013` | Chốt kho tháng nhỏ hơn tháng có phiếu tồn đầu kỳ | Thiếu nguyên văn thông báo | Bị chặn, không chốt được. Ghi lại nguyên văn thông báo |
| `29_210_014` | Chốt kho tháng cũ sau khi đã thêm phiếu tồn đầu kỳ vào tháng mới | Thiếu nguyên văn thông báo | Bị chặn, không chốt được. Ghi lại nguyên văn thông báo |
| `29_210_015` | Chốt kho hai lần trong cùng một tháng | Thiếu nguyên văn thông báo | Bị chặn với thông báo nêu rõ kỳ tháng đó đã được chốt trước đó. Ghi lại nguyên văn |
| `29_220_009` | Giao diện popup Đối soát hoá đơn mua hàng | Thiếu nguyên văn thông báo | Tiêu đề đúng "Đối soát hoá đơn mua hàng". Ghi lại nguyên văn nếu code khác |
| `29_220_013` | Giao diện drawer Chi tiết đối soát PO | Thiếu nguyên văn thông báo | Hiện thông tin Phiếu nhập kho và Hoá đơn. Ghi lại nguyên văn tên các khối |
| `29_240_001` | Báo cáo rỗng khi kỳ không có số liệu | Thiếu nguyên văn thông báo | Hiện trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `29_240_003` | Tìm phạm vi bằng ký tự đặc biệt | Chờ chạy để lấy hành vi thật | Không lỗi 500; không trả về toàn bộ đơn vị. Ghi lại hành vi thật |
| `29_240_004` | Tìm phạm vi không dấu | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: có tìm ra đơn vị tên có dấu hay không |
| `29_240_005` | Chọn khoảng thời gian có ngày kết thúc trước ngày bắt đầu | Chờ chạy để lấy hành vi thật | Bị chặn ở bộ chọn ngày hoặc trả rỗng. Ghi lại hành vi thật |

### `31_quan_ly_phan_quyen` — 10 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `31_030_002` | Ô tìm kiếm vai trò hiển thị đầy đủ | Thiếu nguyên văn thông báo | Ô tìm kiếm hiện rõ kèm placeholder gợi ý tìm theo mã hoặc tên. Ghi lại nguyên văn placeholder |
| `31_030_003` | Nút Thêm vai trò hiển thị đúng | Thiếu nguyên văn thông báo | Nút hiện ở thanh công cụ, bấm được. Ghi lại nguyên văn nhãn nút |
| `31_040_001` | Tìm vai trò với từ khoá không tồn tại | Thiếu nguyên văn thông báo | Bảng về trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `31_040_002` | Tìm vai trò với ký tự đặc biệt | Chờ chạy để lấy hành vi thật | Không lỗi 500; không trả về toàn bộ vai trò. Ghi lại hành vi thật |
| `31_040_006` | Tìm vai trò với nhiều khoảng trắng liên tiếp | Chờ chạy để lấy hành vi thật | Coi như không lọc, trả về toàn bộ danh sách. Ghi lại hành vi thật nếu khác |
| `31_050_001` | Thêm vai trò bị trùng tên | Thiếu nguyên văn thông báo | Bị chặn, không tạo vai trò mới. Ghi lại nguyên văn thông báo trùng tên |
| `31_060_002` | Chỉnh sửa bỏ trống trường bắt buộc | Thiếu nguyên văn thông báo | Bị chặn, không lưu. Ghi lại nguyên văn thông báo lỗi |
| `31_070_001` | Nội dung popup xác nhận xoá vai trò | Thiếu nguyên văn thông báo | Popup hiện đúng nội dung cảnh báo. Ghi lại nguyên văn — code có chuỗi "Vai trò và toàn bộ phân công nhân viên bên dưới sẽ bị xóa. Hành động này không thể hoàn tác." |
| `31_080_002` | Tìm chức năng với ký tự đặc biệt | Chờ chạy để lấy hành vi thật | Không lỗi 500; không trả về toàn bộ chức năng. Ghi lại hành vi thật |
| `31_090_001` | Vai điểm bán không vào được màn quản lý vai trò | Chờ chạy để lấy hành vi thật | Bị chặn hoặc không thấy mục menu. Ghi lại hành vi thật |

### `18_3_thanh_toan_va_bien_lai` — 9 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `18_3_020_003` | Chặn tiền khách đưa nhỏ hơn số phải thu khi Thanh toán hết | Thiếu nguyên văn thông báo | Bị chặn, không tạo đơn. Ghi lại nguyên văn thông báo hiện lên |
| `18_3_020_005` | Nhập số tiền khách đưa bằng 0 | Thiếu nguyên văn thông báo | Bị chặn, không tạo đơn. Ghi lại nguyên văn thông báo |
| `18_3_020_006` | Nhập số tiền khách đưa âm | Chờ chạy để lấy hành vi thật | Ô không nhận giá trị âm, hoặc bị chặn khi xác nhận. Ghi lại hành vi thật |
| `18_3_040_004` | Tra soát giao dịch QR khi lỗi mạng hoặc timeout | Thiếu nguyên văn thông báo | Hệ thống trả về trạng thái giao dịch từ dịch vụ thanh toán. Ghi lại nguyên văn trạng thái hiển thị |
| `18_3_050_002` | Chặn thanh toán bằng điểm khi nhập sai OTP | Thiếu nguyên văn thông báo | Bị chặn, đơn không chuyển sang Đã thanh toán, điểm khách không bị trừ. Ghi lại nguyên văn thông báo hiện lên |
| `18_3_050_009` | Nhập số điểm bằng 0 | Thiếu nguyên văn thông báo | Bị chặn — HDSD yêu cầu số điểm lớn hơn 0. Ghi lại nguyên văn thông báo |
| `18_3_050_010` | Nhập số điểm vượt số tiền phải thu | Thiếu nguyên văn thông báo | Bị chặn — HDSD yêu cầu không vượt số điểm tương ứng số phải thu. Ghi lại nguyên văn thông báo |
| `18_3_080_003` | Nút Đặt hàng trước không dùng được với đơn online | Thiếu nguyên văn thông báo | Nút vô hiệu; tooltip giải thích lý do. Ghi lại nguyên văn tooltip |
| `18_3_100_001` | Vai bưu điện xã không mở được màn bán hàng của điểm bán | Thiếu nguyên văn thông báo | Bị chặn — không vào được màn lập đơn của điểm bán. Ghi lại nguyên văn thông báo hoặc hành vi điều hướng |

### `18_4_quan_ly_don_hang` — 9 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `18_4_010_007` | Tìm kiếm mã đơn không tồn tại | Thiếu nguyên văn thông báo | Bảng về trạng thái rỗng, không báo lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `18_4_010_008` | Tìm kiếm bằng chuỗi toàn khoảng trắng | Chờ chạy để lấy hành vi thật | Hệ thống coi như không lọc (trả về như ban đầu) hoặc trả rỗng. Ghi lại hành vi thật |
| `18_4_010_009` | Tìm kiếm bằng ký tự đặc biệt | Chờ chạy để lấy hành vi thật | Không lỗi 500; kết quả không trả về toàn bộ đơn (ký tự wildcard của LIKE phải được escape). Ghi lại hành vi thật |
| `18_4_010_012` | Lọc khoảng thời gian có ngày kết thúc trước ngày bắt đầu | Chờ chạy để lấy hành vi thật | Bị chặn ở bộ chọn ngày hoặc trả rỗng. Ghi lại hành vi thật |
| `18_4_020_006` | Xuất excel khi danh sách rỗng | Chờ chạy để lấy hành vi thật | Không lỗi kỹ thuật. Ghi lại hành vi thật: có sinh file rỗng hay báo không có dữ liệu |
| `18_4_040_003` | Chặn ghi nhận thêm tiền vượt số còn nợ | Thiếu nguyên văn thông báo | Bị chặn. Ghi lại nguyên văn thông báo hiện lên |
| `18_4_040_004` | Bỏ trống số tiền khi ghi nhận thêm | Thiếu nguyên văn thông báo | Bị chặn. Ghi lại nguyên văn thông báo |
| `18_4_050_002` | Chọn kiểu in qua mũi tên cạnh nút In nhiệt | Thiếu nguyên văn thông báo | Hiện danh sách kiểu in để chọn. Ghi lại nguyên văn các lựa chọn |
| `18_4_100_001` | Vai bưu điện xã không xem được đơn của điểm bán | Chờ chạy để lấy hành vi thật | Không thấy đơn của điểm bán khác cấp. Ghi lại hành vi thật: bị chặn vào màn hay vào được nhưng danh sách rỗng |

### `26_phieu_thu` — 7 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `26_080_001` | Bỏ trống số tiền khi lập phiếu thu | Thiếu nguyên văn thông báo | Bị chặn, không lập phiếu. Ghi lại nguyên văn thông báo |
| `26_080_002` | Lập phiếu thu với số tiền bằng 0 | Thiếu nguyên văn thông báo | Bị chặn, không lập phiếu. Ghi lại nguyên văn thông báo |
| `26_080_003` | Lập phiếu thu với số tiền âm | Chờ chạy để lấy hành vi thật | Ô không nhận giá trị âm, hoặc bị chặn khi lưu. Ghi lại hành vi thật |
| `26_080_004` | Bỏ trống danh mục khi lập phiếu thu | Thiếu nguyên văn thông báo | Bị chặn, không lập phiếu. Ghi lại nguyên văn thông báo |
| `26_080_006` | Chọn Chuyển khoản mà không chọn tài khoản nhận | Thiếu nguyên văn thông báo | Bị chặn, không lập phiếu. Ghi lại nguyên văn thông báo |
| `26_090_002` | Danh sách phiếu thu rỗng | Thiếu nguyên văn thông báo | Hiện trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `26_090_004` | Tìm phiếu thu bằng ký tự đặc biệt | Chờ chạy để lấy hành vi thật | Không lỗi 500; không trả về toàn bộ phiếu. Ghi lại hành vi thật |

### `34_cong_no_khach_hang` — 7 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `34_050_004` | Tìm theo tên khách không có công nợ hoặc không tồn tại | Thiếu nguyên văn thông báo | Bảng về trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `34_050_011` | Tìm công nợ bằng ký tự đặc biệt | Chờ chạy để lấy hành vi thật | Không lỗi 500; không trả về toàn bộ dữ liệu công nợ. Ghi lại hành vi thật |
| `34_050_012` | Tìm công nợ theo tên khách không dấu | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: có tìm ra khách tên có dấu hay không |
| `34_060_001` | Danh sách công nợ rỗng | Thiếu nguyên văn thông báo | Hiện trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `34_060_005` | Chọn khoảng thời gian có ngày kết thúc trước ngày bắt đầu | Chờ chạy để lấy hành vi thật | Bị chặn ở bộ chọn ngày hoặc trả rỗng. Ghi lại hành vi thật |
| `34_060_007` | Thu hồi nợ với số tiền bằng 0 | Thiếu nguyên văn thông báo | Bị chặn. Ghi lại nguyên văn thông báo |
| `34_060_008` | Thu hồi nợ vượt số tiền còn nợ | Thiếu nguyên văn thông báo | Bị chặn. Ghi lại nguyên văn thông báo |

### `18_5_doi_tra_hang` — 6 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `18_5_150_001` | Phí trả hàng nhận giá trị âm | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: ô có nhận số âm không, và tiền hoàn có bị cộng thêm không |
| `18_5_150_002` | Phí trả hàng lớn hơn tiền hoàn | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: bị chặn, hay tiền hoàn về 0, hay thành số âm |
| `18_5_150_003` | Số lượng trả bằng 0 | Thiếu nguyên văn thông báo | Bị chặn, không tạo phiếu trả. Ghi lại nguyên văn thông báo |
| `18_5_160_002` | Danh sách đơn hoàn trả rỗng | Thiếu nguyên văn thông báo | Bảng về trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `18_5_160_004` | Tìm kiếm đơn hoàn trả bằng ký tự đặc biệt | Chờ chạy để lấy hành vi thật | Không lỗi 500; không trả về toàn bộ đơn. Ghi lại hành vi thật |
| `18_5_PQ_002` | Vai bưu điện xã không xem được đơn hoàn trả của điểm bán | Chờ chạy để lấy hành vi thật | Không thấy đơn hoàn trả của điểm bán khác cấp. Ghi lại hành vi thật |

### `33_lich_su_thao_tac_nguoi_dung` — 6 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `33_020_003` | Ô lọc Nhóm nghiệp vụ có đủ 15 giá trị | Thiếu nguyên văn thông báo | Danh sách có đúng 15 nhóm nghiệp vụ theo HDSD. Ghi lại nguyên văn nếu code khác |
| `33_020_004` | Ô lọc Hành động có đủ 9 giá trị | Thiếu nguyên văn thông báo | Danh sách có đúng 9 hành động theo HDSD. Ghi lại nguyên văn nếu code khác |
| `33_020_008` | Tìm người thao tác bằng ký tự đặc biệt | Chờ chạy để lấy hành vi thật | Không lỗi 500; không trả về toàn bộ bản ghi. Ghi lại hành vi thật |
| `33_020_009` | Tìm người thao tác không dấu | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: có tìm ra người tên có dấu hay không |
| `33_020_010` | Lọc khoảng ngày có Đến ngày trước Từ ngày | Chờ chạy để lấy hành vi thật | Bị chặn ở bộ chọn ngày hoặc trả rỗng. Ghi lại hành vi thật |
| `33_060_001` | Danh sách lịch sử rỗng khi kỳ không có thao tác | Thiếu nguyên văn thông báo | Hiện trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |

### `35-gia-von-mac-dinh` — 5 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `GVMD-126` | Chặn chuyển kho khi tồn bằng 0 | Thiếu nguyên văn thông báo | Hệ thống cảnh báo không đủ tồn kho, không tạo phiếu. Ghi lại nguyên văn thông báo |
| `GVMD-127` | Chặn chuyển kho khi tồn âm | Thiếu nguyên văn thông báo | Hệ thống chặn thao tác chuyển kho. Ghi lại nguyên văn thông báo |
| `GVMD-129` | Chặn xuất kho khi tồn bằng 0 | Thiếu nguyên văn thông báo | Hệ thống cảnh báo không đủ tồn kho. Ghi lại nguyên văn thông báo |
| `GVMD-132` | Chặn kiểm kho giảm khi tồn bằng 0 | Thiếu nguyên văn thông báo | Hệ thống chặn điều chỉnh giảm. Ghi lại nguyên văn thông báo |
| `GVMD-133` | Chặn kiểm kho giảm khi tồn âm | Thiếu nguyên văn thông báo | Hệ thống chặn điều chỉnh giảm tồn. Ghi lại nguyên văn thông báo |

### `04_5_quan_ly_ton_kho` — 4 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `04_5_020_012` | Kiểm kho với kho vật lý | Chờ user quyết | 🔴 Sheet QC ghi kỳ vọng là *"Check lại"* — **không phải kỳ vọng**, là ghi chú của người viết. Viết theo nghiệp vụ: kiểm kho áp được cho kho vật lý và tồn của đúng kho đó đổi theo s… |
| `04_5_020_013` | Xuất kho với kho vật lý | Chờ user quyết | 🔴 Kỳ vọng gốc là *"Check lại"*. Viết theo nghiệp vụ: tồn của đúng kho vật lý đó giảm, kho khác không đổi; giá vốn lấy theo lô của chính kho đó. Cần user xác nhận. |
| `04_5_020_014` | Nhập kho với kho vật lý | Chờ user quyết | 🔴 Kỳ vọng gốc là *"Check lại"*. Viết theo nghiệp vụ: tồn của đúng kho đó tăng; kho khác không đổi. Cần user xác nhận. |
| `04_5_020_015` | Chuyển kho giữa các kho trong CÙNG một đơn vị | Chờ user quyết | 🔴 Kỳ vọng gốc là *"Check lại"*. Viết theo nghiệp vụ: tồn A giảm, tồn B tăng đúng số lượng; **KHÔNG phát sinh công nợ** (cùng một đơn vị, không phải giao dịch giữa hai pháp nhân). … |

### `27_doi_soat_hoa_don` — 4 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `27_070_006` | Tải ảnh vượt giới hạn số lượng ở tab đối soát phiếu PO | Thiếu nguyên văn thông báo | Chỉ ghi nhận 9 ảnh và 1 file xml; phần vượt bị bỏ. Ghi lại nguyên văn thông báo nếu có |
| `27_070_008` | Danh sách phiếu đối soát rỗng | Thiếu nguyên văn thông báo | Hiện trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `27_071_001` | Tìm phiếu bằng ký tự đặc biệt | Chờ chạy để lấy hành vi thật | Không lỗi 500; không trả về toàn bộ phiếu. Ghi lại hành vi thật |
| `27_071_004` | Tải lên tệp sai định dạng thay cho XML | Thiếu nguyên văn thông báo | Bị chặn, không thực hiện đối soát. Ghi lại nguyên văn thông báo |

### `30_bao_cao_ctkm` — 4 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `30_050_001` | Danh sách báo cáo rỗng khi kỳ không có chương trình | Thiếu nguyên văn thông báo | Hiện trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `30_050_004` | Chọn khoảng thời gian có ngày kết thúc trước ngày bắt đầu | Chờ chạy để lấy hành vi thật | Bị chặn ở bộ chọn ngày hoặc trả rỗng. Ghi lại hành vi thật |
| `30_050_005` | Tìm chương trình bằng ký tự đặc biệt | Chờ chạy để lấy hành vi thật | Không lỗi 500; không trả về toàn bộ chương trình. Ghi lại hành vi thật |
| `30_050_006` | Tìm chương trình không dấu | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: có tìm ra chương trình tên có dấu hay không |

### `01_quan_ly_diem_ban` — 3 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `01_010_019` | Tìm kiếm bằng từ khoá toàn khoảng trắng | Chờ chạy để lấy hành vi thật | Hệ thống KHÔNG báo lỗi đỏ; bảng trả về như khi bỏ trống từ khoá (keyword bị coi là rỗng) HOẶC trả trạng thái rỗng "Không có dữ liệu". 🔴 Ghi lại hành vi thật: FE không trim keyword… |
| `01_010_022` | Tìm kiếm bằng từ khoá KHÔNG DẤU | Chờ chạy để lấy hành vi thật | 🔴 Ghi lại hành vi thật: nếu backend có chuẩn hoá dấu thì phải trả về điểm bán đó; nếu không thì trả rỗng. Kỳ vọng chốt sau khi đo — 🚫 không đoán, vì dữ liệu VNPost trộn Anh–Việt. |
| `01_080_006` | Xuất Excel khi danh sách đang rỗng | Chờ chạy để lấy hành vi thật | 🔴 Ghi lại hành vi thật: hệ thống nên chặn kèm thông báo "Không có dữ liệu để xuất" thay vì sinh file chỉ có dòng tiêu đề. Kỳ vọng chốt sau khi đo. |

### `14_1_lap_va_duyet_phieu_xuat_tra` — 3 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `14_1_010_007` | Tra mã phiếu nhập viết thường vẫn tìm được | Chờ chạy để lấy hành vi thật · Điều kiện chưa xác định | Nạp đúng phiếu như khi gõ chữ hoa. Nếu không nạp được thì ghi nhận là lỗ hổng: mã phiếu phân biệt hoa thường |
| `14_1_010_025` | SL trả thập phân theo đơn vị quy đổi | Chờ chạy để lấy hành vi thật | Hệ thống quy về đơn vị chính rồi so với SL khả dụng. Ghi lại giá trị thực tế hệ thống chấp nhận để đối chiếu với đặc tả |
| `14_1_030_005` | Tìm theo một phần mã phiếu | Chờ chạy để lấy hành vi thật | Bảng trả về mọi phiếu có mã chứa chuỗi đó; nếu trả rỗng thì ghi nhận hệ thống chỉ khớp chính xác |

### `14_3_hoa_don_hang_tra_lai` — 3 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `14_3_040_015` | Hoá đơn phát hành xong không thu hồi được | Chờ chốt với QC | 🔴 Không có chức năng nào thu hồi. Hộp xác nhận đã nói rõ trước khi bấm. Case này để chốt lại với QC |
| `14_3_040_017` | Dòng diễn giải bỏ trống | Chờ chạy để lấy hành vi thật | 🔴 HDSD khai trường này **Bắt buộc = Có** nhưng FE 🚫 không thấy rule required nào. Ghi lại hành vi thật: phát hành được hay bị chặn — xem mục lỗ hổng |
| `14_3_040_018` | Dòng diễn giải toàn khoảng trắng | Chờ chạy để lấy hành vi thật · Điều kiện chưa xác định | Ghi lại hành vi thật: hệ thống có trim và coi là rỗng không. 🔴 Nếu phát hành được thì hoá đơn ra ngoài cơ quan thuế với dòng diễn giải rỗng |

### `17_quan_ly_quay_thu_ngan` — 2 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `17_050_013` | Chuyển quỹ vượt số dư | Chưa đo được | 🔴 CHƯA CHỐT ĐƯỢC: HDSD 050 🚫 không ghi thông báo khi chuyển quá số dư, và `ShopFundService` 🚫 không ném PodException nào. Chạy để lấy hành vi thật — nếu KHÔNG bị chặn thì đây là… |
| `17_050_014` | Chuyển quỹ về chính nó | Chờ chạy để lấy hành vi thật · Điều kiện chưa xác định | Ghi lại hành vi thật. 🔴 Nếu cho phép thì sinh hai dòng lịch sử quỹ vô nghĩa và số dư không đổi |

### `02_quan_ly_nhan_vien` — 1 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `02_020_026` | Thêm nhân viên trùng cả đơn vị và vai trò | Thiếu nguyên văn thông báo | Bị chặn, không tạo được. 🔴 Modal này KHÔNG có kiểm trùng ở FE (khác drawer Gắn nhân viên của phân hệ 01 vốn cảnh báo ngay tại chỗ) ⇒ thông báo phải đến từ backend. Ghi lại nguyên … |

### `03a_quan_ly_ca_lich_lam_viec` — 1 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `03a_030_008` | Chọn nhân viên cụ thể nhưng bỏ trống danh sách | Chờ chạy để lấy hành vi thật | 🔴 Phơi hành vi thật: ô `autoCheckinEmployeeIds` KHÔNG có rule `required` trong code ⇒ có thể lưu cấu hình "tự động chấm công cho nhân viên cụ thể" mà danh sách rỗng, tức bật mà kh… |

### `04_1_canh_bao_ton_kho` — 1 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `04_1_020_020` | Nhập chữ vào ô Min / Max — phơi hành vi thật | Chờ chạy để lấy hành vi thật | 🔴 Sheet QC `FUNC_1_208` đòi "hiển thị mặc định về số 0". Thực tế ô là `InputNumber min={0}` của antd: ký tự không phải số **bị bỏ qua khi gõ**, ô giữ giá trị cũ hoặc thành rỗng (n… |

### `04_2_ton_kho_dau_ky` — 1 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `04_2_020_014` | Mã lô đã tồn tại | Chưa rõ | 🔴 Sheet QC `FUNC_1_109` chỉ ghi kỳ vọng dở dang là "Hiển thị Mã lô đã tồn tại:" — chưa rõ là CHẶN hay CỘNG DỒN vào lô đó. Cần đo rồi user chốt: mã lô là khoá của lô hàng, cộng dồn… |

### `04_3_nhap_xuat_chuyen_kho` — 1 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `04_3_050_008` | Sửa phiếu nhập của lô ĐÃ phát sinh xuất | Chưa rõ | 🔴 Kỳ vọng chưa chốt, giống `04_3_020_010`: chưa rõ có chặn giảm dưới số đã xuất, và giá vốn của các phiếu xuất đã phát sinh có được tính lại hay không. Phải đo rồi user chốt. |

### `14_2_gom_tach_va_xu_ly_hang_tra` — 1 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `14_2_010_017` | Gom xong không tách ngược về phiếu cũ được | Chờ chốt với QC | 🔴 Không có chức năng nào hoàn tác việc gom. Phiếu nguồn khép ở "Đã gom phiếu" vĩnh viễn — đây là hành vi đúng theo HDSD, case này để chốt lại với QC |

### `16_hang_ky_gui` — 1 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `16_040_019` | 🔴 Chưa xác định được ngưỡng dung sai khi kiểm tổng | Chưa đo được · Chờ chạy để lấy hành vi thật | 🔴 CHƯA ĐO ĐƯỢC — HDSD 040 🚫 không nêu dung sai và chưa trace ra hằng số tương ứng trong `ConsignmentInvoiceService.kiemTong`. Ghi lại hành vi thật rồi bổ sung. Đối chiếu: phân hệ… |

### `20_khach_hang_than_thiet` — 1 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `20_010_028` | Tìm nhóm khách hàng bằng chữ thường và không dấu | Điều kiện chưa xác định | Ghi nhận hành vi thật: ô tìm kiếm gửi keyword lên API (filterOption=false, params.keyword) nên kết quả do backend quyết. Nếu không ra nhóm thì đây là giới hạn tìm kiếm cần báo, khô… |

### `24_cong_no_nhan_vien` — 1 case

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `24_050_005` | Cấp tỉnh chọn điểm bán ở thẻ Công nợ với cửa hàng | Chờ user quyết | 🔴 Danh sách KHÔNG đổi: EmployeeDebtController.list đặt resolvedShopId = null khi orgUnitType là BUU_DIEN_TINH hoặc BUU_DIEN_XA, rồi lọc theo org_province_code / org_ward_code ⇒ ô … |
