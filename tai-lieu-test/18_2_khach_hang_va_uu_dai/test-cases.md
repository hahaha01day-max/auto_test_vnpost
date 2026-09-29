# Kịch bản auto test — 18_2 Khách hàng và ưu đãi tại quầy

- Dựng 18/09/2026, **viết lại toàn bộ 19/09/2026** (49 → 115 case) · skill `test-scenario`
- Nguồn: `hdsd18_2_khach_hang_va_uu_dai/tasks/*.md` (đọc trọn 4/4) + sheet QC + trace code FE + **trace assertion của spec sẵn có**
- Độ phủ sheet QC: **10/10** (trước: 1/10)
- 🔴 Phân hệ này **ĐÃ CÓ script** (3 file, 49 `test()`) nhưng trước hôm nay **chưa có `test-cases.md`**

## 1. 🔴 Bản cũ: 46/49 case có tiêu đề nhưng KHÔNG có kỳ vọng

Đây là phát hiện quan trọng nhất của phiên. Bản 18/09 của `test-cases.csv`:

| Cột | Tình trạng bản cũ |
|---|--:|
| `Tien dieu kien` | **rỗng 49/49** |
| `Buoc kiem thu` | **rỗng 49/49** |
| `Ket qua ky vong` | **rỗng 46/49** |

Theo nguyên tắc duy nhất của skill — *"một kịch bản chỉ có giá trị khi kết quả kỳ vọng đo được"* —
46 case đó là **case luôn xanh trên giấy**. Nhưng script thì **có assertion thật**:

```js
// tests/vnpost-promotion-pos.playwright.spec.js:118
test('18_2_020_002 - Giảm 10% giá trị đơn', async ({ page }) => {
  await addProduct(page, PRODUCTS.SP1, 5);
  const total = await getSummaryValue(page, 'Tổng tiền');
  await applyPromotions(page, [PROMOTIONS.KM1]);
  const expectedDiscount = Math.round(total * 0.1);
  ...
```

⇒ **Kịch bản nằm trong script, không nằm trong tài liệu.** Đây đúng là bệnh handoff mục 7 đã ghi cho
`12-don-vi-van-tai`, chỉ khác chiều: ở đó CSV sinh ngược từ spec; ở đây CSV **bỏ trống** trong khi
spec giữ hết.

**Cách xử lý 19/09:** trích công thức assertion từ spec (45/46 case parse được) và viết lại thành
**công thức nghiệp vụ** trong cột `Ket qua ky vong`, ví dụ:

> *Công thức: Chiết khấu khuyến mãi = làm tròn(Tổng tiền × 0.1) · Cần thanh toán = Tổng tiền −
> Chiết khấu khuyến mãi. Khối tiền hiện đúng: ô "Tổng tiền" … Thanh toán hoàn tất, không có lỗi API.*

🔴 **Cần user xác nhận:** công thức này lấy từ **assertion của script**, 🚫 chưa đối chiếu với **cấu
hình CTKM thật** trong `MARKETING_CAMPAIGN`. Nếu script viết sai công thức thì tài liệu nay chép sai
theo. Skill cấm dùng *kết quả* lần test trước làm kỳ vọng; đây là *assertion* (quy tắc) chứ không
phải *kết quả*, nhưng vẫn là nguồn hạng hai — nguồn hạng nhất là cấu hình chiến dịch.

## 2. Route và API

Cùng màn với `18_1`: `ORDER_ADD` = `/order/create-order` (`config.jsx:140`).

| Việc | Method + path |
|---|---|
| CTKM đang chạy cho điểm bán | `GET /marketing/campaign/v2/active-for-shop` |
| Chi tiết chiến dịch | `GET /marketing/campaign/view-detail` |
| Chi tiết điều kiện | `GET /marketing/condition/view-detail-condition` |
| **Validate coupon** | `POST /coupon/validate` |
| Tính tiền trước khi thu | `POST /spa-checkout/v2.1/draft-checkout` |
| Thanh toán | `POST /spa-checkout/v2.1` |
| Ngân sách chiến dịch | `features/order/services/campaignBudgetApi.js` |

⚠️ `/marketing/**` là **marketing-service**, `/coupon/**` và `/spa-checkout/**` là pod-service.
Màn này gọi **hai service**.

## 3. Nhãn hiển thị thật

### 3.1 Khối khách hàng (HDSD 010)

Ô tìm: placeholder `Tìm kiếm khách hàng theo tên hoặc sđt` (phím **F11**). Sau khi gắn khách hiện
`Tiền phát sinh`, `Tiền còn nợ`, và `Điểm hiện tại` (chỉ khi khách có điểm). Tên khách **thành tên
tab đơn**. Dấu **cộng vàng** = thêm khách mới; **bút chì** trên dòng gợi ý = sửa khách.

