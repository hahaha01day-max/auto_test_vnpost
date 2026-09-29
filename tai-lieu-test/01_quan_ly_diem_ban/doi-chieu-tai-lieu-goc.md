# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 01 — Quản lý điểm bán

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 01_quan_ly_diem_ban`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `01_quan_ly_diem_ban`
- Tài liệu gốc liên quan: [`uat_vnpost_quan_ly_diem_ban_hub.csv`](../test-case-goc/uat_vnpost_quan_ly_diem_ban_hub.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **54** |
| — trong đó **trùng lặp** trong chính sheet gốc | 4 |
| **Case gốc đã dựng** | **50** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 134 |
| — **tài liệu gốc KHÔNG có** | 84 |

**Độ phủ tài liệu gốc: 93%**

## 2. 🔴 Case trùng lặp trong sheet gốc — 🚫 KHÔNG dựng thêm

So **toàn bộ** nội dung (tình huống, điều kiện, các bước, kết quả mong muốn), giống nhau từng ký tự.
Dựng thêm là chạy hai lần cùng một thao tác, làm độ phủ ảo và nhân đôi rủi ro ghi dữ liệu.

| Giữ lại | Bản trùng | Tình huống |
|---|---|---|
| `DIEMBAN__30` | `DIEMBAN__34` | Xóa điểm bán - click 'Đồng ý' chuyển trạng thái sang Ngừng hoạt động |
| `DIEMBAN__31` | `DIEMBAN__35` | Hủy xóa điểm bán - click 'Hủy' tại popup, trạng thái không đổi |
| `DIEMBAN__32` | `DIEMBAN__36` | Khôi phục điểm bán Ngừng hoạt động - click 'Khôi phục' tại Chi tiết |
| `DIEMBAN__33` | `DIEMBAN__37` | Điểm bán sau khi xóa không còn hiển thị khi lọc Trạng thái = Đang hoạt động |

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 84 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `01_010_012` | Đổi số dòng mỗi trang bằng ô chọn cạnh thanh phân trang | HDSD 010 — "ô chọn bên cạnh cho phép tăng số dòng mỗi trang" |
| `01_010_013` | Bộ lọc Bưu điện xã/phường chỉ liệt kê xã thuộc tỉnh đã chọn | HDSD 010 — Mẹo: "chỉ liệt kê các xã thuộc tỉnh bạn đã chọn" |
| `01_010_014` | Vai Bưu điện Tỉnh chỉ thấy điểm bán thuộc tỉnh mình | HDSD 010 — Lưu ý phạm vi: "người dùng cấp tỉnh chỉ thấy điểm bán thuộc tỉnh mình" |
| `01_010_015` | Danh sách hiển thị điểm bán ở MỌI trạng thái, kể cả tạm ngừng | HDSD 010 — Lưu ý: "màn hình này hiển thị điểm bán ở mọi trạng thái" |
| `01_010_016` | Cột Hành động chỉ hiện biểu tượng ứng với quyền của người dùng | HDSD 010 — bảng cột: "Chỉ hiện biểu tượng ứng với quyền bạn có" |
| `01_010_017` | Dòng Hub có biểu tượng Gắn nhân viên mờ và bấm không được | HDSD 010 + 050 — "hub không gắn nhân viên" |
| `01_010_018` | Liên kết Xem danh sách ở cột Số lượng nhân viên mở thẳng danh sách nhân viên | HDSD 010 — Mẹo: "bấm Xem danh sách ngay ở cột Số lượng nhân viên" |
| `01_010_019` | Tìm kiếm bằng từ khoá toàn khoảng trắng | Quét kỹ thuật 3.4 #2 — trace code ShopManagement.jsx |
| `01_010_020` | Tìm kiếm bằng ký tự đặc biệt | Quét kỹ thuật 3.4 #8 — trace code ShopManagement.jsx |
| `01_010_021` | Tìm kiếm không phân biệt hoa/thường | Quét kỹ thuật 3.4 #8 — trace code ShopManagement.jsx |
| `01_010_022` | Tìm kiếm bằng từ khoá KHÔNG DẤU | Quét kỹ thuật 3.4 #8 — trace code ShopManagement.jsx |
| `01_010_023` | Khoảng trắng đầu/cuối của từ khoá | Quét kỹ thuật 3.4 #2 — trace code ShopManagement.jsx |
| `01_010_024` | Xoá toàn bộ bộ lọc trả về danh sách đầy đủ | Quét kỹ thuật 3.4 #7 — trace code ShopManagement.jsx |
| `01_010_025` | Ô lọc Bưu điện phường/xã bị vô hiệu khi chưa chọn Bưu điện tỉnh | Quét kỹ thuật 3.4 #7 — trace code ShopManagement.jsx |
| `01_010_026` | Đổi bộ lọc khi đang ở trang 3 thì nhảy về trang 1 | Quét kỹ thuật 3.4 #7 — trace code ShopManagement.jsx |
| `01_010_027` | Trang cuối hiển thị đúng số bản ghi còn lại | Quét kỹ thuật 3.4 #7 — trace code ShopManagement.jsx |
| `01_010_028` | Vai không có quyền create_shop không thấy nút "+ Thêm điểm bán" | Quét kỹ thuật 3.4 #10 — trace code ShopManagement.jsx |
| `01_020_012` | Cấp chỉ chọn được từ cấp của người dùng trở xuống | HDSD 020 bước 3 — "chỉ chọn được từ cấp của mình trở xuống" |
| `01_020_013` | Phân loại phụ thuộc Cấp — chọn cấp Tỉnh thì chỉ còn Hub | HDSD 020 bước 4 + bảng cấp↔phân loại |
| `01_020_014` | Mã điểm bán trùng với điểm bán đã có thì bị chặn | HDSD 020 bước 5 — "Mã và tên không được trùng" |
| `01_020_015` | Chọn phân loại Hub thì không có trường Loại hình điểm bán | HDSD 020 bước 6 — "Chọn Hub thì không có trường này" |
| `01_020_016` | Chưa chọn Cấp thì form không hiện ô nhập nào | Quét kỹ thuật 3.4 #1 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_017` | Bỏ trống Mã điểm bán | Quét kỹ thuật 3.4 #1 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_018` | Bỏ trống Loại hình điểm bán | Quét kỹ thuật 3.4 #1 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_019` | Bỏ trống Bưu điện xã/phường | Quét kỹ thuật 3.4 #1 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_020` | Bỏ trống Email | Quét kỹ thuật 3.4 #1 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_021` | Bỏ trống Số điện thoại | Quét kỹ thuật 3.4 #1 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_022` | Bấm Xác nhận khi bỏ trống TẤT CẢ ô bắt buộc | Quét kỹ thuật 3.4 #1 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_023` | Tên điểm bán nhập toàn khoảng trắng | Quét kỹ thuật 3.4 #2 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_024` | Mã điểm bán nhập toàn khoảng trắng | Quét kỹ thuật 3.4 #2 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_025` | Mã điểm bán tại biên 50 ký tự và vượt 50 | Quét kỹ thuật 3.4 #3 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_026` | Email sai định dạng | Quét kỹ thuật 3.4 #4 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_027` | Số điện thoại sai định dạng | Quét kỹ thuật 3.4 #4 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_028` | SĐT người quản lý: bỏ trống được, nhưng sai định dạng thì bị chặn | Quét kỹ thuật 3.4 #1 — trace code  + #4 — chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_029` | Vĩ độ ngoài khoảng cho phép | Quét kỹ thuật 3.4 #3 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_030` | Kinh độ ngoài khoảng cho phép | Quét kỹ thuật 3.4 #3 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_031` | Vĩ độ / Kinh độ nhập chữ | Quét kỹ thuật 3.4 #4 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_032` | Mã điểm bán trùng nhưng khác hoa/thường | Quét kỹ thuật 3.4 #5 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_033` | Tên điểm bán trùng với điểm bán đã có | Quét kỹ thuật 3.4 #5 — trace code  — HDSD 020 vs chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_034` | Đổi Tỉnh/TP thì ô Xã/Phường bị xoá giá trị cũ | Quét kỹ thuật 3.4 #4 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_035` | Bấm Hủy giữa chừng thì không tạo bản ghi | Quét kỹ thuật 3.4 #9 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_036` | Đóng drawer bằng X rồi mở lại thì form trắng | Quét kỹ thuật 3.4 #9 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_037` | Sau khi tạo thành công thì tổng bản ghi tăng 1 và tìm được ngay | Quét kỹ thuật 3.4 #11 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_020_038` | Bỏ trống Tỉnh/TP và Xã/Phường (địa chỉ hành chính) vẫn tạo được | Quét kỹ thuật 3.4 #1 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_030_006` | Phân loại và Mã điểm bán hiển thị mờ, không sửa được | HDSD 030 — Lưu ý: "hiển thị mờ và không sửa được" |
| `01_030_007` | Form Sửa không có ô Cấp và Phân loại bị vô hiệu | Quét kỹ thuật 3.4 #6 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_030_008` | Sửa: xoá trắng Email thì bị chặn | Quét kỹ thuật 3.4 #1 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_030_009` | Sửa: Số điện thoại sai định dạng thì bị chặn | Quét kỹ thuật 3.4 #4 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_030_010` | Sửa: xoá trắng Loại hình điểm bán thì bị chặn | Quét kỹ thuật 3.4 #1 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_030_011` | Sửa xong danh sách tự cập nhật, không cần tải lại trang | Quét kỹ thuật 3.4 #11 — trace code chain/pages/shopManagement/components/DrawerCreateShop.jsx |
| `01_040_007` | Tạm ngừng điểm bán bằng ô Trạng thái trên màn Sửa | HDSD 040 bước 2–4 — luồng chuẩn nằm ở màn Sửa |
| `01_040_008` | Khôi phục hoạt động bằng ô Trạng thái trên màn Sửa | HDSD 040 bước 3 |
| `01_040_009` | Bảng trạng thái × hành động: điểm bán Ngừng hoạt động còn làm được gì | Quét kỹ thuật 3.4 #6 — trace code ShopManagement.jsx |
| `01_040_010` | Sau khi tạm ngừng thì thấy bản ghi ở bộ lọc Ngừng hoạt động | Quét kỹ thuật 3.4 #11 — trace code ShopManagement.jsx |
| `01_050_006` | Bỏ trống ô Trạng thái trên dòng phân công mới thì bị chặn | HDSD 050 — Lưu ý: "cả ba ô trên mỗi dòng đều bắt buộc" |
| `01_050_007` | Cột Số lượng nhân viên tăng đúng sau khi gắn nhân viên | HDSD 050 — Kết quả: "Số lượng nhân viên tăng lên tương ứng" |
| `01_050_008` | Gán trùng vai trò cho cùng một nhân viên bị chặn tại chỗ | Quét kỹ thuật 3.4 #5 — trace code chain/pages/shopManagement/components/DrawerAssignEmployee.jsx |
| `01_050_009` | Một nhân viên được gán nhiều vai trò KHÁC nhau trong cùng điểm bán | Quét kỹ thuật 3.4 #5 — trace code chain/pages/shopManagement/components/DrawerAssignEmployee.jsx |
| `01_050_010` | Phân trang danh sách phân công trong drawer Gắn nhân viên | Quét kỹ thuật 3.4 #7 — trace code chain/pages/shopManagement/components/DrawerAssignEmployee.jsx |
| `01_060_002` | Cho nhân viên thôi việc bằng cách đổi trạng thái sang Đã nghỉ | HDSD 060 bước 4–5 + Kết quả |
| `01_060_003` | Dòng phân công đã lưu trước đó không xoá hẳn được | HDSD 060 — cảnh báo đầu bài: "chỉ xoá hẳn khi dòng vừa được thêm trong cùng phiên" |
| `01_060_004` | Nút X của dòng phân công đã lưu ở trạng thái vô hiệu | Quét kỹ thuật 3.4 #6 — trace code chain/pages/shopManagement/components/DrawerAssignEmployee.jsx |
| `01_070_009` | Bật Dừng lại khi có lỗi — dừng ở dòng lỗi đầu tiên | HDSD 070 bước 5 |
| `01_070_010` | Tắt Dừng lại khi có lỗi — bỏ qua dòng lỗi và nhập tiếp | HDSD 070 bước 5 |
| `01_070_011` | Tải file lỗi từ thẻ Lịch sử nhập | HDSD 070 — Mẹo: "mở thẻ Lịch sử nhập, tải file lỗi về" |
| `01_070_012` | Đóng màn hình khi đang nhập thì việc nhập vẫn chạy ngầm | HDSD 070 — Lưu ý: "đóng màn hình này không làm dừng việc nhập" |
| `01_070_013` | Lọc Lịch sử nhập kết hợp khoảng thời gian và Trạng thái | Quét kỹ thuật 3.4 #7 — trace code shopApi.js GET /import/api/v1/shops/history |
| `01_070_014` | Lịch sử nhập ở trạng thái rỗng | Quét kỹ thuật 3.4 #7 — trace code shopApi.js GET /import/api/v1/shops/history |
| `01_080_004` | Bấm Cập nhật trạng thái khi file chưa sẵn sàng | HDSD 080 bước 5 |
| `01_080_005` | Tải xuống file đã tạo từ cột Hành động | HDSD 080 bước 6 |
| `01_080_006` | Xuất Excel khi danh sách đang rỗng | Quét kỹ thuật 3.4 #7 — trace code ShopManagement.jsx |
| `01_090_001` | Mở wizard Thiết lập điểm bán từ cột Hành động | Quét kỹ thuật 3.4 #6 — trace code chain/pages/shopManagement/components/DrawerShopSetup.jsx |
| `01_090_002` | Cảnh báo thiếu ca làm việc / quầy thu ngân khi mở wizard | Quét kỹ thuật 3.4 #6 — trace code chain/pages/shopManagement/components/DrawerShopSetup.jsx |
| `01_090_003` | Bước Tồn kho đầu kỳ chỉ nhận file .xlsx / .xls | Quét kỹ thuật 3.4 #4 — trace code chain/pages/shopManagement/components/DrawerShopSetup.jsx |
| `01_090_004` | Bước Tồn kho đầu kỳ: file có dòng lỗi thì báo đúng số dòng hợp lệ / lỗi | Quét kỹ thuật 3.4 #11 — trace code chain/pages/shopManagement/components/DrawerShopSetup.jsx |
| `01_090_005` | Bước Xếp lịch bị khoá khi điểm bán chưa có nhân viên | Quét kỹ thuật 3.4 #6 — trace code chain/pages/shopManagement/components/DrawerShopSetup.jsx |
| `01_090_006` | Bước Xếp lịch khi mọi nhân viên của điểm bán đều Đã nghỉ | Quét kỹ thuật 3.4 #6 — trace code chain/pages/shopManagement/components/DrawerShopSetup.jsx |
| `01_090_007` | Bước Xếp lịch khi điểm bán chưa có ca làm việc | Quét kỹ thuật 3.4 #6 — trace code chain/pages/shopManagement/components/DrawerShopSetup.jsx |
| `01_090_008` | Bước Xếp lịch khi mọi nhân viên đã có lịch | Quét kỹ thuật 3.4 #6 — trace code chain/pages/shopManagement/components/DrawerShopSetup.jsx |
| `01_090_009` | Bước Xếp lịch: bỏ trống từng ô bắt buộc khi Áp dụng chung | Quét kỹ thuật 3.4 #1 — trace code chain/pages/shopManagement/components/DrawerShopSetup.jsx |
| `01_090_010` | Bước Xếp lịch: khai ca riêng cho từng nhân viên | Quét kỹ thuật 3.4 #1 — trace code chain/pages/shopManagement/components/DrawerShopSetup.jsx |
| `01_090_011` | Nhân viên đã có lịch không xuất hiện trong danh sách xếp lịch | Quét kỹ thuật 3.4 #6 — trace code chain/pages/shopManagement/components/DrawerShopSetup.jsx |
| `01_090_012` | Gán thêm nhân viên từ bước Nhân viên thì wizard tự sang bước Xếp lịch | Quét kỹ thuật 3.4 #11 — trace code chain/pages/shopManagement/components/DrawerShopSetup.jsx |
| `01_090_013` | Hoàn tất wizard hiện màn kết quả | Quét kỹ thuật 3.4 #6 — trace code chain/pages/shopManagement/components/DrawerShopSetup.jsx |

