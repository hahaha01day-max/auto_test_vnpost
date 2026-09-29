# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 03b — Ca làm việc của nhân viên

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 03b_ca_lam_viec_nhan_vien`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `03b_ca_lam_viec_nhan_vien`
- Tài liệu gốc liên quan: [`uat_vnpost_ban_hang.csv`](../test-case-goc/uat_vnpost_ban_hang.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **23** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **23** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 48 |
| — **tài liệu gốc KHÔNG có** | 31 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 31 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `03b_010_003` | Đang có ca mở thì ẩn nút Mở ca của mọi ca còn lại | HDSD 010 |
| `03b_010_004` | Ngày không có ca thì báo đúng thông điệp | HDSD 010 |
| `03b_010_005` | Thẻ ca hiện đủ bốn ô thông tin | Quét kỹ thuật 3.4 #7 — trace features/timekeeping/components/TodayShiftCard.jsx |
| `03b_010_006` | Ba nhãn trạng thái của ca và màu tương ứng | Quét kỹ thuật 3.4 #6 — trace features/timekeeping/components/TodayShiftCard.jsx |
| `03b_010_007` | Nhãn "Phiên đang tạm chốt" khi ca mới tạm chốt | Quét kỹ thuật 3.4 #6 — trace features/timekeeping/components/TodayShiftCard.jsx |
| `03b_010_008` | Nút chính đổi theo trạng thái phiên bán hàng | Quét kỹ thuật 3.4 #6 — trace features/timekeeping/components/TodayShiftCard.jsx |
| `03b_010_009` | Ca thiếu cấu hình giờ chấm công thì KHÔNG bị chặn | Quét kỹ thuật 3.4 #6 — trace features/timekeeping/components/TodayShiftCard.jsx |
| `03b_020_002` | Chặn chấm công về khi chưa chấm công đến | HDSD 020 |
| `03b_020_003` | Chặn chấm công đến lần thứ hai trong cùng một ca | HDSD 020 |
| `03b_020_004` | Ngoài khoảng giờ cho phép thì không thấy nút chấm công | HDSD 020 |
| `03b_020_006` | Sau khi chấm công đến, nút và trạng thái đổi đúng | Quét kỹ thuật 3.4 #6 — trace features/timekeeping/components/TodayShiftCard.jsx |
| `03b_020_007` | Khoảng cho phép chấm công tính theo cấu hình của ca | Quét kỹ thuật 3.4 #3 — trace features/timekeeping/components/TodayShiftCard.jsx |
| `03b_030_002` | Tổng tiền mặt thực tế tự cộng theo số tờ | HDSD 030 |
| `03b_030_004` | Bỏ trống Quầy thu ngân khi mở ca | Quét kỹ thuật 3.4 #1 — trace features/timekeeping/pages/WorkShiftPage.jsx |
| `03b_030_005` | Ô số lượng tờ theo mệnh giá: bỏ trống và giá trị không hợp lệ | Quét kỹ thuật 3.4 #4 — trace features/timekeeping/pages/WorkShiftPage.jsx |
| `03b_030_006` | Quầy đang có ca chưa chốt của người khác thì không mở được | Quét kỹ thuật 3.4 #6 — trace features/timekeeping/pages/WorkShiftPage.jsx |
| `03b_030_007` | Chính mình còn ca chưa chốt thì hệ thống tự chốt ca cũ rồi mở ca mới | Quét kỹ thuật 3.4 #6 — trace features/timekeeping/pages/WorkShiftPage.jsx |
| `03b_030_008` | Đóng drawer Mở ca giữa chừng thì không mở ca | Quét kỹ thuật 3.4 #9 — trace features/timekeeping/pages/WorkShiftPage.jsx |
| `03b_040_002` | Chênh lệch bằng 0 hiển thị màu xanh | HDSD 040 |
| `03b_040_003` | Bắt buộc nhập Lý do chênh lệch khi lệch khác 0 | HDSD 040 |
| `03b_040_005` | Sau khi tạm chốt mới hiện ba số đối soát | Quét kỹ thuật 3.4 #11 — trace features/timekeeping/pages/WorkShiftPage.jsx |
| `03b_040_006` | Nhãn ô ghi chú đổi theo tình trạng lệch quỹ | Quét kỹ thuật 3.4 #6 — trace features/timekeeping/pages/WorkShiftPage.jsx |
| `03b_040_007` | Dòng Xử lý chênh lệch xuất hiện khi lệch quỹ | Quét kỹ thuật 3.4 #6 — trace features/timekeeping/pages/WorkShiftPage.jsx |
| `03b_040_008` | Chênh lệch khác 0 hiển thị màu đỏ | Quét kỹ thuật 3.4 #6 — trace features/timekeeping/pages/WorkShiftPage.jsx |
| `03b_040_011` | Mở lại ca đã chốt | Quét kỹ thuật 3.4 #6 — trace features/timekeeping/pages/WorkShiftPage.jsx |
| `03b_040_012` | Bấm chốt ca hai lần liên tiếp không tạo hai lần chốt | Quét kỹ thuật 3.4 #11 — trace features/timekeeping/pages/WorkShiftPage.jsx |
| `03b_050_002` | Ca chưa chốt không có phần doanh thu theo hình thức thanh toán | HDSD 050 |
| `03b_050_004` | Ngày chỉ có một ca thì không hiện nút Xem báo cáo | HDSD 050 |
| `03b_060_003` | 🔴 Tài khoản trong danh sách bỏ qua KHÔNG bị chặn | Quét kỹ thuật 3.4 #10 — trace routes/helpers.js (checkOrderCreateAccessLoader) |
| `03b_060_004` | Vai không thuộc cấp điểm bán không bị chặn ca | Quét kỹ thuật 3.4 #10 — trace routes/helpers.js (checkOrderCreateAccessLoader) |
| `03b_PQ_001` | Nhân viên chỉ thấy ca của chính mình | HDSD |

## 5. Bảng đối chiếu đầy đủ 23 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `dong13` | Kiểm tra hiển thị thông tin ca làm việc hôm nay | `03b_010_001` |
| `dong14` | Kiểm tra trạng thái ca làm việc | `03b_010_001` |
| `dong15` | Kiểm tra trạng thái hiển thị của các nút chức năng theo trạng thái ca | `03b_010_002` |
| `dong16` | Kiểm tra chặn bán hàng khi tài khoản chưa được gán ca làm việc | `03b_060_001` |
| `dong17` | Kiểm tra chặn bán hàng khi chưa thực hiện nghiệp vụ mở ca | `03b_060_002` |
| `dong18` | Kiểm tra nghiệp vụ Mở ca và Khai báo Tiền đầu ca khi không nhập tiền lẻ đầu ca | `03b_030_001` |
| `dong19` | Kiểm tra nghiệp vụ Mở ca và Khai báo Tiền đầu ca khi nhập tiền lẻ đầu ca | `03b_030_001` |
| `dong20` | Kiểm tra cập nhật giờ đến | `03b_020_001` |
| `dong21` | Kiểm tra chặn mở ca mới khi đang có ca chưa chốt | `03b_030_003` |
| `dong22` | Kiểm tra báo cáo Tổng đơn hàng trong ca | `03b_050_001` |
| `dong23` | Kiểm tra báo cáo Tổng doanh thu trong ca | `03b_050_001` |
| `dong24` | Kiểm tra báo cáo Tiền khách nợ trong ca | `03b_050_001` |
| `dong25` | Kiểm tra báo cáo Tiền hoàn trả trong ca | `03b_050_001` |
| `dong26` | Kiểm tra chặn kết ca khi chưa đến giờ hết ca quy định | `03b_040_009` |
| `dong27` | Kiểm tra nghiệp vụ chốt ca khi không nhập số tiền lẻ cuối ca | `03b_040_001` |
| `dong28` | Kiểm tra nghiệp vụ chốt ca khi nhập số tiền lẻ cuối ca | `03b_040_001` |
| `dong29` | Kiểm tra nghiệp vụ "Chốt ca mù" | `03b_040_004` |
| `dong30` | Kiểm tra cập nhật giờ về | `03b_020_005` |
| `dong31` | Kiểm tra nghiệp vụ in chốt ca | `03b_040_010` |
| `dong32` | Kiểm tra xem báo cáo của các ca khác nhau trong ngày | `03b_050_003` |
| `dong33` | Kiểm tra đồng bộ báo cáo ca khi chuyển đổi tài khoản/nhân viên | `03b_050_005` |
| `dong34` | Kiểm tra chế độ Offline Mode khi cửa hàng mất kết nối mạng | `03b_070_001` |
| `dong35` | Kiểm tra tự động đồng bộ dữ liệu sau khi có mạng trở lại | `03b_070_002` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026, phiên hoàn thiện tài liệu test case. Phủ 23/23 case gốc, 19 → 48 case._

### 6.1 🔴 Hardcode 8 số điện thoại bỏ qua phép chặn ca — bẫy PASS GIẢ

`routes/helpers.js` (`checkOrderCreateAccessLoader`) có danh sách `bypassPhones` gồm **8 số điện
thoại** được **bỏ qua toàn bộ** phép chặn "phải mở ca mới bán hàng được".

⚠️ Nếu SĐT của tài khoản test nằm trong danh sách đó thì `03b_060_001` và `03b_060_002` **pass giả** —
không thấy hộp thoại vì được bỏ qua, chứ không phải vì logic đúng. **Việc đầu tiên khi làm nhóm
`03b_060_*` là đối chiếu SĐT trong `.env.accounts` với danh sách trong code.**

### 6.2 Hai case gốc `dong16` và `dong17` dùng CHUNG một thông báo

Sheet đòi `dong16` báo *"Tài khoản chưa được xếp lịch làm việc"*. Code hiện **cùng một** hộp thoại
*"Yêu cầu mở ca trước khi bán hàng"* / *"Bạn cần mở ca làm việc trước khi thực hiện thao tác bán
hàng."* cho cả hai tình huống (không có ca nào, và có ca nhưng chưa mở).

⇒ Người chưa được xếp lịch bị bảo "hãy mở ca", mà họ **không có ca nào để mở**. Đã viết kỳ vọng theo
code và ghi rõ chỗ lệch trong cột kỳ vọng; 🚫 không chép câu của sheet.

### 6.3 `dong26` — sheet đòi chặn, code không có phép kiểm

Sheet: *"chặn kết ca khi chưa đến giờ hết ca quy định"*. Đọc `TodayShiftCard.jsx`: nút **Chốt ca**
chỉ phụ thuộc `isShiftStarted`, **không có ràng buộc giờ**, khác hẳn nút Chấm công và nút Mở ca vốn
bị `canTimekeep` chặn. `03b_040_009` để ĐO, `BLOCKED` chờ user quyết.

### 6.4 `dong29` "Chốt ca mù" — code LÀM ĐÚNG, đây là điểm sáng

Drawer chốt ca chia hai bước: trước khi tạm chốt chỉ có ô tự đếm tiền theo mệnh giá, **không hiện
Tiền dự kiến**; ba số đối soát (dự kiến / thực tế / chênh lệch) chỉ xuất hiện sau `isDraftClosed`.
Đúng yêu cầu "tuyệt đối không hiển thị số tiền lý thuyết" của sheet. Đã dựng `03b_040_004` để giữ
hành vi này khỏi bị làm hỏng về sau.

### 6.5 `dong34` `dong35` (offline) KHÔNG đo được trên web — không phải bỏ sót

`vnpost-web` không xử lý `navigator.onLine`, không có chế độ offline; grep cả FE chỉ thấy
`buildOfflineDraftOrderRequest` (dựng payload) chứ không có cơ chế chuyển chế độ. Nghiệp vụ này thuộc
**máy bán hàng / app POS**. Hai case vẫn giữ trong bộ, `enabled:false`, lý do ghi rõ — 🚫 không xoá,
vì đó là nghiệp vụ thật cần người test tay.

Chỗ duy nhất nhìn thấy hệ quả trên web là cảnh báo *"Đã tính lại nhưng đơn offline chưa về đủ
(n/N)"* ở `03a_060_006`.

### 6.6 Nối nửa còn lại của ba case cấu hình chấm công ở 03a

`FUNC_NHANVIEN__42` `__44` `__45` (phân hệ `03a`) có kỳ vọng hai phần; phần *"hệ thống ghi nhận đúng
giờ / đúng nhân viên"* phải quan sát ở **màn này** (ô Giờ đến / Giờ về trên thẻ ca). 🔴 Chưa dựng case
riêng vì phải **đổi cấu hình chấm công của cả điểm bán** (case ghi ở 03a) rồi mới đo được ở 03b — cần
user cấp một điểm bán dựng riêng. Đã ghi ở `test-cases.md` mục 9.

### 6.7 Vì sao 35/48 case `BLOCKED` — và vì sao đó KHÔNG phải làm tắt

Mọi case của phân hệ này cần **một trạng thái ca cụ thể tại thời điểm chạy**: chưa xếp ca · đã xếp
chưa mở · đang mở · tạm chốt · đã chốt · thiếu cấu hình giờ. Trạng thái đó chỉ dựng được bằng cách
**mở ca và chốt ca thật**, tức ghi quỹ tiền mặt và sinh phiếu chênh lệch. 🚫 Theo đúng luật của skill,
đã KHÔNG hạ kỳ vọng xuống "màn hình không báo lỗi" để lấy case chạy được.
