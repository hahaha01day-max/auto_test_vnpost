# Kịch bản auto test — 18_5 Đổi trả hàng

- Ngày dựng: **18/09/2026** · skill `test-scenario` · nguồn `hdsd18_5_doi_tra_hang/tasks/*.md` (8 task)
- 🚫 Chưa viết script.

## 1. Route

| Màn hình | Route |
|---|---|
| `ORDER_ADD` — màn lập đơn / đổi trả | mở từ chi tiết đơn gốc hoặc `/order/return-orders` → **Đổi trả hàng** |
| `ORDER_RETURN` — Đơn hàng › Đơn hàng đổi trả | `/order/return-orders` |
| `ORDER_RETURN_DETAIL` | `/order/return-orders/detail/:orderId/:shopId` |
| Đơn hàng đã tạo (để mở đơn gốc) | `/order/created-orders` |

## 2. Vai

Task 010–050 và 070: **chỉ** `DIEM_BAN`. Task 060, 080: đủ 4 cấp.
⚠️ Task 070 (duyệt đơn quá hạn) cũng khai `DIEM_BAN` nhưng đòi quyền riêng
`approve_reject_return_order` ⇒ dùng `shop`, còn `gdv` dùng cho case phạm vi.

## 3. Phân loại

> 🔄 **Cập nhật 19/09/2026** — bổ sung 34 case: phủ nốt 15 case gốc sheet QC, cộng 19 case từ
> **trace `PodException` ở BE** và quét kỹ thuật mục 3.4. Tổng **58 case** (trước: 24).

| Nhãn | Số case |
|---|--:|
| `READY` | 4 |
| `READY_WITH_CODE_LOOKUP` | 6 |
| `BLOCKED` | 48 |

🔴 **48/58 case `BLOCKED`** — tỉ lệ cao nhất trong mọi phân hệ đã dựng, và đó là **con số thật**:
gần như mọi ca trả hàng đều cần một **đơn gốc có thật của khách có thật** ở đúng trạng thái
(nợ toàn bộ / nợ một phần / có VAT / có combo / có điểm / có serial / có lô). Không có bộ dữ liệu
nền chuyên dùng cho test thì 🚫 không chạy được, và 🚫 không được hạ kỳ vọng xuống "màn hình không
báo lỗi" cho dễ tự động hoá.

⭐ Phân hệ này có **nhiều thông báo nguyên văn nhất** trong các bộ đã dựng — 8 câu lỗi chép thẳng từ
HDSD. Kỳ vọng đo được ngay khi dựng được dữ liệu đầu vào.

## 4. Case ghi dữ liệu — 🔴 chưa ai được phép chạy

`18_5_040_002` · `18_5_050_001` · `18_5_050_002` · `18_5_050_003` · `18_5_070_002` · `18_5_070_003`

🔴 **`18_5_050_001` tạo đơn hoàn trả thật**: nhập lại hàng vào kho, hoàn tiền, sửa đơn gốc — và HDSD
nói rõ **đơn hoàn trả đã chốt thì không sửa được**. `18_5_070_002` phê duyệt còn **hoàn điểm tích luỹ
của khách**.
⚠️ Mọi case còn lại của luồng lập đơn (`010`, `020`, `030`) chỉ **mở màn** chứ không chốt, nhưng vẫn
`BLOCKED` vì cần một đơn gốc thật của khách thật.

## 4b. 🔴 Thông báo BE — nguyên văn, trace 19/09/2026

Grep `PodException(` trong
`vnpost-pod-service/src/main/java/sshop/pod/modules/return_order/service/impl/ReturnOrderServiceImpl.java`:

| Nguyên văn | Case dùng |
|---|---|
| `Ca hien tai chua gan quay thu ngan` | `140_001` |
| `Không đủ lô để hoàn đúng số lượng yêu cầu` | `140_002` |
| `Không đủ serial để hoàn` | `140_003` |
| `Số lượng hoàn theo serial phải là số nguyên` | `140_004` |
| `Không tìm thấy serial: ` (nối thêm serial vừa nhập) | `140_005` |
| `Bien the hoan khong khop voi dong don hang hien tai` | `140_006` |
| `Không xác định được thời gian tạo đơn để kiểm tra chính sách hoàn trả` | `140_007` |
| `Đơn hoàn trả đang chờ duyệt, chưa được phép đổi hàng` | `140_008` |
| `Đơn hoàn không thuộc shop hiện tại` | `140_009` |
| `Đơn hoàn không ở trạng thái chờ duyệt` | `140_010` |
| `Khong tim thay component trong combo` | `110_004` |

