# Kịch bản auto test — 17 Quản lý quầy thu ngân

- Dựng 18/09/2026, **bổ sung trace code 19/09/2026** (45 → 64 case) · skill `test-scenario`
- Nguồn: `hdsd17_quan_ly_quay_thu_ngan/tasks/*.md` (đọc trọn 5/5) + sheet QC + trace code FE và BE
- 🚫 Chưa viết script.

## 1. Route

| Màn hình | Route |
|---|---|
| `CASHIER_COUNTER` — Tài chính › Quầy thu ngân | `/finance/cashier-counter` |
| `FUND` — Tài chính › Quản lý quỹ | `/finance/fund` |

## 1b. API — đối chiếu hai đầu FE ↔ BE (bổ sung 19/09/2026)

Cả hai nhóm nằm ở **pod-service**, 🚫 **không có prefix service**.

| Việc | Method + path | FE | BE |
|---|---|---|---|
| Danh sách quầy | `GET /cashier-counter/get-all` | `cashierCounterService.js:9` | `CashierCounterController:84` |
| Quầy đang hoạt động | `GET /cashier-counter/active-list` | `:20` | `:97` |
| Chi tiết quầy | `GET /cashier-counter/detail` | — | `:75` |
| Tạo quầy | `POST /cashier-counter/create` | `:28` | `:47` |
| Sửa quầy / kích hoạt lại | `PUT /cashier-counter/update` | `:39` | `:56` |
| Ngừng quầy | `DELETE /cashier-counter/delete` | `:50` | `:65` |
| Danh sách quỹ | `GET /fund/get-all` | `fundService.js:9` | `ShopFundController:56` |
| Tổng quỹ | `GET /fund/fund-total` | `:116` | `:154` |
| Tạo quỹ | `POST /fund/create` | `:21` | `:40` |
| Tạo quỹ mặc định | `POST /fund/create-default-fund` | `:108` | `:48` |
| Sửa quỹ | `PUT /fund/update` | `:29` | `:76` |
| **Chuyển quỹ** | `POST /fund/transfer` | `:52` | `:102` |
| Cấp quỹ (thêm lịch sử) | `POST /fund/add-history` | `:37` | `:113` |
| Lịch sử quỹ | `GET /fund/get-history` | `:67` | `:124` |
| Sửa / xoá lịch sử quỹ | `PUT /fund/update-history` · `DELETE /fund/delete-history` | `:78` `:93` | `:168` `:176` |

⚠️ `DELETE /cashier-counter/delete` là **ngừng hoạt động**, 🚫 KHÔNG phải xoá cứng — ca đã chốt và
lịch sử quỹ của quầy vẫn còn nguyên.

## 1c. Thông báo — nguyên văn từ code (bổ sung 19/09/2026)

### Frontend

| Tình huống | Nguyên văn |
|---|---|
| Thiếu tên quầy | `Vui lòng nhập tên quầy` |
| Thiếu mã quầy | `Vui lòng nhập mã quầy` |
| Tiêu đề modal | `Thêm quầy thu ngân` / `Cập nhật quầy thu ngân` |
| Placeholder | `Ví dụ: Quầy 1` · `Ví dụ: Q01` |
| Tạo / sửa xong | `Tạo quầy thu ngân thành công` / `Cập nhật quầy thu ngân thành công` |
| Hộp ngừng quầy | `Xác nhận ngừng quầy?` + `Quầy "<tên>" sẽ bị ngừng hoạt động và khóa quỹ tiền mặt tương ứng.` · nút `Ngừng quầy` / `Hủy` |
| Hộp kích hoạt lại | `Kích hoạt lại quầy?` + `Quầy "<tên>" sẽ hoạt động trở lại và mở lại quỹ tiền mặt tương ứng.` · nút `Kích hoạt lại` / `Hủy` |
| Ngừng / kích hoạt xong | `Đã ngừng quầy thu ngân` / `Đã kích hoạt lại quầy thu ngân` · lỗi `Không thể ngừng quầy` |

Cột bảng quầy: `STT` · `Mã quầy` · `Tên quầy` · `Trạng thái` · `Hành động`. Thẻ trạng thái:
`Ngừng hoạt động` (xám). Tiêu đề bảng: `Danh sách quầy thu ngân`. Nút: `Thêm quầy`.
Ô chọn điểm bán: placeholder `Chọn điểm bán`.

### Backend — `PodErrorCode.java:199-203`

| Mã | Nguyên văn |
|---|---|
| `COUNTER-001` | `Mã quầy thu ngân đã tồn tại` |
| `COUNTER-002` | `Quầy thu ngân không tồn tại` |
| `COUNTER-003` | `Quầy đang có ca chưa chốt, vui lòng chốt ca trước` |
| `COUNTER-004` | `Không tìm thấy quỹ tiền mặt của quầy` |
| `COUNTER-005` | `Tên quầy thu ngân đã tồn tại` |

`CashierCounterServiceImpl.java`: `Thiếu counterId` · `Thiếu shopId` ·
`Tên quầy không được để trống` · `Mã quầy không được để trống`.

⚠️ Nhãn tiếng Việt trong code ở dạng **NFD** — script phải `normalize("NFC")` trước khi so chuỗi.

## 2. Vai

Cả 5 task khai đủ 4 cấp, quyền `create_fund`. Dùng `shop`; `province` cho case chọn điểm bán và case
chuyển quỹ khác điểm bán; `gdv` cho case phạm vi.

## 3. Phân loại

| Nhãn | Số case |
|---|--:|
| `READY_WITH_CODE_LOOKUP` | 6 |
| `BLOCKED` | 9 |

## 4. Case ghi dữ liệu — 🔴 chưa ai được phép chạy

