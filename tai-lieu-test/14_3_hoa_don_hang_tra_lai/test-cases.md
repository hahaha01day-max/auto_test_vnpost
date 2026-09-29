# Kịch bản auto test — 14_3 Hoá đơn cho hàng trả lại nhà cung cấp

- Dựng 18/09/2026, **viết lại toàn bộ 19/09/2026** (12 → 89 case) · skill `test-scenario`
- Nguồn: `hdsd14_3_hoa_don_hang_tra_lai/tasks/*.md` (đọc trọn 4/4) + trace code FE và BE
- Sheet QC 🚫 **không phủ** phân hệ này ⇒ cột `Ma goc` trống toàn bộ
- Script: xem mục "Kết quả chạy script — 25/09/2026" cuối file

## 1. Vào màn thế nào — 🔴 không có route riêng

Toàn bộ phân hệ nằm **bên trong** khối `Các đợt trả nhà cung cấp` của drawer chi tiết phiếu xuất trả:

```
/inventory/stock-return-request  →  nút "Chi tiết" của một dòng phiếu
   →  cuộn xuống khối "Các đợt trả nhà cung cấp"
      →  khối hoá đơn của từng đợt (CreditNoteBatchBlock)
         →  "Tiếp nhận hoá đơn NCC" / "Xem đối soát"  →  CreditNoteReconcileDrawer
         →  "Phát hành hoá đơn"                        →  IssueReturnInvoiceDrawer
```

🔴 **Hai nhánh loại trừ nhau, hệ thống tự quyết theo hồ sơ NCC** (`byVnpost`):

| Bên lập hoá đơn | Thẻ | Nút | Nhóm case |
|---|---|---|---|
| Nhà cung cấp lập (mặc định) | `NCC phát hành` | **Tiếp nhận hoá đơn NCC** | `010` `020` `030` |
| Bưu điện lập | `VNPost phát hành` | **Phát hành hoá đơn** | `040` |

Người dùng 🚫 không chọn được nhánh.

## 2. API — đối chiếu hai đầu FE ↔ BE

Base `/stock/v2/return-credit-note` (`SupplierReturnCreditNoteController.java:43`).

| Việc | Method + path | BE |
|---|---|---|
| Danh sách hoá đơn | `GET .../return-credit-note` | `:53` |
| Chi tiết | `GET .../{id}` | `:63` |
| Tiếp nhận (tải XML) | `POST .../upload` | `:72` |
| Đối soát lại | `POST .../{id}/reconcile` | `:106` |
| Chốt chứng từ | `POST .../{id}/settle` | `:115` |
| Ghi nhận tính chất điều chỉnh | `POST .../{id}/adjustment-type` | `:124` |
| Sửa thuế suất một dòng | `POST .../{id}/items/{itemId}/vat-rate` | `:135` |
| Lấy bản nháp phát hành | `GET .../issue-draft` | `:147` |
| Phát hành hoá đơn | `POST .../issue` | `:156` |
| Gỡ hoá đơn | `DELETE .../{id}` | `:165` |

Không lệch dòng nào. Toàn bộ là pod-service, 🚫 không prefix `/report` hay `/invoice`.

## 3. 🔴 Luật đối soát — CON SỐ CHỐT ĐƯỢC

Handoff mục 7 ghi *"`14_3`, `16`, `27` đều nói đối soát khớp/lệch nhưng **không có ngưỡng dung sai**
⇒ chưa viết được case biên"*. **Với `14_3` điều đó không còn đúng** — ngưỡng có ở cả HDSD lẫn code:

```java
// SupplierReturnReconcileService.java:43
//   KHỚP ⟺ retQty = invQty (TUYỆT ĐỐI) AND |retAmt − invAmt| ≤ MONEY_TOLERANCE (10đ)
private static final BigDecimal MONEY_TOLERANCE = BigDecimal.TEN;   // :67
boolean amtMatched = retAmt.subtract(invAmt).abs().compareTo(MONEY_TOLERANCE) <= 0;  // :174
```

| Vế | Luật |
|---|---|
| **Số lượng** | khớp **tuyệt đối** sau khi quy về đơn vị gốc — 🚫 không có dung sai |
| **Tiền** | lệch **≤ 10 đồng** vẫn là khớp (phép so là `≤`, không phải `<`) |

⇒ dựng được ba case biên: lệch **8đ** khớp · lệch đúng **10đ** khớp · lệch **11đ** lệch
(`020_008` `020_009` `020_010`). 🔴 **Cần user xác nhận ngưỡng này áp cho `16` và `27` hay không** —
hai phân hệ đó vẫn chưa có số.

