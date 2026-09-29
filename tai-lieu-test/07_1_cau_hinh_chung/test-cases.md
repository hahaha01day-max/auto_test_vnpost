# Kịch bản auto test — 07_1 Cấu hình chung

- Dựng 18/09/2026 từ `resource/hdsd/hdsd07_1_cau_hinh_chung/tasks/*.md` (5 task).
- **Bổ sung 18/09/2026:** quét 11 kỹ thuật mục 3.4 + đối chiếu **menu cấu hình thật trong code**.
  **23 → 29 case.** CSV nay đủ **7 cột** (trước thiếu `Ma goc` và `Nguon`).
- Sheet QC không phủ phân hệ này ⇒ việc duy nhất là quét kỹ thuật.

## 1. Route

| Nhóm cấu hình | Route |
|---|---|
| Làm tròn tiền | `/settings?setting=roundingAmount` |
| **Làm tròn tiền phần kho** | `/settings?setting=roundingAmountStock` — 🔴 nhóm HDSD không nhắc |
| Làm tròn số lượng | `/settings?setting=roundingQuantity` |
| Tiền tệ | `/settings?setting=currency` |
| VAT mặc định | `/settings?setting=vatDefault` |
| Tự động đăng xuất | `/settings?setting=autoLock` |

## 🔴 32 nhóm cấu hình trong menu — 8 nhóm KHÔNG có phân hệ nào phủ

`SettingPageNext.jsx` khai **32 nhóm cấu hình**. Đối chiếu với 4 phân hệ `07_x` và các phân hệ khác:

| Nhóm chưa có phân hệ nào phủ | Ghi chú |
|---|---|
| `roundingAmountStock` — **Làm tròn tiền phần kho** | đã bổ sung vào `07_1` (task `060`); HDSD 07_1 không nhắc |
| `warehouse` — Kho hàng | khác với `04_5` (Quản lý kho hàng) — đây là **cấu hình** kho |
| `priorityExpiryLot` — Ưu tiên bán lô gần hết hạn | liên quan `16_hang_ky_gui` và `04_1` nhưng không phân hệ nào khai |
| `finance` — Tài chính | |
| `vat` — Thuế VAT | khác `vatDefault` mà `07_1` đã phủ |
| `boxQR` — Loa thông báo | |
| `reasonCatalog` — Quản lý danh mục lý do | |
| `other` — Khác | |

🔴 Cần user chốt: đưa vào `07_x` nào, hay lập phân hệ mới. 🚫 Chưa tự dựng case cho 7 nhóm còn lại.

## 2. 🔴 Bẫy làm tròn — hai cấu hình, hai nhóm số

`roundingAmount` (tiền bán hàng) và `roundingAmountStock` (tiền phần kho) là **hai cấu hình riêng**,
áp cho hai nhóm số khác nhau. Bẫy đã biết của repo:

- **Key tiền vs key số lượng, và THỨ TỰ làm tròn** — làm tròn sai thứ tự là lệch tiền.
- **Nguồn giữ scale 6, chỉ làm tròn lúc tính** — 🚫 đừng so bằng số đã tròn 2 chữ số.
- Một số bị áp cả hai cấu hình = **làm tròn hai lần** ⇒ `07_1_060_002` là case đo.

## 3. Ràng buộc đo được

| Ô | Ràng buộc |
|---|---|
| Đơn vị làm tròn tiền | số nguyên **-3 … 3** (biên đóng, xem `07_1_010_007`) |
| Đơn vị làm tròn số lượng | mặc định **2**, nhận **0 … 3** |
| Phương thức làm tròn | mặc định *Làm tròn thông thường* |
| Thuế suất VAT | chỉ **0% · 5% · 8% · 10%**, mặc định **8%** |
| Ô Mô tả | tối đa **200** ký tự, có bộ đếm |

## 4. Phân loại: `READY_WITH_CODE_LOOKUP` 16 · `BLOCKED` 13 · case ghi **14**

🔴 Mọi cấu hình ở đây **áp cho cả đơn vị** — đổi là đổi cách tính tiền của mọi chứng từ sau đó.

## 5. Việc còn lại

1. Trace nhóm `roundingAmountStock` (`07_1_060_001`) — chưa biết nó có ô nào và áp cho con số nào.
2. Trình user câu hỏi ở mục "32 nhóm cấu hình" — 8 nhóm chưa ai phủ.
3. Chốt hành vi trim của ô Mô tả (`07_1_030_006`).

## 🔴 Kết quả chạy script — 20/09/2026

```bash
npx playwright test --config tai-lieu-test/07_1_cau_hinh_chung/playwright.config.js
```

**29/29 case có script.** Lượt chạy: **13 đạt · 1 đỏ · 15 skip**.

### Case đỏ — `07_1_010_006`: phương thức làm tròn đang lưu KHÁC kỳ vọng

Kịch bản đòi ô hiện sẵn *"Làm tròn thông thường (0.5 làm tròn lên)"*; giá trị đang lưu trên hệ
thống là **"Luôn làm tròn lên"**. 🔴 Đây là **giá trị cấu hình thật của cả mạng lưới**, không phải
giá trị mặc định của form ⇒ cần user chốt: cấu hình bị đổi ngoài ý muốn, hay kỳ vọng của kịch bản
viết theo mặc định lúc cài đặt. 🚫 Không nới lỏng assertion.

### Đo được, khác tài liệu

| Thứ | Tài liệu | Thực tế |
|---|---|---|
| Số mẫu ô *Xem trước kết quả* | `12.345` | **`12,345.678 → 12,400`** |
| Bộ đếm ô Mô tả | `200/200` | **`200 / 200`** (có khoảng trắng) |
| Nút lưu trong form cấu hình | "Lưu" | **"Lưu cấu hình"** |

### `07_1_PQ_001` — vai tỉnh ĐÃ bị chặn đúng

Vai `province` mở được màn cấu hình nhưng **0 nút Sửa** và **0 công tắc bấm được** (công tắc còn
hiện nhưng ở trạng thái vô hiệu). 🔴 Phép kiểm đếm *công tắc bấm được*, 🚫 không đếm số công tắc
trên màn — công tắc hiện mà vô hiệu vẫn là "không bật/tắt được".

### 15 case chưa chạy

Đều là case **GHI cấu hình cấp hệ thống**: đổi đơn vị làm tròn, VAT mặc định, tiền tệ, thời gian tự
động đăng xuất — mỗi thứ đổi là **đổi cách tính tiền hoặc hành vi đăng nhập của mọi điểm bán ngay
lập tức**. Giữ `allowMutation: false` cho tới khi user xác nhận môi trường được phép ghi.
