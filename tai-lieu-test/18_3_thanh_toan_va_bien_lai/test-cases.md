# 18_3 — Thanh toán và biên lai · trace route · API · nhãn thật

> Viết 19/09/2026. Nguồn: HDSD `resource/hdsd/hdsd18_3_thanh_toan_va_bien_lai/` (đọc trọn,
> đặc biệt `90_tra_cuu_truong.md`) + **trace code hai đầu** FE ↔ BE theo quyết định mục 5b
> của `HANDOFF_tai_lieu_test_case.md`.
> 🚫 Nhãn dưới đây lấy **từ code**, không chép từ HDSD — chỗ nào HDSD lệch code đã ghi ở mục 6.

## 1. Route

| Màn | Route | Nguồn |
|---|---|---|
| Lập đơn / bán hàng tại quầy | `/order/create-order` | `vnpost-web/src/utils/constants/config.jsx:140` (`ORDER_ADD`) |
| Danh sách đơn đã tạo | `/order/created-orders` | `config.jsx:137` (`ORDER`) |
| Chi tiết đơn | `/order/created-orders/detail/:orderId/:shopId` | `config.jsx:143` |

Component nạp route: `AppRouter.jsx:152` → `@features/order/pages/createOrderPage/CreateOrderPage.jsx`.

🔴 **Chốt đúng component thanh toán — có hai bản gần giống nhau:**

```
CreateOrderPage.jsx:1494
  orderInfo?.status === ORDER_STATUS_ID.RETURN
    ? CreateOrderContent_v2  → OrderInfoTab_v2 → OrderCheckoutComponent_v2.jsx   ← CHỈ đơn TRẢ HÀNG
    : CreateOrderContent     → OrderInfoTab    → OrderCheckoutComponent.jsx      ← bán thường
```

Bộ case này bám **`OrderCheckoutComponent.jsx`**. 🚫 Đừng đọc `_v2` — nó là luồng hoàn trả,
nhãn và thông báo khác.

Modal thanh toán thật (chọn hình thức + phương thức) nằm ở **`src/components/paymentModals/PaymentMethodModal.jsx`**
(3.131 dòng), dùng chung với màn chi tiết đơn. Các file anh em cùng thư mục:
`ModalLoyaltyPointOtp.jsx` (OTP điểm), `PaymentWithQR.jsx`, `PaymentWithVNPD.jsx`, `ConfirmBillModal.jsx`.

## 2. API — đã đối chiếu hai đầu

| Việc | Method + path | FE khai ở | BE nhận ở |
|---|---|---|---|
| Tạo đơn **và** thanh toán một lượt (màn bán hàng) | `POST /spa-checkout/v2.1/draft-checkout` | `features/order/services/ordersApi.js:86` | `CheckoutController.java` (`@RequestMapping("/spa-checkout")` + `@PostMapping("/v2.1/draft-checkout")`) |
| Thanh toán một đơn nháp đã có | `POST /spa-checkout/v2.1` | `ordersApi.js:133` | `CheckoutController.java` `@PostMapping("/v2.1")` |
| Thanh toán nhiều đơn (màn công nợ) | `POST /spa-checkout/multi` | `features/order/services/ordersEndpoints.js:2` · `pages/customerDebt/action.js:30` | — ngoài phạm vi phân hệ này |
| Tạo đơn nháp | `POST /spa/orders/draft/v2` | `ordersApi.js:107` | pod-service |
| Kiểm coupon | `GET /coupon/validate` | `ordersApi.js:78` | pod-service |

⚠️ **Prefix:** `pod-service` **không** có `server.servlet.context-path`. Gateway route
`/spa-checkout/**` về pod — xác nhận ở `vnpost-gateway-service/src/main/resources/application.yml:164`
(cùng nhóm với `/stock/v3/**`, `/spa/orders/**`). Path gọi thẳng là `/spa-checkout/...`,
🚫 không thêm prefix nào nữa.

⚠️ **Còn bản cũ đang sống song song:** `src/utils/service/orderService.js:168` gọi `POST /spa-checkout/v1.2`
và `src/pages/order/actions.js:107,116` gọi `/spa-checkout/v2.1`. Màn bán hàng hiện đi qua RTK Query
(`ordersApi.js`), nhưng script cần bắt network thì phải lường cả hai đường.

