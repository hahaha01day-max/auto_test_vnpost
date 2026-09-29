# Kịch bản auto test — 16 Hàng ký gửi

- Dựng 18/09/2026, **viết lại toàn bộ 19/09/2026** (16 → 138 case) · skill `test-scenario`
- Nguồn: `hdsd16_hang_ky_gui/tasks/*.md` (đọc trọn 6/6) + trace code FE và BE
- Sheet QC 🚫 **không phủ** phân hệ này ⇒ cột `Ma goc` trống toàn bộ
- Bản cũ CSV chỉ có **5 cột** (thiếu `Ma goc` + `Nguon`) — nay đủ **7 cột**
- 🚫 Chưa viết script

## 1. Route — 🔴 bản cũ để ngỏ một route

| Màn hình | Route | Nguồn |
|---|---|---|
| `CONSIGNMENT_DEBT` — Đối soát, công nợ › Công nợ hàng ký gửi | `/debt-reconciliation/consignment-debt` | `config.jsx:120` |
| `CONSIGNMENT_RECON` — Đối soát, công nợ › Đối soát hàng ký gửi | `/debt-reconciliation/consignment-recon` | `config.jsx:121` |
| `CONSIGNMENT_RECON_DETAIL` | `/debt-reconciliation/consignment-recon/:id` | `config.jsx:122` |
| `CONSIGNMENT_REPORT` — Báo cáo › Báo cáo hàng ký gửi | **`/report/consignment`** | `config.jsx:159` |

Bản 18/09 ghi route báo cáo là *"⚠️ chưa trace được"* — nay đã chốt.

## 2. 🔴 API — phân hệ này nằm ở HAI service khác nhau

Đây là điểm dễ sai nhất khi viết script.

### 2.1 pod-service — 🚫 KHÔNG có prefix

| Việc | Method + path | BE |
|---|---|---|
| Danh sách khoản nghĩa vụ | `GET /consignment-debt/obligations` | `ConsignmentDebtController:45` |
| Rà soát giá | `GET /consignment-debt/price-audit` | `:70` |
| Danh sách NCC có kỳ | `GET /consignment-recon/suppliers` | `ConsignmentReconController:52` |
| Danh sách kỳ | `GET /consignment-recon/periods` | `:65` |
| Chi tiết kỳ | `GET /consignment-recon/periods/{id}` | `:80` |
| **Sinh kỳ từ hợp đồng** | `POST /consignment-recon/periods/generate` | `:92` |
| Số liệu kỳ | `GET .../periods/{id}/summary` · `/summary/v2` | `:109` `:140` |
| Số liệu theo đơn vị | `GET .../periods/{id}/summary/by-org` · `/by-org/v2` | `:170` `:191` |
| Đối chiếu | `GET .../periods/{id}/summary/doi-chieu` | `:218` |
| Cảnh báo rà soát | `GET .../periods/{id}/audit` | `:236` |
| **Chốt kỳ** | `POST .../periods/{id}/lock` | `:266` |
| Danh sách kho ghi nợ | `GET .../periods/{id}/debt-shops` | `:281` |
| **Ghi nợ chính thức** | `POST .../periods/{id}/post-debt` | `:302` |
| **Ghi nợ nội bộ TCT↔BĐT** | `POST .../periods/{id}/post-internal-debt` | `:319` |
| Tải hoá đơn XML | `POST /consignment-invoices/upload` | `ConsignmentInvoiceController:39` |
| Nhập hoá đơn tay | `POST /consignment-invoices` | `:53` |
| Danh sách hoá đơn | `GET /consignment-invoices` | `:64` |
| Kiểm tổng lại | `POST /consignment-invoices/rerun-check` | `:76` |
| Xoá hoá đơn | `DELETE /consignment-invoices/{id}` | `:84` |

### 2.2 report-service — 🔴 CÓ prefix `/report`

| Việc | Method + path |
|---|---|
| Nhập xuất tồn | `GET /report/consignment-report/nxt` |
| NXT theo điểm bán | `GET /report/consignment-report/nxt-by-shop` |
| Sản lượng bán | `GET /report/consignment-report/sales-volume` |
| Hiệu suất / vòng quay | `GET /report/consignment-report/turnover` |
| Dashboard | `GET /report/consignment-report/dashboard` |
| Danh sách kỳ (cho ô lọc) | `GET /report/consignment-report/periods` |
| Đối chiếu với kỳ | `GET /report/consignment-report/reconcile-check` |
| Xuất Excel | `GET /report/consignment-report/nxt/export` |

