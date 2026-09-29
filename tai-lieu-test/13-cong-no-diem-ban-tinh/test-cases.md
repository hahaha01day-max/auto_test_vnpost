# Kịch bản auto test — Công nợ điểm bán ↔ Bưu điện Tỉnh

- Ngày dựng: **15/09/2026** · skill `test-scenario`
- Nguồn nghiệp vụ (đã chuyển thể, 🚫 không nghĩ lại từ đầu):
  - `.feature/công nợ điểm bán - tỉnh - tổng công ty/test_plan_cong_no_nghiep_vu.md` (bản 15/09)
  - `.feature/công nợ điểm bán - tỉnh - tổng công ty/huong_dan_test_luong.md` (bản 15/09)
  - `.claude/plans/2026-09-15_so-cong-no-diem-ban-tinh-P0-P1-P2-chi-tiet.md` (mục "Đã làm")
- Phạm vi đợt này: **phần mới 15/09** — nợ đầu kỳ khai báo, số dư mang sang, kiểm đếm cấp dòng,
  nợ đơn vị vận chuyển, và hai ca phân quyền. 🚫 Không phủ lại phần kết ca / VA / Tỉnh–TCT (đã có
  ở các phân hệ khác hoặc chưa thuộc đợt này).

---

## 1. Trace kỹ thuật — route · API · nhãn thật

Tất cả trace từ code ngày 15/09, 🚫 không chép từ tài liệu.

### Route

| Màn | Đường dẫn | Nguồn |
|---|---|---|
| Hub công nợ Điểm bán–Tỉnh | `/debt-reconciliation/remittance` | `utils/constants/config.jsx:271` (`REMITTANCE_HUB`) |
| Tab nợ đầu kỳ | `…/remittance?tab=opening-debt` | `RemittanceHubPage.jsx:155` |
| Tab kỳ đối soát | `…/remittance?tab=pos-settlement` | `RemittanceHubPage.jsx:161` |
| Tab Tỉnh nhận tiền | `…/remittance?tab=province-cash-inflow` | `RemittanceHubPage.jsx:102` |
| Tab nợ đơn vị vận chuyển | `…/remittance?tab=lpb-shortage` | `RemittanceHubPage.jsx:169` |
| Xác nhận lẻ (đã khoá) | `/debt-reconciliation/province-receipt` | `debtReconciliationRoutes.js` (route giữ, tab comment) |

### API — 🔴 prefix service bắt buộc, thiếu là 404 ở gateway

| Việc | Method + path | Nguồn |
|---|---|---|
| Nợ đầu kỳ đã ký | `GET /remittance/opening-debt` | `OpeningDebtController` |
| Điểm bán còn thiếu | `GET /remittance/opening-debt/missing` | nt |
| Danh sách bản khai | `GET /remittance/opening-debt/previews` | nt |
| Dòng của bản khai | `GET /remittance/opening-debt/previews/{id}/items` | nt |
| Tạo bản khai | `POST /remittance/opening-debt/previews` | nt |
| Duyệt và ký | `POST /remittance/opening-debt/previews/{id}/approve` | nt |
| Danh sách kỳ | `GET /remittance/settlement-period` | `PosSettlementController:56` |
| Dòng điểm bán của kỳ | `GET /remittance/settlement-period/{id}/shops` | `:84` |
| Mở kỳ / dựng lại | `POST /remittance/settlement-period` | `:130` |
| Ký kỳ | `POST /remittance/settlement-period/sign` | `:184` |
| Danh sách chuyến | `GET /province-tct/cash-inflow/lpb` | `ProvinceCashInflowController:63` |
| Túi trong chuyến | `GET /province-tct/cash-inflow/lpb/{id}/items` | `:84` |
| Xác nhận thực nhận | `POST /province-tct/cash-inflow/lpb/confirm` | `:144` — 🔴 payload nay là `{id, items:[{batchItemId, receivedAmount, varianceNote}]}` |
| Sổ nợ vận chuyển | `GET /province-tct/cash-inflow/lpb/shortage` | mới 15/09 |
| Tổng còn treo | `GET /province-tct/cash-inflow/lpb/shortage/total` | mới 15/09 |

🔴 `status.code` là **chuỗi**: `expect(String(body?.status?.code)).toBe('200')`.

### Nhãn hiển thị (chép nguyên văn từ FE)

