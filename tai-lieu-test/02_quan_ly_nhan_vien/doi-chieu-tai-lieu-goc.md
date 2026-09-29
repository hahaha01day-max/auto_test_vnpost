# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 02 — Quản lý nhân viên

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 02_quan_ly_nhan_vien`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `02_quan_ly_nhan_vien`
- Tài liệu gốc liên quan: [`uat_vnpost_nhan_vien.csv`](../test-case-goc/uat_vnpost_nhan_vien.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **26** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **26** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 72 |
| — **tài liệu gốc KHÔNG có** | 47 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 47 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `02_010_005` | Hàng mở rộng hiển thị Vai trò · Chi nhánh làm việc · Trạng thái làm việc | Quét kỹ thuật 3.4 #7 — trace pages/employee/index.jsx |
| `02_010_007` | Tìm kiếm theo SỐ ĐIỆN THOẠI | Quét kỹ thuật 3.4 #8 — trace pages/employee/index.jsx |
| `02_010_015` | Tìm kiếm chỉ chạy khi nhấn Enter | Quét kỹ thuật 3.4 #8 — trace pages/employee/index.jsx |
| `02_010_016` | Lọc theo chi nhánh làm việc | Quét kỹ thuật 3.4 #7 — trace pages/employee/index.jsx |
| `02_010_017` | Ô lọc Vai trò bị vô hiệu khi chưa chọn chi nhánh | Quét kỹ thuật 3.4 #7 — trace pages/employee/index.jsx |
| `02_010_018` | Lọc Trạng thái tài khoản = Khóa | Quét kỹ thuật 3.4 #7 — trace pages/employee/index.jsx |
| `02_010_019` | Lọc Trạng thái làm việc = Đã nghỉ | Quét kỹ thuật 3.4 #7 — trace pages/employee/index.jsx |
| `02_010_020` | Lọc kết hợp chi nhánh + vai trò + trạng thái làm việc | Quét kỹ thuật 3.4 #7 — trace pages/employee/index.jsx |
| `02_010_021` | Xoá toàn bộ bộ lọc trở về danh sách đầy đủ | Quét kỹ thuật 3.4 #7 — trace pages/employee/index.jsx |
| `02_010_022` | Phân trang: đổi trang và dòng tổng kết | Quét kỹ thuật 3.4 #7 — trace pages/employee/index.jsx |
| `02_010_023` | Không có ô đổi số dòng mỗi trang | Quét kỹ thuật 3.4 #7 — trace pages/employee/index.jsx |
| `02_010_024` | Đổi bộ lọc khi đang ở trang 3 thì nhảy về trang 1 | Quét kỹ thuật 3.4 #7 — trace pages/employee/index.jsx |
| `02_010_025` | Trang cuối hiển thị đúng số bản ghi còn lại | Quét kỹ thuật 3.4 #7 — trace pages/employee/index.jsx |
| `02_010_026` | Trạng thái rỗng khi bộ lọc không ra kết quả | Quét kỹ thuật 3.4 #7 — trace pages/employee/index.jsx |
| `02_010_027` | Vai không có quyền view_all_employee không thấy nút Xuất Excel | Quét kỹ thuật 3.4 #10 — trace pages/employee/index.jsx |
| `02_010_028` | Vai không có quyền create_employee không thấy Thêm mới / Nhập từ excel / Chức danh | Quét kỹ thuật 3.4 #10 — trace pages/employee/index.jsx |
| `02_010_029` | Phạm vi dữ liệu theo vai: cấp tỉnh chỉ thấy nhân viên thuộc tỉnh mình | Quét kỹ thuật 3.4 #10 — trace pages/employee/index.jsx |
| `02_020_003` | Thêm trùng mã nhân viên | HDSD 020 |
| `02_020_004` | Nhập sai định dạng số điện thoại | HDSD 020 |
| `02_020_006` | Bỏ trống toàn bộ ô KHÔNG bắt buộc vẫn lưu được | Quét kỹ thuật 3.4 #1 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_007` | Bỏ trống Mã nhân viên | Quét kỹ thuật 3.4 #1 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_008` | Bỏ trống Tên đăng nhập | Quét kỹ thuật 3.4 #1 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_009` | Tên đăng nhập ngắn hơn 6 ký tự | Quét kỹ thuật 3.4 #3 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_010` | Tên đăng nhập chứa ký tự không cho phép | Quét kỹ thuật 3.4 #4 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_011` | Tên đăng nhập chứa khoảng trắng | Quét kỹ thuật 3.4 #2 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_012` | Tên đăng nhập tại biên 50 và vượt 50 ký tự | Quét kỹ thuật 3.4 #3 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_013` | Bỏ trống Tên nhân viên | Quét kỹ thuật 3.4 #1 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_014` | Mã nhân viên nhập toàn khoảng trắng | Quét kỹ thuật 3.4 #2 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_015` | Chi nhánh trả lương chọn rồi xoá vẫn lưu được | Quét kỹ thuật 3.4 #1 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_016` | Bỏ trống Số điện thoại | Quét kỹ thuật 3.4 #1 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_017` | Xoá hết dòng vai trò rồi Lưu | Quét kỹ thuật 3.4 #1 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_018` | Dòng vai trò: bỏ trống Đơn vị | Quét kỹ thuật 3.4 #1 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_019` | Dòng vai trò: bỏ trống Vai trò | Quét kỹ thuật 3.4 #1 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_020` | Dòng vai trò: bỏ trống Trạng thái | Quét kỹ thuật 3.4 #1 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_021` | Ô Vai trò và Trạng thái bị vô hiệu khi chưa chọn Đơn vị | Quét kỹ thuật 3.4 #4 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_022` | Đổi Đơn vị thì Vai trò của dòng đó bị xoá | Quét kỹ thuật 3.4 #4 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_026` | Thêm nhân viên trùng cả đơn vị và vai trò | Quét kỹ thuật 3.4 #5 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_027` | Số điện thoại đúng đầu số nhưng sai độ dài | Quét kỹ thuật 3.4 #3 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_028` | Tên nhân viên nhập toàn khoảng trắng | Quét kỹ thuật 3.4 #2 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_029` | Đóng modal giữa chừng thì không lưu gì | Quét kỹ thuật 3.4 #9 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_030` | Sau khi thêm thành công thì tổng nhân viên tăng 1 và tìm được ngay | Quét kỹ thuật 3.4 #11 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_020_031` | Tên đăng nhập không sửa được ở chế độ Sửa | Quét kỹ thuật 3.4 #6 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_030_004` | Sửa: xoá trắng Tên nhân viên thì bị chặn | Quét kỹ thuật 3.4 #1 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_030_005` | Không xoá được dòng vai trò đã lưu trước đó | Quét kỹ thuật 3.4 #6 — trace pages/employee/addOrEditEmployeeModal/index.jsx |
| `02_030_007` | Điều chuyển: bỏ trống Đơn vị chuyển đến | Quét kỹ thuật 3.4 #1 — trace employeeWorkingBranch/TransferEmployeeDrawer.jsx |
| `02_030_008` | Điều chuyển: bỏ trống Vai trò mới | Quét kỹ thuật 3.4 #1 — trace employeeWorkingBranch/TransferEmployeeDrawer.jsx |
| `02_040_001` | Mở chi tiết nhân viên bằng cách bấm tên trong danh sách | Quét kỹ thuật 3.4 #7 — trace pages/employee/index.jsx |

