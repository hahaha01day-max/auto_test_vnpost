# Kịch bản auto test — 18_1 Bán hàng tại quầy (POS)

- Dựng 18/09/2026, **viết lại toàn bộ 19/09/2026** (6 → 131 case) · skill `test-scenario`
- Nguồn: `hdsd18_1_ban_hang_tai_quay/tasks/*.md` (đọc trọn 7/7) + sheet QC + trace code FE
- Độ phủ sheet QC: **56/56** (trước: 2/56)
- 🚫 Chưa viết script

## 1. Route

| Màn hình | Route | `config.jsx` |
|---|---|---|
| `ORDER_ADD` — màn bán hàng POS | `/order/create-order` | `:140` |
| Quản lý đơn hàng (lối vào) | Đơn hàng › Đơn hàng đã tạo | — |

## 2. API chính (`features/order/services/ordersApi.js`)

| Việc | Method + path |
|---|---|
| Danh sách đơn | `GET /orders/shops/{shopId}/v1.3` |
| Chi tiết đơn | `GET /orders/shops/{shopId}/{orderId}/details` |
| Tra sản phẩm bán được | `GET /products/{shopId}/spa-products/{type}/v1.2` |
| Thông tin 1 sản phẩm | `GET /products/{productId}/shops/{shopId}/info` |
| Combo | `GET /products/shops/{shopId}/product-combo` |
| Danh mục sản phẩm | `GET /spa-config/product-cat` · `GET /chain/product-categories` |
| CTKM đang chạy | `GET /marketing/campaign/v2/active-for-shop` |
| **Lưu nháp** | `POST /spa/orders/draft/v2` · `PUT /orders/draft/body/{orderId}/v2` |
| Tính tiền trước khi thu | `POST /spa-checkout/v2.1/draft-checkout` |
| **Thanh toán** | `POST /spa-checkout/v2.1` · `POST /spa-checkout/multi` |
| Validate coupon | `POST /coupon/validate` |

⚠️ Toàn bộ là pod-service, 🚫 **không có prefix service**. 🔴 Lưu ý `/marketing/**` là
marketing-service và `/payment/**` là payment-service — cùng gọi từ màn này.

## 3. Thông báo — nguyên văn từ code

| Tình huống | Nguyên văn | Nguồn |
|---|---|---|
| Quét mã không có trong hệ thống | `Mã vạch/SKU không tồn tại(<mã>)` | `SearchProduct.jsx:631,635,736,1028` |
| Mã vạch khớp nhiều mặt hàng | `Mã vạch/SKU trùng lặp. Vui lòng chọn thủ công.` | `SearchProduct.jsx:1034` |
| Hàng ngừng kinh doanh | `Sản phẩm '<tên>' đã bị ngừng kinh doanh hoặc ngừng bán.` | `CreateOrderPage.jsx:92` |
| Hết tồn | `Chú ý: Sản phẩm này đã hết hàng` | `CreateOrderPage.jsx:1122` |
| Vượt tồn | `Chú ý: Số lượng đang vượt quá số lượng tồn kho` | `CreateOrderPage.jsx:1137` |
| Tem cân sai checksum | `Barcode hàng cân sai checksum, vui lòng quét lại.` | `CreateOrderPage.jsx:538` |
| Tem cân thiếu checksum | `Barcode hàng cân thiếu checksum` | HDSD 030 |
| Tem cân trọng lượng 0 | `Barcode hàng cân có trọng lượng không hợp lệ` | HDSD 030 |
| Không có bảng giá | `Sản phẩm không nằm trong bảng giá nào đang có hiệu lực tại điểm bán` | HDSD 020 |
| Dịch vụ nhiều buổi cho khách lẻ | `Không thể bán dịch vụ nhiều buổi cho khách lẻ` | HDSD 020 |
| Combo liệu trình cho khách lẻ | `Không thể bán combo liệu trình cho khách lẻ` | HDSD 020 |
| Phân bổ lô vượt | `Tổng số lượng lô lớn hơn số lượng sản phẩm. Vui lòng kiểm tra lại` | HDSD 040 |
| Thiếu serial | `Số lượng sản phẩm phải lớn hơn hoặc bằng số mã serial` | HDSD 040 |
| Xoá tất cả | `Xác nhận xoá tất cả sản phẩm trong đơn hàng này?` | HDSD 050 |
| Kết nối cân | `Kết nối cân thành công` · `Chưa chọn cổng cân` · `Không thể kết nối cân, vui lòng thử lại` | HDSD 060 |
| Thêm khách mới | `Thêm khách hàng thành công` | Sheet QC `dong77` |