Còn chưa dùng tới case nào (ghi lại để phiên sau khỏi grep lại): `San pham hoan khong khop voi dong
don hang hien tai` · `Mode hoan tra khong hop le` · `Thieu thong tin don doi tra va hoan tra` ·
`Thieu thong tin don hoan tra` · `Không tìm thấy thông tin sản phẩm` · `Lỗi khi tạo đơn đổi: ` ·
`Không thể kiểm tra điều kiện hoàn trả CTKM` · `Khong the kiem tra ngan sach chien dich khuyen mai` ·
`RETURN_POLICY_DAYS_EXCEEDED`.

🔴 **Thông báo lẫn lộn CÓ DẤU và KHÔNG DẤU trong cùng một file.** `Ca hien tai chua gan quay thu ngan`,
`Bien the hoan khong khop...`, `Mode hoan tra khong hop le`, `Thieu thong tin...`,
`Khong tim thay component trong combo` là tiếng Việt **không dấu** đưa thẳng cho người dùng cuối đọc;
các câu khác cùng file lại có dấu đầy đủ. Đáng báo để thống nhất — xem mục 5.

⚠️ `RETURN_POLICY_DAYS_EXCEEDED` là **mã lỗi thô** lọt vào chỗ đáng lẽ là câu tiếng Việt.

## 5. Lỗ hổng đặc tả

- Task 030 không nói **giới hạn phí trả hàng** (có trần không? âm được không?).
- Task 060 nói có nhóm **"tiền hoàn bất thường"** theo ngưỡng cấu hình của đơn vị nhưng **không nói
  ngưỡng lấy ở đâu** — liên quan tới `07_3` (cấu hình ngưỡng hoàn trả bất thường). Chưa dựng được case
  kiểm ngưỡng; cần nối hai phân hệ. Sheet QC `FUNC_DOITRA__24` lấy ví dụ ngưỡng `>= 50.000 đ`
  nhưng **không nói đó là giá trị cấu hình hay giá trị cứng** ⇒ `130_001` viết theo "ngưỡng cấu hình",
  🚫 không chốt con số 50.000.

### 🔄 Bổ sung 19/09/2026

- 🔴 **Thông báo lẫn có dấu / không dấu** ở `ReturnOrderServiceImpl` (mục 4b). Người dùng cuối đọc
  `Ca hien tai chua gan quay thu ngan` bên cạnh `Không đủ serial để hoàn` trong cùng một luồng.
  Sửa cho thống nhất hay giữ nguyên? Case đang bám **đúng nguyên văn code**, sửa code là phải sửa case.
- 🔴 **`RETURN_POLICY_DAYS_EXCEEDED` là mã lỗi thô** nằm trong chuỗi message, không phải câu tiếng Việt.
- 🔴 **Sheet QC chốt cứng mã phiếu trả** (`TH_202606_007`, `TH_202606_0011`…) trong kỳ vọng.
  🚫 Không chép: mã sinh theo tháng và số thứ tự chạy, chạy lại sẽ ra mã khác. Case đã dựng viết
  *"Phiếu trả được tạo"* thay vì chốt mã — đây là **viết lại kỳ vọng sai của sheet**, đúng luật 4.3
  của handoff.
- ⚠️ **Sheet QC `FUNC_DOITRA__13` và `FUNC_DOITRA__21` mô tả gần như trùng nhau** (đều: đơn về
  "Đã hủy", sinh phiếu chi 20.000 đ, tồn kho tăng 1). Khác ở điểm xuất phát: `__13` trả hàng từ đơn
  **đã ở trạng thái huỷ**, `__21` **huỷ đơn** đang bình thường. Đã dựng thành hai case riêng
  (`090_004` / `090_005`) vì đường đi khác nhau — nếu QC xác nhận là trùng thì gộp lại.
