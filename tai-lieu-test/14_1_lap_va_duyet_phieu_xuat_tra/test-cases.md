# Kịch bản auto test — 14_1 Lập và duyệt phiếu xuất trả nhà cung cấp

- Ngày dựng: **19/09/2026** · skill `test-scenario` · nguồn `hdsd14_1_lap_va_duyet_phieu_xuat_tra/tasks/*.md`
  (5 task) + sheet QC `uat_vnpost_nha_cung_cap.csv` (`NCC_109`–`NCC_129`) và `uat_vnpost_quan_ly_kho.csv`
  (`FUNC_1_447`–`FUNC_1_451`).
- 144 case · 🚫 chưa viết script (spec cũ `tests/vnpost-supplier.playwright.spec.js` là script chung
  của phân hệ NCC, 🚫 không nối với mã case nào ở đây).

## 1. 🔴 HAI màn hình khác nhau cùng mang tên "Xuất trả nhà cung cấp"

Đây là điều phải nắm trước khi viết script, vì chọn nhầm màn là toàn bộ case sai địa chỉ.

| | Màn **đa cấp** (mới) | Màn **theo PO** (cũ) |
|---|---|---|
| Route danh sách | `/inventory/stock-return-request` | `/inventory/return-to-supplier` |
| Route tạo / sửa | `/inventory/stock-return-request/create` · `/edit/:id` | cùng cây `return-to-supplier` |
| Nhóm case | `010`–`050` | `060` |
| Nguồn hàng | Phiếu nhập kho · SKU · Mã lô · Serial | **Phiếu PO** |
| Có duyệt phân cấp | Có (điểm bán → xã → tỉnh → TCT) | Không |
| Quyền route | `SUPPLIER_RETURN_REQUEST` | `PURCHASE_ORDER_GET` |
| `hideInMenu` | không | **có** — vào bằng URL hoặc từ chi tiết PO |
| Tiêu đề PageContainer | "Xuất trả nhà cung cấp" | "Xuất trả nhà cung cấp" ← **trùng nhau** |

⚠️ Hai màn **trùng tiêu đề**. Script 🚫 không được nhận diện màn bằng tiêu đề — phải dựa vào **URL**
hoặc vào cột riêng: màn đa cấp có cột **"Mã PO tham chiếu"** và **"Tỉnh / Xã"**, màn theo PO không có.

HDSD 14_1 tả **màn đa cấp**. Sheet QC `NCC_110` đòi đúng ba trường *"Nhà cung cấp, Phiếu PO, Ghi chú"*
⇒ sheet QC tả **màn theo PO**. Hai nguồn nói về hai màn khác nhau, không phải một bên lạc hậu.

## 2. Route

| Màn hình | Route | `handle.label` |
|---|---|---|
| Danh sách đa cấp | `/inventory/stock-return-request` | `STOCK_RETURN_REQUEST_LIST` |
| Tạo phiếu đa cấp | `/inventory/stock-return-request/create` | `STOCK_RETURN_REQUEST_CREATE` |
| Sửa phiếu nháp | `/inventory/stock-return-request/edit/:id` | `STOCK_RETURN_REQUEST_EDIT` |
| Danh sách theo PO | `/inventory/return-to-supplier` | `RETURN_TO_SUPPLIER_LIST` |

Trace: `vnpost-web/src/routes/configs/dashboard/inventoryRoutes.js:313-364`.

## 3. API — 🔴 đều đi qua pod-service, KHÔNG có prefix `/report` hay `/export`

✅ Bảng dưới đã **đối chiếu hai đầu**: khai báo phía FE (`services/*.js`) và `@RequestMapping` /
`@PostMapping` phía BE (`ReturnRequestController.java:22-237`). Không lệch dòng nào.

Màn đa cấp (`src/features/returnToSupplier/services/stockReturnRequestApi.js`, `BASE = /stock/v2/stock-return-request`):

