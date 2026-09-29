# Kịch bản auto test — 04_3 Nhập / xuất / chuyển kho

- **Dựng 18/09/2026:** đối chiếu trọn sheet QC + trace code FE + quét 11 kỹ thuật mục 3.4.
  **5 → 97 case.** Phủ **107/107** case gốc (trước đó chỉ 1).
- 🚫 Chưa có script cho case mới. Đây là **phân hệ GHI nặng nhất hệ thống**.

## 1. Task

| Mã task | Nội dung | Số case |
|---|---|--:|
| `010` | Lịch sử xuất nhập kho: lọc · tìm · xuất Excel · chi tiết · chứng từ · giá vốn xuất | 22 |
| `020` | Phiếu nhập kho: nháp → duyệt · nguồn nhập · thanh toán · giá vốn sau nhập | 17 |
| `030` | Phiếu xuất kho: chọn lô · serial · vượt tồn · tồn 0 · tồn âm | 10 |
| `040` | Huỷ phiếu nhập kho (bút toán đảo) | 5 |
| `050` | Lô hàng: gộp lô · đổi tên lô · hoàn trả · lịch sử lô · nhập khi tồn âm | 10 |
| `060` | Chuyển kho: giao diện · lọc · ràng buộc số lượng · xuất ngay · in phiếu | 18 |
| `070` | Chuyển kho đa cấp TCT → Tỉnh → Điểm bán, kèm công nợ | 14 |
| `080` | Màn Chuyển kho (case cũ) | 1 |

## 2. Danh mục phân loại phiếu — lấy nguyên văn từ `utils/constants/config.jsx`

**`IMPORT_TYPE` (8 nhãn đang bật):** Nhập kho thường · Nhập lại từ đơn hàng hủy · Nhập kho sản phẩm
sản xuất · Nhập chuyển kho · Kiểm kho · Nhập kho trả hàng · Tồn đầu kỳ · Hoàn chuyển kho.

**`EXPORT_TYPE` (6 nhãn đang bật):** Xuất kho thường · Xuất bán hàng · Xuất trả hàng · Xuất chuyển kho
· Xuất kho nguyên liệu sản xuất · **Điều chỉnh phiếu nhập**.

🔴 *"Điều chỉnh phiếu nhập"* là **chứng từ bút toán đảo theo Điều 27 Luật Kế toán** — sinh ra khi huỷ
hoặc sửa phiếu nhập đã ghi sổ. 🚫 Không lẫn với xuất kho thường.

Nhiều nhãn khác **đã bị comment out** (Nhập hoàn/huỷ đơn · Nhập lại sau dịch vụ · Xuất làm dịch vụ ·
phiếu đã xoá · phiếu nháp) — 🚫 không dựng case cho chúng.

**`TRANSFER_STATUS` (3 trạng thái):** Chờ xác nhận · Đang đi đường · Đã nhận.

## 3. 🔴 Bốn nhóm câu hỏi SỐ TIỀN chưa có đặc tả — `BLOCKED` chờ user

| Case | Câu hỏi |
|---|---|
| `04_3_020_010` `04_3_050_008` | Sửa phiếu nhập khi sản phẩm / lô **đã phát sinh xuất**: có chặn giảm số lượng dưới số đã xuất? Giá vốn các phiếu xuất đã phát sinh có được **tính lại** không? |
| `04_3_030_009` `04_3_060_011` | Xuất / chuyển kho khi tồn **đang âm**: chặn hay cho đi tiếp? Nếu cho thì **giá vốn lấy ở đâu** khi không còn lô? |
| `04_3_030_008` `04_3_060_010` | Tồn = 0: kỳ vọng phụ thuộc **chính sách tồn âm của điểm bán** (`NegativeStockPolicySetting`) — phải ghi rõ cấu hình đang bật trước khi assert |
| `04_3_010_015` `04_3_010_018` | **Giới hạn số ảnh chứng từ** là bao nhiêu? Màn có ghi ra không? |

