# 32 — Mô hình tổ chức · trace route · API · nhãn thật

> Viết 19/09/2026. Trước phiên này phân hệ **chưa có `test-cases.md`** và **chưa có
> `test-input.json`** (Nhóm A mục 5b của `HANDOFF_tai_lieu_test_case.md`). Nay dựng đủ.
> Bổ sung **56 case** (12 → **68**). Độ phủ sheet QC: **11/67 → 67/67**.

## 1. Route

| Màn | Route | Nguồn |
|---|---|---|
| Mô hình tổ chức | `/chain/organization-management` | `config.jsx:373` (`CHAIN_ORGANIZATION_MANAGEMENT`) |
| Tách / gộp đơn vị | `/chain/organization-restructure` | `config.jsx:374` |

Component: `src/features/chain/pages/organizationManagement/`, tiện ích cây ở
`features/chain/utils/organizationScopeTree.js` · `organizationRegionTree.js` ·
`organizationScopeSource.js`.

🔴 **Bằng chứng đã ghi ở mục 6 câu 2 của handoff, nhắc lại vì nó quyết định cách test nhóm `160`:**
`OrganizationDetail.jsx` mở **đúng component `DrawerCreateOrUpdateShop` của màn Quản lý điểm bán**,
dùng chung API `POST /shops/profile`. Nghĩa là **tạo điểm bán ở đây và ở phân hệ `01` là một luồng**
— sửa một chỗ ảnh hưởng cả hai, và case của hai phân hệ phải nhất quán.

## 2. Vai

Mặc định `tct` (công cụ quản trị toàn mạng lưới). Hai ngoại lệ dựng riêng để kiểm ranh giới:
`32_110_006` dùng `gdv` (icon thêm đơn vị con phải bị ẩn), `32_170_015` dùng `province`
(không gán được nhân viên cho đơn vị ngoài phạm vi tỉnh mình).

## 3. Thông báo — nguyên văn, chép từ `src/features/chain/`

| Nguyên văn | Case |
|---|---|
| `Thêm đơn vị tổ chức thành công` | `100_001`–`100_003` |
| `Cập nhật đơn vị tổ chức thành công` | `130_001` |
| `Xoá đơn vị thành công` | `140_001` |
| `Gán nhân viên thành công` | `170_002` |
| `Đã tạo yêu cầu xuất mô hình tổ chức` | `150_006` |
| `Không tìm thấy đơn vị` | — chưa dùng |

Còn chưa dùng tới case nào: `Thêm vùng thành công` · `Cập nhật vùng thành công` ·
`Xoá vùng thành công` · `Không thể lưu vùng` · `Không thể xoá vùng` · `Không thể tải vùng cấp con` ·
`Thao tác không thành công` · `Xóa phân quyền thành công` · `Tạo quyết định thất bại` ·
`Đã tạo quyết định tách / gộp ở trạng thái nháp` · `Tải file lỗi thành công!` · `Không thể tải file`.

⚠️ **`Tải file lỗi thành công!`** đọc lên tối nghĩa (tải *tệp báo lỗi* thành công, hay tải tệp *bị
lỗi*?). Đáng báo để sửa câu chữ.

⚠️ Nhãn tiếng Việt trong code ở dạng **NFD**. Script so chuỗi phải `normalize("NFC")` trước khi so.

## 4. Phân loại

| Nhãn | Case |
|---|--:|
| `READY` | 12 |
| `READY_WITH_CODE_LOOKUP` | 7 |
| `BLOCKED` | 49 |

## 5. 🔴 Vì sao 44/68 case là `mutates` và gần như toàn bộ `BLOCKED`

**Cây tổ chức là gốc phân phạm vi dữ liệu của TOÀN hệ thống.** Mọi phân hệ khác — kho, bán hàng,
công nợ, báo cáo, phân quyền — đều lọc dữ liệu theo cây này. Sai một nút là sai phạm vi của cả
hệ thống, và cái sai đó **lan âm thầm**: báo cáo vẫn ra số, chỉ là số của sai đơn vị.

Ba mức nguy hiểm, tăng dần:

1. **`140_001` / `140_002` — xoá lan xuống cấp dưới.** Xoá một Xã là mất toàn bộ Điểm bán thuộc Xã
   đó; xoá một Tỉnh là mất cả Xã lẫn Điểm bán. Chính sheet QC mô tả vậy.
2. **`130_001` — đổi Đơn vị cha.** Chuyển một nhánh sang cha khác là đổi phạm vi dữ liệu của mọi
   người dùng thuộc nhánh đó, ngay lập tức.
3. 🔴 **`140_003` — xoá cấp Tổng công ty = XOÁ SẠCH mô hình tổ chức.** Đây là case phá huỷ nhất
   trong toàn bộ bộ tài liệu 48 phân hệ. **Tuyệt đối không chạy trên dữ liệu thật dù
   `allowMutation` có được bật**, kể cả khi user đã đồng ý bật cho phân hệ khác.

Muốn chạy nhóm này cần **một nhánh tổ chức rác chuyên dùng cho test**, không có người dùng và không
có dữ liệu nghiệp vụ nào trỏ vào.

