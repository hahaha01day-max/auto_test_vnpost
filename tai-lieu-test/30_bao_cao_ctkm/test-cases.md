# Kịch bản auto test — 30 Báo cáo khuyến mại

- Ngày dựng: **18/09/2026** · skill `test-scenario` · nguồn `hdsd30_bao_cao_ctkm/tasks/*.md` (4 task)
- 🚫 Chưa viết script.

## 1. Route

| Màn hình | Route |
|---|---|
| `CAMPAIGN_EFFECTIVENESS_REPORT` — Khuyến mại › Báo cáo | `/promotion/report` |

🔴 API phải mang prefix **`/report/**`** (báo cáo chạy ở `report-service`). Đã có tiền lệ mắc lỗi này
ngày 17/08/2026: gọi `/campaign/v2/effectiveness` thay vì `/report/campaign/v2/effectiveness` → **404 ở
gateway**, không phải lỗi backend.

## 2. Phân loại

| Nhãn | Số case |
|---|--:|
| `READY_WITH_CODE_LOOKUP` | 1 |
| `BLOCKED` | 7 |

Toàn bộ BLOCKED vì **cần chương trình khuyến mại có phát sinh thật trong kỳ**. Không có dữ liệu thì
mọi chỉ số bằng 0 và case không đo được gì.

## 3. Case ghi dữ liệu

**Không có** — phân hệ này chỉ đọc.

## 4. Lỗ hổng đặc tả

- Task 030 nói *"mười chỉ số hiệu quả"* nhưng **không liệt kê là mười chỉ số nào**, cũng không nói
  công thức. 🔴 Không có danh sách và công thức thì `30_030_001` chỉ kiểm được **có đủ 10 ô**, chưa
  kiểm được số đúng hay sai. Cần bổ sung HDSD hoặc trace `report-service`.
- Task 010 không nói **ngưỡng "gần hết ngân sách"** là bao nhiêu phần trăm.

---

## 🔄 Cập nhật 19/09/2026 — hoàn thiện tài liệu

CSV nâng từ **5 cột lên 7 cột** (thêm `Ma goc`, `Nguon`) — trước đây thuộc "Nhóm B" ở mục 5b của
handoff, thiếu hai cột nên 🚫 không nối được với sheet QC. Sheet QC **không phủ** phân hệ này nên
mọi `Ma goc` để trống đúng luật.

Bổ sung **12 case** (8 → **20**), toàn bộ từ **trace code** và quét kỹ thuật mục 3.4.

| Nhãn | Case |
|---|--:|
| `READY` | 12 |
| `READY_WITH_CODE_LOOKUP` | 6 |
| `BLOCKED` | 2 |

🚫 **Không case nào `mutates`** — phân hệ này chỉ đọc.

## Trace — 19/09/2026

### Route

`/promotion/report` — `config.jsx:346` (`PROMOTION_CAMPAIGN_REPORT`).

### API — đối chiếu hai đầu

`BASE_URL = "/report/campaign/v2"` (`features/campaignReport/services/campaignReportApi.js:3`)

| Việc | Method + path | BE |
|---|---|---|
| Danh sách hiệu quả | `GET /report/campaign/v2/effectiveness` | `MarketingCampaignReportController.java:49` |
| Thẻ tổng hợp | `GET /report/campaign/v2/effectiveness/summary` | `:71` |
| Chi tiết chương trình | `GET /report/campaign/v2/effectiveness/detail` | `:103` |
| Nhóm ngành hàng | `GET /report/campaign/v2/effectiveness/categories` | `:91` |
| Nhóm khách hàng | `GET /report/campaign/v2/effectiveness/customer-groups` | `:97` |
| Xuất Excel | `GET /report/campaign/v2/effectiveness/export` | `campaignReportExport.js:12` |

🔴 **Prefix `/report` là bắt buộc** — `report-service` khai `server.servlet.context-path: /report`.
Đây đúng là chỗ đã mắc lỗi ngày 2026-08-17 (gọi `/campaign/v2/effectiveness` thiếu prefix → **404 ở
gateway**, không phải lỗi backend). Ghi lại để người viết script không lặp.

⚠️ Phân trang: FE mặc định `{ page: 0, size: 20 }` (`campaignReportApi.js:12`) — backend **0-based**.

### Nhãn — chép từ code

**Thẻ tổng hợp (6 chỉ số):** `Số chương trình` · `Số hoá đơn áp dụng` · `Doanh thu (gồm VAT)` ·
`Doanh thu thuần (gồm VAT)` · `Tiền giảm giá` · `Lợi nhuận gộp`

**Bảng `Hiệu quả theo từng chương trình` (9 cột):** `STT` · `Tên chương trình` · `Trạng thái` ·
`Số hoá đơn áp dụng` · `Doanh thu (gồm VAT)` · `Doanh thu thuần (gồm VAT)` · `Tiền giảm giá` ·
`Lợi nhuận gộp` · `Ngân sách đã dùng`

