# Kịch bản auto test — 26 Phiếu thu

- Ngày dựng: **18/09/2026** · skill `test-scenario` · nguồn `hdsd26_phieu_thu/tasks/*.md` (5 task)
- 🚫 Chưa viết script.

## 1. Route

| Màn hình | Route |
|---|---|
| `RECEIPT_MANAGEMENT` — Tài chính › Phiếu thu | `/finance/receipt-management` |

## 2. Vai

Cả 5 task khai **chỉ** `DIEM_BAN` ⇒ vai `gdv`. Quyền phân tách rõ:
`view_all_receipt_expense` (xem) · `create_receipt_expense` (lập, thêm danh mục) ·
`update_receipt_expense` (sửa, xoá) · `export_receipt_expense` (xuất).

## 3. Phân loại

> 🔄 **Cập nhật 19/09/2026** — bổ sung 22 case: phủ nốt **11 case gốc** sheet QC cộng 11 case quét
> kỹ thuật mục 3.4. Tổng **40 case** (trước: 18). Độ phủ sheet QC **4/15 → 15/15**.

| Nhãn | Số case |
|---|--:|
| `READY` | 7 |
| `READY_WITH_CODE_LOOKUP` | 6 |
| `BLOCKED` | 27 |

🔴 **Nhóm `060` là loại case KHÁC HẲN phần còn lại: kiểm phiếu thu TỰ SINH.** Không thao tác gì trên
màn phiếu thu cả — việc test là chạy một nghiệp vụ ở phân hệ khác (bán hàng, đổi trả, kho, thanh toán
Tỉnh→TCT) rồi quay lại **kiểm side-effect** đúng danh mục và đúng đối tượng. Vì vậy chúng phụ thuộc
dữ liệu nền của 4 phân hệ khác và đều `BLOCKED`.

⭐ Nhóm này có **5 thông báo nguyên văn** chép thẳng từ HDSD, trong đó hai câu chặn rất đáng giá:
*"Không được xoá phiếu thu được tạo bởi hệ thống"* và *"Không được xoá phiếu thu tiền bán hàng"*.

## 4. Case ghi dữ liệu — 🔴 chưa ai được phép chạy

`26_020_001` · `26_030_003` · `26_040_002` · `26_050_003`

🔴 **Phiếu thu chạm thẳng số dư quỹ.** HDSD nói rõ: lập phiếu là tăng quỹ, **xoá phiếu là huỷ luôn ghi
nhận quỹ và số dư giảm ngay**, sửa phiếu là điều chỉnh lại ghi nhận quỹ. Cả ba đều lệch sổ nếu chạy
nhầm trên điểm bán thật.

## 5. Lỗ hổng đặc tả

- Task 20 **không nói giới hạn ảnh chứng từ** (định dạng, dung lượng, số lượng).
- Task 40 nói *"dữ liệu phiếu vẫn được hệ thống lưu lại để tra soát"* nhưng **không nói tra ở đâu** —
  chưa dựng được case kiểm phần này.
- Thông báo `"Truyền sai tham số"` khi xoá danh mục mặc định là **thông báo kỹ thuật lọt ra UI**.
  🔴 Đây là lỗi trải nghiệm đáng báo, không phải hành vi đúng để test — nhưng case vẫn giữ đúng nguyên
  văn hiện tại, 🚫 không tự sửa kỳ vọng.

### 🔄 Bổ sung 19/09/2026

- 🔴 **Phiếu thu tự sinh trải trên 4 phân hệ khác** (`18_3` thanh toán · `18_5` đổi trả ·
  kho/nhân sự · công nợ Tỉnh–TCT) nhưng **HDSD phân hệ 26 không nhắc một chữ nào** về chúng.
  Toàn bộ nhóm `060_*` lấy từ sheet QC (`TaiChinh_24`–`30`). ⇒ HDSD phiếu thu đang **thiếu hẳn
  một mảng nghiệp vụ**, cần bổ sung.
- 🔴 **`TaiChinh_26` và `TaiChinh_27` có kỳ vọng chép trùng nhau** — cùng câu *"Sinh phiếu thu tự
  động cho khoản tiền phụ phí chênh lệch"*, nhưng `__26` là **thu chênh lệch đổi hàng** còn `__27`
  là **thu chi phí trả hàng** — hai khoản khác bản chất. Đã dựng thành `060_003` / `060_004` với
  kỳ vọng viết lại theo đúng nghiệp vụ từng ca (luật 4.3 của handoff: 🚫 không chép kỳ vọng sai).
- 🔴 **Ba case phạm vi (`TaiChinh_31`–`33`) là nhóm quý nhất của phân hệ này** — chúng kiểm đúng
  thứ `stock_v2_find_scope_hole` đã từng cắn: thiếu filter phạm vi thì API **trả toàn bộ pod**, chứ
  không phải trả rỗng. `070_002` (cấp dưới KHÔNG thấy phiếu cấp trên) và `070_003` (ngang hàng
  KHÔNG thấy nhau) là hai case **âm**, 🚫 đừng đổi thành case dương cho dễ chạy.