| Việc | Method + path |
|---|---|
| Danh sách | `GET /stock/v2/stock-return-request` |
| Chi tiết | `GET /stock/v2/stock-return-request/{id}` |
| Lịch sử xử lý | `GET /stock/v2/stock-return-request/{id}/history` |
| Tra phiếu nhập theo mã | `GET /stock/v2/import-export/detail` |
| Tra serial | `GET /stock/v2/stock-return-request/resolve-serial` |
| Số đã dùng của nguồn | `GET /stock/v2/stock-return-request/source-usage` |
| Tạo phiếu | `POST /stock/v2/stock-return-request` (body có cờ `draft`) |
| Sửa phiếu | `PUT /stock/v2/stock-return-request/{id}` |
| Nộp phiếu | `POST /stock/v2/stock-return-request/{id}/submit` |
| Duyệt / từ chối | `POST /stock/v2/stock-return-request/{id}/approve` |
| Huỷ / từ chối | `POST /stock/v2/stock-return-request/{id}/cancel` |
| Nhập hàng về kho tỉnh | `POST /stock/v2/stock-return-request/{id}/receive-to-province` |

Màn theo PO (`returnToSupplierApi.js`, `BASE = /stock/v2/return-to-supplier`):

| Việc | Method + path |
|---|---|
| Danh sách | `GET /stock/v2/import-export/find?type=EXPORT&subType=RETURN_TO_SUPPLIER` |
| Chi tiết | `GET /stock/v2/import-export/detail` |
| PO trả được | `GET /stock/v2/return-to-supplier/purchase-orders` |
| Tra PO theo mã | `GET /stock/v2/return-to-supplier/purchase-orders/by-code` |
| Item của PO | `GET /stock/v2/return-to-supplier/purchase-orders/{poId}/items` |
| Tạo phiếu | `POST /stock/v2/return-to-supplier` |
| Sửa nháp | `PUT /stock/v2/return-to-supplier/{id}` |
| Hoàn tất | `POST /stock/v2/return-to-supplier/{id}/checkout` |
| Huỷ | `POST /stock/v2/return-to-supplier/{id}/cancel` |

⚠️ Danh sách của **cả hai màn** đọc chung `GET /stock/v2/import-export/find` / `detail`. Bắt request
theo path thôi là 🚫 không phân biệt được màn — phải xem thêm tham số `type` / `subType`.

## 4. Nhãn hiển thị thật

### 4.1 Trạng thái phiếu đa cấp — 16 giá trị (`components/returnRequest/statusConfig.js`)

`Nháp` `Chờ duyệt` `Xã đã duyệt` `Đã duyệt` `Đã gom phiếu` `Từ chối` `Đã tách phiếu` `Chưa trả hàng`
`Chưa gửi TCT` `Đã gửi TCT` `TCT đã tách` `Xử lý một phần` `Đã xử lý xong` `Đã huỷ vỡ hỏng` `Đã huỷ`

### 4.2 Cột bảng "Danh sách sản phẩm trả" (màn tạo phiếu)

`STT` · `Sản phẩm` · `SL phiếu` · `SL khả dụng` · `ĐVT trả` · `SL trả` · `Lô` · `Serial` + cột nút xoá
(`StockReturnRequestFormPage.jsx:1282-1597`).

### 4.2b Cột bảng "Danh sách sản phẩm" (màn chi tiết) — 🔴 **11 cột**, HDSD chỉ tả 7

`STT` · `Sản phẩm` · `Lô` · `Serial` · `SL trả` · `SL duyệt` · `Đã trả` · `Đã nhập lại` · `Đã huỷ` ·
`Còn lại` · `Giá gốc lô` (`ReturnRequestDetailDrawer.jsx:50-132`).
Ba cột `Đã trả` / `Đã nhập lại` / `Đã huỷ` có **tooltip** giải thích. `SL duyệt` khi chưa duyệt hiện
`--` màu xám, 🚫 không lấy `SL trả` thay thế.
Bảng phiếu con: `Cấp` · `Mã phiếu` · `Trạng thái` · `NCC` · `SL duyệt` · `Cập nhật`.

### 4.3 Cột danh sách đa cấp

`STT` · `Mã phiếu` · `Mã PO tham chiếu` · `Nhà cung cấp` · `Tỉnh / Xã` · `Tổng tiền` · `Trạng thái` ·
`Ngày tạo` · `Hành động`

### 4.4 Bộ lọc đa cấp