⚠️ Nhãn tiếng Việt trong code ở dạng **NFD** — script phải `normalize("NFC")` trước khi so chuỗi.
⚠️ Chuỗi `Mã vạch/SKU không tồn tại(` **không có dấu cách** trước dấu ngoặc; HDSD viết có dấu cách.

## 4. 14 phím tắt (HDSD 070)

| Phím | Việc |
|---|---|
| F1 / F2 | Mở / đóng tab đơn |
| F3 / F4 / F6 | Con trỏ vào ô tìm, tiêu chí Tên / SKU / Barcode |
| F7 | Lưu đơn nháp |
| F8 | Tạo đơn thanh toán sau |
| F9 | Kết nối cân điện tử |
| F10 | Mở danh sách khuyến mại |
| F11 | Con trỏ vào ô tìm khách hàng |
| Home | Con trỏ vào ô số lượng dòng đầu tiên |
| Enter | Mở màn thanh toán |
| ↑ ↓ | Chuyển giữa các dòng hàng |
| + − | Tăng giảm số lượng dòng đang chọn |

🔴 Phím tắt **tạm ngưng** khi có cửa sổ đang mở, và **Enter không mở thanh toán** khi con trỏ nằm
trong ô nhập.

## 5. Vai

Cả 7 task HDSD khai **chỉ `DIEM_BAN`**, quyền `create_order`. Dùng `gdv` (giao dịch viên) cho toàn bộ
— đây là vai thật sự đứng quầy. 🔴 **Ca làm việc phải đang mở**, nếu không hệ thống chặn ngay ở bước
vào màn (case `18_1_010_003`).

## 6. Phân loại

| Nhãn | Số case |
|---|--:|
| `READY_WITH_CODE_LOOKUP` | 118 |
| `BLOCKED` | 13 |

## 7. 🔴 Case ghi dữ liệu — 13/131

Ít hơn các phân hệ khác vì phần lớn case của POS là **đọc và kiểm chặn tại chỗ**. 13 case còn lại tạo
**đơn hàng thật** và **trừ tồn kho thật** ở điểm bán đang hoạt động:
`010_009` `010_012` `010_013` `010_020` `020_001`–`020_003` `020_019` `040_005` `040_017` `050_009`
`070_002` `070_003`.

## 8. 🔴 Giới hạn tự động hoá — phải đọc trước khi viết script

| Nhóm case | Vì sao không tự động hoá trọn vẹn được |
|---|---|
| `030_*` quét mã vạch (20 case) | Máy quét hoạt động **như bàn phím**, gõ dãy số rồi Enter ⇒ Playwright **mô phỏng được** bằng `keyboard.type()`. Nhưng `030_001` (âm thanh kết nối) và `030_011` (rút máy quét) là **thiết bị vật lý**, 🚫 không mô phỏng được |
| `060_*` cân điện tử (24 case) | Cân nối qua **Web Serial API** và cần người dùng **chọn cổng trong hộp chọn của trình duyệt** — Playwright 🚫 **không điều khiển được** hộp chọn này. Toàn bộ nhóm `060` cần cân thật hoặc một cân giả lập nối cổng |
| `010_015` F5 khôi phục tab | Cần kiểm `localStorage`/`sessionStorage` sau reload |
| `050_012` `070_*` phím tắt | Mô phỏng được bằng `keyboard.press()`, nhưng phải chắc màn đang "rảnh" (không cửa sổ nào mở) |

⇒ 🔴 **Khuyến nghị cho phiên viết script:** chia `18_1` thành hai bộ — bộ **tự động** (`010` `020`
`040` `050` `070`, khoảng 83 case) và bộ **cần thiết bị** (`030` `060`, khoảng 44 case) chạy tay có
người ngồi cạnh. 🚫 Đừng để 44 case thiết bị nằm chung project rồi skip im lặng.

## 9. Quét 11 kỹ thuật mục 3.4

