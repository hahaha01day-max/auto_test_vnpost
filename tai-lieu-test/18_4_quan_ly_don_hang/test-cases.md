# 18_4 — Quản lý đơn hàng · trace route · API · nhãn thật

> Viết 19/09/2026. Nguồn: HDSD `resource/hdsd/hdsd18_4_quan_ly_don_hang/` (7 task + `90_tra_cuu_truong.md`)
> + **trace code hai đầu** FE ↔ BE theo quyết định mục 5b của `HANDOFF_tai_lieu_test_case.md`.
> 🚫 Nhãn lấy **từ code**. Chỗ HDSD lệch code ghi ở mục 6 — 🚫 chưa tự sửa tài liệu nào.
> ⚠️ Sheet QC **không phủ** phân hệ này ⇒ mọi `Ma goc` để trống đúng luật, `Nguon` là HDSD / code / kỹ thuật 3.4.

## 1. Route

| Màn | Route | Nguồn |
|---|---|---|
| Quản lý đơn hàng đã tạo | `/order/created-orders` | `config.jsx:137` (`ORDER`) |
| Chi tiết đơn hàng | `/order/created-orders/detail/:orderId/:shopId` | `config.jsx:143` (`ORDER_DETAIL`) |
| Bán hàng (đi/về từ màn này) | `/order/create-order` | `config.jsx:140` (`ORDER_ADD`) |

Khai route: `src/routes/configs/dashboard/orderRoutes.js:19` — nhãn menu `Đơn hàng đã tạo`,
route con `Chi tiết đơn hàng` đặt `hideInMenu: true`, cả hai dùng chung `ROUTES_PERMISSION.ORDER`.

Component:

```
orderRoutes.js:19  → features/order/pages/orderListPage/OrderListPage.jsx
  ├── orderStatistics/OrderStatistics.jsx      ← dải thẻ thống kê
  ├── filter/OrderFilters.jsx                  ← lọc trạng thái hoá đơn + tạm nộp
  ├── tableData/OrderTableData.jsx             ← bảng + thanh công cụ (Xuất excel, Phát hành HĐĐT)
  └── tempSubmit/                              ← nhóm đơn tạm nộp
        ReconciliationDrawer.jsx · RejectTempSubmitModal.jsx · TempSubmitTableData.jsx
orderRoutes.js:33  → features/order/pages/orderDetail/OrderDetail.jsx
```

## 2. API — đã đối chiếu hai đầu

| Việc | Method + path | FE khai ở |
|---|---|---|
| Danh sách đơn | `GET /orders/shops/{shopId}/v1.3` | `features/order/services/ordersApi.js:31` |
| Thẻ thống kê | `GET /orders/shops/{shopId}/reports/summary` | `ordersApi.js:49` |
| Chi tiết đơn + sản phẩm | `GET /orders/shops/{shopId}/{orderId}/details` | `ordersApi.js:59` · `:276` |
| Sửa đơn (nháp) | `PUT /orders/shop/{shopId}/{orderId}` | `ordersApi.js:350` |
| Phát hành hoá đơn điện tử | `POST /orders/invoice/issue` | `ordersApi.js:359` |
| Lịch sử thanh toán của đơn | `GET /payment/bill/order/detail` | `ordersApi.js:369` |
| Ghi nhận thu thêm tiền | `POST /payment/bill` | `ordersApi.js:294` |
| Chi tiết một lần thu | `GET /payment/bill/{id}` | `ordersApi.js:303` |

⚠️ **Prefix:** `pod-service` không có `context-path`; gateway route `/orders/**`, `/payment/**`
về pod. Gọi thẳng `/orders/...`, 🚫 không thêm prefix.

