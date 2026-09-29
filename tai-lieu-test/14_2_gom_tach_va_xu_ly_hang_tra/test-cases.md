# Kịch bản auto test — 14_2 Gom tách và xử lý hàng trả

- Dựng 18/09/2026, **viết lại toàn bộ 19/09/2026** (17 → 108 case) · skill `test-scenario`
- Nguồn: `hdsd14_2_gom_tach_va_xu_ly_hang_tra/tasks/*.md` (đọc trọn 6/6) + trace code FE và BE
- Sheet QC 🚫 **không phủ** phân hệ này ⇒ cột `Ma goc` để trống toàn bộ, `Nguon` ghi rõ HDSD hay kỹ thuật
- 🚫 Chưa viết script

## 1. 🔴 Route — bản cũ ghi SAI

Bản 18/09 ghi route là `/inventory/return-to-supplier`. Đó là màn **xuất trả theo PO** (phân hệ
`14_1` nhóm `060`), 🚫 không có gom / tách / xử lý hàng. Route đúng:

| Màn hình | Route | `handle.label` |
|---|---|---|
| Danh sách xuất trả NCC đa cấp | `/inventory/stock-return-request` | `STOCK_RETURN_REQUEST_LIST` |

Mọi việc của phân hệ này nằm trên **menu "Xử lý"** của từng dòng, hoặc nút **"Gom phiếu (N)"** ở góc
trên bên phải, hoặc khối **"Các đợt trả nhà cung cấp"** trong drawer chi tiết. 🚫 Không có route riêng.

## 2. API — đối chiếu hai đầu FE ↔ BE

Base `/stock/v2/stock-return-request` (`ReturnRequestController.java:22`).

| Việc | Method + path | FE | BE |
|---|---|---|---|
| Gom phiếu | `POST .../consolidate` | `stockReturnRequestApi.js` | `:126` |
| Tách phiếu | `POST .../{id}/split` | ✓ | `:135` |
| Nhập hàng về kho tỉnh | `POST .../{id}/receive-to-province` | ✓ | `:154` |
| Trả hàng NCC | `POST .../{id}/return-to-supplier` | ✓ | `:144` |
| Nhập lại kho | `POST .../{id}/restock` | ✓ | `:164` |
| Huỷ vỡ hỏng | `POST .../{id}/dispose` | ✓ | `:174` |
| Gửi lên TCT | `POST .../{id}/send-to-tct` | ✓ | `:228` |
| Danh sách đợt trả | `GET .../{id}/supplier-batches` | ✓ | `:184` |
| NCC xác nhận đợt | `POST .../supplier-batches/{batchId}/confirm` | ✓ | `:193` |
| NCC từ chối đợt | `POST .../supplier-batches/{batchId}/reject` | ✓ | `:202` |
| Quyết định phần bị từ chối | `POST .../supplier-batches/{batchId}/resolve-rejection` | ✓ | `:213` |

Không lệch dòng nào. ⚠️ Toàn bộ là pod-service, 🚫 không có prefix `/report` hay `/export`.

## 3. Nhãn hiển thị thật

### 3.1 Tiêu đề và nút chính của ba việc xử lý hàng (`ProcessActionDrawer.jsx:16-18`)

| `action` | Tiêu đề | Nút chính |
|---|---|---|
| `RETURN` | Trả hàng nhà cung cấp | **Trả hàng** |
| `RESTOCK` | Nhập lại kho | **Nhập lại kho** |
| `DISPOSE` | Huỷ hàng vỡ hỏng | **Xác nhận huỷ** |

Bảng của cả ba: `STT` · `Sản phẩm` · `Còn lại` · `SL xử lý` · `Serial` (placeholder `Nhập/quét serial`).

### 3.2 Tám trạng thái đợt trả (`SupplierBatchSection.jsx:14-27`)

`Chờ NCC xác nhận` · `Chờ đối soát hoá đơn` · `Đã xử lý xong` · `NCC từ chối — chờ xử lý` ·
`NCC từ chối — đã huỷ hàng` · `NCC từ chối — đã nhập lại kho` · `NCC từ chối — đã hoàn về điểm bán`

🔴 `CONFIRMED` hiển thị là **"Chờ đối soát hoá đơn"** màu cam, 🚫 không phải "Đã xác nhận". Nghĩa là NCC
đã nhận hàng nhưng **công nợ CHƯA được ghi giảm** vì chứng từ thuế chưa chốt.

### 3.3 Nút quyết định khi NCC từ chối (`SupplierBatchSection.jsx:29-40`) — đổi theo `rejectStage`