| # | Kỹ thuật | Case |
|--:|---|---|
| 1 | Ô bắt buộc | `040_009` `040_014` (số lượng, serial bắt buộc) |
| 2 | Khoảng trắng | `020_010` |
| 3 | Giá trị biên | `030_013` `030_017` `040_006` `040_007` `040_009`–`040_011` `050_004`–`050_006` `060_010` `060_016` |
| 4 | Kiểu dữ liệu sai | `020_007` `030_007` `030_015`–`030_017` |
| 5 | Tính duy nhất | `020_013` `030_005` `030_009` `010_016` |
| 6 | Trạng thái × hành động | `010_003` (chưa mở ca) · `020_017`–`020_024` (tồn/ngừng KD/bảng giá/khách lẻ) · `030_019` `060_013` (màn thanh toán mở) · `070_007` `070_008` (phím tắt) |
| 7 | Danh sách | `020_006` `020_014` `020_016` `040_013` |
| 8 | Tìm kiếm | `020_006`–`020_011` `010_018` `010_019` |
| 9 | Huỷ giữa chừng | `010_022` `010_023` `040_018` `050_010` |
| 10 | Phạm vi theo vai | 🔴 **Không áp dụng** — cả 7 task chỉ khai `DIEM_BAN`, 🚫 không có cấp nào khác vào màn này. Ghi lý do thay vì dựng case giả |
| 11 | Sau khi ghi | `010_012` `010_013` `020_001`–`020_003` `020_019` `040_005` `040_017` `050_009` |

Luật rẻ tiền: màn "Chọn sản phẩm" có **3** ô bắt buộc (Đơn vị, Số lượng, Mã lô/SL chọn) và có 18 case
— đạt. Màn bán hàng chính có 1 ô tìm kiếm và 26 case ở nhóm `020` — đạt.

## 10. 🔴 Lỗ hổng và điểm cần chốt — 🚫 không tự sửa

| # | Vấn đề |
|--:|---|
| a | 🔴 **Hết tồn và vượt tồn chỉ CẢNH BÁO, không chặn.** `CreateOrderPage.jsx:1122,1137` chỉ `message.warning` rồi vẫn cho thêm hàng. Chặn thật nằm ở **bước thanh toán**. Hệ quả: giao dịch viên bán cả đơn rồi mới biết thiếu hàng, khách đã đứng chờ. HDSD tự nhận điều này nhưng 🚫 không nói có ý đồ hay không. Case `020_017`–`020_019`. |
| b | 🔴 **Chưa chọn dòng hàng thì số cân vào DÒNG CUỐI, không có cảnh báo nào.** (`060_011`) Đơn nhiều mặt hàng cần cân là sai tiền im lặng. HDSD chỉ khuyên "hãy bấm chọn đúng dòng trước". |
| c | 🔴 **Quét nhầm mã vạch rồi cân thì khối lượng vào dòng vừa quét.** (`060_019`) Cùng nhóm nguy hiểm với (b). |
| d | 🔴 **Bỏ trống Số lượng ở màn Chọn sản phẩm thì tự phân bổ TOÀN BỘ tồn kho.** (`040_008`) Hành vi mặc định nguy hiểm — người dùng phải xoá bớt từng dòng lô. |
| e | **Chưa chốt được luật giá bán.** `050_003` `050_004`: sửa giá bán tự do được tới đâu, có chặn dưới giá vốn / giá sàn không, giá âm có được không — HDSD 050 🚫 không nói. **Cần user quyết.** |
| f | **Chưa chốt được luật số lượng.** `050_005` `050_006`: số lượng 0, âm, và rất lớn — HDSD 🚫 không nói. |
| g | **`dong67` "đóng tab khi chỉ có 1 tab" — sheet QC mô tả hai nhánh nhưng không chốt.** Case `010_006` để ghi hành vi thật rồi chốt với QC. |
| h | **`dong90` F5 khôi phục tab treo** — nếu KHÔNG khôi phục thì mất đơn của khách đang đứng chờ. Case `010_015` là case đáng chạy sớm nhất trong cả bộ. |
| i | **`BANHANG_163` nhấc hàng khỏi cân trước khi thanh toán** — nếu số lượng bị reset về 0 thì mất tiền. Case `060_023`. |

## 11. Nguồn đã dùng — và chỗ chưa làm

| Nguồn | Mức |
|---|---|
| HDSD | đọc **trọn 7/7 file**, kể cả khối ⚠️ và 💡 |
| Sheet QC | `doi-chieu-goc.js` → **56/56**, đối chiếu từng mã |
| FE | `config.jsx` · `ordersApi.js` · `ordersEndpoints.js` · `CreateOrderPage.jsx` · `SearchProduct.jsx` |

🔴 **Chưa làm:**

1. 🚫 **Chưa chạy SELECT kiểm dữ liệu thật** — mọi con số trong tiền điều kiện (`tồn 5`, `35.000đ/kg`,
   mã vạch `8938505974197`) là **giá trị mẫu**.
