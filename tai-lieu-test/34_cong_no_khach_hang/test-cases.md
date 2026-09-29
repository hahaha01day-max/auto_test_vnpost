# Kịch bản auto test — 34 Công nợ khách hàng

- Ngày dựng: **18/09/2026** · skill `test-scenario` · nguồn `hdsd34_cong_no_khach_hang/tasks/*.md` (4 task)
- 🚫 Chưa viết script.

## 1. Route

| Màn hình | Route |
|---|---|
| `CUSTOMER_DEBT` — Đối soát, công nợ › Công nợ khách hàng | `/finance/customer-debt` |
| `CUSTOMER_MANAGEMENT_DETAIL` | `/customer/detail/:customerId` |

## 2. 🔴 Trùng nghiệp vụ với phân hệ 19

Task 040 (thu hồi nợ) **làm đúng việc** của `19_090_001` — cùng sinh phiếu thu *"Thu hồi nợ"*, cùng mở
từ màn chi tiết khách hàng. 🚫 **Đừng viết hai script chạy hai lần cùng một thao tác ghi tiền**: chọn
một chỗ làm chính, chỗ kia chỉ kiểm điều hướng. Cần user chốt để lại chỗ nào.

## 3. Phân loại

| Nhãn | Số case |
|---|--:|
| `READY_WITH_CODE_LOOKUP` | 2 |
| `BLOCKED` | 5 |

## 4. Case ghi dữ liệu — 🔴 chưa ai được phép chạy

`34_040_001`

🔴 Sinh **phiếu thu thật trong sổ quỹ**, y như `19_090_001` và `24_040_003`. Ba case này chạm cùng một
loại bút toán — chạy chồng nhau là số quỹ lệch gấp ba.

## 5. Lỗ hổng đặc tả

- Task 040 khai `vai_tro: [DIEM_BAN]` trong khi ba task còn lại đủ 4 cấp. **Chưa rõ đây là chủ ý hay
  thiếu sót** — `34_040_002` dựng để phơi ra, nhưng kết quả cần user xác nhận trước khi coi là lỗi.

---

## 🔄 Cập nhật 19/09/2026 — hoàn thiện tài liệu

Bổ sung **21 case** (7 → **28**): phủ nốt **10 case gốc** sheet QC (toàn bộ nhóm *Kiểm tra chức năng
tìm kiếm*, `dong18`–`dong27`) cộng 11 case quét kỹ thuật mục 3.4.
Độ phủ sheet QC: **3/13 → 13/13**.

| Nhãn | Case |
|---|--:|
| `READY` | 14 |
| `READY_WITH_CODE_LOOKUP` | 4 |
| `BLOCKED` | 10 |

`mutates` (đều `allowMutation: false`): `040_001` (bộ cũ) · `060_006` · `060_007` · `060_008`.

### Về nhóm `050` — 10 case tìm kiếm