⚠️ `ConsignmentReportController` nằm ở **`vnpost-report-service`**, còn ba nhóm kia ở **`vnpost-pod-service`**.
Thiếu prefix `/report` là **404 ở gateway**, và tester sẽ ghi nhầm thành lỗi backend. Case `16_060_026`
dựng riêng để chốt điều này.

⚠️ `consignmentReconApi.js:95` gọi `GET /report/consignment-report/nxt-by-shop` **từ trong màn đối
soát kỳ** — tức màn chi tiết kỳ đọc **cả hai service**. Script phải chờ đủ hai lớp request.

## 3. Nhãn hiển thị thật

### 3.1 Trạng thái khoản nghĩa vụ (`ConsignmentDebtPage.jsx:18-20`)

`Tạm tính` (cam) · `Đã đối soát` (xanh) · `Đã đảo` (xám)

### 3.2 Nguồn giá (`:25`)

`Danh mục sản phẩm` (vàng) — nghĩa là 🚫 không tìm được giá trong bảng giá NCC nên lấy tạm giá vốn.

### 3.3 Cột màn Công nợ ký gửi — 10 cột

`Ngày giao dịch` · `Đơn bán` · `SKU` · `Nhà cung cấp` · `Số lượng` · `Đơn giá ký gửi` · `VAT` ·
`Thành tiền` · `Nguồn giá` · `Trạng thái`

### 3.4 Sáu thẻ màn chi tiết kỳ (`ConsignmentReconDetailPage.jsx:616-735`)

`Nhập xuất tồn` · `Nhập trong kỳ (N)` · `Xuất trong kỳ (N)` · `Chênh lệch kiểm kê (N)` ·
`Hoá đơn NCC` · `Cần rà soát (N)`

### 3.5 🔴 Hai nhãn Nguồn giá ở màn chi tiết kỳ có hệ quả khác hẳn (`:178-180`)

| Nhãn | Màu | Hệ quả |
|---|---|---|
| `Chưa có giá — chặn chốt kỳ` | đỏ | **thật sự chặn** chốt kỳ |
| `Không rõ nguồn giá` | vàng | chỉ cảnh báo, **vẫn chốt được** |

### 3.6 Kết quả đối chiếu hoá đơn (`ConsignmentInvoiceTab.jsx:34-36`)

`Khớp biên bản` (xanh) · `Lệch biên bản` (đỏ) · `Chưa kiểm` (xám)

### 3.7 Bảng hoá đơn — 9 cột

`Loại` · `Ký hiệu / Số` · `Ngày hoá đơn` · `Hạn thanh toán` · `Điều chỉnh` · `Trước thuế` · `Thuế` ·
`Tổng tiền` · `Nguồn`

### 3.8 Bốn thẻ báo cáo (`ConsignmentReport.jsx:312-365`)

`Nhập - Xuất - Tồn` · `Sản lượng bán` · `Hiệu suất hàng hoá` · `Tồn theo NCC / đơn vị`

## 4. Thông báo — nguyên văn từ code

### 4.1 Frontend