## 6. 🔴 Lỗ hổng đặc tả — cần user quyết

### 6.1 Hai case gốc kiểm tính năng ĐÃ BỊ COMMENT OUT

Đã ghi ở mục 6 câu 2 của handoff, nay dựng thành case kèm lý do:

| Case | Case gốc | Tính năng | Ở đâu |
|---|---|---|---|
| `160_003` | `dong64` | cờ **"Là cửa hàng mẫu"** | `DrawerCreateShop.jsx:604` — đã comment |
| `160_010` | `FUNC_THUMUC__52` | dropdown **"Cửa hàng mẫu"** | `DrawerDetailShop.jsx:148-153` — đã comment |

🚫 Không bỏ im lặng hai case này (luật Bước 4: *"không im lặng bỏ case"*). Chúng ở `BLOCKED` kèm
lý do chính xác. **Gỡ bằng cách:** bỏ comment rồi test lại, **hoặc** user xác nhận tính năng đã
khai tử — khi đó bỏ hai case gốc khỏi sheet QC.

### 6.2 Khoảng mã hợp lệ của từng cấp không có ở đâu cả

`FUNC_THUMUC__7` đòi chặn *"mã cấp Tỉnh ngoài khoảng quy định"* nhưng 🚫 **sheet QC không nói khoảng
đó là gì**, HDSD cũng không. `100_004` vì vậy để kỳ vọng *"ghi lại nguyên văn thông báo và khoảng mã
hợp lệ"* — chạy để phát hiện, không chốt trước.

### 6.3 Xoá lan xuống cấp dưới: dữ liệu nghiệp vụ đi đâu?

Sheet QC chỉ nói Điểm bán *"biến mất khỏi cây"*. 🚫 Không nói **tồn kho, công nợ, đơn hàng** của
điểm bán đó ra sao. Cùng dạng câu hỏi treo với *"Xoá kho đang có tồn thì tồn đi đâu?"* (câu 6 mục 6b
của handoff). `140_001`/`140_002` chỉ kiểm được phần cây, 🚫 chưa kiểm được phần dữ liệu nghiệp vụ.

### 6.4 `FUNC_THUMUC__57` lặp lại đúng câu hỏi treo số 20 của handoff

*Đổi trạng thái một phân công sang "Đã nghỉ" thì toàn bộ phân công của nhân viên đó có cùng đổi
không?* — câu 20 mục 6b ghi *"Code không thấy xử lý lan"*. `170_005` để kỳ vọng *"ghi lại hành vi
thật"*, 🚫 không đoán.

### 6.5 Nhập Excel: nhận một phần hay từ chối cả tệp?

`150_003` rơi đúng vào **câu hỏi treo số 21** của handoff (*"Ba câu hỏi nhận một phần hay từ chối cả
file"*, lặp ở `08` `10` `12_2`). Nay thêm `32` là **phân hệ thứ tư** hỏi cùng một câu. Đáng trả lời
một lần cho cả bốn.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

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

**24/68 case** của phân hệ này chưa chốt được kỳ vọng.

---

## Kết quả chạy script (20/09/2026, vai `tct`)

```bash
npx playwright test --config tai-lieu-test/32_mo_hinh_to_chuc/playwright.config.js --project=tct
```

**7 đạt · 0 hỏng · 2 skip có lý do** (nhóm `010_*`/`020_*`/`040_*`/`050_*` do spec cũ `vnpost-org` phủ).

### Màn thật — đo từ DOM (`/chain/organization-management`)

Tiêu đề `Mô hình tổ chức`; cây `.ant-tree-treenode` (16 nút lúc mở); ô `Tìm kiếm`;
select `Lọc theo vùng` · `Trạng thái`; nút `Nhập từ excel` · `Xuất excel` · `Thêm đơn vị`;
khung phải hiện `Vui lòng chọn một đơn vị để xem chi tiết` khi chưa chọn nút nào.

🔴 **Bẫy đã trả giá**: trang có **2 thẻ `<main>`** (layout ngoài + khung chi tiết) ⇒
`page.locator('main')` vi phạm strict mode. Helper tách sẵn `khung()` và `khungChiTiet()`.

### Đã chạy và đạt

`32_120_002` tìm trên cây ⇒ cây thu hẹp và vẫn bung tới nút tìm được ·
`32_100_007` huỷ thêm đơn vị: **0 request ghi**, cây nguyên vẹn, không còn tên nháp ·
`32_130_004` huỷ chỉnh sửa: thông tin đơn vị giữ nguyên từng ký tự ·
`32_140_004` huỷ xoá ở popup: **0 request ghi**, cây không mất nút ·
`32_170_001` popup Gán nhân viên mở đúng · `32_170_012` dropdown nhân viên thu hẹp theo từ khoá.

Mọi case trên đều bọc `chanGhi()` — thêm/sửa/xoá đơn vị là **đổi cây tổ chức thật của toàn mạng
lưới**, mọi phân hệ khác lọc theo cây này.