Sheet QC phủ ô tìm kiếm rất kỹ: **3 tiêu chí × 3 dạng nhập** (khớp chính xác / khớp một phần /
không tồn tại) cộng case khoảng trắng. Ba tiêu chí là **tên khách**, **số điện thoại**, **mã đơn
hàng còn nợ**. Đây là phần HDSD 🚫 không có, đúng như số đo ở mục 3.4 của skill (*"Nhập toàn khoảng
trắng: HDSD 0 case, sheet QC 7 case"*).

### 🔴 Lỗ hổng đặc tả

1. ⚠️ **`050_011` (ký tự đặc biệt) đáng chú ý nhất bộ này.** Câu hỏi treo số 30 mục 6b của handoff
   đã ghi: *"Tìm kiếm công nợ nhân viên không bỏ dấu và không escape `%` `_` (LIKE thuần)"* ở phân hệ
   `24`. Màn công nợ **khách hàng** rất có thể dùng cùng kiểu truy vấn ⇒ gõ `%` sẽ trả về **toàn bộ
   công nợ**. `050_011` và `050_012` dựng để phơi đúng điểm này; kỳ vọng để *"ghi lại hành vi thật"*,
   🚫 không chốt trước.
2. **Thu hồi nợ khách hàng vẫn trùng nghiệp vụ ở ba chỗ** — câu hỏi treo số 4 mục 6 của handoff:
   `19_090_001`, `24_040_003`, `34_040_001` cùng sinh phiếu thu *"Thu hồi nợ"*. Phiên này đã dựng
   thêm `19_090_002`/`19_090_003` ở phân hệ `19`, nên **giờ là bốn chỗ**. Càng cần user chốt giữ
   chỗ nào làm case chính, tránh chạy trùng thao tác ghi sổ.
3. **Chưa có luật chặn thu hồi nợ vượt số còn nợ** trong HDSD lẫn sheet QC. `060_008` để kỳ vọng
   *"ghi lại nguyên văn thông báo"* — có thể **không bị chặn gì cả**, và đó là lỗ thủng công nợ.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `34_050_004` | Tìm theo tên khách không có công nợ hoặc không tồn tại | Thiếu nguyên văn thông báo | Bảng về trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `34_050_011` | Tìm công nợ bằng ký tự đặc biệt | Chờ chạy để lấy hành vi thật | Không lỗi 500; không trả về toàn bộ dữ liệu công nợ. Ghi lại hành vi thật |
| `34_050_012` | Tìm công nợ theo tên khách không dấu | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: có tìm ra khách tên có dấu hay không |
| `34_060_001` | Danh sách công nợ rỗng | Thiếu nguyên văn thông báo | Hiện trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `34_060_005` | Chọn khoảng thời gian có ngày kết thúc trước ngày bắt đầu | Chờ chạy để lấy hành vi thật | Bị chặn ở bộ chọn ngày hoặc trả rỗng. Ghi lại hành vi thật |
| `34_060_007` | Thu hồi nợ với số tiền bằng 0 | Thiếu nguyên văn thông báo | Bị chặn. Ghi lại nguyên văn thông báo |
| `34_060_008` | Thu hồi nợ vượt số tiền còn nợ | Thiếu nguyên văn thông báo | Bị chặn. Ghi lại nguyên văn thông báo |

**7/28 case** của phân hệ này chưa chốt được kỳ vọng.

---

## Kết quả chạy script (20/09/2026)

```bash
npx playwright test --config tai-lieu-test/34_cong_no_khach_hang/playwright.config.js
```

**6 đạt · 1 hỏng · 24 chưa chạy.**

### 🔴 Route trong kịch bản SAI

Kịch bản ghi `/finance/customer-debt` — route này **không tồn tại** (màn trắng). Route thật:
**`/debt-reconciliation/customer-debt`** (`config.jsx: CUSTOMER_DEBT`).

### Màn thật — đo từ DOM

Tiêu đề `Quản lý công nợ khách hàng`; 5 thẻ số liệu `KHÁCH NỢ · SỐ ĐƠN CÒN NỢ · TỔNG PHẢI THU ·
TỔNG ĐÃ THU · TỔNG CÒN NỢ`; cột `# · Tên khách hàng · Số điện thoại · Tổng số đơn · Tổng phải thu ·
Tổng đã trả · Tổng còn nợ · Lần ghi nợ cuối · Thao tác`;
API `GET /__api/report/customer-debt/{summary,customers}?fromDate=&toDate=&shopId=&page=&size=`.

### 🔴 Đã chạy và HỎNG

| Case | Đo được | Phân loại |
|---|---|---|
| `34_PQ_001` | Vai `gdv` nhận **401** ở cả `summary` lẫn `customers`. Màn vẫn hiện đủ 5 thẻ với **giá trị 0 và không một thông báo lỗi nào** ⇒ người dùng tin là không có khách nào nợ | **Thiếu quyền** — cùng họ `24_PQ_001`, `26_070_002`, `29_PQ_001` |

### 🔴 Đổi vai cho 21 case đọc/tìm — đã ghi lý do vào `test-input.json`

Vai `gdv` 401 ⇒ không có dữ liệu để kiểm; nhóm `34_050_*` và `34_060_*` chuyển sang vai `shop`
(API trả 200). Phần phạm vi của `gdv` giữ nguyên ở `34_PQ_001`.

### Đã chạy và đạt

`34_050_004` trạng thái rỗng · `34_050_001` gõ toàn khoảng trắng coi như chưa lọc ·
`34_060_005` cặp ngày ngược không trả dữ liệu sai · và các case bố cục màn.

`34_050_011` · `34_050_013` · `34_060_002` · `34_060_004` skip có lý do: **điểm bán test chưa có
dòng công nợ nào**, 🚫 không phân biệt được "lọc đúng" với "không có dữ liệu".