## 3. Nhãn hiển thị — chép từ code

### Hình thức thanh toán (`PaymentMethodModal.jsx`)

| Nhãn | Dòng |
|---|--:|
| `Thanh toán hết` | 1861 |
| `Trả góp` | 1885 |
| `Thanh toán sau` | 1911 |

### Phương thức thanh toán

| Nhãn | Dòng |
|---|--:|
| `Quét QR` | 2007 |
| `Thẻ VISA` | 2039 |
| `Thanh toán bằng điểm` | 2073 |
| `Đa phương thức` | 2104 |
| `Tiền mặt` / `Chuyển khoản` | `OrderCheckoutComponent.jsx:1717,1718` (khối hoàn trả) |

### Nhãn trong khối Đa phương thức (`SPLIT_PAYMENT_METHOD_LABEL`, dòng 80–85)

`Tiền mặt` · `Thẻ/POS ngân hàng` · `Thanh toán bằng điểm` · `VietQR`

🔴 Nhãn ô thẻ ở khối đa phương thức là **`Thẻ/POS ngân hàng`**, khác nhãn phương thức đơn lẻ
**`Thẻ VISA`**. Script so chuỗi phải phân biệt.

### Nhãn tài khoản nhận QR (dòng 75–78)

Phụ thuộc kênh: `Chọn tài khoản nhận PostPay` (PostPay) hoặc `Chọn ngân hàng nhận VietQR` (VietQR).

### Nhãn ô đọc số

`Tổng tiền cần thanh toán` (2174) · `Nợ sau thanh toán` (2262) · `Số điểm sử dụng (Điểm khả dụng: …)` (2377)
· `Tiền trả lại khách` (2542, 2818) · `Thanh toán bằng điểm tích luỹ` (2979) · `Điểm khả dụng:` (3031)

⚠️ Nhãn tiếng Việt trong code ở dạng **NFD** (dấu tổ hợp). Script so chuỗi phải `normalize("NFC")`
trước khi `toEqual`, nếu không case xanh/đỏ ngẫu nhiên theo font nguồn.

## 4. Thông báo — nguyên văn, đã chép từ code

### FE — `PaymentMethodModal.jsx`

| Dòng | Nguyên văn |
|--:|---|
| 967 | `Nhập số tiền trả góp` |
| 972 | `Số tiền trả một phần phải nhỏ hơn tổng tiền cần thanh toán` |
| 983 | `Tổng các phương thức phải bằng số tiền thanh toán lần này` |
| 988 | `Vui lòng nhập ít nhất một phương thức thanh toán` |
| 993 · 1046 | `Vui lòng chọn khách hàng để thanh toán bằng điểm` |
| 997 · 1050 | `Chưa có cấu hình quy đổi điểm tích luỹ` |
| 1005 · 1058 | `Vui lòng nhập số điểm thanh toán` |
| 1009 · 1062 | `Số điểm thanh toán vượt quá điểm khả dụng` |
| 1014 | `Vui lòng chọn tài khoản nhận QR` |
| 1025 | `Vui lòng hoàn tất lần lượt các màn thanh toán SDK` |
| 1037 | `Cần nhập số tiền thanh toán` |
| 1042 · 1539 | `Chương trình đổi điểm đang tắt` |
| 1111 | `Vui lòng chọn tài khoản nhận` |
| 1118 | `Vui lòng chọn mã QR nhận` |
| 1432 · 1498 | `Có lỗi xảy ra, xin vui lòng thử lại sau ít phút` (fallback khi API không trả message) |
| 736 | `Vui lòng chọn tài khoản nhận QR để tạo mã thanh toán` |

### FE — `OrderCheckoutComponent.jsx`

| Dòng | Nguyên văn |
|--:|---|
| 951 | `Đơn hàng không có sản phẩm, vui lòng thêm sản phẩm` |
| 955 | `Đơn hàng không thoả mãn điều kiện khuyến mãi` |
| 969 | `Vui lòng kiểm tra đầy đủ thông tin giao hàng` |
| 537 | `SDK báo QR thành công nhưng chưa xác định được orderId để kiểm tra` |
| 581 | `SDK báo QR thành công nhưng BE chưa cập nhật trạng thái đơn. Vui lòng kiểm tra lại danh sách đơn hàng.` |
| 654 | `Thanh toán đã ghi nhận nhưng chưa lấy được thông tin đơn hàng` |

