# Kịch bản auto test — 24 Công nợ nhân viên

- Ngày dựng: **18/09/2026** · hoàn thiện **19/09/2026** · skill `test-scenario`
- Nguồn: `hdsd24_cong_no_nhan_vien/tasks/*.md` (7 task) · sheet QC `uat_vnpost_nhan_vien.csv`,
  `uat_vnpost_tai_chinh.csv` · **trace code FE + BE** (mục 1–4).
- 🚫 Chưa viết script. 49 case trong `test-cases.csv`.

## 1. Route

| Màn hình | Route | Nguồn |
|---|---|---|
| `EMPLOYEE_DEBT` — Đối soát, công nợ › Công nợ nhân viên | `/debt-reconciliation/employee-debt` | `utils/constants/config.jsx:244` · `routes/configs/dashboard/financeRoutes.js:53` |

🔴 **Sửa 19/09/2026:** bản trước ghi `/finance/employee-debt` — **sai**, không có route nào như vậy.
Lối vào cũ `/employee/debt` đã bị gộp vào màn này (chú thích ở `employeeRoutes.js:66` và đầu
`OrderDebtTab.jsx`), 🚫 đừng viết script đi vào đường cũ.

Quyền route: `ROUTES_PERMISSION.EMPLOYEE_DEBT` (`routesPermission.js:88`). Nút **Xuất Excel** gắn
`PermissionButton permKey={PERMISSION_KEY.view_employee_debt}`.

## 2. 🔴 Hai thẻ là hai loại tiền VÀ hai API khác nhau

| Thẻ | Nghĩa | API |
|---|---|---|
| **Công nợ theo đơn hàng** | tiền **KHÁCH** còn nợ, gắn với nhân viên bán | `GET /shops/{shopId}/employee/get-debt-summary` (`pages/employee/employeeApi.js:41`) |
| **Công nợ với cửa hàng** | tiền **NHÂN VIÊN** nợ cửa hàng (thiếu hụt kiểm kho, hàng hỏng khi xuất kho) | `GET /employee-debt` (`EmployeeDebtController.list`) |

HDSD cảnh báo thẳng: *"Đừng cộng hai con số này lại."* `24_050_003` giữ ranh giới đó.
🔴 Hai thẻ **lọc phạm vi theo hai cơ chế khác nhau** — xem mục 5.1.

## 3. API đầy đủ — FE ↔ BE đối chiếu hai đầu

Controller BE: `vnpost-core-service/.../employee_debt/controller/EmployeeDebtController.java`,
`@RequestMapping("/employee-debt")`; gateway đẩy về core (8002).

| Việc | FE (`features/employeeDebt/services/employeeDebtApi.js`) | BE |
|---|---|---|
| Danh sách công nợ với cửa hàng | `GET /employee-debt` (params `shopId`, `payStatus`, `keyword`, `page`, `size`) | `list` |
| Chi tiết theo nhân viên | `GET /employee-debt/{sysUserId}/detail` | `detail` |
| Lịch sử ghi nợ | `GET /employee-debt/{sysUserId}/history` | `history` |
| Ghi nợ từ phiếu kiểm kho | `POST /employee-debt/from-stock-check` | `createFromStockCheck` |
| Ghi nợ từ phiếu xuất kho | `POST /employee-debt/from-stock-export` | `createFromStockExport` |
| Phân bổ theo phiếu xuất | `GET /employee-debt/export-allocations` | `exportAllocations` |
| Tra theo chứng từ gốc | `GET /employee-debt/by-reference` | `byReference` |
| Nhân viên nộp tiền | `POST /employee-debt/payment` · lịch sử: `GET /employee-debt/payment` | `payment` |
| Công nợ theo đơn hàng | `GET /shops/{shopId}/employee/get-debt-summary` | core `employee` |
| Nợ khách của một điểm bán | `GET /shops/{shopId}/customer/get-debts` | core |

## 4. Nhãn và thông báo — nguyên văn từ code