## 4. Bẫy đã biết của repo, áp vào phân hệ này

| Bẫy | Ảnh hưởng case nào |
|---|---|
| `quantity` trên dòng phiếu **ĐÃ là số theo đơn vị gốc** — 🚫 không nhân thêm `convert_to_main_unit` | `04_3_010_012` và mọi case đối chiếu số lượng |
| Sản phẩm **MAC vẫn có lô** | `04_3_010_019` `04_3_020_017` |
| Nguồn lô duy nhất là JSON **`batch_products`** | `04_3_010_021` `04_3_030_004`–`006` `04_3_060_012` |
| Giá vốn giữ **scale 6**, chỉ tròn khi trình bày | `04_3_020_013` |
| Hàng ký gửi có thể `base_price = 0` khi chuyển kho | `04_3_060_014` |
| Với MAC, `price` vs `basePrice` lệch nhau và phần lệch vào `adjust_val` | `04_3_010_013` |
| Thẻ kho đọc DW: đo bằng **post − pre**, 🚫 không lấy `quantity`; và thiếu `FINAL` là đếm đôi | `04_3_010_005` |
| **Thiếu phiếu IMPORT ở cấp trên gây tồn âm** (bẫy đã gặp thật) | `04_3_070_005` `04_3_070_011` là chốt chặn |
| `id` kho **khác nhau mỗi pod** — đối chiếu theo mã, 🚫 không theo id | `04_3_070_004` |
| Callback TCT→tỉnh **so pod sai** | `04_3_070_003` |
| Event cross-pod phải mang `sku`/`unitId` | `04_3_060_013` |
| Phân loại sản phẩm phải đọc `CHAIN_PRODUCTS`, 🚫 cấm `SHOP_PRODUCTS` | `04_3_010_008` |
| Trả hàng **LUÔN là điều chỉnh giảm**, 🚫 không sinh hoá đơn huỷ | `04_3_050_005` |

## 5. Phân loại độ sẵn sàng

| Nhãn | Số case |
|---|--:|
| `READY_WITH_CODE_LOOKUP` | 21 |
| `BLOCKED` | 76 |

🔴 **76/97 BLOCKED, và 70/97 là case GHI.** Không phải làm tắt: phân hệ này **không có case đọc thuần**
nào ở phần nghiệp vụ cốt lõi — muốn kiểm giá vốn MAC/FIFO/đích danh/tiêu chuẩn thì phải **nhập kho
thật rồi xuất kho thật**; muốn kiểm chuyển kho đa cấp thì phải chuyển hàng thật giữa ba cấp.

## 6. Điều kiện để mở khoá nhóm BLOCKED

1. **Một điểm bán + kho dựng riêng cho test**, không dùng chung với dữ liệu thật.
2. **Bộ sản phẩm đủ 4 phương pháp tính giá**: MAC · FIFO · thực tế đích danh · giá tiêu chuẩn; trong
   đó MAC và FIFO cần ≥2 lần nhập ở giá khác nhau, đích danh cần lô + serial.
3. **Ba cấp đơn vị liên thông** (TCT → Tỉnh → Điểm bán) trong cùng môi trường để chạy nhóm `070`.
4. **Chính sách tồn âm** được khai rõ cho điểm bán test, và ghi lại cấu hình đang bật.
5. Trả lời 4 nhóm câu hỏi ở mục 3.

## 7. Việc còn lại

1. Viết script cho 21 case đọc thuần (nhóm `010` lọc/tìm/xuất Excel, nhóm `060` giao diện/lọc).
2. Trình user mục 3 — bốn nhóm câu hỏi này quyết định kỳ vọng của 8 case, và đều là câu hỏi số tiền.
3. Xin dữ liệu nền ở mục 6 rồi nâng dần nhóm `BLOCKED`.

## 🔴 Kết quả chạy script — 20/09/2026

```bash
npx playwright test --config tai-lieu-test/04_3_nhap_xuat_chuyen_kho/playwright.config.js
```