## 5. Bảng đối chiếu đầy đủ 54 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `DIEMBAN__1` | Danh sách hiển thị đầy đủ các cột đúng giao diện | `01_010_001` |
| `DIEMBAN__2` | Phân trang hoạt động đúng - mặc định 10 bản ghi/trang | `01_010_002` |
| `DIEMBAN__3` | Tìm kiếm theo tên điểm bán - trả về kết quả đúng | `01_010_003` |
| `DIEMBAN__4` | Tìm kiếm theo mã điểm bán - trả về đúng 1 kết quả | `01_010_004` |
| `DIEMBAN__5` | Lọc theo Phân loại - hiển thị đúng loại được chọn | `01_010_005` |
| `DIEMBAN__6` | Lọc theo Trạng thái - chỉ hiển thị bản ghi Ngừng hoạt động | `01_010_006` |
| `DIEMBAN__7` | Lọc theo Bưu điện tỉnh/thành phố | `01_010_007` |
| `DIEMBAN__8` | Lọc kết hợp nhiều điều kiện cùng lúc (Phân loại + Trạng thái) | `01_010_008` |
| `DIEMBAN__9` | Tìm kiếm với từ khóa không tồn tại | `01_010_009` |
| `DIEMBAN__10` | Danh sách hiển thị trạng thái rỗng khi chưa có điểm bán | `01_010_010` |
| `DIEMBAN__11` | Thêm mới Pos mini thành công với đầy đủ trường bắt buộc | `01_020_001` |
| `DIEMBAN__12` | Thêm mới Pos mini kèm Địa chỉ chi tiết (trường tùy chọn) | `01_020_002` |
| `DIEMBAN__13` | Thêm mới Pos plus - form chỉ hiện Tỉnh/TP và Xã/Phường (không có Bưu điện tỉnh/xã) | `01_020_003` |
| `DIEMBAN__14` | Thêm mới Pos plus thành công với đầy đủ trường | `01_020_004` |
| `DIEMBAN__15` | Thêm mới Hub - label đổi thành 'Tên Hub', có đủ Bưu điện tỉnh/xã và Tỉnh/TP | `01_020_005` |
| `DIEMBAN__16` | Thêm mới Hub thành công với đầy đủ trường | `01_020_006` |
| `DIEMBAN__17` | Phân loại mặc định khi mở drawer là Pos mini | `01_020_007` |
| `DIEMBAN__18` | Bỏ trống Tên điểm bán (bắt buộc) khi thêm mới | `01_020_008` |
| `DIEMBAN__19` | Bỏ trống Bưu điện tỉnh/thành phố (bắt buộc với Pos mini) khi thêm mới | `01_020_009` |
| `DIEMBAN__20` | Tên điểm bán vượt quá 200 ký tự (giới hạn theo UI) | `01_020_010` |
| `DIEMBAN__21` | Dropdown Bưu điện xã/phường tự lọc theo Bưu điện tỉnh đã chọn | `01_020_011` |
| `DIEMBAN__22` | Click icon thông tin (ⓘ) mở drawer Chi tiết - hiển thị đúng tất cả trường | `01_010_011` |
| `DIEMBAN__23` | Chi tiết điểm bán Ngừng hoạt động - Trạng thái hiển thị màu đỏ + nút Khôi phục | `01_040_001` |
| `DIEMBAN__24` | Chi tiết điểm bán Đang hoạt động - có nút Xóa (đỏ), không có nút Khôi phục | `01_040_002` |
| `DIEMBAN__25` | Chỉnh sửa Tên điểm bán thành công | `01_030_001` |
| `DIEMBAN__26` | Chỉnh sửa Bưu điện tỉnh/thành phố và Bưu điện xã/phường thành công | `01_030_002` |
| `DIEMBAN__27` | Chỉnh sửa - bỏ trống Tên điểm bán (bắt buộc) | `01_030_003` |
| `DIEMBAN__28` | Chỉnh sửa - bỏ trống Bưu điện tỉnh/thành phố (bắt buộc với Pos mini) | `01_030_004` |
| `DIEMBAN__29` | Đóng drawer Sửa bằng nút X - dữ liệu không bị thay đổi | `01_030_005` |
| `DIEMBAN__30` | Xóa điểm bán - click 'Đồng ý' chuyển trạng thái sang Ngừng hoạt động | `01_040_003` |
| `DIEMBAN__31` | Hủy xóa điểm bán - click 'Hủy' tại popup, trạng thái không đổi | `01_040_004` |
| `DIEMBAN__32` | Khôi phục điểm bán Ngừng hoạt động - click 'Khôi phục' tại Chi tiết | `01_040_005` |
| `DIEMBAN__33` | Điểm bán sau khi xóa không còn hiển thị khi lọc Trạng thái = Đang hoạt động | `01_040_006` |
| `DIEMBAN__34` | Xóa điểm bán - click 'Đồng ý' chuyển trạng thái sang Ngừng hoạt động | — **chưa dựng** |
| `DIEMBAN__35` | Hủy xóa điểm bán - click 'Hủy' tại popup, trạng thái không đổi | — **chưa dựng** |
| `DIEMBAN__36` | Khôi phục điểm bán Ngừng hoạt động - click 'Khôi phục' tại Chi tiết | — **chưa dựng** |
| `DIEMBAN__37` | Điểm bán sau khi xóa không còn hiển thị khi lọc Trạng thái = Đang hoạt động | — **chưa dựng** |
| `DIEMBAN__38` | Gán mới 1 nhân viên với vai trò Cửa hàng trưởng thành công | `01_050_001` |
| `DIEMBAN__39` | Thêm nhiều nhân viên trong 1 lần lưu | `01_050_002` |
| `DIEMBAN__40` | Xóa 1 dòng gán bằng nút X trên dòng | `01_060_001` |
| `DIEMBAN__41` | Xác nhận khi dòng mới bỏ trống Nhân viên (bắt buộc) | `01_050_003` |
| `DIEMBAN__42` | Xác nhận khi dòng mới bỏ trống Vai trò (bắt buộc) | `01_050_004` |
| `DIEMBAN__43` | Hủy thao tác Gán nhân viên - dữ liệu không bị lưu | `01_050_005` |
| `DIEMBAN__44` | Tải về file mẫu thành công | `01_070_001` |
| `DIEMBAN__45` | Upload file Excel hợp lệ - nhập thành công, hiển thị Tổng/Thành công/Thất bại | `01_070_002` |
| `DIEMBAN__46` | Lịch sử nhập hiển thị đúng với file có cả bản ghi lỗi và thành công | `01_070_003` |
| `DIEMBAN__47` | Upload file không phải định dạng Excel (.pdf, .docx, .csv) | `01_070_004` |
| `DIEMBAN__48` | Click 'Xác nhận nhập' khi chưa chọn file | `01_070_005` |
| `DIEMBAN__49` | Lọc Lịch sử nhập theo khoảng thời gian | `01_070_006` |
| `DIEMBAN__50` | Lọc Lịch sử nhập theo Trạng thái | `01_070_007` |
| `DIEMBAN__51` | Upload file Excel rỗng (chỉ có header, không có dữ liệu) | `01_070_008` |
| `DIEMBAN__52` | Xuất Excel toàn bộ danh sách điểm bán thành công | `01_080_001` |
| `DIEMBAN__53` | Xuất Excel áp dụng bộ lọc hiện tại - chỉ xuất dữ liệu đang lọc | `01_080_002` |
| `DIEMBAN__54` | Xuất Excel khi danh sách đang hiển thị kết quả tìm kiếm | `01_080_003` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026, phiên hoàn thiện tài liệu test case._