⚠️ Nhãn tiếng Việt trong code ở dạng NFD — script so chuỗi phải `normalize("NFC")`.

**Màn chính** (`EmployeeDebtListPage.jsx`): tiêu đề `Công nợ nhân viên`, `breadcrumb={null}`,
hai thẻ `Công nợ theo đơn hàng` · `Công nợ với cửa hàng`.

**Thẻ Công nợ theo đơn hàng** (`OrderDebtTab.jsx`): cột `#` · `Tên nhân viên` · `Số điện thoại` ·
`Tổng tiền khách nợ` · `Hành động` (liên kết `Chi tiết`); ô tìm kiếm placeholder
`Tìm kiếm tên, số điện thoại...`; dòng tổng `Tổng công nợ:`; nút `Xuất Excel`; bảng rỗng hiện
`Chưa có dữ liệu công nợ`; **debounce 500ms**; `page` 0-based, `size` mặc định 10.

**Thẻ Công nợ với cửa hàng** (`ShopDebtTab.jsx`): cột `STT` · `Nhân viên` · `Tổng nợ` · `Đã trả` ·
`Còn lại` · `Khoản chưa thanh toán` · `Hành động`; ô tìm kiếm placeholder `Tìm tên/SĐT nhân viên`;
ô trạng thái có đúng 4 lựa chọn `Tất cả` (ALL) · `Chưa trả` (NOT_PAY) · `Trả một phần` (PAY_PARTIAL) ·
`Đã trả` (PAY_COMPLETED); tiêu đề bảng `Danh sách công nợ`.

**Form nhân viên nộp tiền** (`DrawerPayEmployeeDebt.jsx`):
`Vui lòng nhập số tiền thanh toán` (chặn) · `Thanh toán công nợ thành công` ·
`Thanh toán công nợ thất bại` (fallback khi API không trả message) · ô tổng tiền placeholder
`Nhập tổng tiền, hệ thống tự phân bổ vào các phiếu`.

**Form ghi nhận khách trả tiền** (task 040): `Số tiền phải lớn hơn 0` · `Thêm thành công`.

## 5. Lỗ hổng đặc tả và mâu thuẫn tài liệu ↔ code

1. 🔴 **Ô chọn điểm bán bị bỏ qua ở thẻ Công nợ với cửa hàng, với vai tỉnh và xã.**
   `EmployeeDebtController.list` đặt `resolvedShopId = null` khi `orgUnitType` là `BUU_DIEN_TINH`
   hoặc `BUU_DIEN_XA`, rồi lọc theo `org_province_code` / `org_ward_code` (dòng 66-80). Người dùng cấp
   tỉnh chọn một điểm bán nhưng danh sách **không đổi** — vẫn là toàn tỉnh. Nhánh `TONG_CONG_TY` thì
   ngược lại: nhận đúng `shopId`. Case `24_050_005`, `24_PQ_003`. **Cần user quyết là cố ý hay lỗi.**
2. 🔴 **Tìm kiếm không bỏ dấu.** Truy vấn là `e.name LIKE CONCAT('%', :keyword, '%')`
   (`EmployeeDebtHistoryDao.java:41`), không chuẩn hoá dấu tiếng Việt ⇒ gõ không dấu ra bảng rỗng,
   trái kỳ vọng `FUNC_NHANVIEN__51`. Hoa/thường thì khớp được nhờ collation `_ci` của MySQL.
   Case `24_010_010`.
3. 🔴 **Ký tự `%` và `_` là ký tự đại diện SQL** và không được escape trước khi nối vào `LIKE`
   ⇒ gõ `%` có thể trả về **toàn bộ** danh sách thay vì bảng rỗng như `FUNC_NHANVIEN__49` mong đợi.
   Case `24_010_008`.
4. **Khoảng trắng chỉ bị cắt hai đầu** (`keyword.trim()`, `EmployeeDebtServiceImpl:207`); khoảng trắng
   **giữa hai từ** giữ nguyên nên `"Nguyễn  An"` (hai dấu cách) không khớp `"Nguyễn An"`.
   Sheet QC `FUNC_NHANVIEN__50` nói "loại bỏ khoảng trắng thừa" — hiểu theo nghĩa rộng thì không đúng.
   Case `24_010_009`.