| Tình huống | Nguyên văn |
|---|---|
| Sinh kỳ | `Sinh kỳ xong: <N> kỳ mới, <M> kỳ đã có` |
| Hộp chốt kỳ | tiêu đề `Chốt kỳ đối soát?` · nút `Chốt kỳ` / `Để sau` · cảnh báo `Đang còn <A> đơn lệch đối chiếu và <B> dòng chưa gán nhà cung cấp. Nên xử lý trước khi chốt.` |
| Chốt kỳ xong | `Đã chốt kỳ đối soát` · lỗi `Không chốt được kỳ đối soát` |
| Kỳ chưa chốt (thẻ hoá đơn) | `Kỳ chưa chốt` + `Nhà cung cấp chỉ xuất hoá đơn sau khi ba bên (Bưu điện tỉnh · Tổng công ty · Nhà cung cấp) đối soát xong. Hãy chốt kỳ trước, rồi tải hoá đơn vào đây.` |
| Vùng tải hoá đơn | `Kéo thả hoặc bấm để tải hoá đơn XML vào kỳ này` |
| Tải hoá đơn | `Đã ghi nhận hoá đơn` |
| Xoá hoá đơn | hộp `Xoá hoá đơn nhà cung cấp?` · nút `Xoá` · thành công `Đã xoá hoá đơn` · lỗi `Không xoá được hoá đơn` |
| Hạn thanh toán trống | nhãn `Chưa xác định hạn` |
| Ghi nợ | hộp `Ghi nợ chính thức cho kỳ này?` · thiếu kho `Chọn kho ghi nợ trước khi ghi nợ chính thức` · thành công `Đã ghi nợ chính thức` · lỗi `Không ghi nợ được` |
| Không có kho hợp lệ | `Không có kho nào đã phát sinh chứng từ với nhà cung cấp của kỳ này` |
| Báo cáo — thiếu chuỗi | `Không xác định được chuỗi (chainId)` |
| Báo cáo — thiếu ngày | `Vui lòng chọn khoảng thời gian` |
| Báo cáo — ngày ngược | `"Từ ngày" phải nhỏ hơn hoặc bằng "Đến ngày"` |
| Báo cáo — phạm vi | `Khi đã chọn Bưu điện xã thì chỉ được chọn tối đa một Bưu điện tỉnh` |
| Xuất Excel lỗi | `Không xuất được file Excel` |

### 4.2 Backend

| File · dòng | Nguyên văn |
|---|---|
| `ReconSnapshotService:86` | `Thiếu kỳ đối soát để đóng băng` |
| `:226` | `Không chốt được kỳ <id>: <N> ... chưa đóng dấu giá hợp đồng (...). Khai giá cho hợp đồng rồi lập lại chứng từ, hoặc rà chỉ tiêu B3.5 — biên bản không được có đơn giá 0.` |
| `:257` | `Không chốt được kỳ <id>: tồn đầu kỳ phải cộng dồn từ Thẻ kho, nhưng dữ liệu Thẻ kho trước ngày <ngày> đã bị dọn theo cấu hình tiering ...` |
| `ReconPeriodWriter:139` | `Khoản nghĩa vụ id=%d đã thuộc kỳ đối soát khác (id=%d), không thể gắn vào kỳ %d. Kiểm tra lại biên kỳ trước khi chốt.` |
| `ReconPeriodQueryService:65` | `Kỳ đối soát này thuộc đơn vị khác, bạn không có quyền xem` |
| `:73` · `ReconPeriodService:143` | `Không tìm thấy kỳ đối soát id=<id>` |
| `ConsignmentInvoiceService:85` | `Không đọc được file XML hoá đơn: <lý do>` |
| `:354` | `Kỳ <id> chưa chốt nên chưa nhận hoá đơn nhà cung cấp. Hãy chốt kỳ trước — hoá đơn phải khớp với biên bản đã đóng băng.` |
| `:369` | `Kỳ <id> đã ghi nợ chính thức nên không xoá được hoá đơn. Nếu cần điều chỉnh, hãy nạp hoá đơn điều chỉnh tăng/giảm.` |
| `ConsignmentDebtPostingService:225` | `Kỳ %d đang ở trạng thái %s. Phải CHỐT KỲ (đóng băng biên bản) trước khi ghi nợ chính thức.` |
| `:231` | `Kỳ %d chưa có hoá đơn NCC. Nhà cung cấp xuất hoá đơn sau khi 3 bên đối soát xong — hãy tải hoá đơn vào kỳ này trước khi ghi nợ chính thức.` |
| `:237` | `Kỳ %d có hoá đơn NCC LỆCH so với biên bản đã chốt: %s. Liên hệ NCC xuất lại hoặc xuất hoá đơn điều chỉnh, rồi kiểm tổng lại trước khi ghi nợ.` |
| `ConsignmentInternalDebtService:80` | `Kỳ %d đang ở trạng thái %s. Phải GHI NỢ CHÍNH THỨC với NCC trước, rồi mới ghi công nợ nội bộ TCT ↔ BĐT.` |

