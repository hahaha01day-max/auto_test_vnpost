# Kịch bản auto test — 02 Quản lý nhân viên

- Dựng 18/09/2026, skill `test-scenario`. Nguồn: sheet QC `uat_vnpost_quan_ly_nhan_vien.csv` (26 case)
  + trace code FE + quét 11 kỹ thuật mục 3.4.
- **4 → 72 case.** Phủ **26/26** case gốc.
- Script hiện có: 4 case (`tests/employee.spec.js`). 68 case mới **chưa có script**.

## 1. Route và API — trace từ code

| Màn hình | Route / component |
|---|---|
| Danh sách nhân viên | `/employee/list` — `pages/employee/index.jsx` |
| Thêm / Sửa nhân viên | modal `pages/employee/addOrEditEmployeeModal/index.jsx` (dùng chung, phân biệt bằng `isAddNew`) |
| Chi tiết nhân viên | `pages/employee/employeeDetail/index.jsx` — 3 thẻ: Thông tin cá nhân · Lịch sử làm việc · Công nợ nhân viên |
| Điều chuyển nhân viên | drawer `employeeWorkingBranch/TransferEmployeeDrawer.jsx` |
| Nhập Excel · Chức danh | `DrawerImportEmployee.jsx` · `ChainPositionManagementDrawer.jsx` |

| Việc | Method + URL |
|---|---|
| Danh sách | `GET /chain-employment-profile/v1.2/list` |
| Thêm | `POST /chain-employment-profile/v1.2/create` |
| Sửa | `PUT /chain-employment-profile/v1.2/update` |
| Chi tiết | `GET /chain-employment-profile/v1.2/detail` |
| Xoá | `/chain-employment-profile/v1.2/delete` |
| Danh sách vai trò | `GET /auth/role/group` · `GET /shops/profile/get-all-role-group` |

## 2. 🔴 Ô nhập THẬT của modal Thêm/Sửa — phần lớn ô trong file đã bị comment out

Đọc file bằng mắt sẽ đếm ra rất nhiều ô bắt buộc. **Sai.** Sau khi bỏ hết khối `{/* … */}`, modal chỉ
còn lại:

| Ô | `name` | Bắt buộc | Ràng buộc thật |
|---|---|---|---|
| Mã nhân viên | `employeeCode` | ✅ | chỉ `required` — **không trim, không giới hạn độ dài** |
| Tên đăng nhập | `username` | ✅ | `min:6, max:50` · `^[a-zA-Z0-9._-]+$` · validator chặn khoảng trắng · `disabled` khi sửa |
| Tên nhân viên | `name` | ✅ | chỉ `required` — **không trim** |
| Số điện thoại | `phone` | ✅ | `PHONE_PATTERN`; bỏ trống → *"Số điện thoại / email không được để trống!"*, sai định dạng → *"Số điện thoại không hợp lệ"* |
| Vai trò (`Form.List`) | `roles` | ✅ ≥1 dòng | mỗi dòng bắt buộc cả 3 ô: `orgUnitCode` (*"Chọn đơn vị"*) · `roleId` (*"Vui lòng chọn vai trò nhân viên"*) · `status` (*"Chọn trạng thái"*) |
| Căn cước · Ngày bắt đầu · Chi nhánh trả lương · Giới tính · Ngày sinh · Địa chỉ · Chức danh | | — | không ràng buộc |

🚫 **KHÔNG còn các ô sau** (đã comment out, đừng dựng case cho chúng):
Cửa hàng (`shopId`) · Email (`email`) · Mật khẩu · Xác nhận mật khẩu · Số tài khoản (`bankAcc`) ·
Chọn chi nhánh ngân hàng · Mã hợp đồng · Loại hợp đồng · Lương tháng · cụm chọn *"Thêm nhân viên bằng
Số điện thoại / Email"*.

⚠️ Đây là bẫy đã gặp trong phiên này: 5 case đầu tiên dựng cho Cửa hàng / Email / Số tài khoản đã phải
**xoá bỏ** sau khi bỏ comment mới đếm lại. Cách kiểm nhanh:

```bash
node -e 'let s=require("fs").readFileSync("src/pages/employee/addOrEditEmployeeModal/index.jsx","utf8").replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g,"");console.log(/name="email"/.test(s))'
```

## 3. Màn danh sách — cũng khác tài liệu

- Vùng lọc có **5 ô**: tìm kiếm · Chọn chi nhánh làm việc · Chọn vai trò (vô hiệu khi chưa chọn chi
  nhánh) · Trạng thái tài khoản (Khóa/Kích hoạt) · Trạng thái làm việc (Đã nghỉ/Đang làm).
- 🔴 Tìm kiếm **chỉ chạy khi nhấn Enter** (`onPressEnter`), không phải gõ là tìm.
- Bảng chính **6 cột**: STT · Mã nhân viên · Tên nhân viên · Chức danh · Số điện thoại / Email ·
  Trạng thái. Vai trò / Chi nhánh làm việc / Trạng thái làm việc nằm ở **hàng mở rộng**.
- 🔴 **Không có ô đổi số dòng mỗi trang** (`showSizeChanger: false`).
- 🔴 **Phân trang 1-based** (`params.page = 1`), khác quy ước 0-based ở `frontend_core.md`.
- **Không có cột Hành động.** Lối vào chi tiết là liên kết ở cột Tên nhân viên.

## 4. Vai

`tct` mặc định. `province` cho `02_010_027` `02_010_028` (ranh giới quyền) và `02_010_029` (phạm vi
dữ liệu theo cấp).

## 5. Phân loại độ sẵn sàng

| Nhãn | Số case |
|---|--:|
| `READY` | 4 (đã có script) |
| `READY_WITH_CODE_LOOKUP` | 56 |
| `BLOCKED` | 12 |

`BLOCKED` chia ba loại:

1. **Kỳ vọng chưa chốt** — `02_010_011` `02_010_013` `02_010_019` `02_020_014` `02_020_026`
   `02_020_028`: hành vi trim / chuẩn hoá dấu / phạm vi bộ lọc chưa có đặc tả, phải đo trước.
2. **Mâu thuẫn đặc tả chờ user quyết** — `02_020_025` `02_030_003` (xem mục 6).
3. **Thiếu vai hoặc dữ liệu nền** — `02_010_027` `02_010_028` (chưa biết tài khoản nào thiếu quyền
   `view_all_employee` / `create_employee`), `02_030_006`, `02_040_004`.

## 6. Case ghi dữ liệu — 🔴 15 case, chưa ai được phép chạy

`02_020_001` `003` `004` `006` `014` `015` `023` `024` `025` `026` `027` `030` · `02_030_002` `003` `006`

🔴 **Tạo nhân viên ở đây là tạo TÀI KHOẢN ĐĂNG NHẬP thật** (`username` là khoá đăng nhập) **cộng phân
quyền thật vào đơn vị thật**. Nhân viên rác không chỉ bẩn danh sách — nó là một người dùng có quyền
trong hệ thống. `02_030_006` (điều chuyển) còn cắt quyền của nhân viên tại đơn vị cũ.

## 7. Lỗ hổng và mâu thuẫn đặc tả — 🚫 không tự sửa tài liệu