**97/97 case có script.** Spec cũ `vnpost-warehouse.playwright.spec.js` đã **xoá**: nó đăng nhập
bằng URL production viết cứng và không đi qua `moTrang`.

| Nhóm | Số case |
|---|--:|
| **Đã chạy và ĐẠT** | **15** |
| **Đã chạy và HỎNG — phát hiện về sản phẩm** | **2** |
| **Chưa chạy** (ghi dữ liệu / thiếu dữ liệu nền) | 80 |

### Hai case đỏ — đều là phát hiện

> ⚠️ **Đính chính 20/09/2026:** bản trước của mục này ghi `04_3_060_004` là lỗi sản phẩm
> (*"bộ lọc khoảng thời gian không có tác dụng"*). **SAI — lỗi của script.** Ô ngày là một
> **RangePicker**: chọn xong "Ngày bắt đầu" thì tiêu điểm nhảy sang "Ngày kết thúc" và danh sách
> chỉ nạp lại **sau khi chọn đủ cả hai mốc**. Sửa script chọn đủ hai mốc ⇒ case **ĐẠT**.

1. 🔴 **`04_3_060_001` — form lập phiếu chuyển kho im lặng hoàn toàn.** Bấm *Tạo phiếu* khi còn
   trống ô bắt buộc `* Kho nhận` và chưa có dòng sản phẩm: **không lỗi dưới ô, không message, không
   request**. Người dùng bấm mà không biết vì sao không có gì xảy ra. (Đã kiểm DB màn hình sau đó:
   🚫 không phiếu nào được tạo.)
2. 🔴 **`04_3_010_012` — chi tiết phiếu nhập KHÔNG có cột giá vốn / thành tiền.** Bảng chi tiết chỉ
   có 6 cột `# · Sản phẩm · PP tính giá vốn · Đơn vị · Số lượng · Serial / Lô`. Đo trên phiếu loại
   *Điều chuyển nội đơn vị* — cần user chốt: cố ý ẩn tiền với phiếu nội bộ, hay thiếu cột.

### 🔴 Bẫy script đã trả giá (đã ghi vào `playwright-quality-gates.md`)

- Ô **"Chọn Điểm bán / Kho"** trông như `.ant-select` nhưng bấm vào mở **drawer ba cột**
  Tỉnh → Xã → Điểm bán (cùng component với 04_1), 🚫 không mở dropdown. Chờ dropdown ở đây là
  timeout 15s rồi đổ oan cho vai thiếu quyền.
- Vai `province` ở màn Lịch sử xuất nhập kho **không có bảng** cho tới khi chọn điểm bán; màn chỉ
  gọi `/shops/profile/chain?shopType=HUB&orgUnitType=BUU_DIEN_TINH`.
- 🚫 Đừng đăng ký `waitForResponse` **trước** một bước có thể `skip`: promise treo làm case hiện
  **đỏ** ("Test ended") trong khi đúng ra phải là **skip**.

### Vì sao 80 case vẫn chưa chạy

🔴 70/97 là case **GHI**: nhập kho, xuất kho, chuyển kho, huỷ phiếu (bút toán đảo), gộp lô — tất cả
ghi vào **tồn kho, giá vốn và công nợ thật**, 🚫 không hoàn tác được bằng giao diện. Điều kiện mở
khoá vẫn như mục 6: điểm bán + kho dựng riêng, bộ sản phẩm đủ 4 phương pháp tính giá, ba cấp đơn vị
liên thông, và câu trả lời cho 4 nhóm câu hỏi ở mục 3.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `04_3_050_008` | Sửa phiếu nhập của lô ĐÃ phát sinh xuất | Chưa rõ | 🔴 Kỳ vọng chưa chốt, giống `04_3_020_010`: chưa rõ có chặn giảm dưới số đã xuất, và giá vốn của các phiếu xuất đã phát sinh có được tính lại hay không. Phải đo rồi user chốt. |

**1/97 case** của phân hệ này chưa chốt được kỳ vọng.
