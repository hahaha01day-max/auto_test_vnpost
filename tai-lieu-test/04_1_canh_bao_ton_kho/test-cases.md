# Kịch bản auto test — 04_1 Cảnh báo tồn kho và đề xuất nhập hàng

- **Bổ sung 18/09/2026:** trace code FE + quét 11 kỹ thuật mục 3.4. **55 → 72 case.**
  Phủ **30/30** case gốc sheet QC. Script hiện có: 52 case.

## 1. Route và component — trace từ code

| Màn hình | Component |
|---|---|
| Cảnh báo tồn kho (9 thẻ) | `features/stockAlert/StockAlertDashboard.jsx` |
| Bảng cảnh báo chung | `components/StockAlertTable.jsx` |
| Bảng Dự báo hết hàng | `components/StockForecastTable.jsx` |
| Cài đặt cảnh báo | `StockAlertConfigPage.jsx` → `components/CoreStockWarningConfigTab.jsx` · `ExpiryAlertConfigTab.jsx` |
| Nhập cấu hình từ Excel | `components/ImportStockWarningExcelDrawer.jsx` |
| Đề xuất nhập hàng tự động | `AutoProposePage.jsx` |
| API | `features/stockAlert/services/stockAlertApi.js` |

## 2. Cấu trúc màn — khác tài liệu ở mấy chỗ

**9 thẻ cảnh báo**, đúng thứ tự: Hết hàng · Dưới định mức Min · Vượt định mức Max · Sắp hết (7 ngày)
· Sắp hết (30 ngày) · Tồn lâu ngày · Dự báo hết hàng · Sắp hết hạn · Đã hết hạn.
🔴 Thẻ *"Cài đặt cảnh báo"* **đã bị comment out** khỏi dashboard — cài đặt ở màn riêng.

**Màn Cài đặt cảnh báo** phân nhánh theo cấp và theo phạm vi:

| Phạm vi / cấp | Có gì |
|---|---|
| Cấp tỉnh, "Một đơn vị" | khối *Cấu hình Tổng công ty* + 2 thẻ con: **Sản phẩm của tỉnh** · **Sản phẩm của Tổng công ty** |
| Cấp xã, "Một đơn vị" | y như trên nhưng nhãn là **Sản phẩm của xã** (`ownLabel` đổi theo cấp) |
| Cấp TCT | **không** có thẻ con, **không** có khối tham khảo (không có cấp trên) |
| "Nhiều tỉnh / theo vùng miền" | 🔴 **chỉ** sản phẩm cấp TCT; **không** có thẻ "Sản phẩm của tỉnh"; **không** có 3 thẻ số liệu; bảng *Đã cài đặt* thêm cột **Đơn vị** |

Mỗi nhánh có 3 thẻ con cấu hình: **Cài đặt nhanh** · **Theo từng sản phẩm** · **Đã cài đặt**.
Ba thẻ số liệu: **Tổng phân loại SP** · **Đã cài ngưỡng** · **Chưa cài ngưỡng** (chỉ khi `!isMultiScope`).

## 3. Ràng buộc ô nhập — đo từ code

| Ô | Ràng buộc |
|---|---|
| Min · Max (số lượng) | `InputNumber min={0} precision={2}` — chặn âm, 2 chữ số thập phân |
| Số ngày | `InputNumber min={0} max={365} precision={0}` |
| Min ≤ Max | 🔴 **KHÔNG có phép kiểm** |
| Nhập chữ vào ô số | antd bỏ qua ký tự không phải số ⇒ **không tự về 0** như sheet QC đòi |

## 4. Bẫy khi viết script

1. 🔴 **Ô tìm kiếm ở bảng Dự báo hết hàng chạy theo debounce 500ms**, không có nút tìm, không theo
   Enter. Đếm dòng ngay sau khi gõ là đếm dữ liệu cũ.
2. 🔴 **Nhiều ô cùng placeholder `"Tìm SKU, tên sản phẩm..."`** trên màn Cài đặt (một ở khối *Cấu hình
   Tổng công ty*, một ở thẻ *Theo từng sản phẩm*). Phải bám theo khối bao ngoài, 🚫 không bám
   placeholder trần.
3. **Thanh công cụ bảng chỉ có 2 nút**: làm mới và cài đặt cột (`options: { reload: true, setting: true }`)
   — không có phóng to toàn màn hình.

## 5. Phân loại độ sẵn sàng

| Nhãn | Số case |
|---|--:|
| `READY` | 52 (đã có script) |
| `READY_WITH_CODE_LOOKUP` | 15 |
| `BLOCKED` | 5 |

## 6. Case ghi dữ liệu — 🔴 30 case, `allowMutation: false`