| Cấp giữ hàng | Nút |
|---|---|
| `BUU_DIEN_TINH` | `Huỷ hàng` (đỏ) · `Nhập kho tỉnh` · `Hoàn về điểm bán` (chính) |
| `TONG_CONG_TY` | `Huỷ hàng` (đỏ) · `Nhập kho TCT` · `Hoàn về tỉnh` (chính) |

Nút `Hoàn về điểm bán` **bị ẩn** khi hàng đã nhập về kho tỉnh.

Tiêu đề hộp xác nhận (`:43-48`): `Huỷ hàng bị NCC từ chối (không phát sinh công nợ)?` ·
`Nhập lại số hàng này vào kho của cấp bạn?` · `Hoàn kho xuống cấp tỉnh để tỉnh quyết định tiếp?` ·
`Hoàn số hàng này về kho điểm bán gốc?`

### 3.4 Hộp xác nhận trên danh sách (`StockReturnRequestListPage.jsx`)

`Gom N phiếu Đã duyệt?` (ô ghi chú placeholder `Ghi chú (tuỳ chọn)`) · `Tách phiếu theo nhà cung cấp?`
· `Gửi phiếu lên Tổng công ty?` · `Nhập hàng về kho tỉnh` (modal riêng, placeholder
`Chọn kho nhận hàng`).

Nội dung hộp tách **đổi theo cấp**: tỉnh → *"Hệ thống sẽ tách sản phẩm tự doanh theo NCC cấp tỉnh và
tách riêng hàng Tổng công ty."*; TCT → *"Hệ thống sẽ tách các sản phẩm theo đúng nhà cung cấp ban đầu"*.

## 4. Thông báo — nguyên văn từ code

### 4.1 Frontend

| Tình huống | Nguyên văn |
|---|---|
| Gom < 2 phiếu | `Chọn ít nhất 2 phiếu Đã duyệt để gom` |
| Gom xong | `Đã gom phiếu` · lỗi: `Không gom được phiếu` |
| Tách lỗi | `Không tách được phiếu` |
| Tách — chỉ 1 NCC | `Phiếu chỉ có 1 nhà cung cấp — đã gán: <tên NCC>` |
| Tách — toàn hàng TCT | `Phiếu chỉ gồm sản phẩm của Tổng công ty — đã chuyển 'Chưa gửi TCT'` |
| Tách — trường hợp khác | `Đã xử lý phiếu` |
| Gửi TCT | `Đã gửi lên TCT` · lỗi: `Không gửi được` |
| Nhập kho tỉnh | `Đã nhập hàng về kho tỉnh` · thiếu kho: `Vui lòng chọn kho nhận hàng` |
| Xử lý hàng | `Xử lý thành công` |
| Chưa nhập SL | `Vui lòng nhập số lượng xử lý cho ít nhất 1 sản phẩm` |
| Lệch serial | `Sản phẩm "<tên>" quản lý serial: số serial phải bằng số lượng (<n>)` |
| Đợt trả — xác nhận | `Đã xác nhận đợt trả` |
| Đợt trả — từ chối | `Đã ghi nhận NCC từ chối — chờ quyết định xử lý` |
| Đợt trả — quyết định | `Đã xử lý` |
| Chưa có đợt trả | `Chưa có đợt trả` |

### 4.2 Backend — `ReturnRequestService.java`