- ⚠️ `TaiChinh_19` đòi tiêu đề đúng chữ **"Quản lý phiếu thu"** — `010_005` đã dựng, nhưng chưa
  trace được chuỗi thật trong code, nên vẫn kỳ vọng theo sheet. Cần xác minh khi viết script.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `26_080_001` | Bỏ trống số tiền khi lập phiếu thu | Thiếu nguyên văn thông báo | Bị chặn, không lập phiếu. Ghi lại nguyên văn thông báo |
| `26_080_002` | Lập phiếu thu với số tiền bằng 0 | Thiếu nguyên văn thông báo | Bị chặn, không lập phiếu. Ghi lại nguyên văn thông báo |
| `26_080_003` | Lập phiếu thu với số tiền âm | Chờ chạy để lấy hành vi thật | Ô không nhận giá trị âm, hoặc bị chặn khi lưu. Ghi lại hành vi thật |
| `26_080_004` | Bỏ trống danh mục khi lập phiếu thu | Thiếu nguyên văn thông báo | Bị chặn, không lập phiếu. Ghi lại nguyên văn thông báo |
| `26_080_006` | Chọn Chuyển khoản mà không chọn tài khoản nhận | Thiếu nguyên văn thông báo | Bị chặn, không lập phiếu. Ghi lại nguyên văn thông báo |
| `26_090_002` | Danh sách phiếu thu rỗng | Thiếu nguyên văn thông báo | Hiện trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `26_090_004` | Tìm phiếu thu bằng ký tự đặc biệt | Chờ chạy để lấy hành vi thật | Không lỗi 500; không trả về toàn bộ phiếu. Ghi lại hành vi thật |

**7/40 case** của phân hệ này chưa chốt được kỳ vọng.

---

## Kết quả chạy script (20/09/2026)

```bash
npx playwright test --config tai-lieu-test/26_phieu_thu/playwright.config.js
```

**6 đạt · 1 hỏng · 36 chưa chạy.**

### Màn thật — đo từ DOM (`/finance/receipt-management`)

Tiêu đề `Quản lý phiếu thu`; 4 thẻ **theo phương thức** `Tất cả · Tiền mặt · Chuyển khoản · Thẻ VISA`
(🚫 không phải trạng thái); cột `# · Ngày tạo · Mã Phiếu · Phân loại phiếu · Thực hiện · Thu từ ·
Tổng tiền · Phương thức · Ghi chú · Hình ảnh / chứng từ · Hành động`;
API `GET /__api/expenses/view_all_receipts?…&start_date=&end_date=`, **mặc định lọc đúng ngày hôm nay**.
Vai `shop` có `Thêm phiếu thu` · `Danh mục phiếu thu`; vai `gdv` không có nút nào.

### 🔴 Đã chạy và HỎNG

| Case | Đo được | Phân loại |
|---|---|---|
| `26_070_002` | Vai `gdv` vào được màn nhưng **mọi** lời gọi `view_all_receipts` trả **401** ⇒ không đọc được phiếu nào. Kịch bản đòi *"chỉ thấy phiếu do chính cấp mình tạo"*, 🚫 không phải *"không đọc được gì"* | **Thiếu quyền** — cùng họ `24_PQ_001`, `10_PQ_001` |

### Đã chạy và đạt

`26_010_005` bố cục màn (ô tìm theo mã, cặp ngày, nguồn thu, đúng 4 thẻ) · `26_010_002` chọn nguồn
thu thì hiện thêm ô chọn đối tượng cụ thể · `26_090_003` lọc phân loại đi vào query (`cate_name`)
mà **không mất** điều kiện thời gian · `26_PQ_001` skip có lý do (tài khoản test đang **có** quyền
tạo) · và các case rỗng/không-tồn-tại trên vai đọc được.

### 🔴 Bẫy đã trả giá — đã ghi thành luật

Placeholder và nhãn tiếng Việt trong DOM ở dạng **tổ hợp (NFD)**: `input[placeholder^="Tìm kiếm"]`
và `filter({ hasText: 'Chọn nguồn thu' })` viết bằng NFC **không khớp** dù mắt nhìn giống hệt.
Triệu chứng là *"không thấy ô"* / *"ô không có lựa chọn nào"* — suýt báo oan thành lỗi sản phẩm.
Helper giờ tìm ô bằng cách **bỏ dấu cả hai vế** (`timOLoc`), và placeholder bám đoạn không dấu.

### Chưa chạy — có lý do

36 lượt: `mutates` (lập phiếu thu = ghi vào quỹ tiền mặt thật, sửa/huỷ phiếu, quản lý danh mục)
hoặc thiếu dữ liệu nền (hôm nay chưa có phiếu thu nào — bộ lọc mặc định là ngày hôm nay).
