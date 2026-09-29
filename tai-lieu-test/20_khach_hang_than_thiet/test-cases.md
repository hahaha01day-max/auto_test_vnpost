# Kịch bản auto test — 20 Khách hàng thân thiết

- Ngày dựng: **18/09/2026** · hoàn thiện **19/09/2026** · skill `test-scenario`
- Nguồn: `hdsd20_khach_hang_than_thiet/tasks/*.md` (4 task) + `91_su_co.md` + `92_faq.md` · sheet QC
  `uat_vnpost_ct_loyalty.csv`, `uat_vnpost_loyalty.csv` · **trace code FE + BE** (mục 1–4 dưới đây).
- 🚫 Chưa viết script. 104 case trong `test-cases.csv`.

## 1. Route

| Màn hình | Route | Nguồn |
|---|---|---|
| Quản lý chiến dịch Loyalty | `/care/loyalty` | `utils/constants/config.jsx:132` · `routes/configs/dashboard/careRoutes.js:38` |

- Quyền route: `ROUTES_PERMISSION.LOYALTY = [PERMISSION_KEY.loyalty]`.
- Route còn kèm điều kiện cấu hình điểm bán **`enableCustomerLoyalty`** (`careRoutes.js:47`) — điểm bán
  chưa bật thì **không thấy menu**, dù tài khoản đủ quyền (case `20_070_002`).
- 🔴 Các route `ADD_LOYALTY_CAMPAIGN` / `LOYALTY_EDIT_CAMPAIGN` còn khai trong `config.jsx:133-136`
  nhưng **màn hình hiện tại dùng Drawer**, không điều hướng sang route đó. 🚫 Đừng viết script đi thẳng URL.

## 2. API — FE ↔ BE đối chiếu hai đầu

Gateway: `- Path=/loyalty/**` → `http://localhost:8007` (`vnpost-gateway-service/application.yml:118-121`).
Controller BE khai `@RequestMapping("/campaign")` / `("/redeem-campaign")`, prefix `/loyalty` do
context-path ⇒ **URL đầy đủ luôn bắt đầu bằng `/loyalty`**.

| Việc | FE (`features/loyalty/services/loyaltyApi.js`) | BE |
|---|---|---|
| Lấy chương trình tích điểm | `GET /loyalty/campaign/get-campaign` | `CampaignController.queryCampaign` |
| Chi tiết tích điểm | `GET /loyalty/campaign/get-campaign/{campaignId}` | `getDetailCampaign` |
| Tạo tích điểm | `POST /loyalty/campaign/create-campaign` | `createCampaign` |
| Sửa tích điểm | `PUT /loyalty/campaign/edit-campaign/{campaignId}` | `updateCampaign` |
| Xoá tích điểm | `DELETE /loyalty/campaign/delete-campaign/{campaignId}` | `deleteCampaign` (chỉ set `active=false`) |
| Lấy chương trình đổi điểm | `GET /loyalty/redeem-campaign/get-campaign` | `RedeemCampaignController.queryCampaign` |
| Tạo đổi điểm | `POST /loyalty/redeem-campaign/create-campaign` | `createCampaign` |
| Sửa đổi điểm | `PUT /loyalty/redeem-campaign/edit-campaign/{campaignId}` | `updateCampaign` |
| Kiểm phạm vi điểm bán | `GET /loyalty/campaign/check-scope?shopId=` | `checkCampaignScope` (cache Redis 60 phút) |
| Nhóm khách hàng | `GET /loyalty/api/v1/customer-group/get-list` · `/get-all` | `CustomerGroupController` |
| Điểm hiện có của khách | `GET /loyalty/customer/get-customer-loyalty-info/{customerId}` | `CustomerController` |
| Tính điểm khi bán | `POST /loyalty/campaign/calculate-point` | `CampaignService.calculatePointRes` |
| Tính tiền giảm khi đổi điểm | `POST /loyalty/redeem-campaign/calculate-loyalty-amount` | `RedeemCampaignService.calculateLoyaltyAmountRes` |