| Nơi | Nhãn |
|---|---|
| Tab | `Nợ đầu kỳ điểm bán` · `Đối soát công nợ bán hàng` · `Bưu điện Tỉnh nhận tiền` · `Nợ đơn vị vận chuyển` |
| Cột kỳ (bảng điểm bán) | `Điểm bán thu` · `Đã nộp` · `Chênh lệch` · `Nợ đầu kỳ` · `Nợ cuối kỳ` |
| Nút | `Khai ngay` · `Tạo bản khai` · `Duyệt và ký` · `Xem dòng` · `Lập chuyến bàn giao` · `Xác nhận thực nhận` |
| Drawer kiểm đếm | `Kiểm đếm và xác nhận thực nhận tiền mặt` · `Tổng thực nhận (hệ thống cộng)` · `Nguyên nhân lệch` |
| Cột sổ nợ LPB | `Chuyến` · `Túi / phiếu` · `Điểm bán (truy vết)` · `Số lệch` · `Đã thu hồi` · `Trạng thái` |

⚠️ **Nhãn tiếng Việt trong DOM ở dạng NFD.** Script phải `.normalize('NFC')` trước khi so chuỗi —
nhìn bằng mắt giống hệt nhưng so trực tiếp sẽ trượt.

### Thông báo chặn — chép nguyên văn từ service

| Case | Nguyên văn (trích) | Nguồn |
|---|---|---|
| CNDB-KY-002 | `Kỳ đối soát phải tròn tháng: từ ngày 01 của tháng đến ngày 01 của tháng kế tiếp…` | `PosSettlementService.kiemTronThang` |
| CNDB-KY-003 | `Còn N điểm bán chưa khai nợ đầu kỳ: <tên>…` | `PosSettlementService.kiemDaKhaiNoDauKy` |
| CNDB-KY-004 | `Kỳ mới phải bắt đầu đúng ngày … — nối liền kỳ #…` | `PosSettlementService.kiemLienMach` |
| CNDB-CD-004 | `Còn N túi chưa kiểm đếm: …` | `ProvinceCashInflowService.confirmReceive` |
| CNDB-CD-005 | `Túi lệch phải nhập diễn giải: …` | nt |
| CNDB-ND-009 | `… đã có nợ đầu kỳ ĐÃ KÝ (…) — không ghi đè…` | `OpeningDebtService.duyetVaKy` |
| CNDB-PQ-002 | `Xác nhận nhận tiền phải làm qua CHUYẾN BÀN GIAO …` | `PosRemittanceController.confirmReceive` |

---

## 2. Phân loại độ sẵn sàng

**Tổng: 25 case** — `READY` 14 · `READY_WITH_CODE_LOOKUP` 0 · `BLOCKED` 11.

### READY — 14 case

Đọc, validate phía client, và phạm vi. 🚫 Không ghi dữ liệu, chạy được ngay khi có tài khoản.

| Case | Vai | Loại kỳ vọng |
|---|---|---|
| CNDB-ND-001, CNDB-ND-002, CNDB-ND-003 | `province` | số + nhãn |
| CNDB-ND-004, CNDB-ND-005 | `province` | chặn kèm thông báo |
| CNDB-ND-007 | `shop` | nhãn (không có nút) |
| CNDB-KY-001 | `province` | nhãn cột |
| CNDB-KY-002 | `province` | chặn kèm thông báo |
| CNDB-CD-001, CNDB-CD-002, CNDB-CD-003 | `province` | nhãn + số |
| CNDB-LPB-001, CNDB-LPB-003 | `province` | nhãn + tham số request |
| CNDB-PQ-001 | `shop` | phạm vi — tab không render |

### BLOCKED — 11 case, 🚫 không hạ kỳ vọng để chạy được

| Case | Vì sao chặn | Gỡ bằng cách nào |
|---|---|---|
| CNDB-ND-006, CNDB-ND-008, CNDB-ND-009 | **ghi dữ liệu**: tạo bản khai, ký nợ đầu kỳ. Ký xong 🚫 không sửa, cũng chưa có luồng điều chỉnh | user bật `VNPOST_ALLOW_FINANCIAL_MUTATION` trên môi trường được phép ghi |
| CNDB-KY-003 | cần **dựng trạng thái**: một điểm bán chưa khai nợ đầu kỳ, trong khi tỉnh test có thể đã khai đủ | khai `requiredState`, hoặc chạy trước CNDB-ND-008 trên môi trường sạch |
| CNDB-KY-004, CNDB-KY-009 | ghi dữ liệu: mở kỳ, ký kỳ | như trên |
| CNDB-KY-005, CNDB-KY-006, CNDB-KY-007, CNDB-KY-008 | cần **kỳ đã dựng số liệu** và ít nhất **2 kỳ liền mạch** — dữ liệu nền chưa chắc có | chuẩn bị dữ liệu rồi điền `periodId` vào `test-input.json` |
| CNDB-CD-006, CNDB-CD-007, CNDB-CD-008 | ghi dữ liệu + **sinh bút toán** — 🔴 không hoàn tác được | chỉ chạy trên môi trường được phép ghi |
| CNDB-LPB-002 | cần sẵn **một khoản lệch âm và một khoản dương** cùng lúc | chạy sau CNDB-CD-007 hai lần với hai chiều lệch |
| CNDB-PQ-002 | 🔴 endpoint xác nhận lẻ tuy đã khoá nhưng **thao tác vẫn gửi request ghi** — nếu bản đang test chưa có bản khoá thì phiếu sẽ bị đóng thật | chỉ chạy sau khi xác nhận bản deploy đã có bản sửa 15/09 |

