# Kịch bản auto test — 29 Báo cáo quản trị

- Ngày dựng: **18/09/2026** · skill `test-scenario` · nguồn `hdsd29_bao_cao/tasks/*.md` (14 task)
- 🚫 Chưa viết script.

## 1. Route

| Báo cáo | Route |
|---|---|
| Doanh thu (`REVENUE_REPORT`) | `/report/revenue-sale` |
| Lãi/Lỗ (`PROFIT_LOSS_REPORT`) | `/report/profit-loss` |
| Trị giá tồn kho (`INVENTORY_VALUE_REPORT`) | `/report/inventory-value` |
| Đối soát PO (`PO_RECONCILIATION_REPORT`) | `/report/po-reconciliation` |
| Báo cáo tuỳ chỉnh (`DYNAMIC_REPORTS`) | `/report/dynamic` |
| NXT (`INVENTORY_NXT_REPORT`) · Tồn theo HSD (`EXPIRY_STOCK_REPORT`) · Nhân viên (`EMPLOYEE_REPORT`) | ⚠️ **chưa có trong route map** — phải trace từ `reportRoutes` |

🔴 API báo cáo phải mang prefix **`/report/**`** — thiếu là 404 ở gateway, và người đọc log sẽ ghi
nhầm thành lỗi backend.

## 2. Vai

11/14 task khai đủ 4 cấp. Task 030 (lãi lỗ), 040 (chốt tồn kho), 110 (đối soát), 130 (báo cáo tuỳ
chỉnh) **bỏ `DIEM_BAN`**. Task 140 (cấu hình danh mục) **chỉ** `TONG_CONG_TY`.
`29_030_004` và `29_140_002` dựng để bắt hai ranh giới này.

## 3. Phân loại

| Nhãn | Số case |
|---|--:|
| `READY_WITH_CODE_LOOKUP` | 8 |
| `BLOCKED` | 19 |

⚠️ Phần lớn BLOCKED vì **cần dữ liệu thật trong kỳ** — báo cáo không có dữ liệu thì mọi assertion số
đều vô nghĩa. 🚫 Đừng hạ kỳ vọng thành "màn mở được"; đó là case luôn xanh.

## 4. Case ghi dữ liệu — 🔴 chưa ai được phép chạy

`29_010_002` · `29_040_001` · `29_110_002` · `29_120_002` · `29_140_001`

🔴 **`29_040_001` chốt trị giá tồn kho theo tháng** — đây là chốt sổ, không phải xem báo cáo.
Các case "tổng hợp lại báo cáo" (`010_002`, `110_002`, `120_002`) không đổi dữ liệu gốc nhưng
**chạy job tổng hợp trên hệ thống báo cáo**, tốn tài nguyên và ghi đè số liệu tổng hợp trước đó.

## 5. Lỗ hổng đặc tả

- Ba màn hình báo cáo **chưa có route trong map** (mục 1) — blocker cho việc viết script.
- Task 080 không nói **công thức vòng quay** dùng giá vốn hay doanh thu, chia cho tồn bình quân hay
  tồn cuối kỳ. 🔴 Không có công thức thì không viết được assertion số; `29_080_001` hiện chỉ kiểm
  "đổi theo kỳ".
- Task 090 không nói **ngưỡng phân nhãn** bán chạy / chậm luân chuyển / hàng chết.

---

## 🔄 Cập nhật 19/09/2026 — hoàn thiện tài liệu

Bổ sung **49 case** (28 → **77**): phủ nốt **44 case gốc** sheet QC cộng 5 case quét kỹ thuật
mục 3.4. Độ phủ sheet QC: **7/51 → 51/51**.

Bốn nhóm mã mới, đặt theo **nhóm chức năng của sheet QC** chứ không theo task HDSD (sheet phủ
những mảng HDSD không có):

| Nhóm | Nội dung | Case gốc |
|---|---|---|
| `200` | Báo cáo kho — lọc tháng, 4 cấp phạm vi, tìm kiếm phạm vi | `Baocao_2`–`6`, `14`–`16` |
| `210` | **Chốt tồn kho** | `Baocao_8`, `9`, `11`–`13`, `FUNC_1_13`–`25` |
| `220` | Báo cáo đối soát NCC | `Baocao_18`–`32` |
| `230` | Báo cáo doanh thu theo cấp | `dong49`–`51`, `Baocao_37`, `38` |
| `240` | Quét kỹ thuật 3.4 | — |

| Nhãn | Case |
|---|--:|
| `READY` | 21 |
| `READY_WITH_CODE_LOOKUP` | 9 |
| `BLOCKED` | 47 |

### 🔴 Thông báo nguyên văn — trace 19/09/2026