`17_010_003` · `17_010_004` · `17_020_002` · `17_030_001` · `17_030_002` · `17_040_002` · `17_050_001`

🔴 **Nhóm quỹ (`17_040_002`, `17_050_001`) là tiền mặt thật.** Cấp quỹ hay chuyển quỹ đều tạo bút toán
trong sổ quỹ và sẽ lệch khi kiểm quỹ cuối ngày. 🚫 Không chạy trên điểm bán đang hoạt động.
⚠️ `17_030_001` ngừng quầy — nhân viên đang trực sẽ không mở ca được vào quầy đó.

## 5. Lỗ hổng đặc tả

### ✅ Ba câu hỏi treo ĐÃ GIẢI bằng trace code 19/09/2026

| Câu hỏi treo (bản 18/09) | Trả lời từ code |
|---|---|
| Task 10 nói mã quầy không trùng nhưng **không ghi thông báo nguyên văn** | `Mã quầy thu ngân đã tồn tại` (`COUNTER-001`, `PodErrorCode.java:199`) |
| 🔴 Sheet QC `dong57` đòi **chặn trùng TÊN quầy**, HDSD chỉ ràng buộc **MÃ** — bên nào đúng? | 🔴 **Sheet QC ĐÚNG.** Backend có `COUNTER_NAME_EXISTED` — `Tên quầy thu ngân đã tồn tại` (`COUNTER-005`). **HDSD tả thiếu ràng buộc này.** Case `17_010_012` `17_020_013` đã viết lại kỳ vọng thành "bị chặn" |
| Task 30 nói *"hãy chắc chắn quầy không còn ca nào chưa chốt"* — **hệ thống có chặn không?** | 🔴 **CÓ chặn cứng.** `COUNTER_HAS_OPEN_SHIFT` — `Quầy đang có ca chưa chốt, vui lòng chốt ca trước` (`COUNTER-003`). Case `17_030_003` đã viết lại kỳ vọng |

Phát hiện thêm: `COUNTER_FUND_NOT_FOUND` — `Không tìm thấy quỹ tiền mặt của quầy` (`COUNTER-004`),
ném khi ngừng quầy mà quầy chưa có quỹ tiền mặt tương ứng. HDSD 🚫 không nhắc. Case `17_030_008`.

### 🔴 Còn treo

| # | Vấn đề |
|--:|---|
| a | 🔴 **Chuyển quỹ vượt số dư: chưa chốt được hành vi.** HDSD 050 🚫 không ghi thông báo, và `ShopFundService.java` 🚫 **không ném PodException nào** (grep trọn file, 0 kết quả). Nếu backend không chặn ở lớp khác thì quỹ **âm được**. Case `17_050_013` để phơi — **cần user quyết**. |
| b | **Chuyển quỹ về chính nó** — chưa rõ có chặn không. Nếu cho phép thì sinh hai dòng lịch sử quỹ vô nghĩa. Case `17_050_014`. |
| c | **`ShopFundController` có 14 endpoint nhưng HDSD 17 chỉ tả 2 việc** (cấp quỹ, chuyển quỹ). Bảy endpoint chưa có case nào: `create` `create-default-fund` `create-fund-for-old-shop` `update` `delete` `fund-summary` `update-history` `delete-history`. 🔴 **Cần user xác nhận** những việc này thuộc phân hệ nào — `17` hay một phân hệ quỹ riêng. |
| d | **Ba case gốc `TaiChinh_2` `TaiChinh_3` `TaiChinh_4` không thuộc phân hệ này.** Chúng nói về *"báo cáo phiếu thu"*, *"báo cáo phiếu chi"* và bộ lọc thời gian của báo cáo đó — nghiệp vụ của **`26_phieu_thu`**, 🚫 không phải quầy thu ngân. Theo luật 1 mục 4 handoff (🚫 không ép khớp) nên để trống thay vì nhét vào `17`. **Đề xuất: sửa `goc-mapping.js` chuyển nhóm "Tổng quan" của sheet `tai_chinh` (trừ `TaiChinh_1`) về `26_phieu_thu`** — cần user duyệt vì việc này đổi số của cả hai phân hệ. |

## 🔴 Kết quả chạy script — 20/09/2026

**64/64 case có script.** Lượt chạy: **5 đạt · 0 đỏ · 59 skip**.

Trace xác nhận: route **`/finance/cashier-counter`**, API `GET /cashier-counter/get-all`
(pod-service, 🚫 không prefix). Bảng đúng 5 cột *STT · Mã quầy · Tên quầy · Trạng thái · Hành
động*; nút **"Thêm quầy"**, mỗi dòng có *Sửa* · *Ngừng*. Điểm bán test có **2 quầy**.

59 case chưa chạy: case GHI (thêm/sửa/ngừng quầy, quản lý quỹ) — 🔴 ngừng một quầy đang mở ca là
chặn thu ngân đang bán.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `17_050_013` | Chuyển quỹ vượt số dư | Chưa đo được | 🔴 CHƯA CHỐT ĐƯỢC: HDSD 050 🚫 không ghi thông báo khi chuyển quá số dư, và `ShopFundService` 🚫 không ném PodException nào. Chạy để lấy hành vi thật — nếu KHÔNG bị chặn thì đây là lỗ hổng: quỹ âm |
| `17_050_014` | Chuyển quỹ về chính nó | Chờ chạy để lấy hành vi thật · Điều kiện chưa xác định | Ghi lại hành vi thật. 🔴 Nếu cho phép thì sinh hai dòng lịch sử quỹ vô nghĩa và số dư không đổi |

**2/64 case** của phân hệ này chưa chốt được kỳ vọng.