**Bảng `Đơn hàng đã áp dụng chương trình` (9 cột):** `STT` · `Mã đơn hàng` · `Thời gian` · `Tỉnh` ·
`Điểm bán` · `Giá trị đơn` · `Tiền giảm` · `Đã thanh toán` · `Còn nợ`

### 🔴 Lỗ hổng đặc tả

1. **HDSD nói *"mười chỉ số hiệu quả"* nhưng code có 6 chỉ số ở thẻ tổng hợp và 9 cột ở bảng** —
   không chỗ nào ra đúng 10. Lỗ hổng này đã ghi ở mục 7 của handoff; nay có **số đo cụ thể**.
   `30_030_001` (bộ cũ) đang kỳ vọng "mười chỉ số" theo HDSD ⇒ 🔴 **kỳ vọng đó sai so với code**,
   cần user quyết sửa HDSD hay sửa code trước khi chốt case.
2. ⚠️ **Hai cột doanh thu đều ghi `(gồm VAT)`** trong khi memory dự án ghi rõ *doanh thu tính TRƯỚC
   VAT* (`revenue_post_vat_combo`). Nhãn và quy ước tính đang mâu thuẫn — cần xác minh công thức
   thật ở `report-service` trước khi viết `expect()` cho `030_004`.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `30_050_001` | Danh sách báo cáo rỗng khi kỳ không có chương trình | Thiếu nguyên văn thông báo | Hiện trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `30_050_004` | Chọn khoảng thời gian có ngày kết thúc trước ngày bắt đầu | Chờ chạy để lấy hành vi thật | Bị chặn ở bộ chọn ngày hoặc trả rỗng. Ghi lại hành vi thật |
| `30_050_005` | Tìm chương trình bằng ký tự đặc biệt | Chờ chạy để lấy hành vi thật | Không lỗi 500; không trả về toàn bộ chương trình. Ghi lại hành vi thật |
| `30_050_006` | Tìm chương trình không dấu | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: có tìm ra chương trình tên có dấu hay không |

**4/20 case** của phân hệ này chưa chốt được kỳ vọng.

---

## Kết quả chạy script (20/09/2026)

```bash
npx playwright test --config tai-lieu-test/30_bao_cao_ctkm/playwright.config.js
```

**4 đạt · 4 hỏng · 15 chưa chạy.**

### 🔴 Màn thật LỆCH HẲN so với kịch bản

| | Kịch bản mô tả | Đo được trên sản phẩm (20/09/2026) |
|---|---|---|
| Tiêu đề | Báo cáo chương trình khuyến mại | **`Báo cáo chiến dịch khuyến mãi`** |
| Thẻ tổng hợp | 6 chỉ số: `Số chương trình · Số hoá đơn áp dụng · Doanh thu (gồm VAT) · Doanh thu thuần · …` | **5 thẻ khác hẳn**: `Tổng số đơn · Tổng doanh thu · Tổng lợi nhuận · Tổng chi phí · Tổng tiền khuyến mãi` |
| Bảng | 9 cột (`Tên chương trình`, `Trạng thái`, `Số hoá đơn áp dụng`…) | **8 cột**: `# · Ngày · Chiến dịch · Số khách hàng · Số đơn · Doanh thu · Lợi nhuận · Hành động`, tiêu đề bảng là **`Danh sách đơn hàng`** |
| API | — | `GET /__api/marketing/report/report-overview/<shopId>?type=&campaignId=&begin=&end=` |

### 🔴 Đã chạy và HỎNG

| Case | Đo được | Phân loại |
|---|---|---|
| `30_010_003` | Không có chỉ số nào trong 6 chỉ số kịch bản đòi; màn có 5 thẻ khác | **Lệch đặc tả** |
| `30_010_004` | Bảng không có `Tên chương trình` / `Trạng thái` / `Số hoá đơn áp dụng` | **Lệch đặc tả** |
| `30_050_001` | API trả **404** ở mọi lời gọi (vai `shop`) ⇒ bảng rỗng **do lỗi**, 🚫 không phải "kỳ không có chương trình" | **Lỗi sản phẩm** |
| `30_PQ_001` | Vai `gdv` nhận **401** ở mọi lời gọi, dù cả 4 task của phân hệ khai đủ 4 cấp | **Thiếu quyền** |

🔴 Hai lỗi cuối làm mọi con số trên màn bằng 0 mà **không có thông báo lỗi nào** — người dùng đọc
báo cáo sẽ tin là chiến dịch không phát sinh doanh thu.

### Chưa chạy — có lý do

15 lượt: phần lớn phải có số liệu CTKM thật trong kỳ (mà API đang 404/401), hoặc thuộc vai
`province` chưa đo được. Lý do nguyên văn trong `test-input.json`.