`Trạng thái` (Select allowClear) · `Tìm theo mã phiếu` (Input allowClear) ·
RangePicker placeholder `["Từ ngày tạo", "Đến ngày tạo"]`, format `DD/MM/YYYY` · nút `Tìm kiếm`.
Nút góc phải: `Tạo phiếu trả` (chỉ vai điểm bán) và `Gom phiếu (N)` (chỉ tỉnh/TCT).

### 4.5 Mục trong menu "Xử lý"

`Sửa` · `Nộp phiếu` · `Duyệt` · `Tách phiếu` · `Nhập hàng về kho` · `Trả hàng NCC` · `Nhập lại kho` ·
`Huỷ vỡ hỏng` · `Gửi lên TCT` · và mục cuối đổi nhãn theo cấp: **`Huỷ phiếu`** ở điểm bán,
**`Từ chối`** ở xã / tỉnh / TCT (`StockReturnRequestListPage.jsx:312`).

### 4.6 Vòng đời phiếu (antd Steps, dựng động)

Phiếu thường: `Khởi tạo` → `Chờ duyệt cấp 1` → `Chờ duyệt cấp 2` → `Chờ xuất kho`/`Đã xuất kho` →
`Chờ nhập kho về tỉnh`/`Đã nhập kho về tỉnh` → `Chờ xử lý tại tỉnh` → (`Gửi lên Tổng công ty`) →
`Trả hàng / Xử lý` → `Hoàn tất`.
Phiếu **con** ở TCT (`isTct=1` và `createFromId != null`) chỉ 4 mốc: `Khởi tạo` →
`Chờ Tổng công ty duyệt` → `Trả hàng / Xử lý` → `Hoàn tất`.

## 5. Thông báo lỗi — chép nguyên văn từ code

### 5.1 Frontend — `pages/StockReturnRequestFormPage.jsx`

| Tình huống | Nguyên văn |
|---|---|
| Tra mã phiếu nhập sai | `Không tìm thấy phiếu nhập/chuyển kho với mã đã nhập` |
| Phiếu nhập không có hàng | `Phiếu không có sản phẩm` |
| Ô mã lô rỗng | `Vui lòng nhập mã lô` |
| Lô không còn tồn | `Không tìm thấy lô "<mã>" còn tồn trong kho` |
| Lô đã có trong bảng | `Sản phẩm của lô này đã có trong danh sách` |
| Ô serial rỗng | `Vui lòng nhập serial` |
| Serial đã có trong bảng | `Serial này đã có trong danh sách` |
| Serial không tra được | `Serial "<serial>" không tồn tại hoặc đã xuất kho` |
| Chưa tra mã phiếu hợp lệ | `Vui lòng nhập mã phiếu nhập/chuyển kho hợp lệ` |
| Chưa nhập SL dòng nào | `Nhập số lượng trả cho ít nhất 1 sản phẩm` |
| Còn dòng chưa nhập SL | modal `Có sản phẩm chưa nhập số lượng trả` · nút `Tiếp tục tạo phiếu` / `Ở lại nhập tiếp` |
| Vượt SL khả dụng | `Sản phẩm "<tên>": SL trả (<n> <ĐVC>) vượt SL khả dụng (<m> <ĐVC>)` |
| Thiếu/thừa serial | `Sản phẩm "<tên>" quản lý serial: cần <n> serial (theo <ĐVC>), đang chọn <m>` |
| Chưa chọn lô | `Sản phẩm "<tên>": chọn lô hàng để trả` |
| Lô vượt tồn | `Sản phẩm "<tên>", lô <mã>: SL trả vượt tồn của lô (<n> <ĐVC>)` |
| Nhiều lô chưa chia SL | `Sản phẩm "<tên>": nhập SL trả cho từng lô` |
| Thiếu lý do | `Chọn lý do trả hàng` |
| Thiếu nội dung lý do khác | `Nhập lý do trả hàng` (có cả rule `whitespace`) |
| Mở sửa phiếu sai trạng thái | `Chỉ sửa được phiếu ở trạng thái Nháp hoặc Chờ duyệt` |
| Tạo phiếu lỗi | modal tiêu đề `Không thể tạo phiếu xuất trả` |