### 6.1 Sheet `uat_vnpost_mo_hinh_to_chuc.csv` đã KHÔNG còn thuộc phân hệ này

11 case nhóm *"tạo và xem danh sách Điểm bán/Hub"* trước đây bị ánh xạ về `01_quan_ly_diem_ban`.
**Quyết định của user 18/09/2026: đó là luồng riêng** (tạo điểm bán từ màn Mô hình tổ chức) ⇒ đã bỏ
luật nhóm trong `tool/core/goc-mapping.js`, cả sheet về `32_mo_hinh_to_chuc`. Vì thế số case gốc của
phân hệ 01 giảm 65 → **54**, và mục 3 rỗng.

⚠️ Bằng chứng kỹ thuật cần biết khi làm phân hệ `32`: `OrganizationDetail.jsx` mở **đúng component**
`DrawerCreateOrUpdateShop` của màn Quản lý điểm bán, cùng API `POST /shops/profile`. Khác biệt duy
nhất mà sheet nêu — cờ **"Là cửa hàng mẫu"** và dropdown **"Cửa hàng mẫu"** — hiện **đã bị comment
out** trong FE (`DrawerCreateShop.jsx:604`, `DrawerDetailShop.jsx:148-153`), không còn UI. Case gốc
`dong64` và `FUNC_THUMUC__52` vì vậy **không test được** ở bản hiện tại, phải để `BLOCKED` kèm đúng
lý do đó chứ không phải "chưa làm".