🔴 **Hai endpoint FE khai mà màn hình không có nút gọi:** `DELETE .../delete-campaign/{id}` và
`PUT /loyalty/campaign/switch/{campaignId}`. Màn hình tắt chương trình bằng cách **sửa cả bản ghi**
(`edit-campaign` với `active=false`), không dùng `switch`.

## 3. Nhãn hiển thị — lấy từ code, 🚫 không chép HDSD

⚠️ Nhãn tiếng Việt trong code ở dạng tổ hợp (NFD) — script so chuỗi phải `normalize("NFC")` trước.

**Màn chính** (`CampaignList.jsx`): `Chương trình tích điểm` · `Chương trình đổi điểm` ·
`Thêm chương trình tích điểm` · `Thêm chương trình đổi điểm` · `Xem chi tiết` · `Chỉnh sửa` ·
nhãn trạng thái `Đang hoạt động` (xanh) / `Ngừng hoạt động` (đỏ) ·
câu tóm tắt `Thành viên chương trình tích điểm sẽ nhận được 1 điểm cho <tiền> chi tiêu` và
`Thành viên có thể đổi 1 điểm để nhận ưu đãi trị giá <tiền>`.

**Form tích điểm** (`DrawerUpdateCampaign.jsx`): tiêu đề `Tạo chương trình tích điểm` /
`Cập nhật chương trình tích điểm`; thẻ `Thông tin chung` · `Phạm vi áp dụng`; công tắc
`Sử dụng chương trình tích điểm`; hai thẻ `Đơn hàng` / `Sản phẩm`; khối `Cấu hình chương trình tích điểm`,
`Tỷ lệ tích điểm`, `Thời gian áp dụng`, `Điều kiện`, `Đối tượng áp dụng`; ô
`Số tiền chi tiêu` **đổi nhãn thành `Giá bán sau thuế (VAT)` khi chọn thẻ Sản phẩm**; `Điểm thành viên`
(readonly = 1); nút `Hủy` và `Xác nhận`.
Bảng nhóm khách hàng có **5 cột**: `STT` · `Tên nhóm` · `Đối tượng áp dụng` · `Số lượng thành viên` ·
`Thao tác`; rỗng thì hiện `Chưa có nhóm khách hàng nào được chọn`.

**Form đổi điểm** (`DrawerUpdateRedeemCampaign.jsx`): nút đóng mang nhãn **`Đóng`** (khác `Hủy` của màn
tích điểm); khối `Tỷ lệ đổi điểm`; **không có** phần loại tích điểm, điều kiện loại trừ, đối tượng khách hàng.

**Màn chi tiết tích điểm** (`DrawerDetailCampaign.jsx`) — 9 dòng, chép đúng nguyên văn:
`Trạng thái` · `Loại chương trình` (`Theo sản phẩm` / `Theo đơn hàng`) · `Tỷ lệ tích điểm` ·
`Thời gian áp dụng` · 🔴 **`Giá trị đơn hàng tối thiếu`** (lỗi chính tả trong code, 🚫 đừng sửa thành
"tối thiểu" khi viết assertion) · `Không tích điểm cho SP giảm giá` · `Không tích điểm cho HĐ giảm giá` ·
`Không tích điểm cho HĐ thanh toán bằng điểm` · `Phạm vi khách hàng`.
Không có ngày kết thúc thì hiện `Không giới hạn`; chưa đặt mức tối thiểu thì hiện `Không có`.

**Màn chi tiết đổi điểm** — 4 dòng: `Trạng thái` · `Tỷ lệ đổi điểm` · `Điều kiện hóa đơn` · `Thời gian áp dụng`.

🔴 **Tab `Điểm phân hạng` và nút `Làm mới điểm` đã bị comment** trong `LoyaltyPage.jsx` ⇒ mọi case về
phân hạng / làm mới điểm **không test được** ở bản hiện tại (khớp FAQ `92_faq.md`).