Cài / xoá ngưỡng cảnh báo **ảnh hưởng cảnh báo của cả đơn vị** (và cả tỉnh khi dùng phạm vi nhiều
tỉnh); nhập cấu hình từ Excel ghi hàng loạt; đề xuất nhập hàng tự động **sinh phiếu đề xuất thật**.

## 7. Lỗ hổng và mâu thuẫn đặc tả — 🚫 không tự sửa tài liệu

| # | Vấn đề |
|---|---|
| 1 | 🔴 **Không có phép kiểm Min ≤ Max.** Đặt Min = 100, Max = 10 thì hai cảnh báo "dưới Min" và "vượt Max" cùng nổ, vô nghĩa. |
| 2 | 🔴 **`FUNC_1_208` đòi ô Min/Max "hiển thị mặc định về số 0" khi nhập chữ.** antd `InputNumber` bỏ qua ký tự không phải số, ô giữ giá trị cũ hoặc thành rỗng — không về 0. |
| 3 | 🔴 **`FUNC_1_192` đòi nút phóng to/thu nhỏ** — bảng không bật `fullScreen`. |
| 4 | 🔴 **`FUNC_1_202` đòi tìm theo barcode** ở thẻ *Theo từng sản phẩm* — code không khai barcode. |
| 5 | **`FUNC_1_197` `209` `210` chỉ nói "cấp tỉnh"** — code còn nhánh **cấp xã** với nhãn *Sản phẩm của xã*, tài liệu bỏ sót. |
| 6 | **Phạm vi nhiều tỉnh không cấu hình được sản phẩm của tỉnh** (backend cũng chặn) — tài liệu không nói giới hạn này. |

## 8. Việc còn lại

1. Viết script cho 15 case `READY_WITH_CODE_LOOKUP`.
2. Trình user mục 7 — số 1 là lỗi nghiệp vụ thật, 4 mục còn lại là tài liệu lệch code.

## 🔴 Kết quả chạy script — 20/09/2026 (sau khi bổ sung 20 case còn thiếu)

```bash
npx playwright test --config tai-lieu-test/04_1_canh_bao_ton_kho/playwright.config.js
```

**72/72 case có script** (thêm `du-bao-het-hang.tct.spec.js` · `cai-dat-canh-bao.province.spec.js` ·
`cai-dat-nhanh.tct.spec.js`). Lượt chạy đầy đủ: **43 đạt · 3 đỏ · 32 skip** (19,4 phút).

| Case đỏ | Phân loại |
|---|---|
| `04_1_010_013` | 🔴 **Phát hiện sản phẩm**: bấm nút *làm mới* của bảng **không gọi lại API** (không request nào trong 6s) ⇒ dữ liệu không thể mới hơn. |
| `04_1_010_007` | Flaky theo dữ liệu: `.check()` ô chọn hết timeout khi chạy cả bộ; chạy riêng thì **skip** vì điểm bán không có lô sắp hết hạn. |
| `04_1_010_00x` (điều hướng) | Lỗi PHIÊN, không phải sản phẩm: bị đá về `/account` giữa lượt chạy dài — refresh token xoay vòng. Chạy lại là xanh. |

**Đã đo và ghi vào script:**
- Thẻ *Dự báo hết hàng* có bộ cột RIÊNG (6 cột), khác `COT_MAC_DINH` của ba nhóm theo định mức.
- Ô tìm của thẻ đó chạy theo **debounce 500ms**, 🚫 không có nút tìm và không theo Enter.
- Thanh công cụ chỉ có **3 nút**: reload · density · setting — **không có** `fullScreen`, đúng như
  `04_1_010_015` dự đoán; sheet QC `FUNC_1_192` đòi có ⇒ cần user chốt.
- Màn Cài đặt cảnh báo nhìn từ **cấp tỉnh** có đủ: khối *Cấu hình Tổng công ty*, hai thẻ con
  *Sản phẩm của tỉnh* / *Sản phẩm của Tổng công ty*, ba thẻ số *Tổng phân loại SP · Đã cài ngưỡng ·
  Chưa cài ngưỡng*.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `04_1_020_020` | Nhập chữ vào ô Min / Max — phơi hành vi thật | Chờ chạy để lấy hành vi thật | 🔴 Sheet QC `FUNC_1_208` đòi "hiển thị mặc định về số 0". Thực tế ô là `InputNumber min={0}` của antd: ký tự không phải số **bị bỏ qua khi gõ**, ô giữ giá trị cũ hoặc thành rỗng (null) — 🚫 KHÔNG tự về 0. Ghi lại hành vi… |

**1/72 case** của phân hệ này chưa chốt được kỳ vọng.