| # | Vấn đề |
|---|---|
| 1 | 🔴 **`FUNC_NHANVIEN__19` vs phân hệ 01.** Sheet đòi chặn *"gán trùng vai trò cho nhân viên trong cùng một đơn vị"* nhưng tình huống mô tả là trùng ĐƠN VỊ **khác** vai trò — mà drawer Gắn nhân viên của phân hệ 01 **cho phép** đúng trường hợp đó. Một trong hai sai. |
| 2 | 🔴 **`FUNC_NHANVIEN__22`**: sheet nói đổi một phân công sang "Đã nghỉ" thì **toàn bộ** đơn vị + vai trò cùng chuyển "Ngừng hoạt động". Code cho đổi trạng thái **theo từng dòng**, không thấy xử lý lan. |
| 3 | **`FUNC_NHANVIEN__2` khai placeholder ô tìm kiếm là "Tên nhân viên" và chỉ 1 dropdown**; code là "Tìm kiếm theo tên và số điện thoại" + 4 bộ lọc. Sheet viết theo bản cũ. |
| 4 | **`FUNC_NHANVIEN__3` khai cột Vai trò / Chi nhánh làm việc / Trạng thái làm việc ở bảng chính**; code đặt chúng ở hàng mở rộng, và bảng chính có thêm cột **Chức danh** mà sheet không nhắc. |
| 5 | **Thông báo lệch với sheet:** code trả *"Thêm thành công"* / *"Cập nhật thành công"*; sheet ghi *"Thêm mới thành công"* / *"Chỉnh sửa nhân viên thành công"*. Đã viết theo code. |
| 6 | **Thẻ chi tiết tên "Lịch sử làm việc"**, sheet gọi "Chi nhánh làm việc". |
| 7 | 🔴 **Không nhất quán về khoảng trắng:** `username` có validator chặn khoảng trắng; `employeeCode` và `name` thì không, dù cả hai là khoá nghiệp vụ / dữ liệu hiển thị. |
| 8 | **Thông báo độ dài tên đăng nhập không nói giới hạn trên.** Rule `min:6, max:50` dùng chung một message *"Độ dài tên đăng nhập từ 6 ký tự"* ⇒ nhập 51 ký tự vẫn báo câu về 6 ký tự. |
| 9 | **Modal "Cập nhật trạng thái"** (`modals/UpdateStatus.jsx`) chỉ có **một** lựa chọn "Đang rảnh" và bỏ qua giá trị chọn khi gọi API — chưa rõ nghiệp vụ, **chưa dựng case**. |
| 10 | **Ô "Chi nhánh trả lương" không bắt buộc** dù nó quyết định đơn vị chịu chi phí lương. |

## 7b. 🔴 Kết quả chạy script — 20/09/2026

Lệnh: `npx playwright test --config tai-lieu-test/02_quan_ly_nhan_vien/playwright.config.js`

| Nhóm | Số case |
|---|--:|
| **Đã chạy và ĐẠT** | **50** |
| **Đã chạy và HỎNG — lỗi sản phẩm, 🚫 không sửa test** | **2** |
| **Chưa chạy** (ghi dữ liệu / chưa chốt kỳ vọng / thiếu vai) | 20 |

Script: `tests/employee-page.js` (helper) + 5 spec — `tra-cuu.tct` · `validate-them-nhan-vien.tct` ·
`them-nhan-vien-ghi.tct` · `sua-nhan-vien.tct` (gồm cả task 040) · `pham-vi.province`.
🔴 Spec cũ `tests/employee.spec.js` **đã xoá**: nó tự đăng nhập bằng URL và tài khoản viết cứng,
không đi qua `moTrang`, và **tạo nhân viên thật** mà không có công tắc `allowMutation`.

### Hai case đỏ — đều là phát hiện về sản phẩm

1. 🔴 **`02_020_027` — kiểm độ dài số điện thoại không có tác dụng.** Nhập `091234567` (9 chữ số) và
   `09123456789` (11 chữ số) đều **qua** validate. Nguyên nhân: `PhoneInput` chuẩn hoá giá trị form về
   **E.164** (`091234567` → `+8491234567`), còn `PHONE_PATTERN` là mẫu quốc tế
   `[+]?[0-9]{3}[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}` nên khớp cả hai. Giá trị hiển thị trên ô cũng bị
   nhóm lại thành `0912 345 67`. ⇒ Số điện thoại sai độ dài lọt xuống backend.
