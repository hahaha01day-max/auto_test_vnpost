# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — Auto test Đơn vị vận tải

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 12-don-vi-van-tai`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `12-don-vi-van-tai`
- Tài liệu gốc liên quan: [`uat_vnpost_quan_ly_kho.csv`](../test-case-goc/uat_vnpost_quan_ly_kho.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **12** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **12** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 108 |
| — **tài liệu gốc KHÔNG có** | 96 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 96 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `Vantai_1` | Kiểm tra truy cập đơn vị vận chuyển role cấp tổng công ty | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_10` | Kiểm tra giao diện màn hình Quản lý đơn vận chuyển | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_11` | Kiểm tra giao diện popup Chi tiết đơn vận chuyển | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_12` | Kiểm tra giao diện popup Thanh toán đơn vận chuyển | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_13` | Kiểm tra chuyển trạng thái vận chuyển từ "Đang chờ" sang "Đang chuyển" | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_14` | Kiểm tra chuyển trạng thái vận chuyển từ "Đang chuyển" sang "Đã giao" | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_15` | Kiểm tra thanh toán đơn vận chuyển toàn bộ số tiền ship | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_16` | Kiểm tra thanh toán nhiều lần cho cùng đơn vận chuyển | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_17` | Kiểm tra không cho thanh toán vượt quá công nợ vận chuyển | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_18` | Kiểm tra số tiền bồi thường không làm thay đổi số tiền đơn vận chuyển | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_19` | Kiểm tra số tiền bồi thường không ảnh hưởng công nợ vận chuyển | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_2` | Kiểm tra truy cập đơn vận chuyển role cấp tổng công ty | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_20` | Kiểm tra số tiền thanh toán chỉ ghi nhận cho phí ship | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_21` | Kiểm tra sinh đơn vận chuyển khi TCT chuyển kho xuống tỉnh | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_22` | Kiểm tra sinh đơn vận chuyển khi tỉnh chuyển kho xuống điểm bán | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_23` | Kiểm tra ghi nhận bồi thường khi điểm nhận xác nhận thiếu hàng | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_24` | Kiểm tra ghi nhận bồi thường khi nhận đủ hàng | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_25` | Kiểm tra lịch sử thanh toán đơn vận chuyển | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_26` | Kiểm tra tìm kiếm đơn vận chuyển theo mã vận đơn | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_27` | Kiểm tra lọc theo trạng thái vận chuyển | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_28` | Kiểm tra lọc theo trạng thái thanh toán | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_29` | Kiểm tra chọn phương thức thanh toán | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_3` | Kiểm tra truy cập nhân viên vận chuyển role cấp tổng công ty | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_30` | Kiểm tra ghi nhận tổng số tiền bồi thường | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_31` | Kiểm tra giao diện | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_32` | Kiểm tra tìm kiếm theo tên/mã | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_33` | Kiểm tra bộ lọc loại | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_34` | Kiểm tra bộ lọc trạng thái hoạt động | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_35` | Kiểm tra xem công nợ đơn vị vận chuyển | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_36` | Kiểm tra phân trang | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_37` | Kiểm tra giao diện | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_38` | Thêm mới đơn vị vận chuyển thành công với Loại = Bên ngoài, Trạng thái = Hoạt động | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_39` | Thêm mới đơn vị vận chuyển thành công với Loại = Bên ngoài, Trạng thái = Ngừng hoạt động | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_4` | Kiểm tra truy cập đơn vị vận chuyển role cấp tỉnh | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_40` | Thêm mới đơn vị vận chuyển thành công với Loại = Nội bộ, Trạng thái = Hoạt động | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_41` | Thêm mới đơn vị vận chuyển thành công với Loại = Nội bộ, Trạng thái = Ngừng hoạt động | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_42` | Không nhập thông tin bắt buộc | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_43` | Thêm đơn vị với Mã đơn vị đã tồn tại | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_44` | Sửa Tên đơn vị vận chuyển | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_45` | Sửa Mã đơn vị vận chuyển hợp lệ | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_46` | Sửa Loại từ Bên ngoài sang Nội bộ | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_47` | Sửa Loại từ Nội bộ sang Bên ngoài | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_48` | Sửa Trạng thái từ Hoạt động sang Ngừng hoạt động | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_49` | Sửa Trạng thái từ Ngừng hoạt động sang Hoạt động | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_5` | Kiểm tra truy cập đơn vận chuyển role cấp tỉnh | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_50` | Sửa dữ liệu rồi click Hủy | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_51` | Kiểm tra hiển thị giao diện màn hình Lịch sử ghi nợ | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_52` | Kiểm tra hiển thị giao diện màn hình Lịch sử thanh toán | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_53` | Kiểm tra hiển thị giao diện màn hình Lịch sử bồi thường | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_54` | Kiểm tra hiển thị giao diện popup Thu hồi bồi thường | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_55` | Kiểm tra hiển thị giao diện popup Thanh toán nợ vận chuyển | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_56` | Không nhập số tiền thanh toán | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_57` | Nhập số tiền thanh toán bằng 0 | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_58` | Nhập số tiền thanh toán âm | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_59` | Nhập số tiền thanh toán lớn hơn nợ hiện tại | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_6` | Kiểm tra truy cập nhân viên vận chuyển role cấp tỉnh | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_60` | Thanh toán nợ thành công | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_61` | Chọn chế độ Thanh toán nợ cũ nhất | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_62` | Chọn chế độ Thanh toán nợ mới nhất | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_63` | Chọn chế độ Thanh toán theo danh sách phiếu | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_64` | Không nhập số tiền thu hồi | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_65` | Nhập số tiền thu hồi bằng 0 | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_66` | Nhập số tiền thu hồi âm | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_67` | Nhập số tiền thu hồi lớn hơn số tiền có thể thu hồi | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_68` | Thu hồi bồi thường thành công | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_69` | Kiểm tra tách biệt nghiệp vụ Thanh toán nợ và Thu hồi bồi thường | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_7` | Kiểm tra truy cập đơn vị vận chuyển role cấp điểm bán/kho | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_70` | Kiểm tra các thao tác trên ở role quản lý tỉnh | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_71` | Kiểm tra giao diện | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_72` | Hiển thị phân trang | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_73` | Chuyển trang | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_74` | Tìm kiếm theo tên | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_75` | Tìm kiếm theo SĐT | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_76` | Tìm kiếm không tồn tại | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_77` | Lọc theo đơn vị vận chuyển | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_78` | Xóa bộ lọc | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_79` | Mở form thêm mới | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_8` | Kiểm tra truy cập đơn vận chuyển role cấp điểm bán/kho | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_80` | Mở form sửa | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_81` | Hiển thị nút xóa | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_82` | Hiển thị popup thêm mới | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_83` | Thêm mới thành công | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_84` | Không nhập thông tin bắt buộc | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_85` | Nhập SĐT sai định dạng | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_86` | Nhập SĐT đã tồn tại | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_87` | Nhập email sai định dạng | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_88` | Nhập chức vụ | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_89` | Đóng popup khi chưa lưu | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_9` | Kiểm tra truy cập nhân viên vận chuyển role cấp điểm bán/kho | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_90` | Chỉnh sửa tên | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_91` | Chỉnh sửa SĐT hợp lệ | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_92` | Chỉnh sửa email hợp lệ | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_93` | Xóa dữ liệu bắt buộc | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_94` | Nhập email sai định dạng | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_95` | Xác nhận xóa | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |
| `Vantai_96` | Hủy xóa | resource/don_vi_van_tai.xlsx (chuyển thể nguyên văn) |

## 5. Bảng đối chiếu đầy đủ 12 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `FUNC_1_169` | Kiểm tra hiển thị drawer | `12-don-vi-van-tai_070_001` |
| `FUNC_1_170` | Kiểm tra bỏ trống các trường bắt buộc | `12-don-vi-van-tai_070_002` |
| `FUNC_1_171` | Kiểm tra nhập đầy đủ thông tin các trường | `12-don-vi-van-tai_070_003` |
| `FUNC_1_172` | Kiểm tra chọn đơn vị vận chuyển | `12-don-vi-van-tai_070_004` |
| `FUNC_1_173` | Kiểm tra chọn nhân viên | `12-don-vi-van-tai_070_005` |
| `FUNC_1_174` | Kiểm tra nhập số tiền âm | `12-don-vi-van-tai_070_006` |
| `FUNC_1_175` | Kiểm tra nhập số tiền bằng 0 | `12-don-vi-van-tai_070_007` |
| `FUNC_1_176` | Kiểm tra nhận kho ghi nhận bồi thường | `12-don-vi-van-tai_070_008` |
| `FUNC_1_177` | Kiểm tra chỉnh sửa số tiền ghi nợ | `12-don-vi-van-tai_070_009` |
| `FUNC_1_178` | Kiểm tra chuyển trạng thái của đơn vận chuyển | `12-don-vi-van-tai_070_012` |
| `FUNC_1_179` | Kiểm tra ghi nợ lần 2 | `12-don-vi-van-tai_070_010` |
| `FUNC_1_180` | Kiểm tra kho chuyển thiếu, cộng lại tồn kho chuyển | `12-don-vi-van-tai_070_011` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026. Phủ 12/12 case gốc sheet QC; dựng lại toàn bộ từ `don_vi_van_tai.xlsx`: 58 → 109 case._

### 6.1 🔴 Đã DỰNG LẠI TỪ ĐẦU — bản cũ lấy kỳ vọng từ assertion của script

Mục 7 của bàn giao đã đánh dấu: *"CSV sinh ngược từ spec, kỳ vọng đang lấy từ assertion của script.
Phải chép lại từ `resource/don_vi_van_tai.xlsx` mới có giá trị."*

Xác nhận: cả 58 dòng cũ đều có kỳ vọng là *"Theo assertion trong spec. 🔴 CHUA DOI CHIEU..."* và bước
là *"Da co script — cac buoc nam trong tests/..."*. Không dòng nào là đặc tả.

⇒ Đã đọc trực tiếp file xlsx (96 case) và chuyển thể **nguyên văn** bốn cột *Tình huống · Điều kiện
cần có · Các bước thực hiện · Kết quả mong muốn*. 🚫 **Không** dùng hai cột *Kết quả thực tế* và
*Kết quả (Pass/Fail)* — đó là bằng chứng thi hành, chép vào là đóng băng lỗi đang có.

### 6.2 🔴 Việc quan trọng nhất còn lại: đối chiếu 58 script với kỳ vọng mới

Script được viết theo tài liệu cũ, mà tài liệu cũ lại sinh ra từ chính script. Vòng lặp này nghĩa là
**script có thể đang assert sai mà cả hai bên đều "khớp"**. Nay đã có đặc tả thật ⇒ phải rà lại từng
spec. 🚫 Đừng coi 58 case "đã có script" là đã xong.

### 6.3 File nguồn là sheet QC thứ 20, nằm ngoài `test-case-goc/`

`don_vi_van_tai.xlsx` có cấu trúc **giống 19 sheet QC**: tự khai *"Tổng các tình huống kiểm thử: 96"*
ở dòng 3, header ở dòng 10, đủ cột *Ứng dụng/màn hình*, *Ưu tiên*, *Kết quả thực tế*, *Pass/Fail*.
Nhưng nó ở `resource/` nên `doi-chieu-goc.js` **không đọc** ⇒ 96 case này không nằm trong tổng 1.607.

Cần user quyết: chuyển vào `test-case-goc/` (để công cụ đếm và theo dõi độ phủ) hay giữ nguyên chỗ cũ.

### 6.4 Nhóm `FUNC_1_169`–`180` nối trực tiếp sang phân hệ `04_3`

Đây là drawer **tạo đơn vận chuyển từ phiếu chuyển kho**. Hai case đáng chú ý:

- `FUNC_1_176`: nhận kho ghi nhận **bồi thường**, số tiền mặc định = số tiền **giao thiếu**.
- `FUNC_1_180`: kho chuyển thiếu ⇒ **CỘNG LẠI tồn kho chuyển**. 🔴 Hàng chuyển thiếu không được biến
  mất — đây là chốt chặn chống thất thoát, cùng loại với `04_3_070_005` (thiếu phiếu IMPORT gây tồn âm).

### 6.5 🔴 Mã case phải GIỮ NGUYÊN `Vantai_N`

Phân hệ này dùng **mã gốc xlsx làm mã case**, khác quy ước chung. Trong phiên này đã thử đổi sang
`12-vt_<task>_<STT>` cho gọn và **lập tức mất liên kết 71 spec** (checklist nhảy sang 71 "mồ côi",
số script tụt từ 73 xuống 2). Đã hoàn lại ngay.

⇒ Với phân hệ đã có nhiều script, **đổi mã case là thao tác phá hoại**. 🚫 Đừng đổi để cho "đúng quy
ước". Chỉ nhóm `070` (sheet QC, chưa có script) dùng mã `12-vt_070_*`.

### 6.6 Dọn 56 khoá rác trong `test-input.json`

File input cũ khoá theo **mã gốc** (`Vantai_10`, `Vantai_37`…) thay vì mã case của phân hệ. Sau khi
dựng lại mã case, 56 khoá đó thành rác. Đã dọn và sinh lại khớp 1-1 với CSV (109 case).