Mã lỗi `PodErrorCode.java:223-232`:

| Mã | Chuỗi |
|---|---|
| `CONSIGN-001` | `Chưa khai giá ký gửi cho sản phẩm, không thể chốt hoá đơn` |
| `CONSIGN-002` | `Sản phẩm ký gửi chưa gán nhà cung cấp, không thể treo công nợ` |
| `CONSIGN-003` | `Kỳ đối soát đã khoá, không thể sửa ngày chứng từ về kỳ này` |
| `CONSIGN-004` | `Nghĩa vụ tạm tính chưa đối soát, không được lập lệnh chi` |
| `CONSIGN-005` | `Hàng ký gửi không còn hợp đồng hiệu lực, không được bán` |

⚠️ Nhãn tiếng Việt trong code ở dạng **NFD** — script phải `normalize("NFC")` trước khi so chuỗi.

## 5. Vai

| Task | HDSD khai | Vai dùng |
|---|---|---|
| 010 tra cứu công nợ · 060 báo cáo | **đủ 4 cấp** | `province` chính; `shop` `ward` cho case phạm vi |
| 020 sinh kỳ · 030 chốt kỳ · 040 hoá đơn · 050 ghi nợ | **chỉ** `TONG_CONG_TY` `BUU_DIEN_TINH` | `province`; `shop` `ward` để bắt chặn |
| 070 ghi nợ nội bộ | 🚫 HDSD không khai | `tct` |

## 6. Phân loại

| Nhãn | Số case |
|---|--:|
| `READY_WITH_CODE_LOOKUP` | 100 |
| `BLOCKED` | 38 |

## 7. 🔴 Case ghi dữ liệu — 38/138, chưa ai được phép chạy

| Nhóm | Hậu quả nếu chạy nhầm |
|---|---|
| `030` **chốt kỳ** | **Một chiều.** Biên bản đóng băng, 🚫 không mở lại được, 🚫 không xoá được. Khoản nghĩa vụ chuyển sang "Đã đối soát" và phiếu trong kỳ mất quyền sửa ngày chứng từ |
| `040` tải / xoá hoá đơn | Chứng từ thuế neo vào kỳ |
| `050` **ghi nợ chính thức** | 🔴 **Điểm không quay lại của cả phân hệ.** Sinh bút toán vào sổ công nợ NCC, cộng dư nợ kho, và **mở khoá lệnh chi tiền**. Bút toán 🚫 không sửa trực tiếp được |
| `070` ghi nợ nội bộ | Sinh công nợ nội bộ TCT ↔ Bưu điện tỉnh |

## 8. Quét 11 kỹ thuật mục 3.4

| # | Kỹ thuật | Case |
|--:|---|---|
| 1 | Ô bắt buộc | `16_050_009` `16_060_006` |
| 2 | Khoảng trắng | `16_010_008` — phân hệ chỉ có **một** ô nhập chữ tự do (`Mã đơn bán`); ô `Mã hàng / SKU` ở báo cáo dùng chung luật, 🚫 không dựng lặp |
| 3 | Giá trị biên | `16_020_004` `16_030_013` `16_040_019` `16_060_014` `16_060_015` |
| 4 | Kiểu dữ liệu sai | `16_010_012` `16_020_017` `16_040_005` `16_040_015` `16_050_019` `16_060_007` `16_070_003` |
| 5 | Tính duy nhất | `16_020_004` `16_040_004` `16_050_014` |
| 6 | Trạng thái × hành động | `16_020_013` `16_030_024` `16_030_025` `16_040_001` `16_040_002` `16_040_013` `16_040_014` `16_050_001` `16_050_003` `16_050_004` `16_050_014` `16_070_002` |
| 7 | Danh sách | `16_010_005` `16_010_011` `16_010_013`–`16_010_015` `16_060_010` |
| 8 | Tìm kiếm | `16_010_006`–`16_010_009` |
| 9 | Huỷ giữa chừng | `16_030_027` `16_040_018` `16_050_018` |
| 10 | Phạm vi theo vai | `16_010_019` `16_010_020` `16_020_014`–`16_020_016` `16_050_020` `16_060_027` |
| 11 | Sau khi ghi | `16_020_003` `16_030_018` `16_030_022` `16_040_003` `16_040_012` `16_050_013` `16_050_017` `16_060_019` `16_070_001` `16_070_004` |