## 4. Thông báo — nguyên văn từ code

**FE (`message.error` / rule form):**

| Chuỗi | Ở đâu |
|---|---|
| `Ngày bắt đầu ở trong tương lai, không thể kích hoạt chương trình` | `DrawerUpdateCampaign.jsx:313` |
| `Ngày bắt đầu ở trong tương lai, không thể kich hoạt chương trình` | 🔴 `DrawerUpdateRedeemCampaign.jsx:86` — **thiếu dấu** ở "kich hoạt", khác bản trên |
| `Ngày kết thúc phải lớn hơn thời gian hiện tại, không thể kích hoạt chương trình` | cả hai drawer |
| `Bạn chưa chọn ngành hàng nào` | `DrawerUpdateCampaign.jsx:318` |
| `Vui lòng chọn phạm vi áp dụng` | cả hai drawer |
| `Vui lòng nhập số tiền chi tiêu` | `DrawerUpdateCampaign.jsx:584` — 🔴 **không bao giờ hiện**, xem mục 5 |
| `Vui lòng chọn thời gian áp dụng` | form tích điểm |
| `Vui lòng chọn thời gian bắt đầu` | form đổi điểm (chuỗi **khác** form tích điểm) |
| `Vui lòng chọn danh mục hoặc combo` | ô chọn danh mục |
| `Vui lòng chọn đối tượng áp dụng` · `Vui lòng chọn ít nhất một nhóm khách hàng` | khối Đối tượng áp dụng |
| `Nhóm đã tồn tại trong danh sách` | chọn trùng nhóm |
| `Số tiền chi tiêu phải lớn hơn 0` | form đổi điểm (2 lớp: rule + `handleUpdate`) |
| `Tạo/Cập nhật chương trình tích điểm thành công` · `Tạo/Cập nhật chương trình đổi điểm thành công` | toast thành công |

**BE (`LoyaltyException`) — chép nguyên văn:**

| Chuỗi | Ở đâu |
|---|---|
| `Có một chiến dịch đang chạy, vui lòng tạm ngừng chiến dịch hiện tại trước khi tiếp tục.` | `CampaignService.java:148` |
| `Có một chiến dịch đang chạy, vui lòng tạm ngừng trước khi tiếp tục.` | `RedeemCampaignService` — 🔴 **ngắn hơn**, hai chuỗi khác nhau |
| `Không tìm thấy chiến dịch` · `Chiến dịch quy đổi điểm không tồn tại` | tra không thấy bản ghi |
| `Chiến dịch không hoạt động` · `Chiến dịch chưa bắt đầu` · `Chiến dịch đã kết thúc` | `calculateLoyaltyAmountRes` |
| `Cửa hàng không thuộc phạm vi áp dụng của chương trình đổi điểm` | `OUT_OF_SCOPE` |
| `Điều kiện không hợp lệ để sử dụng điểm thưởng` | `INVALID_CONDITION` |
| `Phạm vi áp dụng không hợp lệ: <giá trị>. Chỉ nhận TONG_CONG_TY, BUU_DIEN_TINH, BUU_DIEN_XA, DIEM_BAN` | `CampaignScopeService:272` |
| `Vui lòng chọn ít nhất một đơn vị áp dụng cho phạm vi <cấp>` · `Mã đơn vị áp dụng không được để trống` | `CampaignScopeService:276-285` |

**Công thức tính điểm** (`CampaignService.calculatePointRes`, dòng 471-495) — cơ sở viết kỳ vọng đo được:

```
baseAmount = campaignType==1 ? tổng tiền các dòng (isLoyalty && đúng danh mục && allowPoint)
           : noPointForDiscountedProduct ? tổng tiền các dòng có allowPoint != false
           : totalAmount
point = (baseAmount >= orderAmountConditional && orderAmountPerPoint > 0)
      ? floor(baseAmount / orderAmountPerPoint) : 0
```