### FE — `customerGroupPreviewUtils.js:6`

`Thanh toán sau hoặc một phần không thể áp dụng cho chương trình khuyến mại cập nhật realtime`

### BE — `pod-service`

| Mã lỗi | Nguyên văn | Ném ở |
|---|---|---|
| `UNPAID_OR_PARTIAL_PAID_NOT_AVAILABLE_ANONYMOUS` | `Thanh toán sau hoặc một phần không thể áp dụng cho khách vãng lai` | `CheckoutOrder.java:1703` |
| `ONLY_DRAFT_ORDERS_CAN_BE_PAID` | `Chỉ có thể thanh toán các đơn nháp` | `CheckoutOrder.java:1694` |
| `INVALID_AMOUNT_CHECKOUT` | `Số tiền thanh toán lớn hơn tổng số tiền của đơn hàng.` (message truyền tay, khác message mặc định `Số tiền thanh toán không hợp lệ` ở `PodErrorCode.java:45`) | `CheckoutOrder.java:1708` |

🔴 **Hai message cho cùng một mã lỗi.** `PodErrorCode.INVALID_AMOUNT_CHECKOUT` khai
`Số tiền thanh toán không hợp lệ`, nhưng chỗ ném ở `CheckoutOrder.java:1708` **ghi đè** bằng
`Số tiền thanh toán lớn hơn tổng số tiền của đơn hàng.`. Case `18_3_070_005` kỳ vọng chuỗi **ghi đè**.

## 5. Phân loại độ sẵn sàng

| Nhãn | Case | Ghi chú |
|---|--:|---|
| `READY` | 24 | kỳ vọng là nhãn/thông báo nguyên văn hoặc công thức số, không cần dữ liệu nền đặc biệt |
| `READY_WITH_CODE_LOOKUP` | 17 | cần locator cụ thể của ô/nút trong `PaymentMethodModal.jsx` — biết chắc có, chưa lấy selector |
| `BLOCKED` | 12 | lý do từng case ở mục 5.1 |

### 5.1 Case `BLOCKED` — lý do cụ thể

| Case | Vì sao chưa chạy được |
|---|---|
| `18_3_040_001` `18_3_040_004` `18_3_040_005` `18_3_040_006` | Cần **tài khoản nhận QR thật** đã khai ở điểm bán test và một giao dịch quét mã thật. Môi trường test trỏ dữ liệu thật ⇒ không tự tạo được giao dịch tiền vào. |
| `18_3_050_001` `18_3_050_002` | Cần **mã OTP thật** gửi về số điện thoại khách. Auto test không đọc được SMS. |
| `18_3_060_001` `18_3_060_007` | Phải mở **lần lượt các màn SDK VNPD** (tiền mặt/thẻ/QR) — SDK bên thứ ba, không điều khiển được từ Playwright. |
| `18_3_080_001` `18_3_080_002` `18_3_080_003` | Phụ thuộc **cấu hình điểm bán bật lưu nháp** + **chuỗi bật chính sách Nhận đặt hàng trước**. Chưa xác nhận điểm bán test có cấu hình này. |
| `18_3_100_001` | Cần tài khoản vai `ward` — chưa xác nhận đã khai trong `.env.accounts`. Thiếu thì case **skip kèm `missingRoleReason`**, 🚫 không tự pass. |

## 6. 🔴 Lỗ hổng đặc tả phát hiện khi trace — 🚫 chưa tự sửa, cần user quyết

### 6.1 Chặn khách lẻ nợ có **ba lối thoát** mà cả HDSD lẫn sheet QC đều không nói

`CheckoutOrder.validateOrderPolicies` (dòng 1689–1705):

```java
if (request.isPaymentAuto() || Boolean.TRUE.equals(orderEntity.getIsPosOffline()))
    return;                                    // ① thanh toán tự động  ② POS offline → BỎ QUA validate

if (compareOrder < 0 && isOrderForAnonymous(...) && orderEntity.getItems()
        .stream().noneMatch(e -> Objects.equals(Constants.PRODUCT_TYPE.SERVICE, e.getType())))
    throw new PodException(UNPAID_OR_PARTIAL_PAID_NOT_AVAILABLE_ANONYMOUS);   // ③ đơn có DỊCH VỤ → không chặn
```