## 4. Nhãn hiển thị thật

### 4.1 Kết quả đối soát từng dòng (`CreditNoteReconcileDrawer.jsx:65-67`)

`Khớp` (xanh) · `Lệch` (đỏ) · `Chưa ghép được` (cam) · `Chờ đối soát` (vàng)

🔴 `Chưa ghép được` **khác hẳn** `Lệch`: nghĩa là hệ thống chưa nhận ra dòng hoá đơn ứng với mặt hàng
nào trên phiếu trả, thường do đơn vị tính không quy đổi được — 🚫 không phải sai lệch số liệu.

### 4.2 Trạng thái chứng từ (`:37-38`) và kết quả đối soát ở khối đợt (`CreditNoteBatchBlock.jsx:17-19`)

`Chưa chốt` / `Đã chốt chứng từ` · `Đối soát khớp` / `Đối soát lệch` / `Chờ đối soát`

### 4.3 Bảng đối soát chéo — 10 cột (`:222-311`)

`#` · `Mặt hàng` · `ĐVT trên hoá đơn` · `SL hoá đơn` · `SL phiếu trả` · `Tiền hoá đơn` ·
`Tiền phiếu trả` · `Thuế suất` · `Tiền thuế` · `Kết quả`

### 4.4 Bảng bút toán (`:526-540`)

`Tài khoản` · `Diễn giải` · `Nợ` · `Có`

### 4.5 Bảng hàng hoá màn phát hành — 9 cột (`IssueReturnInvoiceDrawer.jsx:78-129`)

`#` · `Mặt hàng` · `ĐVT` · `SL trả` · `Đơn giá gốc` · `Tiền trước thuế` · `Thuế suất` · `Tiền thuế` ·
`Tổng cộng`

### 4.6 Dải kết luận

Xanh: `Hoá đơn khớp với phiếu xuất kho trả NCC` ·
Đỏ: `Hoá đơn lệch so với phiếu xuất kho trả NCC — không thể chốt chứng từ` ·
Vàng: `Chưa xác định được hoá đơn điều chỉnh tăng hay giảm` (kèm thẻ `Chưa xác định dấu`)

## 5. Thông báo — nguyên văn từ code

### 5.1 Frontend

| Tình huống | Nguyên văn |
|---|---|
| Đọc XML khớp | `Đã đọc XML — đối soát KHỚP với phiếu xuất trả` |
| Đọc XML lệch | `Đã đọc XML — đối soát LỆCH, xem chi tiết bên dưới` |
| Đọc XML chưa rõ dấu | `Đã đọc XML, chưa đối soát được — bấm Đối soát lại để xem lý do` |
| Đọc XML hỏng | `Đọc XML thất bại` |
| Tệp quá lớn | `File "<tên>" vượt quá 10MB.` |
| Đối soát lại | `Đã đối soát lại` · lỗi `Không đối soát được` |
| Chưa chọn tính chất | `Chọn tính chất điều chỉnh trước` |
| Ghi nhận tính chất | `Đã ghi nhận tính chất điều chỉnh` · lỗi `Không ghi nhận được` |
| Chốt chứng từ | hộp `Chốt chứng từ hoá đơn điều chỉnh này?` · nút `Chốt chứng từ` · thành công `Đã chốt chứng từ và ghi giảm công nợ` |
| Gỡ hoá đơn | hộp `Gỡ hoá đơn điều chỉnh này?` · nút `Gỡ hoá đơn` · thành công `Đã gỡ hoá đơn khỏi đợt trả` |
| Phát hành | hộp `Phát hành hoá đơn xuất trả hàng?` · nút `Phát hành` · thành công `Đã phát hành hoá đơn xuất trả hàng` |
| Chưa có bản nháp | dải `Chưa tổng hợp được bản nháp hoá đơn` |
| Thiếu thuế suất | dải `Còn <N> dòng chưa xác định được thuế suất` |

### 5.2 Backend