| Dòng | Nguyên văn |
|--:|---|
| 891 | `Chỉ cấp tỉnh/TCT được gom phiếu trả` |
| 894 | `Chọn ít nhất 2 phiếu để gom` |
| 902 | `Phiếu <mã> chưa ở trạng thái Đã duyệt — không gom được` |
| 906 | `Phiếu <mã> là phiếu con/phiếu tổng — không gom được` |
| 912 | `Phiếu <mã> không thuộc phạm vi tỉnh của bạn` |
| 916 | `Các phiếu gom phải cùng chuỗi` |
| 970 | `Các phiếu gom không còn sản phẩm hiệu lực` |
| 989 | `Chỉ gửi TCT được phiếu con hàng TCT (Chưa gửi TCT)` |
| 1000 | `Không xác định được đơn vị đã nhập lô hàng từ nhà cung cấp (truy xuất nguồn gốc thất bại hoặc các dòng hàng thuộc nhiều đơn vị nhập khác nhau)` — `ERROR_RETURN_ORIGIN_SHOP_NOT_FOUND` |
| 1051 | `Phiếu không còn hàng để gửi lên Tổng công ty` — `ERROR_RETURN_NOTHING_TO_SEND` |
| 1060 | `Không xác định được kho tỉnh đang giữ hàng của phiếu` — `ERROR_RETURN_HOLDER_NOT_FOUND` |
| 1114 | `Không thể hủy phiếu đã xử lý/đã tách/đã gom` |
| 1452 | `Phiếu con chưa gắn nhà cung cấp` |
| 1512 | `Chỉ nhập kho được phiếu đã duyệt và đang treo hàng` — `ERROR_RETURN_NOT_APPROVED` |
| 1516 | `Hàng của phiếu này đã được nhập về kho tỉnh` — `ERROR_RETURN_ALREADY_RECEIVED` |
| 1521 | `Phiếu chưa khoá tồn ở kho điểm bán nên không có hàng đang treo` — `ERROR_RETURN_NOT_RESERVED` |
| 1562 | `Thiếu shop nhận hàng hoặc kho đích` — `ERROR_PROVINCE_INVENTORY_REQUIRED` |
| 1589 | `Phiếu không còn hàng đang treo để nhập kho` — `ERROR_RETURN_NOTHING_TO_RECEIVE` |
| 2025 | `Không tìm thấy đợt trả` |
| 2027 | `Đợt trả không ở trạng thái chờ xử lý` |
| 2030 | `Không đúng cấp xử lý hàng bị từ chối` |
| 2087 | `Hàng đã nhập về kho tỉnh nên không hoàn về điểm bán được — chọn Nhập lại kho hoặc Huỷ vỡ hỏng` — `ERROR_RETURN_ALREADY_IN_PROVINCE` |
| 2107 | `Quyết định không hợp lệ` |
| 2136 | `Đợt trả đã được xử lý (xác nhận/từ chối)` |
| 2181 | `Phiếu con chưa ở trạng thái xử lý được` |
| 2197 | `Thiếu danh sách item xử lý` |
| 2205 | `Item xử lý không hợp lệ` |
| 2206 | `Item không thuộc phiếu` |
| 2208 | `Vượt số lượng còn lại: yêu cầu <x>, còn <y>` |
| 2211 | `Số serial (<n>) phải bằng số lượng xử lý (<m>)` |
| 2324 | `Chỉ cấp tỉnh/TCT được tách phiếu` |
| 2329 | `Phiếu không thuộc phạm vi tỉnh của bạn` |
| 2334 | `Phiếu chưa ở trạng thái có thể tách` |
| 2341 | `Phiếu không có sản phẩm để tách` |

⚠️ Nhãn tiếng Việt trong code ở dạng **NFD** — script phải `normalize("NFC")` trước khi so chuỗi.

## 5. Vai

| Nhóm | Vai HDSD khai | Vai dùng trong case |
|---|---|---|
| `010` gom · `020` tách · `040` xử lý · `060` đợt trả | `BUU_DIEN_TINH` `TONG_CONG_TY` | `province`, `tct` cho case khác cấp, `shop`/`ward` cho case phạm vi |
| `030` nhập kho tỉnh · `050` gửi TCT | **chỉ** `BUU_DIEN_TINH` | `province` |

🔴 Nhóm `060` **bắt buộc** hai vai: `province` và `tct`. Cụm nút quyết định chỉ hiện khi
`b.rejectStage === orgLevel`, nên một tài khoản 🚫 không kiểm được cả hai nhánh.

## 6. Phân loại

| Nhãn | Số case |
|---|--:|
| `READY_WITH_CODE_LOOKUP` | 39 |
| `BLOCKED` | 69 |

## 7. 🔴 Case ghi dữ liệu — 69/108, chưa ai được phép chạy

**Đây là phân hệ nguy hiểm nhất trong cả bộ.** Không thao tác nào hoàn tác được bằng UI:

| Nhóm | Hậu quả nếu chạy nhầm |
|---|---|
| `010` gom | Phiếu nguồn khép ở "Đã gom phiếu" **vĩnh viễn** — 🚫 không có chức năng tách ngược |
| `020` tách | Sinh phiếu con, phiếu gốc sang "Đã tách phiếu" — 🚫 không gộp lại được, và từ đó **không sửa, không huỷ** |
| `030` nhập kho tỉnh | **Tăng tồn thật** ở kho tỉnh; chỉ làm được **một lần**/phiếu |
| `040` nhập lại kho | **Tăng tồn thật** ở kho tỉnh/TCT |
| `040` huỷ vỡ hỏng | **Xoá hàng khỏi sổ**, không kho nào nhận lại |
| `040` trả hàng NCC | Phát sinh **đợt trả** — chứng từ với nhà cung cấp |
| `050` gửi TCT | Đẩy chứng từ lên cấp trên, **tỉnh hết quyền thao tác**; nếu hàng đã ở kho tỉnh thì **xuất khỏi kho tỉnh** |
| `060` NCC xác nhận | Khởi động chuỗi **ghi giảm công nợ NCC** và công nợ nội bộ |
| `060` hoàn về điểm bán | **Tăng tồn thật** ở kho điểm bán |