### 6.2 Kỳ vọng sai / lệch code trong sheet — 🚫 đã KHÔNG chép nguyên văn

- `DIEMBAN__11`: sheet nói mã điểm bán **tự sinh** dạng `DBxxxxx`. Code bắt người dùng **tự nhập**
  `shopCode` (ô bắt buộc, `maxLength=50`). Case `01_020_001` đang mang câu kỳ vọng cũ theo sheet —
  🔴 **chưa sửa vì cần user chốt** bên nào đúng (xem `test-cases.md` mục 6 số 3).
- `DIEMBAN__49`: kỳ vọng trong sheet là của case gán nhân viên, không phải của case lọc lịch sử nhập.
  Case dựng (`01_070_006`) đã viết lại theo nghiệp vụ đúng.

### 6.3 Ba mươi bốn case ở mục 4 không phải "sheet bỏ sót vô hại"

24 case đến từ HDSD (ràng buộc nghiệp vụ, phân quyền) và **36 case mới từ quét kỹ thuật mục 3.4**
(bỏ trống từng ô bắt buộc, khoảng trắng, biên `maxLength`/toạ độ, sai định dạng email–SĐT, duy nhất
hoa/thường, huỷ giữa chừng, đối chiếu sau khi ghi) cộng **13 case của màn "Thiết lập điểm bán"** —
màn này trước đó **không có case nào**, dù nó ghi tồn kho đầu kỳ và lịch làm việc.

Số case: **74 → 134**.