## 5. Bảng đối chiếu đầy đủ 26 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `FUNC_NHANVIEN__1` | Kiểm tra hiển thị màn hình Quản lý nhân viên | `02_010_001` |
| `FUNC_NHANVIEN__2` | Kiểm tra giao diện chung | `02_010_002` |
| `FUNC_NHANVIEN__3` | Kiểm tra tiêu đề cột trong bảng | `02_010_003` |
| `FUNC_NHANVIEN__4` | Kiểm tra dữ liệu hiển thị trong bảng | `02_010_004` |
| `FUNC_NHANVIEN__5` | Kiểm tra tìm kiếm với từ khóa hợp lệ | `02_010_006` |
| `FUNC_NHANVIEN__6` | Kiểm tra tìm kiếm với từ khóa không tồn tại | `02_010_008` |
| `FUNC_NHANVIEN__7` | Kiểm tra tìm kiếm với ký tự đặc biệt | `02_010_009` |
| `FUNC_NHANVIEN__8` | Kiểm tra tìm kiếm với từ khóa có khoảng trắng | `02_010_010` |
| `FUNC_NHANVIEN__9` | Kiểm tra tìm kiếm với phân biệt chữ hoa và chữ thường, không dấu | `02_010_011` |
| `FUNC_NHANVIEN__10` | Kiểm tra tìm kiếm khi để trống ô tìm kiếm | `02_010_012` |
| `FUNC_NHANVIEN__11` | Kiểm tra nhập khoảng trắng liên tiếp vào ô tìm kiếm | `02_010_013` |
| `FUNC_NHANVIEN__12` | Kiểm tra trạng thái làm việc | `02_010_014` |
| `FUNC_NHANVIEN__13` | Kiểm tra khi mở màn Thêm nhân viên | `02_020_005` |
| `FUNC_NHANVIEN__14` | Kiểm tra khi thêm nhân viên thành công với đầy đủ thông tin bắt buộc | `02_020_001` |
| `FUNC_NHANVIEN__15` | Kiểm tra thêm nhân viên nhập đầy đủ tất cả các trường (bao gồm bắt buộc + tùy chọn) | `02_020_001` |
| `FUNC_NHANVIEN__16` | Kiểm tra thêm nhân viên thiếu trường bắt buộc | `02_020_002` |
| `FUNC_NHANVIEN__17` | Kiểm tra thêm nhân viên bị trùng số điện thoại | `02_020_023` |
| `FUNC_NHANVIEN__18` | Kiểm tra thêm nhân viên làm việc ở nhiều chi nhánh & nhiều vai trò khác nhau | `02_020_024` |
| `FUNC_NHANVIEN__19` | Kiểm tra thêm nhân viên làm việc trùng chi nhánh & khác vai trò | `02_020_025` |
| `FUNC_NHANVIEN__20` | Kiểm tra khi mở màn chỉnh sửa thông tin | `02_030_001` |
| `FUNC_NHANVIEN__21` | Kiểm tra khi sửa tên nhân viên thành công | `02_030_002` |
| `FUNC_NHANVIEN__22` | Kiểm tra khi sửa trạng thái "Đang làm" sang "Đã nghỉ" | `02_030_003` |
| `FUNC_NHANVIEN__23` | Kiểm tra khi điều chuyển nhân viên sang chi nhánh mới | `02_030_006` |
| `FUNC_NHANVIEN__24` | Kiểm tra khi xem chi tiết thông tin cá nhân của nhân viên | `02_040_002` |
| `FUNC_NHANVIEN__25` | Kiểm tra khi xem chi tiết nhân viên - Chi nhánh làm việc của nhân viên | `02_040_003` |
| `FUNC_NHANVIEN__26` | Kiểm tra chi tiết nhân viên - Công nợ của nhân viên | `02_040_004` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026, phiên hoàn thiện tài liệu test case. Phủ 26/26 case gốc._