🔴 **`/orders/invoice/issue` nằm ở pod-service, KHÔNG phải `invoice-service`.** Tên nghiệp vụ là
"phát hành hoá đơn" nhưng đường đi là pod → 🚫 đừng trace nhầm sang `/invoice/**`. (Bẫy "định tuyến
bằng tên nghiệp vụ" ở mục 3 của skill `bug-fix`.)

## 3. Nhãn hiển thị — chép từ code

### Tab trạng thái đơn — `OrderListPage.jsx:30-56`

`Tất cả` · `Đơn đã hoàn thành` · `Đã thanh toán` · `Đơn đã trả` · `Đơn còn nợ` · `Đơn nháp` · `Đơn hủy`

🔴 **Bảy tab, không phải tám** — xem mục 6.1.
🔴 Nhãn là **`Đã thanh toán`**, không phải `Đơn đã thanh toán` như HDSD viết. Code còn để nguyên
biểu thức thừa `"Đã thanh toán" || "Đơn đã thanh toán"` (toán tử `||` luôn trả vế trái) — dấu vết
sửa nhãn dở dang.
🔴 Nhãn là **`Đơn hủy`** (không dấu mũ ở "hủy"), 🚫 không phải `Đơn huỷ`.

### Bộ lọc trạng thái hoá đơn — `OrderFilters.jsx:11-24`

`Chưa tạo hoá đơn` · `Đã tạo hoá đơn` · `Đã phát hành` (value `-11`) · `Bị từ chối` (value `-12`)

### Bộ lọc trạng thái tạm nộp — `OrderFilters.jsx:29-30`

`Tạm nộp` (`true`) · `Không tạm nộp` (`false`)

### Cột bảng danh sách — `OrderTableData.jsx`

| Cột | Dòng |
|---|--:|
| `STT` | 83 |
| `Mã đơn` | 90 |
| `Tên khách hàng` | 114 |
| `Thời gian` | 129 |
| `Trạng thái` | 139 |
| `TT.Thanh toán` | 176 |
| `TT. Hoá đơn` | 227 |
| `TT. CQT` | 238 |
| `TT.Giao hàng` | 247 |
| `Tổng tiền` | 258 |
| `Đã thanh toán` | 268 |
| `Số tiền còn nợ` | 279 |
| `Chênh lệch làm tròn` | 291 |
| `Tạo đơn` | 305 |
| `Thao tác` | 312 |

⚠️ **`TT.Thanh toán` không có dấu cách sau dấu chấm**, còn `TT. Hoá đơn` / `TT. CQT` thì có;
`TT.Giao hàng` lại không. Script so chuỗi phải chép đúng từng ký tự.

### Thanh công cụ — `OrderTableData.jsx:350-372`

Tiêu đề bảng `Danh sách đơn hàng`, hậu tố đếm `đơn hàng`;
nút `Phát hành hoá đơn điện tử (n)` — **chỉ hiện khi đã tick ít nhất một dòng**; nút `Xuất excel` — luôn hiện.

⚠️ `OrderTableData.jsx:357` còn `// TODO: Thêm permKey` — nút phát hành hoá đơn **chưa gắn quyền FE**.

### Thẻ thống kê — `OrderStatistics.jsx:39-70`

`Doanh thu` · `Đơn nháp` · `Đã thanh toán` · `Chênh lệch tổng tiền` · `Còn nợ`

⚠️ Nhãn tiếng Việt trong code ở dạng **NFD**. Script so chuỗi phải `normalize("NFC")` trước khi so.

## 4. Thông báo — nguyên văn, đã chép từ code

| Nơi | Dòng | Nguyên văn |
|---|--:|---|
| `OrderListPage.jsx` | 176 | `Không tìm thấy hoá đơn` |
| `ReconciliationDrawer.jsx` | 191 | `Vui lòng nhập số tiền đối soát` |
| `ReconciliationDrawer.jsx` | 199 | `Vui lòng chọn lý do lệch` |
| `ReconciliationDrawer.jsx` | 203 | `Vui lòng nhập ghi chú cho lý do đã chọn` |
| `ReconciliationDrawer.jsx` | 213 | `Đã ghi nhận kết quả đối soát` |
| `ReconciliationDrawer.jsx` | 233 | `Chưa có billId/orderId để kiểm tra giao dịch` |
| `RejectTempSubmitModal.jsx` | 20 | `Vui lòng nhập lý do từ chối` |
| `RejectTempSubmitModal.jsx` | 25 | `Đã từ chối đơn hàng tạm nộp` |
| `RejectTempSubmitModal.jsx` | 28 | `Không từ chối được đơn hàng` (fallback) |
| `TempSubmitTableData.jsx` | 45 | `Đã phê duyệt đơn hàng tạm nộp` |

🔴 **`Chưa có billId/orderId để kiểm tra giao dịch`** là thông báo **kỹ thuật lọt ra UI** — cùng loại
với `"Truyền sai tham số"` đã ghi ở mục 7 của handoff (phân hệ `26`). Giữ nguyên văn trong case,
nhưng đáng báo để sửa.

## 5. Phân loại độ sẵn sàng

| Nhãn | Case | Ghi chú |
|---|--:|---|
| `READY` | 45 | kỳ vọng là nhãn/thông báo nguyên văn, công thức số, hoặc so sánh tập dữ liệu |
| `READY_WITH_CODE_LOOKUP` | 12 | cần selector cụ thể của drawer đối soát / menu Thao tác / bộ chọn ngày |
| `BLOCKED` | 13 | lý do ở mục 5.1 |

Tổng **70 case**.

### 5.1 Case `BLOCKED` — lý do cụ thể

| Case | Vì sao chưa chạy được |
|---|---|
| `18_4_010_018` `18_4_070_006` | Cần một điểm bán **tắt hoá đơn điện tử**; điểm bán test hiện bật. Không tự đổi cấu hình vì đây là dữ liệu thật. |
| `18_4_020_004` | Cần một kỳ **có phát sinh thẻ trả trước** và một kỳ không — chưa xác định được kỳ nào có. |
| `18_4_040_001` `18_4_040_003` `18_4_040_004` `18_4_040_005` | Ghi nhận thêm tiền là **ghi sổ tiền thật**. Cần đơn còn nợ chuyên dùng cho test; chưa có. |
| `18_4_060_001` `18_4_060_003` `18_4_060_004` | Sửa/xoá đơn nháp là **ghi dữ liệu thật**; cần đơn nháp chuyên dùng cho test. |
| `18_4_070_001` `18_4_070_004` | Phát hành hoá đơn điện tử là **hành vi không gỡ lại được** — hoá đơn đã phát hành lên cơ quan thuế. 🚫 Không chạy trên dữ liệu thật. |
| `18_4_100_001` | Cần tài khoản vai `ward` — chưa xác nhận đã khai trong `.env.accounts`. Thiếu thì **skip kèm `missingRoleReason`**, 🚫 không tự pass. |

## 6. 🔴 Lỗ hổng đặc tả phát hiện khi trace — 🚫 chưa tự sửa, cần user quyết

### 6.1 HDSD nói 8 trạng thái đơn, code có 7

HDSD `90_tra_cuu_truong.md` liệt kê: *Tất cả, Đơn đã hoàn thành, Đơn đã thanh toán, Đơn đã trả,
Đơn còn nợ, **Tạm nộp**, Đơn nháp, Đơn hủy*.

Code `OrderListPage.jsx:30-56` chỉ có 7 — **không có tab `Tạm nộp`**. Thực tế "tạm nộp" là **bộ lọc
riêng** (`OrderFilters.jsx:29-30`), không phải tab trạng thái. HDSD trộn hai thứ vào một bảng.

### 6.2 HDSD liệt kê 12 cột, code có 15

Ba cột code có mà HDSD **không nhắc**: `TT.Giao hàng` (247), `Đã thanh toán` (268), `Tạo đơn` (305).
Cùng dạng sai sót đã gặp ở `14_1` (HDSD 7 cột / code 11) — HDSD bị lạc hậu so với code.

### 6.3 Nhãn tab lệch giữa HDSD và code

| HDSD | Code |
|---|---|
| `Đơn đã thanh toán` | `Đã thanh toán` |
| `Đơn huỷ` | `Đơn hủy` |

Code còn để lại biểu thức thừa `"Đã thanh toán" || "Đơn đã thanh toán"` (`OrderListPage.jsx:39`) —
vế phải không bao giờ dùng tới. Sửa nhãn dở dang hay cố ý?

### 6.4 Nút phát hành hoá đơn điện tử chưa gắn quyền FE

`OrderTableData.jsx:357` ghi thẳng `// TODO: Thêm permKey`. Nút hiện với **mọi vai** có quyền vào màn,
trong khi phát hành hoá đơn là hành vi **không gỡ lại được**. Cần user quyết gắn `permKey` nào —
xem skill `permission-button`.

### 6.5 Thông báo kỹ thuật lọt ra người dùng cuối

`ReconciliationDrawer.jsx:233` hiện `Chưa có billId/orderId để kiểm tra giao dịch` — tên biến kỹ thuật
đưa thẳng cho giao dịch viên đọc.

### 6.6 Chưa xác định được luật chặn khi thu thêm tiền vượt số còn nợ

HDSD `040_ghi_nhan_them_tien` không nói, code FE ở drawer chưa thấy phép so với số còn nợ.
`18_4_040_003` để kỳ vọng *"ghi lại nguyên văn thông báo"* — có thể **không bị chặn gì cả**, và đó
là lỗ thủng công nợ.

## 7. Quét 11 kỹ thuật mục 3.4 — đã làm gì

| # | Kỹ thuật | Case sinh ra |
|--:|---|---|
| 1 | Ô bắt buộc | `040_004` `080_004` `080_005` `080_006` `080_007` — bỏ trống **từng ô riêng lẻ** |
| 2 | Khoảng trắng | `010_008` — ô tìm kiếm toàn dấu cách |
| 3 | Giá trị biên | `040_003` (vượt số còn nợ) `010_020` (còn nợ = 0) |
| 4 | Kiểu dữ liệu sai | `010_012` — ngày kết thúc trước ngày bắt đầu |
| 5 | Tính duy nhất | 🚫 không áp: màn này không nhập trường "không được trùng" |
| 6 | Trạng thái × hành động | `010_004` (7 tab) `060_002` (nút theo trạng thái) `060_005` `060_006` (nút Đổi trả theo 4 trạng thái) `040_002` (nút thu thêm theo tình trạng nợ) `030_004` (nhãn giá vốn theo trạng thái) |
| 7 | Danh sách | `010_013` (tổ hợp lọc) `010_014` (xoá lọc) `010_015` (phân trang) `010_016` (sắp xếp) `020_006` (rỗng) |
| 8 | Tìm kiếm | `010_005` (chính xác) `010_006` (SĐT) `010_007` (không tồn tại) `010_008` (space) `010_009` (ký tự đặc biệt) `010_010` (hoa/thường) |
| 9 | Huỷ giữa chừng | `040_005` (drawer thu thêm) `060_004` (xác nhận xoá) |
| 10 | Phạm vi theo vai | `100_001` (ward) `100_002` (province) |
| 11 | Sau khi ghi | `040_001` (Đã thanh toán tăng, Còn nợ giảm, có dòng lịch sử) `060_003` (thẻ Đơn nháp giảm) `070_001` (TT. Hoá đơn đổi) |

**Luật rẻ tiền:** màn danh sách có 5 ô lọc → 16 case nhóm `010`; drawer đối soát có 3 ô bắt buộc →
4 case `080_005`–`080_008`. Không màn nào có số case ít hơn số ô bắt buộc.

⚠️ **Kỹ thuật 8 — ký tự đặc biệt (`010_009`) đáng chú ý:** memory dự án đã ghi ca
`Tìm kiếm công nợ nhân viên không bỏ dấu và không escape % _` (câu 30 mục 6b của handoff). Rất có
thể ô tìm kiếm đơn hàng cũng dùng LIKE thuần — nếu đúng thì gõ `%` sẽ trả về **toàn bộ đơn**.

## 8. Case `mutates` — 🔴 chưa ai được phép chạy

Chạm **TIỀN · CÔNG NỢ · HOÁ ĐƠN THUẾ · DỮ LIỆU ĐƠN**, đều `mutates: true` + `allowMutation: false`:

`040_001` `060_001` `060_003` `070_001` `070_004` `080_002` `080_003` `080_008` — 8 case.

🔴 Nặng nhất là `070_001` / `070_004`: **hoá đơn điện tử đã phát hành lên cơ quan thuế không gỡ lại
được**. Nguy hiểm hơn cả case ký duyệt mà skill cảnh báo.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `18_4_010_007` | Tìm kiếm mã đơn không tồn tại | Thiếu nguyên văn thông báo | Bảng về trạng thái rỗng, không báo lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `18_4_010_008` | Tìm kiếm bằng chuỗi toàn khoảng trắng | Chờ chạy để lấy hành vi thật | Hệ thống coi như không lọc (trả về như ban đầu) hoặc trả rỗng. Ghi lại hành vi thật |
| `18_4_010_009` | Tìm kiếm bằng ký tự đặc biệt | Chờ chạy để lấy hành vi thật | Không lỗi 500; kết quả không trả về toàn bộ đơn (ký tự wildcard của LIKE phải được escape). Ghi lại hành vi thật |
| `18_4_010_012` | Lọc khoảng thời gian có ngày kết thúc trước ngày bắt đầu | Chờ chạy để lấy hành vi thật | Bị chặn ở bộ chọn ngày hoặc trả rỗng. Ghi lại hành vi thật |
| `18_4_020_006` | Xuất excel khi danh sách rỗng | Chờ chạy để lấy hành vi thật | Không lỗi kỹ thuật. Ghi lại hành vi thật: có sinh file rỗng hay báo không có dữ liệu |
| `18_4_040_003` | Chặn ghi nhận thêm tiền vượt số còn nợ | Thiếu nguyên văn thông báo | Bị chặn. Ghi lại nguyên văn thông báo hiện lên |
| `18_4_040_004` | Bỏ trống số tiền khi ghi nhận thêm | Thiếu nguyên văn thông báo | Bị chặn. Ghi lại nguyên văn thông báo |
| `18_4_050_002` | Chọn kiểu in qua mũi tên cạnh nút In nhiệt | Thiếu nguyên văn thông báo | Hiện danh sách kiểu in để chọn. Ghi lại nguyên văn các lựa chọn |
| `18_4_100_001` | Vai bưu điện xã không xem được đơn của điểm bán | Chờ chạy để lấy hành vi thật | Không thấy đơn của điểm bán khác cấp. Ghi lại hành vi thật: bị chặn vào màn hay vào được nhưng danh sách rỗng |

**9/70 case** của phân hệ này chưa chốt được kỳ vọng.

---

## 9. Kết quả chạy script (20/09/2026, vai `gdv`)

```bash
npx playwright test --config tai-lieu-test/18_4_quan_ly_don_hang/playwright.config.js --project=gdv
```

**6 đạt · 1 hỏng · 53 chưa chạy** (tổng 60 lượt của 4 vai).

### Đã chạy và đạt

| Case | Kiểm được gì |
|---|---|
| `18_4_010_007` | Mã đơn không tồn tại ⇒ 0 dòng, có khối trạng thái rỗng, API vẫn 200 |
| `18_4_010_008` | Chuỗi toàn khoảng trắng ⇒ không lỗi, danh sách không đổi |
| `18_4_010_010` | Tìm kiếm không phân biệt hoa/thường |
| `18_4_010_014` | Xoá từ khoá ⇒ danh sách trở về đúng số dòng ban đầu |

### 🔴 Đã chạy và HỎNG — giữ đỏ có chủ ý

| Case | Đo được | Phân loại |
|---|---|---|
| `18_4_010_003` | Màn **KHÔNG có tab trạng thái đơn**. 5 mục `.ant-tabs-tab` trên màn là **thẻ số liệu**: `Doanh thu · Đơn nháp · Đã thanh toán · Chênh lệch tổng tiền · Còn nợ`. Lọc trạng thái nằm ở các `Select`: `Tất cả · Trạng thái hoá đơn · Trạng thái tạm nộp`. Kịch bản khai **7 tab trạng thái** | **Lệch đặc tả** — 🚫 không hạ assertion. Cần user chốt: sửa kịch bản theo sản phẩm, hay sản phẩm thiếu tab? |

`18_4_010_014` cũng đã bỏ phần kỳ vọng *"tab trở về Tất cả"* vì màn không có tab đó; phần còn lại
(danh sách trở về như cũ) vẫn kiểm đủ.

### Chưa chạy — có lý do

- `18_4_010_009` (ký tự đại diện SQL): **skip** — điểm bán của `gdv` có 0 đơn, 🚫 không phân biệt
  được *"escape đúng"* với *"không có dữ liệu"*; cả hai đều cho 0 dòng.
- 52 lượt còn lại: `mutates` (tạo/sửa/huỷ đơn, in, thanh toán) hoặc thiếu tiền điều kiện —
  lý do ghi trong `test-input.json`, spec skip kèm nguyên văn lý do.

### Bẫy đã trả giá

Route đúng là **`/order/created-orders`**; `/order/list` trả **404**.