Luật rẻ tiền: màn công nợ có **4** ô lọc và 22 case — đạt. Màn ghi nợ có **1** ô bắt buộc và 20 case
— đạt. Màn báo cáo có **5** ô lọc và 28 case — đạt.

## 9. 🔴 Lỗ hổng và mâu thuẫn đặc tả — 🚫 không tự sửa

| # | Vấn đề |
|--:|---|
| a | 🔴 **Cả một luồng nghiệp vụ không có trong HDSD: ghi nợ nội bộ TCT ↔ BĐT.** `POST /consignment-recon/periods/{id}/post-internal-debt` (`ConsignmentInternalDebtService`) chạy **sau** ghi nợ chính thức và sinh công nợ nội bộ giữa Tổng công ty và Bưu điện tỉnh. HDSD 16 (6 task) 🚫 **không nhắc lần nào**. Đã dựng tạm nhóm `070` (4 case) từ code. **Cần user xác nhận luồng này thuộc phân hệ nào** — `16` hay `13-cong-no-diem-ban-tinh` hay một phân hệ Tỉnh↔TCT chưa lập (xem câu hỏi CHẶN số 1 ở handoff mục 6). |
| b | 🔴 **HDSD 030 viết như thể phải xử lý hết cảnh báo mới chốt được kỳ, code thì không chặn.** HDSD: *"Xử lý xong cảnh báo thì bấm Chốt kỳ"*. Code (`ConsignmentReconDetailPage.jsx:369-376`): hộp xác nhận chỉ hiện dòng đỏ **"Nên xử lý trước khi chốt"** — kỳ **vẫn chốt được** dù còn đơn lệch và dòng chưa gán NCC. Case `16_030_018`. 🔴 Chốt kỳ là một chiều, nên nếu đây không phải ý đồ thì là lỗ hổng nghiêm trọng. |
| c | 🔴 **Chưa xác định được ngưỡng dung sai khi kiểm tổng hoá đơn với biên bản.** HDSD 040 🚫 không nêu, và chưa trace ra hằng số trong `ConsignmentInvoiceService.kiemTong`. Đối chiếu: phân hệ `14_3` dùng **10 đồng** (`MONEY_TOLERANCE = BigDecimal.TEN`). **Cần user xác nhận hai chỗ dùng chung ngưỡng hay khác nhau.** Case `16_040_019` để ngỏ, ghi rõ là chưa đo được. |
| d | 🔴 **Chốt kỳ bị chặn vì tiering dọn dữ liệu Thẻ kho — HDSD không nhắc.** `ReconSnapshotService:257`: tồn đầu kỳ phải cộng dồn từ Thẻ kho, kỳ cũ mà Thẻ kho đã bị dọn theo cấu hình tiering thì **chốt kỳ thất bại**. Người dùng 🚫 không có cách nào tự xử lý. Case `16_030_020`. |
| e | **Cột `Chu kỳ` của kỳ tất toán chép từ hợp đồng nên SAI về ngữ nghĩa.** Vẫn ghi "Tuần"/"Tháng" trong khi độ dài thật bằng thời hạn được phép trả hàng. HDSD tự nhận điều này và bảo đọc số ngày ở khối bung — tức là **chấp nhận hiển thị gây nhầm**. Case `16_020_012`. |
| f | **Ô tiền để trống có hai nghĩa khác nhau ở hai màn.** Ở màn chi tiết kỳ (`16_030_006`): *chưa đóng dấu giá*. Ở màn báo cáo (`16_060_016`): *chưa khai giá*. Cả hai 🚫 đều không phải số 0, nhưng cách xử lý khác nhau. |
| g | **`Xuất tặng` và `Trả hàng` nằm trong lượng đã xuất kho nhưng không tính vào `SL phải trả`.** Cộng nhầm là đưa NCC số sai. HDSD có cảnh báo nhưng UI 🚫 không chặn được việc cộng nhầm. Case `16_030_005`. |
| h | **Bản cũ (18/09) ghi route báo cáo là "chưa trace được"** và bỏ trống 3/4 API. Bản này đã chốt đủ; ghi lại để biết số case cũ (16) 🚫 không phản ánh độ phủ thật. |