Sheet QC `dong161`/`dong162` viết như thể chặn là tuyệt đối. Thực tế khách vãng lai **vẫn ghi nợ được**
trong ba tình huống: thanh toán tự động, POS offline, hoặc đơn có ít nhất một dòng loại `SERVICE`.
**Cố ý hay bỏ quên?** Nếu cố ý thì phải bổ sung 3 case dương; nếu bỏ quên thì đây là lỗ thủng công nợ.

### 6.2 Không tìm thấy thông báo `Sai mã OTP, vui lòng thử lại` ở đâu trong repo

Sheet QC `dong159` đòi đúng chuỗi đó. Grep toàn bộ: `pod-service` chỉ có `CAN_NOT_SEND_OTP_CODE` =
`Không thể gửi mã OTP`; `loyalty-service` có `CANT_SEND_OTP`, `ERROR_SEND_OTP`, `INVALID_OTP_TYPE`,
`INVALID_PASSWORD` — **không mã nào mang nghĩa "OTP sai"**. Vì vậy `18_3_050_002` để kỳ vọng
*"ghi lại nguyên văn thông báo"* thay vì chốt chuỗi. Cần chạy thật để chép, hoặc user xác nhận
chuỗi đúng là gì.

### 6.3 HDSD nói `Thẻ VISA`, code khối đa phương thức nói `Thẻ/POS ngân hàng`

Cùng một phương thức, hai nhãn khác nhau ở hai chỗ trên cùng một màn. Sửa nhãn cho thống nhất hay
giữ nguyên? Bộ case đang bám **code**, mỗi chỗ một nhãn.

### 6.4 Chưa tìm thấy phép kiểm "số điểm không vượt số tiền phải thu"

HDSD `90_tra_cuu_truong` ghi: *"Lớn hơn 0, không vượt điểm khả dụng và không vượt số điểm tương ứng
số phải thu"*. Code FE chỉ có hai phép: `Vui lòng nhập số điểm thanh toán` (trống) và
`Số điểm thanh toán vượt quá điểm khả dụng`. **Không thấy** phép so với số phải thu, cũng không thấy
phép chặn số điểm = 0. ⇒ `18_3_050_009` và `18_3_050_010` để kỳ vọng *"ghi lại nguyên văn thông báo"*
— rất có thể **không bị chặn gì cả**, và đó là lỗi.

### 6.5 Sheet QC không có case nào cho hình thức `Trả góp` và nhóm lưu nháp

10 case gốc chỉ phủ phương thức thanh toán. Toàn bộ nhóm `070` (thu một phần / ghi nợ) và `080`
(lưu đơn nháp) dựng từ HDSD + code, `Ma goc` để trống đúng luật 4.1 của handoff.

## 7. Đối chiếu sheet QC

10/10 case gốc đã có case tương ứng:

| Mã gốc | Case đã dựng |
|---|---|
| `dong153` | `18_3_020_001`, `18_3_020_002` |
| `dong154` | `18_3_030_002` |
| `dong155` | `18_3_030_001` |
| `dong156` | `18_3_040_001` |
| `dong157` | `18_3_040_004` |
| `dong158` | `18_3_050_001` |
| `dong159` | `18_3_050_002` |
| `dong160` | `18_3_060_001` |
| `dong161` | `18_3_090_002` |
| `dong162` | `18_3_070_002` |

## 8. Quét 11 kỹ thuật mục 3.4 — đã làm gì