- ⚠️ **Clawback combo chưa có đặc tả nào ngoài ba case sheet QC.** Code có
  `shouldApplyLegacyClawbackAfterReturn` (`ReturnOrderServiceImpl:585`) phân nhánh **V1 giữ luật
  clawback riêng, V2 chỉ tái dùng đường ghi trạng thái** (comment dòng 512, 584). Nghĩa là **hai luật
  clawback song song** tuỳ đơn đi đường nào — HDSD không nhắc chữ nào. `110_001`–`110_003` bám
  sheet QC, 🚫 chưa xác minh được chúng rơi vào nhánh V1 hay V2.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `18_5_150_001` | Phí trả hàng nhận giá trị âm | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: ô có nhận số âm không, và tiền hoàn có bị cộng thêm không |
| `18_5_150_002` | Phí trả hàng lớn hơn tiền hoàn | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: bị chặn, hay tiền hoàn về 0, hay thành số âm |
| `18_5_150_003` | Số lượng trả bằng 0 | Thiếu nguyên văn thông báo | Bị chặn, không tạo phiếu trả. Ghi lại nguyên văn thông báo |
| `18_5_160_002` | Danh sách đơn hoàn trả rỗng | Thiếu nguyên văn thông báo | Bảng về trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `18_5_160_004` | Tìm kiếm đơn hoàn trả bằng ký tự đặc biệt | Chờ chạy để lấy hành vi thật | Không lỗi 500; không trả về toàn bộ đơn. Ghi lại hành vi thật |
| `18_5_PQ_002` | Vai bưu điện xã không xem được đơn hoàn trả của điểm bán | Chờ chạy để lấy hành vi thật | Không thấy đơn hoàn trả của điểm bán khác cấp. Ghi lại hành vi thật |

**6/58 case** của phân hệ này chưa chốt được kỳ vọng.

---

## Kết quả chạy script (20/09/2026)

```bash
npx playwright test --config tai-lieu-test/18_5_doi_tra_hang/playwright.config.js --project=shop --project=gdv
```

**7 đạt · 0 hỏng · 59 chưa chạy.**

### Màn thật — đo từ DOM bằng vai `shop`

| Thứ | Giá trị |
|---|---|
| Route | `/order/return-orders` · tiêu đề `Đơn hàng hoàn trả` |
| API | `GET /__api/orders/return-orders?shopId&type&page&size&startTime&endTime` |
| Cột | STT · Mã đơn trả · Mã đơn hàng · Khách hàng · Số tiền hoàn · Trạng thái · Ngày tạo · Hành động |
| Bộ lọc | cặp ngày · ô `Mã đơn` · 2 select (`Tất cả`, `Chọn trạng thái`) |
| Nút | `Xuất Excel` · `Đổi trả hàng` |

🔴 Màn **không có tab trạng thái** — trạng thái lọc bằng `Select`.

### Đã chạy và đạt

| Case | Kiểm được gì |
|---|---|
| `18_5_060_001` | Đủ 8 cột đúng thứ tự; gõ mã đơn ⇒ từ khoá **đi vào query**, kèm `startTime`/`endTime` |
| `18_5_060_002` | Nút `Xuất Excel` có thật và bấm ra được tệp/lượt gọi xuất |
| `18_5_160_002` | Danh sách rỗng ⇒ có khối trạng thái rỗng, không lỗi kỹ thuật |
| `18_5_160_003` | Chọn trạng thái ⇒ query mang điều kiện trạng thái **mà không mất** điều kiện thời gian |
| `18_5_PQ_001` | Vai `gdv`: 0 nút duyệt/từ chối trên màn, và 0 request ghi lọt ra |

### Chưa chạy — có lý do

- `18_5_160_001` (phân trang) và `18_5_160_004` (ký tự đại diện SQL): điểm bán test có **0 đơn
  hoàn trả** ⇒ skip kèm lý do. 🚫 Không kết luận "escape đúng" từ một bảng rỗng.
- 57 lượt còn lại: `mutates` — đổi trả sinh **nhập lại kho + hoàn tiền + điều chỉnh giảm hoá đơn**,
  🚫 không hoàn tác được bằng giao diện.

Mọi spec đọc đều bọc `chanGhi()` chặn ở tầng mạng mọi request khác `GET`.