FE `ApproveModal.jsx`: `Vui lòng nhập lý do từ chối` · `Vui lòng chọn kho nhận hàng` ·
`Đã duyệt phiếu` / `Đã từ chối phiếu`.
FE `ReturnToSupplierFormPage.jsx` (màn theo PO): `Vui lòng chọn nhà cung cấp trước` ·
`Không tìm thấy phiếu PO có mã đã nhập` · `Vui lòng chọn nhà cung cấp` ·
`Vui lòng nhập số lượng cần trả cho ít nhất 1 sản phẩm` · `Đã lưu nháp` / `Hoàn tất phiếu xuất trả` ·
bảng rỗng: `Nhập mã PO để tải sản phẩm` / `PO không còn item để trả`.

### 5.2 Backend — `vnpost-pod-service/.../stock/return_request/service/ReturnRequestService.java`

| Dòng | Nguyên văn |
|--:|---|
| 105 | `Phiếu trả không có sản phẩm` |
| 255 | `Sản phẩm "<tên>" đã quá thời hạn trả hàng theo hợp đồng <mã>: đã <N> ngày kể từ ngày nhập kho, hợp đồng chỉ cho phép trả trong <M> ngày.` |
| 331 | `Sản phẩm "<tên>"[ - lô <mã>] trong kho điểm bán chỉ còn <x>, không đủ để trả (<y>). Vui lòng kiểm tra lại tồn kho.` |
| 364 | `Không có quyền nộp phiếu nháp của điểm bán khác` |
| 372 | `Chỉ nộp được phiếu đang ở trạng thái Nháp` |
| 376 | `Phiếu nháp chưa có sản phẩm để nộp` |
| 407 | `Chỉ sửa được phiếu đang ở trạng thái Nháp hoặc Chờ duyệt` |
| 410 | `Không có quyền sửa phiếu của điểm bán khác` |
| 479 | `Số lượng trả phải > 0` |
| 542 | `Số serial (<n>) phải bằng số lượng trả (<m>)` |
| 610·627 | `Không tìm thấy lô hàng <mã> trong kho` |
| 640 | `Không tìm thấy sản phẩm trong phiếu nhập gốc <id>` |
| 664 | `Serial "<s>" không tồn tại hoặc đã xuất kho` |
| 720 | `Chỉ cấp xã, cấp tỉnh hoặc TCT được duyệt phiếu trả` |
| 725 | `Phiếu đã chuyển Tổng công ty — chỉ TCT được duyệt` |
| 731·734 | `TCT chỉ duyệt được phiếu hàng TCT` · `TCT chỉ duyệt được phiếu đang Chờ duyệt` |
| 738·741 | `Phiếu không thuộc phạm vi xã của bạn` · `Cấp xã chỉ duyệt được phiếu đang Chờ duyệt` |
| 746·750 | `Phiếu không thuộc phạm vi tỉnh của bạn` · `Cấp tỉnh chỉ duyệt được phiếu đã được cấp xã duyệt` / `Cấp tỉnh chỉ duyệt được phiếu đang Chờ duyệt` |
| 863 | `Số lượng duyệt phải trong khoảng [0, <SL đề nghị>]` |
| 1114 | `Không thể hủy phiếu đã xử lý/đã tách/đã gom` |

⚠️ Nhãn tiếng Việt trong code ở dạng **NFD** — script so chuỗi phải `normalize("NFC")` trước.

## 6. Vai

| Nhóm | Vai chính | Vì sao |
|---|---|---|
| `010` `020` | `shop` | chỉ cấp điểm bán mới có nút "Tạo phiếu trả" |
| `030` | `shop` · `province` · `ward` · `tct` | case phạm vi cần cả 4 cấp |
| `040` | `ward` · `province` · `tct` | 3 cấp duyệt khác nhau, 🚫 không gộp |
| `050` | `shop` (huỷ) · `province` (từ chối) | hai nhãn khác nhau trên cùng một mục menu |
| `060` | `shop` · `province` | màn theo PO không phân cấp duyệt |

🔴 Nhóm `040` là chỗ **bắt buộc** phải tách tài khoản: phiếu do `shop` lập, `ward` duyệt cấp 1,
`province` duyệt cấp 2. Dùng một tài khoản quá quyền cho cả chuỗi sẽ cho **pass giả** vì các phép
kiểm phạm vi (`Phiếu không thuộc phạm vi xã của bạn`) 🚫 không bao giờ lộ ra.