| # | Kỹ thuật | Case sinh ra |
|--:|---|---|
| 1 | Ô bắt buộc | `020_004` `050_006` `060_003` `070_003` — bỏ trống **từng ô riêng lẻ** |
| 2 | Khoảng trắng | 🚫 không áp: mọi ô nhập của màn này là `InputNumber`, không nhận chuỗi |
| 3 | Giá trị biên | `020_005` (0) `020_006` (âm) `050_007` (N+1) `050_008` (N) `050_009` (0) `070_004` (= tổng) `070_005` (> tổng) |
| 4 | Kiểu dữ liệu sai | `020_007` — gõ chữ vào ô số |
| 5 | Tính duy nhất | 🚫 không áp: màn thanh toán không có trường "không được trùng" |
| 6 | Trạng thái × hành động | `090_004` — thanh toán đơn đã thanh toán; `080_003` — đơn online |
| 7 | Danh sách | 🚫 không áp: màn thanh toán không có bảng phân trang |
| 8 | Tìm kiếm | 🚫 không áp: không có ô tìm kiếm |
| 9 | Huỷ giữa chừng | `010_005` — bấm Huỷ, không được lưu gì |
| 10 | Phạm vi theo vai | `100_001` (ward bị chặn) `100_002` (shop làm được) |
| 11 | Sau khi ghi | `050_001` (điểm khách giảm đúng) `070_001` (công nợ tăng đúng) `090_001` (kho bị trừ + ghi nợ) |

**Luật rẻ tiền:** màn Tiền mặt có 1 ô bắt buộc → 8 case (thừa đủ); màn Thanh toán bằng điểm có 1 ô
bắt buộc → 11 case; màn Đa phương thức có 1 ô bắt buộc có điều kiện → 7 case. Không màn nào có số
case ít hơn số ô bắt buộc.

## 9. Case `mutates` — 🔴 chưa ai được phép chạy

Toàn bộ case chạm **TIỀN · KHO · CÔNG NỢ** đều `mutates: true` + `allowMutation: false` trong
`test-input.json`. Môi trường test trỏ **dữ liệu thật** (`.env.domain`) — một case thanh toán chạy
nhầm là một đơn hàng thật đã thu tiền, kho đã trừ, và với nhóm `070`/`090` là một khoản **công nợ
khách hàng** đã ghi sổ.

Danh sách: `020_001` `020_002` `030_001` `030_002` `040_001` `050_001` `060_001` `070_001`
`080_001` `090_001` `100_002` — 11 case.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `18_3_020_003` | Chặn tiền khách đưa nhỏ hơn số phải thu khi Thanh toán hết | Thiếu nguyên văn thông báo | Bị chặn, không tạo đơn. Ghi lại nguyên văn thông báo hiện lên |
| `18_3_020_005` | Nhập số tiền khách đưa bằng 0 | Thiếu nguyên văn thông báo | Bị chặn, không tạo đơn. Ghi lại nguyên văn thông báo |
| `18_3_020_006` | Nhập số tiền khách đưa âm | Chờ chạy để lấy hành vi thật | Ô không nhận giá trị âm, hoặc bị chặn khi xác nhận. Ghi lại hành vi thật |
| `18_3_040_004` | Tra soát giao dịch QR khi lỗi mạng hoặc timeout | Thiếu nguyên văn thông báo | Hệ thống trả về trạng thái giao dịch từ dịch vụ thanh toán. Ghi lại nguyên văn trạng thái hiển thị |
| `18_3_050_002` | Chặn thanh toán bằng điểm khi nhập sai OTP | Thiếu nguyên văn thông báo | Bị chặn, đơn không chuyển sang Đã thanh toán, điểm khách không bị trừ. Ghi lại nguyên văn thông báo hiện lên |
| `18_3_050_009` | Nhập số điểm bằng 0 | Thiếu nguyên văn thông báo | Bị chặn — HDSD yêu cầu số điểm lớn hơn 0. Ghi lại nguyên văn thông báo |
| `18_3_050_010` | Nhập số điểm vượt số tiền phải thu | Thiếu nguyên văn thông báo | Bị chặn — HDSD yêu cầu không vượt số điểm tương ứng số phải thu. Ghi lại nguyên văn thông báo |
| `18_3_080_003` | Nút Đặt hàng trước không dùng được với đơn online | Thiếu nguyên văn thông báo | Nút vô hiệu; tooltip giải thích lý do. Ghi lại nguyên văn tooltip |
| `18_3_100_001` | Vai bưu điện xã không mở được màn bán hàng của điểm bán | Thiếu nguyên văn thông báo | Bị chặn — không vào được màn lập đơn của điểm bán. Ghi lại nguyên văn thông báo hoặc hành vi điều hướng |

**9/54 case** của phân hệ này chưa chốt được kỳ vọng.
