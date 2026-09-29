# 31 — Quản lý phân quyền · trace route · API · nhãn thật

> Viết 19/09/2026. Trước phiên này phân hệ **chưa có `test-cases.md`** (Nhóm A mục 5b của
> `HANDOFF_tai_lieu_test_case.md`) và **chưa có `test-input.json`** — script đã có nhưng chạy trên
> tài liệu rỗng. Nay dựng đủ ba file.
> 🚫 Nhãn lấy **từ code**, không chép từ sheet QC.

## 1. Route

| Màn | Route | Nguồn |
|---|---|---|
| Quản lý vai trò / gán vai trò | `/role-management/assign` | `config.jsx:382` (`ROLE_MANAGEMENT`) |
| Nhóm quyền | `/role-management/permission-group` | `config.jsx:383` (`ROLE_PERMISSION_GROUP`) |
| Quyền | `/role-management/permission` | `config.jsx:384` (`ROLE_PERMISSION`) |

Component: `src/features/role/` — trong đó `role/components/drawer-delete-business-role.jsx` là
popup xoá vai trò.

## 2. Vai

🔴 **Phân hệ này là công cụ quản trị, mặc định vai `tct`.** Mọi case trừ `31_090_001` gán `tct`.
`31_090_001` dùng `gdv` để kiểm ranh giới: vai điểm bán 🚫 không được vào màn quản lý vai trò.

## 3. Thông báo — nguyên văn, chép từ `src/features/role/`

| Nguyên văn | Dùng ở case |
|---|---|
| `Gán chức năng thành công` | `080_009` |
| `Xóa vai trò thành công` | `080_010` |
| `Vui lòng thêm ít nhất một nhân viên` | `080_011` |
| `Vai trò và toàn bộ phân công nhân viên bên dưới sẽ bị xóa. Hành động này không thể hoàn tác.` (`drawer-delete-business-role.jsx:126`) | `070_001` |

Còn chưa dùng tới case nào — ghi lại để phiên sau khỏi grep lại: `Gán quyền thành công` ·
`Gán vai trò thành công` · `Gán nhân viên thành công` · `Phân quyền thành công` ·
`Xác nhận thành công` · `Thêm mới thành công` · `Cập nhật thành công` · `Xoá quyền thành công` ·
`Xoá nhóm quyền thành công` · `Xoá nhóm chức năng thành công` · `Xóa vai trò thất bại` ·
`Xoá quyền thất bại` · `Xoá nhóm quyền thất bại` · `Tìm kiếm quyền thất bại` · `Đã có lỗi xảy ra`.

⚠️ Nhãn tiếng Việt trong code ở dạng **NFD**. Script so chuỗi phải `normalize("NFC")` trước khi so.

## 4. Phân loại

Tổng **45 case** (trước: 12). Độ phủ sheet QC: **16/45 → 44/45, mục "chưa dựng" = 0**
(1 case còn lại là bản trùng trong chính sheet, công cụ đã trừ).

| Nhãn | Case |
|---|--:|
| `READY` | 25 |
| `READY_WITH_CODE_LOOKUP` | 7 |
| `BLOCKED` | 13 |

## 5. 🔴 Case `mutates` — nguy hiểm bậc nhất trong cả bộ tài liệu

11 case, tất cả `allowMutation: false` và `enabled: false`:
`010_005` `010_007` `010_009` `020_003` `050_001` `060_002` `080_006` `080_008` `080_009`
`080_010` `080_011`.

**Vì sao nặng hơn cả case ghi sổ tiền:** sửa phân quyền 🚫 không chỉ đổi một bản ghi, nó đổi
**quyền thật của người đang dùng hệ thống ngay lúc đó**. Cụ thể:

- `080_006` **chọn tất cả chức năng** rồi lưu = cấp toàn quyền cho một vai trò thật. Mọi nhân viên
  mang vai trò đó lập tức làm được mọi thứ.
- `010_009` / `080_010` **xoá vai trò** kéo theo **xoá toàn bộ phân công nhân viên bên dưới** —
  chính code nói vậy (`drawer-delete-business-role.jsx:126`), và **không hoàn tác được**.
  Người bị mất vai trò sẽ mất quyền giữa ca làm việc.
- `010_007` sửa **phạm vi** vai trò = đổi tập dữ liệu mà người đó nhìn thấy.

🔴 Chưa ai được phép bật `allowMutation` cho nhóm này, kể cả khi user đã đồng ý bật cho các phân hệ
khác. Muốn chạy thì phải có **một vai trò rác chuyên dùng cho test**, không gán cho nhân viên nào.

## 6. Case `BLOCKED` — lý do cụ thể

| Case | Vì sao chưa chạy được |
|---|---|
| 11 case `mutates` ở mục 5 | đổi quyền thật của người đang dùng; cần vai trò rác chuyên dụng |
| `31_090_001` | cần tài khoản vai `gdv` và xác nhận hành vi chặn (chặn vào màn hay chỉ ẩn menu) |
| `31_030_008` | kiểm giao diện co giãn — cần ảnh chụp đối chiếu, chưa có bản chuẩn |
| `31_030_009` | 🔴 **kỳ vọng không đo được** — xem mục 7 |

## 7. 🔴 Lỗ hổng đặc tả — cần user quyết

### 7.1 `FUNC_VAITRO__10` đòi kiểm "font chữ chuẩn theo design" — không đo được