### 3.2 Cửa sổ Chương trình khuyến mãi — 8 cột (HDSD 020)

Ô chọn · `Chương trình khuyến mãi` · `Hình thức khuyến mãi` (`Giảm giá` / `Quà tặng` /
`Giảm giá + Quà tặng`) · `Quà khuyến mại` · `Điều kiện áp dụng` · `Đối tượng áp dụng` ·
`Độ ưu tiên` (số nhỏ tính trước) · `Áp dụng chung` (`Có` / `Không`).

Ba thẻ phạm vi: `Theo đơn hàng` · `Theo sản phẩm` · `Theo danh mục`.
Ô tìm: `Tìm kiếm theo tên chiến dịch`; ô lọc `Hiển thị các CTKM đã được chọn`. Phím **F10** mở cửa sổ.

### 3.3 Coupon (HDSD 030)

Ô `Mã coupon`, placeholder `Quét mã vạch hoặc nhập mã giảm giá...`, nút `Áp dụng`.
Khối tiền bổ sung dòng `Mã coupon (<mã>)`.

### 3.4 Thông tin xuất hoá đơn (HDSD 040)

Ô `Xuất hoá đơn điện tử` → liên kết `Thông tin xuất HĐ` → màn `Thông tin xuất hoá đơn`.
Nút chân màn: `Huỷ` · `Xoá thông tin` · `Xác nhận`.

🔴 **Bộ trường đổi theo `Đối tượng mua hàng`:**

| Trường | Cá nhân | Doanh nghiệp / Tổ chức |
|---|---|---|
| Tên đơn vị | ẩn | **bắt buộc** |
| Mã số thuế (10 chữ số) | ẩn | **bắt buộc** |
| Họ và tên người mua | **bắt buộc** | đổi tên thành `Người mua hàng`, không bắt buộc |
| CMND/CCCD (9 hoặc 12 chữ số) | có, không bắt buộc | ẩn |
| Số điện thoại | không bắt buộc | không bắt buộc |
| **Email nhận hoá đơn** | **bắt buộc** | **bắt buộc** |
| Địa chỉ | `Địa chỉ`, không bắt buộc | `Địa chỉ đơn vị`, **bắt buộc** |

## 4. Thông báo — nguyên văn

| Tình huống | Nguyên văn | Nguồn |
|---|---|---|
| Dịch vụ nhiều buổi cho khách lẻ | `Không thể bán dịch vụ nhiều buổi cho khách lẻ` | HDSD 010 |
| Giao hàng cho khách vãng lai | `Không thể giao hàng cho Khách vãng lai, vui lòng chọn hoặc tạo khách hàng` | HDSD 010 |
| CTKM không dùng chung | `CTKM này không được áp dụng đồng thời với CTKM khác trong cùng đơn` | HDSD 020 |

⚠️ Nhãn tiếng Việt trong code ở dạng **NFD** — script phải `normalize("NFC")` trước khi so chuỗi.

## 5. Vai

Cả 4 task HDSD khai **chỉ `DIEM_BAN`**; task 020 cần thêm quyền `adjust_order_campaign` bên cạnh
`create_order`. Dùng `gdv` cho toàn bộ.

🔴 **Kỹ thuật 10 (phạm vi theo vai) không áp dụng** — không cấp nào khác vào màn này. Nhưng nhóm `020`
có **một ranh giới quyền** chưa dựng được case: `adjust_order_campaign`. 🔴 **Cần user cho biết tài
khoản nào KHÔNG có quyền này** để dựng case "ô chọn CTKM bị mờ vì không có quyền" (HDSD 020 nói rõ
ô chọn mờ khi *"bạn không có quyền"*).

## 6. Phân loại

| Nhãn | Số case |
|---|--:|
| `READY_WITH_CODE_LOOKUP` | 52 |
| `BLOCKED` | 63 |

## 7. 🔴 Case ghi dữ liệu — 63/115

| Nhóm | Vì sao |
|---|---|
| `020` toàn bộ 46 case | Mỗi case kết thúc bằng `checkoutAndPay` ⇒ **tạo đơn hàng thật và trừ tồn kho thật**. 🔴 Đây là 46 lần bán hàng trên điểm bán đang hoạt động |
| `050` đổi điểm | **Trừ điểm thật** của khách hàng thật |
| `010_006` `010_007` `010_010` `010_011` `010_014` | Tạo / sửa khách hàng, tạo đơn |
| `030_015` `030_016` | Coupon ghi nhận đã dùng sau khi thanh toán |
| `040_020` `040_021` | Thanh toán và đánh dấu chờ phát hành hoá đơn |