| File · dòng | Nguyên văn |
|---|---|
| `SupplierReturnCreditNoteService:116` | `Chưa chọn tệp hoá đơn` (MISS_PARAM) |
| `:120` | `Đợt trả đã gắn hoá đơn điều chỉnh, không thể nạp thêm` |
| `:129` | `Không đọc được nội dung tệp hoá đơn: <lý do>` |
| `:135` | `Tệp không phải hoá đơn điều chỉnh (nhận được: <loại>)` |
| `:143` | `Hoá đơn điều chỉnh <TANG\|KHONG_DOI> không dùng được cho trả hàng (cần điều chỉnh GIẢM)` |
| `:152` | `Hoá đơn không có dòng hàng hoá nào đọc được — kiểm tra lại tệp XML` |
| `:158` | `Hoá đơn đã tồn tại trong hệ thống (trùng MST người bán + ký hiệu + số)` |
| `:238` | `Hoá đơn chưa đối soát khớp với phiếu xuất kho trả NCC, không thể chốt chứng từ` |
| `:245` | `Hoá đơn chưa gắn với đợt trả nào` |
| `:249` | `Không tìm thấy phiếu trả hàng` |
| `:254` | `Hoá đơn không có số tiền, không thể chốt` |
| `:349` | `Chỉ chọn được điều chỉnh GIẢM cho hoá đơn trả hàng` |
| `:370` | `Thuế suất không hợp lệ, chỉ nhận 0%, 5%, 8% hoặc 10%` |
| `:376` | `Không tìm thấy dòng hàng của hoá đơn` |
| `SupplierReturnReconcileService:112` | `Hoá đơn không có dòng hàng nào` |
| `:117` | `Phiếu xuất kho trả NCC không có dòng hàng` |
| `ReturnInvoiceDraftService:79` | `Phiếu xuất kho trả NCC không có dòng hàng` |
| `ReturnInvoiceIssueService:73` | `Không tìm thấy đợt trả` |

Mã lỗi trong `PodErrorCode.java:238-258`:

| Mã | Chuỗi |
|---|---|
| `RTN-CN-002` `CREDIT_NOTE_ALREADY_SETTLED` | `Hoá đơn điều chỉnh đã chốt hoặc đã gắn cho đợt trả khác` |
| `RTN-CN-003` `CREDIT_NOTE_RECONCILE_MISMATCH` | (dùng chuỗi tuỳ chỗ gọi) |
| `RTN-CN-004` `CREDIT_NOTE_ISSUER_MISMATCH` | `Nhà cung cấp này không thuộc luồng hoá đơn đang thao tác` |
| `RTN-CN-006` `RETURN_BATCH_NOT_WAIT_CONFIRM` | `Đợt trả không ở trạng thái chờ xác nhận` |
| `RTN-CN-007` `VAT_RATE_NOT_RESOLVED` | `Không xác định được thuế suất của mặt hàng, vui lòng nhập tay` |
| `RTN-CN-008` `EINVOICE_ISSUE_FAILED` | `Phát hành hoá đơn điện tử không thành công` |

⚠️ Nhãn tiếng Việt trong code ở dạng **NFD** — script phải `normalize("NFC")` trước khi so chuỗi.

## 6. Vai

HDSD cả 4 task khai `[BUU_DIEN_TINH, TONG_CONG_TY]`. Dùng `province` làm vai chính, `tct` cho case
`040_020`, `shop` cho hai case phạm vi (`010_021` `040_021`).

## 7. Phân loại

| Nhãn | Số case |
|---|--:|
| `READY_WITH_CODE_LOOKUP` | 41 |
| `BLOCKED` | 48 |

## 8. 🔴 Case ghi dữ liệu — 48/89, chưa ai được phép chạy

Phân hệ này chạm **chứng từ thuế** và **bút toán công nợ** — nặng hơn cả kho:

| Nhóm | Hậu quả nếu chạy nhầm |
|---|---|
| `010` tiếp nhận | Hoá đơn **neo vĩnh viễn** vào đợt trả; hoá đơn trùng bị chặn nên không nạp lại được cho đợt khác |
| `020` chốt chứng từ | Sinh **bút toán ghi giảm công nợ NCC** — 🚫 không chốt lại, 🚫 không gỡ được; **tự động xác nhận** đợt trả |
| `030` gỡ hoá đơn | **Xoá hẳn** chứng từ khỏi đợt, không phải ẩn |
| `040` phát hành | Đẩy hoá đơn ra **cơ quan thuế** — 🔴 **không thu hồi được** |

## 9. Quét 11 kỹ thuật mục 3.4