## 7. Phân loại

| Nhãn | Số case | Ghi chú |
|---|--:|---|
| `READY_WITH_CODE_LOOKUP` | 81 | case đọc/lọc/kiểm chặn phía FE — cần locator cụ thể, chưa có script |
| `BLOCKED` | 63 | toàn bộ case `mutates` (`enabled: false`) |

## 8. 🔴 Case ghi dữ liệu — 63/144 case, chưa ai được phép chạy

Mọi case `mutates` ở đây đều chạm **KHO** và/hoặc **CÔNG NỢ NCC**, và môi trường trỏ **dữ liệu thật**
(`.env.domain`). Ba nhóm nguy hiểm nhất:

1. **`14_1_040_*` duyệt phiếu** — tỉnh duyệt là lúc **khoá tồn**: hàng rời kho điểm bán và không bán
   được nữa. Duyệt nhầm một phiếu là một lần xuất kho thật.
2. **`14_1_060_012` `060_014` `060_015` `060_016`** — hoàn tất phiếu trả theo PO **giảm công nợ NCC**
   và sinh giao dịch trong lịch sử công nợ. 🚫 Không có đường hoàn tác.
3. **`14_1_010_031`–`010_035`** — case lô/serial/tồn âm đòi chạy trọn chuỗi lập → nộp → duyệt hai cấp
   mới đo được tồn. Chạy nhầm là xuất kho thật của 5 đơn vị hàng.

## 9. Quét 11 kỹ thuật mục 3.4 — bảng đối soát

| # | Kỹ thuật | Case |
|--:|---|---|
| 1 | Ô bắt buộc | `010_010` `010_014` `010_016`–`010_020` `010_028` `010_030` `040_018` `040_022` `060_021` `060_023` `060_024` |
| 2 | Khoảng trắng | `010_006` `010_018` `030_007` `040_023` |
| 3 | Giá trị biên | `010_022`–`010_027` `010_029` `040_013`–`040_016` `060_027` |
| 4 | Kiểu dữ liệu sai | `010_005` `010_009` `010_013` `010_020` `030_011` `060_022` |
| 5 | Tính duy nhất | `010_011` `010_015` |
| 6 | Trạng thái × hành động | `020_007` `020_008` `020_012` `040_004` `040_005` `040_009` `040_010` `040_026` `050_004` `060_006`–`060_010` |
| 7 | Danh sách | `030_003` `030_010` `030_012` `030_013` `030_014` `060_003` |
| 8 | Tìm kiếm | `010_007` `030_004`–`030_009` `060_004` |
| 9 | Huỷ giữa chừng | `010_021` `010_039` `020_011` `040_025` `050_007` |
| 10 | Phạm vi theo vai | `010_043` `010_044` `020_009` `020_010` `030_021`–`030_023` `040_006`–`040_008` `060_028` |
| 11 | Sau khi ghi | `010_031`–`010_033` `010_041` `020_003` `040_012` `040_015` `040_024` `050_003` `060_005` `060_014` `060_015` `060_018` |

Luật rẻ tiền (số case ≥ số ô nhập bắt buộc): màn tạo phiếu đa cấp có **5** ô bắt buộc
(nguồn hàng · mã phiếu nhập · lý do · SL trả · lô/serial) và có 44 case — đạt. Màn duyệt có **3** ô
bắt buộc (cách nhập kho · kho nhận · SL duyệt) và có 26 case — đạt. Màn theo PO có **2** ô bắt buộc
(NCC · SL trả) và có 28 case — đạt.

## 10. 🔴 Mâu thuẫn đặc tả phát hiện khi trace — 🚫 không tự sửa, cần user quyết