5. **Hai thẻ dùng hai API khác nhau** nên số liệu không bắc cầu được: lọc ở thẻ này không ảnh hưởng
   thẻ kia, và một nhân viên có thể xuất hiện ở thẻ này mà không có ở thẻ kia. Case `24_050_004`.
6. Task 040 và 070 **không nói ràng buộc quỹ thu** — chọn sai quỹ có bị chặn không?
7. Task 010 không nói **đơn vị tiền và quy tắc làm tròn** (có theo cấu hình `07_1` không?).
8. **Nộp nhiều hơn tổng nợ**: HDSD và sheet QC đều không nói hệ thống xử lý thế nào. Case `24_070_005`
   viết để phơi hành vi thật; nếu ghi nhận cả phần dư thì nhân viên thành "trả thừa" không có chỗ hoàn.

## 6. Phân loại

| Nhãn | Số case |
|---|--:|
| `READY` (chỉ đọc) | 36 |
| `READY_WITH_CODE_LOOKUP` (ghi dữ liệu) | 13 |
| `BLOCKED` | 0 |

## 7. Case ghi dữ liệu — 🔴 chưa ai được phép chạy

13 case: `24_020_001` `24_020_002` (xuất Excel — sinh job export thật) · `24_040_001` `24_040_002`
`24_040_003` (ghi nhận khách trả tiền) · `24_070_001` … `24_070_008` (nhân viên nộp tiền).

🔴 Nhóm `040` và `070` **sinh phiếu thu thật trong sổ quỹ**. HDSD nói rõ về `24_070_002`:
*"thao tác ghi nhận tiền đã thu thật, không phải xoá nợ… sửa lại phải nhờ bộ phận quản trị."*

## 8. Quét 11 kỹ thuật mục 3.4

| # | Kỹ thuật | Case |
|---|---|---|
| 1 | Ô bắt buộc | `24_040_001` · `24_070_003` |
| 2 | Khoảng trắng | `24_010_009` · `24_010_012` |
| 3 | Giá trị biên | `24_040_002` · `24_070_004` · `24_070_005` · `24_010_015` (ngày) |
| 4 | Kiểu dữ liệu sai | `24_070_004` (dấu trừ) · `24_010_008` |
| 5 | Tính duy nhất | không áp dụng — màn chỉ đọc và ghi nhận thanh toán, không có trường "không được trùng" |
| 6 | Bảng trạng thái × hành động | `24_050_007` (3 trạng thái trả nợ) · `24_030_003` (Còn nợ / Đã thanh toán) · `24_070_008` |
| 7 | Danh sách | `24_010_014` · `24_050_008` · `24_010_017` · `24_010_007` (trạng thái rỗng) |
| 8 | Tìm kiếm | `24_010_005` … `24_010_013` · `24_050_004` |
| 9 | Huỷ giữa chừng | `24_070_007` |
| 10 | Phạm vi theo vai | `24_PQ_001` … `24_PQ_004` · `24_010_002` · `24_050_005` · `24_010_016` |
| 11 | Sau khi ghi | `24_070_008` · `24_040_003` |

**Tự soát:** màn không có form khai báo nhiều ô bắt buộc (chỉ 1 ô ở form thanh toán), nên luật
"số case < số ô bắt buộc" không có gì để bắt. Trọng tâm đúng là nhóm tìm kiếm và phạm vi theo vai.

## 9. Câu hỏi CHẶN cần user quyết

1. Mục 5.1 — **cấp tỉnh/xã chọn điểm bán mà bị bỏ qua**: cố ý (chỉ cho xem toàn đơn vị) hay lỗi?
   Nếu là lỗi thì `24_050_005` phải chuyển thành phiếu bug.