🔴 **Nhóm `020` đã có script và script đó gọi `checkoutAndPay`.** Nếu ai chạy `npm run test:18_2`
trên môi trường hiện tại là **46 đơn hàng thật** được tạo. Cần kiểm lại cấu hình trước khi bật.

## 8. Quét 11 kỹ thuật mục 3.4

| # | Kỹ thuật | Case |
|--:|---|---|
| 1 | Ô bắt buộc | `030_011` `040_007`–`040_011` |
| 2 | Khoảng trắng | `010_015` `030_012` `040_016` |
| 3 | Giá trị biên | `020_004` `020_005` (giảm 50k trên đơn 50k / 40k) · `020_012` (tier) · `020_038` `020_040` (dưới ngưỡng tối thiểu) · `040_013` `040_014` · `050_011` `050_012` |
| 4 | Kiểu dữ liệu sai | `040_013`–`040_015` |
| 5 | Tính duy nhất | `030_008` `030_014` |
| 6 | Trạng thái × hành động | `010_012` `010_013` (đổi khách sau khi áp CTKM / sau khi thu tiền) · `020_044` (chỉ áp CTKM tốt nhất) · `030_010` (CTKM loại coupon) · `040_005` `040_022` · `050_006` `050_007` |
| 7 | Danh sách | `020_001` (3 thẻ phạm vi, ô tìm chiến dịch, ô lọc đã chọn) |
| 8 | Tìm kiếm | `010_016` `010_017` `030_013` |
| 9 | Huỷ giữa chừng | `010_018` `030_005` `040_017` `040_019` |
| 10 | Phạm vi theo vai | 🔴 **Không áp dụng** — chỉ `DIEM_BAN` vào màn này. Ranh giới `adjust_order_campaign` **chưa dựng được**, xem mục 5 |
| 11 | Sau khi ghi | `010_010` `010_011` `030_015` `040_021` `050_001` `050_003`–`050_005` `050_012` |

Luật rẻ tiền: màn Thông tin xuất hoá đơn có **5** ô bắt buộc (tuỳ đối tượng) và có 22 case — đạt.

## 9. 🔴 Lỗ hổng và điểm cần chốt

| # | Vấn đề |
|--:|---|
| a | 🔴 **46 case CTKM có kỳ vọng lấy từ assertion của script, chưa đối chiếu cấu hình chiến dịch thật.** Xem mục 1. Nếu script sai công thức thì tài liệu chép sai theo. |
| b | 🔴 **Đổi khách sau khi áp CTKM làm mất ưu đãi im lặng.** (`010_012`) HDSD chỉ khuyên "chọn khách xong rồi mới áp ưu đãi" — 🚫 không nói có cảnh báo khi ưu đãi bị bỏ. Khách đã được báo giá rồi mà số đổi là tranh chấp tại quầy. |
| c | 🔴 **Huỷ đơn sau khi đã dùng coupon: mã có được hoàn không?** (`030_016`) HDSD 030 chỉ khuyên *"hãy kiểm lại tình trạng mã trước khi hứa với khách"* ⇒ **chính tài liệu cũng không biết**. Cần user quyết. |
| d | 🔴 **Áp hai mã coupon liên tiếp** (`030_014`) — thay thế, cộng dồn, hay chặn? HDSD 🚫 không nói. |
| e | 🔴 **Coupon phân biệt hoa thường?** (`030_013`) Khách gõ tay mã in trên phiếu rất dễ sai hoa thường. |
| f | **Ranh giới quyền `adjust_order_campaign` chưa test được** — chưa có tài khoản không có quyền này. Xem mục 5. |
| g | **Tích ô xuất HĐĐT mà không nhập thông tin ⇒ biên lai in mã QR** (`040_020`). HDSD nói là hành vi bình thường, nhưng 🚫 không nói **hạn** để khách quét mã hoàn tất là bao lâu. |
| h | **`FUNC_LOYALTY__36`–`__39` (4 case âm của đổi điểm) đều thiếu thông báo nguyên văn** trong sheet QC. Đã ghi "Ghi lại nguyên văn thông báo" trong kỳ vọng thay vì bịa. |

## 10. Nguồn đã dùng — và chỗ chưa làm

| Nguồn | Mức |
|---|---|
| HDSD | đọc **trọn 4/4 file**, kể cả khối ⚠️ và 💡 |
| Sheet QC | `doi-chieu-goc.js` → **10/10** (`FUNC_LOYALTY__30`–`__39`) |
| FE | `config.jsx` · `ordersApi.js` · `campaignBudgetApi.js` |
| Spec sẵn có | `tests/vnpost-promotion-pos.playwright.spec.js` — parse 45/46 khối `test()` lấy bước và công thức assertion |