Tiền giảm khi đổi điểm: `min(usePoint × orderAmountPerPoint, totalAmount)`, chỉ khi
`totalAmount >= orderAmountConditional` **và** `điểm khách >= usePoint`.

## 5. Phân loại

| Nhãn | Số case |
|---|--:|
| `READY` (chỉ đọc, chạy được ngay) | 47 |
| `READY_WITH_CODE_LOOKUP` (ghi dữ liệu, còn chờ locator) | 57 |
| `BLOCKED` | 0 — mọi case đều có kỳ vọng đo được |

Cận trên của `READY_WITH_CODE_LOOKUP` trùng đúng danh sách `mutates` ở mục 6.

## 6. Case ghi dữ liệu — 🔴 chưa ai được phép chạy

57 case: toàn bộ nhóm `050_*` (23 case bán hàng thật) và `060_*` (8 case trừ điểm khách thật), cộng các
case lưu cấu hình: `20_010_003`–`013`, `014`, `018`, `022`, `032`, `20_020_003`, `006`, `008`, `012`,
`20_030_003`, `20_040_007`–`009`, `012`–`014`.

🔴 **Cấu hình loyalty là của TOÀN CHAIN**, không của riêng điểm bán: `get-campaign` lọc theo `chainId`
lấy từ `Payload`, mỗi chain chỉ giữ **một** chương trình mỗi loại (`checkCampaignActive` chặn cái thứ hai).
⇒ Một case test sửa tỷ lệ tích điểm là **mọi điểm bán trong chain** tích điểm theo tỷ lệ đó ngay lập tức,
và không có bản cũ để hoàn tác. Nhóm `050`/`060` còn tạo đơn bán và trừ điểm khách thật.

## 7. Lỗ hổng đặc tả và mâu thuẫn tài liệu ↔ code

1. 🔴 **Validator ô `Số tiền chi tiêu` (tích điểm) khai sai chữ ký** — `validator: (value) => {...}`
   trong khi antd truyền `(rule, value)`; tham số nhận được luôn là object rule nên điều kiện
   `value === undefined || value === null || value < 0` **không bao giờ đúng**. Hệ quả:
   `Vui lòng nhập số tiền chi tiêu` không bao giờ hiện, và form gửi được cả khi ô rỗng
   (`DrawerUpdateCampaign.jsx:575-591`). Case `20_010_020`.
2. 🔴 **Luật "Không tích điểm cho hóa đơn thanh toán bằng điểm thưởng" đã bị comment ở BE**
   (`CampaignService.java:457-462`). Ô tích vẫn hiện, giá trị vẫn lưu vào DB, nhưng khi bán thì
   **không có tác dụng** — sai im lặng. Case `20_010_011`, `20_010_012`, `20_050_009`.
3. 🔴 **Tỷ lệ tích điểm = 0 lưu được** (FE chỉ chặn số âm), và BE yêu cầu `orderAmountPerPoint > 0` mới
   tính điểm ⇒ chương trình "đang hoạt động" nhưng mọi đơn tích 0 điểm mà không có cảnh báo nào.
   Sheet QC đòi `Tỷ lệ tích điểm phải lớn hơn 0` — chuỗi này **không tồn tại trong mã nguồn**.
   Case `20_010_018`, `20_050_021`.
4. 🔴 **Ngày bắt đầu trong quá khứ KHÔNG bị chặn** ở cả hai màn, trong khi sheet QC (`FUNC_LOYALTY__16`,
   `FUNC_LOYALTY__26`) đòi lỗi `Thời gian bắt đầu phải từ hiện tại trở đi`. Code chỉ chặn ngày **tương lai**.