Sheet QC viết kỳ vọng là *"Font chữ chuẩn theo design. Các dòng cách nhau đều"* nhưng
🚫 **không nói font-family / font-size / line-height chuẩn là bao nhiêu**, và repo không có bản
thiết kế để đối chiếu.

Theo luật Bước 4 của skill `test-scenario` — *"Cấm sửa kỳ vọng cho dễ tự động hoá"* — case
`31_030_009` giữ nguyên kỳ vọng gốc và để `BLOCKED`, 🚫 không hạ xuống thành *"màn hình hiển thị
được"*. **Gỡ bằng cách:** user cung cấp giá trị chuẩn từ Figma, khi đó đo bằng `getComputedStyle`.

Ba case cùng nhóm "kiểm giao diện" (`FUNC_VAITRO__9`, `__10`, và phần *"nút hiển thị đúng"* của
`__6`, `__7`, `__11`–`__13`) đều mang kỳ vọng **mô tả cảm tính**. Đã viết lại theo hướng đo được
(nút *có hiện và bấm được*) ở `030_003`–`030_007`, nhưng phần *"đúng thiết kế"* thì không cứu được.

### 7.2 Sheet QC không có case nào cho nhóm quyền và quyền

Sheet chỉ phủ màn **vai trò** (`/role-management/assign`). Hai màn còn lại —
`/role-management/permission-group` và `/role-management/permission` — 🚫 **không có case gốc nào**,
và HDSD cũng chưa thấy mô tả. Bộ này vì thế **chưa phủ hai màn đó**; cần user xác nhận chúng có
nằm trong phạm vi bàn giao không.

### 7.3 Liên quan tới việc khai quyền bằng SQL

Màn này là mặt trước của chuỗi `TBL_PERMISSION → TBL_FUNCTION → TBL_ROLE_FUNCTION →
TBL_ROLE_PERMISSION`. Khi test `080_009` (gán chức năng) cần nhớ: đi qua **API** thì service tự xoá
cache Redis, còn khai bằng **SQL trực tiếp** thì không — cache TTL 30 ngày. Nếu case xanh mà quyền
không có tác dụng thật, nghi ngay cache. (Chi tiết ở skill `permission-sql` mục 3.)

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

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

**10/45 case** của phân hệ này chưa chốt được kỳ vọng.

---

## Kết quả chạy script (20/09/2026, vai `tct`)

```bash
npx playwright test --config tai-lieu-test/31_quan_ly_phan_quyen/playwright.config.js --project=tct
```

**11 đạt · 3 hỏng · 1 chưa chạy** (nhóm `010_*`/`020_*` do spec cũ `vnpost-role-permission` phủ).

### Màn thật — đo từ DOM

| Màn | Route | Tiêu đề |
|---|---|---|
| Vai trò | `/role-management/function` | `Quản lý vai trò` |
| Chức năng | `/role-management/permission` | `Quản lý chức năng` |
| Quyền (API) | `/role-management/assign` | `Quản lý quyền (API)` |

API: `GET /__api/auth/chain-role/get-all?page=0&size=5000&sort=createdDate,desc` ⇒ nạp **một lần
toàn bộ**, tìm kiếm chạy **phía client**, 🚫 không có phân trang.
Cột: `Tên Vai trò / Nhóm · Phạm vi · Ghi chú · Thao tác`; mỗi vai trò có `Gán chức năng` +
`Gán nhân viên`; thanh công cụ `Xuất excel · Thêm vai trò · Thu gọn tất cả`; tổng **14 vai trò**.

🔴 **Bẫy đã trả giá**: màn này 🚫 KHÔNG dùng `.ant-table` mà là **`.ant-tree`** — bám
`.ant-table-tbody tr` trả 0 dòng, triệu chứng giống hệt "thiếu dữ liệu".
🔴 **Bẫy thứ hai**: `chanGhi()` lọc theo `auth` chung chung sẽ chặn luôn **POST đăng nhập / chọn
phạm vi**, làm mọi test đỏ ở bước mở màn. Chỉ chặn đúng `chain-role|permission|function`.

### 🔴 Đã chạy và HỎNG

| Case | Đo được | Phân loại |
|---|---|---|
| `31_030_001` | Bảng **không có cột mã vai trò**. Cột thật: `Tên Vai trò / Nhóm · Phạm vi · Ghi chú · Thao tác` | **Lệch đặc tả** |
| `31_040_001` | Tìm từ khoá không tồn tại ⇒ 0 vai trò nhưng màn **không có dòng chữ trạng thái rỗng nào**, chỉ có `Tổng cộng: 0` | **Lệch đặc tả / trải nghiệm** |
| `31_040_002` | Tìm bằng `%_` vẫn trả **đủ 10 vai trò** như khi không lọc | **Lỗi sản phẩm** — cùng họ `19_120_002`, `27_071_001` |

### Đã chạy và đạt

`31_030_002` ô tìm có placeholder · `31_030_003` nút `Thêm vai trò` bấm được ·
`31_030_004` `Thu gọn tất cả` giảm số dòng · `31_030_005` mọi dòng có nút chỉnh sửa ·
`31_030_007` mọi dòng có nút phân quyền chức năng · `31_040_003` cắt khoảng trắng đầu/cuối ·
`31_040_004` không phân biệt hoa thường · `31_040_005` xoá từ khoá trở về đủ danh sách ·
`31_070_001` popup xoá đúng nội dung và **không** sinh request ghi nào.