### 6.1 Bốn case cũ trước đây RỖNG ba cột quan trọng

`02_020_001`–`004` chỉ có tên case, ba cột `Tien dieu kien` · `Buoc kiem thu` · `Ket qua ky vong`
đều trống, tức không phải test case mà chỉ là nhãn. Đã viết lại đầy đủ, **lấy thông báo lỗi nguyên
văn từ chính spec `tests/employee.spec.js` đang chạy được** cộng với rule trong code.

### 6.2 🔴 Sheet QC viết theo BẢN CŨ của màn hình

Bốn chỗ lệch, đã sửa theo code và ghi rõ trong cột `Ket qua ky vong`:

| Sheet QC nói | Code thật |
|---|---|
| Ô tìm kiếm placeholder *"Tên nhân viên"*, 1 dropdown | *"Tìm kiếm theo tên và số điện thoại"* + **4** bộ lọc |
| Bảng chính có cột Vai trò · Chi nhánh làm việc · Trạng thái làm việc | Ba cột đó ở **hàng mở rộng**; bảng chính có thêm cột **Chức danh** |
| Thông báo *"Thêm mới thành công"* / *"Chỉnh sửa nhân viên thành công"* | *"Thêm thành công"* / *"Cập nhật thành công"* |
| Thẻ chi tiết *"Chi nhánh làm việc"* | Thẻ *"Lịch sử làm việc"* |

### 6.3 Hai case gốc có kỳ vọng KHÔNG dùng được — để BLOCKED chờ user

- `FUNC_NHANVIEN__19` → `02_020_025`: tình huống là trùng **đơn vị**, khác vai trò; kỳ vọng lại là
  thông báo chặn *"trùng vai trò trong cùng một đơn vị"*. Drawer Gắn nhân viên ở phân hệ `01` **cho
  phép** đúng trường hợp này (`01_050_009`). Hai phân hệ nói trái nhau về cùng một nghiệp vụ.
- `FUNC_NHANVIEN__22` → `02_030_003`: sheet đòi đổi một phân công sang "Đã nghỉ" thì **toàn bộ** phân
  công cùng chuyển. Code cho đổi từng dòng, không có xử lý lan. 🚫 Không chép kỳ vọng này vào assert.

### 6.4 Bẫy đã trả giá khi trace form Thêm/Sửa

`addOrEditEmployeeModal/index.jsx` dài 1.040 dòng và **phần lớn ô nhập đã bị comment out** bằng
`{/* … */}`. Grep `required: true` ra 9 ô bắt buộc; sau khi bỏ comment chỉ còn **4** ô cộng khối
`roles`. Cửa hàng, Email, Mật khẩu, Số tài khoản, Mã hợp đồng, Lương tháng đều **không còn UI**.
Đã phải xoá 5 case dựng sai. Cách kiểm đúng ghi ở `test-cases.md` mục 2.

### 6.5 Ba màn có nút nhưng không ai phủ

Màn danh sách có 3 nút mà **cả HDSD 02 lẫn sheet QC đều không nhắc**: *Nhập từ excel*, *Xuất Excel*,
*Chức danh*. Chưa dựng case — cần user xác nhận thuộc phân hệ 02 hay tách riêng.