## 8. Quét 11 kỹ thuật mục 3.4

| # | Kỹ thuật | Case |
|--:|---|---|
| 1 | Ô bắt buộc | `030_002` `030_004` `030_009` `040_008` `040_020` |
| 2 | Khoảng trắng | — 🔴 **không áp dụng**: phân hệ này 🚫 không có ô nhập chữ tự do nào bắt buộc. Hai ô text (`Ghi chú` khi gom, `Lý do từ chối` đợt trả) đều **tuỳ chọn** ⇒ ghi lý do bỏ thay vì dựng case rỗng |
| 3 | Giá trị biên | `010_004` `010_005` `040_009`–`040_012` |
| 4 | Kiểu dữ liệu sai | `040_021` `040_022` `060_019` `060_021` |
| 5 | Tính duy nhất | `010_005` (hai id trùng trong lệnh gom) |
| 6 | Trạng thái × hành động | `010_008` `010_009` `010_016` `020_009`–`020_011` `020_015` `030_005` `030_006` `040_019` `040_025` `050_002` `060_018` `060_020` |
| 7 | Danh sách | `010_001` `010_002` `020_007` `060_001` `060_002` `060_024` |
| 8 | Tìm kiếm | `020_007` (tìm theo mã phiếu gốc ra cả phiếu con) — phần còn lại thuộc `14_1` nhóm `030`, 🚫 không dựng lại |
| 9 | Huỷ giữa chừng | `010_015` `020_016` `030_013` `040_024` `060_023` |
| 10 | Phạm vi theo vai | `010_010` `010_013` `010_014` `020_012` `020_013` `030_012` `040_023` `060_009` `060_016` `060_017` |
| 11 | Sau khi ghi | `010_006` `020_004`–`020_006` `030_001` `030_010` `040_003`–`040_007` `040_016` `040_017` `050_005` `050_006` `060_003` `060_004` `060_013`–`060_015` |

Luật rẻ tiền: màn xử lý hàng có **2** ô nhập bắt buộc (`SL xử lý`, `Serial`) và có 25 case — đạt.
Màn nhập kho tỉnh có **1** ô bắt buộc (`Kho nhận`) và có 13 case — đạt.

## 9. 🔴 Lỗ hổng và mâu thuẫn đặc tả — 🚫 không tự sửa

| # | Vấn đề |
|--:|---|
| a | 🔴 **HDSD 050 nói sai về việc hàng có di chuyển hay không.** HDSD ghi *"Hàng **không di chuyển vật lý** ở bước này. Đây chỉ là chuyển quyền xử lý chứng từ"*. Nhưng code (`ReturnRequestService.java:1730-1745`) — khi `entity.dangGiuHangOKhoTinh()` — **sinh phiếu XUẤT khỏi kho tỉnh** với lý do *"gửi lên TCT = bàn giao hàng đi"*, chính comment trong code giải thích là để tránh tồn ảo. ⇒ Tồn kho tỉnh **giảm thật**. Case `14_2_050_005` (chưa nhập kho) và `050_006` (đã nhập kho) dựng để phơi hai nhánh. **Cần user quyết sửa HDSD hay sửa code.** |
| b | 🔴 **Lý do từ chối đợt trả: HDSD nói bắt buộc, code nói tuỳ chọn.** HDSD 060 bước 5: *"Nhập lý do từ chối vào ô văn bản rồi bấm OK"*. Code: placeholder `Lý do từ chối (tuỳ chọn)`, 🚫 không có phép kiểm nào. Case `060_007`. ⚠️ Khác hẳn **từ chối PHIẾU** ở `14_1` — chỗ đó lý do **bắt buộc** thật. Hai chỗ cùng chữ "từ chối" nhưng luật ngược nhau là nguồn nhầm lẫn cho tester. |
| c | 🔴 **Chuỗi "gom < 2 phiếu" có HAI bản khác nhau.** FE: `Chọn ít nhất 2 phiếu Đã duyệt để gom`; BE: `Chọn ít nhất 2 phiếu để gom`. Script kiểm chuỗi phải biết mình đang chạm lớp nào. |
| d | 🔴 **`CONFIRMED` hiển thị là "Chờ đối soát hoá đơn", không phải "đã xong".** HDSD 060 phần **Kết quả** viết *"Xác nhận thì hệ thống báo Đã xác nhận đợt trả và **ghi giảm công nợ** nhà cung cấp"* — sai thời điểm. Code chỉ giảm công nợ khi hoá đơn điều chỉnh chốt xong (đợt sang `SETTLED`). Mâu thuẫn ngay trong chính HDSD 060: phần **mẹo** ở cuối lại nói đúng. Case `060_004` `060_005`. |
| e | **Task 40 không nói huỷ vỡ hỏng có ghi bút toán chi phí hay không.** Hàng biến mất khỏi sổ mà không có vế đối ứng nào được mô tả. Case `040_005` mới kiểm được phần tồn kho. |
| f | **Task 10 không nói phiếu tổng mang trạng thái gì.** Đã trace: phiếu nguồn sang `CONSOLIDATED`, còn phiếu tổng mang trạng thái nào thì code chưa đọc hết — case `010_006` ghi kỳ vọng ở mức đo được (tổng tiền + thẻ phiếu nguồn). |
| g | **Gom phiếu 🚫 không kiểm nhà cung cấp.** Code chỉ chặn khác chuỗi và khác tỉnh. Gom được phiếu của hai NCC khác nhau, rồi sau đó phải tách ra lại — vòng vô ích. Chưa dựng case vì chưa rõ là ý đồ (tách lo phần phân loại) hay thiếu sót. |
| h | **Không có phép kiểm số nguyên cho `SL xử lý`.** `InputNumber` chỉ khai `min` và `max`. Huỷ vỡ hỏng 2,5 cái là hợp lệ về mặt code. |