| # | Kỹ thuật | Case |
|--:|---|---|
| 1 | Ô bắt buộc | `010_010` `030_007` `040_017` |
| 2 | Khoảng trắng | `040_018` — 🔴 phân hệ chỉ có **một** ô nhập chữ tự do (`Dòng diễn giải`), nên chỉ một case; đã ghi lý do thay vì bịa thêm |
| 3 | Giá trị biên | `010_007` `010_008` `020_008`–`020_010` `020_017` `030_019` `030_020` |
| 4 | Kiểu dữ liệu sai | `010_009` `010_011`–`010_014` `020_018` `030_021` `040_013` |
| 5 | Tính duy nhất | `010_015` `010_016` `040_012` |
| 6 | Trạng thái × hành động | `010_016` `010_017` `020_016` `030_005` `030_012` `030_014` `030_015` `040_010` |
| 7 | Danh sách | `020_002` `020_003` `020_011` `040_003` |
| 8 | Tìm kiếm | — 🔴 **không áp dụng**: phân hệ này 🚫 không có ô tìm kiếm nào. Hoá đơn truy theo đợt trả, không tra cứu độc lập trên UI |
| 9 | Huỷ giữa chừng | `010_020` `020_023` `030_017` `040_016` |
| 10 | Phạm vi theo vai | `010_021` `040_020` `040_021` |
| 11 | Sau khi ghi | `020_013` `020_019`–`020_022` `030_008` `030_011` `030_013` `030_016` `030_022` `040_005` `040_012` |

Luật rẻ tiền: màn tiếp nhận có **1** ô bắt buộc (`Tệp hoá đơn`) và có 21 case — đạt. Màn phát hành có
**1** ô bắt buộc (`Dòng diễn giải`) và có 21 case — đạt.

## 10. 🔴 Lỗ hổng và mâu thuẫn đặc tả — 🚫 không tự sửa

| # | Vấn đề |
|--:|---|
| a | 🔴 **FE bày 3 lựa chọn tính chất điều chỉnh, BE chỉ nhận 1.** `CreditNoteReconcileDrawer.jsx:426-428` cho chọn `Điều chỉnh giảm` · `Điều chỉnh tăng` · `Không đổi giá trị`. `SupplierReturnCreditNoteService.java:348-351`: `if (!AdjustmentType.GIAM.equals(adjustmentType)) throw "Chỉ chọn được điều chỉnh GIẢM cho hoá đơn trả hàng"`. ⇒ **2/3 lựa chọn LUÔN thất bại**. Case `030_009` `030_010`. Hoặc bỏ 2 lựa chọn khỏi FE, hoặc BE phải nhận. |
| b | 🔴 **HDSD 010 chép sai hai chuỗi lỗi.** HDSD: `"Chỉ tiếp nhận hoá đơn điều chỉnh giảm cho hàng trả lại"` và `"Hoá đơn này đã được tiếp nhận cho một đợt trả khác"`. Code: `Tệp không phải hoá đơn điều chỉnh (nhận được: <loại>)` và `Hoá đơn đã tồn tại trong hệ thống (trùng MST người bán + ký hiệu + số)`. **Không chuỗi nào khớp.** Cùng kiểu lỗi đã gặp ở `14_1` (3 chỗ) và `14_2` (2 chỗ). |
| c | 🔴 **HDSD 020 chép sai chuỗi chốt lại.** HDSD: `"Hoá đơn này đã được chốt chứng từ"`. Code: `Hoá đơn điều chỉnh đã chốt hoặc đã gắn cho đợt trả khác`. |
| d | 🔴 **Chốt chứng từ TỰ ĐỘNG xác nhận đợt trả — HDSD không nói.** `SupplierReturnCreditNoteService.java:257-259`: đợt còn `WAIT_CONFIRM` mà hoá đơn đối soát KHỚP thì **tự xác nhận**, không bắt bấm nút `NCC xác nhận`. ⇒ Mâu thuẫn với HDSD `14_2` task 060 vốn dạy người dùng phải bấm nút đó. Case `020_019`. |
| e | 🔴 **Số tiền bút toán lấy từ HOÁ ĐƠN, không từ đợt trả.** Hai số có thể lệch tới 10đ (dung sai) mà vẫn "khớp" ⇒ sổ công nợ ghi theo hoá đơn, còn phiếu trả giữ số khác. Chênh lệch này đi đâu? HDSD 🚫 không nói. Case `020_022`. |
| f | **`Dòng diễn giải trên hoá đơn` — HDSD khai Bắt buộc = Có, FE 🚫 không thấy rule required.** Case `040_017` `040_018` dựng để phơi hành vi thật. Nếu phát hành được với ô rỗng thì hoá đơn ra cơ quan thuế thiếu dẫn chiếu hoá đơn gốc. |
| g | **Dung sai 10đ áp cho `16` và `27` không?** Hai phân hệ đó cũng "đối soát khớp/lệch" mà chưa có ngưỡng (handoff mục 7). Nếu dùng chung `MONEY_TOLERANCE` thì chốt luôn; nếu khác thì phải khai riêng. |
| h | **Không có case cho luồng hoá đơn về qua email.** HDSD 010 mẹo nói hoá đơn *"có thể về hệ thống qua hộp thư điện tử của đơn vị và được tự phân loại về đúng đợt trả"*. Đã dựng `010_018` chỉ kiểm **cột Nguồn tiếp nhận**; phần **tự phân loại** (ghép hoá đơn với đúng đợt) 🚫 chưa dựng được vì chưa trace luồng IMAP. |