5. 🔴 **Hai màn xử lý ngày kết thúc lệch nhau**: tích điểm chặn khi ngày kết thúc **không lớn hơn** hôm
   nay (`!isAfter`), đổi điểm chỉ chặn khi ngày kết thúc **trước** hôm nay (`isBefore`) ⇒ ngày kết thúc =
   hôm nay bị chặn ở màn này nhưng lọt ở màn kia. Case `20_010_016` ↔ `20_020_008`.
6. 🔴 **Thông báo "không đủ điểm" không tồn tại**: sheet QC đòi `Số điểm không đủ (cần 100, hiện có 50)`,
   code trả chung `Điều kiện không hợp lệ để sử dụng điểm thưởng` cho cả hai nguyên nhân (dưới mức tối
   thiểu và thiếu điểm). Case `20_060_003`.
7. 🔴 **Sheet QC kiểm bằng màn "Lịch sử tích điểm" của khách hàng — màn này không có trong FE.**
   `rg "Lịch sử tích điểm"` trên `vnpost-web/src` không ra kết quả nào; chỗ duy nhất đọc được là dòng
   `Điểm hiện tại: <số>` ở chi tiết khách hàng (`CustomerRank.jsx`). Toàn bộ nhóm `050_*` phải đổi điểm
   kiểm chứng sang đó — 🔴 nghĩa là **không phân biệt được** đơn nào cộng bao nhiêu điểm khi bán liên tiếp.
8. 🔴 **Mức "Giá trị đơn hàng tối thiểu" so với `baseAmount`, không phải tổng đơn.** Với chương trình
   loại Sản phẩm hoặc có loại trừ sản phẩm giảm giá, đơn đạt mức tối thiểu vẫn có thể ra 0 điểm.
   HDSD mô tả là "đơn dưới mức này không được tích điểm" — không khớp cách tính. Case `20_050_013`.
9. **Nút "Thêm chương trình…" không gắn `PermissionButton`** (`CampaignList.jsx:105,167` là `Button`
   trần) ⇒ `FUNC_LOYALTY__29` chỉ kiểm được ở mức route, không kiểm được ở mức nút.
10. **`campaignType` chú thích ngược trong `NewCampaignReq.java:22`**: comment ghi "1=Tính theo tổng hóa
    đơn, 2=Tính theo sản phẩm", trong khi FE gửi **0 = Đơn hàng, 1 = Sản phẩm** và `makeCampaignEntity`
    mặc định 0 = theo hóa đơn. Comment sai, code đúng — người viết script đọc comment sẽ đặt sai dữ liệu.
11. **`get-campaign` GHI DỮ LIỆU khi đọc**: `queryCampaign` tự `save()` đặt `active=false` khi ngoài
    khoảng thời gian. Một lần mở màn hình là một lần cập nhật DB ⇒ đừng coi API này là read-only khi
    đánh giá `mutates`.
12. **Sheet QC trộn 5 case của phân hệ khác**: `FUNC_DOITRA__26`–`30` nằm dưới tiêu đề nhóm
    *"Kiểm tra chức năng đổi điểm"* của `uat_vnpost_doi_tra_hang.csv` nhưng nội dung là **đổi hàng**
    (tạo phiếu trả `TH_2026xx_xxxx`, đơn hàng mới) — thuộc `18_5_doi_tra_hang`. 🚫 Không dựng ở đây;
    cần sửa `tool/core/goc-mapping.js` — xem nhận xét tay trong `doi-chieu-tai-lieu-goc.md`.

## 8. Quét 11 kỹ thuật mục 3.4 — đã áp cho từng màn