2. Mục 5.2/5.3 — **tìm kiếm không dấu và ký tự `%`**: lấy code làm chuẩn (sửa kỳ vọng sheet QC) hay
   lấy sheet QC làm chuẩn (lập phiếu bug)?
3. Mục 5.8 — **nộp nhiều hơn tổng nợ** phải chặn hay cho ghi nhận?

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `24_050_005` | Cấp tỉnh chọn điểm bán ở thẻ Công nợ với cửa hàng | Chờ user quyết | 🔴 Danh sách KHÔNG đổi: EmployeeDebtController.list đặt resolvedShopId = null khi orgUnitType là BUU_DIEN_TINH hoặc BUU_DIEN_XA, rồi lọc theo org_province_code / org_ward_code ⇒ ô chọn điểm bán bị bỏ qua ở thẻ này. Cần u… |

**1/49 case** của phân hệ này chưa chốt được kỳ vọng.

---

## Kết quả chạy script (20/09/2026)

```bash
npx playwright test --config tai-lieu-test/24_cong_no_nhan_vien/playwright.config.js
```

**7 đạt · 1 hỏng · 44 chưa chạy.**

### Màn thật — đo từ DOM (`/debt-reconciliation/employee-debt`)

Tiêu đề `Công nợ nhân viên`; 2 thẻ `Công nợ theo đơn hàng` · `Công nợ với cửa hàng`;
cột `# · Tên nhân viên · Số điện thoại · Tổng tiền khách nợ · Hành động`;
API `GET /__api/shops/<shopId>/employee/get-debt-summary`.
Cấp tỉnh có thêm ô **`Chọn điểm bán / kho`** (mở **drawer ba cột**, 🚫 không phải dropdown).

### 🔴 Đã chạy và HỎNG

| Case | Đo được | Phân loại |
|---|---|---|
| `24_PQ_001` | Vai `gdv` vào được màn, nhưng **mọi** lời gọi `get-debt-summary` đều trả **401**. Màn hiện `Tổng công nợ: 0 đ` và bảng rỗng — người dùng tưởng không có công nợ, thực ra là **không được phép đọc** | **Thiếu quyền** — cùng họ với `02_010_029`, `10_PQ_001`, `16_010_001` |

### Đã chạy và đạt

`24_010_001` bố cục thẻ/ô lọc cấp tỉnh · `24_010_002` vai điểm bán **không** có ô chọn điểm bán ·
`24_010_016` cấp tỉnh **chưa chọn điểm bán thì không gọi** `get-debt-summary` (đúng nghiệp vụ,
🚫 không phải mất dữ liệu) · `24_050_003` hai thẻ là hai loại tiền khác nhau (cột khác nhau).

### 🔴 Chặn đo 8 case — ghi lại để user kiểm

Vai `province` (`qltls01`, Bưu điện tỉnh Lý Sơn) mở drawer `Chọn Điểm bán` thì **cột ĐIỂM BÁN không
liệt kê điểm bán nào** (`Không có dữ liệu`), cả ở cấp tỉnh lẫn sau khi chọn `Bưu điện xã Lý Sơn`.
Không chọn được điểm bán ⇒ 🚫 không có dữ liệu công nợ để kiểm: `24_010_003` · `24_010_004` ·
`24_010_005` · `24_010_007` · `24_010_008` · `24_010_013` · `24_010_014` · `24_050_001` đều skip
kèm nguyên văn nội dung drawer. Cần user xác nhận đây là dữ liệu môi trường hay lỗi bộ chọn đơn vị.

🔴 Bẫy đã trả giá: **bấm vào tỉnh đang chọn ở cột 0 là BỎ CHỌN nó** — cột 1 và cột 2 trống sạch.
Cột 2 vốn nạp sẵn theo đơn vị của tài khoản, chỉ đi sâu xuống xã khi cột 2 rỗng.

### Chưa chạy — có lý do

36 lượt còn lại: `mutates` (ghi nợ, thu tiền nhân viên) hoặc thiếu vai (`ward` chưa khai tài khoản).