🔴 **Chưa làm:**

1. 🚫 **Chưa đối chiếu cấu hình CTKM thật** trong DB `MARKETING_CAMPAIGN` — đây là lỗ hổng (a),
   việc chặn quan trọng nhất còn lại của phân hệ.
2. 🚫 **Chưa chạy SELECT** — mọi con số trong tiền điều kiện (`khách có 500 điểm`, `đơn tối thiểu
   200.000đ`) là **giá trị mẫu**.
3. 🚫 **Chưa đọc backend** `/coupon/validate` và `/spa-checkout/v2.1` ⇒ **chưa có nguyên văn thông báo
   lỗi của BE** cho nhóm `030` (coupon) và `050` (đổi điểm). Các case đó hiện ghi "Ghi lại nguyên văn
   thông báo" — đúng nguyên tắc 🚫 không bịa, nhưng chưa đo được.
4. 🚫 **Chưa trace thuật toán tính CTKM** (thứ tự theo `Độ ưu tiên`, luật `Áp dụng chung`, cách
   chồng nhiều chương trình) ⇒ 15 case tổ hợp `020_032`–`020_046` mô tả theo tiêu đề và assertion,
   🚫 không mô tả luật.
5. 🚫 **Case `18_2_020_001` không có trong spec** (spec parse được 45/46) — đã viết tay từ HDSD 020.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `18_2_010_016` | Tìm khách bằng số điện thoại một phần | Chờ chạy để lấy hành vi thật | Gợi ý hiện khách có SĐT chứa chuỗi đó; nếu rỗng thì ghi nhận hệ thống chỉ khớp từ đầu |
| `18_2_010_017` | Tìm khách không dấu | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật — 🔴 giao dịch viên gõ không dấu là thao tác thường ngày |
| `18_2_030_006` | Mã coupon không tồn tại bị chặn | Thiếu nguyên văn thông báo | Báo lỗi và 🚫 **KHÔNG** ghi mã vào đơn; "Cần thanh toán" không đổi. Ghi lại nguyên văn thông báo |
| `18_2_030_013` | Mã coupon khác hoa thường | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật — 🔴 nếu phân biệt hoa thường thì khách gõ tay dễ bị từ chối oan |
| `18_2_030_014` | Áp hai mã coupon liên tiếp | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: mã B thay mã A, hay cộng dồn, hay bị chặn. HDSD 🚫 không nói |
| `18_2_030_016` | 🔴 Huỷ đơn sau khi đã dùng coupon | Chưa rõ · Chưa đo được · Chờ chạy để lấy hành vi thật · Chờ user quyết | 🔴 CHƯA CHỐT ĐƯỢC: HDSD chỉ khuyên "hãy kiểm lại tình trạng mã trước khi hứa với khách là dùng lại được" ⇒ **chưa rõ mã có được hoàn không**. Ghi lại hành vi thật — cần user quyết |
| `18_2_040_016` | Các ô bắt buộc toàn khoảng trắng bị coi là rỗng | Chờ chạy để lấy hành vi thật | Bị chặn như khi để trống. Ghi lại nếu ô nào KHÔNG trim — đó là lỗ hổng |
| `18_2_050_007` | Không có chương trình đổi điểm nào đang hiệu lực | Thiếu nguyên văn thông báo | Tuỳ chọn đổi điểm 🚫 không dùng được; hệ thống nêu rõ không có chương trình đổi điểm. Ghi lại nguyên văn thông báo |
| `18_2_050_008` | Khách không đủ điểm để đổi cho đơn hàng | Thiếu nguyên văn thông báo | Hệ thống chặn và nêu số điểm khách đang có. Ghi lại nguyên văn thông báo |
| `18_2_050_009` | Giá trị đơn hàng không đạt tối thiểu để đổi điểm | Thiếu nguyên văn thông báo | Hệ thống chặn và nêu ngưỡng tối thiểu. Ghi lại nguyên văn thông báo |
| `18_2_050_010` | Chọn khách KHÔNG có điểm tích luỹ và cố đổi điểm | Thiếu nguyên văn thông báo | Hệ thống chặn; dòng "Điểm hiện tại" hiện 0 hoặc 🚫 không hiện. Ghi lại nguyên văn thông báo |
| `18_2_050_011` | Đổi số điểm bằng 0 hoặc âm | Chờ chạy để lấy hành vi thật | Cả hai bị chặn. Ghi lại hành vi thật |

**12/115 case** của phân hệ này chưa chốt được kỳ vọng.