| # | Vấn đề |
|--:|---|
| a | **Hai màn cùng nghiệp vụ "xuất trả NCC" cùng sống song song** (mục 1). Màn theo PO `hideInMenu` nhưng route vẫn mở được bằng URL và vẫn **giảm công nợ NCC**. Nghiệp vụ nào là đường chính thức? Nếu màn theo PO đã bị thay thì 28 case nhóm `060` chỉ còn giá trị hồi quy. |
| b2 | 🔴 **HDSD ghi sai thêm hai chuỗi thành công.** HDSD 020 ghi `"Đã cập nhật phiếu xuất trả"` khi lưu và `"Đã nộp phiếu — chờ duyệt"` khi nộp. Code: lưu → `Đã lưu nháp` (`StockReturnRequestFormPage.jsx:1272`), nộp từ menu → `Đã nộp phiếu` (`StockReturnRequestListPage.jsx:246`). **Không chuỗi nào khớp HDSD.** Cộng với mục b bên dưới, đây là **ba** chỗ HDSD 14_1 chép sai nguyên văn ⇒ 🔴 nghi ngờ HDSD được viết từ bản thiết kế chứ không từ màn chạy thật. |
| b | **HDSD ghi sai nguyên văn thông báo serial**: HDSD 010 viết `"Sản phẩm quản lý serial: số serial phải bằng số lượng"`, FE thật là `Sản phẩm "<tên>" quản lý serial: cần <n> serial (theo <ĐVC>), đang chọn <m>`, BE thật là `Số serial (<n>) phải bằng số lượng trả (<m>)`. **Ba chuỗi khác nhau** cho cùng một phép kiểm. Case dựng theo chuỗi của code. |
| c | **`NCC_121` và `NCC_125` không có thông báo lỗi.** Sheet QC đòi *"Hệ thống báo lỗi vượt số lượng còn lại"* nhưng code chặn bằng `max` của `InputNumber` (`ReturnToSupplierFormPage.jsx:286`) — người dùng **không gõ được** số vượt, nên không có lỗi nào để bắt. Case dựng theo hành vi thật (chặn bằng UI), 🔴 nhưng đây là điểm yếu: chặn UI không có tuyến phòng thủ ở BE thì gọi thẳng API vẫn qua. **Cần user xác nhận BE có chặn không.** |
| d | **`NCC_122` `NCC_123` đo công nợ NCC, nhưng màn đa cấp (HDSD) 🚫 không nói gì về công nợ.** Phiếu trả đa cấp có giảm công nợ NCC không, hay chỉ màn theo PO mới giảm? Nếu chỉ màn cũ giảm thì luồng chính đang **không hạch toán công nợ khi trả hàng** — sai im lặng. |
| e | **`FUNC_1_450` `FUNC_1_451` (tồn = 0 / tồn âm) chỉ có kỳ vọng "Không cho xác nhận"** — không nói chặn ở đâu và bằng thông báo gì. Đã viết lại theo thông báo thật của BE dòng 331. |
| f | **Ô "SL trả" nhận số thập phân theo ĐVT quy đổi** (`010_025`) mà HDSD không nói trả nửa thùng có hợp lệ không. Chưa có phép kiểm số nguyên nào trong code. |
| g | **Tra mã phiếu nhập / mã lô / mã PO có phân biệt hoa thường không** — code không `toUpperCase`, không `trim` ở phía so sánh của BE. `010_007` và `030_009` dựng để phơi hành vi thật. |
| h | **Không có phép kiểm "phiếu trả trùng"**: cùng một lô, cùng số lượng, lập hai phiếu liên tiếp đều qua. Ở luồng đa cấp tồn chỉ khoá lúc tỉnh duyệt ⇒ **hai phiếu cùng chờ duyệt cho cùng một số hàng** là hợp lệ về mặt code, và tổng SL duyệt có thể vượt tồn. Chưa dựng case vì chưa rõ đây là ý đồ hay lỗ hổng — **cần user quyết**. |

## 11. Nguồn đã dùng — và chỗ đã vá

| Nguồn | Mức |
|---|---|
| HDSD `hdsd14_1_*/tasks/*.md` | đọc **trọn 5/5 file**, kể cả khối ⚠️ và 💡 |
| Sheet QC | `doi-chieu-goc.js` → **26/26** case, đối chiếu từng mã |
| FE | `inventoryRoutes.js` · `stockReturnRequestApi.js` · `returnToSupplierApi.js` · `StockReturnRequestFormPage.jsx` · `StockReturnRequestListPage.jsx` · `ReturnToSupplierFormPage.jsx` · `ReturnToSupplierListPage.jsx` · `ApproveModal.jsx` · `ReturnRequestDetailDrawer.jsx` · `statusConfig.js` |
| BE | `ReturnRequestService.java` (grep trọn `PodException(`) · `ReturnRequestController.java` (đối chiếu path) |

