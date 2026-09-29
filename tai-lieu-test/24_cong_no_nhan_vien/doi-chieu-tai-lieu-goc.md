# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 24 — Công nợ nhân viên

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 24_cong_no_nhan_vien`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `24_cong_no_nhan_vien`
- Tài liệu gốc liên quan: [`uat_vnpost_nhan_vien.csv`](../test-case-goc/uat_vnpost_nhan_vien.csv) · [`uat_vnpost_tai_chinh.csv`](../test-case-goc/uat_vnpost_tai_chinh.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **15** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **15** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 49 |
| — **tài liệu gốc KHÔNG có** | 35 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 35 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `24_010_003` | Tổng công nợ là tổng của toàn bộ danh sách đang lọc | HDSD 010 |
| `24_010_004` | Danh sách sắp sẵn theo số tiền giảm dần | HDSD 010 |
| `24_020_001` | Xuất Excel lấy đúng điều kiện đang hiển thị | HDSD 020 |
| `24_020_002` | Bộ lọc không ra dòng nào vẫn tạo tệp chỉ có tiêu đề | HDSD 020 |
| `24_030_002` | Nhân viên làm ở một điểm bán thì ô cửa hàng không đổi được | HDSD 030 |
| `24_030_003` | Lọc theo trạng thái Còn nợ hoặc Đã thanh toán | HDSD 030 |
| `24_040_001` | Chặn lưu phiếu thu khi chưa nhập số tiền | HDSD 040 |
| `24_040_002` | Số tiền thu từng phiếu không vượt quá Còn nợ | HDSD 040 |
| `24_040_003` | Ghi nhận tiền khách trả và cập nhật trạng thái phiếu | HDSD 040 |
| `24_050_001` | Thẻ Công nợ với cửa hàng hiện đủ chỉ tiêu | HDSD 050 |
| `24_050_003` | Hai thẻ công nợ là hai loại tiền khác nhau | HDSD 050 |
| `24_060_001` | Ba thẻ số liệu là số cộng dồn không giới hạn thời gian | HDSD 060 |
| `24_060_003` | Ba thẻ lịch sử tách bạch nhau | HDSD 060 |
| `24_070_001` | Hệ thống tự chia tiền ưu tiên khoản ghi nợ sớm nhất | HDSD 070 |
| `24_070_002` | Ghi nhận nhân viên nộp tiền trả nợ | HDSD 070 |
| `24_PQ_001` | Giao dịch viên chỉ thấy công nợ trong phạm vi điểm bán | HDSD |
| `24_010_013` | Ô tìm kiếm chỉ gọi API một lần sau khi ngừng gõ | Trace code OrderDebtTab.jsx |
| `24_010_014` | Phân trang danh sách công nợ theo đơn hàng | Kỹ thuật 3.4 mục 7 |
| `24_010_015` | Lọc theo khoảng ngày | Kỹ thuật 3.4 mục 3 |
| `24_010_016` | Cấp tỉnh chưa chọn điểm bán | Trace code OrderDebtTab.jsx:50-52 |
| `24_010_017` | Đổi điểm bán khi đang ở trang 3 | Trace code OrderDebtTab.jsx:106 |
| `24_010_018` | Quyền của nút Xuất Excel | Trace code OrderDebtTab.jsx PermissionButton |
| `24_050_004` | Tìm nhân viên ở thẻ Công nợ với cửa hàng | Trace code ShopDebtTab.jsx |
| `24_050_005` | Cấp tỉnh chọn điểm bán ở thẻ Công nợ với cửa hàng | Trace code EmployeeDebtController.java:57-80 |
| `24_050_006` | Lọc trạng thái Tất cả tương đương không lọc | Trace code EmployeeDebtServiceImpl |
| `24_050_008` | Phân trang thẻ Công nợ với cửa hàng | Kỹ thuật 3.4 mục 7 |
| `24_070_003` | Bỏ trống tổng số tiền khi nhân viên nộp tiền | Trace code DrawerPayEmployeeDebt.jsx:95 |
| `24_070_004` | Nhập số tiền bằng 0 hoặc số âm khi nộp tiền | Kỹ thuật 3.4 mục 3 |
| `24_070_005` | Nộp nhiều hơn tổng nợ còn lại | Kỹ thuật 3.4 mục 3 |
| `24_070_006` | API thanh toán trả lỗi | Trace code DrawerPayEmployeeDebt.jsx:113 |
| `24_070_007` | Đóng form thanh toán giữa chừng | Kỹ thuật 3.4 mục 9 |
| `24_070_008` | Số liệu liên quan cập nhật sau khi nộp tiền | Kỹ thuật 3.4 mục 11 |
| `24_PQ_002` | Cán bộ Bưu điện xã xem công nợ nhân viên | Trace code EmployeeDebtController.java:72-75 |
| `24_PQ_003` | Tổng công ty xem công nợ toàn mạng lưới | Trace code EmployeeDebtController.java:55-60 |
| `24_PQ_004` | Tài khoản thiếu quyền mở màn Công nợ nhân viên | Kỹ thuật 3.4 mục 10 |

## 5. Bảng đối chiếu đầy đủ 15 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `FUNC_NHANVIEN__46` | Kiểm tra hiển thị màn Công nợ nhân viên | `24_010_001` |
| `FUNC_NHANVIEN__47` | Kiểm tra tìm kiếm với từ khóa hợp lệ | `24_010_005` |
| `FUNC_NHANVIEN__48` | Kiểm tra tìm kiếm với từ khóa không tồn tại | `24_010_007` |
| `FUNC_NHANVIEN__49` | Kiểm tra tìm kiếm với ký tự đặc biệt | `24_010_008` |
| `FUNC_NHANVIEN__50` | Kiểm tra tìm kiếm với từ khóa có khoảng trắng | `24_010_009` |
| `FUNC_NHANVIEN__51` | Kiểm tra tìm kiếm với phân biệt chữ hoa và chữ thường, không dấu | `24_010_010` |
| `FUNC_NHANVIEN__52` | Kiểm tra tìm kiếm khi để trống ô tìm kiếm | `24_010_011` |
| `FUNC_NHANVIEN__53` | Kiểm tra nhập khoảng trắng liên tiếp vào ô tìm kiếm | `24_010_012` |
| `FUNC_NHANVIEN__54` | Kiểm tra xem chi tiết công nợ nhân viên thành công | `24_030_001` |
| `TaiChinh_34` | Kiểm tra giao diện | `24_010_001` |
| `TaiChinh_35` | Kiểm tra tìm kiếm tên nhân viên | `24_010_005` |
| `TaiChinh_36` | Kiểm tra tìm kiếm bằng số điện thoại nhân viên | `24_010_006` |
| `TaiChinh_37` | Kiểm tra bộ lọc chọn điểm bán/kho | `24_010_002` |
| `TaiChinh_38` | Kiểm tra bộ lọc trạng thái thanh toán | `24_050_002`, `24_050_007` |
| `TaiChinh_39` | Kiểm tra khi nợ bồi thường khi kiểm kho thiếu | `24_060_002` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_(Viết vào đây. Phần từ dòng `<!-- NHAN-XET-TAY -->` trở xuống KHÔNG bị ghi đè khi sinh lại.)_

## 6. Nhận xét thủ công — 19/09/2026

Đã phủ hết 15 case gốc. Ba kỳ vọng của sheet QC **viết lại theo hành vi thật của code**, kèm ghi chú
mâu thuẫn ngay trong ô kỳ vọng — 🚫 không chép nguyên:

- `FUNC_NHANVIEN__51` đòi *"tìm kiếm không phân biệt chữ hoa chữ thường"* và kèm "không dấu".
  Truy vấn `e.name LIKE CONCAT('%', :keyword, '%')` (`EmployeeDebtHistoryDao.java:41`) không chuẩn hoá
  dấu ⇒ hoa/thường thì khớp (collation `_ci`), **không dấu thì ra bảng rỗng**.
- `FUNC_NHANVIEN__49` đòi ký tự đặc biệt cho *"bảng trống"*. `%` và `_` không được escape trước khi
  nối vào `LIKE` nên gõ `%` có thể trả **toàn bộ** danh sách.
- `FUNC_NHANVIEN__50` nói *"tự động loại bỏ khoảng trắng thừa"*. Code chỉ `trim()` hai đầu; khoảng
  trắng **giữa hai từ** giữ nguyên.

`TaiChinh_35` và `TaiChinh_36` (tìm theo tên · theo SĐT) tách thành hai case `24_010_005` và
`24_010_006` vì ô tìm kiếm gửi cùng một tham số `keyword` nhưng backend dò hai cột khác nhau
(`e.name` và `e.phone` qua `StringUtil.formatPhoneFilter`) — gộp một case thì không biết cột nào hỏng.