🔴 **Cấm hạ kỳ vọng.** Ví dụ CNDB-KY-006 (công thức số dư) 🚫 không được hạ thành *"cột Nợ cuối kỳ có
hiển thị"* — câu đó luôn xanh và 🚫 không kiểm được gì.

---

## 3. Case ghi dữ liệu — danh sách phải xin phép trước khi chạy

| Case | Ghi gì | Hoàn tác được? |
|---|---|---|
| CNDB-ND-006 | tạo bản khai nợ đầu kỳ (`SHOP_OPENING_DEBT_PREVIEW`) | có — huỷ bản khai |
| CNDB-ND-008, CNDB-ND-009 | **ký** nợ đầu kỳ (`SHOP_OPENING_DEBT` = SIGNED) | 🔴 **KHÔNG** |
| CNDB-KY-004 | mở kỳ đối soát | có — nhưng kỳ đã ký thì không |
| CNDB-KY-009 | **ký** biên bản kỳ | 🔴 **KHÔNG** |
| CNDB-CD-006, CNDB-CD-007, CNDB-CD-008 | xác nhận chuyến ⇒ **bút toán + chứng từ + đóng phiếu** | 🔴 **KHÔNG** |
| CNDB-PQ-002 | có thể đóng phiếu nếu bản deploy chưa khoá endpoint | 🔴 **KHÔNG** |

Tất cả để `allowMutation: false`. 🚫 Không tự bật.

---

## 4. Lỗ hổng phát hiện khi trace — báo để user quyết, 🚫 không tự sửa

1. **Chưa có endpoint đọc `SHOP_OPENING_DEBT` của MỘT điểm bán.** `GET /remittance/opening-debt` trả cả
   tỉnh; case CNDB-KY-005 phải lọc phía script. Chấp nhận được, nhưng nếu tỉnh có hàng trăm điểm bán thì
   nên có tham số lọc.
2. **Sổ nợ vận chuyển chưa có endpoint đọc một dòng theo `batchItemId`.** CNDB-CD-007 phải tìm dòng theo
   `batch_id` + số niêm phong trong danh sách. Không chặn, chỉ làm assertion dài hơn.
3. **`GET /remittance/opening-debt/previews` phân trang server nhưng FE đang gọi `size=20` cố định** —
   bản khai thứ 21 trở đi không thấy ở màn. Chưa phải lỗi ở quy mô hiện tại, ghi nhận.

## 🔴 Bổ sung 20/09/2026 — 12 case còn thiếu script

**40/40 case có script.** Bốn case đọc mới nằm ở `tests/cong-no-bo-sung.province.spec.js`.

### 🔴 Hub công nợ có ĐÚNG 9 tab — 🚫 không có tab nào cho khoản treo LPB

`dashboard · shift-variance · cash-remittance · daily-closing · province-cash-inflow ·
pos-settlement · opening-debt · cash-voucher · report` (ba tab cuối bị thu vào nút `...`).

⇒ `CNDB-LPB-002` skip kèm lý do: 🚫 **không tab nào gọi `.../lpb/shortage/total`**. Cần user chỉ
đúng lối vào màn khoản treo LPB, 🚫 không đoán.

### 🔴 `CNDB-PQ-003` — tài khoản vai `tct` CHƯA được cấp chức năng công nợ

Mở `/debt-reconciliation/remittance` bằng vai `tct` ra đúng một câu:
**"Tài khoản của bạn chưa được cấp chức năng nào trong nghiệp vụ này"** — 0 tab, 0 bảng.
Đây là **cấu hình quyền của tài khoản**, 🚫 không phải phạm vi dữ liệu ⇒ case skip kèm lý do,
🚫 không báo đỏ oan cho sản phẩm. **Cần user cấp quyền cho tài khoản `tct`** rồi chạy lại mới so
được phạm vi TCT ↔ Tỉnh.

### `CNDB-KY-011` · `CNDB-KY-012`

Viết đầy đủ (phân trang không lặp · **tổng kỳ không đổi khi chuyển trang** · tìm theo mã và tên ·
từ khoá không tồn tại ra bảng rỗng), hiện **skip** vì kỳ đối soát hiện tại chưa có điểm bán nào
trong bảng.