| # | Kỹ thuật | Case |
|---|---|---|
| 1 | Ô bắt buộc | `20_010_002` (gộp) · `020` (riêng ô tỷ lệ) · `026` · `023` · `20_020_002` · `20_030_002` |
| 2 | Khoảng trắng | `20_030_009` (ô tìm kiếm toàn space) — các ô còn lại là ô số/ngày/checkbox, không có ô nhập chữ tự do |
| 3 | Giá trị biên | `20_010_016` `017` `018` `019` `022` · `20_020_004` `005` `008` `009` · `20_050_002` (mốc bằng) · `20_050_022` (làm tròn) |
| 4 | Kiểu dữ liệu sai | `20_010_021` · `20_010_017` (ngày ngược) |
| 5 | Tính duy nhất | `20_010_025` (nhóm trùng) · `20_010_032` · `20_020_012` (mỗi chain một chương trình) |
| 6 | Bảng trạng thái × hành động | `20_040_007`–`010` (bật/tắt × còn hạn/hết hạn) · `20_060_005`–`008` (dùng điểm × 4 trạng thái chương trình) |
| 7 | Danh sách | `20_010_029` (phân trang nhóm) · `20_030_007` (lọc đã chọn) · `20_010_027` (bảng rỗng) |
| 8 | Tìm kiếm | `20_010_028` · `20_030_009` |
| 9 | Huỷ giữa chừng | `20_010_030` · `20_020_011` · `20_030_008` |
| 10 | Phạm vi theo vai | `20_070_001`–`004` · `20_030_010` · `20_060_008` |
| 11 | Sau khi ghi | toàn bộ `20_050_*` và `20_060_*` (kiểm số điểm/tiền giảm, không kiểm "báo thành công") · `20_040_013` |

**Tự soát bằng luật rẻ tiền:** màn Tạo chương trình tích điểm có **4 ô bắt buộc** (loại tích điểm,
Số tiền chi tiêu, Thời gian bắt đầu, Đối tượng áp dụng — cộng 2 ô bắt buộc có điều kiện: danh mục khi
tích ngành hàng, nhóm khách hàng khi chọn Nhóm) và có **32 case** → không vi phạm. Màn đổi điểm có 2 ô
bắt buộc và **12 case**. Thẻ Phạm vi áp dụng có 3 ô bắt buộc có điều kiện và **10 case**.

## 9. Câu hỏi CHẶN cần user quyết

1. Mục 7.2 — **luật "không tích điểm cho hóa đơn thanh toán bằng điểm thưởng" bị comment là cố ý hay bỏ
   quên?** Kỳ vọng của `dong23` và `FUNC_LOYALTY__11/12` phụ thuộc câu trả lời.
2. Mục 7.7 — **màn "Lịch sử tích điểm" có nằm trong phạm vi bàn giao không?** Không có thì toàn bộ 18
   case `dong15`–`dong32` chỉ kiểm được qua số dư điểm, và phải bán từng đơn một, tách phiên.
3. Mục 7.12 — **`FUNC_DOITRA__26`–`30` chuyển sang `18_5_doi_tra_hang` được không?** Cần sửa
   `goc-mapping.js`; giữ nguyên thì độ phủ phân hệ 20 vĩnh viễn không đạt 100%.
4. Mục 7.4/7.5 — **ngày bắt đầu quá khứ và ngày kết thúc = hôm nay**: lấy code làm chuẩn hay sheet QC
   làm chuẩn? Nếu lấy sheet QC thì 4 case đang viết theo hành vi thật (`20_010_014`, `20_020_006`,
   `20_020_008`) trở thành case **bug đã biết**, phải lập phiếu chứ không phải test case.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `20_010_028` | Tìm nhóm khách hàng bằng chữ thường và không dấu | Điều kiện chưa xác định | Ghi nhận hành vi thật: ô tìm kiếm gửi keyword lên API (filterOption=false, params.keyword) nên kết quả do backend quyết. Nếu không ra nhóm thì đây là giới hạn tìm kiếm cần báo, không phải lỗi test |

**1/104 case** của phân hệ này chưa chốt được kỳ vọng.

---

## Kết quả chạy script (20/09/2026)

```bash
npx playwright test --config tai-lieu-test/20_khach_hang_than_thiet/playwright.config.js
```