## 11. Nguồn đã dùng — và chỗ chưa làm

| Nguồn | Mức |
|---|---|
| HDSD | đọc **trọn 4/4 file**, kể cả khối ⚠️ và 💡 |
| Sheet QC | 🚫 không phủ phân hệ này |
| FE | `CreditNoteBatchBlock.jsx` · `CreditNoteReconcileDrawer.jsx` · `IssueReturnInvoiceDrawer.jsx` · `returnCreditNoteApi.js` |
| BE | `SupplierReturnCreditNoteController.java` (đối chiếu 10 path) · `SupplierReturnCreditNoteService.java` · `SupplierReturnReconcileService.java` · `ReturnInvoiceDraftService.java` · `ReturnInvoiceIssueService.java` · `PodErrorCode.java:238-258` |

🔴 **Chưa làm:**

1. 🚫 **Chưa chạy SELECT kiểm dữ liệu thật** — mọi con số trong tiền điều kiện là **giá trị mẫu**.
2. 🚫 **Chưa có tệp XML mẫu để chạy.** Repo có `utils/buildSampleCreditNoteXml.js` và
   `services/mockCreditNote.js` — người viết script phải dựng bộ tệp thử (khớp · lệch 8đ · lệch 10đ ·
   lệch 11đ · điều chỉnh tăng · không có dòng hàng · >10MB · XML hỏng) từ đó. **Đây là việc chặn
   nhiều case nhất của phân hệ.**
3. 🚫 **Chưa trace thuật toán ghép dòng** của `SupplierReturnReconcileService` (phần quy đổi ĐVT và
   ghép mặt hàng). Case `020_006` `030_022` vì thế mô tả hiện tượng, 🚫 không mô tả luật ghép.
4. 🚫 **Chưa trace luồng hoá đơn về qua email** (xem lỗ hổng h).

## 🔴 Kết quả chạy script — 25/09/2026 (làn 8, viết lại toàn bộ)

**89/89 case có script thật** (hết vỏ `chua-chay-duoc.*`). Spec: `tiep-nhan` · `doi-soat` · `chot` · `phat-hanh`
(province) · `hoa-don-tra.shop` · `phat-hanh.tct`; helper `tests/hoa-don.js`.

- Tệp XML dựng theo khuôn `vnpost-web/src/features/purchaseOrder/utils/poInvoiceXml.js` (thẻ `*CLQuan`, dấu ở
  `ProcessInvNote`) — mục 11 "chưa có tệp XML mẫu" đã giải quyết.
- Tiền đề: đợt `WAIT_CONFIRM` của HUB tỉnh (14_2 sinh). Nạp thử đều gỡ lại; chỉ `chot.province` tiêu hao 1 đợt/lượt.
- 🔴 Nhánh B (040): BE không trả `returnInvoiceIssuer` ⇒ case đọc drawer phát hành chèn cờ VNPOST vào response chi
  tiết phiếu (ghi annotation "giả lập"); `POST /issue` luôn bị chặn — phát hành thật chưa ai được phép.
- Phân loại đỏ / chưa chạy: `_BAO_CAO_KY_VONG_CAN_CHOT.md` mục `14_3`.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `14_3_040_015` | Hoá đơn phát hành xong không thu hồi được | Chờ chốt với QC | 🔴 Không có chức năng nào thu hồi. Hộp xác nhận đã nói rõ trước khi bấm. Case này để chốt lại với QC |
| `14_3_040_017` | Dòng diễn giải bỏ trống | Chờ chạy để lấy hành vi thật | 🔴 HDSD khai trường này **Bắt buộc = Có** nhưng FE 🚫 không thấy rule required nào. Ghi lại hành vi thật: phát hành được hay bị chặn — xem mục lỗ hổng |
| `14_3_040_018` | Dòng diễn giải toàn khoảng trắng | Chờ chạy để lấy hành vi thật · Điều kiện chưa xác định | Ghi lại hành vi thật: hệ thống có trim và coi là rỗng không. 🔴 Nếu phát hành được thì hoá đơn ra ngoài cơ quan thuế với dòng diễn giải rỗng |

**3/89 case** của phân hệ này chưa chốt được kỳ vọng.