| Nguyên văn | Ở đâu | Case |
|---|---|---|
| `Tháng MM/yyyy đã chốt tồn kho, không thể thực hiện nghiệp vụ kho` (mã `INVENTORY_PERIOD_CLOSED`) | `pod-service` `InventoryPeriodGuardService.java:33-35` | `210_010` `210_011` |

**Endpoint chốt kỳ** (report-service, prefix `/report`):
`POST /report/stock/v2/reports/stock-value/monthly-close/monthly-summary/closing-trigger` ·
`GET .../closing-progress` · `GET .../closing-stats`
(`StockValueReportController.java:25`, `InventoryReportController.java:30,43,185`).

### 🔴 Lỗ hổng đặc tả — cần user quyết

1. **Sheet QC đòi hai thông báo riêng cho xuất và nhập kho sau chốt** (`FUNC_1_17` *"Không thể
   xuất…"*, `FUNC_1_18` *"Không thể nhập…"*), nhưng code chỉ có **một câu chung**:
   `Tháng MM/yyyy đã chốt tồn kho, không thể thực hiện nghiệp vụ kho`. Case `210_010`/`210_011`
   bám **code**; nếu QC muốn hai câu riêng thì đây là yêu cầu sửa code, không phải sửa case.
2. **`FUNC_1_22` chốt cứng chuỗi `Kỳ tháng 05/2026 đã được chốt trước`** — tháng cụ thể trong kỳ
   vọng. 🚫 Không chép; `210_015` viết *"nêu rõ kỳ tháng đó đã được chốt trước đó"*.
3. 🔴 **Thông báo kỹ thuật TIẾNG ANH lọt ra UI** ở nhánh chốt kỳ:
   `shopId is required`, `chainId is required`, `productId is required`, `shopIds is required`,
   `Invalid reportMonth: `, `Unsupported snapshot status: `
   (`PeriodClosingStatusServiceImpl.java`). Cùng loại lỗi với `"Truyền sai tham số"` ở `26`.
4. **Công thức vòng quay tồn kho và ngưỡng phân nhãn bán chạy/chậm/hàng chết vẫn chưa có** —
   đã ghi ở mục 7 handoff. `29_080_001` và `29_090_001` (bộ cũ) vì thế chưa kiểm được số, chỉ
   kiểm được thứ tự sắp xếp.
5. ⚠️ **`Baocao_27` đòi tiêu đề popup `Đối soát hoá đơn mua hàng`** còn phân hệ `27` đòi
   `Đối soát hoá đơn PO` — hai màn khác nhau hay một màn hai tên? Chưa trace được chuỗi thật.

### 🔴 Nhóm `210` — nguy hiểm nhất bộ này

**Chốt tồn kho là hành vi KHOÁ KỲ và không có đường mở lại.** Chốt nhầm một kỳ là mọi nghiệp vụ
kho của kỳ đó bị chặn cho tới khi có người can thiệp DB. Với `210_016` (toàn bộ phạm vi gồm cấp
dưới) thì một lần chạy khoá kỳ của **nhiều đơn vị cùng lúc**. Cả 12 case `mutates` của nhóm này
đều `enabled: false` + `allowMutation: false`.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `29_210_001` | Chốt tồn kho khi còn đơn phát sinh | Thiếu nguyên văn thông báo | Hiện cảnh báo phù hợp hoặc không cho chốt. Ghi lại nguyên văn thông báo |
| `29_210_012` | Chốt kho tháng sau khi tháng trước chưa chốt | Thiếu nguyên văn thông báo | Bị chặn, không chốt được. Ghi lại nguyên văn thông báo |
| `29_210_013` | Chốt kho tháng nhỏ hơn tháng có phiếu tồn đầu kỳ | Thiếu nguyên văn thông báo | Bị chặn, không chốt được. Ghi lại nguyên văn thông báo |
| `29_210_014` | Chốt kho tháng cũ sau khi đã thêm phiếu tồn đầu kỳ vào tháng mới | Thiếu nguyên văn thông báo | Bị chặn, không chốt được. Ghi lại nguyên văn thông báo |
| `29_210_015` | Chốt kho hai lần trong cùng một tháng | Thiếu nguyên văn thông báo | Bị chặn với thông báo nêu rõ kỳ tháng đó đã được chốt trước đó. Ghi lại nguyên văn |
| `29_220_009` | Giao diện popup Đối soát hoá đơn mua hàng | Thiếu nguyên văn thông báo | Tiêu đề đúng "Đối soát hoá đơn mua hàng". Ghi lại nguyên văn nếu code khác |
| `29_220_013` | Giao diện drawer Chi tiết đối soát PO | Thiếu nguyên văn thông báo | Hiện thông tin Phiếu nhập kho và Hoá đơn. Ghi lại nguyên văn tên các khối |
| `29_240_001` | Báo cáo rỗng khi kỳ không có số liệu | Thiếu nguyên văn thông báo | Hiện trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `29_240_003` | Tìm phạm vi bằng ký tự đặc biệt | Chờ chạy để lấy hành vi thật | Không lỗi 500; không trả về toàn bộ đơn vị. Ghi lại hành vi thật |
| `29_240_004` | Tìm phạm vi không dấu | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: có tìm ra đơn vị tên có dấu hay không |
| `29_240_005` | Chọn khoảng thời gian có ngày kết thúc trước ngày bắt đầu | Chờ chạy để lấy hành vi thật | Bị chặn ở bộ chọn ngày hoặc trả rỗng. Ghi lại hành vi thật |

**11/77 case** của phân hệ này chưa chốt được kỳ vọng.

---

## Kết quả chạy script (20/09/2026)

```bash
npx playwright test --config tai-lieu-test/29_bao_cao/playwright.config.js
```

**9 đạt · 5 hỏng · 63 chưa chạy.**

### Năm màn báo cáo — đo từ DOM

| Màn | Route | Tiêu đề thật | API chính |
|---|---|---|---|
| Doanh thu | `/report/revenue-sale` | Báo cáo doanh thu | `/report/revenue/v1/monthly/{kpi,summary,province-summary,category-tree,trend,category-share}` |
| Lãi/Lỗ | `/report/profit-loss` | `Báo Cáo Lãi/Lỗ (P&L) Chi Nhánh` | `/report/revenue/v1/monthly/overhead` |
| Trị giá tồn kho | `/report/inventory-value` | `Báo cáo Trị giá Tồn kho` | `/report/inventory/monthly-summary…` |
| Đối soát HĐ mua hàng | `/report/po-reconciliation` | `Báo cáo Đối soát Hóa đơn Mua hàng & Công nợ NCC` | `/report/po-reconciliation/{metadata,suppliers,summary}` |
| Báo cáo tuỳ chỉnh | `/report/dynamic` | `Báo cáo` | `/report/reports/menu` + `POST /report/reports/guest-token/<id>` |

🔴 Báo cáo lọc **theo tháng** (`reportMonth=YYYY-MM-01`), 🚫 không phải khoảng ngày.

### 🔴 Đã chạy và HỎNG

| Case | Đo được | Phân loại |
|---|---|---|
| `29_030_004` | Vai `gdv` **KHÔNG bị chặn** khỏi `/report/profit-loss`: vào được, tiêu đề hiện đủ, API trả **401**. Task 030 chỉ khai `TONG_CONG_TY · BUU_DIEN_TINH · BUU_DIEN_XA` | **Lệch phân quyền** |
| `29_PQ_001` | Vai `gdv` **không đọc được** báo cáo tồn kho của chính điểm bán mình (`/report/inventory/monthly-summary` trả 401) | **Thiếu quyền** |
| `29_140_002` | Vai **Bưu điện Tỉnh thấy nút "Cấu hình báo cáo"** trên màn báo cáo tuỳ chỉnh; task 140 chỉ khai cho `TONG_CONG_TY` | **Lệch phân quyền** |
| `29_210_006` | Bộ chọn tháng của báo cáo tồn kho cho chọn **cả 12 tháng** (`Th 01 … Th 12`), **không khoá kỳ nào**; kịch bản đòi chỉ 2 tháng gần nhất | **Lệch đặc tả** |
| `29_030_003` | Bấm **"Làm mới"** trên báo cáo Lãi/Lỗ: **không có thông báo nào** (và cũng không có request ghi nào bị chặn). Kịch bản đòi nguyên văn *"Đã tải lại số liệu Lãi/Lỗ."* | **Lệch đặc tả / trải nghiệm** |

### Đã chạy và đạt

`29_010_001` báo cáo doanh thu có đủ thẻ chỉ tiêu, bảng, đồ thị và bảng `Top SKU` ·
`29_130_001` màn báo cáo tuỳ chỉnh dựng thanh báo cáo và **tự chọn** mục đầu ·
`29_200_001` đổi tháng ⇒ `reportMonth` vào query đúng dạng `YYYY-MM-01` ·
`29_240_001` trạng thái rỗng · `29_220_002` lọc NCC vào query · `29_220_011` bộ lọc có tiêu chí
trạng thái đối soát.

`29_220_001` và `29_220_007` skip có lý do (đổi tháng không sinh lời gọi `suppliers` mới; màn không
hiện đủ ba thẻ khớp/lệch/chưa để đối chiếu tổng).

### Chưa chạy — có lý do

63 lượt: `mutates` (tổng hợp lại báo cáo, chốt kho — **ghi số liệu thật**), thiếu vai (`ward`),
hoặc thiếu dữ liệu nền. Lý do nguyên văn trong `test-input.json`.