**15 đạt · 5 hỏng (🔴 đều là lỗi sản phẩm, giữ đỏ) · 81 chưa chạy.**

### Màn thật — đo từ DOM (`/care/loyalty`, vai `shop`)

Tiêu đề `Quản lý chiến dịch Loyalty`, không breadcrumb, hai ô `Chương trình tích điểm` (trái) và
`Chương trình đổi điểm` (phải), mỗi ô có `Xem chi tiết` + `Chỉnh sửa`.
API: `GET /__api/loyalty/campaign/get-campaign` · `GET /__api/loyalty/redeem-campaign/get-campaign`.

🔴 Chuỗi test **đã có sẵn cả hai chương trình** ⇒ liên kết *"Thêm chương trình…"* không còn trên màn
của vai `shop`; mọi phép kiểm validate chạy trên form **Cập nhật** (cùng component). Với vai `gdv`
thì ô tích điểm **vẫn hiện "Thêm chương trình tích điểm"** — cấu hình khác nhau theo điểm bán đăng nhập.

### 🔴 Đã chạy và HỎNG — lỗi sản phẩm, bằng chứng là request bị chặn ở tầng mạng

| Case | Đo được |
|---|---|
| `20_010_020` | Bỏ trống **Số tiền chi tiêu** rồi Xác nhận: form **không cảnh báo** và **vẫn gửi** `PUT /__api/loyalty/campaign/edit-campaign/14`. Đúng như kịch bản đã chốt từ code: validator khai `(value)` trong khi antd truyền `(rule, value)` |
| `20_010_002` | Xoá rỗng **Thời gian áp dụng** rồi Xác nhận: **vẫn gửi** `PUT .../edit-campaign/14` |
| `20_030_002` | Chọn *"Chọn phạm vi cụ thể"* mà **không tích đơn vị nào**: **vẫn gửi** `PUT .../edit-campaign/14` — hệ thống không chặn, cũng không tự hiểu là toàn hệ thống |
| `20_010_021` | Gõ `abc` vào ô **Số tiền chi tiêu** ⇒ ô giữ giá trị `"abc0"`: ô số nhận cả ký tự chữ |
| `20_070_003` | Vai **giao dịch viên** vào thẳng `/care/loyalty` được và thấy đủ `Thêm chương trình tích điểm · Xem chi tiết · Chỉnh sửa` ⇒ **một giao dịch viên sửa được cấu hình tích điểm của TOÀN CHAIN** |

🔴 Ba case đầu là **cùng một lỗ hổng validate**: form gửi lệnh lưu khi dữ liệu chưa hợp lệ. Trong lần
chạy này dữ liệu thật an toàn **chỉ vì** `chanGhi()` chặn ở tầng mạng — 🚫 nếu chạy tay thì cấu hình
tích điểm của chuỗi đã bị đổi.

### Đã chạy và đạt (trích)

`20_040_001`/`20_040_002` bố cục màn · `20_040_003` drawer chi tiết **chỉ đọc thật** (0 ô sửa được) ·
`20_040_005` nhãn `Giá trị đơn hàng tối thiếu` (giữ nguyên lỗi chính tả trong code) · `20_040_006`
drawer đổi điểm · `20_010_019`/`20_020_005` ô tiền kẹp giá trị âm · `20_020_004` chặn tỷ lệ 0 ·
`20_020_010` ô số tiền tối thiểu khoá tới khi tích · `20_010_030`/`20_020_011` Hủy/Đóng không gửi
request và không giữ giá trị nháp · `20_030_001` mặc định Toàn hệ thống.

### Chưa chạy — có lý do

81 lượt: `mutates` (tạo/sửa/bật-tắt chương trình, đổi phạm vi) hoặc thiếu tiền điều kiện (cần ô
**chưa có chương trình** để mở form Thêm, cần bán hàng thật để kiểm tích điểm tại quầy). Lý do
nguyên văn nằm trong `test-input.json`.