2. 🚫 **Chưa đọc backend.** `CreateOrderPage.jsx` dài, tôi đọc **theo grep có định hướng**
   (`message.`, chuỗi lỗi) chứ không đọc trọn; và 🚫 **chưa đọc service checkout phía BE**
   (`/spa-checkout/v2.1`). ⇒ Case `020_019` (thanh toán chặn khi không đủ hàng) mô tả theo HDSD,
   **chưa có nguyên văn thông báo của BE**. Đây là chỗ hở lớn nhất còn lại của phân hệ.
3. 🚫 **Chưa trace logic cân** (`Web Serial`) và logic tách mã vạch hàng cân ⇒ case `030_014`
   `060_009` `060_021` mô tả hiện tượng, 🚫 không mô tả thuật toán.
4. 🚫 **Chưa trace luật giá bán** (lỗ hổng e) — chưa tìm ra chỗ code kiểm giá sàn.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `18_1_010_006` | Đóng tab đơn khi chỉ có duy nhất 1 tab | Chờ chạy để lấy hành vi thật · Chờ chốt với QC | Tab rỗng: đóng rồi hệ thống mở lại một tab tạm mới (🚫 không để màn trống). Tab đang có hàng: hỏi xác nhận trước. Ghi lại hành vi thật để chốt với QC |
| `18_1_010_015` | Tải lại trang F5 khi đang có tab treo | Điều kiện chưa xác định | Hệ thống tự khôi phục lại các tab treo kèm dữ liệu. 🔴 Nếu mất thì là lỗ hổng nghiêm trọng — mất đơn của khách đang đứng chờ |
| `18_1_010_019` | Tìm kiếm khách hàng chưa có trong danh sách | Thiếu nguyên văn thông báo | Hiện thông báo chưa có khách hàng kèm lối thêm mới. Ghi lại nguyên văn thông báo thật |
| `18_1_020_009` | Tìm sản phẩm không dấu | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật. 🔴 Dữ liệu VNPost trộn Anh–Việt nên tìm không dấu là thao tác thường ngày của giao dịch viên |
| `18_1_030_011` | Quét barcode khi mất kết nối máy quét | Chờ chạy để lấy hành vi thật | 🚫 Không hiển thị sản phẩm nào, 🚫 không có dòng hàng mới. Ghi lại xem hệ thống có cảnh báo gì không |
| `18_1_040_007` | Phân bổ THIẾU so với số lượng bán bị chặn | Thiếu nguyên văn thông báo | Bị chặn ở nút "Cập nhật"; dòng "Đã phân bổ" hiện 3/5. Ghi lại nguyên văn thông báo thật |
| `18_1_050_003` | Sửa giá bán của dòng hàng | Chờ chạy để lấy hành vi thật | Tổng tiền dòng và khối tiền đổi theo ngay. 🔴 Ghi lại xem hệ thống có chặn giá thấp hơn giá vốn hay giá sàn không |
| `18_1_050_004` | Giá bán âm hoặc bằng 0 | Chờ chạy để lấy hành vi thật · Điều kiện chưa xác định | Ghi lại hành vi thật. 🔴 Nếu cho phép giá âm thì đơn hàng trả tiền cho khách — lỗ hổng nghiêm trọng |
| `18_1_050_005` | Số lượng bằng 0 hoặc âm trên dòng hàng | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: dòng hàng bị xoá, hay giữ ở 1, hay báo lỗi |
| `18_1_050_006` | Số lượng rất lớn | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật; khối tiền 🚫 không được tràn số hay hiện NaN |
| `18_1_060_019` | Quét barcode SAI sản phẩm rồi mới cân | Chờ chạy để lấy hành vi thật · Chờ chốt với QC | 🔴 Khối lượng vào dòng vừa quét (sai sản phẩm). Ghi lại số lượng thật để chốt với QC — đây là chỗ dễ sai tiền nhất |
| `18_1_060_022` | Mất kết nối cân sau khi quét barcode | Thiếu nguyên văn thông báo | Hiển thị thông báo lỗi cân. Ghi lại nguyên văn — HDSD chỉ nêu "Không thể kết nối cân, vui lòng thử lại" |
| `18_1_060_023` | Nhấc sản phẩm cuối cùng khỏi cân trước khi thanh toán | Chờ chạy để lấy hành vi thật | 🔴 Số lượng đã ghi 🚫 KHÔNG bị xoá về 0 khi nhấc hàng. Ghi lại hành vi thật — nếu bị reset thì mất tiền của khách |

**13/131 case** của phân hệ này chưa chốt được kỳ vọng.