🔴 **Chưa làm, để phiên sau biết mà không tưởng là đã xong:**

1. 🚫 **Chưa chạy SELECT kiểm dữ liệu thật.** Mọi con số trong tiền điều kiện (`SL khả dụng = 10`,
   `PO đã nhập 60`, `công nợ 10.000.000đ`) là **giá trị mẫu**, chưa lấy từ DB. Người viết script phải
   thay bằng số thật rồi đưa vào `test-input.json`.
2. 🚫 **Chưa đọc** `ProcessActionDrawer.jsx` · `ReceiveToProvinceModal.jsx` · `SupplierBatchSection.jsx`
   — ba màn đó thuộc phân hệ **`14_2`**, không thuộc `14_1`.
3. `StockReturnRequestFormPage.jsx` (~1.750 dòng) đọc theo grep có định hướng (`message.`, `title:`,
   `label=`, khối `buildPayloadItems`), 🚫 không đọc trọn. Phần logic quy đổi đơn vị
   (`returnMainOf`, `selectedConvert`) mới đọc phần validate — case `010_025` (SL thập phân) vì thế
   ghi kỳ vọng dạng "ghi lại giá trị thực tế" chứ 🚫 không khẳng định.

## 🔴 Kết quả chạy script — 20/09/2026

**144/144 case có script.** Lượt chạy: **4 đạt · 1 đỏ · 139 skip**. Hai spec cũ (`v2.js`,
`vnpost-supplier.playwright.spec.js`) đã **xoá**.

### Trace đã có — 🚫 đừng tra lại

| Thứ | Giá trị |
|---|---|
| Danh sách | `/inventory/stock-return-request` — *Xuất trả nhà cung cấp* · `GET /stock/v2/stock-return-request` |
| Tạo phiếu | `/inventory/stock-return-request/create` — *Tạo phiếu xuất trả nhà cung cấp* |
| Tra mã phiếu | `GET /stock/v2/import-export/detail?shopId=…&code=…` |

🔴 **Nút trên màn đổi theo vai**: `shop` thấy **"Tạo phiếu trả"**; `province` thấy
**"Gom phiếu (N)"** kèm cột ô chọn. Form tạo có hai nguồn hàng: *Theo phiếu nhập kho* (mặc định)
và *Theo SKU / Mã lô / Serial*.

### 🔴 Case đỏ `14_1_010_005` — tra mã phiếu không tồn tại KHÔNG báo gì

Gõ mã không tồn tại rồi bấm **Tìm**: FE **có** gọi `GET /stock/v2/import-export/detail`, nhưng màn
🚫 **không hiện message**, 🚫 không lỗi dưới ô, danh sách sản phẩm vẫn trống trơn. Người dùng không
biết vì sao không có gì. Giữ nguyên kỳ vọng "bị chặn" của kịch bản.

139 case chưa chạy: case GHI (lập, duyệt, xuất kho trả, huỷ phiếu) + case cần đợt trả có sẵn.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `14_1_010_007` | Tra mã phiếu nhập viết thường vẫn tìm được | Chờ chạy để lấy hành vi thật · Điều kiện chưa xác định | Nạp đúng phiếu như khi gõ chữ hoa. Nếu không nạp được thì ghi nhận là lỗ hổng: mã phiếu phân biệt hoa thường |
| `14_1_010_025` | SL trả thập phân theo đơn vị quy đổi | Chờ chạy để lấy hành vi thật | Hệ thống quy về đơn vị chính rồi so với SL khả dụng. Ghi lại giá trị thực tế hệ thống chấp nhận để đối chiếu với đặc tả |
| `14_1_030_005` | Tìm theo một phần mã phiếu | Chờ chạy để lấy hành vi thật | Bảng trả về mọi phiếu có mã chứa chuỗi đó; nếu trả rỗng thì ghi nhận hệ thống chỉ khớp chính xác |

**3/144 case** của phân hệ này chưa chốt được kỳ vọng.