## 10. Nguồn đã dùng — và chỗ chưa làm

| Nguồn | Mức |
|---|---|
| HDSD | đọc **trọn 6/6 file**, kể cả khối ⚠️ và 💡 |
| Sheet QC | 🚫 không phủ phân hệ này |
| FE | `ConsignmentDebtPage.jsx` · `ConsignmentReconListPage.jsx` · `ConsignmentReconDetailPage.jsx` · `ConsignmentInvoiceTab.jsx` · `ConsignmentReport.jsx` · 4 file `*Api.js` · `config.jsx` |
| BE | `ConsignmentReconController` · `ConsignmentInvoiceController` · `ConsignmentDebtController` (đối chiếu 20 path) · `ReconSnapshotService` · `ReconPeriodWriter` · `ReconPeriodQueryService` · `ConsignmentInvoiceService` · `ConsignmentDebtPostingService` · `ConsignmentInternalDebtService` · `PodErrorCode.java:223-232` |

🔴 **Chưa làm:**

1. 🚫 **Chưa chạy SELECT kiểm dữ liệu thật** — mọi con số trong tiền điều kiện là **giá trị mẫu**.
2. 🚫 **Chưa trace `ConsignmentInvoiceService.kiemTong`** ⇒ chưa có ngưỡng dung sai (lỗ hổng c).
   Đây là việc chặn case biên của nhóm `040`.
3. 🚫 **Chưa đọc `ConsignmentReportController`** của report-service — chỉ đối chiếu **đường dẫn**,
   chưa lấy thông báo lỗi và công thức vòng quay / DIO. Case `16_060_013` `16_060_014` vì thế mô tả
   hiện tượng, 🚫 không mô tả công thức.
4. 🚫 **Chưa đọc `ConsignmentAccountingApi`** (`features/consignmentAccounting/`) — sổ kế toán và
   hàng đợi lỗi hạch toán của hàng ký gửi. Chưa rõ thuộc phân hệ `16` hay phân hệ kế toán kho.
5. 🚫 **Chưa trace luồng hoá đơn về qua email** (cột `Nguồn` = `Email`). Cùng lỗ hổng với `14_3`.

## 🔴 Kết quả chạy script — 20/09/2026

**138/138 case có script.** Lượt chạy: **3 đạt · 1 đỏ · 134 skip**.

### 🔴 Case đỏ `16_010_001` — vai Tỉnh KHÔNG xem được công nợ hàng ký gửi

`GET /consignment-debt/obligations` trả **401 ở MỌI lần gọi** (đã đo hai lần, có cả lần kèm
`provinceCode=006`). Màn rỗng im lặng: 0 dòng, không thông báo nào.
🔴 Cùng kiểu với `02_010_029` (nhân viên) và `10_PQ_001` (bảng giá) — **ba màn khác nhau, cùng một
triệu chứng**: API 401 nhưng FE không báo gì cho người dùng.

### Ghi nhận

- `16_010_003` và `16_010_004` là **assertion phủ định** (màn *cố ý* không có nút lập công nợ tay
  và không có nút chi tiền) ⇒ script chờ bảng dựng xong rồi mới kết luận, 🚫 không assert phủ định
  trên màn còn trắng.
- Route đã chốt: `/debt-reconciliation/consignment-debt` · `/debt-reconciliation/consignment-recon`
  · `/report/consignment`.

134 case chưa chạy: phần lớn là case GHI (đối soát, chốt công nợ ký gửi — tiền thật) và case phụ
thuộc dữ liệu đối soát chưa có.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `16_040_019` | 🔴 Chưa xác định được ngưỡng dung sai khi kiểm tổng | Chưa đo được · Chờ chạy để lấy hành vi thật | 🔴 CHƯA ĐO ĐƯỢC — HDSD 040 🚫 không nêu dung sai và chưa trace ra hằng số tương ứng trong `ConsignmentInvoiceService.kiemTong`. Ghi lại hành vi thật rồi bổ sung. Đối chiếu: phân hệ 14_3 dùng dung sai 10đ |

**1/138 case** của phân hệ này chưa chốt được kỳ vọng.