## 10. Nguồn đã dùng — và chỗ chưa làm

| Nguồn | Mức |
|---|---|
| HDSD | đọc **trọn 6/6 file** `hdsd14_2_*/tasks/*.md`, kể cả khối ⚠️ và 💡 |
| Sheet QC | 🚫 không phủ phân hệ này (`doi-chieu-goc.js` trả `—`) |
| FE | `StockReturnRequestListPage.jsx` · `ProcessActionDrawer.jsx` · `ReceiveToProvinceModal.jsx` · `SupplierBatchSection.jsx` · `statusConfig.js` · `stockReturnRequestApi.js` |
| BE | `ReturnRequestService.java` (grep trọn `PodException(`, đọc nguyên văn 34 chuỗi) · `ReturnRequestController.java` (đối chiếu 11 path) |

🔴 **Chưa làm:**

1. 🚫 **Chưa chạy SELECT kiểm dữ liệu thật.** Mọi con số trong tiền điều kiện (`Còn lại = 5`,
   `đợt bị từ chối 5 đơn vị`) là **giá trị mẫu**.
2. 🚫 **Chưa đọc** `CreditNoteBatchBlock` (khối hoá đơn điều chỉnh trong khung đợt trả) — nó thuộc
   phân hệ **`14_3` Hoá đơn hàng trả lại**. Case `060_022` vì thế chỉ kiểm *khối đó có hiện hay không*,
   🚫 không kiểm nội dung bên trong.
3. `split()` (`ReturnRequestService.java:2320-2530`) mới đọc phần **tiền điều kiện và trạng thái
   kết quả**; phần thuật toán gom nhóm theo NCC và bung item đa nguồn 🚫 chưa đọc ⇒ chưa dựng được
   case cho hàng **một dòng thuộc nhiều PO / nhiều NCC**, vốn là chỗ dễ sai nhất của tách phiếu.

## 🔴 Kết quả chạy script — 20/09/2026

**108/108 case có script.** Lượt chạy: **0 đạt · 0 đỏ · 108 skip**.

Bốn case đọc (`010_001` `010_002` `010_003` `010_015`) đã viết đầy đủ phép kiểm — ô chọn chỉ bật
với phiếu **Đã duyệt**, nhãn nút **"Gom phiếu (N)"** đổi theo số phiếu tích, dưới 2 phiếu thì nút
khoá, đóng hộp xác nhận thì 🚫 không gửi request và ô tích còn nguyên — nhưng **skip** vì phạm vi
tỉnh hiện **chưa có phiếu xuất trả nào**.

🔴 Muốn mở khoá: cần ít nhất **2 phiếu trả ở trạng thái "Đã duyệt"** trong phạm vi tỉnh.
🚫 Auto test không tự lập — lập phiếu là xuất hàng thật khỏi kho điểm bán.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `14_2_010_017` | Gom xong không tách ngược về phiếu cũ được | Chờ chốt với QC | 🔴 Không có chức năng nào hoàn tác việc gom. Phiếu nguồn khép ở "Đã gom phiếu" vĩnh viễn — đây là hành vi đúng theo HDSD, case này để chốt lại với QC |

**1/108 case** của phân hệ này chưa chốt được kỳ vọng.