2. 🔴 **`02_010_029` — vai Bưu điện Tỉnh KHÔNG đọc được danh sách nhân viên.**
   `GET /chain-employment-profile/v1.2/list` trả **401** ở mọi lần gọi, trong khi **mọi API khác của
   cùng phiên đều 200** (`shops/profile/chain`, `auth/role/group`, `v1.0/organization-unit/search`…).
   FE 🚫 không báo gì: màn vẫn hiện tiêu đề, bảng rỗng, vùng extra không có nút nào. ⇒ Vừa là lỗ hổng
   phân quyền (401 thay vì 403), vừa là lỗi trải nghiệm (rỗng im lặng). 🔴 Chừng nào chưa sửa thì
   **không đo được phạm vi dữ liệu cấp tỉnh** — case giữ nguyên kỳ vọng, 🚫 không hạ.

### 20 case chưa chạy — phân loại rõ ràng

| Vì sao | Case |
|---|---|
| **GHI dữ liệu thật** (`allowMutation: false`) — tạo nhân viên là tạo tài khoản đăng nhập + phân quyền thật, màn 🚫 không có chức năng xoá để dọn | `02_020_001` `003` `006` `015` `023` `024` `030` · `02_030_002` |
| **Kỳ vọng chưa chốt** | `02_010_011` `013` `019` · `02_020_014` `026` `028` |
| **Mâu thuẫn đặc tả chờ user quyết** | `02_020_025` · `02_030_003` |
| **Thiếu vai / dữ liệu nền** | `02_010_027` `028` · `02_030_006` · `02_040_004` |
| 🔴 **Không tái hiện được qua giao diện** (mới phát hiện khi chạy) | `02_020_020` — xem dưới |

🔴 **`02_020_020` (bỏ trống Trạng thái dòng vai trò) là luật KHÔNG chạm tới được.** Chọn Đơn vị xong
code tự đặt `status = 1`, và `Select` trạng thái 🚫 không khai `allowClear` ⇒ người dùng không có cách
nào để trống ô này. Rule `required: "Chọn trạng thái"` vì vậy không bao giờ chạy. Cần user chốt: bỏ
rule, hay mở `allowClear`.

### Lệch nhỏ giữa kịch bản và sản phẩm, đã chỉnh kỳ vọng theo CODE

- Nút thứ ba ở vùng extra tên thật là **"Quản lý chức danh"** (tài liệu gọi tắt "Chức danh").
- Khi bộ lọc không ra kết quả, tiêu đề bảng **bỏ hẳn** phần `(N nhân viên)` và thanh phân trang biến
  mất — 🚫 không hiện `(0 nhân viên)` như `02_010_008` / `02_010_026` mô tả.
- Màn Thêm/Sửa là **Drawer** (`.ant-drawer`, tiêu đề *Thêm nhân viên* / *Chỉnh sửa nhân viên*), tài
  liệu gọi là *modal*.

## 8. Việc còn lại

1. ✅ **XONG 20/09/2026** — đã viết script cho toàn bộ 72 case (xem mục 7b).
2. Trình user mục 7 số 1 và 2 để chốt kỳ vọng cho `02_020_025` và `02_030_003`.
3. Xác định tài khoản thiếu quyền `view_all_employee` / `create_employee` để mở `02_010_027` `028`.
4. Chưa dựng case cho **Nhập Excel nhân viên**, **Xuất Excel**, **Chức danh (ChainPositionManagementDrawer)**
   — ba màn này có nút ở màn danh sách nhưng HDSD 02 và sheet QC đều không phủ. 🔴 Cần user xác nhận
   có đưa vào phạm vi phân hệ 02 hay tách phân hệ riêng.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `02_020_026` | Thêm nhân viên trùng cả đơn vị và vai trò | Thiếu nguyên văn thông báo | Bị chặn, không tạo được. 🔴 Modal này KHÔNG có kiểm trùng ở FE (khác drawer Gắn nhân viên của phân hệ 01 vốn cảnh báo ngay tại chỗ) ⇒ thông báo phải đến từ backend. Ghi lại nguyên văn thông báo thật. |

**1/72 case** của phân hệ này chưa chốt được kỳ vọng.
